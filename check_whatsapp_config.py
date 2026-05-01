#!/usr/bin/env python3
"""
Check WhatsApp Business configuration
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_whatsapp_config():
    """Check WhatsApp Business configuration in database"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    if not mongo_url:
        print("❌ No MONGO_URL configured")
        return False
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        print("🔍 Checking WhatsApp Business configuration...")
        
        # Find all integrations
        integrations = await db.integrations.find({}, {"_id": 0}).to_list(100)
        
        print(f"\n📊 Found {len(integrations)} integrations:")
        
        whatsapp_business_found = False
        for integration in integrations:
            provider = integration.get("provider", "unknown")
            owner_id = integration.get("owner_id", "unknown")
            config_keys = list(integration.get("config", {}).keys())
            
            print(f"   Provider: {provider}")
            print(f"   Owner ID: {owner_id}")
            print(f"   Config keys: {config_keys}")
            
            if provider == "whatsapp_business":
                whatsapp_business_found = True
                required_keys = ["access_token", "phone_number_id", "business_account_id"]
                missing_keys = [key for key in required_keys if key not in config_keys]
                
                print(f"   ✅ WhatsApp Business integration found!")
                print(f"   Required keys: {required_keys}")
                print(f"   Present keys: {config_keys}")
                if missing_keys:
                    print(f"   ❌ Missing keys: {missing_keys}")
                else:
                    print(f"   ✅ All required keys present")
            
            print()
        
        if not whatsapp_business_found:
            print("❌ No WhatsApp Business integration found in database")
            print("   This explains why WhatsApp is not working")
            print("   Solution: Configure WhatsApp Business in Settings → Integrations")
        
        client.close()
        return whatsapp_business_found
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False

async def main():
    """Run the check"""
    print("🚀 Checking WhatsApp Business configuration...\n")
    
    success = await check_whatsapp_config()
    
    print(f"\n🎯 Summary:")
    if success:
        print("   ✅ WhatsApp Business integration found in database")
        print("   🔧 Check if all required fields are properly filled")
        print("   📱 Try the /api/debug/integrations/whatsapp_business endpoint")
    else:
        print("   ❌ WhatsApp Business integration not found or incomplete")
        print("   📋 Action needed: Configure in Settings → Integrations")
        print("   🔑 Required: access_token, phone_number_id, business_account_id")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)