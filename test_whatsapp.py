#!/usr/bin/env python3
"""
WhatsApp Business API Test Script
Run this to diagnose WhatsApp issues
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Configuration
BACKEND_URL = "https://pulse-iisx.onrender.com"
# You'll need to get your auth token from the browser dev tools

def test_whatsapp_config(auth_token):
    """Test WhatsApp Business API configuration"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    print("🔍 Testing WhatsApp Business API Configuration...")
    
    # Test 1: Check integrations
    try:
        response = requests.get(f"{BACKEND_URL}/api/integrations", headers=headers)
        if response.status_code == 200:
            integrations = response.json()
            whatsapp_config = integrations.get('whatsapp_business', {})
            print(f"✅ Integrations endpoint accessible")
            print(f"📱 WhatsApp Business configured: {whatsapp_config.get('configured', False)}")
            
            if whatsapp_config.get('configured'):
                # Test credentials
                test_response = requests.post(f"{BACKEND_URL}/api/whatsapp-business/test", headers=headers)
                if test_response.status_code == 200:
                    print("✅ WhatsApp Business API credentials are valid")
                    print(f"📊 API Response: {test_response.json()}")
                else:
                    print(f"❌ WhatsApp Business API test failed: {test_response.status_code}")
                    print(f"Error: {test_response.text}")
            else:
                print("⚠️ WhatsApp Business API not configured")
        else:
            print(f"❌ Failed to access integrations: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing integrations: {e}")
    
    # Test 2: Check webhook endpoint
    print("\n🔗 Testing Webhook Endpoints...")
    
    # Get user ID (you'll need to replace this)
    user_id = "YOUR_USER_ID"  # Replace with actual user ID
    
    webhook_url = f"{BACKEND_URL}/api/webhooks/whatsapp-business/{user_id}"
    verify_token = "pulse_crm_verify"
    
    # Test webhook verification (GET request)
    try:
        verify_response = requests.get(
            webhook_url,
            params={
                "hub.verify_token": verify_token,
                "hub.challenge": "test_challenge_123"
            }
        )
        if verify_response.status_code == 200:
            print("✅ Webhook verification endpoint working")
            print(f"Challenge response: {verify_response.text}")
        else:
            print(f"❌ Webhook verification failed: {verify_response.status_code}")
            print(f"Error: {verify_response.text}")
    except Exception as e:
        print(f"❌ Error testing webhook: {e}")
    
    # Test 3: Try sending a test message
    print("\n📤 Testing Message Send...")
    
    test_phone = "+1234567890"  # Replace with a test phone number
    test_message = "Test message from Pulse CRM"
    
    try:
        send_response = requests.post(
            f"{BACKEND_URL}/api/whatsapp/send",
            headers=headers,
            json={
                "to": test_phone,
                "body": test_message,
                "provider": "whatsapp_business"
            }
        )
        if send_response.status_code == 200:
            result = send_response.json()
            print(f"✅ Message send endpoint working")
            print(f"Status: {result.get('status')}")
            print(f"Provider: {result.get('provider')}")
            if result.get('status') == 'queued':
                print("⚠️ Message was queued (mock mode) - check your WhatsApp Business API credentials")
        else:
            print(f"❌ Message send failed: {send_response.status_code}")
            print(f"Error: {send_response.text}")
    except Exception as e:
        print(f"❌ Error testing message send: {e}")

def get_instructions():
    """Print instructions for getting auth token"""
    print("""
🔑 To get your auth token:

1. Open your browser and go to https://puls1.vercel.app
2. Log in to your account
3. Open Developer Tools (F12)
4. Go to Application/Storage tab
5. Look for localStorage or sessionStorage
6. Find the 'token' or 'auth_token' value
7. Copy the token (without quotes)

Then run: python test_whatsapp.py YOUR_TOKEN_HERE
""")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        get_instructions()
        sys.exit(1)
    
    auth_token = sys.argv[1]
    test_whatsapp_config(auth_token)