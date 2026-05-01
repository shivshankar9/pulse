#!/usr/bin/env python3
"""
Debug WhatsApp messages to see what's being stored
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def debug_whatsapp_messages():
    """Check what WhatsApp messages are stored in the database"""
    
    # Load environment variables
    load_dotenv(Path("backend/.env"))
    
    mongo_url = os.environ.get('MONGO_URL', '')
    
    try:
        # Connect to database
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'pulse_crm')]
        
        print("🔍 Debugging WhatsApp messages...")
        
        # Get recent messages (last hour)
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        # Find all WhatsApp messages
        messages = await db.messages.find({
            "channel": {"$in": ["whatsapp", "whatsapp_business"]},
            "$or": [
                {"sent_at": {"$gte": one_hour_ago}},
                {"received_at": {"$gte": one_hour_ago}}
            ]
        }, {"_id": 0}).sort([("sent_at", -1), ("received_at", -1)]).to_list(50)
        
        print(f"\n📊 Found {len(messages)} WhatsApp messages in last hour:")
        
        inbound_count = 0
        outbound_count = 0
        
        for i, msg in enumerate(messages, 1):
            direction = msg.get("direction", "unknown")
            channel = msg.get("channel", "unknown")
            provider = msg.get("provider", "unknown")
            body = msg.get("body", "")[:50] + "..." if len(msg.get("body", "")) > 50 else msg.get("body", "")
            timestamp = msg.get("sent_at") or msg.get("received_at", "unknown")
            from_to = msg.get("from") or msg.get("to", "unknown")
            
            if direction == "inbound":
                inbound_count += 1
            elif direction == "outbound":
                outbound_count += 1
            
            print(f"\n   {i}. {direction.upper()} - {channel}")
            print(f"      From/To: {from_to}")
            print(f"      Provider: {provider}")
            print(f"      Body: {body}")
            print(f"      Time: {timestamp}")
        
        print(f"\n📈 Summary:")
        print(f"   Outbound messages: {outbound_count}")
        print(f"   Inbound messages: {inbound_count}")
        
        if inbound_count == 0:
            print(f"\n❌ No inbound messages found!")
            print(f"   Possible causes:")
            print(f"   1. Webhook not receiving data from Meta")
            print(f"   2. Webhook processing failing")
            print(f"   3. Messages not being stored properly")
            
            # Check webhook events if they exist
            webhook_events = await db.webhook_events.find({
                "channel": "whatsapp_business",
                "received_at": {"$gte": one_hour_ago}
            }, {"_id": 0}).sort("received_at", -1).to_list(10)
            
            print(f"\n🔗 Webhook events: {len(webhook_events)}")
            for event in webhook_events:
                print(f"   Event: {event.get('event_type', 'unknown')} at {event.get('received_at', 'unknown')}")
        else:
            print(f"   ✅ Inbound messages are being received and stored!")
        
        client.close()
        return inbound_count > 0
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        return False

async def main():
    """Run the debug"""
    print("🚀 Debugging WhatsApp messages...\n")
    
    success = await debug_whatsapp_messages()
    
    print(f"\n🎯 Conclusion:")
    if success:
        print("   ✅ Inbound messages are working correctly")
        print("   📱 Check the WhatsApp interface for message display issues")
    else:
        print("   ❌ No inbound messages found in database")
        print("   🔧 Need to investigate webhook processing")
        print("   📋 Check Meta webhook configuration")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)