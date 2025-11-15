"""
Configuration module for eBay tracker
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for eBay tracker"""

    # eBay API credentials
    EBAY_APP_ID = os.getenv('EBAY_APP_ID', '')
    EBAY_CERT_ID = os.getenv('EBAY_CERT_ID', '')

    # Telegram settings
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
    # Support multiple chat IDs (comma-separated)
    _chat_ids = os.getenv('TELEGRAM_CHAT_ID', '')
    TELEGRAM_CHAT_IDS = [chat_id.strip() for chat_id in _chat_ids.split(',') if chat_id.strip()]
    # For backward compatibility
    TELEGRAM_CHAT_ID = TELEGRAM_CHAT_IDS[0] if TELEGRAM_CHAT_IDS else ''

    # Search settings
    SEARCH_KEYWORDS = [kw.strip() for kw in os.getenv('SEARCH_KEYWORDS', '').split(',') if kw.strip()]

    # Exclude keywords (negative filter)
    EXCLUDE_KEYWORDS = [kw.strip().lower() for kw in os.getenv('EXCLUDE_KEYWORDS', '').split(',') if kw.strip()]

    # eBay settings
    EBAY_SITE_ID = os.getenv('EBAY_SITE_ID', 'EBAY_US')
    CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '30'))
    MAX_RESULTS = int(os.getenv('MAX_RESULTS', '50'))

    # Price filters
    MIN_PRICE = os.getenv('MIN_PRICE', '')
    MAX_PRICE = os.getenv('MAX_PRICE', '')

    # Condition filter
    CONDITION_FILTER = [c.strip() for c in os.getenv('CONDITION_FILTER', '').split(',') if c.strip()]

    # Location filters
    ITEM_LOCATION_COUNTRY = os.getenv('ITEM_LOCATION_COUNTRY', '')
    ITEM_LOCATION_POSTAL_CODE = os.getenv('ITEM_LOCATION_POSTAL_CODE', '')
    ITEM_LOCATION_RADIUS = os.getenv('ITEM_LOCATION_RADIUS', '')
    LOCATED_IN = os.getenv('LOCATED_IN', '')
    SHIPS_TO = os.getenv('SHIPS_TO', '')

    # Database
    DB_PATH = os.path.join(os.path.dirname(__file__), 'db', 'tracker.db')

    # eBay API endpoints
    EBAY_FINDING_API_URL = 'https://svcs.ebay.com/services/search/FindingService/v1'
    EBAY_BROWSE_API_URL = 'https://api.ebay.com/buy/browse/v1'
    EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token'

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []

        if not cls.EBAY_APP_ID:
            errors.append("EBAY_APP_ID is required")

        if not cls.SEARCH_KEYWORDS:
            errors.append("SEARCH_KEYWORDS is required (at least one keyword)")

        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(f"- {e}" for e in errors))

        return True

    @classmethod
    def is_telegram_enabled(cls):
        """Check if Telegram notifications are enabled"""
        return bool(cls.TELEGRAM_BOT_TOKEN and cls.TELEGRAM_CHAT_ID)
