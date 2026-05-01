#!/usr/bin/env python3
"""
Test WhatsApp Business credential decryption
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from cryptography.fernet import Fernet

async def test_whatsapp_decryption():
    """Test WhatsApp Business credential decryption"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    integrations_key = os.environ.get('INTEGRATIONS_KEY', '')
    
    print("🔍 Testing WhatsApp Business credential decryption...")
    print(f"   INTEGRATIONS_KEY configured: {bool(integrations_key)}")
    
    if not integrations_key:
        print("❌ INTEGRATIONS_KEY not configured - decryption will fail")
        return False
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        # Find WhatsApp Business integration
        integration = await db.integrations.find_one(
            {"provider": "whatsapp_business"}, 
            {"_id": 0}
        )
        
        if not integration:
            print("❌ No WhatsApp Business integration found")
            return False
        
        print(f"✅ WhatsApp Business integration found")
        
        # Test decryption
        fernet = Fernet(integrations_key.encode())
        config = integration.get("config", {})
        
        print(f"\n🔑 Testing decryption of {len(config)} fields:")
        
        decrypted_config = {}
        for key, encrypted_value in config.items():
            try:
                if encrypted_value:
                    decrypted_value = fernet.decrypt(encrypted_value.encode()).decode()
                    decrypted_config[key] = decrypted_value
                    
                    # Show masked value
                    masked = "•" * max(0, len(decrypted_value) - 4) + decrypted_value[-4:]
                    print(f"   {key}: {masked} (length: {len(decrypted_value)})")
                else:
                    print(f"   {key}: EMPTY")
                    decrypted_config[key] = ""
            except Exception as e:
                print(f"   {key}: DECRYPTION FAILED - {e}")
                decrypted_config[key] = ""
        
        # Check if all required fields have values
        required_fields = ["access_token", "phone_number_id", "business_account_id"]
        missing_or_empty = []
        
        for field in required_fields:
            value = decrypted_config.get(field, "")
            if not value or value.strip() == "":
                missing_or_empty.append(field)
        
        print(f"\n📋 Validation:")
        if missing_or_empty:
            print(f"   ❌ Missing or empty fields: {missing_or_empty}")
            print(f"   This explains why WhatsApp is not working!")
        else:
            print(f"   ✅ All required fields have values")
            print(f"   The issue might be with the API credentials themselves")
        
        client.close()
        return len(missing_or_empty) == 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    """Run the test"""
    print("🚀 Testing WhatsApp Business credential decryption...\n")
    
    success = await test_whatsapp_decryption()
    
    print(f"\n🎯 Summary:")
    if success:
        print("   ✅ All credentials decrypt successfully and have values")
        print("   🔧 Issue might be with API credentials or network")
        print("   📱 Try testing the credentials with Meta's API directly")
    else:
        print("   ❌ Credential decryption or validation failed")
        print("   📋 Action needed: Re-enter credentials in Settings")
        print("   🔑 Ensure all fields are properly filled")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)