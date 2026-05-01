#!/usr/bin/env python3
"""
Check WhatsApp Business API integration configuration
"""

import requests
import json
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv('backend/.env')

INTEGRATIONS_KEY = os.environ.get('INTEGRATIONS_KEY')
BASE_URL = "https://pulse-iisx.onrender.com/api"
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"

def decrypt_secret(value: str) -> str:
    if not INTEGRATIONS_KEY or not value:
        return value
    try:
        fernet = Fernet(INTEGRATIONS_KEY.encode())
        return fernet.decrypt(value.encode()).decode()
    except Exception as e:
        print(f"❌ Decryption failed: {e}")
        return ""

def check_integration_status():
    """Check WhatsApp Business integration status via API"""
    print("🔍 Checking WhatsApp Business integration status...")
    
    url = f"{BASE_URL}/debug/integrations/whatsapp_business"
    
    try:
        # This would require authentication, but let's try anyway
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📄 Integration status: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Failed to get integration status: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")

def check_whatsapp_status():
    """Check WhatsApp status via API"""
    print("📱 Checking WhatsApp status...")
    
    url = f"{BASE_URL}/whatsapp/status"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📄 WhatsApp status: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Failed to get WhatsApp status: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")

def main():
    print("🚀 WhatsApp Integration Check")
    print("=" * 50)
    
    print(f"🔑 INTEGRATIONS_KEY configured: {'✅ Yes' if INTEGRATIONS_KEY else '❌ No'}")
    print(f"🆔 User ID: {USER_ID}")
    print()
    
    check_integration_status()
    print()
    
    check_whatsapp_status()
    print()
    
    print("💡 Next steps:")
    print("1. Log into the frontend at https://puls1.vercel.app")
    print("2. Go to Settings → Integrations")
    print("3. Configure WhatsApp Business API with:")
    print("   - Access Token")
    print("   - Phone Number ID")
    print("   - Business Account ID")
    print("4. Set webhook URL in Meta Developer Console:")
    print(f"   https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/{USER_ID}")
    print("5. Set webhook verify token: pulse_crm_verify")

if __name__ == "__main__":
    main()