#!/usr/bin/env python3
"""
Test WhatsApp webhook processing
"""
import asyncio
import sys
import os
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def test_webhook_processing():
    """Test webhook processing by checking recent webhook logs"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        print("🔍 Testing webhook processing...")
        
        # The webhook logs should show what's happening
        # Let's check if there are any webhook events stored
        
        # Check for any collections that might store webhook data
        collections = await db.list_collection_names()
        webhook_collections = [c for c in collections if 'webhook' in c.lower()]
        
        print(f"📊 Available collections: {len(collections)}")
        print(f"🔗 Webhook-related collections: {webhook_collections}")
        
        # Check recent messages to see the pattern
        recent_messages = await db.messages.find({
            "channel": {"$in": ["whatsapp", "whatsapp_business"]}
        }).sort("received_at", -1).limit(5).to_list(5)
        
        print(f"\n📱 Recent WhatsApp messages:")
        for msg in recent_messages:
            direction = msg.get("direction", "unknown")
            provider = msg.get("provider", "unknown")
            body = msg.get("body", "")[:30]
            timestamp = msg.get("sent_at") or msg.get("received_at", "unknown")
            
            print(f"   {direction} ({provider}): '{body}' at {timestamp}")
        
        # Check if there are any inbound messages from whatsapp_business provider
        inbound_real = await db.messages.count_documents({
            "channel": "whatsapp_business",
            "direction": "inbound",
            "provider": "whatsapp_business"
        })
        
        print(f"\n📈 Analysis:")
        print(f"   Real inbound WhatsApp Business messages: {inbound_real}")
        
        if inbound_real == 0:
            print(f"   ❌ No real inbound messages found")
            print(f"   🔧 Webhook processing might not be working")
            print(f"   📋 Check server logs for webhook processing details")
        else:
            print(f"   ✅ Real inbound messages are being processed")
        
        client.close()
        return inbound_real > 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    """Run the test"""
    print("🚀 Testing WhatsApp webhook processing...\n")
    
    success = await test_webhook_processing()
    
    print(f"\n🎯 Recommendation:")
    if success:
        print("   ✅ Webhook processing is working")
        print("   📱 Check UI for message display issues")
    else:
        print("   ❌ Webhook processing needs investigation")
        print("   📋 Check server logs when sending a test message")
        print("   🔧 Webhook might not be receiving proper data format")
        print("   📞 Try sending a WhatsApp message and check logs immediately")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)