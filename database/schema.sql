-- Rewplay Database Schema
-- Универсальная схема для кассет, CD и мерча

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ОСНОВНАЯ ТАБЛИЦА ТОВАРОВ
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Тип товара
  type VARCHAR(20) NOT NULL CHECK (type IN ('cassette', 'cd', 'merch')),

  -- Статус
  -- available  = в наличии (выставлен на продажу)
  -- reserved   = забронирован покупателем
  -- in_transit = едет к нам (ещё не у нас)
  -- sold       = продан
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'in_transit', 'sold')),

  -- Основная информация
  title TEXT NOT NULL,              -- полный заголовок лота
  artist VARCHAR(255),              -- исполнитель / группа
  album VARCHAR(255),               -- название альбома (для кассет и CD)
  year INTEGER CHECK (year >= 1950 AND year <= 2030),
  label VARCHAR(255),               -- лейбл
  catalog_number VARCHAR(100),      -- каталожный номер

  -- Цена
  price DECIMAL(10, 2) CHECK (price >= 0),

  -- Количество (обычно 1, но для мерча может быть больше)
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),

  -- Состояние
  condition VARCHAR(50),            -- Новая, Б/У Отличное, Б/У Хорошее, Коллекционная

  -- Жанр и теги
  genre VARCHAR(100),
  tags TEXT[],

  -- Описание
  description TEXT,
  notes TEXT,                       -- внутренние заметки (не показываем публично)

  -- Медиа (URL из Supabase Storage — постоянные)
  cover_url TEXT,                   -- главное фото
  images JSONB,                     -- массив URL доп. фото: ["url1", "url2", ...]

  -- Ссылки на площадки
  shop_links JSONB,                 -- {"meshok": "url", "avito": "url", "ebay": "url"}

  -- Мешок
  meshok_id BIGINT UNIQUE,          -- ID лота на meshok.net (для дедупликации)
  meshok_end_date TIMESTAMPTZ,      -- дата окончания лота на мешке

  -- Специфичные поля по типу товара (JSONB)
  -- Для мерча:    {"item_type": "t-shirt", "size": "L", "color": "black"}
  -- Для кассет:   {} или дополнительные поля если нужны
  metadata JSONB DEFAULT '{}',

  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Полнотекстовый поиск
  search_vector TSVECTOR
);

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================

CREATE INDEX idx_products_type      ON products(type);
CREATE INDEX idx_products_status    ON products(status);
CREATE INDEX idx_products_artist    ON products(artist);
CREATE INDEX idx_products_genre     ON products(genre);
CREATE INDEX idx_products_price     ON products(price);
CREATE INDEX idx_products_meshok_id ON products(meshok_id);
CREATE INDEX idx_products_tags      ON products USING GIN(tags);
CREATE INDEX idx_products_search    ON products USING GIN(search_vector);
CREATE INDEX idx_products_metadata  ON products USING GIN(metadata);

-- ============================================================
-- ТРИГГЕРЫ
-- ============================================================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Обновление search_vector при insert/update
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.artist, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.album, '')),  'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')),  'B') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_search_vector();

-- ============================================================
-- ИСТОРИЯ ЦЕН
-- ============================================================

CREATE TABLE price_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  old_price   DECIMAL(10, 2),
  new_price   DECIMAL(10, 2),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON price_history(product_id);

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_history (product_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_change
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- ============================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================================

-- Товары в наличии
CREATE VIEW available_products AS
SELECT
  id, type, title, artist, album, year,
  price, condition, genre, tags,
  cover_url, images, shop_links, metadata
FROM products
WHERE status = 'available'
ORDER BY created_at DESC;

-- Статистика по каталогу
CREATE VIEW catalog_stats AS
SELECT
  COUNT(*)                                        AS total_products,
  COUNT(*) FILTER (WHERE status = 'available')   AS available_count,
  COUNT(*) FILTER (WHERE status = 'reserved')    AS reserved_count,
  COUNT(*) FILTER (WHERE status = 'in_transit')  AS in_transit_count,
  COUNT(*) FILTER (WHERE status = 'sold')        AS sold_count,
  COUNT(*) FILTER (WHERE type = 'cassette')      AS cassettes_count,
  COUNT(*) FILTER (WHERE type = 'cd')            AS cds_count,
  COUNT(*) FILTER (WHERE type = 'merch')         AS merch_count,
  AVG(price) FILTER (WHERE status = 'available') AS avg_price,
  MIN(price) FILTER (WHERE status = 'available') AS min_price,
  MAX(price) FILTER (WHERE status = 'available') AS max_price,
  COUNT(DISTINCT artist)                          AS unique_artists
FROM products;

-- Недавно добавленные (для Telegram-канала)
CREATE VIEW recently_added AS
SELECT
  id, type, title, artist, album, year,
  price, condition, genre,
  cover_url, images, shop_links,
  created_at
FROM products
WHERE status = 'available'
ORDER BY created_at DESC
LIMIT 20;
