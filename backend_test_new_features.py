#!/usr/bin/env python3
"""
Backend API tests for 4 new WhatsApp features:
1. Presence heartbeat + online users list
2. WhatsApp chat assignment (manual + auto-online)
3. Sync WhatsApp chat to Contact (lead)
4. Create ticket from WhatsApp thread
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
token_a = None
user_a_id = None
token_b = None
user_b_id = None
test_results = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def register_two_users():
    """Register TWO users for team testing"""
    global token_a, user_a_id, token_b, user_b_id
    
    print(f"\n{'='*60}")
    print("SETUP: Register Two Users")
    print('='*60)
    
    # User A (admin)
    rand_a = random.randint(10000, 99999)
    payload_a = {
        "name": "Agent Alpha",
        "email": f"alpha+{rand_a}@example.com",
        "password": "Test1234!"
    }
    
    print(f"\n1. Register User A (Admin)")
    print(f"POST {BASE_URL}/auth/register")
    print(f"Body: {json.dumps(payload_a, indent=2)}")
    
    resp_a = requests.post(f"{BASE_URL}/auth/register", json=payload_a)
    print(f"Status: {resp_a.status_code}")
    print(f"Response: {resp_a.text[:500]}")
    
    if resp_a.status_code == 200:
        data_a = resp_a.json()
        token_a = data_a.get("token")
        user_a_id = data_a.get("user", {}).get("id")
        log_test("Register User A", True, f"User ID: {user_a_id}")
    else:
        log_test("Register User A", False, f"Status {resp_a.status_code}: {resp_a.text[:200]}")
        return False
    
    # User B (member)
    rand_b = random.randint(10000, 99999)
    payload_b = {
        "name": "Agent Beta",
        "email": f"beta+{rand_b}@example.com",
        "password": "Test1234!"
    }
    
    print(f"\n2. Register User B (Member)")
    print(f"POST {BASE_URL}/auth/register")
    print(f"Body: {json.dumps(payload_b, indent=2)}")
    
    resp_b = requests.post(f"{BASE_URL}/auth/register", json=payload_b)
    print(f"Status: {resp_b.status_code}")
    print(f"Response: {resp_b.text[:500]}")
    
    if resp_b.status_code == 200:
        data_b = resp_b.json()
        token_b = data_b.get("token")
        user_b_id = data_b.get("user", {}).get("id")
        log_test("Register User B", True, f"User ID: {user_b_id}")
    else:
        log_test("Register User B", False, f"Status {resp_b.status_code}: {resp_b.text[:200]}")
        return False
    
    return True

def test_presence_heartbeat():
    """Test 1: Presence heartbeat + online users list"""
    print(f"\n{'='*60}")
    print("TEST 1: Presence Heartbeat + Online Users List")
    print('='*60)
    
    # Test 1a: User A sends heartbeat (no body)
    print(f"\n1a. User A: POST /api/presence/heartbeat (no body)")
    resp1 = requests.post(
        f"{BASE_URL}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp1.status_code}")
    print(f"Response: {resp1.text[:500]}")
    
    if resp1.status_code == 200:
        data1 = resp1.json()
        if data1.get("ok") == True and data1.get("status") == "online":
            log_test("Presence heartbeat (no body)", True, "User A marked online")
        else:
            log_test("Presence heartbeat (no body)", False, f"Unexpected response: {data1}")
    else:
        log_test("Presence heartbeat (no body)", False, f"Status {resp1.status_code}: {resp1.text[:200]}")
    
    # Test 1b: User A sends heartbeat with body {"status":"online"}
    print(f"\n1b. User A: POST /api/presence/heartbeat with body")
    resp2 = requests.post(
        f"{BASE_URL}/presence/heartbeat",
        json={"status": "online"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        data2 = resp2.json()
        if data2.get("ok") == True and data2.get("status") == "online":
            log_test("Presence heartbeat (with body)", True, "User A marked online")
        else:
            log_test("Presence heartbeat (with body)", False, f"Unexpected response: {data2}")
    else:
        log_test("Presence heartbeat (with body)", False, f"Status {resp2.status_code}: {resp2.text[:200]}")
    
    # Test 1c: User B does NOT send heartbeat (stays offline)
    print(f"\n1c. User B: No heartbeat sent (should be offline)")
    
    # Test 1d: User A gets presence list
    print(f"\n1d. User A: GET /api/presence")
    resp3 = requests.get(
        f"{BASE_URL}/presence",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp3.status_code}")
    print(f"Response: {resp3.text[:1000]}")
    
    if resp3.status_code == 200:
        data3 = resp3.json()
        if isinstance(data3, list):
            # Find User A and User B in the list
            user_a_presence = next((u for u in data3 if u.get("id") == user_a_id), None)
            user_b_presence = next((u for u in data3 if u.get("id") == user_b_id), None)
            
            checks = []
            if user_a_presence:
                checks.append(("User A online", user_a_presence.get("online") == True))
                checks.append(("User A status", user_a_presence.get("status") == "online"))
                checks.append(("User A last_seen", bool(user_a_presence.get("last_seen"))))
            else:
                checks.append(("User A found", False))
            
            if user_b_presence:
                checks.append(("User B offline", user_b_presence.get("online") == False))
                checks.append(("User B status", user_b_presence.get("status") == "offline"))
            else:
                checks.append(("User B found", False))
            
            all_passed = all(check[1] for check in checks)
            failed = [check[0] for check in checks if not check[1]]
            
            if all_passed:
                log_test("Presence list", True, "User A online, User B offline")
            else:
                log_test("Presence list", False, f"Failed checks: {failed}")
        else:
            log_test("Presence list", False, f"Expected array, got: {type(data3)}")
    else:
        log_test("Presence list", False, f"Status {resp3.status_code}: {resp3.text[:200]}")
    
    # Test 1e: User A goes offline
    print(f"\n1e. User A: POST /api/presence/offline")
    resp4 = requests.post(
        f"{BASE_URL}/presence/offline",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp4.status_code}")
    print(f"Response: {resp4.text[:500]}")
    
    if resp4.status_code == 200:
        data4 = resp4.json()
        if data4.get("ok") == True:
            log_test("Presence offline", True, "User A marked offline")
        else:
            log_test("Presence offline", False, f"Unexpected response: {data4}")
    else:
        log_test("Presence offline", False, f"Status {resp4.status_code}: {resp4.text[:200]}")
    
    # Test 1f: Verify User A is now offline in presence list
    print(f"\n1f. User A: GET /api/presence (verify offline)")
    resp5 = requests.get(
        f"{BASE_URL}/presence",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp5.status_code}")
    print(f"Response: {resp5.text[:1000]}")
    
    if resp5.status_code == 200:
        data5 = resp5.json()
        if isinstance(data5, list):
            user_a_presence = next((u for u in data5 if u.get("id") == user_a_id), None)
            if user_a_presence and user_a_presence.get("online") == False:
                log_test("Presence offline verification", True, "User A now offline")
            else:
                log_test("Presence offline verification", False, f"User A still online: {user_a_presence}")
        else:
            log_test("Presence offline verification", False, f"Expected array, got: {type(data5)}")
    else:
        log_test("Presence offline verification", False, f"Status {resp5.status_code}: {resp5.text[:200]}")
    
    # Test 1g: User A goes back online for remaining tests
    print(f"\n1g. User A: POST /api/presence/heartbeat (back online)")
    resp6 = requests.post(
        f"{BASE_URL}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp6.status_code}")
    print(f"Response: {resp6.text[:500]}")
    
    if resp6.status_code == 200:
        log_test("Presence back online", True, "User A back online")
    else:
        log_test("Presence back online", False, f"Status {resp6.status_code}: {resp6.text[:200]}")

def test_chat_assignment():
    """Test 2: WhatsApp chat assignment (manual + auto)"""
    print(f"\n{'='*60}")
    print("TEST 2: WhatsApp Chat Assignment")
    print('='*60)
    
    # Seed some conversations first
    print(f"\n2a. Seed conversations")
    print(f"POST {BASE_URL}/whatsapp/demo/seed")
    seed_payload = {"conversations": 3, "messages_per_convo": 4}
    print(f"Body: {json.dumps(seed_payload, indent=2)}")
    
    resp_seed = requests.post(
        f"{BASE_URL}/whatsapp/demo/seed",
        json=seed_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_seed.status_code}")
    print(f"Response: {resp_seed.text[:500]}")
    
    if resp_seed.status_code != 200:
        log_test("Seed conversations", False, f"Status {resp_seed.status_code}: {resp_seed.text[:200]}")
        return None
    else:
        log_test("Seed conversations", True, "Seeded 3 conversations")
    
    # Get conversations list to pick a phone
    print(f"\n2b. GET /api/whatsapp/conversations-v2")
    resp_convs = requests.get(
        f"{BASE_URL}/whatsapp/conversations-v2",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_convs.status_code}")
    print(f"Response: {resp_convs.text[:1000]}")
    
    if resp_convs.status_code != 200:
        log_test("Get conversations-v2", False, f"Status {resp_convs.status_code}: {resp_convs.text[:200]}")
        return None
    
    convs = resp_convs.json()
    if not isinstance(convs, list) or len(convs) == 0:
        log_test("Get conversations-v2", False, "No conversations found")
        return None
    
    # Pick first phone
    phone1 = convs[0].get("phone")
    if not phone1:
        log_test("Get conversations-v2", False, "No phone in first conversation")
        return None
    
    # Verify initial state: assigned_to should be null
    if convs[0].get("assigned_to") is None and convs[0].get("assigned_to_name") is None:
        log_test("Get conversations-v2 (initial state)", True, f"Phone {phone1} unassigned")
    else:
        log_test("Get conversations-v2 (initial state)", False, f"Phone {phone1} already assigned: {convs[0]}")
    
    # Test 2c: Manual assign to User B
    print(f"\n2c. Manual assign {phone1} to User B")
    encoded_phone = quote(phone1, safe='')
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone}/assign")
    assign_payload = {"user_id": user_b_id}
    print(f"Body: {json.dumps(assign_payload, indent=2)}")
    
    resp_assign = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/assign",
        json=assign_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_assign.status_code}")
    print(f"Response: {resp_assign.text[:500]}")
    
    if resp_assign.status_code == 200:
        data_assign = resp_assign.json()
        if data_assign.get("assigned_to_name") == "Agent Beta":
            log_test("Manual assign to User B", True, f"Assigned to {data_assign.get('assigned_to_name')}")
        else:
            log_test("Manual assign to User B", False, f"Unexpected response: {data_assign}")
    else:
        log_test("Manual assign to User B", False, f"Status {resp_assign.status_code}: {resp_assign.text[:200]}")
    
    # Test 2d: Verify assignment in conversations-v2
    print(f"\n2d. Verify assignment in conversations-v2")
    resp_verify = requests.get(
        f"{BASE_URL}/whatsapp/conversations-v2",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_verify.status_code}")
    print(f"Response: {resp_verify.text[:1000]}")
    
    if resp_verify.status_code == 200:
        convs_verify = resp_verify.json()
        conv1 = next((c for c in convs_verify if c.get("phone") == phone1), None)
        if conv1:
            checks = [
                ("assigned_to", conv1.get("assigned_to") == user_b_id),
                ("assigned_to_name", conv1.get("assigned_to_name") == "Agent Beta"),
                ("auto_assigned", conv1.get("auto_assigned") == False or conv1.get("auto_assigned") is None),
            ]
            all_passed = all(check[1] for check in checks)
            failed = [check[0] for check in checks if not check[1]]
            
            if all_passed:
                log_test("Verify assignment in conversations-v2", True, "Assignment verified")
            else:
                log_test("Verify assignment in conversations-v2", False, f"Failed checks: {failed}, conv: {conv1}")
        else:
            log_test("Verify assignment in conversations-v2", False, f"Phone {phone1} not found")
    else:
        log_test("Verify assignment in conversations-v2", False, f"Status {resp_verify.status_code}: {resp_verify.text[:200]}")
    
    # Test 2e: Unassign
    print(f"\n2e. Unassign {phone1}")
    unassign_payload = {"user_id": None}
    print(f"Body: {json.dumps(unassign_payload, indent=2)}")
    
    resp_unassign = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/assign",
        json=unassign_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_unassign.status_code}")
    print(f"Response: {resp_unassign.text[:500]}")
    
    if resp_unassign.status_code == 200:
        data_unassign = resp_unassign.json()
        if data_unassign.get("assigned_to") is None:
            log_test("Unassign", True, "Unassigned successfully")
        else:
            log_test("Unassign", False, f"Unexpected response: {data_unassign}")
    else:
        log_test("Unassign", False, f"Status {resp_unassign.status_code}: {resp_unassign.text[:200]}")
    
    # Test 2f: Auto-assign when only User A is online
    print(f"\n2f. Auto-assign {phone1} (only User A online)")
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone}/auto-assign")
    
    resp_auto = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/auto-assign",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_auto.status_code}")
    print(f"Response: {resp_auto.text[:500]}")
    
    if resp_auto.status_code == 200:
        data_auto = resp_auto.json()
        checks = [
            ("assigned_to", data_auto.get("assigned_to") == user_a_id),
            ("assigned_to_name", data_auto.get("assigned_to_name") == "Agent Alpha"),
            ("candidates_online", data_auto.get("candidates_online") >= 1),
        ]
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("Auto-assign (User A online)", True, f"Assigned to User A, {data_auto.get('candidates_online')} online")
        else:
            log_test("Auto-assign (User A online)", False, f"Failed checks: {failed}, response: {data_auto}")
    else:
        log_test("Auto-assign (User A online)", False, f"Status {resp_auto.status_code}: {resp_auto.text[:200]}")
    
    # Test 2g: Verify auto_assigned flag in conversations-v2
    print(f"\n2g. Verify auto_assigned flag in conversations-v2")
    resp_verify2 = requests.get(
        f"{BASE_URL}/whatsapp/conversations-v2",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_verify2.status_code}")
    print(f"Response: {resp_verify2.text[:1000]}")
    
    if resp_verify2.status_code == 200:
        convs_verify2 = resp_verify2.json()
        conv1 = next((c for c in convs_verify2 if c.get("phone") == phone1), None)
        if conv1 and conv1.get("auto_assigned") == True:
            log_test("Verify auto_assigned flag", True, "auto_assigned=true")
        else:
            log_test("Verify auto_assigned flag", False, f"auto_assigned not true: {conv1}")
    else:
        log_test("Verify auto_assigned flag", False, f"Status {resp_verify2.status_code}: {resp_verify2.text[:200]}")
    
    # Test 2h: Auto-assign failure when nobody online
    print(f"\n2h. Auto-assign failure when nobody online")
    
    # First, mark User A offline
    print(f"  - Mark User A offline")
    resp_offline = requests.post(
        f"{BASE_URL}/presence/offline",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Status: {resp_offline.status_code}")
    
    # Pick a different phone for this test
    if len(convs) > 1:
        phone2 = convs[1].get("phone")
        encoded_phone2 = quote(phone2, safe='')
        
        print(f"  - Try auto-assign {phone2}")
        resp_auto_fail = requests.post(
            f"{BASE_URL}/whatsapp/conversations/{encoded_phone2}/auto-assign",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        print(f"  Status: {resp_auto_fail.status_code}")
        print(f"  Response: {resp_auto_fail.text[:500]}")
        
        if resp_auto_fail.status_code == 400:
            data_fail = resp_auto_fail.json()
            if "No agents are online" in data_fail.get("detail", ""):
                log_test("Auto-assign failure (nobody online)", True, "Correctly returned 400")
            else:
                log_test("Auto-assign failure (nobody online)", False, f"Wrong error message: {data_fail}")
        else:
            log_test("Auto-assign failure (nobody online)", False, f"Expected 400, got {resp_auto_fail.status_code}")
    else:
        log_test("Auto-assign failure (nobody online)", False, "Not enough conversations to test")
    
    # Reset User A online for remaining tests
    print(f"\n  - Reset User A online")
    resp_online = requests.post(
        f"{BASE_URL}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Status: {resp_online.status_code}")
    
    # Test 2i: Bad user_id
    print(f"\n2i. Assign with bad user_id")
    bad_payload = {"user_id": "nonexistent-uuid"}
    print(f"Body: {json.dumps(bad_payload, indent=2)}")
    
    resp_bad = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone}/assign",
        json=bad_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_bad.status_code}")
    print(f"Response: {resp_bad.text[:500]}")
    
    if resp_bad.status_code == 404:
        log_test("Assign with bad user_id", True, "Correctly returned 404")
    else:
        log_test("Assign with bad user_id", False, f"Expected 404, got {resp_bad.status_code}")
    
    return phone1

def test_sync_contact(phone1):
    """Test 3: Sync WhatsApp chat to Contact (lead)"""
    print(f"\n{'='*60}")
    print("TEST 3: Sync WhatsApp Chat to Contact (Lead)")
    print('='*60)
    
    # Test 3a: Sync new contact with full details
    phone_new = "+15550000999"
    encoded_phone_new = quote(phone_new, safe='')
    
    # First send a message to create the thread
    print(f"\n3a. Send message to {phone_new} to create thread")
    send_payload = {"to": phone_new, "body": "hi"}
    print(f"POST {BASE_URL}/whatsapp/send")
    print(f"Body: {json.dumps(send_payload, indent=2)}")
    
    resp_send = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=send_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_send.status_code}")
    print(f"Response: {resp_send.text[:500]}")
    
    if resp_send.status_code != 200:
        log_test("Send message to new phone", False, f"Status {resp_send.status_code}: {resp_send.text[:200]}")
        return
    else:
        log_test("Send message to new phone", True, "Message sent")
    
    # Test 3b: Sync contact with full details
    print(f"\n3b. Sync contact for {phone_new}")
    sync_payload = {
        "name": "Jordan Lee",
        "email": "jordan@test.com",
        "company": "TestCorp",
        "notes": "VIP prospect"
    }
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_new}/sync-contact")
    print(f"Body: {json.dumps(sync_payload, indent=2)}")
    
    resp_sync = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_new}/sync-contact",
        json=sync_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_sync.status_code}")
    print(f"Response: {resp_sync.text[:1000]}")
    
    contact_id = None
    if resp_sync.status_code == 200:
        data_sync = resp_sync.json()
        contact = data_sync.get("contact", {})
        contact_id = contact.get("id")
        
        checks = [
            ("created", data_sync.get("created") == True),
            ("name", contact.get("name") == "Jordan Lee"),
            ("phone", contact.get("phone") == phone_new),
            ("email", contact.get("email") == "jordan@test.com"),
            ("company", contact.get("company") == "TestCorp"),
            ("tags_whatsapp", "whatsapp" in contact.get("tags", [])),
            ("tags_lead", "lead" in contact.get("tags", [])),
        ]
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("Sync contact (new)", True, f"Contact created with ID {contact_id}")
        else:
            log_test("Sync contact (new)", False, f"Failed checks: {failed}, contact: {contact}")
    else:
        log_test("Sync contact (new)", False, f"Status {resp_sync.status_code}: {resp_sync.text[:200]}")
        return
    
    # Test 3c: Verify contact in contacts list
    print(f"\n3c. Verify contact in GET /api/contacts")
    resp_contacts = requests.get(
        f"{BASE_URL}/contacts",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_contacts.status_code}")
    print(f"Response: {resp_contacts.text[:1000]}")
    
    if resp_contacts.status_code == 200:
        contacts = resp_contacts.json()
        contact = next((c for c in contacts if c.get("phone") == phone_new), None)
        if contact:
            tags = contact.get("tags", [])
            if "lead" in tags and "whatsapp" in tags:
                log_test("Verify contact in list", True, f"Contact found with tags: {tags}")
            else:
                log_test("Verify contact in list", False, f"Tags missing: {tags}")
        else:
            log_test("Verify contact in list", False, f"Contact not found for {phone_new}")
    else:
        log_test("Verify contact in list", False, f"Status {resp_contacts.status_code}: {resp_contacts.text[:200]}")
    
    # Test 3d: Verify message backfill
    print(f"\n3d. Verify message backfill (contact_id populated)")
    resp_messages = requests.get(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_new}/messages",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_messages.status_code}")
    print(f"Response: {resp_messages.text[:1000]}")
    
    if resp_messages.status_code == 200:
        messages = resp_messages.json()
        if isinstance(messages, list) and len(messages) > 0:
            msg = messages[0]
            if msg.get("contact_id") == contact_id:
                log_test("Verify message backfill", True, f"Message has contact_id: {contact_id}")
            else:
                log_test("Verify message backfill", False, f"Message contact_id mismatch: {msg.get('contact_id')} != {contact_id}")
        else:
            log_test("Verify message backfill", False, "No messages found")
    else:
        log_test("Verify message backfill", False, f"Status {resp_messages.status_code}: {resp_messages.text[:200]}")
    
    # Test 3e: Update existing contact
    print(f"\n3e. Update existing contact")
    update_payload = {"email": "jordan2@test.com"}
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_new}/sync-contact")
    print(f"Body: {json.dumps(update_payload, indent=2)}")
    
    resp_update = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_new}/sync-contact",
        json=update_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_update.status_code}")
    print(f"Response: {resp_update.text[:1000]}")
    
    if resp_update.status_code == 200:
        data_update = resp_update.json()
        contact_updated = data_update.get("contact", {})
        
        checks = [
            ("created", data_update.get("created") == False),
            ("email", contact_updated.get("email") == "jordan2@test.com"),
            ("name", contact_updated.get("name") == "Jordan Lee"),  # Name unchanged
            ("tags_whatsapp", "whatsapp" in contact_updated.get("tags", [])),
            ("tags_lead", "lead" in contact_updated.get("tags", [])),
        ]
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("Update existing contact", True, "Contact updated")
        else:
            log_test("Update existing contact", False, f"Failed checks: {failed}, contact: {contact_updated}")
    else:
        log_test("Update existing contact", False, f"Status {resp_update.status_code}: {resp_update.text[:200]}")
    
    # Test 3f: Auto-default name when no name provided
    phone_auto = "+15550000100"
    encoded_phone_auto = quote(phone_auto, safe='')
    
    print(f"\n3f. Auto-default name for {phone_auto}")
    
    # Send message first
    send_payload2 = {"to": phone_auto, "body": "test"}
    resp_send2 = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=send_payload2,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Send message status: {resp_send2.status_code}")
    
    # Sync with empty body
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_auto}/sync-contact")
    print(f"Body: {{}}")
    
    resp_auto_name = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_auto}/sync-contact",
        json={},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_auto_name.status_code}")
    print(f"Response: {resp_auto_name.text[:1000]}")
    
    if resp_auto_name.status_code == 200:
        data_auto = resp_auto_name.json()
        contact_auto = data_auto.get("contact", {})
        name = contact_auto.get("name", "")
        
        if data_auto.get("created") == True and name.startswith("WhatsApp lead") and name.endswith("0100"):
            log_test("Auto-default name", True, f"Name: {name}")
        else:
            log_test("Auto-default name", False, f"Unexpected name: {name}, created: {data_auto.get('created')}")
    else:
        log_test("Auto-default name", False, f"Status {resp_auto_name.status_code}: {resp_auto_name.text[:200]}")

def test_create_ticket(phone1):
    """Test 4: Create ticket from WhatsApp thread"""
    print(f"\n{'='*60}")
    print("TEST 4: Create Ticket from WhatsApp Thread")
    print('='*60)
    
    # Ensure User A is online for auto-assign
    print(f"\n4a. Ensure User A is online")
    resp_online = requests.post(
        f"{BASE_URL}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_online.status_code}")
    
    # Test 4b: Create ticket from seeded phone (has messages and contact)
    print(f"\n4b. Create ticket from {phone1}")
    encoded_phone1 = quote(phone1, safe='')
    
    ticket_payload = {
        "subject": "Billing question from WhatsApp",
        "priority": "high",
        "include_last_messages": 5
    }
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone1}/create-ticket")
    print(f"Body: {json.dumps(ticket_payload, indent=2)}")
    
    resp_ticket = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone1}/create-ticket",
        json=ticket_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_ticket.status_code}")
    print(f"Response: {resp_ticket.text[:2000]}")
    
    ticket_id = None
    if resp_ticket.status_code == 200:
        data_ticket = resp_ticket.json()
        ticket = data_ticket.get("ticket", {})
        ticket_id = ticket.get("id")
        
        checks = [
            ("ok", data_ticket.get("ok") == True),
            ("subject", ticket.get("subject") == "Billing question from WhatsApp"),
            ("channel", ticket.get("channel") == "whatsapp"),
            ("priority", ticket.get("priority") == "high"),
            ("contact_id", bool(ticket.get("contact_id"))),
            ("whatsapp_phone", ticket.get("custom", {}).get("whatsapp_phone") == phone1),
            ("description_has_conversation", "WhatsApp conversation" in ticket.get("description", "")),
        ]
        all_passed = all(check[1] for check in checks)
        failed = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("Create ticket from seeded phone", True, f"Ticket ID: {ticket_id}")
        else:
            log_test("Create ticket from seeded phone", False, f"Failed checks: {failed}, ticket: {ticket}")
    else:
        log_test("Create ticket from seeded phone", False, f"Status {resp_ticket.status_code}: {resp_ticket.text[:200]}")
    
    # Test 4c: Verify ticket in tickets list
    print(f"\n4c. Verify ticket in GET /api/tickets")
    resp_tickets = requests.get(
        f"{BASE_URL}/tickets",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_tickets.status_code}")
    print(f"Response: {resp_tickets.text[:1000]}")
    
    if resp_tickets.status_code == 200:
        tickets = resp_tickets.json()
        ticket = next((t for t in tickets if t.get("id") == ticket_id), None)
        if ticket:
            log_test("Verify ticket in list", True, f"Ticket found: {ticket.get('subject')}")
        else:
            log_test("Verify ticket in list", False, f"Ticket {ticket_id} not found")
    else:
        log_test("Verify ticket in list", False, f"Status {resp_tickets.status_code}: {resp_tickets.text[:200]}")
    
    # Test 4d: No-contact path (auto-create contact)
    phone_new2 = "+15550007777"
    encoded_phone_new2 = quote(phone_new2, safe='')
    
    print(f"\n4d. Create ticket for {phone_new2} (no contact, auto-create)")
    
    # Send message first
    send_payload = {"to": phone_new2, "body": "help"}
    resp_send = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=send_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Send message status: {resp_send.status_code}")
    
    ticket_payload2 = {
        "subject": "New request",
        "priority": "medium",
        "include_last_messages": 3
    }
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_new2}/create-ticket")
    print(f"Body: {json.dumps(ticket_payload2, indent=2)}")
    
    resp_ticket2 = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_new2}/create-ticket",
        json=ticket_payload2,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_ticket2.status_code}")
    print(f"Response: {resp_ticket2.text[:2000]}")
    
    if resp_ticket2.status_code == 200:
        data_ticket2 = resp_ticket2.json()
        ticket2 = data_ticket2.get("ticket", {})
        contact_id2 = ticket2.get("contact_id")
        
        if contact_id2:
            log_test("Create ticket (no contact, auto-create)", True, f"Ticket created with contact_id: {contact_id2}")
            
            # Verify contact was created
            print(f"\n  Verify contact was auto-created")
            resp_contacts = requests.get(
                f"{BASE_URL}/contacts",
                headers={"Authorization": f"Bearer {token_a}"}
            )
            if resp_contacts.status_code == 200:
                contacts = resp_contacts.json()
                contact = next((c for c in contacts if c.get("phone") == phone_new2), None)
                if contact and "lead" in contact.get("tags", []):
                    log_test("Verify auto-created contact", True, f"Contact found with tag 'lead'")
                else:
                    log_test("Verify auto-created contact", False, f"Contact not found or missing 'lead' tag")
            else:
                log_test("Verify auto-created contact", False, f"Status {resp_contacts.status_code}")
        else:
            log_test("Create ticket (no contact, auto-create)", False, f"No contact_id in ticket: {ticket2}")
    else:
        log_test("Create ticket (no contact, auto-create)", False, f"Status {resp_ticket2.status_code}: {resp_ticket2.text[:200]}")
    
    # Test 4e: Extra description
    phone_extra = "+15550008888"
    encoded_phone_extra = quote(phone_extra, safe='')
    
    print(f"\n4e. Create ticket with extra description")
    
    # Send message first
    send_payload3 = {"to": phone_extra, "body": "urgent"}
    resp_send3 = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=send_payload3,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Send message status: {resp_send3.status_code}")
    
    ticket_payload3 = {
        "subject": "Urgent request",
        "description": "Customer is urgent",
        "priority": "urgent",
        "include_last_messages": 2
    }
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_extra}/create-ticket")
    print(f"Body: {json.dumps(ticket_payload3, indent=2)}")
    
    resp_ticket3 = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_extra}/create-ticket",
        json=ticket_payload3,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_ticket3.status_code}")
    print(f"Response: {resp_ticket3.text[:2000]}")
    
    if resp_ticket3.status_code == 200:
        data_ticket3 = resp_ticket3.json()
        ticket3 = data_ticket3.get("ticket", {})
        desc = ticket3.get("description", "")
        
        if desc.startswith("Customer is urgent") and "--- WhatsApp conversation ---" in desc:
            log_test("Create ticket with extra description", True, "Description has custom text + conversation")
        else:
            log_test("Create ticket with extra description", False, f"Description format wrong: {desc[:200]}")
    else:
        log_test("Create ticket with extra description", False, f"Status {resp_ticket3.status_code}: {resp_ticket3.text[:200]}")
    
    # Test 4f: include_last_messages=0
    phone_zero = "+15550009999"
    encoded_phone_zero = quote(phone_zero, safe='')
    
    print(f"\n4f. Create ticket with include_last_messages=0")
    
    # Send message first
    send_payload4 = {"to": phone_zero, "body": "test"}
    resp_send4 = requests.post(
        f"{BASE_URL}/whatsapp/send",
        json=send_payload4,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"  Send message status: {resp_send4.status_code}")
    
    ticket_payload4 = {
        "subject": "No messages",
        "priority": "low",
        "include_last_messages": 0
    }
    print(f"POST {BASE_URL}/whatsapp/conversations/{encoded_phone_zero}/create-ticket")
    print(f"Body: {json.dumps(ticket_payload4, indent=2)}")
    
    resp_ticket4 = requests.post(
        f"{BASE_URL}/whatsapp/conversations/{encoded_phone_zero}/create-ticket",
        json=ticket_payload4,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    print(f"Status: {resp_ticket4.status_code}")
    print(f"Response: {resp_ticket4.text[:2000]}")
    
    if resp_ticket4.status_code == 200:
        data_ticket4 = resp_ticket4.json()
        ticket4 = data_ticket4.get("ticket", {})
        desc = ticket4.get("description", "")
        
        if desc == "":
            log_test("Create ticket (include_last_messages=0)", True, "Description is empty")
        else:
            log_test("Create ticket (include_last_messages=0)", False, f"Description not empty: {desc}")
    else:
        log_test("Create ticket (include_last_messages=0)", False, f"Status {resp_ticket4.status_code}: {resp_ticket4.text[:200]}")

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
    print("WhatsApp New Features Backend API Tests")
    print("="*60)
    
    # Setup: Register two users
    if not register_two_users():
        print("\n❌ Cannot proceed without user registration")
        exit(1)
    
    # Test 1: Presence heartbeat + online users list
    test_presence_heartbeat()
    
    # Test 2: WhatsApp chat assignment (manual + auto)
    phone1 = test_chat_assignment()
    
    # Test 3: Sync WhatsApp chat to Contact (lead)
    test_sync_contact(phone1)
    
    # Test 4: Create ticket from WhatsApp thread
    test_create_ticket(phone1)
    
    # Print summary
    all_passed = print_summary()
    
    exit(0 if all_passed else 1)
