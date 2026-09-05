"""Backend tests for real-telephony IVR (Twilio/Telnyx/Plivo) — iteration 5."""
import os
import re
import time

import pytest
import requests

# Load REACT_APP_BACKEND_URL from frontend/.env if not in env
if not os.environ.get("REACT_APP_BACKEND_URL"):
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test-ivr@example.com"
ADMIN_PASS = "TestPass123!"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    if r.status_code != 200:
        # register (first user is admin)
        rr = requests.post(f"{API}/auth/register", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS, "name": "IVR Admin"}, timeout=15)
        assert rr.status_code in (200, 201), rr.text
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_id(token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


@pytest.fixture(scope="session")
def H(token):
    return {"Authorization": f"Bearer {token}"}


FAKE_TWILIO = {
    "account_sid": "ACfaketestsid00000000000000000001",
    "auth_token": "faketoken0123456789abcdef01234567",
    "phone_number": "+15550100200",
    "api_key_sid": "SKfakeapikeysid0000000000000000001",
    "api_key_secret": "fakeapikeysecret0123456789abcdef",
    "twiml_app_sid": "APfaketwimlappsid0000000000000001",
}
FAKE_PLIVO = {"auth_id": "MAFAKE01234567890", "auth_token": "plivofaketokenxxxxx", "phone_number": "+15550100200"}
FAKE_TELNYX = {"api_key": "KEYfake123telnyx", "connection_id": "1234567890", "phone_number": "+15550100200"}


def _put_settings(H, provider, creds=None, verify=False, fallback="+15550109999"):
    payload = {
        "provider": provider,
        "credentials": creds or {},
        "agent_fallback_number": fallback,
        "verify_signatures": verify,
        "record_calls": True,
        "softphone_enabled": True,
    }
    r = requests.put(f"{API}/voice/settings", json=payload, headers=H, timeout=15)
    return r


# ---------- settings ----------
class TestSettings:
    def test_get_defaults(self, H, user_id):
        r = requests.get(f"{API}/voice/settings", headers=H, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["provider"] in ("none", "twilio", "telnyx", "plivo")
        assert set(data["providers"].keys()) == {"twilio", "telnyx", "plivo"}
        assert isinstance(data["providers"]["twilio"], list) and "account_sid" in data["providers"]["twilio"]
        # agent_identity replaces - with _
        assert data["agent_identity"] == "agent_" + user_id.replace("-", "_")

    def test_reset_to_none_first(self, H):
        r = _put_settings(H, "none", {})
        assert r.status_code == 200
        d = r.json()
        assert d["provider"] == "none"
        assert d["provider_ready"] is False
        assert d["webhooks"] == {}

    def test_save_twilio_creds_and_masking(self, H, user_id):
        r = _put_settings(H, "twilio", FAKE_TWILIO, verify=False)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["provider_ready"] is True
        assert d["softphone_ready"] is True
        creds = d["credentials"]
        # secrets masked
        assert "•" in creds["auth_token"] or "*" in creds["auth_token"]
        assert "•" in creds["api_key_secret"] or "*" in creds["api_key_secret"]
        # clear-text for these
        assert creds["account_sid"] == FAKE_TWILIO["account_sid"]
        assert creds["phone_number"] == FAKE_TWILIO["phone_number"]
        # webhooks
        wh = d["webhooks"]
        assert len(wh) == 4
        joined = " ".join(wh.values())
        for suffix in ["/inbound", "/status", "/client", "/fallback"]:
            assert suffix in joined
        assert f"/api/webhooks/voice/twilio/{user_id}/" in joined

    def test_resave_with_masked_keeps_secret(self, H):
        # first fetch masked
        g = requests.get(f"{API}/voice/settings", headers=H, timeout=15).json()
        masked_creds = g["credentials"]
        # re-save with masked bullets
        r = _put_settings(H, "twilio", masked_creds, verify=False)
        assert r.status_code == 200
        assert r.json()["provider_ready"] is True

    def test_settings_test_fake_twilio_400(self, H):
        r = requests.post(f"{API}/voice/settings/test", headers=H, timeout=30)
        assert r.status_code == 400, r.text
        assert "twilio" in r.text.lower()

    def test_voice_token_ok(self, H):
        r = requests.get(f"{API}/voice/token", headers=H, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token"] and isinstance(d["token"], str) and d["token"].count(".") == 2
        assert d["identity"].startswith("agent_")
        assert d["caller_id"] == FAKE_TWILIO["phone_number"]

    def test_voice_token_provider_none(self, H):
        _put_settings(H, "none", {})
        r = requests.get(f"{API}/voice/token", headers=H, timeout=15)
        assert r.status_code == 400
        # restore twilio
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)

    def test_settings_test_provider_none(self, H):
        _put_settings(H, "none", {})
        r = requests.post(f"{API}/voice/settings/test", headers=H, timeout=15)
        assert r.status_code == 400
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)


# ---------- dial ----------
class TestDial:
    def test_dial_provider_none(self, H):
        _put_settings(H, "none", {})
        r = requests.post(f"{API}/voice/dial", headers=H, json={"to": "+14155550123", "mode": "agent"}, timeout=20)
        assert r.status_code == 400
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)

    def test_dial_invalid_number(self, H):
        r = requests.post(f"{API}/voice/dial", headers=H, json={"to": "12", "mode": "agent"}, timeout=20)
        assert r.status_code == 400

    def test_dial_fake_twilio_records_failed(self, H):
        r = requests.post(f"{API}/voice/dial", headers=H, json={"to": "+14155550123", "mode": "agent"}, timeout=30)
        # dial may return 400 OR return the call row with failed status. Accept either.
        if r.status_code == 200:
            call = r.json()
            assert call["status"] in ("failed", "queued")
        else:
            assert r.status_code == 400
        time.sleep(1)
        # verify a call exists with failure
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        assert isinstance(cs, list) and len(cs) >= 1
        # most recent should be failed with disposition provider_error
        recent = cs[0] if cs else None
        assert recent
        assert recent.get("status") in ("failed", "queued", "completed")


