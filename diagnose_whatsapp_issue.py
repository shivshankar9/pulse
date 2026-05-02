#!/usr/bin/env python3
"""
Comprehensive WhatsApp integration diagnostic
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://pulse-iisx.onrender.com/api"
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"
PHONE_NUMBER = "+918210066921"

def test_whatsapp_status():
    """Check WhatsApp integration status"""
    print("🔍 Checking WhatsApp integration status...")
    
    url = f"{BASE_URL}/whatsapp/status"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ Authentication required - cannot check status without login")
            return False
        elif response.status_code == 200:
            data = response.json()
            print(f"📄 WhatsApp Status:")
            print(json.dumps(data, indent=2))
            
            # Check if any real providers are configured
            providers = data.get("providers", {})
            has_real_provider = any(p.get("configured", False) for p in providers.values())
            
            print(f"\n📊 Analysis:")
            print(f"   Mode: {data.get('mode', 'unknown')}")
            print(f"   Mock enabled: {data.get('mock_enabled', False)}")
            print(f"   Real providers configured: {has_real_provider}")
            
            return has_real_provider
        else:
            print(f"❌ Unexpected status: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_integration_debug():
    """Check integration configuration via debug endpoint"""
    print("\n🔧 Checking WhatsApp Business integration config...")
    
    url = f"{BASE_URL}/debug/integrations/whatsapp_business"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ Authentication required")
            return False
        elif response.status_code == 200:
            data = response.json()
            print(f"📄 Integration Debug:")
            print(json.dumps(data, indent=2))
            
            validation = data.get("validation", {})
            all_required = validation.get("all_required_present", False)
            missing_fields = validation.get("missing_fields", [])
            
            print(f"\n📊 Configuration Status:")
            print(f"   All required fields present: {all_required}")
            if missing_fields:
                print(f"   Missing fields: {missing_fields}")
            
            return all_required
        else:
            print(f"❌ Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_webhook_processing():
    """Test if webhook processing creates visible messages"""
    print("\n📱 Testing webhook message creation...")
    
    # First, simulate a webhook
    webhook_url = f"{BASE_URL}/webhooks/whatsapp-business/{USER_ID}"
    
    test_message = f"Diagnostic test at {datetime.now().strftime('%H:%M:%S')}"
    
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
                                    "id": f"wamid.diagnostic_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                                    "timestamp": str(int(datetime.now().timestamp())),
                                    "text": {
                                        "body": test_message
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
        response = requests.post(
            webhook_url,
            json=webhook_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"✅ Webhook simulation: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print(f"✅ Webhook processing successful")
            print(f"📝 Test message: '{test_message}'")
            return True
        else:
            print(f"❌ Webhook processing failed")
            return False
            
    except Exception as e:
        print(f"❌ Webhook test failed: {e}")
        return False

def test_debug_simulation():
    """Test debug simulation endpoint"""
    print("\n🧪 Testing debug simulation...")
    
    url = f"{BASE_URL}/debug/simulate-inbound/{USER_ID}"
    test_message = f"Debug simulation at {datetime.now().strftime('%H:%M:%S')}"
    
    params = {
        "phone": PHONE_NUMBER,
        "message": test_message
    }
    
    try:
        response = requests.post(url, params=params, timeout=10)
        print(f"✅ Debug simulation: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id")
            print(f"🆔 Created message ID: {message_id}")
            print(f"📝 Test message: '{test_message}'")
            return True
        else:
            print(f"❌ Debug simulation failed")
            return False
            
    except Exception as e:
        print(f"❌ Debug simulation failed: {e}")
        return False

def check_send_behavior():
    """Test what happens when we try to send a message"""
    print("\n📤 Testing send behavior...")
    
    url = f"{BASE_URL}/whatsapp/send"
    
    payload = {
        "to": PHONE_NUMBER,
        "body": f"Test send at {datetime.now().strftime('%H:%M:%S')}",
        "provider": "auto"
    }
    
    try:
        # This will fail with 401 since we don't have auth, but we can see the behavior
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Send endpoint status: {response.status_code}")
        
        if response.status_code == 401:
            print("ℹ️ Expected 401 (authentication required)")
        elif response.status_code == 200:
            data = response.json()
            provider = data.get("provider", "unknown")
            status = data.get("status", "unknown")
            print(f"📊 Send result: provider={provider}, status={status}")
        else:
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Send test failed: {e}")

def main():
    print("🚀 WhatsApp Integration Diagnostic")
    print("=" * 60)
    
    # Test 1: Check WhatsApp status
    has_real_provider = test_whatsapp_status()
    
    # Test 2: Check integration configuration
    config_complete = test_integration_debug()
    
    # Test 3: Test webhook processing
    webhook_works = test_webhook_processing()
    
    # Test 4: Test debug simulation
    debug_works = test_debug_simulation()
    
    # Test 5: Check send behavior
    check_send_behavior()
    
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    print(f"Real provider configured: {'✅ YES' if has_real_provider else '❌ NO'}")
    print(f"Integration config complete: {'✅ YES' if config_complete else '❌ NO'}")
    print(f"Webhook processing works: {'✅ YES' if webhook_works else '❌ NO'}")
    print(f"Debug simulation works: {'✅ YES' if debug_works else '❌ NO'}")
    
    print("\n💡 RECOMMENDATIONS:")
    
    if not has_real_provider or not config_complete:
        print("🔧 CONFIGURE WHATSAPP BUSINESS API:")
        print("   1. Go to https://puls1.vercel.app")
        print("   2. Navigate to Settings → Integrations")
        print("   3. Configure WhatsApp Business API with:")
        print("      - Access Token (from Meta Developer Console)")
        print("      - Phone Number ID")
        print("      - Business Account ID")
        print("   4. Save the configuration")
        print()
        print("🌐 WEBHOOK CONFIGURATION:")
        print("   1. Go to Meta Developer Console")
        print("   2. Configure webhook URL:")
        print(f"      {BASE_URL}/webhooks/whatsapp-business/{USER_ID}")
        print("   3. Set verify token: pulse_crm_verify")
        print("   4. Subscribe to 'messages' webhook events")
    
    elif webhook_works and debug_works:
        print("✅ SYSTEM IS WORKING CORRECTLY!")
        print("   The issue might be:")
        print("   1. WhatsApp Business API webhook not properly configured in Meta Console")
        print("   2. Real WhatsApp messages not being sent to test the inbound flow")
        print("   3. Frontend caching or authentication issues")
        print()
        print("🧪 TO TEST INBOUND MESSAGES:")
        print("   1. Send a real WhatsApp message to your business number")
        print("   2. Check if it appears in the frontend")
        print("   3. Look for webhook POST calls in the server logs")
    
    else:
        print("❌ SYSTEM ISSUES DETECTED:")
        print("   Check server logs for errors in webhook processing")
        print("   Verify database connectivity")
        print("   Check environment variables configuration")

if __name__ == "__main__":
    main()