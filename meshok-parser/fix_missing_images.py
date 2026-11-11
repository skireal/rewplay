"""
Дозагружает фото для лотов, у которых images=NULL (обычно из-за протухшего cf_clearance).
Запускай после обновления CF_CLEARANCE в .env
"""
import asyncio
import os

import httpx
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL        = os.getenv('SUPABASE_URL')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')
CF_CLEARANCE        = os.getenv('CF_CLEARANCE', '')
CF_USER_AGENT       = os.getenv('CF_USER_AGENT', 'Mozilla/5.0')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


def make_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        follow_redirects=True,
        timeout=30,
        headers={
            'User-Agent': CF_USER_AGENT,
            'Accept': 'image/*, */*',
            'Referer': 'https://meshok.net/',
        },
        cookies={'cf_clearance': CF_CLEARANCE} if CF_CLEARANCE else {},
    )


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
        print(f"    storage error: {e}")
        return None


async def main():
    print("Ищу лоты без фотографий...")
    rows = supabase.table('products').select('id,meshok_id,title').is_('images', 'null').execute()

    if not rows.data:
        print("Все лоты уже имеют фото.")
        return

    print(f"Найдено {len(rows.data)} лотов без фото\n")

    async with make_http_client() as http:
        # Test CDN access first
        test_id = rows.data[0]['meshok_id']
        test_url = f"https://meshok.net/i/{test_id}.0.jpg"
        r = await http.get(test_url, timeout=10)
        if r.status_code == 403:
            print(f"Cloudflare block (403). Обнови CF_CLEARANCE в .env и запусти снова.")
            return
        print(f"CDN доступен (HTTP {r.status_code})\n")

        for row in rows.data:
            mid = row['meshok_id']
            pid = row['id']
            title = row['title']
            print(f"  [{mid}] {title}")

            img_bytes_list = await fetch_lot_images(mid, http)
            if not img_bytes_list:
                print(f"    нет фото (CDN вернул 0 файлов)")
                continue

            image_urls = []
            cover_url = None
            for j, img_bytes in enumerate(img_bytes_list):
                stored = upload_image(img_bytes, pid, f"{j+1}.jpg")
                if stored:
                    image_urls.append(stored)
                    if j == 0:
                        cover_url = stored

            if image_urls:
                supabase.table('products').update({
                    'images': image_urls,
                    'cover_url': cover_url,
                }).eq('id', pid).execute()
                print(f"    OK: {len(image_urls)} фото загружено")
            else:
                print(f"    не удалось загрузить в Storage")

            await asyncio.sleep(1)

    print("\nГотово!")


if __name__ == '__main__':
    asyncio.run(main())
