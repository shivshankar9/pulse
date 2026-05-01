#!/usr/bin/env python3
"""
Test WhatsApp webhook with sample Meta payload
"""

import requests
import json

# Sample WhatsApp Business API webhook payload from Meta
SAMPLE_WEBHOOK_PAYLOAD = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "15550559999",
                            "phone_number_id": "123456789"
                        },
                        "messages": [
                            {
                                "from": "918210066921",
                                "id": "wamid.test123",
                                "timestamp": "1683747180",
                                "text": {
                                    "body": "Hello, this is a test message from webhook test!"
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

def test_webhook():
    """Test the webhook with sample data"""
    webhook_url = "https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/01525fe1-11b0-435a-8baa-a47773ec7c34"
    
    print("🧪 Testing WhatsApp webhook with sample payload...")
    print(f"URL: {webhook_url}")
    print(f"Payload: {json.dumps(SAMPLE_WEBHOOK_PAYLOAD, indent=2)}")
    
    try:
        response = requests.post(
            webhook_url,
            json=SAMPLE_WEBHOOK_PAYLOAD,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📊 Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Webhook accepted the payload!")
            
            # Now test the debug endpoint
            debug_url = "https://pulse-iisx.onrender.com/api/debug/messages/01525fe1-11b0-435a-8baa-a47773ec7c34"
            print(f"\n🔍 Checking stored messages at: {debug_url}")
            
            debug_response = requests.get(debug_url)
            if debug_response.status_code == 200:
                debug_data = debug_response.json()
                print(f"📊 Messages stored: {debug_data.get('messages_count', 0)}")
                print(f"📊 Tickets created: {debug_data.get('tickets_count', 0)}")
                
                if debug_data.get('messages'):
                    print("\n📱 Recent messages:")
                    for msg in debug_data['messages'][:3]:
                        print(f"  - {msg.get('direction')} | {msg.get('from')} | {msg.get('body')[:50]}...")
                        
                if debug_data.get('tickets'):
                    print("\n🎫 Recent tickets:")
                    for ticket in debug_data['tickets'][:3]:
                        print(f"  - {ticket.get('subject')}")
            else:
                print(f"❌ Debug endpoint failed: {debug_response.status_code}")
        else:
            print(f"❌ Webhook failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_webhook()