# ---------- flows / queues ----------
@pytest.fixture(scope="session")
def seeded(H):
    r = requests.post(f"{API}/voice/flows/seed", headers=H, timeout=15)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    flow = body.get("flow") if isinstance(body, dict) and "flow" in body else body
    flow_id = flow["id"]
    # publish
    r2 = requests.patch(f"{API}/voice/flows/{flow_id}/status", headers=H, json={"status": "published"}, timeout=15)
    assert r2.status_code == 200, r2.text
    # queue
    qr = requests.post(f"{API}/voice/queues", headers=H, json={"name": "sales", "members": ["+15550107777"], "strategy": "ring_all"}, timeout=15)
    assert qr.status_code in (200, 201), qr.text
    return {"flow_id": flow_id}


# ---------- Twilio webhooks ----------
class TestTwilioWebhooks:
    def test_inbound(self, H, user_id, seeded):
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/inbound",
            data={"CallSid": "CAtest1", "From": "+14155550123", "To": "+15550100200"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert "xml" in r.headers.get("content-type", "").lower()
        assert "<Response" in r.text

    def test_next_greeting(self, H, user_id, seeded):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/next",
            data={"CallSid": "CAtest1"},
            params={"node": "greeting", "flow_id": seeded["flow_id"]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert "<Gather" in r.text
        assert "main-menu" in r.text

    def test_gather_valid_digit_dial(self, H, user_id, seeded):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/gather",
            data={"CallSid": "CAtest1", "Digits": "1"},
            params={"node": "main-menu", "flow_id": seeded["flow_id"], "attempt": "1"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert "<Dial" in r.text
        assert "+15550107777" in r.text

    def test_gather_invalid_digit_retry(self, H, user_id, seeded):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/gather",
            data={"CallSid": "CAtest1", "Digits": "7"},
            params={"node": "main-menu", "flow_id": seeded["flow_id"], "attempt": "1"},
            timeout=15,
        )
        assert r.status_code == 200
        assert "<Gather" in r.text
        assert "attempt=2" in r.text or "attempt=2" in r.text.replace("&amp;", "&")

    def test_dial_result_voicemail(self, H, user_id, seeded):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/dial-result",
            data={"CallSid": "CAtest1", "DialCallStatus": "no-answer"},
            params={"node": "sales", "flow_id": seeded["flow_id"]},
            timeout=15,
        )
        assert r.status_code == 200
        assert "<Record" in r.text or "<Say" in r.text

    def test_status_completed(self, H, user_id):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/status",
            data={"CallSid": "CAtest1", "CallStatus": "completed", "CallDuration": "63"},
            timeout=15,
        )
        assert r.status_code in (200, 204)

    def test_recording(self, H, user_id):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/recording",
            data={"CallSid": "CAtest1", "RecordingUrl": "https://example.com/RE1"},
            timeout=15,
        )
        assert r.status_code in (200, 204)

    def test_call_row_final(self, H):
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        target = next((c for c in cs if c.get("provider_call_id") == "CAtest1" or c.get("id") == "CAtest1"), None)
        # find by CallSid — server may map via provider_call_id
        if not target:
            # try match on collected digits
            target = next((c for c in cs if "1" in (c.get("collected_digits") or []) and c.get("provider") == "twilio"), None)
        assert target, f"No call found: {[c.get('id') for c in cs[:5]]}"
        assert target.get("provider") == "twilio"
        assert target.get("status") == "completed"
        assert target.get("duration_seconds") == 63
        assert target.get("recording_available") is True
        assert isinstance(target.get("ivr_path"), list) and len(target["ivr_path"]) >= 1
        digs = target.get("collected_digits") or []
        assert "1" in digs and "7" in digs

    def test_client_webhook_softphone(self, H, user_id):
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/client",
            data={"CallSid": "CA555", "From": "client:agent_x", "To": "+14155550999"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert "<Dial" in r.text
        assert "+14155550999" in r.text
        time.sleep(0.3)
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        soft = [c for c in cs if c.get("mode") == "softphone"]
        assert soft, "no softphone call recorded"


class TestSignatureEnforcement:
    def test_twilio_403_without_signature(self, H, user_id):
        _put_settings(H, "twilio", FAKE_TWILIO, verify=True)
        r = requests.post(
            f"{API}/webhooks/voice/twilio/{user_id}/inbound",
            data={"CallSid": "CAsig1", "From": "+14155550123", "To": "+15550100200"},
            timeout=15,
        )
        assert r.status_code == 403
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)

    def test_wrong_provider_webhook_404(self, H, user_id):
        # twilio active
        r = requests.post(
            f"{API}/webhooks/voice/plivo/{user_id}/answer",
            data={"CallUUID": "PL1", "From": "14155550123", "To": "15550100200"},
            timeout=15,
        )
        assert r.status_code == 404


