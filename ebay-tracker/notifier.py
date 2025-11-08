"""
Notification module for sending alerts about new eBay items
"""
import asyncio
from typing import Dict, List
from telegram import Bot
from telegram.error import TelegramError
from config import Config


class Notifier:
    """Handle notifications via Telegram"""

    def __init__(self):
        """Initialize notifier"""
        self.enabled = Config.is_telegram_enabled()
        self.bot = None

        if self.enabled:
            self.bot = Bot(token=Config.TELEGRAM_BOT_TOKEN)
            self.chat_id = Config.TELEGRAM_CHAT_ID

    async def send_new_item_notification(self, item: Dict) -> bool:
        """
        Send notification about new item
        Returns True if sent successfully, False otherwise
        """
        if not self.enabled:
            print("⚠️  Telegram notifications disabled (no credentials)")
            return False

        try:
            message = self._format_item_message(item)

            if item.get('image_url'):
                # Send with image
                await self.bot.send_photo(
                    chat_id=self.chat_id,
                    photo=item['image_url'],
                    caption=message,
                    parse_mode='HTML'
                )
            else:
                # Send text only
                await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=message,
                    parse_mode='HTML',
                    disable_web_page_preview=False
                )

            return True

        except TelegramError as e:
            print(f"❌ Telegram error: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False

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
        """Send summary notification"""
        if not self.enabled or new_items_count == 0:
            return False

        try:
            message = (
                f"📊 <b>Сводка поиска eBay</b>\n\n"
                f"✨ Найдено новых лотов: <b>{new_items_count}</b>\n"
                f"🔍 Ключевые слова: {', '.join(keywords)}"
            )

            await self.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode='HTML'
            )
            return True

        except TelegramError as e:
            print(f"❌ Telegram error: {e}")
            return False

    async def send_error(self, error_message: str) -> bool:
        """Send error notification"""
        if not self.enabled:
            return False

        try:
            message = f"❌ <b>Ошибка eBay Tracker</b>\n\n{error_message}"

            await self.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode='HTML'
            )
            return True

        except TelegramError as e:
            print(f"❌ Failed to send error notification: {e}")
            return False


# Synchronous wrapper functions for easier use
def notify_new_item(item: Dict) -> bool:
    """Synchronous wrapper for sending new item notification"""
    notifier = Notifier()
    return asyncio.run(notifier.send_new_item_notification(item))


def notify_summary(new_items_count: int, keywords: List[str]) -> bool:
    """Synchronous wrapper for sending summary"""
    notifier = Notifier()
    return asyncio.run(notifier.send_summary(new_items_count, keywords))


def notify_error(error_message: str) -> bool:
    """Synchronous wrapper for sending error"""
    notifier = Notifier()
    return asyncio.run(notifier.send_error(error_message))
