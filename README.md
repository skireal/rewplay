# 🎵 Rewplay

Современная платформа для каталогизации и продажи винтажных аудиокассет с универсальной API-first архитектурой.

## 📋 Описание

Rewplay — это полнофункциональное решение для управления каталогом аудиокассет, включающее:

- 🌐 **Веб-сайт** (Next.js) — каталог с поиском и фильтрацией
- 🤖 **Telegram бот** — просмотр ассортимента и поиск
- 💾 **Единая БД** (Supabase) — одна база для всех клиентов
- 📊 **Админка** — простое управление товарами

## 🏗 Архитектура

```
┌─────────────────────────────────────────────┐
│         Supabase (PostgreSQL)               │
│      • База данных                          │
│      • Auto API (REST + GraphQL)            │
│      • Realtime subscriptions               │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
│  Website  │ │Telegram│ │  Future  │
│ (Next.js) │ │  Bot   │ │ Clients  │
└───────────┘ └────────┘ └──────────┘
```

**Преимущества:**
- ✅ Одна база данных для всех приложений
- ✅ API уже готово (не нужно писать backend)
- ✅ Легко добавить новые клиенты (мобильное приложение, админка и т.д.)
- ✅ Автоматическая синхронизация данных

## 📁 Структура проекта

```
rewplay/
├── database/              # Схема БД и скрипты
│   ├── schema.sql        # SQL схема для Supabase
│   ├── import-template.csv   # Шаблон для импорта
│   └── README.md         # Документация БД
│
├── website/              # Next.js веб-приложение
│   ├── app/             # Страницы (App Router)
│   │   ├── page.tsx     # Главная страница
│   │   ├── catalog/     # Каталог кассет
│   │   └── admin/       # Админка
│   ├── lib/             # Утилиты (Supabase клиент)
│   ├── types/           # TypeScript типы
│   └── package.json
│
└── telegram-bot/         # Telegram бот
    ├── index.js         # Основной файл бота
    ├── package.json
    └── README.md
```

## 🚀 Быстрый старт

### 1. Настройка Supabase

1. Создайте аккаунт на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Перейдите в **SQL Editor**
4. Скопируйте и выполните содержимое `database/schema.sql`
5. Сохраните URL и API ключ проекта (Settings → API)

### 2. Запуск веб-сайта

```bash
cd website

# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env

# Заполните .env:
# NEXT_PUBLIC_SUPABASE_URL=ваш-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-ключ

# Запустите dev-сервер
npm run dev
```

Откройте http://localhost:3000

### 3. Запуск Telegram бота

```bash
cd telegram-bot

# Установите зависимости
npm install

# Создайте бота через @BotFather в Telegram
# Получите токен

# Создайте .env файл
cp .env.example .env

# Заполните .env:
# TELEGRAM_BOT_TOKEN=ваш-токен
# SUPABASE_URL=тот-же-url
# SUPABASE_ANON_KEY=тот-же-ключ

# Запустите бота
npm start
```

## 📝 Заполнение БД

### Способ 1: Через админку сайта

1. Откройте http://localhost:3000/admin
2. Заполните форму добавления кассеты
3. Нажмите "Добавить"

### Способ 2: Через Supabase Dashboard

1. Откройте Supabase Dashboard → Table Editor
2. Выберите таблицу `cassettes`
3. Нажмите "Insert row" или "Import data"
4. Заполните поля или импортируйте CSV

### Способ 3: CSV импорт

1. Откройте `database/import-template.csv`
2. Заполните данными (можно в Excel)
3. Сохраните как CSV
4. В Supabase: Table Editor → Import → выберите файл

## 🎨 Возможности

### Веб-сайт

- 🏠 Главная страница с новыми поступлениями
- 📚 Полный каталог с фильтрацией
- 🔍 Детальная страница кассеты
- 🛒 Ссылки на торговые площадки
- ⚙️ Админка для добавления товаров
- 📱 Адаптивный дизайн

### Telegram бот

- `/catalog` - Кассеты в наличии
- `/all` - Весь каталог
- `/search [запрос]` - Поиск
- `/stats` - Статистика

### База данных

- 📊 Полнотекстовый поиск (русский язык)
- 🏷 Теги и категоризация
- 💰 История изменения цен
- 📈 Автоматические представления (views) для статистики
- 🔄 Автообновление полей (updated_at)

## 🛠 Технологии

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Server Components

**Backend:**
- Supabase (PostgreSQL)
- Auto-generated REST API
- Real-time subscriptions

**Telegram Bot:**
- Node.js
- node-telegram-bot-api

## 📦 Деплой

### Веб-сайт на Vercel (бесплатно)

```bash
cd website

# Установите Vercel CLI
npm i -g vercel

# Деплой
vercel

# Добавьте environment variables в Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Telegram бот на Render.com (бесплатно)

1. Создайте аккаунт на [render.com](https://render.com)
2. New → Background Worker
3. Подключите репозиторий
4. Root Directory: `telegram-bot`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Добавьте Environment Variables

## 📚 Документация

- [Database Schema](./database/README.md) - Полное описание БД
- [Website](./website/README.md) - Next.js приложение (если создадите)
- [Telegram Bot](./telegram-bot/README.md) - Документация бота

## 🔮 Идеи для развития

**Функции:**
- [ ] Фильтры по жанру, году, цене
- [ ] Wishlist / Избранное
- [ ] Корзина и оформление заказа
- [ ] Уведомления о новых поступлениях
- [ ] Интеграция с оплатой (ЮKassa, Stripe)
- [ ] Отзывы покупателей

**Технические улучшения:**
- [ ] Загрузка обложек альбомов
- [ ] Оптимизация изображений (Next.js Image)
- [ ] Кэширование данных
- [ ] Rate limiting для API
- [ ] Аутентификация для админки

**Новые клиенты:**
- [ ] Мобильное приложение (React Native)
- [ ] Десктоп приложение (Electron)
- [ ] Chrome расширение
- [ ] REST API документация (Swagger)

## 🤝 Вклад

Проект создан как стартовый шаблон. Вы можете:

1. Форкнуть репозиторий
2. Создать ветку для фичи
3. Сделать коммит
4. Создать Pull Request

## 📄 Лицензия

MIT

---

**Создано с помощью:**
- ☁️ [Supabase](https://supabase.com) - БД и Backend
- ⚡ [Next.js](https://nextjs.org) - React фреймворк
- 💬 [Telegram](https://core.telegram.org/bots/api) - Bot API

**Готово к использованию!** Просто настройте Supabase, установите зависимости и начинайте работу.
