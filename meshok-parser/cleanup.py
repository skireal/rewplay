"""Удаляет все файлы из Storage bucket 'products' и все записи из таблицы products."""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SECRET_KEY'))

# Удаляем все записи из БД
result = supabase.table('products').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
print(f"Удалено записей из БД: {len(result.data)}")

# Удаляем все файлы из Storage
folders = supabase.storage.from_('products').list()
print(f"Папок в Storage: {len(folders)}")

for folder in folders:
    name = folder['name']
    files = supabase.storage.from_('products').list(name)
    paths = [f"{name}/{f['name']}" for f in files]
    if paths:
        supabase.storage.from_('products').remove(paths)
        print(f"  Удалена папка {name} ({len(paths)} файлов)")

print("Готово!")
