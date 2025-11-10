#!/usr/bin/env python3
"""
Detailed diagnostic test for UK filtering
"""
import os
import sys
from dotenv import load_dotenv
import requests
import json

# Load .env file
load_dotenv()

def test_finding_api_direct():
    """Test Finding API directly with full debug output"""

    app_id = os.getenv('EBAY_APP_ID')

    print("=" * 60)
    print("eBay Finding API - Detailed Test")
    print("=" * 60)
    print(f"\n✓ EBAY_APP_ID: {app_id[:20]}..." if app_id else "❌ No App ID")
    print(f"✓ Testing UK filters\n")

    if not app_id:
        print("❌ Error: EBAY_APP_ID not set!")
        return False

    # Build request parameters
    params = {
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': app_id,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': '',
        'keywords': 'joy division cassette',
        'sortOrder': 'StartTimeNewest',
        'paginationInput.entriesPerPage': '5',
        # UK filter
        'itemFilter(0).name': 'LocatedIn',
        'itemFilter(0).value': 'GB'
    }

    url = 'https://svcs.ebay.com/services/search/FindingService/v1'

    print("📤 REQUEST:")
    print(f"   URL: {url}")
    print("   Parameters:")
    for key, value in params.items():
        if 'SECURITY' in key:
            print(f"      {key}: {value[:20]}...")
        else:
            print(f"      {key}: {value}")

    print("\n⏳ Sending request...\n")

    try:
        response = requests.get(url, params=params, timeout=15)

        print("📥 RESPONSE:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print("\n✅ Request successful!")
            print("\n📄 Response structure:")
            print(json.dumps(data, indent=2)[:1000])  # First 1000 chars

            # Parse results
            result = data.get('findItemsAdvancedResponse', [{}])[0]
            ack = result.get('ack', [''])[0]

            print(f"\n   ACK Status: {ack}")

            if ack == 'Success':
                search_result = result.get('searchResult', [{}])[0]
                items = search_result.get('item', [])
                print(f"   Items found: {len(items)}")

                if items:
                    print("\n📦 Sample item:")
                    item = items[0]
                    print(f"   Title: {item.get('title', [''])[0][:60]}")
                    print(f"   URL: {item.get('viewItemURL', [''])[0]}")

                    # Check if UK
                    url = item.get('viewItemURL', [''])[0]
                    if 'ebay.co.uk' in url:
                        print("   ✅ UK listing!")
                    else:
                        print(f"   ⚠️  Non-UK listing: {url[:50]}")

                return True
            else:
                error_msg = result.get('errorMessage', [{}])[0]
                print(f"\n❌ API returned error:")
                print(json.dumps(error_msg, indent=2))
                return False
        else:
            print(f"\n❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False

    except requests.exceptions.Timeout:
        print("\n❌ Request timeout")
        return False
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_finding_api_direct()
    sys.exit(0 if success else 1)
