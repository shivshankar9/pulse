#!/usr/bin/env python3
"""
Fix WhatsApp Business credentials by clearing old encrypted values
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def fix_whatsapp_credentials():
    """Clear old encrypted WhatsApp credentials that can't be decrypted"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        print("🔧 Fixing WhatsApp Business credentials...")
        
        # Delete the old integration with invalid encrypted values
        result = await db.integrations.delete_many({"provider": "whatsapp_business"})
        
        print(f"✅ Removed {result.deleted_count} old WhatsApp Business integration(s)")
        print("📋 The WhatsApp Business integration has been reset")
        print("🔑 You can now re-enter your credentials in Settings → Integrations")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Fix failed: {e}")
        return False

async def main():
    """Run the fix"""
    print("🚀 Fixing WhatsApp Business credentials...\n")
    
    success = await fix_whatsapp_credentials()
    
    print(f"\n🎯 Next Steps:")
    print("   1. Deploy the updated configuration (with INTEGRATIONS_KEY)")
    print("   2. Go to Settings → Integrations in your app")
    print("   3. Configure WhatsApp Business API with:")
    print("      - Access Token")
    print("      - Phone Number ID") 
    print("      - Business Account ID")
    print("   4. Test the integration")
    print("   5. WhatsApp should work correctly!")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)