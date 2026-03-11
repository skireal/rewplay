/**
 * Генерирует browser-script.js для сбора фото с профиля продавца на Авито.
 * Usage: node scripts/gen-image-script.mjs
 *
 * После запуска:
 * 1. Открой в браузере: https://www.avito.ru/user/4eae2bc42460589c3ae106d8b26fe866/profile
 * 2. Прокрути страницу до конца (чтобы загрузились все карточки)
 * 3. Открой scripts/browser-script.js в редакторе, скопируй всё → вставь в консоль → Enter
 * 4. Скачается avito-images.json → положи в website/scripts/
 * 5. Запусти: npm run images:update
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const envVars = readFileSync(join(__dir, '..', '.env.local'), 'utf-8')
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

const { data: cassettes, error } = await supabase
  .from('cassettes')
  .select('id, artist, album, shop_links')
  .not('shop_links', 'is', null)

if (error) { console.error('Supabase error:', error.message); process.exit(1) }

const entries = cassettes
  .filter(c => c.shop_links && c.shop_links.avito)
  .map(c => {
    // Извлекаем числовой ID Авито из конца URL: /audiokasseta_..._8005882291
    const match = c.shop_links.avito.match(/_(\d+)$/)
    return { id: c.id, avitoId: match ? match[1] : null, label: c.artist + ' — ' + c.album }
  })
  .filter(c => c.avitoId)

if (entries.length === 0) {
  console.error('Нет кассет с avito-ссылками в БД')
  process.exit(1)
}

// Генерируем скрипт — без template literals, только обычные строки
const itemsJson = JSON.stringify(entries, null, 2)

const script = [
  '// Запускать на странице: https://www.avito.ru/user/4eae2bc42460589c3ae106d8b26fe866/profile',
  '// Сначала прокрути страницу до конца!',
  '(function() {',
  '  var items = ' + itemsJson + ';',
  '',
  '  // Строим словарь: avitoId -> { id, label }',
  '  var lookup = {};',
  '  for (var i = 0; i < items.length; i++) {',
  '    lookup[items[i].avitoId] = { id: items[i].id, label: items[i].label };',
  '  }',
  '',
  '  // Ищем все <a href> — находим ссылки на наши объявления по числовому ID',
  '  var allLinks = document.querySelectorAll("a[href]");',
  '  var cardMap = {};',
  '  for (var j = 0; j < allLinks.length; j++) {',
  '    var href = allLinks[j].getAttribute("href") || "";',
  '    var idMatch = href.match(/_([0-9]+)(?:[?#]|$)/);',
  '    if (!idMatch) continue;',
  '    var avitoId = idMatch[1];',
  '    if (!lookup[avitoId] || cardMap[avitoId]) continue;',
  '    // Поднимаемся по DOM, пока не найдём элемент с <img>',
  '    var el = allLinks[j];',
  '    for (var k = 0; k < 10; k++) {',
  '      if (!el.parentElement) break;',
  '      el = el.parentElement;',
  '      if (el.querySelector("img")) break;',
  '    }',
  '    cardMap[avitoId] = el;',
  '  }',
  '  console.log("Найдено ссылок на наши кассеты: " + Object.keys(cardMap).length);',
  '',
  '  var results = [];',
  '  var found = 0;',
  '',
  '  for (var aid in cardMap) {',
  '    var entry = lookup[aid];',
  '    var card = cardMap[aid];',
  '',
  '    // Первая картинка в карточке',
  '    var imgEl = card.querySelector("img");',
  '    var imgSrc = null;',
  '    if (imgEl) {',
  '      imgSrc = imgEl.src || imgEl.getAttribute("data-src") || null;',
  '      // Поднимаем разрешение с thumbnail до нормального',
  '      if (imgSrc) imgSrc = imgSrc.replace(/\\/[0-9]+x[0-9]+\\//, "/640x480/");',
  '    }',
  '',
  '    results.push({ id: entry.id, img: imgSrc });',
  '    found++;',
  '    console.log("[" + found + "] " + (imgSrc ? "OK" : "NO IMG") + " — " + entry.label);',
  '  }',
  '',
  '  console.log("\\nИтого: " + found + " из " + items.length + " кассет");',
  '',
  '  if (results.length === 0) {',
  '    console.error("Ничего не найдено. Убедись что ты на странице продавца и прокрутил до конца.");',
  '    return;',
  '  }',
  '',
  '  // Скачиваем JSON',
  '  var blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });',
  '  var a = document.createElement("a");',
  '  a.href = URL.createObjectURL(blob);',
  '  a.download = "avito-images.json";',
  '  document.body.appendChild(a);',
  '  a.click();',
  '  document.body.removeChild(a);',
  '  console.log("Файл avito-images.json скачан!");',
  '})();',
].join('\n')

const outPath = join(__dir, 'browser-script.js')
writeFileSync(outPath, script, 'utf-8')

console.log('✅ Готово! Файл сохранён: scripts/browser-script.js')
console.log('')
console.log('Дальше:')
console.log('  1. Открой в браузере: https://www.avito.ru/user/4eae2bc42460589c3ae106d8b26fe866/profile')
console.log('  2. Прокрути страницу до самого низа (чтобы загрузились все карточки)')
console.log('  3. Открой scripts/browser-script.js в редакторе → Ctrl+A → Ctrl+C')
console.log('  4. F12 → Console → Ctrl+V → Enter')
console.log('  5. Скачается avito-images.json → положи в папку website/scripts/')
console.log('  6. npm run images:update')
