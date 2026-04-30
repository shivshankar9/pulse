#!/usr/bin/env python3
"""
Backend API tests for WhatsApp integration endpoints.
Tests the 5 new WhatsApp endpoints added to /app/backend/server.py.
"""

import requests
import json
import random
import time
from urllib.parse import quote

# Read backend URL from frontend/.env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BACKEND_URL = line.split('=')[1].strip()
            break

BASE_URL = f"{BACKEND_URL}/api"
print(f"Testing backend at: {BASE_URL}")

# Test state
token = None
user_id = None
test_results = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def register_user():
    """Register a fresh user and get JWT token"""
    global token, user_id
    rand = random.randint(10000, 99999)
    payload = {
        "name": "WA Tester",
        "email": f"watester+{rand}@example.com",
        "password": "Test1234!"
    }
    
    print(f"\n=== 1. User Registration ===")
    print(f"POST {BASE_URL}/auth/register")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("token")
        user_id = data.get("user", {}).get("id")
        log_test("User registration", True, f"User ID: {user_id}, Token received")
        return True
    else:
        log_test("User registration", False, f"Status {resp.status_code}: {resp.text[:200]}")
        return False

def test_whatsapp_send_mock():
    """Test 1: WhatsApp send with mock fallback"""
    print(f"\n=== 2. WhatsApp Send (Mock Fallback) ===")
    
    # Test 1a: Send with auto provider (should fallback to mock)
    payload = {
        "to": "+15551234567",
        "body": "Hello from test",
        "provider": "auto"
    }
    
    print(f"POST {BASE_URL}/whatsapp/send")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    resp = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        checks = [
            ("status", data.get("status") == "queued"),
            ("provider", data.get("provider") == "mock"),
            ("direction", data.get("direction") == "outbound"),
            ("to", data.get("to") == "+15551234567"),
            ("body", data.get("body") == "Hello from test"),
            ("id", bool(data.get("id"))),
        ]
        
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("WhatsApp send (auto → mock)", True, "All fields correct")
        else:
            log_test("WhatsApp send (auto → mock)", False, f"Failed checks: {failed}. Response: {data}")
    else:
        log_test("WhatsApp send (auto → mock)", False, f"Status {resp.status_code}: {resp.text[:200]}")
    
    # Test 1b: Send with explicit whatsapp_business provider (should still fallback to mock)
    payload["provider"] = "whatsapp_business"
    
    print(f"\nPOST {BASE_URL}/whatsapp/send (explicit provider)")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    resp = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("status") == "queued" and data.get("provider") == "mock":
            log_test("WhatsApp send (explicit provider → mock)", True, "Correctly fell back to mock")
        else:
            log_test("WhatsApp send (explicit provider → mock)", False, f"Expected mock fallback, got: {data}")
    else:
        log_test("WhatsApp send (explicit provider → mock)", False, f"Status {resp.status_code}: {resp.text[:200]}")
    
    return "+15551234567"  # Return phone for simulated reply test

def test_simulated_reply(phone):
    """Test 2: Simulated auto-reply after mock send"""
    if not phone:
        print("\n=== 3. Simulated Auto-Reply ===")
        print("SKIPPED: No phone from send test")
        log_test("Simulated auto-reply", False, "No phone available")
        return
    
    print(f"\n=== 3. Simulated Auto-Reply ===")
    print("Waiting 6 seconds for simulated reply...")
    time.sleep(6)
    
    encoded_phone = quote(phone)
    print(f"GET {BASE_URL}/whatsapp/conversations/{encoded_phone}/messages")
    
    resp = requests.get(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/messages",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:1000]}")
    
    if resp.status_code == 200:
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("Simulated auto-reply", False, f"Expected array, got: {type(data)}")
            return
        
        # Should have at least 2 messages: outbound + inbound
        if len(data) < 2:
            log_test("Simulated auto-reply", False, f"Expected at least 2 messages (outbound + inbound), got {len(data)}")
            return
        
        # Find the inbound message with provider="mock_simulated"
        simulated = [m for m in data if m.get("provider") == "mock_simulated" and m.get("direction") == "inbound"]
        
        if not simulated:
            log_test("Simulated auto-reply", False, f"No inbound message with provider='mock_simulated' found. Messages: {data}")
            return
        
        # Check the simulated message has required fields
        sim_msg = simulated[0]
        if not sim_msg.get("body"):
            log_test("Simulated auto-reply", False, f"Simulated message has empty body: {sim_msg}")
            return
        
        log_test("Simulated auto-reply", True, f"Found simulated inbound reply: '{sim_msg.get('body')}'")
    else:
        log_test("Simulated auto-reply", False, f"Status {resp.status_code}: {resp.text[:200]}")

