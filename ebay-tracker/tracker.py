#!/usr/bin/env python3
"""
eBay Tracker - Monitor new listings on eBay by keywords
"""
import requests
import base64
import time
from datetime import datetime
from typing import List, Dict, Optional
from xml.etree import ElementTree as ET

from config import Config
from database import Database
from notifier import notify_new_item, notify_summary, notify_error


class EbayTracker:
    """Main tracker class for monitoring eBay listings"""

    def __init__(self):
        """Initialize tracker"""
        # Validate configuration
        Config.validate()

        # Initialize database
        self.db = Database(Config.DB_PATH)

        # OAuth token (for Browse API)
        self.access_token = None
        self.token_expires_at = 0

    def get_oauth_token(self) -> Optional[str]:
        """Get OAuth 2.0 token for Browse API"""
        # Check if we have a valid token
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token

        # Request new token
        try:
            # Create credentials string
            credentials = f"{Config.EBAY_APP_ID}:{Config.EBAY_CERT_ID}"
            b64_credentials = base64.b64encode(credentials.encode()).decode()

            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': f'Basic {b64_credentials}'
            }

            data = {
                'grant_type': 'client_credentials',
                'scope': 'https://api.ebay.com/oauth/api_scope'
            }

            response = requests.post(
                Config.EBAY_OAUTH_URL,
                headers=headers,
                data=data,
                timeout=10
            )

            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                # Set expiration time (with 60 second buffer)
                self.token_expires_at = time.time() + token_data['expires_in'] - 60
                return self.access_token
            else:
                print(f"❌ OAuth error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"❌ Failed to get OAuth token: {e}")
            return None

    def search_browse_api(self, keyword: str) -> List[Dict]:
        """
        Search using Browse API (modern, requires OAuth)
        """
        token = self.get_oauth_token()
        if not token:
            print("⚠️  No OAuth token, falling back to Finding API")
            return self.search_finding_api(keyword)

        try:
            headers = {
                'Authorization': f'Bearer {token}',
                'X-EBAY-C-MARKETPLACE-ID': self._get_marketplace_id()
            }

            params = {
                'q': keyword,
                'sort': 'newlyListed',
                'limit': min(Config.MAX_RESULTS, 200)  # API max is 200
            }

            # Add price filters if configured
            filters = []
            if Config.MIN_PRICE:
                filters.append(f'price:[{Config.MIN_PRICE}..]')
            if Config.MAX_PRICE:
                filters.append(f'price:[..{Config.MAX_PRICE}]')
            if Config.CONDITION_FILTER:
                conditions = '|'.join(Config.CONDITION_FILTER)
                filters.append(f'conditions:{{{conditions}}}')

            # Add location filters
            # Use ITEM_LOCATION_COUNTRY if set, otherwise fall back to LOCATED_IN
            location_country = Config.ITEM_LOCATION_COUNTRY
            if not location_country and Config.LOCATED_IN:
                # Convert LOCATED_IN (e.g., "GB") to itemLocationCountry format
                location_country = Config.LOCATED_IN.split(',')[0].strip()

            if location_country:
                filters.append(f'itemLocationCountry:{location_country}')

            if filters:
                params['filter'] = ','.join(filters)

            # Add buyerPostalCode for proximity search (separate parameter in Browse API)
            if Config.ITEM_LOCATION_POSTAL_CODE:
                params['buyerPostalCode'] = Config.ITEM_LOCATION_POSTAL_CODE
                if Config.ITEM_LOCATION_RADIUS:
                    params['searchRadius'] = Config.ITEM_LOCATION_RADIUS

            response = requests.get(
                f"{Config.EBAY_BROWSE_API_URL}/item_summary/search",
                headers=headers,
                params=params,
                timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                return self._parse_browse_response(data, keyword)
            else:
                print(f"❌ Browse API error: {response.status_code}")
                # Fallback to Finding API
                return self.search_finding_api(keyword)

        except Exception as e:
            print(f"❌ Browse API exception: {e}")
            return self.search_finding_api(keyword)

    def search_finding_api(self, keyword: str) -> List[Dict]:
        """
        Search using Finding API (legacy, simpler, no OAuth required)
        """
        try:
            params = {
                'OPERATION-NAME': 'findItemsAdvanced',
                'SERVICE-VERSION': '1.0.0',
                'SECURITY-APPNAME': Config.EBAY_APP_ID,
                'RESPONSE-DATA-FORMAT': 'JSON',
                'REST-PAYLOAD': '',
                'keywords': keyword,
                'sortOrder': 'StartTimeNewest',
                'paginationInput.entriesPerPage': min(Config.MAX_RESULTS, 100)
            }

            # Add filters
            filter_index = 0

            if Config.MIN_PRICE or Config.MAX_PRICE:
                if Config.MIN_PRICE:
                    params[f'itemFilter({filter_index}).name'] = 'MinPrice'
                    params[f'itemFilter({filter_index}).value'] = Config.MIN_PRICE
                    filter_index += 1
                if Config.MAX_PRICE:
                    params[f'itemFilter({filter_index}).name'] = 'MaxPrice'
                    params[f'itemFilter({filter_index}).value'] = Config.MAX_PRICE
                    filter_index += 1

            if Config.CONDITION_FILTER:
                params[f'itemFilter({filter_index}).name'] = 'Condition'
                for i, condition in enumerate(Config.CONDITION_FILTER):
                    params[f'itemFilter({filter_index}).value({i})'] = condition
                filter_index += 1

            # Location filters
            if Config.LOCATED_IN:
                params[f'itemFilter({filter_index}).name'] = 'LocatedIn'
                params[f'itemFilter({filter_index}).value'] = Config.LOCATED_IN
                filter_index += 1

            if Config.SHIPS_TO:
                params[f'itemFilter({filter_index}).name'] = 'AvailableTo'
                params[f'itemFilter({filter_index}).value'] = Config.SHIPS_TO
                filter_index += 1

            # Buyer postal code for proximity search
            if Config.ITEM_LOCATION_POSTAL_CODE:
                params['buyerPostalCode'] = Config.ITEM_LOCATION_POSTAL_CODE

            response = requests.get(
                Config.EBAY_FINDING_API_URL,
                params=params,
                timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                return self._parse_finding_response(data, keyword)
            else:
                print(f"❌ Finding API error: {response.status_code}")
                return []

        except Exception as e:
            print(f"❌ Finding API exception: {e}")
            return []

    def _parse_browse_response(self, data: Dict, keyword: str) -> List[Dict]:
        """Parse Browse API response"""
        items = []

        if 'itemSummaries' not in data:
            return items

        for item_data in data['itemSummaries']:
            try:
                item = {
                    'item_id': item_data['itemId'],
                    'title': item_data['title'],
                    'url': item_data['itemWebUrl'],
                    'keyword': keyword
                }

                # Price
                if 'price' in item_data:
                    item['price'] = item_data['price'].get('value', '')
                    item['currency'] = item_data['price'].get('currency', '')

                # Image
                if 'image' in item_data:
                    item['image_url'] = item_data['image'].get('imageUrl', '')

                # Condition
                if 'condition' in item_data:
                    item['condition'] = item_data['condition']

                # Seller (not always available in Browse API)
                if 'seller' in item_data:
                    item['seller'] = item_data['seller'].get('username', '')

                # Listing date (not directly available, use current time)
                item['listing_date'] = datetime.now().strftime('%Y-%m-%d %H:%M')

                # Listing type (Browse API uses buyingOptions)
                if 'buyingOptions' in item_data:
                    buying_options = item_data['buyingOptions']
                    if 'AUCTION' in buying_options:
                        item['listing_type'] = 'Auction'
                    elif 'FIXED_PRICE' in buying_options or 'BEST_OFFER' in buying_options:
                        item['listing_type'] = 'FixedPrice'

                # Auction details (Browse API)
                if 'itemAffiliateWebUrl' in item_data or 'itemEndDate' in item_data:
                    if 'itemEndDate' in item_data:
                        item['end_time'] = item_data['itemEndDate']
                if 'bidCount' in item_data:
                    item['bid_count'] = str(item_data['bidCount'])

                # Shipping info (Browse API)
                if 'shippingOptions' in item_data and len(item_data['shippingOptions']) > 0:
                    shipping = item_data['shippingOptions'][0]
                    if 'shippingCost' in shipping:
                        item['shipping_cost'] = shipping['shippingCost'].get('value', '0')
                        item['shipping_currency'] = shipping['shippingCost'].get('currency', '')

                # Exclude keywords filter
                excluded = False
                if Config.EXCLUDE_KEYWORDS:
                    title_lower = item['title'].lower()
                    for exclude_word in Config.EXCLUDE_KEYWORDS:
                        if exclude_word in title_lower:
                            # Skip this item - contains excluded keyword
                            print(f"      ⛔ Excluded ('{exclude_word}'): {item['title'][:50]}")
                            excluded = True
                            break

                if excluded:
                    continue

                # Location filtering for Browse API
                if Config.LOCATED_IN:
                    item_location = ''
                    item_country = ''

                    # Browse API has itemLocation field
                    if 'itemLocation' in item_data:
                        loc_data = item_data['itemLocation']
                        if 'country' in loc_data:
                            item_country = loc_data['country']
                        if 'city' in loc_data:
                            item_location = loc_data.get('city', '')
                        if 'postalCode' in loc_data:
                            item_location += ' ' + loc_data.get('postalCode', '')

                    full_location = f"{item_location} {item_country}".strip()

                    # Check if location matches LOCATED_IN filter
                    located_in_codes = [loc.strip().upper() for loc in Config.LOCATED_IN.split(',')]
                    location_matches = False

                    if full_location:
                        for loc_code in located_in_codes:
                            if loc_code in full_location.upper():
                                location_matches = True
                                break
                            # Check common country names
                            if loc_code == 'GB' and ('UNITED KINGDOM' in full_location.upper() or 'UK' in full_location.upper()):
                                location_matches = True
                                break
                    else:
                        # If no location data, trust the marketplace filter
                        # When searching EBAY_GB, items without location are likely from GB
                        if 'GB' in [loc.strip().upper() for loc in Config.LOCATED_IN.split(',')]:
                            marketplace_id = self._get_marketplace_id()
                            if marketplace_id == 'EBAY_GB':
                                location_matches = True
                                print(f"      ℹ️  No location data, trusting marketplace (EBAY_GB): {item['title'][:50]}")

                    # STRICT MODE: skip items that don't match location filter
                    if not location_matches:
                        print(f"      🚫 Filtered out (location: '{full_location}'): {item['title'][:50]}")
                        continue

                items.append(item)

            except Exception as e:
                print(f"⚠️  Error parsing item: {e}")
                continue

        return items

    def _parse_finding_response(self, data: Dict, keyword: str) -> List[Dict]:
        """Parse Finding API response"""
        items = []

        try:
            result = data['findItemsAdvancedResponse'][0]

            if result.get('ack', [''])[0] != 'Success':
                return items

            search_result = result.get('searchResult', [{}])[0]
            if 'item' not in search_result:
                return items

            for item_data in search_result['item']:
                try:
                    item = {
                        'item_id': item_data['itemId'][0],
                        'title': item_data['title'][0],
                        'url': item_data['viewItemURL'][0],
                        'keyword': keyword
                    }

                    # Price
                    if 'sellingStatus' in item_data:
                        price_info = item_data['sellingStatus'][0].get('currentPrice', [{}])[0]
                        item['price'] = price_info.get('__value__', '')
                        item['currency'] = price_info.get('@currencyId', '')

                    # Image
                    if 'galleryURL' in item_data:
                        item['image_url'] = item_data['galleryURL'][0]

                    # Condition
                    if 'condition' in item_data:
                        item['condition'] = item_data['condition'][0].get('conditionDisplayName', [''])[0]

                    # Seller
                    if 'sellerInfo' in item_data:
                        item['seller'] = item_data['sellerInfo'][0].get('sellerUserName', [''])[0]

                    # Listing date and type
                    if 'listingInfo' in item_data:
                        listing_info = item_data['listingInfo'][0]
                        if 'startTime' in listing_info:
                            # Parse ISO format: 2024-11-08T12:30:00.000Z
                            start_time = listing_info['startTime'][0]
                            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                            item['listing_date'] = dt.strftime('%Y-%m-%d %H:%M')
                        # Listing type: Auction, FixedPrice, etc.
                        if 'listingType' in listing_info:
                            item['listing_type'] = listing_info['listingType'][0]
                        # End time for auctions
                        if 'endTime' in listing_info:
                            item['end_time'] = listing_info['endTime'][0]

                    # Bid count for auctions
                    if 'sellingStatus' in item_data:
                        selling_status = item_data['sellingStatus'][0]
                        if 'bidCount' in selling_status:
                            item['bid_count'] = selling_status['bidCount'][0]

                    # Shipping info
                    if 'shippingInfo' in item_data:
                        shipping_info = item_data['shippingInfo'][0]
                        if 'shippingServiceCost' in shipping_info:
                            shipping_cost = shipping_info['shippingServiceCost'][0]
                            item['shipping_cost'] = shipping_cost.get('__value__', '0')
                            item['shipping_currency'] = shipping_cost.get('@currencyId', '')

                    # Exclude keywords filter
                    excluded = False
                    if Config.EXCLUDE_KEYWORDS:
                        title_lower = item['title'].lower()
                        for exclude_word in Config.EXCLUDE_KEYWORDS:
                            if exclude_word in title_lower:
                                # Skip this item - contains excluded keyword
                                print(f"      ⛔ Excluded ('{exclude_word}'): {item['title'][:50]}")
                                excluded = True
                                break

                    if excluded:
                        continue

                    # Location (for additional filtering)
                    item_location = ''
                    item_country = ''

                    # Try multiple location fields
                    if 'location' in item_data:
                        item_location = item_data['location'][0]
                    if 'country' in item_data:
                        item_country = item_data['country'][0]

                    # Also check shippingInfo for location
                    if 'shippingInfo' in item_data:
                        shipping_info = item_data['shippingInfo'][0]
                        if 'shipToLocations' in shipping_info:
                            item_country = shipping_info['shipToLocations'][0] if not item_country else item_country

                    # Combine location data
                    full_location = f"{item_location} {item_country}".strip()

                    # Additional location filter check (eBay API filter is not always reliable)
                    if Config.LOCATED_IN:
                        # Check if item location matches the filter
                        # Location can be country code (GB, US) or full location string
                        located_in_codes = [loc.strip().upper() for loc in Config.LOCATED_IN.split(',')]
                        location_matches = False

                        if full_location:
                            for loc_code in located_in_codes:
                                if loc_code in full_location.upper():
                                    location_matches = True
                                    break
                                # Also check common country names
                                if loc_code == 'GB' and ('UNITED KINGDOM' in full_location.upper() or 'UK' in full_location.upper()):
                                    location_matches = True
                                    break
                                if loc_code == 'US' and ('UNITED STATES' in full_location.upper() or 'USA' in full_location.upper()):
                                    location_matches = True
                                    break
                        else:
                            # If no location data, trust the marketplace filter
                            # Finding API: LOCATED_IN filter at API level should have already filtered
                            # But if we're looking for GB and have no location data, allow it through
                            if 'GB' in [loc.strip().upper() for loc in Config.LOCATED_IN.split(',')]:
                                if Config.EBAY_SITE_ID == 'EBAY_UK':
                                    location_matches = True
                                    print(f"      ℹ️  No location data, trusting marketplace (EBAY_UK): {item['title'][:50]}")

                        # STRICT MODE: If LOCATED_IN is set and location doesn't match, skip item
                        # This includes items with no location data
                        if not location_matches:
                            # Debug output to see filtered items
                            print(f"      🚫 Filtered out (location: '{full_location}'): {item['title'][:50]}")
                            continue

                    items.append(item)

                except Exception as e:
                    print(f"⚠️  Error parsing item: {e}")
                    continue

        except Exception as e:
            print(f"❌ Error parsing response: {e}")

        return items

    def _get_marketplace_id(self) -> str:
        """Get marketplace ID from site ID"""
        marketplace_map = {
            'EBAY_US': 'EBAY_US',
            'EBAY_UK': 'EBAY_GB',
            'EBAY_DE': 'EBAY_DE',
            'EBAY_AU': 'EBAY_AU',
            'EBAY_AT': 'EBAY_AT',
            'EBAY_CA': 'EBAY_CA',
            'EBAY_FR': 'EBAY_FR',
            'EBAY_IT': 'EBAY_IT',
            'EBAY_ES': 'EBAY_ES',
        }
        return marketplace_map.get(Config.EBAY_SITE_ID, 'EBAY_US')

    def run(self):
        """Run tracker for all configured keywords"""
        print("🚀 eBay Tracker started")
        print(f"🔍 Keywords: {', '.join(Config.SEARCH_KEYWORDS)}")
        print(f"📍 Site: {Config.EBAY_SITE_ID}")
        print(f"💬 Telegram: {'enabled' if Config.is_telegram_enabled() else 'disabled'}")
        print("─" * 50)

        total_new_items = 0

        for keyword in Config.SEARCH_KEYWORDS:
            print(f"\n🔎 Searching for: {keyword}")

            # Try Browse API first, falls back to Finding API if needed
            items = self.search_browse_api(keyword)

            print(f"   Found {len(items)} items")

            new_items = 0
            for item in items:
                if self.db.add_item(item):
                    new_items += 1
                    total_new_items += 1

                    # Print to console
                    print(f"\n   ✨ NEW: {item['title'][:60]}")
                    if item.get('price'):
                        print(f"      💰 {item['price']} {item.get('currency', '')}")
                    print(f"      🔗 {item['url']}")

                    # Send notification
                    if Config.is_telegram_enabled():
                        try:
                            # Use TELEGRAM_CHAT_ID from config instead of DB subscribers
                            notify_new_item(item, db=None)
                            self.db.mark_as_notified(item['item_id'])
                            time.sleep(1)  # Rate limiting
                        except Exception as e:
                            print(f"      ⚠️  Notification failed: {e}")

            if new_items > 0:
                print(f"   ✅ {new_items} new items for '{keyword}'")
            else:
                print(f"   ℹ️  No new items for '{keyword}'")

        # Summary
        print("\n" + "─" * 50)
        print(f"✅ Scan complete: {total_new_items} new items total")

        # Database stats
        stats = self.db.get_stats()
        print(f"📊 Database: {stats['total_items']} total items ({stats['items_today']} today)")

        return total_new_items


def main():
    """Main entry point"""
    try:
        tracker = EbayTracker()
        tracker.run()

    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("\nPlease check your .env file")
        return 1

    except KeyboardInterrupt:
        print("\n\n⏹️  Tracker stopped by user")
        return 0

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        if Config.is_telegram_enabled():
            notify_error(f"Tracker error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    exit(main())
