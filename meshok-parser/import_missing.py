"""
Импортирует 5 лотов, которые не попали в основной парсер из-за Vue virtual scroller.
Также применяет SQL-фиксы для уже импортированных данных.
"""
import asyncio
import os
import uuid

import httpx
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL        = os.getenv('SUPABASE_URL')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')
CF_CLEARANCE        = os.getenv('CF_CLEARANCE', '')
CF_USER_AGENT       = os.getenv('CF_USER_AGENT', 'Mozilla/5.0')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# 5 missing lots extracted from DevTools HTML
MISSING_LOTS = [
    {
        'meshok_id': 361403245,
        'url': 'https://meshok.net/item/361403245_New_Order_Movement',
        'title': 'New Order – Movement',
        'type': 'cassette',
        'artist': 'New Order',
        'album': 'Movement',
        'price': 1800.0,
        'condition': 'Б/У',
    },
    {
        'meshok_id': 345888334,
        'url': 'https://meshok.net/item/345888334_Аудиокассета_Motown_Chartbusters_Vol_3',
        'title': 'Motown Chartbusters Vol. 3',
        'type': 'cassette',
        'artist': 'Motown Chartbusters Vol. 3',
        'album': None,
        'price': 1000.0,
        'condition': 'Б/У',
    },
    {
        'meshok_id': 345888229,
        'url': 'https://meshok.net/item/345888229_Аудиокассета_Billie_Holiday_Volume_II',
        'title': 'Billie Holiday Volume II',
        'type': 'cassette',
        'artist': 'Billie Holiday',
        'album': 'Volume II',
        'price': 500.0,
        'condition': 'Б/У',
    },
    {
        'meshok_id': 345878040,
        'url': 'https://meshok.net/item/345878040_Аудиокассета_Billie_Holiday_Live_1983',
        'title': 'Billie Holiday - Live, 1983',
        'type': 'cassette',
        'artist': 'Billie Holiday',
        'album': 'Live, 1983',
        'price': 500.0,
        'condition': 'Б/У',
    },
    {
        'meshok_id': 345867640,
        'url': 'https://meshok.net/item/345867640_John_Lennon_Imagine_2_кассеты_1988_EMI',
        'title': 'John Lennon – Imagine (2 кассеты, 1988 EMI)',
        'type': 'cassette',
        'artist': 'John Lennon',
        'album': 'Imagine (2 кассеты, 1988 EMI)',
        'price': 1800.0,
        'condition': 'Б/У',
    },
]


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


async def fetch_description(url: str, client: httpx.AsyncClient) -> str | None:
    from bs4 import BeautifulSoup
    import re
    try:
        r = await client.get(url, timeout=30)
        if r.status_code != 200:
            return None
        if 'cf_clearance' in r.text and 'cloudflare' in r.text.lower():
            return None
        soup = BeautifulSoup(r.text, 'html.parser')
        for sel in [
            {'class': re.compile(r'description|lot-desc|item-desc', re.I)},
            {'itemprop': 'description'},
        ]:
            el = soup.find(attrs=sel)
            if el:
                text = el.get_text(separator='\n', strip=True)
                if text and len(text) > 10:
                    return text
    except Exception as e:
        print(f"    ✗ fetch error: {e}")
    return None


async def fetch_lot_images(meshok_id: int, client: httpx.AsyncClient) -> list[bytes]:
    images = []
    for i in range(10):
        url = f"https://meshok.net/i/{meshok_id}.{i}.jpg"
        try:
            r = await client.get(url, timeout=15)
            if r.status_code in (404, 403):
                break
            if r.status_code == 200 and len(r.content) > 2000:
                images.append(r.content)
        except:
            break
    return images


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


def apply_sql_fixes():
    print("\nПрименяю SQL-фиксы для уже импортированных данных...")

    # Fix condition: all products that got condition='Новая' should be 'Б/У'
    r = supabase.table('products').update({'condition': 'Б/У'}).eq('condition', 'Новая').execute()
    print(f"  condition Новая->Б/У: {len(r.data)} записей обновлено")

    # Fix Joy Division and New Order CDs: type + strip ' CD' from album
    for meshok_id in [361402117, 361403136]:
        existing = supabase.table('products').select('id,album').eq('meshok_id', meshok_id).execute()
        if not existing.data:
            continue
        row = existing.data[0]
        album = (row.get('album') or '').replace(' CD', '').strip()
        supabase.table('products').update({'type': 'cd', 'album': album}).eq('meshok_id', meshok_id).execute()
        print(f"  meshok_id {meshok_id}: type->cd, album->'{album}'")

    print("  SQL-фиксы применены.")


async def main():
    print("=" * 50)
    print("  Импорт 5 пропущенных лотов -> Supabase")
    print("=" * 50)

    apply_sql_fixes()

    print("\nИмпортирую лоты...\n")
    imported = 0
    skipped = 0

    async with make_http_client() as http:
        for i, lot in enumerate(MISSING_LOTS, 1):
            print(f"[{i}/5] {lot['artist']} – {lot.get('album') or '(no album)'}")

            existing = supabase.table('products').select('id').eq('meshok_id', lot['meshok_id']).execute()
            if existing.data:
                print(f"       уже в БД, пропускаю")
                skipped += 1
                continue

            print(f"       загружаю описание...")
            desc = await fetch_description(lot['url'], http)

            img_bytes_list = await fetch_lot_images(lot['meshok_id'], http)
            print(f"       фото: {len(img_bytes_list)} | описание: {'да' if desc else 'нет'}")

            product_id = str(uuid.uuid4())
            image_urls = []
            cover_url = None

            for j, img_bytes in enumerate(img_bytes_list):
                stored = upload_image(img_bytes, product_id, f"{j+1}.jpg")
                if stored:
                    image_urls.append(stored)
                    if j == 0:
                        cover_url = stored

            print(f"       загружено в Storage: {len(image_urls)} фото")

            product = {
                'id':          product_id,
                'type':        lot['type'],
                'status':      'available',
                'title':       lot['title'],
                'artist':      lot['artist'],
                'album':       lot.get('album'),
                'price':       lot['price'],
                'condition':   lot['condition'],
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
