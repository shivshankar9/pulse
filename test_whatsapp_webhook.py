#!/usr/bin/env python3
"""
Test script to check WhatsApp webhook configuration and simulate inbound messages
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "https://pulse-iisx.onrender.com/api"
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"
PHONE_NUMBER = "+918210066921"

def test_webhook_verification():
    """Test webhook verification endpoint"""
    print("🔍 Testing webhook verification...")
    
    url = f"{BASE_URL}/webhooks/whatsapp-business/{USER_ID}"
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "1234567890",
        "hub.verify_token": "pulse_crm_verify"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"✅ Verification response: {response.status_code}")
        print(f"📄 Response body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def simulate_inbound_webhook():
    """Simulate an inbound WhatsApp message webhook"""
    print("📱 Simulating inbound WhatsApp webhook...")
    
    url = f"{BASE_URL}/webhooks/whatsapp-business/{USER_ID}"
    
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
                                        "body": "Hello! This is a test message from webhook simulation."
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
            url, 
            json=webhook_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"✅ Webhook response: {response.status_code}")
        print(f"📄 Response body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Webhook simulation failed: {e}")
        return False

def check_messages():
    """Check if messages were created"""
    print("📋 Checking recent messages...")
    
    # This would require authentication, so we'll just show the endpoint
    print(f"🔗 Check messages at: {BASE_URL}/whatsapp/messages")
    print(f"🔗 Check conversations at: {BASE_URL}/whatsapp/conversations-v2")

def test_debug_simulation():
    """Test the debug simulation endpoint"""
    print("🧪 Testing debug simulation endpoint...")
    
    url = f"{BASE_URL}/debug/simulate-inbound/{USER_ID}"
    params = {
        "phone": PHONE_NUMBER,
        "message": "Test message from debug endpoint"
    }
    
    try:
        response = requests.post(url, params=params, timeout=10)
        print(f"✅ Debug simulation response: {response.status_code}")
        print(f"📄 Response body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Debug simulation failed: {e}")
        return False

def main():
    print("🚀 WhatsApp Webhook Test Suite")
    print("=" * 50)
    
    # Test 1: Webhook verification
    verification_ok = test_webhook_verification()
    print()
    
    # Test 2: Simulate inbound webhook
    webhook_ok = simulate_inbound_webhook()
    print()
    
    # Test 3: Debug simulation
    debug_ok = test_debug_simulation()
    print()
    
    # Test 4: Check messages
    check_messages()
    print()
    
    # Summary
    print("📊 Test Results:")
    print(f"   Webhook Verification: {'✅ PASS' if verification_ok else '❌ FAIL'}")
    print(f"   Inbound Webhook: {'✅ PASS' if webhook_ok else '❌ FAIL'}")
    print(f"   Debug Simulation: {'✅ PASS' if debug_ok else '❌ FAIL'}")
    
    if all([verification_ok, webhook_ok, debug_ok]):
        print("\n🎉 All tests passed! Webhook processing is working.")
    else:
        print("\n⚠️ Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    main()