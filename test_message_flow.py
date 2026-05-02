#!/usr/bin/env python3
"""
Test the complete message flow to identify where messages are getting stuck
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://pulse-iisx.onrender.com/api"
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"
PHONE_NUMBER = "+918210066921"

def create_test_message():
    """Create a test message and return its ID"""
    print("📝 Creating test message via debug simulation...")
    
    url = f"{BASE_URL}/debug/simulate-inbound/{USER_ID}"
    test_message = f"Flow test message at {datetime.now().strftime('%H:%M:%S')}"
    
    params = {
        "phone": PHONE_NUMBER,
        "message": test_message
    }
    
    try:
        response = requests.post(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id")
            print(f"✅ Created message ID: {message_id}")
            print(f"📝 Message: '{test_message}'")
            return message_id, test_message
        else:
            print(f"❌ Failed to create message: {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Error creating message: {e}")
        return None, None

def test_conversations_endpoint():
    """Test if the conversations endpoint shows our message"""
    print("\n📋 Testing conversations endpoint...")
    
    url = f"{BASE_URL}/whatsapp/conversations-v2"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ Authentication required - this is expected without login")
            return False
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Conversations found: {len(data)}")
            
            # Look for our phone number
            for conv in data:
                if conv.get("phone") == PHONE_NUMBER:
                    print(f"📱 Found conversation for {PHONE_NUMBER}:")
                    print(f"   Last message: {conv.get('last_message', 'N/A')}")
                    print(f"   Total messages: {conv.get('total', 0)}")
                    print(f"   Unread: {conv.get('unread', 0)}")
                    return True
            
            print(f"❌ No conversation found for {PHONE_NUMBER}")
            return False
        else:
            print(f"❌ Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing conversations: {e}")
        return False

def test_messages_endpoint():
    """Test if the messages endpoint shows our message"""
    print("\n💬 Testing messages endpoint...")
    
    url = f"{BASE_URL}/whatsapp/conversations/{PHONE_NUMBER}/messages"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ Authentication required - this is expected without login")
            return False
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Messages found: {len(data)}")
            
            if data:
                # Show recent messages
                recent_messages = sorted(data, key=lambda x: x.get('received_at', x.get('sent_at', '')), reverse=True)[:3]
                print("📝 Recent messages:")
                for i, msg in enumerate(recent_messages):
                    direction = msg.get('direction', 'unknown')
                    body = msg.get('body', 'No body')[:50]
                    timestamp = msg.get('received_at', msg.get('sent_at', 'No timestamp'))
                    provider = msg.get('provider', 'unknown')
                    print(f"   {i+1}. [{direction}] {body} (via {provider}) at {timestamp}")
                return True
            else:
                print("❌ No messages found")
                return False
        else:
            print(f"❌ Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing messages: {e}")
        return False

def test_webhook_with_logging():
    """Test webhook with enhanced payload to see if it processes correctly"""
    print("\n🔗 Testing webhook with detailed logging...")
    
    webhook_url = f"{BASE_URL}/webhooks/whatsapp-business/{USER_ID}"
    
    test_message = f"Webhook test at {datetime.now().strftime('%H:%M:%S.%f')[:-3]}"
    message_id = f"wamid.test_{int(datetime.now().timestamp())}"
    
    # Create a realistic WhatsApp Business API webhook payload
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550123456",
                                "phone_number_id": "PHONE_NUMBER_ID"
                            },
                            "messages": [
                                {
                                    "from": PHONE_NUMBER,
                                    "id": message_id,
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
            headers={
                "Content-Type": "application/json",
                "User-Agent": "WhatsApp/2.0"
            },
            timeout=10
        )
        
        print(f"✅ Webhook response: {response.status_code}")
        print(f"📄 Response: {response.text}")
        print(f"📝 Test message: '{test_message}'")
        print(f"🆔 Message ID: {message_id}")
        
        return response.status_code == 200, message_id, test_message
        
    except Exception as e:
        print(f"❌ Webhook test failed: {e}")
        return False, None, None

def check_health_endpoint():
    """Check if the system is healthy"""
    print("\n🏥 Checking system health...")
    
    url = f"{BASE_URL.replace('/api', '')}/health"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ System status: {data.get('status', 'unknown')}")
            print(f"📊 Database: {data.get('database', 'unknown')}")
            print(f"🔧 WhatsApp mode: {data.get('whatsapp_mode', 'unknown')}")
            
            db_details = data.get('database_details', {})
            if db_details.get('type') == 'mongodb_atlas':
                collections = db_details.get('collections', {})
                print(f"📋 Messages in DB: {collections.get('messages', 0)}")
                print(f"👥 Users in DB: {collections.get('users', 0)}")
                print(f"📞 Contacts in DB: {collections.get('contacts', 0)}")
            
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def main():
    print("🚀 WhatsApp Message Flow Test")
    print("=" * 60)
    
    # Step 1: Check system health
    health_ok = check_health_endpoint()
    
    # Step 2: Create a test message via debug simulation
    message_id, test_message = create_test_message()
    
    # Step 3: Test webhook processing
    webhook_ok, webhook_msg_id, webhook_message = test_webhook_with_logging()
    
    # Wait a moment for processing
    print("\n⏳ Waiting 2 seconds for message processing...")
    time.sleep(2)
    
    # Step 4: Check if messages appear in conversations
    conversations_ok = test_conversations_endpoint()
    
    # Step 5: Check if messages appear in messages endpoint
    messages_ok = test_messages_endpoint()
    
    print("\n" + "=" * 60)
    print("📊 FLOW TEST RESULTS")
    print("=" * 60)
    
    print(f"System health: {'✅ OK' if health_ok else '❌ FAIL'}")
    print(f"Debug simulation: {'✅ OK' if message_id else '❌ FAIL'}")
    print(f"Webhook processing: {'✅ OK' if webhook_ok else '❌ FAIL'}")
    print(f"Conversations endpoint: {'✅ OK' if conversations_ok else '❌ FAIL (auth required)'}")
    print(f"Messages endpoint: {'✅ OK' if messages_ok else '❌ FAIL (auth required)'}")
    
    print("\n💡 ANALYSIS:")
    
    if message_id and webhook_ok:
        print("✅ Message creation is working correctly")
        if not conversations_ok and not messages_ok:
            print("⚠️ Cannot verify message retrieval due to authentication")
            print("   This is normal - the endpoints require login")
            print("   Messages should appear in the frontend when logged in")
        else:
            print("✅ Messages are being retrieved correctly")
    else:
        print("❌ Message creation or webhook processing has issues")
    
    print("\n🔍 NEXT STEPS:")
    print("1. Log into the frontend at https://puls1.vercel.app")
    print("2. Go to WhatsApp section")
    print("3. Check if test messages appear in the conversation")
    print("4. If not, check browser console for errors")
    print("5. Verify WhatsApp Business API credentials are configured")
    
    if webhook_msg_id:
        print(f"\n🔎 Look for this webhook message: '{webhook_message}'")
    if message_id:
        print(f"🔎 Look for this debug message: '{test_message}'")

if __name__ == "__main__":
    main()