"""Round A backend tests: CSV import, saved views, tickets+channels+public portal, AI deal-insight."""
import os
import io
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@pulse.io"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "Round A Tester"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"})
    return {"session": s, "email": email, "user": data["user"], "token": data["token"]}


# ---------- CSV import ----------
class TestCSVImport:
    def test_import_csv(self, auth):
        s = auth["session"]
        # multipart upload requires no Content-Type=json; use a fresh request
        csv_text = (
            "name,email,company,title,status,source,tags,notes\n"
            "TEST_CSV Alice,alice@acme.io,Acme,CEO,qualified,webinar,\"vip,enterprise\",Hot lead\n"
            "TEST_CSV Bob,bob@beta.io,Beta,CTO,lead,referral,smb,From Slack\n"
            ",noemail@x.io,X,,,,,missing name row\n"
        )
        files = {"file": ("contacts.csv", csv_text, "text/csv")}
        headers = {"Authorization": s.headers["Authorization"]}
        r = requests.post(f"{API}/contacts/import", files=files, headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["created"] == 2
        assert any("missing name" in e.lower() for e in body["errors"])

        # verify persistence
        r = s.get(f"{API}/contacts", timeout=15)
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "TEST_CSV Alice" in names and "TEST_CSV Bob" in names

    def test_import_rejects_non_csv(self, auth):
        s = auth["session"]
        files = {"file": ("c.txt", "hello", "text/plain")}
        headers = {"Authorization": s.headers["Authorization"]}
        r = requests.post(f"{API}/contacts/import", files=files, headers=headers, timeout=15)
        assert r.status_code == 400


# ---------- Saved views ----------
class TestViews:
    def test_view_crud(self, auth):
        s = auth["session"]
        r = s.post(f"{API}/views", json={"name": "TEST_VIP qualified", "entity": "contacts", "filters": {"status": "qualified"}}, timeout=15)
        assert r.status_code == 200, r.text
        v = r.json()
        assert v["name"] == "TEST_VIP qualified" and "_id" not in v
        vid = v["id"]

        r = s.get(f"{API}/views", timeout=15)
        assert r.status_code == 200 and any(x["id"] == vid for x in r.json())

        r = s.delete(f"{API}/views/{vid}", timeout=15)
        assert r.status_code == 200 and r.json().get("ok") is True

        # verify removed
        r = s.get(f"{API}/views", timeout=15)
        assert all(x["id"] != vid for x in r.json())


# ---------- Tickets ----------
class TestTickets:
    def test_ticket_full_lifecycle(self, auth):
        s = auth["session"]
        # create with channel=email (non-default)
        r = s.post(f"{API}/tickets", json={
            "subject": "TEST_Login broken", "description": "Cannot login on Safari",
            "priority": "high", "channel": "email"
        }, timeout=15)
        assert r.status_code == 200, r.text
        t = r.json()
        assert "_id" not in t and t["channel"] == "email" and t["priority"] == "high" and t["status"] == "open"
        tid = t["id"]

        # update status + priority + channel
        r = s.put(f"{API}/tickets/{tid}", json={
            "subject": "TEST_Login broken", "description": "Cannot login on Safari",
            "status": "pending", "priority": "urgent", "channel": "whatsapp"
        }, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["status"] == "pending" and u["priority"] == "urgent" and u["channel"] == "whatsapp"

        # add comment
        r = s.post(f"{API}/tickets/{tid}/comments", json={"body": "Investigating"}, timeout=15)
        assert r.status_code == 200, r.text
        tk = r.json()
        assert any(c["body"] == "Investigating" and c["author"] == auth["user"]["name"] for c in tk["comments"])

        # GET list contains this ticket
        r = s.get(f"{API}/tickets", timeout=15)
        assert r.status_code == 200 and any(x["id"] == tid for x in r.json())

        # cleanup
        r = s.delete(f"{API}/tickets/{tid}", timeout=15)
        assert r.status_code == 200

    def test_unknown_ticket_404(self, auth):
        s = auth["session"]
        r = s.put(f"{API}/tickets/does-not-exist", json={"subject": "x"}, timeout=10)
        assert r.status_code in (404, 422)  # 422 if validation; should be 404 since payload valid? subject is required only
        r2 = s.post(f"{API}/tickets/does-not-exist/comments", json={"body": "hi"}, timeout=10)
        assert r2.status_code == 404


# ---------- Public portal ----------
class TestPublicTicket:
    def test_public_ticket_routes_to_operator(self, auth):
        # NOTE: no auth header here
        payload = {
            "workspace_email": auth["email"],
            "subject": "TEST_Portal submission",
            "description": "From the public portal",
            "requester_name": "Jane External",
            "requester_email": "jane@external.io",
        }
        r = requests.post(f"{API}/public/tickets", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True and body.get("ticket_id")

        # operator now sees it
        s = auth["session"]
        r = s.get(f"{API}/tickets", timeout=15)
        assert r.status_code == 200
        match = [t for t in r.json() if t["id"] == body["ticket_id"]]
        assert match, "public ticket missing from operator list"
        assert match[0]["channel"] == "portal"
        assert match[0].get("requester_email") == "jane@external.io"

    def test_public_ticket_unknown_workspace_404(self):
        r = requests.post(f"{API}/public/tickets", json={
            "workspace_email": f"nope_{uuid.uuid4().hex[:8]}@nowhere.io",
            "subject": "x", "description": "y",
            "requester_name": "n", "requester_email": "r@x.io",
        }, timeout=15)
        assert r.status_code == 404


# ---------- Channels ----------
class TestChannels:
    def test_channels_upsert_idempotent(self, auth):
        s = auth["session"]
        # Initially empty
        r = s.get(f"{API}/channels", timeout=15)
        assert r.status_code == 200

        # Upsert email enabled
        r = s.put(f"{API}/channels", json={"channel": "email", "enabled": True, "config": {"from": "ops@acme.io"}}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["channel"] == "email" and body["enabled"] is True and "_id" not in body

        # Upsert again to disable (must not create duplicate)
        r = s.put(f"{API}/channels", json={"channel": "email", "enabled": False, "config": {}}, timeout=15)
        assert r.status_code == 200 and r.json()["enabled"] is False

        r = s.get(f"{API}/channels", timeout=15)
        emails = [c for c in r.json() if c["channel"] == "email"]
        assert len(emails) == 1, "channel upsert created duplicate"

        # Add a second channel
        r = s.put(f"{API}/channels", json={"channel": "whatsapp", "enabled": True, "config": {}}, timeout=15)
        assert r.status_code == 200
        r = s.get(f"{API}/channels", timeout=15)
        chans = {c["channel"] for c in r.json()}
        assert {"email", "whatsapp"}.issubset(chans)


# ---------- AI deal insight ----------
class TestAIDealInsight:
    def test_deal_insight(self, auth):
        s = auth["session"]
        # create deal
        r = s.post(f"{API}/deals", json={"title": "TEST_Insight Deal", "value": 25000, "stage": "proposal", "company": "Acme"}, timeout=15)
        assert r.status_code == 200
        did = r.json()["id"]

        r = s.post(f"{API}/ai/deal-insight", json={"deal_id": did}, timeout=120)
        assert r.status_code == 200, r.text
        text = r.json().get("insight", "")
        assert isinstance(text, str) and len(text) > 30
        # Best-effort: should contain at least one of the structured headers
        upper = text.upper()
        assert any(tok in upper for tok in ["RISK", "WIN_PROBABILITY", "MOVES", "BLOCKERS"])

    def test_deal_insight_404(self, auth):
        r = auth["session"].post(f"{API}/ai/deal-insight", json={"deal_id": "nonexistent-deal-id"}, timeout=30)
        assert r.status_code == 404
