#!/usr/bin/env python3
"""
Test the webhook endpoint directly
"""
import requests
import json

def test_webhook_endpoint():
    """Test the webhook endpoint with a simple POST request"""
    
    # The webhook URL
    webhook_url = "https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/b175df83-350d-49f0-9eef-e2f1b2a5164e"
    
    # Simple test payload (similar to what Meta might send)
    test_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "test_entry",
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
                                    "from": "+918210066921",
                                    "id": "test_message_123",
                                    "timestamp": "1651234567",
                                    "text": {
                                        "body": "Hello from test webhook!"
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
    
    try:
        print("🧪 Testing webhook endpoint...")
        print(f"URL: {webhook_url}")
        print(f"Payload: {json.dumps(test_payload, indent=2)}")
        
        # Send POST request to webhook
        response = requests.post(
            webhook_url,
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\n📊 Response:")
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Webhook endpoint is responding")
            return True
        else:
            print(f"❌ Webhook endpoint returned error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to test webhook: {e}")
        return False

def main():
    """Run the test"""
    print("🚀 Testing WhatsApp webhook endpoint...\n")
    
    success = test_webhook_endpoint()
    
    print(f"\n🎯 Result:")
    if success:
        print("   ✅ Webhook endpoint is working")
        print("   📋 Check server logs for detailed processing info")
        print("   🔧 If no detailed logs appear, the enhanced logging may not be deployed yet")
    else:
        print("   ❌ Webhook endpoint has issues")
        print("   🔧 Check server deployment and error logs")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)