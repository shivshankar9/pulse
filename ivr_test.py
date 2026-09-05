#!/usr/bin/env python3
"""
Comprehensive backend test suite for Self-hosted IVR system
Tests all IVR endpoints including flows, queues, campaigns, simulator, and analytics
"""
import requests
import time
import json
from typing import Optional

BASE_URL = "http://localhost:8001/api"

# Test state
admin_token = None
admin_user = None
test_flow_id = None
test_queue_id = None
test_campaign_id = None
test_contact_id = None
test_call_id = None

def log_test(name: str, passed: bool, details: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    return passed

def register_admin():
    """Register admin user for testing"""
    global admin_token, admin_user
    payload = {
        "email": "admin@ivrtest.com",
        "password": "SecurePass123!",
        "name": "IVR Admin"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        admin_token = data.get("token")
        admin_user = data.get("user")
        return log_test("Register admin user", True, f"User ID: {admin_user.get('id')}")
    elif resp.status_code == 400 and "already exists" in resp.text.lower():
        # Try login instead
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={"email": payload["email"], "password": payload["password"]})
        if login_resp.status_code == 200:
            data = login_resp.json()
            admin_token = data.get("token")
            admin_user = data.get("user")
            return log_test("Login existing admin user", True, f"User ID: {admin_user.get('id')}")
    return log_test("Register/Login admin user", False, f"Status: {resp.status_code}, Response: {resp.text[:200]}")

def headers():
    """Get auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}

# ============ IVR Flow Tests ============

def test_seed_flow():
    """Test POST /api/voice/flows/seed - idempotent seed"""
    global test_flow_id
    
    # First seed
    resp = requests.post(f"{BASE_URL}/voice/flows/seed", headers=headers())
    if resp.status_code != 200:
        return log_test("Seed IVR flow (first call)", False, f"Status: {resp.status_code}, Response: {resp.text[:200]}")
    
    data = resp.json()
    if not data.get("created"):
        return log_test("Seed IVR flow (first call)", False, "Expected created=True on first seed")
    
    flow = data.get("flow")
    if not flow:
        return log_test("Seed IVR flow (first call)", False, "No flow returned")
    
    test_flow_id = flow.get("id")
    
    # Verify flow structure
    if flow.get("name") != "Main line starter":
        return log_test("Seed IVR flow (first call)", False, f"Expected name 'Main line starter', got '{flow.get('name')}'")
    
    nodes = flow.get("nodes", [])
    if len(nodes) != 5:
        return log_test("Seed IVR flow (first call)", False, f"Expected 5 nodes, got {len(nodes)}")
    
    # Verify node types
    node_types = [n.get("type") for n in nodes]
    expected_types = ["greeting", "menu", "queue", "queue", "voicemail"]
    if node_types != expected_types:
        return log_test("Seed IVR flow (first call)", False, f"Expected node types {expected_types}, got {node_types}")
    
    # Verify greeting node
    greeting = nodes[0]
    if greeting.get("id") != "greeting" or "Thanks for calling" not in greeting.get("prompt", ""):
        return log_test("Seed IVR flow (first call)", False, "Greeting node incorrect")
    
    # Verify menu node
    menu = nodes[1]
    if menu.get("id") != "main-menu" or menu.get("type") != "menu":
        return log_test("Seed IVR flow (first call)", False, "Menu node incorrect")
    
    routes = menu.get("config", {}).get("routes", {})
    if routes.get("1") != "sales" or routes.get("2") != "support" or routes.get("0") != "voicemail":
        return log_test("Seed IVR flow (first call)", False, f"Menu routes incorrect: {routes}")
    
    log_test("Seed IVR flow (first call)", True, f"Flow ID: {test_flow_id}, 5 nodes created")
    
    # Second seed - should be idempotent
    resp2 = requests.post(f"{BASE_URL}/voice/flows/seed", headers=headers())
    if resp2.status_code != 200:
        return log_test("Seed IVR flow (idempotent)", False, f"Status: {resp2.status_code}")
    
    data2 = resp2.json()
    if data2.get("created") != False:
        return log_test("Seed IVR flow (idempotent)", False, "Expected created=False on second seed")
    
    return log_test("Seed IVR flow (idempotent)", True, "Second seed returned created=False")

def test_list_flows():
    """Test GET /api/voice/flows"""
    resp = requests.get(f"{BASE_URL}/voice/flows", headers=headers())
    if resp.status_code != 200:
        return log_test("List IVR flows", False, f"Status: {resp.status_code}")
    
    flows = resp.json()
    if not isinstance(flows, list):
        return log_test("List IVR flows", False, "Expected array response")
    
    if len(flows) == 0:
        return log_test("List IVR flows", False, "Expected at least 1 flow after seed")
    
    # Find our seeded flow
    seeded = next((f for f in flows if f.get("name") == "Main line starter"), None)
    if not seeded:
        return log_test("List IVR flows", False, "Seeded flow not found in list")
    
    return log_test("List IVR flows", True, f"Found {len(flows)} flow(s)")

def test_publish_flow():
    """Test PATCH /api/voice/flows/{id}/status - publish and ensure only one published"""
    global test_flow_id
    
    if not test_flow_id:
        return log_test("Publish IVR flow", False, "No flow ID available")
    
    # Publish the flow
    resp = requests.patch(f"{BASE_URL}/voice/flows/{test_flow_id}/status", 
                         json={"status": "published"}, 
                         headers=headers())
    if resp.status_code != 200:
        return log_test("Publish IVR flow", False, f"Status: {resp.status_code}, Response: {resp.text[:200]}")
    
    flow = resp.json()
    if flow.get("status") != "published":
        return log_test("Publish IVR flow", False, f"Expected status 'published', got '{flow.get('status')}'")
    
    if not flow.get("published_at"):
        return log_test("Publish IVR flow", False, "published_at not set")
    
    log_test("Publish IVR flow", True, f"Flow published at {flow.get('published_at')}")
    
    # Verify only one flow is published
    resp2 = requests.get(f"{BASE_URL}/voice/flows", headers=headers())
    if resp2.status_code != 200:
        return log_test("Verify single published flow", False, f"Status: {resp2.status_code}")
    
    flows = resp2.json()
    published_flows = [f for f in flows if f.get("status") == "published"]
    
    if len(published_flows) != 1:
        return log_test("Verify single published flow", False, f"Expected 1 published flow, found {len(published_flows)}")
    
    return log_test("Verify single published flow", True, "Only one flow is published")

# ============ Inbound Call Simulation Tests ============

def test_simulate_inbound():
    """Test POST /api/voice/simulate/inbound - create inbound call"""
    global test_call_id, test_flow_id
    
    if not test_flow_id:
        return log_test("Simulate inbound call", False, "No published flow available")
    
    payload = {
        "from_number": "+15551234567",
        "to_number": "main-line",
        "flow_id": test_flow_id
    }
    
    resp = requests.post(f"{BASE_URL}/voice/simulate/inbound", json=payload, headers=headers())
    if resp.status_code != 200:
        return log_test("Simulate inbound call", False, f"Status: {resp.status_code}, Response: {resp.text[:200]}")
    
    data = resp.json()
    call = data.get("call")
    node = data.get("node")
    mode = data.get("mode")
    
    if not call or not node:
        return log_test("Simulate inbound call", False, "Missing call or node in response")
    
    test_call_id = call.get("id")
    
    # Verify call properties
    if call.get("direction") != "inbound":
        return log_test("Simulate inbound call", False, f"Expected direction 'inbound', got '{call.get('direction')}'")
    
    if call.get("provider") != "self_hosted_simulator":
        return log_test("Simulate inbound call", False, f"Expected provider 'self_hosted_simulator', got '{call.get('provider')}'")
    
    if call.get("status") != "connected":
        return log_test("Simulate inbound call", False, f"Expected status 'connected', got '{call.get('status')}'")
    
    if call.get("from") != "+15551234567":
        return log_test("Simulate inbound call", False, f"Expected from '+15551234567', got '{call.get('from')}'")
    
    if mode != "self_hosted_simulator":
        return log_test("Simulate inbound call", False, f"Expected mode 'self_hosted_simulator', got '{mode}'")
    
    # Verify starting at greeting node
    if node.get("type") != "greeting":
        return log_test("Simulate inbound call", False, f"Expected first node type 'greeting', got '{node.get('type')}'")
    
    return log_test("Simulate inbound call", True, f"Call ID: {test_call_id}, started at greeting node")

def test_dtmf_routing_sessions():
    """Test DTMF routing with multiple sessions (digits 1, 2, 0)"""
    global test_flow_id
    
    # Create a custom flow that starts with a menu node for proper testing
    custom_flow_payload = {
        "name": "DTMF Test Flow",
        "description": "Flow for testing DTMF routing",
        "greeting": "Welcome to DTMF test",
        "nodes": [
            {
                "id": "menu",
                "type": "menu",
                "label": "Main menu",
                "prompt": "Press 1 for sales, 2 for support, or 0 for voicemail",
                "config": {
                    "routes": {
                        "1": "sales",
                        "2": "support",
                        "0": "voicemail"
                    }
                }
            },
            {
                "id": "sales",
                "type": "queue",
                "label": "Sales queue",
                "prompt": "Connecting to sales",
                "config": {"queue": "sales"}
            },
            {
                "id": "support",
                "type": "queue",
                "label": "Support queue",
                "prompt": "Connecting to support",
                "config": {"queue": "support"}
            },
            {
                "id": "voicemail",
                "type": "voicemail",
                "label": "Voicemail",
                "prompt": "Leave a message",
                "config": {"max_seconds": 120}
            }
        ]
    }
    
    resp_flow = requests.post(f"{BASE_URL}/voice/flows", json=custom_flow_payload, headers=headers())
    if resp_flow.status_code != 200:
        return log_test("DTMF routing (multiple sessions)", False, f"Could not create test flow: {resp_flow.status_code}")
    
    test_flow = resp_flow.json()
    test_flow_id_dtmf = test_flow.get("id")
    
    # Test each digit
    test_cases = [
        ("1", "sales", "Sales queue"),
        ("2", "support", "Support queue"),
        ("0", "voicemail", "Voicemail")
    ]
    
    test_results = []
    
    for digit, expected_node_id, expected_label in test_cases:
        # Create inbound call
        resp_call = requests.post(f"{BASE_URL}/voice/simulate/inbound", 
                                 json={"from_number": f"+1555000{digit}000", "flow_id": test_flow_id_dtmf}, 
                                 headers=headers())
        if resp_call.status_code != 200:
            test_results.append(f"❌ Digit {digit}: Could not create call")
            continue
        
        call_data = resp_call.json()
        call_id = call_data.get("call", {}).get("id")
        
        # Send DTMF input
        resp_input = requests.post(f"{BASE_URL}/voice/simulate/{call_id}/input", 
                                  json={"digits": digit}, 
                                  headers=headers())
        if resp_input.status_code != 200:
            test_results.append(f"❌ Digit {digit}: Input failed - {resp_input.status_code}")
            continue
        
        result = resp_input.json()
        if not result.get("ok"):
            test_results.append(f"❌ Digit {digit}: ok=False")
            continue
        
        next_node = result.get("node", {})
        if next_node.get("id") != expected_node_id:
            test_results.append(f"❌ Digit {digit}: Expected {expected_node_id}, got {next_node.get('id')}")
            continue
        
        test_results.append(f"✅ Digit {digit}: Routed to {expected_label}")
    
    all_passed = all("✅" in r for r in test_results)
    details = "\n   ".join(test_results)
    return log_test("DTMF routing (multiple sessions)", all_passed, f"\n   {details}")

def test_dtmf_invalid():
    """Test POST /api/voice/simulate/{call_id}/input - invalid digit returns ok=false"""
    global test_flow_id
    
    # Create a test flow with menu
    custom_flow_payload = {
        "name": "Invalid DTMF Test Flow",
        "nodes": [
            {
                "id": "menu",
                "type": "menu",
                "label": "Main menu",
                "prompt": "Press 1 or 2",
                "config": {
                    "routes": {
                        "1": "option1",
                        "2": "option2"
                    }
                }
            },
            {
                "id": "option1",
                "type": "hangup",
                "label": "Option 1",
                "prompt": "Goodbye"
            },
            {
                "id": "option2",
                "type": "hangup",
                "label": "Option 2",
                "prompt": "Goodbye"
            }
        ]
    }
    
    resp_flow = requests.post(f"{BASE_URL}/voice/flows", json=custom_flow_payload, headers=headers())
    if resp_flow.status_code != 200:
        return log_test("DTMF routing (invalid digit)", False, "Could not create test flow")
    
    test_flow_invalid = resp_flow.json()
    test_flow_id_invalid = test_flow_invalid.get("id")
    
    # Create inbound call
    resp_call = requests.post(f"{BASE_URL}/voice/simulate/inbound", 
                             json={"from_number": "+15559999999", "flow_id": test_flow_id_invalid}, 
                             headers=headers())
    if resp_call.status_code != 200:
        return log_test("DTMF routing (invalid digit)", False, "Could not create call")
    
    call_data = resp_call.json()
    call_id = call_data.get("call", {}).get("id")
    current_node_id = call_data.get("call", {}).get("current_node_id")
    
    # Send invalid digit (9)
    resp_input = requests.post(f"{BASE_URL}/voice/simulate/{call_id}/input", 
                              json={"digits": "9"}, 
                              headers=headers())
    if resp_input.status_code != 200:
        return log_test("DTMF routing (invalid digit)", False, f"Status: {resp_input.status_code}")
    
    result = resp_input.json()
    
    # Should return ok=false
    if result.get("ok") != False:
        return log_test("DTMF routing (invalid digit)", False, f"Expected ok=False, got {result.get('ok')}")
    
    # Should not mutate the route (current_node_id should remain the same)
    returned_call = result.get("call", {})
    if returned_call.get("current_node_id") != current_node_id:
        return log_test("DTMF routing (invalid digit)", False, "Route was mutated despite invalid digit")
    
    # Should have a message
    if not result.get("message"):
        return log_test("DTMF routing (invalid digit)", False, "No error message returned")
    
    return log_test("DTMF routing (invalid digit)", True, f"Correctly rejected invalid digit, message: '{result.get('message')}'")

# ============ Outbound Call Simulation Tests ============

def test_simulate_outbound():
    """Test POST /api/voice/simulate/outbound - create outbound call"""
    global test_contact_id
    
    # First create a contact
    contact_payload = {
        "name": "Outbound Test Contact",
        "phone": "+15551112222",
        "email": "outbound@test.com"
    }
    resp_contact = requests.post(f"{BASE_URL}/contacts", json=contact_payload, headers=headers())
    if resp_contact.status_code != 200:
        return log_test("Simulate outbound call", False, "Could not create contact")
    
    contact = resp_contact.json()
    test_contact_id = contact.get("id")
    
    # Create outbound call
    payload = {
        "to_number": "+15551112222",
        "contact_id": test_contact_id,
        "note": "Test outbound call"
    }
    
    resp = requests.post(f"{BASE_URL}/voice/simulate/outbound", json=payload, headers=headers())
    if resp.status_code != 200:
        return log_test("Simulate outbound call", False, f"Status: {resp.status_code}, Response: {resp.text[:200]}")
    
    data = resp.json()
    call = data.get("call")
    returned_contact = data.get("contact")
    mode = data.get("mode")
    
    if not call:
        return log_test("Simulate outbound call", False, "No call in response")
    
    # Verify call properties
    if call.get("direction") != "outbound":
        return log_test("Simulate outbound call", False, f"Expected direction 'outbound', got '{call.get('direction')}'")
    
    if call.get("provider") != "self_hosted_simulator":
        return log_test("Simulate outbound call", False, f"Expected provider 'self_hosted_simulator', got '{call.get('provider')}'")
    
    if call.get("status") != "ringing":
        return log_test("Simulate outbound call", False, f"Expected status 'ringing', got '{call.get('status')}'")
    
    if call.get("to") != "+15551112222":
        return log_test("Simulate outbound call", False, f"Expected to '+15551112222', got '{call.get('to')}'")
    
    if mode != "self_hosted_simulator":
        return log_test("Simulate outbound call", False, f"Expected mode 'self_hosted_simulator', got '{mode}'")
    
    return log_test("Simulate outbound call", True, f"Call ID: {call.get('id')}, status: ringing")

def test_call_status_transitions():
    """Test POST /api/voice/calls/{id}/status - status transitions with duration"""
    # Create a new outbound call for status testing
    payload = {
        "to_number": "+15553334444",
        "note": "Status transition test"
    }
    
    resp = requests.post(f"{BASE_URL}/voice/simulate/outbound", json=payload, headers=headers())
    if resp.status_code != 200:
        return log_test("Call status transitions", False, "Could not create call")
    
    call = resp.json().get("call")
    call_id = call.get("id")
    
    # Verify initial status is ringing
    if call.get("status") != "ringing":
        return log_test("Call status transitions", False, f"Initial status should be 'ringing', got '{call.get('status')}'")
    
    # Transition to connected
    resp_connected = requests.post(f"{BASE_URL}/voice/calls/{call_id}/status", 
                                  json={"status": "connected"}, 
                                  headers=headers())
    if resp_connected.status_code != 200:
        return log_test("Call status transitions", False, f"Could not transition to connected: {resp_connected.status_code}")
    
    call_connected = resp_connected.json()
    if call_connected.get("status") != "connected":
        return log_test("Call status transitions", False, f"Expected status 'connected', got '{call_connected.get('status')}'")
    
    # Transition to completed with duration
    resp_completed = requests.post(f"{BASE_URL}/voice/calls/{call_id}/status", 
                                  json={"status": "completed", "duration_seconds": 125, "disposition": "answered"}, 
                                  headers=headers())
    if resp_completed.status_code != 200:
        return log_test("Call status transitions", False, f"Could not transition to completed: {resp_completed.status_code}")
    
    call_completed = resp_completed.json()
    if call_completed.get("status") != "completed":
        return log_test("Call status transitions", False, f"Expected status 'completed', got '{call_completed.get('status')}'")
    
    if call_completed.get("duration_seconds") != 125:
        return log_test("Call status transitions", False, f"Expected duration 125, got {call_completed.get('duration_seconds')}")
    
    if call_completed.get("disposition") != "answered":
        return log_test("Call status transitions", False, f"Expected disposition 'answered', got '{call_completed.get('disposition')}'")
    
    if not call_completed.get("ended_at"):
        return log_test("Call status transitions", False, "ended_at not set on completed call")
    
    return log_test("Call status transitions", True, "ringing → connected → completed (125s)")

# ============ Queue CRUD Tests ============

def test_queue_crud():
    """Test queue CRUD operations"""
    global test_queue_id
    
    # Create queue
    queue_payload = {
        "name": "Test Sales Queue",
        "description": "Queue for testing",
        "strategy": "round_robin",
        "members": ["agent1", "agent2"],
        "max_wait_seconds": 300,
        "voicemail_enabled": True
    }
    
    resp_create = requests.post(f"{BASE_URL}/voice/queues", json=queue_payload, headers=headers())
    if resp_create.status_code != 200:
        return log_test("Queue CRUD (create)", False, f"Status: {resp_create.status_code}, Response: {resp_create.text[:200]}")
    
    queue = resp_create.json()
    test_queue_id = queue.get("id")
    
    if queue.get("name") != "Test Sales Queue":
        return log_test("Queue CRUD (create)", False, f"Expected name 'Test Sales Queue', got '{queue.get('name')}'")
    
    if queue.get("strategy") != "round_robin":
        return log_test("Queue CRUD (create)", False, f"Expected strategy 'round_robin', got '{queue.get('strategy')}'")
    
    log_test("Queue CRUD (create)", True, f"Queue ID: {test_queue_id}")
    
    # List queues
    resp_list = requests.get(f"{BASE_URL}/voice/queues", headers=headers())
    if resp_list.status_code != 200:
        return log_test("Queue CRUD (list)", False, f"Status: {resp_list.status_code}")
    
    queues = resp_list.json()
    if not isinstance(queues, list):
        return log_test("Queue CRUD (list)", False, "Expected array response")
    
    found = next((q for q in queues if q.get("id") == test_queue_id), None)
    if not found:
        return log_test("Queue CRUD (list)", False, "Created queue not found in list")
    
    log_test("Queue CRUD (list)", True, f"Found {len(queues)} queue(s)")
    
    # Update queue
    update_payload = {
        "name": "Updated Sales Queue",
        "description": "Updated description",
        "strategy": "longest_idle",
        "members": ["agent1", "agent2", "agent3"],
        "max_wait_seconds": 600,
        "voicemail_enabled": False
    }
    
    resp_update = requests.put(f"{BASE_URL}/voice/queues/{test_queue_id}", json=update_payload, headers=headers())
    if resp_update.status_code != 200:
        return log_test("Queue CRUD (update)", False, f"Status: {resp_update.status_code}")
    
    updated_queue = resp_update.json()
    if updated_queue.get("name") != "Updated Sales Queue":
        return log_test("Queue CRUD (update)", False, f"Name not updated")
    
    if updated_queue.get("strategy") != "longest_idle":
        return log_test("Queue CRUD (update)", False, f"Strategy not updated")
    
    if len(updated_queue.get("members", [])) != 3:
        return log_test("Queue CRUD (update)", False, f"Members not updated")
    
    log_test("Queue CRUD (update)", True, "Queue updated successfully")
    
    # Delete queue
    resp_delete = requests.delete(f"{BASE_URL}/voice/queues/{test_queue_id}", headers=headers())
    if resp_delete.status_code != 200:
        return log_test("Queue CRUD (delete)", False, f"Status: {resp_delete.status_code}")
    
    result = resp_delete.json()
    if not result.get("ok"):
        return log_test("Queue CRUD (delete)", False, "Expected ok=True")
    
    # Verify deletion
    resp_verify = requests.get(f"{BASE_URL}/voice/queues", headers=headers())
    queues_after = resp_verify.json()
    found_after = next((q for q in queues_after if q.get("id") == test_queue_id), None)
    if found_after:
        return log_test("Queue CRUD (delete)", False, "Queue still exists after deletion")
    
    return log_test("Queue CRUD (delete)", True, "Queue deleted successfully")

# ============ Campaign Tests ============

def test_campaign_create_and_launch():
    """Test campaign creation and launch"""
    global test_campaign_id, test_contact_id, test_flow_id
    
    # Create a contact with phone number
    contact_payload = {
        "name": "Campaign Test Contact",
        "phone": "+15556667777",
        "email": "campaign@test.com"
    }
    resp_contact = requests.post(f"{BASE_URL}/contacts", json=contact_payload, headers=headers())
    if resp_contact.status_code != 200:
        return log_test("Campaign create and launch", False, "Could not create contact")
    
    contact = resp_contact.json()
    campaign_contact_id = contact.get("id")
    
    # Create campaign
    campaign_payload = {
        "name": "Test Campaign",
        "description": "Campaign for testing",
        "flow_id": test_flow_id,
        "caller_id": "main-line",
        "contact_ids": [campaign_contact_id],
        "max_attempts": 3,
        "retry_after_minutes": 60
    }
    
    resp_create = requests.post(f"{BASE_URL}/voice/campaigns", json=campaign_payload, headers=headers())
    if resp_create.status_code != 200:
        return log_test("Campaign create and launch", False, f"Create failed: {resp_create.status_code}, Response: {resp_create.text[:200]}")
    
    campaign = resp_create.json()
    test_campaign_id = campaign.get("id")
    
    if campaign.get("name") != "Test Campaign":
        return log_test("Campaign create and launch", False, f"Expected name 'Test Campaign', got '{campaign.get('name')}'")
    
    if campaign.get("status") != "draft":
        return log_test("Campaign create and launch", False, f"Expected status 'draft', got '{campaign.get('status')}'")
    
    log_test("Campaign create and launch", True, f"Campaign ID: {test_campaign_id}")
    
    # Launch campaign
    resp_launch = requests.post(f"{BASE_URL}/voice/campaigns/{test_campaign_id}/launch", headers=headers())
    if resp_launch.status_code != 200:
        return log_test("Campaign launch", False, f"Launch failed: {resp_launch.status_code}, Response: {resp_launch.text[:200]}")
    
    launch_result = resp_launch.json()
    if not launch_result.get("ok"):
        return log_test("Campaign launch", False, "Expected ok=True")
    
    if launch_result.get("queued") != 1:
        return log_test("Campaign launch", False, f"Expected 1 queued call, got {launch_result.get('queued')}")
    
    calls = launch_result.get("calls", [])
    if len(calls) != 1:
        return log_test("Campaign launch", False, f"Expected 1 call, got {len(calls)}")
    
    call = calls[0]
    
    # Verify call properties
    if call.get("campaign_id") != test_campaign_id:
        return log_test("Campaign launch", False, f"Call campaign_id mismatch")
    
    if call.get("provider") != "self_hosted_simulator":
        return log_test("Campaign launch", False, f"Expected provider 'self_hosted_simulator', got '{call.get('provider')}'")
    
    if call.get("status") != "queued":
        return log_test("Campaign launch", False, f"Expected status 'queued', got '{call.get('status')}'")
    
    if call.get("to") != "+15556667777":
        return log_test("Campaign launch", False, f"Expected to '+15556667777', got '{call.get('to')}'")
    
    return log_test("Campaign launch", True, f"Launched with 1 queued call (provider: self_hosted_simulator)")

# ============ Voice Overview Tests ============

def test_voice_overview():
    """Test GET /api/voice/overview - metrics"""
    resp = requests.get(f"{BASE_URL}/voice/overview", headers=headers())
    if resp.status_code != 200:
        return log_test("Voice overview", False, f"Status: {resp.status_code}")
    
    overview = resp.json()
    
    # Verify required fields
    required_fields = ["mode", "calls_total", "inbound", "outbound", "answer_rate", "active_flows", "queues", "campaigns"]
    missing = [f for f in required_fields if f not in overview]
    if missing:
        return log_test("Voice overview", False, f"Missing fields: {missing}")
    
    # Verify mode
    if overview.get("mode") != "self_hosted_simulator":
        return log_test("Voice overview", False, f"Expected mode 'self_hosted_simulator', got '{overview.get('mode')}'")
    
    # Verify counts are numbers
    if not isinstance(overview.get("calls_total"), int):
        return log_test("Voice overview", False, "calls_total should be integer")
    
    if not isinstance(overview.get("inbound"), int):
        return log_test("Voice overview", False, "inbound should be integer")
    
    if not isinstance(overview.get("outbound"), int):
        return log_test("Voice overview", False, "outbound should be integer")
    
    if not isinstance(overview.get("answer_rate"), (int, float)):
        return log_test("Voice overview", False, "answer_rate should be number")
    
    # Verify we have some calls from previous tests
    if overview.get("calls_total") == 0:
        return log_test("Voice overview", False, "Expected some calls from previous tests")
    
    # Verify inbound + outbound = total
    if overview.get("inbound") + overview.get("outbound") != overview.get("calls_total"):
        return log_test("Voice overview", False, f"Inbound ({overview.get('inbound')}) + Outbound ({overview.get('outbound')}) != Total ({overview.get('calls_total')})")
    
    # Verify configured counts
    if overview.get("active_flows") == 0:
        return log_test("Voice overview", False, "Expected at least 1 active flow")
    
    details = f"Mode: {overview.get('mode')}, Total calls: {overview.get('calls_total')}, Inbound: {overview.get('inbound')}, Outbound: {overview.get('outbound')}, Answer rate: {overview.get('answer_rate')}%, Active flows: {overview.get('active_flows')}, Queues: {overview.get('queues')}, Campaigns: {overview.get('campaigns')}"
    return log_test("Voice overview", True, details)

# ============ Main Test Runner ============

def run_all_tests():
    """Run all IVR tests"""
    print("\n" + "="*80)
    print("SELF-HOSTED IVR BACKEND TEST SUITE")
    print("="*80 + "\n")
    
    print("--- Authentication ---")
    if not register_admin():
        print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.\n")
        return
    
    print("\n--- IVR Flow Tests ---")
    test_seed_flow()
    test_list_flows()
    test_publish_flow()
    
    print("\n--- Inbound Call Simulation Tests ---")
    test_simulate_inbound()
    test_dtmf_routing_sessions()
    test_dtmf_invalid()
    
    print("\n--- Outbound Call Simulation Tests ---")
    test_simulate_outbound()
    test_call_status_transitions()
    
    print("\n--- Queue CRUD Tests ---")
    test_queue_crud()
    
    print("\n--- Campaign Tests ---")
    test_campaign_create_and_launch()
    
    print("\n--- Voice Overview Tests ---")
    test_voice_overview()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    run_all_tests()
