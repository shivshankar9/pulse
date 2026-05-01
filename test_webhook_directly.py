#!/usr/bin/env python3
"""
Test webhook processing directly by simulating a webhook call
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

async def test_webhook_directly():
    """Test webhook by checking what happens when we simulate a webhook call"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        print("🔍 Testing webhook processing directly...")
        
        # Get the user ID from the logs (01525fe1-11b0-435a-8baa-a47773ec7c34)
        owner_id = "01525fe1-11b0-435a-8baa-a47773ec7c34"
        
        # Check if this user exists
        user = await db.users.find_one({"id": owner_id}, {"_id": 0})
        if user:
            print(f"✅ User found: {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
        else:
            print(f"❌ User not found with ID: {owner_id}")
            
            # List all users to see what IDs exist
            users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(10)
            print(f"📋 Available users:")
            for u in users:
                print(f"   ID: {u.get('id')} - {u.get('name')} ({u.get('email')})")
        
        # Simulate a simple inbound message directly in the database
        print(f"\n🧪 Simulating inbound message creation...")
        
        test_message = {
            "id": "test_" + str(asyncio.get_event_loop().time()),
            "owner_id": owner_id,
            "channel": "whatsapp_business", 
            "direction": "inbound",
            "from": "+918210066921",
            "body": "Test inbound message from webhook simulation",
            "message_id": "test_webhook_msg_123",
            "received_at": "2026-05-01T10:20:00.000Z",
            "contact_id": None,
            "provider": "whatsapp_business",
            "read": False
        }
        
        await db.messages.insert_one(test_message)
        print(f"✅ Test message created with ID: {test_message['id']}")
        
        # Check if it appears in the messages
        recent_inbound = await db.messages.find({
            "channel": "whatsapp_business",
            "direction": "inbound",
            "provider": "whatsapp_business"
        }).sort("received_at", -1).limit(1).to_list(1)
        
        if recent_inbound:
            msg = recent_inbound[0]
            print(f"✅ Test message found: '{msg.get('body', '')}' from {msg.get('from', 'unknown')}")
        else:
            print(f"❌ Test message not found in database")
        
        client.close()
        return len(recent_inbound) > 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    """Run the test"""
    print("🚀 Testing webhook processing directly...\n")
    
    success = await test_webhook_directly()
    
    print(f"\n🎯 Analysis:")
    if success:
        print("   ✅ Database can store inbound WhatsApp Business messages")
        print("   🔧 Issue is likely in webhook processing logic")
        print("   📋 Webhook might be failing to parse Meta's data format")
    else:
        print("   ❌ Database or user configuration issue")
        print("   🔧 Check user ID in webhook URL")
    
    print(f"\n💡 Next Steps:")
    print("   1. Check if webhook URL has correct user ID")
    print("   2. Add error handling to webhook processing")
    print("   3. Test with actual Meta webhook data format")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)