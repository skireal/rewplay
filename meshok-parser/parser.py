"""
Meshok.net → Supabase parser
Scrapes all lots from the seller page and imports them into Supabase products table.
Images are downloaded and uploaded to Supabase Storage for permanent URLs.

Usage:
  python parser.py          # import all lots
  python parser.py --debug  # save screenshot + HTML for debugging selectors
"""
import asyncio
import os
import re
import sys
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL        = os.getenv('SUPABASE_URL')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')
MESHOK_SELLER_URL   = os.getenv('MESHOK_SELLER_URL', 'https://meshok.net/info/2446183/lots')
DEBUG               = '--debug' in sys.argv

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# ── Title parsing ──────────────────────────────────────────────────────────────

def parse_title(title: str) -> dict:
    """
    Parse meshok lot title into type, artist, album.
    Examples:
      "Аудиокассета The Jesus And Mary Chain – Automatic"
        → type=cassette, artist="The Jesus And Mary Chain", album="Automatic"
      "CD Joy Division – Unknown Pleasures"
        → type=cd, artist="Joy Division", album="Unknown Pleasures"
    """
    result = {'title': title, 'type': 'cassette', 'artist': None, 'album': None}
    t = title.strip()

    if re.match(r'^(cd|компакт.?диск)', t, re.IGNORECASE):
        result['type'] = 'cd'
        clean = re.sub(r'^(cd|компакт.?диск)\s*', '', t, flags=re.IGNORECASE).strip()
    elif re.match(r'^(аудиокассета|кассета)', t, re.IGNORECASE):
        result['type'] = 'cassette'
        clean = re.sub(r'^(аудиокассета|кассета)\s*', '', t, flags=re.IGNORECASE).strip()
    else:
        clean = t

    # Split on em-dash, en-dash or regular dash surrounded by spaces
    parts = re.split(r'\s+[–—-]\s+', clean, maxsplit=1)
    if len(parts) == 2:
        result['artist'] = parts[0].strip()
        result['album']  = parts[1].strip()
    else:
        result['artist'] = clean.strip()

    return result

# ── Image helpers ──────────────────────────────────────────────────────────────

async def download_image(url: str, client: httpx.AsyncClient) -> bytes | None:
    try:
        r = await client.get(url, timeout=30)
        if r.status_code == 200:
            return r.content
    except Exception as e:
        print(f"    ✗ download failed {url}: {e}")
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
        print(f"    ✗ storage upload failed {path}: {e}")
        return None

# ── Scraping ───────────────────────────────────────────────────────────────────

async def get_lot_ids_from_seller_page(page) -> list[dict]:
    """
    Scrape seller page and collect lot URLs + basic info from cards.
    Returns list of dicts with keys: url, meshok_id, title, price, condition, cover_src.
    """
    print(f"  Loading {MESHOK_SELLER_URL} ...")
    await page.goto(MESHOK_SELLER_URL, wait_until='networkidle', timeout=60000)
    # Wait for Cloudflare to pass (up to 15 seconds)
    await page.wait_for_timeout(5000)
    # If still on Cloudflare challenge page, wait more
    for _ in range(5):
        content = await page.content()
        if 'Выполнение проверки' in content or 'cloudflare' in content.lower():
            print("  Waiting for Cloudflare check...")
            await page.wait_for_timeout(3000)
        else:
            break

    if DEBUG:
        await page.screenshot(path='debug_seller.png', full_page=True)
        Path('debug_seller.html').write_text(await page.content(), encoding='utf-8')
        print("  [DEBUG] Saved debug_seller.png + debug_seller.html")

    # Collect all lot links on the page
    links = await page.eval_on_selector_all(
        'a[href]',
        '''els => els
            .map(a => ({href: a.href, text: a.innerText.trim()}))
            .filter(a => /\\/item\\/\\d+|\\/lot\\/\\d+/.test(a.href))
        '''
    )

    # Deduplicate by meshok_id
    seen = set()
    lots = []
    for link in links:
        m = re.search(r'/(item|lot)/(\d+)', link['href'])
        if not m:
            continue
        mid = int(m.group(2))
        if mid in seen:
            continue
        seen.add(mid)
        lots.append({
            'url': link['href'].split('?')[0],
            'meshok_id': mid,
        })

    return lots