def test_demo_seed():
    """Test 2: Demo seed with idempotency check"""
    print(f"\n=== 3. WhatsApp Demo Seed ===")
    
    payload = {
        "conversations": 4,
        "messages_per_convo": 6
    }
    
    print(f"POST {BASE_URL}/whatsapp/demo/seed")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    resp = requests.post(
        f"{BASE_URL}/whatsapp/demo/seed",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok") and data.get("conversations") == 4 and data.get("messages", 0) > 0:
            first_msg_count = data.get("messages")
            log_test("Demo seed (first call)", True, f"Created {data.get('conversations')} conversations, {first_msg_count} messages")
            
            # Test idempotency - call again
            print(f"\nPOST {BASE_URL}/whatsapp/demo/seed (idempotency check)")
            resp2 = requests.post(
                f"{BASE_URL}/whatsapp/demo/seed",
                json=payload,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            print(f"Status: {resp2.status_code}")
            print(f"Response: {resp2.text[:500]}")
            
            if resp2.status_code == 200:
                data2 = resp2.json()
                # Should create same number of messages (cleared old ones first)
                if data2.get("conversations") == 4 and data2.get("messages") == first_msg_count:
                    log_test("Demo seed (idempotency)", True, "Second call created same count (cleared prior)")
                else:
                    log_test("Demo seed (idempotency)", False, f"Expected same counts, got: {data2}")
            else:
                log_test("Demo seed (idempotency)", False, f"Status {resp2.status_code}: {resp2.text[:200]}")
        else:
            log_test("Demo seed (first call)", False, f"Unexpected response: {data}")
    else:
        log_test("Demo seed (first call)", False, f"Status {resp.status_code}: {resp.text[:200]}")

def test_conversations_list():
    """Test 3: Conversations list grouped by phone"""
    print(f"\n=== 4. WhatsApp Conversations List ===")
    
    print(f"GET {BASE_URL}/whatsapp/conversations")
    
    resp = requests.get(
        f"{BASE_URL}/whatsapp/conversations",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:1000]}")
    
    if resp.status_code == 200:
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("Conversations list", False, f"Expected array, got: {type(data)}")
            return None
        
        if len(data) < 4:
            log_test("Conversations list", False, f"Expected at least 4 threads (from seed), got {len(data)}")
            return None
        
        # Check first conversation structure
        first = data[0]
        required_fields = ["phone", "last_message", "last_direction", "last_ts", "unread", "total"]
        missing = [f for f in required_fields if f not in first]
        
        if missing:
            log_test("Conversations list", False, f"Missing fields: {missing}")
            return None
        
        # Check if seeded threads have contact_name
        seeded_phones = ["+14155551234", "+447911123456", "+919820012345", "+61412345678"]
        seeded_threads = [t for t in data if t.get("phone") in seeded_phones]
        
        if not seeded_threads:
            log_test("Conversations list", False, "No seeded threads found")
            return None
        
        # Check contact enrichment
        has_contact_name = any(t.get("contact_name") for t in seeded_threads)
        has_contact_id = any(t.get("contact_id") for t in seeded_threads)
        
        if not has_contact_name:
            log_test("Conversations list", False, "Seeded threads missing contact_name")
            return None
        
        # Check sorting (last_ts descending)
        if len(data) >= 2:
            first_ts = data[0].get("last_ts", "")
            second_ts = data[1].get("last_ts", "")
            if first_ts < second_ts:
                log_test("Conversations list", False, f"Not sorted by last_ts desc: {first_ts} < {second_ts}")
                return None
        
        log_test("Conversations list", True, f"Found {len(data)} threads, properly structured and sorted")
        return data[0].get("phone")  # Return first phone for next test
    else:
        log_test("Conversations list", False, f"Status {resp.status_code}: {resp.text[:200]}")
        return None

def test_thread_messages_and_mark_read(phone):
    """Test 4: Thread messages + mark read"""
    if not phone:
        print("\n=== 5. Thread Messages + Mark Read ===")
        print("SKIPPED: No phone from conversations list")
        log_test("Thread messages", False, "No phone available")
        log_test("Mark read", False, "No phone available")
        return
    
    print(f"\n=== 5. Thread Messages + Mark Read ===")
    
    # URL-encode the phone
    encoded_phone = quote(phone)
    
    print(f"GET {BASE_URL}/whatsapp/conversations/{encoded_phone}/messages")
    
    resp = requests.get(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/messages",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:1000]}")
    
    if resp.status_code == 200:
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("Thread messages", False, f"Expected array, got: {type(data)}")
            return
        
        if len(data) == 0:
            log_test("Thread messages", False, "Empty thread")
            return
        
        # Check message structure
        first = data[0]
        required_fields = ["direction", "body"]
        missing = [f for f in required_fields if f not in first]
        
        if missing:
            log_test("Thread messages", False, f"Missing fields: {missing}")
            return
        
        # Check sorting (chronological ascending)
        if len(data) >= 2:
            first_ts = data[0].get("sent_at") or data[0].get("received_at") or ""
            second_ts = data[1].get("sent_at") or data[1].get("received_at") or ""
            if first_ts > second_ts:
                log_test("Thread messages", False, f"Not sorted chronologically: {first_ts} > {second_ts}")
                return
        
        # Check for unread inbound messages
        inbound_unread = [m for m in data if m.get("direction") == "inbound" and m.get("read") == False]
        
        log_test("Thread messages", True, f"Found {len(data)} messages, {len(inbound_unread)} unread")
        
        # Test mark read
        print(f"\nPOST {BASE_URL}/whatsapp/conversations/{encoded_phone}/read")
        
        resp2 = requests.post(
            f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/read",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {resp2.status_code}")
        print(f"Response: {resp2.text[:500]}")
        
        if resp2.status_code == 200:
            data2 = resp2.json()
            if data2.get("ok"):
                log_test("Mark read", True, "Marked thread as read")
                
                # Verify unread count is now 0
                print(f"\nGET {BASE_URL}/whatsapp/conversations (verify unread=0)")
                resp3 = requests.get(
                    f"{BASE_URL}/whatsapp/conversations",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                if resp3.status_code == 200:
                    convos = resp3.json()
                    thread = next((t for t in convos if t.get("phone") == phone), None)
                    if thread:
                        if thread.get("unread") == 0:
                            log_test("Mark read (verify)", True, "Unread count is now 0")
                        else:
                            log_test("Mark read (verify)", False, f"Unread count still {thread.get('unread')}")
                    else:
                        log_test("Mark read (verify)", False, "Thread not found in conversations list")
            else:
                log_test("Mark read", False, f"Unexpected response: {data2}")
        else:
            log_test("Mark read", False, f"Status {resp2.status_code}: {resp2.text[:200]}")
    else:
        log_test("Thread messages", False, f"Status {resp.status_code}: {resp.text[:200]}")

def test_whatsapp_business_test_endpoint():
    """Test 5: Meta WhatsApp Business test endpoint"""
    print(f"\n=== 6. Meta WhatsApp Business Test Endpoint ===")
    
    # Test without configuration
    print(f"POST {BASE_URL}/whatsapp-business/test (no config)")
    
    resp = requests.post(
        f"{BASE_URL}/whatsapp-business/test",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 400:
        if "not configured" in resp.text.lower() or "incomplete" in resp.text.lower():
            log_test("WhatsApp Business test (no config)", True, "Correctly rejected with 400")
        else:
            log_test("WhatsApp Business test (no config)", False, f"Wrong error message: {resp.text[:200]}")
    else:
        log_test("WhatsApp Business test (no config)", False, f"Expected 400, got {resp.status_code}")
    
    # Save fake credentials
    print(f"\nPUT {BASE_URL}/integrations/whatsapp_business")
    
    config_payload = {
        "config": {
            "access_token": "FAKE_TOKEN",
            "phone_number_id": "123",
            "business_account_id": "456"
        }
    }
    
    print(f"Body: {json.dumps(config_payload, indent=2)}")
    
    resp2 = requests.put(
        f"{BASE_URL}/integrations/whatsapp_business",
        json=config_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        log_test("Save WhatsApp Business config", True, "Config saved")
        
        # Test with fake credentials (should hit Meta and fail)
        print(f"\nPOST {BASE_URL}/whatsapp-business/test (fake config)")
        
        resp3 = requests.post(
            f"{BASE_URL}/whatsapp-business/test",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {resp3.status_code}")
        print(f"Response: {resp3.text[:500]}")
        
        if resp3.status_code == 400:
            if "meta api rejected" in resp3.text.lower() or "rejected credentials" in resp3.text.lower():
                log_test("WhatsApp Business test (fake config)", True, "Meta API correctly rejected fake token")
            else:
                log_test("WhatsApp Business test (fake config)", False, f"Wrong error: {resp3.text[:200]}")
        else:
            log_test("WhatsApp Business test (fake config)", False, f"Expected 400, got {resp3.status_code}")
        
        # Also test via /api/integrations/{provider}/test
        print(f"\nPOST {BASE_URL}/integrations/whatsapp_business/test")
        
        resp4 = requests.post(
            f"{BASE_URL}/integrations/whatsapp_business/test",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {resp4.status_code}")
        print(f"Response: {resp4.text[:500]}")
        
        if resp4.status_code == 400:
            log_test("Integration test endpoint", True, "Also correctly rejected")
        else:
            log_test("Integration test endpoint", False, f"Expected 400, got {resp4.status_code}")
    else:
        log_test("Save WhatsApp Business config", False, f"Status {resp2.status_code}: {resp2.text[:200]}")

def test_delete_conversation(phone):
    """Test 6: Delete conversation"""
    if not phone:
        print("\n=== 7. Delete Conversation ===")
        print("SKIPPED: No phone from conversations list")
        log_test("Delete conversation", False, "No phone available")
        return
    
    print(f"\n=== 7. Delete Conversation ===")
    
    encoded_phone = quote(phone)
    
    print(f"DELETE {BASE_URL}/whatsapp/conversations/{encoded_phone}")
    
    resp = requests.delete(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok") and data.get("deleted", 0) > 0:
            log_test("Delete conversation", True, f"Deleted {data.get('deleted')} messages")
            
            # Verify phone is no longer in conversations list
            print(f"\nGET {BASE_URL}/whatsapp/conversations (verify deleted)")
            
            resp2 = requests.get(
                f"{BASE_URL}/whatsapp/conversations",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if resp2.status_code == 200:
                convos = resp2.json()
                thread = next((t for t in convos if t.get("phone") == phone), None)
                if thread is None:
                    log_test("Delete conversation (verify)", True, "Phone no longer in list")
                else:
                    log_test("Delete conversation (verify)", False, "Phone still in list")
        else:
            log_test("Delete conversation", False, f"Unexpected response: {data}")
    else:
        log_test("Delete conversation", False, f"Status {resp.status_code}: {resp.text[:200]}")

def test_delete_conversation(phone):
    """Test 6: Delete conversation"""
    if not phone:
        print("\n=== 7. Delete Conversation ===")
        print("SKIPPED: No phone from conversations list")
        log_test("Delete conversation", False, "No phone available")
        return
    
    print(f"\n=== 7. Delete Conversation ===")
    
    encoded_phone = quote(phone)
    
    print(f"DELETE {BASE_URL}/whatsapp/conversations/{encoded_phone}")
    
    resp = requests.delete(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok") and data.get("deleted", 0) > 0:
            log_test("Delete conversation", True, f"Deleted {data.get('deleted')} messages")
            
            # Verify phone is no longer in conversations list
            print(f"\nGET {BASE_URL}/whatsapp/conversations (verify deleted)")
            
            resp2 = requests.get(
                f"{BASE_URL}/whatsapp/conversations",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if resp2.status_code == 200:
                convos = resp2.json()
                thread = next((t for t in convos if t.get("phone") == phone), None)
                if thread is None:
                    log_test("Delete conversation (verify)", True, "Phone no longer in list")
                else:
                    log_test("Delete conversation (verify)", False, "Phone still in list")
        else:
            log_test("Delete conversation", False, f"Unexpected response: {data}")
    else:
        log_test("Delete conversation", False, f"Status {resp.status_code}: {resp.text[:200]}")

def test_templates_crud():
    """Test 7: Templates CRUD + seed"""
    print(f"\n=== 8. WhatsApp Templates CRUD ===")
    
    # Test 7a: List templates (should be empty or have some from prior runs)
    print(f"GET {BASE_URL}/whatsapp/templates")
    
    resp = requests.get(
        f"{BASE_URL}/whatsapp/templates",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            initial_count = len(data)
            log_test("List templates (initial)", True, f"Found {initial_count} templates")
        else:
            log_test("List templates (initial)", False, f"Expected array, got: {type(data)}")
            return None
    else:
        log_test("List templates (initial)", False, f"Status {resp.status_code}: {resp.text[:200]}")
        return None
    
    # Test 7b: Seed default templates
    print(f"\nPOST {BASE_URL}/whatsapp/templates/seed")
    
    resp2 = requests.post(
        f"{BASE_URL}/whatsapp/templates/seed",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        data2 = resp2.json()
        if data2.get("ok") and isinstance(data2.get("created"), int):
            first_created = data2.get("created")
            log_test("Seed templates (first call)", True, f"Created {first_created} templates")
            
            # Test idempotency - call again
            print(f"\nPOST {BASE_URL}/whatsapp/templates/seed (idempotency check)")
            
            resp3 = requests.post(
                f"{BASE_URL}/whatsapp/templates/seed",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            print(f"Status: {resp3.status_code}")
            print(f"Response: {resp3.text[:500]}")
            
            if resp3.status_code == 200:
                data3 = resp3.json()
                if data3.get("created") == 0:
                    log_test("Seed templates (idempotency)", True, "Second call created 0 (idempotent by name)")
                else:
                    log_test("Seed templates (idempotency)", False, f"Expected created=0, got: {data3.get('created')}")
            else:
                log_test("Seed templates (idempotency)", False, f"Status {resp3.status_code}: {resp3.text[:200]}")
        else:
            log_test("Seed templates (first call)", False, f"Unexpected response: {data2}")
            return None
    else:
        log_test("Seed templates (first call)", False, f"Status {resp2.status_code}: {resp2.text[:200]}")
        return None
    
    # Test 7c: List templates again (should have at least 5)
    print(f"\nGET {BASE_URL}/whatsapp/templates (after seed)")
    
    resp4 = requests.get(
        f"{BASE_URL}/whatsapp/templates",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp4.status_code}")
    print(f"Response: {resp4.text[:1000]}")
    
    welcome_template = None
    
    if resp4.status_code == 200:
        data4 = resp4.json()
        if isinstance(data4, list):
            if len(data4) < 5:
                log_test("List templates (after seed)", False, f"Expected at least 5 templates, got {len(data4)}")
                return None
            
            # Check for expected templates
            expected_names = ["welcome_message", "order_confirmation", "appointment_reminder", "follow_up", "otp_code"]
            found_names = [t.get("name") for t in data4]
            missing = [n for n in expected_names if n not in found_names]
            
            if missing:
                log_test("List templates (after seed)", False, f"Missing templates: {missing}")
                return None
            
            # Check structure of first template
            first = data4[0]
            required_fields = ["id", "name", "body", "param_count"]
            missing_fields = [f for f in required_fields if f not in first]
            
            if missing_fields:
                log_test("List templates (after seed)", False, f"Missing fields: {missing_fields}")
                return None
            
            # Check param_count is a number
            if not isinstance(first.get("param_count"), int):
                log_test("List templates (after seed)", False, f"param_count should be int, got: {type(first.get('param_count'))}")
                return None
            
            # Find welcome_message template for later tests
            welcome_template = next((t for t in data4 if t.get("name") == "welcome_message"), None)
            
            log_test("List templates (after seed)", True, f"Found {len(data4)} templates with correct structure")
        else:
            log_test("List templates (after seed)", False, f"Expected array, got: {type(data4)}")
            return None
    else:
        log_test("List templates (after seed)", False, f"Status {resp4.status_code}: {resp4.text[:200]}")
        return None
    
    # Test 7d: Create custom template
    print(f"\nPOST {BASE_URL}/whatsapp/templates (create custom)")
    
    custom_payload = {
        "name": "test_tpl",
        "category": "utility",
        "language": "en_US",
        "body": "Hi {{1}}, code {{2}}"
    }
    
    print(f"Body: {json.dumps(custom_payload, indent=2)}")
    
    resp5 = requests.post(
        f"{BASE_URL}/whatsapp/templates",
        json=custom_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp5.status_code}")
    print(f"Response: {resp5.text[:500]}")
    
    custom_id = None
    
    if resp5.status_code == 200:
        data5 = resp5.json()
        if data5.get("param_count") == 2 and data5.get("id") and data5.get("status") == "local":
            custom_id = data5.get("id")
            log_test("Create custom template", True, f"Created template with param_count=2, id={custom_id}")
        else:
            log_test("Create custom template", False, f"Unexpected response: {data5}")
            return welcome_template
    else:
        log_test("Create custom template", False, f"Status {resp5.status_code}: {resp5.text[:200]}")
        return welcome_template
    
    # Test 7e: Update template
    print(f"\nPUT {BASE_URL}/whatsapp/templates/{custom_id}")
    
    update_payload = {
        "name": "test_tpl_v2",
        "category": "marketing",
        "language": "en_US",
        "body": "Hey {{1}}, your code {{2}} is ready"
    }
    
    print(f"Body: {json.dumps(update_payload, indent=2)}")
    
    resp6 = requests.put(
        f"{BASE_URL}/whatsapp/templates/{custom_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp6.status_code}")
    print(f"Response: {resp6.text[:500]}")
    
    if resp6.status_code == 200:
        data6 = resp6.json()
        if data6.get("name") == "test_tpl_v2" and data6.get("category") == "marketing":
            log_test("Update template", True, "Template updated successfully")
        else:
            log_test("Update template", False, f"Unexpected response: {data6}")
    else:
        log_test("Update template", False, f"Status {resp6.status_code}: {resp6.text[:200]}")
    
    # Test 7f: Delete template
    print(f"\nDELETE {BASE_URL}/whatsapp/templates/{custom_id}")
    
    resp7 = requests.delete(
        f"{BASE_URL}/whatsapp/templates/{custom_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp7.status_code}")
    print(f"Response: {resp7.text[:500]}")
    
    if resp7.status_code == 200:
        data7 = resp7.json()
        if data7.get("ok"):
            log_test("Delete template", True, "Template deleted successfully")
        else:
            log_test("Delete template", False, f"Unexpected response: {data7}")
    else:
        log_test("Delete template", False, f"Status {resp7.status_code}: {resp7.text[:200]}")
    
    return welcome_template

def test_send_template(welcome_template):
    """Test 8: Send template with parameter validation"""
    if not welcome_template:
        print("\n=== 9. Send Template ===")
        print("SKIPPED: No welcome_message template found")
        log_test("Send template (wrong param count)", False, "No template available")
        log_test("Send template (correct params)", False, "No template available")
        log_test("Send template (by name)", False, "No template available")
        log_test("Send template (missing template)", False, "No template available")
        return
    
    print(f"\n=== 9. Send Template ===")
    
    template_id = welcome_template.get("id")
    param_count = welcome_template.get("param_count")
    
    print(f"Using template: {welcome_template.get('name')} (id={template_id}, param_count={param_count})")
    
    # Test 8a: Wrong param count
    print(f"\nPOST {BASE_URL}/whatsapp/send-template (wrong param count)")
    
    wrong_payload = {
        "to": "+15559998888",
        "template_id": template_id,
        "params": ["Alice"]  # Should need 2 params
    }
    
    print(f"Body: {json.dumps(wrong_payload, indent=2)}")
    
    resp = requests.post(
        f"{BASE_URL}/whatsapp/send-template",
        json=wrong_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 400:
        if "expects 2 parameter" in resp.text.lower() or "got 1" in resp.text.lower():
            log_test("Send template (wrong param count)", True, "Correctly rejected with 400")
        else:
            log_test("Send template (wrong param count)", False, f"Wrong error message: {resp.text[:200]}")
    else:
        log_test("Send template (wrong param count)", False, f"Expected 400, got {resp.status_code}")
    
    # Test 8b: Correct params
    print(f"\nPOST {BASE_URL}/whatsapp/send-template (correct params)")
    
    correct_payload = {
        "to": "+15559998888",
        "template_id": template_id,
        "params": ["Alice", "Acme"]
    }
    
    print(f"Body: {json.dumps(correct_payload, indent=2)}")
    
    resp2 = requests.post(
        f"{BASE_URL}/whatsapp/send-template",
        json=correct_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        data2 = resp2.json()
        checks = [
            ("status", data2.get("status") == "queued"),
            ("template_id", data2.get("template_id") == template_id),
            ("template_name", data2.get("template_name") == "welcome_message"),
            ("body_rendered", "{{" not in data2.get("body", "")),  # No remaining placeholders
            ("body_has_alice", "Alice" in data2.get("body", "")),
            ("body_has_acme", "Acme" in data2.get("body", "")),
        ]
        
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("Send template (correct params)", True, f"Template sent and rendered: '{data2.get('body')}'")
        else:
            log_test("Send template (correct params)", False, f"Failed checks: {failed}. Response: {data2}")
    else:
        log_test("Send template (correct params)", False, f"Status {resp2.status_code}: {resp2.text[:200]}")
    
    # Test 8c: Send by template_name
    print(f"\nPOST {BASE_URL}/whatsapp/send-template (by name)")
    
    name_payload = {
        "to": "+15559998888",
        "template_name": "order_confirmation",
        "params": ["Bob", "#ORD123", "Tomorrow"]
    }
    
    print(f"Body: {json.dumps(name_payload, indent=2)}")
    
    resp3 = requests.post(
        f"{BASE_URL}/whatsapp/send-template",
        json=name_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp3.status_code}")
    print(f"Response: {resp3.text[:500]}")
    
    if resp3.status_code == 200:
        data3 = resp3.json()
        if "{{" not in data3.get("body", "") and "Bob" in data3.get("body", ""):
            log_test("Send template (by name)", True, f"Template sent by name: '{data3.get('body')}'")
        else:
            log_test("Send template (by name)", False, f"Body not properly rendered: {data3.get('body')}")
    else:
        log_test("Send template (by name)", False, f"Status {resp3.status_code}: {resp3.text[:200]}")
    
    # Test 8d: Missing template
    print(f"\nPOST {BASE_URL}/whatsapp/send-template (missing template)")
    
    missing_payload = {
        "to": "+15559998888",
        "template_id": "nonexistent-uuid",
        "params": []
    }
    
    print(f"Body: {json.dumps(missing_payload, indent=2)}")
    
    resp4 = requests.post(
        f"{BASE_URL}/whatsapp/send-template",
        json=missing_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {resp4.status_code}")
    print(f"Response: {resp4.text[:500]}")
    
    if resp4.status_code == 404:
        log_test("Send template (missing template)", True, "Correctly returned 404")
    else:
        log_test("Send template (missing template)", False, f"Expected 404, got {resp4.status_code}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for t in test_results if t["passed"])
    failed = sum(1 for t in test_results if not t["passed"])
    total = len(test_results)
    
    print(f"\nTotal: {total} tests")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    
    if failed > 0:
        print("\nFailed tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['name']}")
                if t["details"]:
                    print(f"     {t['details']}")
    
    print("\n" + "="*60)
    
    return failed == 0

if __name__ == "__main__":
    print("="*60)
    print("WhatsApp Backend API Tests")
    print("="*60)
    
    # Run tests in order
    if not register_user():
        print("\n❌ Cannot proceed without user registration")
        exit(1)
    
    # Test A & B: Send + simulated reply
    send_phone = test_whatsapp_send_mock()
    test_simulated_reply(send_phone)
    
    # Test C: Demo seed
    test_demo_seed()
    
    # Test D & E: Conversations, thread, mark read, delete
    phone = test_conversations_list()
    test_thread_messages_and_mark_read(phone)
    test_delete_conversation(phone)
    
    # Test F: Meta WhatsApp Business test endpoint
    test_whatsapp_business_test_endpoint()
    
    # Test G & H: Templates CRUD + send
    welcome_template = test_templates_crud()
    test_send_template(welcome_template)
    
    # Print summary
    all_passed = print_summary()
    
    exit(0 if all_passed else 1)
