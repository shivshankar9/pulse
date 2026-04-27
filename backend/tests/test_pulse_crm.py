"""Pulse CRM backend tests - auth, contacts, deals, activities, emails, dashboard, AI."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def auth():
    """Register a fresh user and return token + headers."""
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@pulse.io"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "Test User"}, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == email
    assert "_id" not in data["user"]
    s.headers.update({"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"})
    return {"session": s, "email": email, "token": data["token"], "user": data["user"]}


# ---------- Auth ----------
class TestAuth:
    def test_register_duplicate(self, auth):
        r = requests.post(f"{API}/auth/register", json={"email": auth["email"], "password": "secret123", "name": "x"}, timeout=15)
        assert r.status_code == 400

    def test_login_demo(self):
        r = requests.post(f"{API}/auth/login", json={"email": "demo@pulse.io", "password": "demo1234"}, timeout=15)
        assert r.status_code == 200, r.text
        assert "token" in r.json()

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "demo@pulse.io", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, auth):
        r = auth["session"].get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == auth["email"]
        assert "_id" not in r.json()

    def test_protected_no_token(self):
        r = requests.get(f"{API}/contacts", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Contacts ----------
class TestContacts:
    def test_crud(self, auth):
        s = auth["session"]
        payload = {"name": "TEST_Acme CEO", "email": "ceo@acme.io", "company": "Acme", "title": "CEO", "status": "lead", "notes": "From webinar"}
        r = s.post(f"{API}/contacts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json()
        assert "_id" not in c and c["owner_id"] == auth["user"]["id"]
        cid = c["id"]
        pytest.contact_id = cid

        r = s.get(f"{API}/contacts", timeout=15)
        assert r.status_code == 200 and any(x["id"] == cid for x in r.json())

        r = s.put(f"{API}/contacts/{cid}", json={**payload, "title": "Founder"}, timeout=15)
        assert r.status_code == 200 and r.json()["title"] == "Founder"

        r = s.get(f"{API}/contacts/{cid}", timeout=15)
        assert r.status_code == 200 and r.json()["title"] == "Founder"


# ---------- Deals ----------
class TestDeals:
    def test_crud_and_stage(self, auth):
        s = auth["session"]
        r = s.post(f"{API}/deals", json={"title": "TEST_Deal Acme", "value": 10000, "stage": "lead", "company": "Acme"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        did = d["id"]
        pytest.deal_id = did

        r = s.get(f"{API}/deals", timeout=15)
        assert r.status_code == 200 and any(x["id"] == did for x in r.json())

        r = s.patch(f"{API}/deals/{did}/stage", json={"stage": "qualified"}, timeout=15)
        assert r.status_code == 200 and r.json()["stage"] == "qualified"

        r = s.put(f"{API}/deals/{did}", json={"title": "TEST_Deal Acme v2", "value": 12000, "stage": "proposal", "company": "Acme"}, timeout=15)
        assert r.status_code == 200 and r.json()["value"] == 12000


# ---------- Activities ----------
class TestActivities:
    def test_crud_and_complete(self, auth):
        s = auth["session"]
        r = s.post(f"{API}/activities", json={"title": "TEST_Call CEO", "type": "call"}, timeout=15)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        r = s.put(f"{API}/activities/{aid}", json={"title": "TEST_Call CEO", "type": "call", "completed": True}, timeout=15)
        assert r.status_code == 200 and r.json()["completed"] is True
        r = s.get(f"{API}/activities", timeout=15)
        assert r.status_code == 200 and any(x["id"] == aid for x in r.json())


# ---------- Emails ----------
class TestEmails:
    def test_log_and_list(self, auth):
        s = auth["session"]
        r = s.post(f"{API}/emails", json={"to": "lead@acme.io", "subject": "TEST_Hi", "body": "hello"}, timeout=15)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        r = s.get(f"{API}/emails", timeout=15)
        assert r.status_code == 200 and any(x["id"] == eid for x in r.json())


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats(self, auth):
        r = auth["session"].get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("contacts_count", "pipeline_value", "won_value", "by_stage"):
            assert k in d
        for s in ("lead", "qualified", "proposal", "negotiation", "won", "lost"):
            assert s in d["by_stage"]


# ---------- AI ----------
class TestAI:
    def test_lead_score(self, auth):
        cid = getattr(pytest, "contact_id", None)
        assert cid, "contact_id missing"
        r = auth["session"].post(f"{API}/ai/lead-score", json={"contact_id": cid}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert 0 <= int(d["score"]) <= 100
        # verify persistence
        c = auth["session"].get(f"{API}/contacts/{cid}", timeout=15).json()
        assert c["score"] == d["score"]

    def test_draft_email(self, auth):
        r = auth["session"].post(f"{API}/ai/draft-email", json={"intent": "follow up after demo", "tone": "professional"}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("subject") and d.get("body")

    def test_summarize(self, auth):
        r = auth["session"].post(f"{API}/ai/summarize", json={"text": "Met with John from Acme. They need pricing for 50 seats. Decision in 2 weeks."}, timeout=90)
        assert r.status_code == 200 and r.json().get("summary")

    def test_next_best_action(self, auth):
        r = auth["session"].post(f"{API}/ai/next-best-action", json={}, timeout=90)
        assert r.status_code == 200 and r.json().get("recommendation")
