#!/usr/bin/env python3
"""
Test script to verify UK location filtering
"""
import os
import sys
from dotenv import load_dotenv

# Load .env file FIRST
load_dotenv()

# Then override only test-specific variables
os.environ['EBAY_SITE_ID'] = 'EBAY_UK'
os.environ['LOCATED_IN'] = 'GB'
os.environ['SEARCH_KEYWORDS'] = 'joy division cassette'
os.environ['MAX_RESULTS'] = '10'

from tracker import EbayTracker
from config import Config

def test_uk_filtering():
    """Test that only UK items are returned"""
    print("=" * 60)
    print("Testing UK Location Filtering")
    print("=" * 60)
    print(f"\n✓ EBAY_SITE_ID: {Config.EBAY_SITE_ID}")
    print(f"✓ LOCATED_IN: {Config.LOCATED_IN}")
    print(f"✓ SEARCH_KEYWORDS: {Config.SEARCH_KEYWORDS}")
    print(f"✓ MAX_RESULTS: {Config.MAX_RESULTS}")
    print("\n" + "=" * 60)

    if not Config.EBAY_APP_ID:
        print("\n❌ Error: EBAY_APP_ID not set!")
        print("Please set EBAY_APP_ID in your .env file")
        return False

    tracker = EbayTracker()

    # Test search
    print(f"\n🔍 Searching for: {Config.SEARCH_KEYWORDS[0]}")
    print("   (This will test Finding API with UK filters)")

    items = tracker.search_finding_api(Config.SEARCH_KEYWORDS[0])

    print(f"\n📊 Results:")
    print(f"   Found {len(items)} items")

    if items:
        print("\n📦 Sample items:")
        for i, item in enumerate(items[:5], 1):
            print(f"\n   {i}. {item['title'][:60]}")
            if item.get('price'):
                print(f"      💰 {item['price']} {item.get('currency', '')}")
            print(f"      🔗 {item['url']}")

            # Check if URL contains ebay.co.uk
            if 'ebay.co.uk' in item['url']:
                print(f"      ✅ UK listing (ebay.co.uk)")
            elif 'ebay.com.au' in item['url']:
                print(f"      ❌ WARNING: Australian listing!")
            elif 'ebay.com' in item['url']:
                print(f"      ⚠️  US listing (ebay.com)")
            else:
                print(f"      ❓ Unknown eBay site")

    # Check for non-UK items
    non_uk_items = [item for item in items if 'ebay.co.uk' not in item['url']]

    if non_uk_items:
        print(f"\n⚠️  WARNING: Found {len(non_uk_items)} non-UK items!")
        print("   The LOCATED_IN filter may not be working correctly.")
        print("\n   Non-UK items:")
        for item in non_uk_items[:3]:
            print(f"   - {item['title'][:50]}")
            print(f"     URL: {item['url'][:80]}")
    else:
        print(f"\n✅ SUCCESS: All {len(items)} items are from UK!")

    return len(non_uk_items) == 0

if __name__ == '__main__':
    try:
        success = test_uk_filtering()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
