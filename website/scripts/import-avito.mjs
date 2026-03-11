/**
 * Avito → Supabase import script
 * Usage: node scripts/import-avito.mjs [--dry-run]
 *
 * Requires in .env.local:
 *   AVITO_CLIENT_ID
 *   AVITO_CLIENT_SECRET
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ─── Load .env.local manually (no dotenv dependency needed) ───────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '..', '.env.local')
const envVars = readFileSync(envPath, 'utf-8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...rest] = line.split('=')
    if (key) acc[key.trim()] = rest.join('=').trim()
    return acc
  }, {})

const {
  AVITO_CLIENT_ID,
  AVITO_CLIENT_SECRET,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = envVars

const DRY_RUN = process.argv.includes('--dry-run')

if (!AVITO_CLIENT_ID || !AVITO_CLIENT_SECRET) {
  console.error('❌ AVITO_CLIENT_ID / AVITO_CLIENT_SECRET не заданы в .env.local')
  process.exit(1)
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не задан в .env.local')
  console.error('   Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── Avito API helpers ────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch('https://api.avito.ru/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AVITO_CLIENT_ID,
      client_secret: AVITO_CLIENT_SECRET,
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Авито вернул: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function getSelf(token) {
  const res = await fetch('https://api.avito.ru/core/v1/accounts/self/', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

async function getItems(token) {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://api.avito.ru/core/v1/items?per_page=50&page=${page}&status=active`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(`items API: ${JSON.stringify(data)}`)
    const batch = data.resources ?? []
    if (batch.length === 0) break
    items.push(...batch)
    console.log(`  Страница ${page}: +${batch.length} объявлений`)
    page++
  }
  return items
}

// ─── Scrape public listing page for image + description ──────────────────────
// API не возвращает фото/описание — берём их из og-тегов публичной страницы
async function scrapeListingPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) {
      console.warn(`    ⚠ Страница ${res.status}: ${url}`)
      return {}
    }
    const html = await res.text()

    // og:image — основное фото
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                  ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
    const imageUrl = imgMatch?.[1] ?? null

    // og:description — описание (может быть усечено до ~200 символов)
    const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
                   ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)
    const description = descMatch
      ? descMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : null

    return { imageUrl, description }
  } catch (e) {
    console.warn(`    ⚠ scrape error: ${e.message}`)
    return {}
  }
}

// ─── Title parser ─────────────────────────────────────────────────────────────
// Форматы: "Кино — Группа крови", "Кино - Группа крови", "МС Кино – Звезда"
function parseTitle(raw) {
  let title = raw
    .replace(/^(аудиокассета|кассета|mc|мс|audio cassette)[.:\s]*/gi, '')
    .trim()

  for (const sep of [' — ', ' – ', ' - ']) {
    const idx = title.indexOf(sep)
    if (idx > 0) {
      return {
        artist: title.slice(0, idx).trim(),
        album: title.slice(idx + sep.length).trim(),
      }
    }
  }

  // Разделитель не найден — всё в album, artist пустой
  return { artist: '', album: title }
}

// ─── Extract best image URL from Avito images array ──────────────────────────
function extractImageUrl(images) {
  if (!images || images.length === 0) return null
  const img = images[0]
  if (typeof img === 'string') return img
  // Объект с разными разрешениями — берём максимальное
  return (
    img['1280x960'] ??
    img['640x480'] ??
    img['320x240'] ??
    Object.values(img)[0] ??
    null
  )
}

// ─── Upload cover to Supabase Storage ────────────────────────────────────────
async function uploadCover(imageUrl, itemId) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status} при скачивании фото`)

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const fileName = `avito-${itemId}.${ext}`
  const buffer = await res.arrayBuffer()

  const { error } = await supabase.storage
    .from('Covers')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('Covers').getPublicUrl(fileName)
  return data.publicUrl
}

// ─── Extract params (год, состояние и т.д.) ──────────────────────────────────
function extractParam(params, names) {
  if (!Array.isArray(params)) return null
  for (const name of names) {
    const found = params.find(p =>
      p.name?.toLowerCase().includes(name.toLowerCase())
    )
    if (found?.value) return found.value
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 Режим dry-run (без записи в БД)\n' : '🚀 Импорт Авито → Supabase\n')

  console.log('🔑 Получаем токен Авито...')
  const token = await getToken()

  console.log('👤 Получаем профиль...')
  const self = await getSelf(token)
  const userId = self.id
  console.log(`   ${self.name} (id: ${userId})\n`)

  console.log('📦 Загружаем объявления...')
  const items = await getItems(token)
  console.log(`   Итого: ${items.length} активных объявлений\n`)

  if (items.length === 0) {
    console.log('Нет объявлений для импорта.')
    return
  }

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log(`[${i + 1}/${items.length}] ${item.title}`)

    try {
      // Парсим название
      const { artist, album } = parseTitle(item.title)
      console.log(`  artist: "${artist}"  album: "${album}"`)

      const record = {
        artist,
        album,
        price: Math.round(item.price ?? 0),
        description: null,
        cover_url: null,
        status: 'available',
        condition: null,
        year: null,
        shop_links: { avito: item.url },
      }

      if (DRY_RUN) {
        console.log(`  price: ${record.price} ₽`)
        imported++
      } else {
        const { error } = await supabase.from('cassettes').insert(record)
        if (error) throw new Error(error.message)
        console.log(`  ✓ Добавлено в БД`)
        imported++
      }

      // Пауза между запросами, чтобы не получить rate-limit
      await new Promise(r => setTimeout(r, 400))

    } catch (err) {
      errors++
      console.error(`  ✗ Ошибка: ${err.message}`)
    }
  }

  console.log('\n─────────────────────────────────')
  console.log(`✅ Импортировано: ${imported}`)
  console.log(`⚠  С ошибками:   ${errors}`)
  if (DRY_RUN) console.log('\n(Dry-run: в БД ничего не записано)')
}

main().catch(err => {
  console.error('\n💥 Фатальная ошибка:', err.message)
  process.exit(1)
})
