# Rewplay — статус проекта

Обновлять при каждом значимом изменении (деплой, решение, отложенная задача).
Секретных значений здесь нет и быть не должно.

## Стек (актуально)
- Сайт: Next.js 15.5 (App Router), React 19, `website/`. Таблица в Supabase — `products` (проект `egpmlxkrpmonabcbibmv`); часть описания в CLAUDE.md про `cassettes` устарела.
- Хостинг: Cloudflare Workers через `@opennextjs/cloudflare` (Vercel отвергнут: верификация аккаунта и некоммерческий Hobby-план).
- Деплой: Workers Builds из GitHub `skireal/rewplay`, root dir `/website`, ветка `main`. В Cloudflare Build variables нужны `NODE_VERSION=22`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (NEXT_PUBLIC_* вшиваются при сборке).
- Runtime-секреты (Worker → Settings → Variables and secrets, блок Runtime): `ADMIN_PASSWORD`, `ADMIN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. В Build-секции они не работают.
- Рабочий адрес: `rewplay.shkireal.workers.dev`.

## Доступ
- Сайт закрыт Cloudflare Access (Zero Trust Free, scope All traffic, production и preview): вход по коду на почту для двух разрешённых адресов. Поисковики и посторонние доступа не имеют.
- Домен `rewplay.ru` (регистратор reg.ru) к воркеру НЕ подключён намеренно, пока сайт не готов. При запуске: добавить зону в Cloudflare, сменить NS у reg.ru, подключить Custom domain в воркере, снять Access.

## Особенности и ловушки
- Cloudflare Workers без `fs`: логотип `public/logo.svg` импортируется как строка через webpack `asset/source` (`next.config.js`).
- Бесплатный Supabase засыпает после недели без активности: пустой каталог или ошибки соединения, лечится Restore в панели Supabase.
- Деплой упал один раз с кодом 10013 (временный сбой Cloudflare API), повтор помог.
- Не коммитить `.claude/worktrees/` (gitlink ломал клонирование в Cloudflare).
- В origin/main часто попадают коммиты бота ebay-tracker, перед push нужен `git pull --rebase origin main`.

## Решения
- Тексты сайта меняются только после согласования точной формулировки с владельцем.
- Админ-пароль и `ADMIN_SECRET` на проде должны быть длинными и случайными.

## Отложено
- Общая переработка текстов сайта (hero, заголовки, футер, title/description в `layout.tsx`).
- Актуальная БД и наполнение товарами (вместе с партнёром).
- Автопостинг в Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` пока пусты).
- Экспорт в Google Таблицы.
- Проверить `ebay-tracker/.env.uk` (лежит в репозитории, возможно с секретами).
- `npm audit` предупреждения.
- Обновить раздел Architecture в CLAUDE.md (Next 14 -> 15, `cassettes` -> `products`).
