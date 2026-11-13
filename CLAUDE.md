# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rewplay — каталог кассет на продажу. Монорепо с несколькими компонентами:

- **website/** — Next.js 14 (App Router) — основной сайт
- **ebay-tracker/** — Python-бот, мониторит eBay и уведомляет в Telegram (GitHub Actions, каждые 3 часа)
- **telegram-bot/** — Node.js-бот для Telegram
- **database/** — SQL-схема для Supabase

## Commands

```bash
# Website
cd website
npm run dev          # dev-сервер на localhost:3000
npm run build        # production build
npm run lint         # ESLint

# Импорт данных
npm run import:avito           # импорт кассет с Авито
npm run import:avito:dry       # dry-run (без записи в БД)
npm run images:gen             # генерация скрипта для изображений
npm run images:update          # обновление cover_url в БД
```

## Architecture

### Data Flow

```
Avito/eBay → scripts → Supabase DB ← Next.js Website (ISR, revalidate:30)
                                ↕
                          Telegram Bot
```

Supabase предоставляет auto-REST API — отдельного бэкенда нет. Все запросы к БД идут через `@supabase/supabase-js` напрямую из Next.js.

### Website Structure

- **Server Components** (`app/catalog/page.tsx`, `app/page.tsx`) — fetching данных на сервере
- **Client Components** (`CatalogClient.tsx`, `AdminClient.tsx`, `AdminForm.tsx`) — интерактивность в браузере
- Фильтрация/поиск/сортировка каталога — полностью на клиенте по заранее загруженным данным
- **ISR** (`revalidate: 30`) — страницы кэшируются и обновляются каждые 30 секунд

### Admin Auth

- `POST /api/admin/auth` — сравнивает пароль с `ADMIN_PASSWORD`, устанавливает httpOnly cookie `admin_token` (значение = `ADMIN_SECRET`)
- `middleware.ts` — защищает все `/admin/*` маршруты (кроме `/admin/login`), валидирует cookie против `ADMIN_SECRET`

### Database (Supabase)

Главная таблица — `cassettes`:
- `status` — `'available'` | `'waiting'` (CHECK constraint; управляется через select в AdminForm)
- `shop_links` — JSONB `{ ozon?, wildberries?, avito? }`
- `tags` — `text[]`
- `cover_url` — URL из Supabase Storage bucket `Covers`
- `search_vector` — `tsvector` для full-text поиска на русском (обновляется триггером)

Вьюхи: `available_cassettes`, `catalog_stats`.
При изменении схемы, затрагивающей эти вьюхи — дропать их перед миграцией и пересоздавать после.

### Key Files

- `website/lib/supabase.ts` — инициализация клиента (anon key)
- `website/lib/constants.ts` — `COVERS_BUCKET`, `ADMIN_TOKEN_COOKIE`
- `website/lib/utils.ts` — `formatPrice()`, `isNew()`
- `website/types/supabase.ts` — типы БД (обновлять при изменении схемы)
- `website/middleware.ts` — защита admin-роутов
- `database/schema.sql` — полная SQL-схема с триггерами и индексами

## Environment Variables

**website/.env.local:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=       # пароль для входа в /admin
ADMIN_SECRET=         # значение cookie (обычно = ADMIN_PASSWORD)
```

**ebay-tracker/.env:**
```
EBAY_APP_ID, EBAY_CERT_ID
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
SEARCH_KEYWORDS, EXCLUDE_KEYWORDS, MIN_PRICE, MAX_PRICE
```

## Database Migrations

SQL-миграции запускаются вручную через **Supabase Dashboard → SQL Editor**.
Скрипты хранятся в `website/scripts/migration-*.sql`.

Если миграция дропает колонку, на которую ссылаются вьюхи — сначала дропнуть вьюхи, потом колонку, потом пересоздать вьюхи.

## Статус проекта

@docs/project-status.md
