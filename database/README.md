# База данных Rewplay

Универсальная схема для кассет, CD и мерча. Единая БД для сайта, Telegram-канала и Excel-экспорта.

## Таблица `products`

### Тип товара (`type`)

| Значение    | Описание          |
|-------------|-------------------|
| `cassette`  | Аудиокассета      |
| `cd`        | Компакт-диск      |
| `merch`     | Мерч              |

### Статус (`status`)

| Значение     | Описание                        |
|--------------|---------------------------------|
| `available`  | В наличии, выставлен на продажу |
| `reserved`   | Забронирован покупателем        |
| `in_transit` | Едет к нам (ещё не получен)     |
| `sold`       | Продан                          |

### Основные поля

| Поле             | Тип           | Описание                             |
|------------------|---------------|--------------------------------------|
| `id`             | UUID          | Уникальный ID (авто)                 |
| `type`           | VARCHAR       | Тип товара                           |
| `status`         | VARCHAR       | Статус                               |
| `title`          | TEXT          | Полный заголовок лота                |
| `artist`         | VARCHAR       | Исполнитель / группа                 |
| `album`          | VARCHAR       | Альбом (для кассет и CD)             |
| `year`           | INTEGER       | Год выпуска                          |
| `label`          | VARCHAR       | Лейбл                                |
| `catalog_number` | VARCHAR       | Каталожный номер                     |
| `price`          | DECIMAL       | Цена                                 |
| `quantity`       | INTEGER       | Количество (обычно 1)                |
| `condition`      | VARCHAR       | Состояние                            |
| `genre`          | VARCHAR       | Жанр                                 |
| `tags`           | TEXT[]        | Теги                                 |
| `description`    | TEXT          | Описание (публичное)                 |
| `notes`          | TEXT          | Внутренние заметки (не для публики)  |
| `cover_url`      | TEXT          | Главное фото (Supabase Storage URL)  |
| `images`         | JSONB         | Массив доп. фото                     |
| `shop_links`     | JSONB         | Ссылки на площадки                   |
| `meshok_id`      | BIGINT        | ID лота на meshok.net                |
| `meshok_end_date`| TIMESTAMPTZ   | Дата окончания лота на мешке         |
| `metadata`       | JSONB         | Специфичные поля по типу             |

### `metadata` по типу товара

**Мерч:**
```json
{
  "item_type": "t-shirt",
  "size": "L",
  "color": "black"
}
```

**Кассеты/CD** — пока пустой `{}`, расширяется по необходимости.

### `shop_links`

```json
{
  "meshok": "https://meshok.net/item/123",
  "avito":  "https://avito.ru/item/456",
  "ebay":   "https://ebay.com/itm/789"
}
```

### `images`

Массив постоянных URL из Supabase Storage:
```json
[
  "https://xxx.supabase.co/storage/v1/object/public/products/cassette-uuid/1.jpg",
  "https://xxx.supabase.co/storage/v1/object/public/products/cassette-uuid/2.jpg"
]
```

## Состояние (`condition`)

- `Новая`
- `Б/У Отличное`
- `Б/У Хорошее`
- `Б/У Удовлетворительное`
- `Коллекционная`

## Представления (Views)

| View                 | Описание                                  |
|----------------------|-------------------------------------------|
| `available_products` | Товары со статусом `available`            |
| `recently_added`     | Последние 20 добавленных (для TG-канала) |
| `catalog_stats`      | Статистика по всему каталогу              |

## Установка в Supabase

1. Зайди в Supabase Dashboard → твой проект
2. **SQL Editor** → New query
3. Скопируй содержимое `schema.sql` и выполни
4. В **Storage** создай публичный bucket с именем `products`

## Примеры запросов

```sql
-- Все кассеты в наличии
SELECT * FROM available_products WHERE type = 'cassette';

-- Всё, что едет к нам
SELECT title, artist, price FROM products WHERE status = 'in_transit';

-- Поиск
SELECT * FROM products
WHERE search_vector @@ to_tsquery('russian', 'joy & division');

-- Мерч размера L
SELECT * FROM products
WHERE type = 'merch' AND metadata->>'size' = 'L';

-- Статистика
SELECT * FROM catalog_stats;
```
