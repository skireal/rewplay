#!/usr/bin/env python3
"""
Telegram bot for managing eBay tracker subscriptions
Run this bot separately to allow users to subscribe/unsubscribe
"""
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from config import Config
from database import Database


# Initialize database
db = Database(Config.DB_PATH)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - subscribe user"""
    chat_id = str(update.effective_chat.id)
    user = update.effective_user

    is_new = db.add_subscriber(
        chat_id=chat_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name
    )

    if is_new:
        message = (
            "✅ <b>Добро пожаловать в eBay Tracker!</b>\n\n"
            "Вы успешно подписаны на уведомления о новых лотах на eBay.\n\n"
            f"🔍 Отслеживаемые запросы:\n"
            f"{chr(10).join(f'  • {kw}' for kw in Config.SEARCH_KEYWORDS)}\n\n"
            "Команды:\n"
            "/status - проверить статус подписки\n"
            "/stats - статистика трекера\n"
            "/stop - отписаться от уведомлений"
        )
    else:
        message = (
            "👋 <b>С возвращением!</b>\n\n"
            "Ваша подписка снова активна. Вы будете получать уведомления о новых лотах.\n\n"
            "Команды:\n"
            "/status - проверить статус подписки\n"
            "/stats - статистика трекера\n"
            "/stop - отписаться"
        )

    await update.message.reply_text(message, parse_mode='HTML')


async def stop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /stop command - unsubscribe user"""
    chat_id = str(update.effective_chat.id)

    was_active = db.remove_subscriber(chat_id)

    if was_active:
        message = (
            "👋 <b>Вы отписаны</b>\n\n"
            "Вы больше не будете получать уведомления о новых лотах.\n\n"
            "Чтобы снова подписаться, используйте /start"
        )
    else:
        message = (
            "ℹ️ Вы уже отписаны или не были подписаны.\n\n"
            "Чтобы подписаться, используйте /start"
        )

    await update.message.reply_text(message, parse_mode='HTML')


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command - check subscription status"""
    chat_id = str(update.effective_chat.id)

    is_subscribed = db.is_subscribed(chat_id)

    if is_subscribed:
        message = (
            "✅ <b>Подписка активна</b>\n\n"
            "Вы получаете уведомления о новых лотах.\n\n"
            f"🔍 Отслеживаемые запросы:\n"
            f"{chr(10).join(f'  • {kw}' for kw in Config.SEARCH_KEYWORDS)}\n\n"
            f"🌍 Регион: {Config.EBAY_SITE_ID}\n\n"
            "Команды:\n"
            "/stats - статистика трекера\n"
            "/stop - отписаться"
        )
    else:
        message = (
            "❌ <b>Подписка неактивна</b>\n\n"
            "Вы не получаете уведомления.\n\n"
            "Чтобы подписаться, используйте /start"
        )

    await update.message.reply_text(message, parse_mode='HTML')


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /stats command - show tracker statistics"""
    item_stats = db.get_stats()
    sub_stats = db.get_subscriber_stats()

    message = (
        "📊 <b>Статистика eBay Tracker</b>\n\n"
        f"<b>Лоты:</b>\n"
        f"  • Всего найдено: {item_stats['total_items']}\n"
        f"  • Сегодня: {item_stats['items_today']}\n\n"
        f"<b>Подписчики:</b>\n"
        f"  • Активных: {sub_stats['active_subscribers']}\n"
        f"  • Новых за неделю: {sub_stats['recent_subscribers']}\n"
        f"  • Всего регистраций: {sub_stats['total_subscribers']}\n\n"
        f"<b>Поисковые запросы:</b>\n"
    )

    for keyword, count in item_stats['items_by_keyword'].items():
        message += f"  • {keyword}: {count} лотов\n"

    await update.message.reply_text(message, parse_mode='HTML')


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    message = (
        "🤖 <b>eBay Tracker Bot</b>\n\n"
        "Автоматический мониторинг новых лотов на eBay с уведомлениями в Telegram.\n\n"
        "<b>Команды:</b>\n"
        "/start - подписаться на уведомления\n"
        "/stop - отписаться\n"
        "/status - проверить статус подписки\n"
        "/stats - статистика трекера\n"
        "/help - справка\n\n"
        f"<b>Отслеживаемые запросы:</b>\n"
        f"{chr(10).join(f'  • {kw}' for kw in Config.SEARCH_KEYWORDS)}\n\n"
        f"<b>Регион:</b> {Config.EBAY_SITE_ID}\n\n"
        "Трекер работает автоматически и проверяет новые лоты каждые 30 минут."
    )

    await update.message.reply_text(message, parse_mode='HTML')


def main():
    """Main bot function"""
    # Validate configuration
    if not Config.TELEGRAM_BOT_TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN not configured")
        print("Please set TELEGRAM_BOT_TOKEN in .env file")
        return 1

    if not Config.SEARCH_KEYWORDS:
        print("❌ Error: SEARCH_KEYWORDS not configured")
        print("Please set SEARCH_KEYWORDS in .env file")
        return 1

    print("🤖 Starting eBay Tracker Bot...")
    print(f"📍 Database: {Config.DB_PATH}")
    print(f"🔍 Tracking keywords: {', '.join(Config.SEARCH_KEYWORDS)}")

    # Get current subscriber count
    stats = db.get_subscriber_stats()
    print(f"👥 Current subscribers: {stats['active_subscribers']}")

    # Create application
    application = Application.builder().token(Config.TELEGRAM_BOT_TOKEN).build()

    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("stop", stop_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("help", help_command))

    # Start bot
    print("✅ Bot started! Users can now subscribe with /start")
    print("Press Ctrl+C to stop")

    application.run_polling(allowed_updates=Update.ALL_TYPES)

    return 0


if __name__ == '__main__':
    exit(main())
