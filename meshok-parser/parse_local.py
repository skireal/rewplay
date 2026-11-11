"""
Локальный парсер: читает сохранённый HTML мешка и заливает лоты в Supabase.
Описания и все фото подгружает с каждой страницы лота через куки браузера.

Шаги:
  1. Открой https://meshok.net/info/2446183/lots в браузере
  2. Прокрути вниз, дождись всех лотов
  3. Ctrl+S → "Webpage, HTML only" → сохрани как meshok_lots.html в эту папку
  4. python parse_local.py --dry-run   # проверить что нашли
  5. python parse_local.py             # залить в Supabase
"""
import asyncio
import os
import re
import sys
import uuid

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL        = os.getenv('SUPABASE_URL')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')
CF_CLEARANCE        = os.getenv('CF_CLEARANCE', '')
CF_USER_AGENT       = os.getenv('CF_USER_AGENT', 'Mozilla/5.0')
DRY_RUN             = '--dry-run' in sys.argv
HTML_FILE           = 'meshok_lots.html'

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# HTTP клиент с куками браузера — обходит Cloudflare
def make_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        follow_redirects=True,
        timeout=30,
        headers={
            'User-Agent': CF_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Referer': 'https://meshok.net/',
        },
        cookies={'cf_clearance': CF_CLEARANCE} if CF_CLEARANCE else {},
    )

# ── Title parsing ──────────────────────────────────────────────────────────────

def parse_title(title: str) -> dict:
    result = {'type': 'cassette', 'artist': None, 'album': None}
    t = title.strip()

    if re.match(r'^(cd|компакт.?диск)', t, re.IGNORECASE):
        result['type'] = 'cd'
        clean = re.sub(r'^(cd|компакт.?диск)\s*[-–]?\s*', '', t, flags=re.IGNORECASE).strip()
    elif re.match(r'^(аудиокассета|кассета)', t, re.IGNORECASE):
        result['type'] = 'cassette'
        clean = re.sub(r'^(аудиокассета|кассета)\s*', '', t, flags=re.IGNORECASE).strip()
    else:
        clean = t
        # Detect CD by suffix
        if re.search(r'\bcd\b', t, re.IGNORECASE):
            result['type'] = 'cd'

    # Clean title stored in DB — no prefix
    result['title'] = clean

    parts = re.split(r'\s+[–—-]\s+', clean, maxsplit=1)
    if len(parts) == 2:
        result['artist'] = parts[0].strip()
        result['album']  = re.sub(r'\s*\bCD\b\s*$', '', parts[1], flags=re.IGNORECASE).strip()
    else:
        result['artist'] = re.sub(r'\s*\bCD\b\s*$', '', clean, flags=re.IGNORECASE).strip()

    return result

# ── Parse seller page HTML (local file) ───────────────────────────────────────

def parse_seller_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, 'html.parser')
    lots = []
    seen = set()

    for a in soup.find_all('a', href=True):
        href = a['href']
        m = re.search(r'/(item|lot)/(\d+)', href)
        if not m:
            continue

        mid = int(m.group(2))
        if mid in seen:
            continue
        seen.add(mid)

        url = href.split('?')[0]
        if not url.startswith('http'):
            url = f"https://meshok.net{url}"

        # Title: find the anchor with real text, not just image link
        title = a.get_text(strip=True)
        if not title or len(title) < 5:
            parent = a.parent
            for _ in range(4):
                if parent is None:
                    break
                text = parent.get_text(separator=' ', strip=True)
                if len(text) > 10 and ('кассета' in text.lower() or 'cd' in text.lower() or '₽' in text):
                    title = text
                    break
                parent = parent.parent

        # Clean title: strip everything from price/condition onwards
        title = re.split(r'\s+[\d\s]+₽|\s+Б/У|\s+Новая|\s+Коллекционная|\s+Нижний|\s+Москва|\s+Санкт', title)[0].strip()

        # Price
        price = None
        container = a
        for _ in range(5):
            if container is None:
                break
            text = container.get_text()
            pm = re.search(r'([\d\s]+)\s*[₽р]', text.replace('\xa0', ' '))
            if pm:
                try:
                    price = float(pm.group(1).replace(' ', ''))
                except:
                    pass
                break
            container = container.parent

        # Thumbnail image from card (fallback if full scrape fails)
        cover_src = None
        img = a.find('img')
        if img:
            cover_src = img.get('src') or img.get('data-src') or img.get('data-original')

        lots.append({
            'meshok_id': mid,
            'url':       url,
            'title_raw': title,
            'price':     price,
            'cover_src': cover_src,
        })

    return lots

# ── Fetch lot detail page ──────────────────────────────────────────────────────

async def fetch_lot_detail(url: str, client: httpx.AsyncClient) -> dict:
    """Fetch individual lot page and extract title, description, all images."""
    detail = {'title': None, 'description': None, 'images': [], 'condition': None, 'price': None}
    try:
        r = await client.get(url, timeout=30)
        if r.status_code != 200:
            print(f"    ✗ HTTP {r.status_code}")
            return detail
        if 'cloudflare' in r.text.lower() and 'cf_clearance' in r.text.lower():
            print(f"    ✗ Cloudflare block")
            return detail

        soup = BeautifulSoup(r.text, 'html.parser')

        # Title
        h1 = soup.find('h1')
        if h1:
            detail['title'] = h1.get_text(strip=True)

        # Price
        for el in soup.find_all(class_=re.compile(r'price', re.I)):
            text = el.get_text().replace('\xa0', '').replace(' ', '')
            m = re.search(r'(\d+)', text)
            if m:
                detail['price'] = float(m.group(1))
                break

        # Condition — look only in specific elements near price/status
        for sel in ['[class*="condition"]', '[class*="state"]', '[class*="status"]', '[itemprop="itemCondition"]']:
            el = soup.select_one(sel)
            if el:
                text = el.get_text(strip=True)
                for cond in ['Б/У', 'Новая', 'Коллекционная']:
                    if cond in text:
                        detail['condition'] = cond
                        break
                if detail['condition']:
                    break

        # Description
        for sel in [
            {'class': re.compile(r'description|lot-desc|item-desc', re.I)},
            {'itemprop': 'description'},
        ]:
            el = soup.find(attrs=sel)
            if el:
                text = el.get_text(separator='\n', strip=True)
                if text and len(text) > 10:
                    detail['description'] = text
                    break

    except Exception as e:
        print(f"    ✗ fetch error: {e}")

    return detail


