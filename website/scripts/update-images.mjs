/**
 * Загружает фото из avito-images.json в Supabase Storage
 * и обновляет поле cover_url у каждой кассеты.
 *
 * Usage: node scripts/update-images.mjs
 *
 * Предварительно: создай файл scripts/avito-images.json
 * из вывода браузерного скрипта (gen-image-script.mjs)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

const jsonPath = join(__dir, 'avito-images.json')
let items
try {
  items = JSON.parse(readFileSync(jsonPath, 'utf-8'))
} catch {
  console.error('❌ Не найден файл scripts/avito-images.json')
  console.error('   Сначала запусти gen-image-script.mjs и сохрани результат')
  process.exit(1)
}

const withImages = items.filter(i => i.img)
console.log(`📸 Найдено фото: ${withImages.length}/${items.length}\n`)

let updated = 0
let errors = 0

for (let i = 0; i < withImages.length; i++) {
  const { id, img } = withImages[i]
  console.log(`[${i + 1}/${withImages.length}] Загружаем фото для ${id}...`)

  try {
    // Скачиваем изображение
    const res = await fetch(img)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const fileName = `cassette-${id}.${ext}`
    const buffer = await res.arrayBuffer()

    // Загружаем в Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('Covers')
      .upload(fileName, buffer, { contentType, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = supabase.storage
      .from('Covers')
      .getPublicUrl(fileName)

    // Обновляем запись в БД
    const { error: updateError } = await supabase
      .from('cassettes')
      .update({ cover_url: urlData.publicUrl })
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)

    console.log(`  ✓ Готово`)
    updated++
  } catch (err) {
    console.error(`  ✗ Ошибка: ${err.message}`)
    errors++
  }

  await new Promise(r => setTimeout(r, 200))
}

console.log('\n─────────────────────────────────')
console.log(`✅ Обновлено: ${updated}`)
console.log(`⚠  Ошибок:   ${errors}`)