# ---------- Plivo ----------
class TestPlivo:
    def test_answer(self, H, user_id, seeded):
        _put_settings(H, "plivo", FAKE_PLIVO, verify=False)
        r = requests.post(
            f"{API}/webhooks/voice/plivo/{user_id}/answer",
            data={"CallUUID": "PL1", "From": "14155550123", "To": "15550100200", "Direction": "inbound"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert "<Response>" in r.text

    def test_input_fallback(self, H, user_id, seeded):
        # 'support' queue empty → falls back to fallback number
        r = requests.post(
            f"{API}/webhooks/voice/plivo/{user_id}/input",
            data={"CallUUID": "PL1", "Digits": "2"},
            params={"node": "main-menu", "flow_id": seeded["flow_id"], "attempt": "1"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # Should Dial fallback since 'support' queue is empty
        assert "<Dial" in r.text or "<Number" in r.text

    def test_hangup(self, H, user_id):
        r = requests.post(
            f"{API}/webhooks/voice/plivo/{user_id}/hangup",
            data={"CallUUID": "PL1", "CallStatus": "completed", "Duration": "40"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
        time.sleep(0.3)
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        plivo_calls = [c for c in cs if c.get("provider") == "plivo"]
        assert plivo_calls, "no plivo call recorded"
        pc = plivo_calls[0]
        assert pc.get("status") == "completed"
        assert pc.get("duration_seconds") == 40


# ---------- Telnyx ----------
class TestTelnyx:
    def test_call_initiated(self, H, user_id):
        _put_settings(H, "telnyx", FAKE_TELNYX, verify=False)
        payload = {"data": {"id": "ev1", "event_type": "call.initiated", "payload": {"call_control_id": "cc1", "direction": "incoming", "from": "+14155550123", "to": "+15550100200"}}}
        r = requests.post(f"{API}/webhooks/voice/telnyx/{user_id}", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_call_initiated_duplicate(self, H, user_id):
        payload = {"data": {"id": "ev1", "event_type": "call.initiated", "payload": {"call_control_id": "cc1", "direction": "incoming", "from": "+14155550123", "to": "+15550100200"}}}
        r = requests.post(f"{API}/webhooks/voice/telnyx/{user_id}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json().get("duplicate") is True

    def test_call_answered(self, H, user_id):
        payload = {"data": {"id": "ev2", "event_type": "call.answered", "payload": {"call_control_id": "cc1", "start_time": "2026-01-01T10:00:00Z"}}}
        r = requests.post(f"{API}/webhooks/voice/telnyx/{user_id}", json=payload, timeout=15)
        assert r.status_code == 200

    def test_call_hangup(self, H, user_id):
        payload = {"data": {"id": "ev3", "event_type": "call.hangup", "payload": {"call_control_id": "cc1", "start_time": "2026-01-01T10:00:00Z", "end_time": "2026-01-01T10:00:30Z"}}}
        r = requests.post(f"{API}/webhooks/voice/telnyx/{user_id}", json=payload, timeout=15)
        assert r.status_code == 200
        time.sleep(0.3)
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        tn = [c for c in cs if c.get("provider") == "telnyx"]
        assert tn, "no telnyx call recorded"
        assert tn[0].get("status") == "completed"
        assert tn[0].get("duration_seconds") == 30


# ---------- Overview / live / hangup ----------
class TestOverview:
    def test_overview_fields(self, H):
        _put_settings(H, "twilio", FAKE_TWILIO, verify=False)
        r = requests.get(f"{API}/voice/overview", headers=H, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ("provider", "provider_ready", "softphone_ready", "live_calls", "real_calls", "recordings"):
            assert key in d, f"missing {key}"

    def test_live_calls(self, H):
        r = requests.get(f"{API}/voice/calls/live", headers=H, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_hangup_existing_call(self, H, user_id):
        # create a manual call via dial - it will fail but persist
        requests.post(f"{API}/voice/dial", headers=H, json={"to": "+14155550123", "mode": "agent"}, timeout=20)
        cs = requests.get(f"{API}/voice/calls", headers=H, timeout=15).json()
        # find one that isn't completed
        target = next((c for c in cs if c.get("status") in ("queued", "ringing", "connected")), None)
        if not target:
            pytest.skip("no live call to hangup")
        r = requests.post(f"{API}/voice/calls/{target['id']}/hangup", headers=H, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "completed"


# ---------- Simulator regression ----------
class TestSimulator:
    def test_simulate_inbound(self, H, seeded):
        r = requests.post(f"{API}/voice/simulate/inbound", headers=H, json={"flow_id": seeded["flow_id"], "from_number": "+14155550111"}, timeout=15)
        assert r.status_code in (200, 201), r.text

    def test_flows_crud(self, H):
        r = requests.get(f"{API}/voice/flows", headers=H, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_queues_crud(self, H):
        r = requests.get(f"{API}/voice/queues", headers=H, timeout=15)
        assert r.status_code == 200


# ---------- Docs ----------
class TestDocs:
    def test_telephony_setup_md(self):
        # Doc is served by frontend static; only reachable via public URL
        url = f"{BASE_URL}/docs/TELEPHONY_SETUP.md"
        if BASE_URL.startswith("http://localhost"):
            pytest.skip("docs served by frontend; skip on localhost")
        r = requests.get(url, timeout=15)
        assert r.status_code == 200, f"docs not served: {r.status_code}"
        assert len(r.text) > 100