async def scrape_lot_page(page, url: str) -> dict:
    """
    Scrape individual lot page.
    Returns: title, price, condition, description, images (list of full-size URLs).
    """
    await page.goto(url, wait_until='networkidle', timeout=45000)
    await page.wait_for_timeout(1500)

    if DEBUG:
        slug = re.search(r'/(\d+)', url).group(1)
        await page.screenshot(path=f'debug_lot_{slug}.png')
        print(f"  [DEBUG] Saved debug_lot_{slug}.png")

    data = {'title': None, 'price': None, 'condition': None, 'description': None, 'images': []}

    # Title — usually h1
    try:
        el = await page.query_selector('h1')
        if el:
            data['title'] = (await el.inner_text()).strip()
    except:
        pass

    # Price — look for element containing ₽ or р.
    try:
        price_el = await page.query_selector('[class*="price"],[class*="Price"]')
        if price_el:
            raw = (await price_el.inner_text()).replace('\xa0', '').replace(' ', '')
            m = re.search(r'[\d]+', raw)
            if m:
                data['price'] = float(m.group())
    except:
        pass

    # Condition — Б/У or Новая
    try:
        page_text = await page.inner_text('body')
        for cond in ['Б/У', 'Новая', 'Коллекционная']:
            if cond in page_text:
                data['condition'] = cond
                break
    except:
        pass

    # Description
    try:
        for sel in ['[class*="description"]', '[class*="lot-desc"]', '[itemprop="description"]']:
            el = await page.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                if text:
                    data['description'] = text
                    break
    except:
        pass

    # Images — collect all <img> sources that look like lot photos
    try:
        srcs = await page.eval_on_selector_all(
            'img',
            '''imgs => imgs
                .map(i => i.src || i.dataset.src || '')
                .filter(s => s && (s.includes("meshok") || s.includes("imgbb") || s.includes("storage")))
            '''
        )
        seen = set()
        for src in srcs:
            # Strip thumbnail suffix like _200x200 or ?w=200
            src = re.sub(r'[_?](\d+x\d+|\w+=\d+).*', '', src)
            if src and src not in seen:
                seen.add(src)
                data['images'].append(src)
    except:
        pass

    return data

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 50)
    print("  Meshok → Supabase Parser")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not DEBUG)
        ctx = await browser.new_context(
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
            viewport={'width': 1280, 'height': 900},
        )
        page = await ctx.new_page()
        await stealth_async(page)

        # Step 1: collect lot URLs from seller page
        print("\nStep 1: Reading seller page...")
        lots = await get_lot_ids_from_seller_page(page)
        print(f"  Found {len(lots)} lots")

        if not lots:
            print("\n  ⚠ No lots found. Run with --debug to inspect the page.")
            await browser.close()
            return

        # Step 2: process each lot
        print("\nStep 2: Processing lots...\n")
        imported = 0
        skipped  = 0

        async with httpx.AsyncClient(
            follow_redirects=True,
            headers={'User-Agent': 'Mozilla/5.0'},
        ) as http:

            for i, lot in enumerate(lots, 1):
                print(f"[{i:2}/{len(lots)}] meshok_id={lot['meshok_id']}")

                # Skip if already imported
                existing = supabase.table('products') \
                    .select('id') \
                    .eq('meshok_id', lot['meshok_id']) \
                    .execute()
                if existing.data:
                    print(f"       already in DB, skipping")
                    skipped += 1
                    continue

                # Scrape lot page
                try:
                    detail = await scrape_lot_page(page, lot['url'])
                except Exception as e:
                    print(f"       ✗ scrape failed: {e}")
                    continue

                title = detail['title'] or ''
                parsed = parse_title(title)
                print(f"       {parsed['type'].upper()} | {parsed.get('artist')} – {parsed.get('album')}")
                print(f"       price={detail['price']} | images={len(detail['images'])}")

                # Upload images to Supabase Storage
                product_id  = str(uuid.uuid4())
                image_urls  = []
                cover_url   = None

                for j, src in enumerate(detail['images'][:10]):
                    img_bytes = await download_image(src, http)
                    if img_bytes:
                        fname       = f"{j + 1}.jpg"
                        stored_url  = upload_image(img_bytes, product_id, fname)
                        if stored_url:
                            image_urls.append(stored_url)
                            if j == 0:
                                cover_url = stored_url

                print(f"       uploaded {len(image_urls)} images")

                # Build and insert product
                product = {
                    'id':          product_id,
                    'type':        parsed['type'],
                    'status':      'available',
                    'title':       title,
                    'artist':      parsed.get('artist'),
                    'album':       parsed.get('album'),
                    'price':       detail.get('price'),
                    'condition':   detail.get('condition') or 'Б/У',
                    'description': detail.get('description'),
                    'cover_url':   cover_url,
                    'images':      image_urls if image_urls else None,
                    'shop_links':  {'meshok': lot['url']},
                    'meshok_id':   lot['meshok_id'],
                }
                # Remove None values to avoid Supabase type errors
                product = {k: v for k, v in product.items() if v is not None}

                try:
                    supabase.table('products').insert(product).execute()
                    print(f"       ✓ saved")
                    imported += 1
                except Exception as e:
                    print(f"       ✗ DB insert failed: {e}")

                await asyncio.sleep(1.5)  # polite delay

        await browser.close()

    print(f"\n{'=' * 50}")
    print(f"  Done! Imported: {imported} | Skipped: {skipped}")
    print(f"{'=' * 50}")


if __name__ == '__main__':
    asyncio.run(main())
