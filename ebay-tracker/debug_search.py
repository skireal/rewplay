#!/usr/bin/env python3
"""
Debug script to see what API returns for a specific search
"""
import os
import sys
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from tracker import EbayTracker
from config import Config

def debug_search(keyword):
    """Run search and show detailed results"""
    print(f"🔍 Debug search for: {keyword}")
    print(f"📍 Site: {Config.EBAY_SITE_ID}")
    print(f"🌍 LOCATED_IN: {Config.LOCATED_IN}")
    print(f"📦 SHIPS_TO: {Config.SHIPS_TO}")
    print(f"⛔ EXCLUDE_KEYWORDS: {Config.EXCLUDE_KEYWORDS}")
    print("─" * 80)

    tracker = EbayTracker()

    # Try Browse API (Finding API returned 500 error)
    print("\n📡 Calling Browse API...")
    items = tracker.search_browse_api(keyword)

    print(f"\n✅ Found {len(items)} items that passed filters")

    # Also show if any keywords would match
    print("\n🔍 Checking EXCLUDE_KEYWORDS logic:")
    test_title = "The Cure - Cassette Tape"
    for exclude_word in Config.EXCLUDE_KEYWORDS:
        if exclude_word in test_title.lower():
            print(f"  ⚠️  '{exclude_word}' WOULD match in '{test_title}'")
        else:
            print(f"  ✅ '{exclude_word}' would NOT match in '{test_title}'")

    # Count auctions
    auctions = [item for item in items if item.get('listing_type') == 'Auction']
    print(f"\n🔨 Auctions found: {len(auctions)} out of {len(items)} total items")

    # Show all items (titles and types)
    print(f"\n📋 All {len(items)} items:")
    for i, item in enumerate(items, 1):
        listing_type = item.get('listing_type', 'N/A')
        type_icon = "🔨" if listing_type == "Auction" else "🛒"
        title = item.get('title', 'N/A')[:70]
        print(f"{i:2}. {type_icon} {listing_type:10} | {title}")

    # Search for specific auction
    print(f"\n🔍 Searching for 'Faith' or 'Carnage':")
    found_auction = False
    for item in items:
        title_lower = item.get('title', '').lower()
        if 'faith' in title_lower or 'carnage' in title_lower:
            found_auction = True
            print(f"\n{'='*80}")
            print(f"✅ FOUND!")
            print(f"  Title: {item.get('title', 'N/A')}")
            print(f"  Type: {item.get('listing_type', 'N/A')}")
            print(f"  Price: {item.get('price', 'N/A')} {item.get('currency', 'N/A')}")
            print(f"  URL: {item.get('url', 'N/A')}")

    if not found_auction:
        print("  ❌ Auction 'Faith / Carnage Visitors' NOT found in results")

    # Show first 3 items in detail
    print(f"\n{'='*80}")
    print("First 3 items (detailed):")
    for i, item in enumerate(items[:3], 1):
        print(f"\n{'='*80}")
        print(f"Item {i}:")
        print(f"  Title: {item.get('title', 'N/A')}")
        print(f"  Item ID: {item.get('item_id', 'N/A')}")
        print(f"  Price: {item.get('price', 'N/A')} {item.get('currency', 'N/A')}")
        print(f"  Type: {item.get('listing_type', 'N/A')}")
        print(f"  URL: {item.get('url', 'N/A')}")

        # Show if excluded
        if Config.EXCLUDE_KEYWORDS:
            title_lower = item['title'].lower()
            excluded = False
            for exclude_word in Config.EXCLUDE_KEYWORDS:
                if exclude_word in title_lower:
                    print(f"  ⚠️  Would be EXCLUDED by: '{exclude_word}'")
                    excluded = True
                    break
            if not excluded:
                print(f"  ✅ Not excluded by keywords")

if __name__ == '__main__':
    keyword = sys.argv[1] if len(sys.argv) > 1 else "cure cassette tape"
    debug_search(keyword)
