"""
Notification module for sending alerts about new eBay items
"""
import asyncio
from typing import Dict, List
from telegram import Bot
from telegram.error import TelegramError
from config import Config
from database import Database


class Notifier:
    """Handle notifications via Telegram"""

    def __init__(self, db: Database = None):
        """
        Initialize notifier

        Args:
            db: Database instance (optional). If provided, will use subscribers from DB.
                If not provided, will use TELEGRAM_CHAT_IDS from config (backward compatible)
        """
        self.enabled = Config.is_telegram_enabled()
        self.bot = None
        self.chat_ids = []
        self.db = db
        self.use_db_subscribers = db is not None

        if self.enabled:
            self.bot = Bot(token=Config.TELEGRAM_BOT_TOKEN)

            if self.use_db_subscribers:
                # Use subscribers from database
                self.chat_ids = self.db.get_active_subscribers()
                print(f"📱 Telegram: отправка уведомлений {len(self.chat_ids)} подписчикам из БД")
            else:
                # Backward compatibility: use config
                self.chat_ids = Config.TELEGRAM_CHAT_IDS
                print(f"📱 Telegram: отправка уведомлений {len(self.chat_ids)} получателям из конфига")

    async def send_new_item_notification(self, item: Dict) -> bool:
        """
        Send notification about new item to all recipients
        Returns True if sent successfully to at least one recipient
        """
        if not self.enabled:
            print("⚠️  Telegram notifications disabled (no credentials)")
            return False

        message = self._format_item_message(item)
        success_count = 0

        for chat_id in self.chat_ids:
            try:
                if item.get('image_url'):
                    # Send with image
                    await self.bot.send_photo(
                        chat_id=chat_id,
                        photo=item['image_url'],
                        caption=message,
                        parse_mode='HTML'
                    )
                else:
                    # Send text only
                    await self.bot.send_message(
                        chat_id=chat_id,
                        text=message,
                        parse_mode='HTML',
                        disable_web_page_preview=False
                    )

                success_count += 1

            except TelegramError as e:
                print(f"❌ Telegram error for chat_id {chat_id}: {e}")
            except Exception as e:
                print(f"❌ Unexpected error for chat_id {chat_id}: {e}")

        return success_count > 0

    def _format_item_message(self, item: Dict) -> str:
        """Format item details as Telegram message"""
        parts = [
            "🆕 <b>Новый лот на eBay!</b>\n",
            f"📦 <b>{item['title']}</b>\n"
        ]

        if item.get('price') and item.get('currency'):
            parts.append(f"💰 {item['price']} {item['currency']}")

        if item.get('condition'):
            parts.append(f"📋 Состояние: {item['condition']}")

        if item.get('seller'):
            parts.append(f"👤 Продавец: {item['seller']}")

        if item.get('listing_date'):
            parts.append(f"📅 Размещено: {item['listing_date']}")

        if item.get('keyword'):
            parts.append(f"\n🔍 Найдено по: <i>{item['keyword']}</i>")

        parts.append(f"\n🔗 <a href=\"{item['url']}\">Открыть на eBay</a>")

        return "\n".join(parts)

    async def send_summary(self, new_items_count: int, keywords: List[str]) -> bool:
        """Send summary notification to all recipients"""
        if not self.enabled or new_items_count == 0:
            return False

        message = (
            f"📊 <b>Сводка поиска eBay</b>\n\n"
            f"✨ Найдено новых лотов: <b>{new_items_count}</b>\n"
            f"🔍 Ключевые слова: {', '.join(keywords)}"
        )

        success_count = 0

        for chat_id in self.chat_ids:
            try:
                await self.bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='HTML'
                )
                success_count += 1

            except TelegramError as e:
                print(f"❌ Telegram error for chat_id {chat_id}: {e}")

        return success_count > 0

    async def send_error(self, error_message: str) -> bool:
        """Send error notification to all recipients"""
        if not self.enabled:
            return False

        message = f"❌ <b>Ошибка eBay Tracker</b>\n\n{error_message}"
        success_count = 0

        for chat_id in self.chat_ids:
            try:
                await self.bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='HTML'
                )
                success_count += 1

            except TelegramError as e:
                print(f"❌ Failed to send error notification to {chat_id}: {e}")

        return success_count > 0


# Synchronous wrapper functions for easier use
def notify_new_item(item: Dict, db: Database = None) -> bool:
    """
    Synchronous wrapper for sending new item notification

    Args:
        item: Item dictionary
        db: Database instance (optional). If provided, sends to DB subscribers.
    """
    notifier = Notifier(db=db)
    return asyncio.run(notifier.send_new_item_notification(item))


def notify_summary(new_items_count: int, keywords: List[str], db: Database = None) -> bool:
    """
    Synchronous wrapper for sending summary

    Args:
        new_items_count: Number of new items
        keywords: List of keywords
        db: Database instance (optional)
    """
    notifier = Notifier(db=db)
    return asyncio.run(notifier.send_summary(new_items_count, keywords))


def notify_error(error_message: str, db: Database = None) -> bool:
    """
    Synchronous wrapper for sending error

    Args:
        error_message: Error message
        db: Database instance (optional)
    """
    notifier = Notifier(db=db)
    return asyncio.run(notifier.send_error(error_message))
