from bs4 import BeautifulSoup
import re

with open('meshok_lots.html', encoding='utf-8', errors='ignore') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
links = [a['href'] for a in soup.find_all('a', href=True) if re.search(r'/item/|/lot/', a['href'])]
unique = sorted(set(links))
print(f'Всего ссылок на лоты: {len(unique)}')
for l in unique:
    print(l)