async def fetch_lot_images(meshok_id: int, client: httpx.AsyncClient) -> list[bytes]:
    """
    Download all photos for a lot using direct CDN URL pattern:
    https://meshok.net/i/{meshok_id}.{index}.jpg
    Stops on first 404.
    """
    images = []
    for i in range(10):
        url = f"https://meshok.net/i/{meshok_id}.{i}.jpg"
        try:
            r = await client.get(url, timeout=15)
            if r.status_code == 404 or r.status_code == 403:
                break
            if r.status_code == 200 and len(r.content) > 2000:
                images.append(r.content)
        except:
            break
    return images

# ── Image upload ───────────────────────────────────────────────────────────────

async def download_image(url: str, client: httpx.AsyncClient) -> bytes | None:
    if not url or url.startswith('data:'):
        return None
    try:
        r = await client.get(url, timeout=30)
        if r.status_code == 200 and len(r.content) > 1000:
            return r.content
    except Exception as e:
        print(f"    ✗ img download failed: {e}")
    return None


def upload_image(data: bytes, product_id: str, filename: str) -> str | None:
    path = f"{product_id}/{filename}"
    try:
        supabase.storage.from_('products').upload(
            path=path,
            file=data,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        return supabase.storage.from_('products').get_public_url(path)
    except Exception as e:
        print(f"    ✗ storage upload failed: {e}")
        return None

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 50)
    print("  Meshok Local Parser → Supabase")
    if DRY_RUN:
        print("  [DRY RUN — ничего не сохраняется]")
    print("=" * 50)

    if not os.path.exists(HTML_FILE):
        print(f"\n  ✗ Файл {HTML_FILE} не найден.")
        return

    print(f"\nЧитаю {HTML_FILE}...")
    with open(HTML_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    lots = parse_seller_html(html)
    print(f"Найдено лотов: {len(lots)}\n")

    if not lots:
        print("  ✗ Лоты не найдены.")
        return

    # Preview
    for lot in lots[:3]:
        parsed = parse_title(lot['title_raw'])
        print(f"  [{lot['meshok_id']}] {parsed.get('artist')} – {parsed.get('album')} | {lot['price']} ₽")
    if len(lots) > 3:
        print(f"  ... и ещё {len(lots) - 3}")

    if DRY_RUN:
        print(f"\n✓ Dry run завершён. Запусти без --dry-run чтобы залить в Supabase.")
        return

    print("\nЗаливаю в Supabase...\n")
    imported = 0
    skipped  = 0

    async with make_http_client() as http:
        for i, lot in enumerate(lots, 1):
            parsed = parse_title(lot['title_raw'])
            print(f"[{i:2}/{len(lots)}] {parsed.get('artist')} – {parsed.get('album')}")

            # Skip if already in DB
            existing = supabase.table('products') \
                .select('id').eq('meshok_id', lot['meshok_id']).execute()
            if existing.data:
                print(f"       уже в БД, пропускаю")
                skipped += 1
                continue

            # Fetch detail page for description only
            print(f"       загружаю страницу лота...")
            detail = await fetch_lot_detail(lot['url'], http)

            title = detail.get('title') or lot['title_raw']
            parsed = parse_title(title)

            price     = detail.get('price') or lot.get('price')
            condition = detail.get('condition') or 'Б/У'
            desc      = detail.get('description')

            # Fetch images directly from meshok CDN (no scraping needed)
            img_bytes_list = await fetch_lot_images(lot['meshok_id'], http)
            print(f"       фото: {len(img_bytes_list)} | описание: {'да' if desc else 'нет'}")

            # Upload images to Supabase Storage
            product_id = str(uuid.uuid4())
            image_urls = []
            cover_url  = None

            for j, img_bytes in enumerate(img_bytes_list):
                stored = upload_image(img_bytes, product_id, f"{j+1}.jpg")
                if stored:
                    image_urls.append(stored)
                    if j == 0:
                        cover_url = stored

            print(f"       загружено в Storage: {len(image_urls)} фото")

            product = {
                'id':          product_id,
                'type':        parsed['type'],
                'status':      'available',
                'title':       title,
                'artist':      parsed.get('artist'),
                'album':       parsed.get('album'),
                'price':       price,
                'condition':   condition,
                'description': desc,
                'cover_url':   cover_url,
                'images':      image_urls or None,
                'shop_links':  {'meshok': lot['url']},
                'meshok_id':   lot['meshok_id'],
            }
            product = {k: v for k, v in product.items() if v is not None}

            try:
                supabase.table('products').insert(product).execute()
                print(f"       ✓ сохранён")
                imported += 1
            except Exception as e:
                print(f"       ✗ ошибка БД: {e}")

            await asyncio.sleep(1)

    print(f"\n{'=' * 50}")
    print(f"  Готово! Импортировано: {imported} | Пропущено: {skipped}")
    print(f"{'=' * 50}")


if __name__ == '__main__':
    asyncio.run(main())
