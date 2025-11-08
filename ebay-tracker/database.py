"""
Database module for tracking seen eBay items
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional


class Database:
    """SQLite database for tracking seen eBay items"""

    def __init__(self, db_path: str):
        """Initialize database connection"""
        self.db_path = db_path

        # Ensure database directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        # Initialize database
        self._init_db()

    def _init_db(self):
        """Create database tables if they don't exist"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Create items table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS seen_items (
                    item_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    price TEXT,
                    currency TEXT,
                    url TEXT NOT NULL,
                    image_url TEXT,
                    condition_display TEXT,
                    seller_username TEXT,
                    listing_date TEXT,
                    search_keyword TEXT,
                    first_seen_at TEXT NOT NULL,
                    notified INTEGER DEFAULT 0
                )
            ''')

            # Create index for faster lookups
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_first_seen
                ON seen_items(first_seen_at DESC)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_search_keyword
                ON seen_items(search_keyword)
            ''')

            conn.commit()

    def is_item_seen(self, item_id: str) -> bool:
        """Check if item has been seen before"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM seen_items WHERE item_id = ?', (item_id,))
            return cursor.fetchone() is not None

    def add_item(self, item: Dict) -> bool:
        """
        Add new item to database
        Returns True if item is new, False if already exists
        """
        if self.is_item_seen(item['item_id']):
            return False

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO seen_items (
                    item_id, title, price, currency, url, image_url,
                    condition_display, seller_username, listing_date,
                    search_keyword, first_seen_at, notified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item['item_id'],
                item['title'],
                item.get('price'),
                item.get('currency'),
                item['url'],
                item.get('image_url'),
                item.get('condition'),
                item.get('seller'),
                item.get('listing_date'),
                item.get('keyword'),
                datetime.now().isoformat(),
                0  # not notified yet
            ))
            conn.commit()
            return True

    def mark_as_notified(self, item_id: str):
        """Mark item as notified"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE seen_items SET notified = 1 WHERE item_id = ?',
                (item_id,)
            )
            conn.commit()

    def get_recent_items(self, limit: int = 10, keyword: Optional[str] = None) -> List[Dict]:
        """Get recent items, optionally filtered by keyword"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if keyword:
                cursor.execute('''
                    SELECT * FROM seen_items
                    WHERE search_keyword = ?
                    ORDER BY first_seen_at DESC
                    LIMIT ?
                ''', (keyword, limit))
            else:
                cursor.execute('''
                    SELECT * FROM seen_items
                    ORDER BY first_seen_at DESC
                    LIMIT ?
                ''', (limit,))

            return [dict(row) for row in cursor.fetchall()]

    def get_stats(self) -> Dict:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Total items
            cursor.execute('SELECT COUNT(*) FROM seen_items')
            total = cursor.fetchone()[0]

            # Items by keyword
            cursor.execute('''
                SELECT search_keyword, COUNT(*) as count
                FROM seen_items
                GROUP BY search_keyword
                ORDER BY count DESC
            ''')
            by_keyword = dict(cursor.fetchall())

            # Items today
            today = datetime.now().date().isoformat()
            cursor.execute(
                'SELECT COUNT(*) FROM seen_items WHERE DATE(first_seen_at) = ?',
                (today,)
            )
            today_count = cursor.fetchone()[0]

            return {
                'total_items': total,
                'items_by_keyword': by_keyword,
                'items_today': today_count
            }

    def cleanup_old_items(self, days: int = 30):
        """Remove items older than specified days"""
        from datetime import timedelta

        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                'DELETE FROM seen_items WHERE first_seen_at < ?',
                (cutoff_date,)
            )
            deleted = cursor.rowcount
            conn.commit()

        return deleted
