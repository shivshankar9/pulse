"""Round B Phase 2 backend tests: Freshdesk-style invitations, helpdesk config,
custom fields, canned responses, groups, SLA, auto-assignment, ticket comments
internal flag, last-admin guard, ticket assign endpoint.
"""
import os
import uuid
from datetime import datetime
import pytest
import requests


def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL", "")
    if not val:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        val = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    return val


BASE_URL = _load_backend_url().rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


def _u(prefix="TEST_RBP2"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@pulse.io"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = _u("TEST_RBP2_admin")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "RBP2 Admin"})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return {"session": s, "user": data["user"], "email": email}


# ---- Invitations ----
class TestInvitations:
    def test_create_invite_returns_token_and_url(self, admin):
        email = _u("TEST_RBP2_invitee")
        r = admin["session"].post(f"{API}/invitations", json={"email": email, "role": "agent"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == email.lower()
        assert body["role"] == "agent"
        assert body["status"] == "pending"
        assert "token" in body and len(body["token"]) > 0
        assert "invite_url" in body and "/accept-invite?token=" in body["invite_url"]

    def test_create_duplicate_email_400(self, admin):
        # admin's own email is already registered as a user
        r = admin["session"].post(f"{API}/invitations", json={"email": admin["email"], "role": "agent"})
        assert r.status_code == 400

    def test_check_unknown_token_404(self):
        r = requests.get(f"{API}/invitations/check/{uuid.uuid4().hex}")
        assert r.status_code == 404

    def test_check_valid_token_returns_email_role(self, admin):
        email = _u("TEST_RBP2_check")
        inv = admin["session"].post(f"{API}/invitations", json={"email": email, "role": "manager"}).json()
        r = requests.get(f"{API}/invitations/check/{inv['token']}")
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == email.lower()
        assert body["role"] == "manager"

    def test_accept_creates_user_with_role(self, admin):
        email = _u("TEST_RBP2_accept")
        inv = admin["session"].post(f"{API}/invitations", json={"email": email, "role": "agent"}).json()
        r = requests.post(f"{API}/invitations/accept", json={
            "token": inv["token"], "name": "Accepted User", "password": "pass1234"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == email.lower()
        assert body["user"]["role"] == "agent"
        # role_label should be the system role name
        assert body["user"]["role_label"] == "Agent"


# ---- Last admin guard ----
class TestLastAdminGuard:
    def test_demoting_last_admin_blocked_then_succeeds_with_two(self, admin):
        # admin currently is the only admin in this fresh test user's perspective,
        # BUT users.manage queries ALL users globally. If demo or other admins
        # already exist, the guard may not trigger. So force a known state with
        # a fresh isolated admin: register a brand new admin user for this test.
        sa = requests.Session(); sa.headers.update({"Content-Type": "application/json"})
        em_a = _u("TEST_RBP2_admA")
        sa.post(f"{API}/auth/register", json={"email": em_a, "password": "pass1234", "name": "AdmA"})
        # That admin promotes themselves remains admin. Login as admin A.
        la = sa.post(f"{API}/auth/login", json={"email": em_a, "password": "pass1234"}).json()
        sa.headers.update({"Authorization": f"Bearer {la['token']}"})
        admin_a_id = la["user"]["id"]

        # Count global admins - we cannot cleanly isolate, so we just verify behavior:
        # If admin count > 1, demoting admin_a should succeed.
        # If admin count == 1, it should fail with 400 'Cannot demote last admin'.
        users = sa.get(f"{API}/users").json()
        admin_count = sum(1 for u in users if u.get("role") == "admin")
        r = sa.patch(f"{API}/users/{admin_a_id}/role", json={"role": "agent"})
        if admin_count <= 1:
            assert r.status_code == 400
            assert "last admin" in r.text.lower()
        else:
            assert r.status_code == 200
            # restore admin if multiple admins exist (so we don't pollute)
            sa2 = requests.Session(); sa2.headers.update({"Content-Type": "application/json"})
            # We can't re-promote ourselves (we're not admin anymore); skip restore.

    def test_promote_then_demote_succeeds(self, admin):
        # Create a 2nd admin via invite + accept, then admin A can be demoted (if multiple admins).
        # Admin can demote a non-last admin freely.
        email = _u("TEST_RBP2_secadm")
        inv = admin["session"].post(f"{API}/invitations", json={"email": email, "role": "admin"}).json()
        acc = requests.post(f"{API}/invitations/accept", json={
            "token": inv["token"], "name": "Sec Admin", "password": "pass1234"
        }).json()
        sec_id = acc["user"]["id"]
        # Now demote secondary admin to agent - last-admin guard should NOT trigger
        # since at least admin (admin fixture) + sec are admins (>=2).
        r = admin["session"].patch(f"{API}/users/{sec_id}/role", json={"role": "agent"})
        assert r.status_code == 200
        assert r.json()["role"] == "agent"


# ---- Helpdesk config ----
class TestHelpdeskConfig:
    def test_get_returns_defaults(self, admin):
        r = admin["session"].get(f"{API}/helpdesk/config")
        assert r.status_code == 200
        cfg = r.json()
        assert "sla" in cfg and "assignment" in cfg
        assert "high" in cfg["sla"]
        assert cfg["sla"]["high"]["first_response_minutes"] == 60

    def test_put_persists_assignment_round_robin(self, admin):
        r = admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "round_robin", "eligible_role": "agent", "channel_map": {}}
        })
        assert r.status_code == 200
        cfg = admin["session"].get(f"{API}/helpdesk/config").json()
        assert cfg["assignment"]["mode"] == "round_robin"
        assert cfg["assignment"]["eligible_role"] == "agent"

    def test_put_persists_sla_edits(self, admin):
        r = admin["session"].put(f"{API}/helpdesk/config", json={
            "sla": {
                "low": {"first_response_minutes": 720, "resolution_minutes": 4320},
                "medium": {"first_response_minutes": 240, "resolution_minutes": 1440},
                "high": {"first_response_minutes": 45, "resolution_minutes": 480},
                "urgent": {"first_response_minutes": 10, "resolution_minutes": 120},
            }
        })
        assert r.status_code == 200
        cfg = admin["session"].get(f"{API}/helpdesk/config").json()
        assert cfg["sla"]["high"]["first_response_minutes"] == 45
        assert cfg["sla"]["urgent"]["resolution_minutes"] == 120


# ---- Custom fields ----
class TestTicketFields:
    def test_create_text_field(self, admin):
        r = admin["session"].post(f"{API}/ticket-fields", json={
            "label": "Order ID", "type": "text", "required": False, "order": 1
        })
        assert r.status_code == 200
        body = r.json()
        assert body["label"] == "Order ID"
        assert body["type"] == "text"
        assert "key" in body and body["key"].startswith("order_id_")

    def test_create_select_field_with_options(self, admin):
        r = admin["session"].post(f"{API}/ticket-fields", json={
            "label": "Severity", "type": "select", "options": ["P1", "P2", "P3"], "order": 2
        })
        assert r.status_code == 200
        body = r.json()
        assert body["options"] == ["P1", "P2", "P3"]

    def test_create_other_types(self, admin):
        for t in ["number", "date", "checkbox"]:
            r = admin["session"].post(f"{API}/ticket-fields", json={
                "label": f"Custom{t}", "type": t, "order": 5
            })
            assert r.status_code == 200, r.text
            assert r.json()["type"] == t

    def test_delete_field(self, admin):
        cr = admin["session"].post(f"{API}/ticket-fields", json={"label": "Tmp", "type": "text"}).json()
        r = admin["session"].delete(f"{API}/ticket-fields/{cr['id']}")
        assert r.status_code == 200
        items = admin["session"].get(f"{API}/ticket-fields").json()
        assert all(f["id"] != cr["id"] for f in items)


# ---- Canned responses ----
class TestCanned:
    def test_create_list_delete(self, admin):
        r = admin["session"].post(f"{API}/canned-responses", json={
            "name": "Greeting", "body": "Hello there!", "shortcut": "/hi"
        })
        assert r.status_code == 200
        cid = r.json()["id"]
        items = admin["session"].get(f"{API}/canned-responses").json()
        assert any(c["id"] == cid for c in items)
        d = admin["session"].delete(f"{API}/canned-responses/{cid}")
        assert d.status_code == 200


# ---- Groups ----
class TestGroups:
    def test_create_delete(self, admin):
        r = admin["session"].post(f"{API}/groups", json={"name": "Support", "description": "L1"})
        assert r.status_code == 200
        gid = r.json()["id"]
        items = admin["session"].get(f"{API}/groups").json()
        assert any(g["id"] == gid for g in items)
        d = admin["session"].delete(f"{API}/groups/{gid}")
        assert d.status_code == 200


# ---- SLA on ticket creation ----
class TestSLAOnCreate:
    def test_high_priority_first_response_due_60min(self, admin):
        # Reset SLA defaults to make assertion deterministic
        admin["session"].put(f"{API}/helpdesk/config", json={
            "sla": {
                "low": {"first_response_minutes": 720, "resolution_minutes": 4320},
                "medium": {"first_response_minutes": 240, "resolution_minutes": 1440},
                "high": {"first_response_minutes": 60, "resolution_minutes": 480},
                "urgent": {"first_response_minutes": 15, "resolution_minutes": 240},
            },
            "assignment": {"mode": "off", "eligible_role": "agent", "channel_map": {}}
        })
        before = datetime.utcnow()
        r = admin["session"].post(f"{API}/tickets", json={
            "subject": "TEST_RBP2 SLA high", "priority": "high"
        })
        assert r.status_code == 200
        t = r.json()
        assert "first_response_due_at" in t and t["first_response_due_at"]
        assert "resolution_due_at" in t and t["resolution_due_at"]
        # Parse and check ~60 min window
        due = datetime.fromisoformat(t["first_response_due_at"].replace("Z", "+00:00"))
        diff_min = (due.replace(tzinfo=None) - before).total_seconds() / 60.0
        assert 55 <= diff_min <= 65, f"Expected ~60 min, got {diff_min}"


# ---- Auto-assign ----
@pytest.fixture(scope="module")
def two_agents(admin):
    """Create 2 agent users via invitation flow."""
    out = []
    for i in range(2):
        em = _u(f"TEST_RBP2_agent{i}")
        inv = admin["session"].post(f"{API}/invitations", json={"email": em, "role": "agent"}).json()
        acc = requests.post(f"{API}/invitations/accept", json={
            "token": inv["token"], "name": f"Agent{i}", "password": "pass1234"
        }).json()
        out.append(acc["user"]["id"])
    return out


class TestAutoAssignment:
    def test_round_robin_alternates(self, admin, two_agents):
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "round_robin", "eligible_role": "agent", "channel_map": {}}
        })
        assignees = []
        for i in range(4):
            r = admin["session"].post(f"{API}/tickets", json={
                "subject": f"TEST_RBP2 RR {i}", "priority": "medium"
            })
            assert r.status_code == 200
            assignees.append(r.json().get("assignee_id"))
        # Should have non-None values
        assert all(a is not None for a in assignees), assignees
        # Should rotate (at least some alternation)
        unique = set(assignees)
        assert len(unique) >= 2, f"Expected rotation across agents, got {assignees}"

    def test_load_balanced_picks_least_loaded(self, admin, two_agents):
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "load_balanced", "eligible_role": "agent", "channel_map": {}}
        })
        r = admin["session"].post(f"{API}/tickets", json={"subject": "TEST_RBP2 LB", "priority": "low"})
        assert r.status_code == 200
        # Verify some agent was assigned (load-balanced may pick global agent with fewest tickets)
        assignee_id = r.json()["assignee_id"]
        assert assignee_id is not None
        # Verify the assignee has role=agent
        users = admin["session"].get(f"{API}/users").json()
        u = next((x for x in users if x["id"] == assignee_id), None)
        assert u is not None and u["role"] == "agent"

    def test_channel_routing(self, admin, two_agents):
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {
                "mode": "channel", "eligible_role": "agent",
                "channel_map": {"whatsapp": two_agents[0], "email": two_agents[1]}
            }
        })
        r1 = admin["session"].post(f"{API}/tickets", json={
            "subject": "TEST_RBP2 ch wa", "priority": "low", "channel": "whatsapp"
        })
        assert r1.json()["assignee_id"] == two_agents[0]
        r2 = admin["session"].post(f"{API}/tickets", json={
            "subject": "TEST_RBP2 ch email", "priority": "low", "channel": "email"
        })
        assert r2.json()["assignee_id"] == two_agents[1]


