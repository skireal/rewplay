-- Rewplay Database Schema
-- Схема базы данных для каталога аудиокассет

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица кассет
CREATE TABLE cassettes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Основная информация
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255) NOT NULL,
  year INTEGER CHECK (year >= 1960 AND year <= 2030),
  label VARCHAR(255), -- Лейбл
  catalog_number VARCHAR(100), -- Каталожный номер

  -- Цена и наличие
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  in_stock BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),

  -- Медиа
  cover_url TEXT, -- URL обложки альбома
  images JSONB, -- Дополнительные изображения

  -- Описание
  description TEXT,
  condition VARCHAR(50), -- Состояние: новая, б/у отличное, б/у хорошее и т.д.
  notes TEXT, -- Дополнительные заметки

  -- Ссылки на магазины
  shop_links JSONB, -- {"ozon": "url", "wildberries": "url", "avito": "url"}

  -- Теги и категории
  tags TEXT[], -- Массив тегов: жанры, особенности и т.д.
  genre VARCHAR(100),

  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Полнотекстовый поиск
  search_vector tsvector
);

-- Индексы для быстрого поиска
CREATE INDEX idx_cassettes_artist ON cassettes(artist);
CREATE INDEX idx_cassettes_album ON cassettes(album);
CREATE INDEX idx_cassettes_in_stock ON cassettes(in_stock);
CREATE INDEX idx_cassettes_price ON cassettes(price);
CREATE INDEX idx_cassettes_year ON cassettes(year);
CREATE INDEX idx_cassettes_genre ON cassettes(genre);
CREATE INDEX idx_cassettes_tags ON cassettes USING GIN(tags);
CREATE INDEX idx_cassettes_search ON cassettes USING GIN(search_vector);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cassettes_updated_at
  BEFORE UPDATE ON cassettes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для обновления search_vector (полнотекстовый поиск)
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.artist, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.album, '')), 'B') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cassettes_search_vector
  BEFORE INSERT OR UPDATE ON cassettes
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Таблица для отслеживания истории изменений цен (опционально)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cassette_id UUID REFERENCES cassettes(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Функция для логирования изменений цены
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_history (cassette_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cassettes_price_change
  AFTER UPDATE ON cassettes
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- Примеры данных для тестирования
INSERT INTO cassettes (artist, album, year, price, in_stock, quantity, genre, tags, condition, description, shop_links)
VALUES
  (
    'Кино',
    'Группа крови',
    1988,
    1500.00,
    true,
    3,
    'Рок',
    ARRAY['русский рок', 'классика', '80-е'],
    'Новая',
    'Культовый альбом группы Кино. Запечатанная кассета, оригинальное издание.',
    '{"ozon": "https://ozon.ru/example", "wildberries": "https://wb.ru/example"}'::jsonb
  ),
  (
    'ДДТ',
    'Актриса Весна',
    1992,
    1200.00,
    true,
    2,
    'Рок',
    ARRAY['русский рок', '90-е'],
    'Б/У Отличное',
    'Альбом ДДТ в отличном состоянии. Кассета проверена, звук чистый.',
    '{"avito": "https://avito.ru/example"}'::jsonb
  ),
  (
    'Аквариум',
    'Радио Африка',
    1983,
    2000.00,
    false,
    0,
    'Рок',
    ARRAY['русский рок', 'классика', '80-е', 'раритет'],
    'Б/У Хорошее',
    'Раритетная кассета. Продана, но можем найти аналог.',
    NULL
  );

-- Представление для удобного отображения товаров в наличии
CREATE VIEW available_cassettes AS
SELECT
  id,
  artist,
  album,
  year,
  price,
  quantity,
  genre,
  tags,
  condition,
  cover_url,
  shop_links
FROM cassettes
WHERE in_stock = true
ORDER BY created_at DESC;

-- Представление для статистики
CREATE VIEW catalog_stats AS
SELECT
  COUNT(*) as total_cassettes,
  COUNT(*) FILTER (WHERE in_stock = true) as in_stock_count,
  SUM(quantity) as total_quantity,
  AVG(price) as average_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(DISTINCT artist) as unique_artists,
  COUNT(DISTINCT genre) as unique_genres
FROM cassettes;
