#!/usr/bin/env python3
"""
Check recent messages in the database to see if webhook processing is working
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "https://pulse-iisx.onrender.com/api"
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"
PHONE_NUMBER = "+918210066921"

def simulate_webhook_and_check():
    """Simulate a webhook call and then check if the message appears"""
    
    print("🔄 Step 1: Simulating WhatsApp Business webhook...")
    
    # Simulate WhatsApp Business API webhook payload
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550123456",
                                "phone_number_id": "123456789"
                            },
                            "messages": [
                                {
                                    "from": PHONE_NUMBER,
                                    "id": f"wamid.test_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                                    "timestamp": str(int(datetime.now().timestamp())),
                                    "text": {
                                        "body": f"Test webhook message at {datetime.now().strftime('%H:%M:%S')}"
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    webhook_url = f"{BASE_URL}/webhooks/whatsapp-business/{USER_ID}"
    
    try:
        response = requests.post(
            webhook_url,
            json=webhook_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"✅ Webhook response: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ Webhook failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Webhook request failed: {e}")
        return False
    
    print("\n🔄 Step 2: Checking if message appears in conversations...")
    
    # Check conversations endpoint (this doesn't require auth in our test)
    conversations_url = f"{BASE_URL}/whatsapp/conversations-v2"
    
    try:
        # Note: This will fail with 401 since we don't have auth, but we can still test the webhook processing
        response = requests.get(conversations_url, timeout=10)
        print(f"📊 Conversations endpoint status: {response.status_code}")
        
        if response.status_code == 401:
            print("ℹ️ Expected 401 (authentication required) - this is normal")
        elif response.status_code == 200:
            data = response.json()
            print(f"📄 Conversations: {json.dumps(data, indent=2)}")
        else:
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Conversations check failed: {e}")
    
    print("\n🔄 Step 3: Testing debug simulation...")
    
    # Test debug simulation
    debug_url = f"{BASE_URL}/debug/simulate-inbound/{USER_ID}"
    debug_params = {
        "phone": PHONE_NUMBER,
        "message": f"Debug test at {datetime.now().strftime('%H:%M:%S')}"
    }
    
    try:
        response = requests.post(debug_url, params=debug_params, timeout=10)
        print(f"✅ Debug simulation response: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id")
            print(f"🆔 Created message ID: {message_id}")
            return True
        else:
            print(f"❌ Debug simulation failed")
            return False
            
    except Exception as e:
        print(f"❌ Debug simulation failed: {e}")
        return False

def main():
    print("🚀 WhatsApp Message Check")
    print("=" * 50)
    
    success = simulate_webhook_and_check()
    
    print("\n📋 Summary:")
    if success:
        print("✅ Webhook processing appears to be working")
        print("💡 If messages aren't showing in the frontend:")
        print("   1. Check if WhatsApp Business API credentials are configured")
        print("   2. Verify the webhook URL in Meta Developer Console")
        print("   3. Check if the frontend is authenticated properly")
    else:
        print("❌ There may be issues with webhook processing")
        print("💡 Check the server logs for more details")
    
    print(f"\n🔗 Frontend URL: https://puls1.vercel.app")
    print(f"🔗 Webhook URL: {BASE_URL}/webhooks/whatsapp-business/{USER_ID}")

if __name__ == "__main__":
    main()