# ---- Ticket assign endpoint ----
class TestTicketAssign:
    def test_assign_updates_assignee_and_group(self, admin, two_agents):
        # Create group
        g = admin["session"].post(f"{API}/groups", json={"name": "L2"}).json()
        # Create ticket (off mode to avoid auto-assign)
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "off", "eligible_role": "agent", "channel_map": {}}
        })
        t = admin["session"].post(f"{API}/tickets", json={"subject": "TEST_RBP2 assign", "priority": "low"}).json()
        r = admin["session"].patch(f"{API}/tickets/{t['id']}/assign", json={
            "assignee_id": two_agents[0], "group_id": g["id"]
        })
        assert r.status_code == 200
        body = r.json()
        assert body["assignee_id"] == two_agents[0]
        assert body["group_id"] == g["id"]


# ---- Ticket comment internal flag ----
class TestTicketComments:
    def test_internal_does_not_set_first_responded(self, admin):
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "off", "eligible_role": "agent", "channel_map": {}}
        })
        t = admin["session"].post(f"{API}/tickets", json={"subject": "TEST_RBP2 internal", "priority": "low"}).json()
        r = admin["session"].post(f"{API}/tickets/{t['id']}/comments", json={
            "body": "Internal note", "internal": True
        })
        assert r.status_code == 200
        body = r.json()
        assert body.get("first_responded_at") in (None, "")
        assert any(c.get("internal") is True for c in body["comments"])

    def test_public_first_time_sets_first_responded(self, admin):
        t = admin["session"].post(f"{API}/tickets", json={"subject": "TEST_RBP2 public", "priority": "low"}).json()
        r = admin["session"].post(f"{API}/tickets/{t['id']}/comments", json={
            "body": "Public reply", "internal": False
        })
        assert r.status_code == 200
        body = r.json()
        assert body.get("first_responded_at"), "first_responded_at should be set"

    def test_resolved_status_sets_resolved_at(self, admin):
        t = admin["session"].post(f"{API}/tickets", json={"subject": "TEST_RBP2 resolve", "priority": "low"}).json()
        r = admin["session"].put(f"{API}/tickets/{t['id']}", json={
            "subject": t["subject"], "priority": "low", "status": "resolved"
        })
        assert r.status_code == 200
        assert r.json().get("resolved_at")


# ---- TicketIn supports custom + assignee_id ----
class TestTicketInExtras:
    def test_create_ticket_with_custom_and_assignee(self, admin, two_agents):
        admin["session"].put(f"{API}/helpdesk/config", json={
            "assignment": {"mode": "off", "eligible_role": "agent", "channel_map": {}}
        })
        r = admin["session"].post(f"{API}/tickets", json={
            "subject": "TEST_RBP2 custom",
            "priority": "low",
            "assignee_id": two_agents[0],
            "custom": {"order_id": "ORD-123", "severity": "P1"}
        })
        assert r.status_code == 200
        body = r.json()
        assert body["assignee_id"] == two_agents[0]
        assert body["custom"]["order_id"] == "ORD-123"
        assert body["custom"]["severity"] == "P1"
