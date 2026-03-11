-- Migration: replace in_stock + quantity with status field
-- Run in Supabase Dashboard → SQL Editor

-- 1. Drop dependent views first
DROP VIEW IF EXISTS available_cassettes;
DROP VIEW IF EXISTS catalog_stats;

-- 2. Add status column
ALTER TABLE cassettes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available'
  CHECK (status IN ('available', 'waiting'));

-- 3. Migrate existing data
UPDATE cassettes SET status = 'available' WHERE in_stock = true;
UPDATE cassettes SET status = 'waiting'   WHERE in_stock = false;

-- 4. Drop old columns
ALTER TABLE cassettes DROP COLUMN IF EXISTS in_stock;
ALTER TABLE cassettes DROP COLUMN IF EXISTS quantity;

-- 5. Recreate available_cassettes view
CREATE VIEW available_cassettes AS
SELECT id, artist, album, year, price, genre, tags, condition, cover_url, shop_links
FROM cassettes
WHERE status = 'available';

-- 6. Recreate catalog_stats view
CREATE VIEW catalog_stats AS
SELECT
  COUNT(*)                                          AS total_cassettes,
  COUNT(*) FILTER (WHERE status = 'available')      AS in_stock_count,
  ROUND(AVG(price), 0)                              AS average_price,
  MIN(price)                                        AS min_price,
  MAX(price)                                        AS max_price,
  COUNT(DISTINCT artist)                            AS unique_artists,
  COUNT(DISTINCT genre)                             AS unique_genres
FROM cassettes;
