"""Real telephony layer: self-hosted IVR engine driven by carrier webhooks (Twilio / Telnyx / Plivo)."""
import base64
import hashlib
import hmac
import html
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

log = logging.getLogger("telephony")
router = APIRouter()
deps: dict = {}

PROVIDERS = {
    "twilio": {"label": "Twilio", "fields": ["account_sid", "auth_token", "phone_number", "api_key_sid", "api_key_secret", "twiml_app_sid"], "secret": ["auth_token", "api_key_secret"]},
    "telnyx": {"label": "Telnyx", "fields": ["api_key", "connection_id", "phone_number", "public_key"], "secret": ["api_key"]},
    "plivo": {"label": "Plivo", "fields": ["auth_id", "auth_token", "phone_number"], "secret": ["auth_token"]},
}
STATUS_MAP = {
    "queued": "queued", "initiated": "queued", "ringing": "ringing", "in-progress": "connected", "answered": "connected",
    "completed": "completed", "busy": "no_answer", "no-answer": "no_answer", "failed": "failed", "canceled": "failed",
    "cancel": "failed", "timeout": "no_answer", "rejected": "failed", "hangup": "completed",
}
TELNYX_VOICE = "Telnyx.KokoroTTS.af"


def init(**kwargs):
    deps.update(kwargs)


def _db():
    return deps["db"]


def _now():
    return deps["now_utc_iso"]()


def _e164(value: str) -> str:
    digits = re.sub(r"[^\d+]", "", value or "")
    return digits if digits.startswith("+") else f"+{digits}" if digits else ""


def public_base(request: Request) -> str:
    return (os.environ.get("PUBLIC_BASE_URL") or os.environ.get("APP_URL") or str(request.base_url)).rstrip("/")


def webhook_base(request: Request, provider: str, owner_id: str) -> str:
    return f"{public_base(request)}/api/webhooks/voice/{provider}/{owner_id}"


# ---------- settings ----------
class VoiceSettingsIn(BaseModel):
    provider: Literal["none", "twilio", "telnyx", "plivo"] = "none"
    credentials: dict = Field(default_factory=dict)
    agent_fallback_number: str | None = None
    sip_transfer_domain: str | None = None
    record_calls: bool = True
    softphone_enabled: bool = True
    verify_signatures: bool = True
    default_flow_id: str | None = None
    auto_ticket_missed: bool = True
    auto_ticket_voicemail: bool = True


class CallNotesIn(BaseModel):
    notes: str | None = None
    outcome: Literal["resolved", "follow_up", "no_answer", "wrong_number", "voicemail", "escalated", "sale"] | None = None


class PresenceIn(BaseModel):
    status: Literal["online", "away", "offline"]
    softphone: bool = False


PRESENCE_TTL = 90


async def get_settings(owner_id: str, decrypt: bool = False) -> dict:
    doc = await _db().voice_settings.find_one({"owner_id": owner_id}, {"_id": 0}) or {"owner_id": owner_id, "provider": "none", "credentials": {}}
    doc.setdefault("record_calls", True)
    doc.setdefault("softphone_enabled", True)
    doc.setdefault("verify_signatures", True)
    doc.setdefault("auto_ticket_missed", True)
    doc.setdefault("auto_ticket_voicemail", True)
    creds = doc.get("credentials") or {}
    if decrypt:
        doc["credentials"] = {k: deps["decrypt_secret"](v) for k, v in creds.items()}
    return doc


def _masked(settings: dict) -> dict:
    provider = settings.get("provider", "none")
    secret_keys = PROVIDERS.get(provider, {}).get("secret", [])
    out = {}
    for k, v in (settings.get("credentials") or {}).items():
        plain = deps["decrypt_secret"](v)
        out[k] = deps["mask"](plain) if k in secret_keys else plain
    return {**settings, "credentials": out}


def provider_ready(settings: dict) -> bool:
    p = settings.get("provider", "none")
    creds = settings.get("credentials") or {}
    if p == "twilio":
        return all(creds.get(k) for k in ["account_sid", "auth_token", "phone_number"])
    if p == "telnyx":
        return all(creds.get(k) for k in ["api_key", "connection_id", "phone_number"])
    if p == "plivo":
        return all(creds.get(k) for k in ["auth_id", "auth_token", "phone_number"])
    return False


def softphone_ready(settings: dict) -> bool:
    creds = settings.get("credentials") or {}
    return settings.get("provider") == "twilio" and settings.get("softphone_enabled", True) and all(creds.get(k) for k in ["api_key_sid", "api_key_secret", "twiml_app_sid"])


def agent_identity(user_id: str) -> str:
    return "agent_" + re.sub(r"[^A-Za-z0-9_]", "_", user_id)


def build_routes():
    get_current_user = deps["get_current_user"]
    require_permission = deps["require_permission"]

    @router.get("/voice/settings")
    async def read_settings(request: Request, user=Depends(get_current_user)):
        settings = await get_settings(user["id"])
        return {**_masked(settings), "provider_ready": provider_ready(settings), "softphone_ready": softphone_ready(settings), "providers": {k: v["fields"] for k, v in PROVIDERS.items()}, "webhooks": webhook_urls(request, settings.get("provider", "none"), user["id"]), "agent_identity": agent_identity(user["id"])}

    @router.put("/voice/settings")
    async def save_settings(payload: VoiceSettingsIn, request: Request, user=Depends(require_permission("settings.manage"))):
        existing = await get_settings(user["id"])
        old_creds = existing.get("credentials") or {}
        encrypted = {}
        if payload.provider != "none":
            allowed = PROVIDERS[payload.provider]["fields"]
            for k in allowed:
                v = (payload.credentials.get(k) or "").strip()
                if not v:
                    continue
                if "•" in v and k in old_creds:
                    encrypted[k] = old_creds[k]
                else:
                    encrypted[k] = deps["encrypt_secret"](_e164(v) if k == "phone_number" else v)
        doc = {"owner_id": user["id"], "provider": payload.provider, "credentials": encrypted, "agent_fallback_number": _e164(payload.agent_fallback_number) if payload.agent_fallback_number else None, "sip_transfer_domain": payload.sip_transfer_domain, "record_calls": payload.record_calls, "softphone_enabled": payload.softphone_enabled, "verify_signatures": payload.verify_signatures, "default_flow_id": payload.default_flow_id, "auto_ticket_missed": payload.auto_ticket_missed, "auto_ticket_voicemail": payload.auto_ticket_voicemail, "updated_at": _now()}
        await _db().voice_settings.update_one({"owner_id": user["id"]}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        return await read_settings(request, user)

    @router.post("/voice/settings/test")
    async def test_settings(user=Depends(require_permission("settings.manage"))):
        settings = await get_settings(user["id"], decrypt=True)
        if not provider_ready(settings):
            raise HTTPException(400, "Fill in the required credentials for the selected provider first")
        return await provider_test(settings)

    @router.get("/voice/token")
    async def voice_token(user=Depends(get_current_user)):
        settings = await get_settings(user["id"], decrypt=True)
        if not softphone_ready(settings):
            raise HTTPException(400, "Softphone needs Twilio API Key SID, API Key Secret and TwiML App SID")
        from twilio.jwt.access_token import AccessToken
        from twilio.jwt.access_token.grants import VoiceGrant
        c = settings["credentials"]
        identity = agent_identity(user["id"])
        token = AccessToken(c["account_sid"], c["api_key_sid"], c["api_key_secret"], identity=identity, ttl=3600)
        token.add_grant(VoiceGrant(outgoing_application_sid=c["twiml_app_sid"], incoming_allow=True))
        jwt_value = token.to_jwt()
        return {"token": jwt_value.decode() if isinstance(jwt_value, bytes) else jwt_value, "identity": identity, "caller_id": c.get("phone_number")}

    @router.post("/voice/dial")
    async def dial(payload: DialIn, request: Request, background: BackgroundTasks, user=Depends(require_permission("activities.write"))):
        settings = await get_settings(user["id"], decrypt=True)
        if not provider_ready(settings):
            raise HTTPException(400, "Connect a telephony provider in the Telephony tab before placing real calls")
        to = _e164(payload.to)
        if len(to) < 8:
            raise HTTPException(400, "Enter a valid phone number in international format, e.g. +14155550123")
        contact = await _db().contacts.find_one({"id": payload.contact_id, "owner_id": user["id"]}, {"_id": 0}) if payload.contact_id else None
        call = {"id": str(uuid.uuid4()), "owner_id": user["id"], "direction": "outbound", "provider": settings["provider"], "status": "queued", "from": settings["credentials"]["phone_number"], "to": to, "contact_id": payload.contact_id, "contact_name": contact.get("name") if contact else None, "flow_id": payload.flow_id, "mode": payload.mode, "agent_user_id": user["id"], "initiated_at": _now(), "recording_urls": [], "recording_available": False, "attempt": 1, "ivr_path": []}
        await _db().voice_calls.insert_one(call)
        call.pop("_id", None)
        await place_call(settings, call, public_base(request))
        return await _db().voice_calls.find_one({"id": call["id"]}, {"_id": 0})

    @router.post("/voice/calls/{call_id}/hangup")
    async def hangup_call(call_id: str, user=Depends(require_permission("activities.write"))):
        call = await _db().voice_calls.find_one({"id": call_id, "owner_id": user["id"]}, {"_id": 0})
        if not call:
            raise HTTPException(404, "Call not found")
        settings = await get_settings(user["id"], decrypt=True)
        if call.get("provider_call_id") and provider_ready(settings):
            try:
                await provider_hangup(settings, call["provider_call_id"])
            except Exception as exc:
                log.warning("hangup failed: %s", exc)
        await _db().voice_calls.update_one({"id": call_id}, {"$set": {"status": "completed", "ended_at": _now(), "disposition": call.get("disposition") or "hung_up_by_agent"}})
        return await _db().voice_calls.find_one({"id": call_id}, {"_id": 0})

    @router.patch("/voice/calls/{call_id}/notes")
    async def save_call_notes(call_id: str, payload: CallNotesIn, user=Depends(require_permission("activities.write"))):
        call = await _db().voice_calls.find_one({"id": call_id, "owner_id": user["id"]}, {"_id": 0})
        if not call:
            raise HTTPException(404, "Call not found")
        update = {"notes_updated_at": _now(), "notes_by": user.get("name")}
        if payload.notes is not None:
            update["notes"] = payload.notes
        if payload.outcome is not None:
            update["outcome"] = payload.outcome
        await _db().voice_calls.update_one({"id": call_id}, {"$set": update})
        return await _db().voice_calls.find_one({"id": call_id}, {"_id": 0})

    @router.post("/voice/calls/{call_id}/ticket")
    async def ticket_from_call(call_id: str, user=Depends(require_permission("activities.write"))):
        call = await _db().voice_calls.find_one({"id": call_id, "owner_id": user["id"]}, {"_id": 0})
        if not call:
            raise HTTPException(404, "Call not found")
        if call.get("ticket_id"):
            existing = await _db().tickets.find_one({"id": call["ticket_id"]}, {"_id": 0})
            if existing:
                return {"created": False, "ticket": existing}
        ticket = await create_call_ticket(user["id"], call, "manual", assignee_id=user["id"])
        return {"created": True, "ticket": ticket}

    @router.get("/voice/presence")
    async def presence_list(user=Depends(get_current_user)):
        users = await _db().users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}).to_list(200)
        rows = {p["user_id"]: p for p in await _db().voice_presence.find({}, {"_id": 0}).to_list(500)}
        out = []
        for u in users:
            p = rows.get(u["id"]) or {}
            out.append({**u, "status": p.get("status", "offline"), "softphone": p.get("softphone", False), "last_seen": p.get("last_seen"), "online": presence_online(p), "identity": agent_identity(u["id"])})
        out.sort(key=lambda r: (not r["online"], r.get("name") or ""))
        return out

    @router.post("/voice/presence")
    async def presence_set(payload: PresenceIn, user=Depends(get_current_user)):
        doc = {"user_id": user["id"], "status": payload.status, "softphone": payload.softphone, "last_seen": _now(), "name": user.get("name")}
        await _db().voice_presence.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
        return {**doc, "online": presence_online(doc)}

    @router.get("/voice/calls/live")
    async def live_calls(user=Depends(get_current_user)):
        return await _db().voice_calls.find({"owner_id": user["id"], "status": {"$in": ["queued", "ringing", "connected"]}, "provider": {"$ne": "self_hosted_simulator"}}, {"_id": 0}).sort("initiated_at", -1).to_list(50)

    # ---------- Twilio webhooks ----------
    @router.post("/webhooks/voice/twilio/{owner_id}/{action}")
    async def twilio_webhook(owner_id: str, action: str, request: Request):
        settings = await get_settings(owner_id, decrypt=True)
        if settings.get("provider") != "twilio":
            raise HTTPException(404, "Twilio is not the active provider for this workspace")
        params = await _form(request)
        if settings.get("verify_signatures", True):
            from twilio.request_validator import RequestValidator
            url = f"{public_base(request)}{request.url.path}" + (f"?{request.url.query}" if request.url.query else "")
            if not RequestValidator(settings["credentials"]["auth_token"]).validate(url, params, request.headers.get("X-Twilio-Signature", "")):
                log.warning("Twilio signature rejected for %s", url)
                raise HTTPException(403, "Invalid Twilio signature")
        return await twilio_handle(owner_id, action, params, dict(request.query_params), settings, request)

    # ---------- Plivo webhooks ----------
    @router.post("/webhooks/voice/plivo/{owner_id}/{action}")
    async def plivo_webhook(owner_id: str, action: str, request: Request):
        settings = await get_settings(owner_id, decrypt=True)
        if settings.get("provider") != "plivo":
            raise HTTPException(404, "Plivo is not the active provider for this workspace")
        params = await _form(request)
        if settings.get("verify_signatures", True):
            url = f"{public_base(request)}{request.url.path}" + (f"?{request.url.query}" if request.url.query else "")
            if not plivo_signature_ok(url, params, request.headers.get("X-Plivo-Signature-V3", ""), request.headers.get("X-Plivo-Signature-V3-Nonce", ""), settings["credentials"]["auth_token"]):
                raise HTTPException(403, "Invalid Plivo signature")
        return await plivo_handle(owner_id, action, params, dict(request.query_params), settings, request)

    # ---------- Telnyx webhooks ----------
    @router.post("/webhooks/voice/telnyx/{owner_id}")
    async def telnyx_webhook(owner_id: str, request: Request):
        settings = await get_settings(owner_id, decrypt=True)
        if settings.get("provider") != "telnyx":
            raise HTTPException(404, "Telnyx is not the active provider for this workspace")
        raw = await request.body()
        public_key = settings["credentials"].get("public_key")
        if settings.get("verify_signatures", True) and public_key:
            if not telnyx_signature_ok(raw, request.headers.get("telnyx-signature-ed25519", ""), request.headers.get("telnyx-timestamp", ""), public_key):
                raise HTTPException(403, "Invalid Telnyx signature")
        try:
            event = json.loads(raw)["data"]
        except Exception:
            raise HTTPException(400, "Malformed Telnyx event")
        seen = await _db().voice_events.find_one({"event_id": event.get("id")})
        if seen:
            return {"ok": True, "duplicate": True}
        await _db().voice_events.insert_one({"event_id": event.get("id"), "owner_id": owner_id, "type": event.get("event_type"), "received_at": _now()})
        await telnyx_handle(owner_id, event, settings, request)
        return {"ok": True}


class DialIn(BaseModel):
    to: str
    contact_id: str | None = None
    flow_id: str | None = None
    mode: Literal["agent", "flow"] = "agent"


def webhook_urls(request: Request, provider: str, owner_id: str) -> dict:
    base = webhook_base(request, provider, owner_id)
    if provider == "twilio":
        return {"Voice URL (phone number → A call comes in)": f"{base}/inbound", "Status callback URL": f"{base}/status", "TwiML App Voice URL (softphone)": f"{base}/client", "Fallback URL": f"{base}/fallback"}
    if provider == "telnyx":
        return {"Webhook URL (Voice API application)": base}
    if provider == "plivo":
        return {"Answer URL (Application)": f"{base}/answer", "Hangup URL (Application)": f"{base}/hangup"}
    return {}


async def _form(request: Request) -> dict:
    form = await request.form()
    return {str(k): str(v) for k, v in form.multi_items()}


def _xml(body: str) -> Response:
    return Response(body, media_type="application/xml")


# ---------- flow engine (provider neutral) ----------
async def load_flow(owner_id: str, flow_id: str | None):
    query = {"owner_id": owner_id}
    if flow_id:
        query["id"] = flow_id
    else:
        query["status"] = "published"
    return await _db().voice_flows.find_one(query, {"_id": 0}, sort=[("published_at", -1), ("updated_at", -1)])


def node_by_id(flow: dict, node_id: str | None):
    for node in flow.get("nodes", []):
        if node.get("id") == node_id:
            return node
    return None


def next_node(flow: dict, node: dict):
    target = (node.get("config") or {}).get("next")
    if target:
        return node_by_id(flow, target)
    nodes = flow.get("nodes", [])
    for index, item in enumerate(nodes):
        if item.get("id") == node.get("id"):
            return nodes[index + 1] if index + 1 < len(nodes) else None
    return None


def first_node(flow: dict):
    hours = flow.get("business_hours") or {}
    nodes = flow.get("nodes", [])
    if hours.get("enabled") and not within_hours(hours, flow.get("timezone") or "UTC"):
        target = node_by_id(flow, hours.get("after_hours_node")) or next((n for n in nodes if n.get("type") == "voicemail"), None)
        if target:
            return target
    return nodes[0] if nodes else None


def within_hours(hours: dict, tz: str) -> bool:
    try:
        now = datetime.now(ZoneInfo(tz))
    except Exception:
        now = datetime.utcnow()
    day = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][now.weekday()]
    if day not in (hours.get("days") or []):
        return False
    return (hours.get("start") or "00:00") <= now.strftime("%H:%M") <= (hours.get("end") or "23:59")


def fallback_node(flow: dict, node: dict):
    target = (node.get("config") or {}).get("fallback")
    return node_by_id(flow, target) or next((n for n in flow.get("nodes", []) if n.get("type") == "voicemail"), None)


async def member_targets(member: str, settings: dict) -> list:
    member = str(member or "").strip()
    if not member:
        return []
    if member.startswith("sip:"):
        return [{"kind": "sip", "value": member}]
    if member.startswith("client:"):
        return [{"kind": "client", "value": member[7:]}]
    if re.fullmatch(r"\+?[\d\s\-()]{6,}", member):
        return [{"kind": "number", "value": _e164(member)}]
    if re.fullmatch(r"\d{2,6}", member) and settings.get("sip_transfer_domain"):
        return [{"kind": "sip", "value": f"sip:{member}@{settings['sip_transfer_domain']}"}]
    user = await _db().users.find_one({"id": member}, {"_id": 0, "phone": 1, "id": 1})
    if not user:
        return []
    targets = []
    if await user_is_online(user["id"]):
        targets.append({"kind": "client", "value": agent_identity(user["id"])})
    if user.get("phone"):
        targets.append({"kind": "number", "value": _e164(user["phone"])})
    return targets


async def resolve_targets(owner_id: str, node: dict, settings: dict) -> list:
    """Returns list of {'kind': 'number'|'client'|'sip', 'value': str}; offline agents are skipped."""
    cfg = node.get("config") or {}
    members, queue = [], None
    if node.get("type") == "queue":
        name = cfg.get("queue") or cfg.get("destination") or node.get("label")
        queue = await _db().voice_queues.find_one({"owner_id": owner_id, "$or": [{"id": name}, {"name": {"$regex": f"^{re.escape(str(name))}$", "$options": "i"}}]}, {"_id": 0})
        if queue:
            members = list(queue.get("members") or [])
    else:
        members = [cfg.get("destination")] if cfg.get("destination") else []
    available = []
    for member in members:
        targets = await member_targets(member, settings)
        if targets:
            available.append(targets)
    if queue and available and queue.get("strategy") != "ring_all":
        index = int(queue.get("rotation", 0)) % len(available)
        available = [available[index]]
        await _db().voice_queues.update_one({"id": queue["id"]}, {"$set": {"rotation": index + 1}})
    targets = [t for group in available for t in group]
    if not targets and settings.get("agent_fallback_number"):
        targets.append({"kind": "number", "value": settings["agent_fallback_number"]})
    return targets


async def upsert_call(owner_id: str, provider: str, provider_call_id: str, defaults: dict) -> dict:
    existing = await _db().voice_calls.find_one({"owner_id": owner_id, "provider_call_id": provider_call_id}, {"_id": 0})
    if existing:
        return existing
    doc = {"id": str(uuid.uuid4()), "owner_id": owner_id, "provider": provider, "provider_call_id": provider_call_id, "initiated_at": _now(), "started_at": _now(), "recording_urls": [], "recording_available": False, "ivr_path": [], **defaults}
    await _db().voice_calls.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def find_call(owner_id: str, provider_call_id: str):
    return await _db().voice_calls.find_one({"owner_id": owner_id, "provider_call_id": provider_call_id}, {"_id": 0})


async def mark_node(call: dict, node: dict):
    await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"current_node_id": node.get("id"), "current_prompt": node.get("prompt", ""), "disposition": node.get("type")}, "$push": {"ivr_path": node.get("label") or node.get("id")}})


async def apply_status(owner_id: str, provider_call_id: str, raw_status: str, extra: dict | None = None):
    status = STATUS_MAP.get((raw_status or "").lower())
    if not status:
        return
    update = {"status": status, "updated_at": _now(), **(extra or {})}
    if status == "connected":
        update.setdefault("connected_at", _now())
    if status in {"completed", "failed", "no_answer"}:
        update["ended_at"] = _now()
    await _db().voice_calls.update_one({"owner_id": owner_id, "provider_call_id": provider_call_id}, {"$set": update})
    if status in {"completed", "failed", "no_answer"}:
        call = await find_call(owner_id, provider_call_id)
        if call:
            await finalize_call(owner_id, call["id"])


async def push_recording(owner_id: str, provider_call_id: str, url: str, duration: str | None):
    if not url:
        return
    await _db().voice_calls.update_one({"owner_id": owner_id, "provider_call_id": provider_call_id}, {"$push": {"recording_urls": {"url": url, "duration": duration, "completed_at": _now()}}, "$set": {"recording_available": True}})
    call = await find_call(owner_id, provider_call_id)
    if call and call.get("ticket_id"):
        await _db().tickets.update_one({"id": call["ticket_id"]}, {"$push": {"comments": {"id": str(uuid.uuid4()), "author": "Voice system", "body": f"Recording available: {url}", "internal": True, "created_at": _now()}}})
    elif call:
        await finalize_call(owner_id, call["id"])


def presence_online(p: dict) -> bool:
    if not p or p.get("status") != "online" or not p.get("last_seen"):
        return False
    try:
        seen = datetime.fromisoformat(p["last_seen"].replace("Z", "+00:00"))
        return (datetime.now(seen.tzinfo) - seen).total_seconds() < PRESENCE_TTL
    except Exception:
        return False


async def user_is_online(user_id: str) -> bool:
    return presence_online(await _db().voice_presence.find_one({"user_id": user_id}, {"_id": 0}))


def _ticket_body(call: dict, reason: str) -> str:
    who = call.get("contact_name") or call.get("from") or "Unknown caller"
    kind = "Voicemail" if reason == "voicemail" else "Missed call" if reason == "missed" else "Call"
    lines = [f"{kind} from {who} ({call.get('from') or '—'}) on {call.get('started_at') or call.get('initiated_at')}",
             f"Direction: {call.get('direction')} · Carrier: {call.get('provider')} · Status: {call.get('status')} · Duration: {call.get('duration_seconds') or 0}s"]
    if call.get("ivr_path"):
        lines.append("IVR path: " + " → ".join(call["ivr_path"]))
    if call.get("collected_digits"):
        lines.append("Keys pressed: " + ", ".join(call["collected_digits"]))
    for rec in call.get("recording_urls") or []:
        lines.append(f"Recording: {rec.get('url')}")
    if call.get("notes"):
        lines.append("Agent notes: " + call["notes"])
    return "\n".join(lines)


async def create_call_ticket(owner_id: str, call: dict, reason: str, assignee_id: str | None = None) -> dict:
    who = call.get("contact_name") or call.get("from") or call.get("to") or "unknown number"
    subject = {"voicemail": f"Voicemail from {who}", "missed": f"Missed call from {who}"}.get(reason, f"Call with {who}")
    payload = deps["TicketIn"](subject=subject, description=_ticket_body(call, reason), contact_id=call.get("contact_id"), priority="high" if reason == "missed" else "medium", channel="call", assignee_id=assignee_id, custom={"call_id": call["id"], "call_reason": reason})
    ticket = await deps["insert_ticket"](payload, owner_id)
    await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"ticket_id": ticket["id"], "ticket_reason": reason}})
    return ticket


async def finalize_call(owner_id: str, call_id: str):
    """Auto-create tickets for inbound voicemails and missed calls once a call has ended."""
    call = await _db().voice_calls.find_one({"id": call_id, "owner_id": owner_id}, {"_id": 0})
    if not call or call.get("ticket_id") or call.get("direction") != "inbound" or call.get("status") not in {"completed", "failed", "no_answer"}:
        return
    settings = await get_settings(owner_id)
    disposition = call.get("disposition") or ""
    if disposition == "voicemail_left" or (disposition == "voicemail" and call.get("recording_available")):
        if settings.get("auto_ticket_voicemail", True):
            await create_call_ticket(owner_id, call, "voicemail")
        return
    if disposition in {"queue", "transfer"} or call.get("status") in {"failed", "no_answer"}:
        if settings.get("auto_ticket_missed", True):
            await create_call_ticket(owner_id, call, "missed")


async def contact_for(owner_id: str, number: str) -> dict | None:
    if not number:
        return None
    tail = re.sub(r"\D", "", number)[-9:]
    if not tail:
        return None
    return await _db().contacts.find_one({"owner_id": owner_id, "phone": {"$regex": f"{tail}$"}}, {"_id": 0, "id": 1, "name": 1})


# ---------- Twilio ----------
async def twilio_handle(owner_id: str, action: str, p: dict, q: dict, settings: dict, request: Request):
    from twilio.twiml.voice_response import VoiceResponse
    base = webhook_base(request, "twilio", owner_id)
    caller_id = settings["credentials"]["phone_number"]
    sid = p.get("CallSid", "")
    r = VoiceResponse()

    if action == "status":
        await apply_status(owner_id, sid, p.get("CallStatus", ""), {"duration_seconds": int(p["CallDuration"])} if p.get("CallDuration", "").isdigit() else None)
        return Response(status_code=204)
    if action == "recording":
        await push_recording(owner_id, sid, p.get("RecordingUrl"), p.get("RecordingDuration"))
        return Response(status_code=204)
    if action == "fallback":
        r.say("We are sorry, our phone system is temporarily unavailable. Please try again later.")
        r.hangup()
        return _xml(str(r))
    if action == "wait":
        r.say("Please continue to hold. An agent will be with you shortly.")
        r.pause(length=8)
        return _xml(str(r))

    if action == "client":
        # Browser softphone placed an outbound call: To is a number or client:identity
        to = p.get("To", "")
        contact = await contact_for(owner_id, to)
        await upsert_call(owner_id, "twilio", sid, {"direction": "outbound", "status": "ringing", "from": caller_id, "to": to, "contact_id": contact and contact["id"], "contact_name": contact and contact["name"], "mode": "softphone", "agent_identity": p.get("From", "")})
        d = r.dial(caller_id=caller_id, answer_on_bridge=True, record="record-from-answer-dual" if settings.get("record_calls") else "do-not-record", recording_status_callback=f"{base}/recording")
        if to.startswith("client:"):
            d.client(to[7:])
        elif to.startswith("sip:"):
            d.sip(to)
        else:
            d.number(_e164(to), status_callback=f"{base}/status", status_callback_event="ringing answered completed")
        return _xml(str(r))

    if action == "outbound":
        # REST-initiated call answered by the customer
        call = await find_call(owner_id, sid)
        if call and call.get("mode") == "flow":
            flow = await load_flow(owner_id, call.get("flow_id"))
            node = first_node(flow) if flow else None
            if not node:
                r.say("Hello. Thank you for your time. Goodbye.")
                r.hangup()
                return _xml(str(r))
            await mark_node(call, node)
            return _xml(str(await twilio_render(owner_id, flow, node, settings, base, caller_id)))
        identity = agent_identity(call.get("agent_user_id", "")) if call else ""
        r.say("Please hold while we connect you.")
        d = r.dial(caller_id=caller_id, timeout=30, action=f"{base}/dial-result", method="POST", answer_on_bridge=True)
        if identity and softphone_ready(settings):
            d.client(identity)
        if settings.get("agent_fallback_number"):
            d.number(settings["agent_fallback_number"])
        return _xml(str(r))

    flow_id = q.get("flow_id")
    if action == "inbound":
        flow = await load_flow(owner_id, flow_id or settings.get("default_flow_id"))
        contact = await contact_for(owner_id, p.get("From", ""))
        call = await upsert_call(owner_id, "twilio", sid, {"direction": "inbound", "status": "connected", "from": p.get("From"), "to": p.get("To"), "flow_id": flow and flow["id"], "flow_name": flow and flow["name"], "contact_id": contact and contact["id"], "contact_name": contact and contact["name"], "connected_at": _now()})
        node = first_node(flow) if flow else None
        if not node:
            r.say("Thank you for calling. Our phone menu is not configured yet. Please try again later.")
            r.hangup()
            return _xml(str(r))
        await mark_node(call, node)
        return _xml(str(await twilio_render(owner_id, flow, node, settings, base, caller_id)))

    call = await find_call(owner_id, sid)
    flow = await load_flow(owner_id, (call or {}).get("flow_id") or flow_id)
    if not flow:
        r.say("Goodbye.")
        r.hangup()
        return _xml(str(r))
    node = node_by_id(flow, q.get("node"))

    if action == "gather":
        digits = p.get("Digits", "")
        if call:
            await _db().voice_calls.update_one({"id": call["id"]}, {"$push": {"collected_digits": digits}})
        routes = (node or {}).get("config", {}).get("routes") or {}
        target = node_by_id(flow, routes.get(digits) or routes.get("default")) if node else None
        if not target:
            attempt = int(q.get("attempt", "1"))
            if attempt >= 3 or not node:
                r.say("We did not receive a valid selection. Goodbye.")
                r.hangup()
                return _xml(str(r))
            return _xml(str(await twilio_render(owner_id, flow, node, settings, base, caller_id, attempt=attempt + 1, prefix="Sorry, that is not a valid option.")))
        if call:
            await mark_node(call, target)
        return _xml(str(await twilio_render(owner_id, flow, target, settings, base, caller_id)))

    if action == "next":
        target = next_node(flow, node) if node else None
        if not target:
            r.hangup()
            return _xml(str(r))
        if call:
            await mark_node(call, target)
        return _xml(str(await twilio_render(owner_id, flow, target, settings, base, caller_id)))

    if action == "dial-result":
        status = p.get("DialCallStatus", "")
        if status == "completed":
            if call:
                await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"disposition": "answered_by_agent"}})
            r.hangup()
            return _xml(str(r))
        target = fallback_node(flow, node) if node else None
        if target:
            if call:
                await mark_node(call, target)
            return _xml(str(await twilio_render(owner_id, flow, target, settings, base, caller_id)))
        r.say("No one is available right now. Please try again later. Goodbye.")
        r.hangup()
        return _xml(str(r))

    if action == "voicemail-done":
        if call:
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"disposition": "voicemail_left"}})
        r.say("Thank you. Your message has been recorded. Goodbye.")
        r.hangup()
        return _xml(str(r))

    r.say("Goodbye.")
    r.hangup()
    return _xml(str(r))


async def twilio_render(owner_id: str, flow: dict, node: dict, settings: dict, base: str, caller_id: str, attempt: int = 1, prefix: str | None = None):
    from twilio.twiml.voice_response import VoiceResponse
    r = VoiceResponse()
    if prefix:
        r.say(prefix)
    kind = node.get("type")
    prompt = node.get("prompt") or ""
    cfg = node.get("config") or {}
    node_q = f"node={node.get('id')}&flow_id={flow['id']}"
    if kind in {"greeting", "play"}:
        if prompt:
            r.say(prompt)
        r.redirect(f"{base}/next?{node_q}", method="POST")
    elif kind == "menu":
        g = r.gather(num_digits=int(cfg.get("num_digits") or 1), timeout=int(cfg.get("timeout") or 6), action=f"{base}/gather?{node_q}&attempt={attempt}", method="POST", action_on_empty_result=True)
        g.say(prompt or "Please make a selection.")
    elif kind in {"queue", "transfer"}:
        if prompt:
            r.say(prompt)
        targets = await resolve_targets(owner_id, node, settings)
        if not targets:
            fb = fallback_node(flow, node)
            r.redirect(f"{base}/next?node={fb['id']}&flow_id={flow['id']}", method="POST") if fb else r.hangup()
        else:
            d = r.dial(caller_id=caller_id, timeout=int(cfg.get("timeout") or 30), action=f"{base}/dial-result?{node_q}", method="POST", answer_on_bridge=True, record="record-from-answer-dual" if settings.get("record_calls") else "do-not-record", recording_status_callback=f"{base}/recording")
            for t in targets:
                if t["kind"] == "client":
                    d.client(t["value"])
                elif t["kind"] == "sip":
                    d.sip(t["value"])
                else:
                    d.number(t["value"])
    elif kind == "voicemail":
        r.say(prompt or "Please leave a message after the tone.")
        r.record(max_length=int(cfg.get("max_seconds") or 120), play_beep=True, action=f"{base}/voicemail-done?{node_q}", method="POST", recording_status_callback=f"{base}/recording", recording_status_callback_event="completed")
    else:
        if prompt:
            r.say(prompt)
        r.hangup()
    return r


# ---------- Plivo ----------
def plivo_signature_ok(url: str, params: dict, supplied: str, nonce: str, token: str) -> bool:
    if not supplied or not nonce:
        return False
    canonical = url + "".join(k + params[k] for k in sorted(params))
    expected = base64.b64encode(hmac.new(token.encode(), (canonical + "." + nonce).encode(), hashlib.sha256).digest()).decode()
    return any(hmac.compare_digest(expected, c.strip()) for c in supplied.split(","))


def px(value) -> str:
    return html.escape(str(value or ""), quote=True)


def plivo_xml(*children: str) -> Response:
    return _xml('<?xml version="1.0" encoding="UTF-8"?><Response>' + "".join(children) + "</Response>")


async def plivo_render(owner_id: str, flow: dict, node: dict, settings: dict, base: str, caller_id: str, attempt: int = 1) -> str:
    kind = node.get("type")
    prompt = node.get("prompt") or ""
    cfg = node.get("config") or {}
    node_q = f"node={node.get('id')}&amp;flow_id={flow['id']}"
    out = ""
    if kind in {"greeting", "play"}:
        out += f"<Speak>{px(prompt)}</Speak>" if prompt else ""
        out += f'<Redirect method="POST">{base}/next?{node_q}</Redirect>'
    elif kind == "menu":
        out += f'<GetDigits action="{base}/input?{node_q}&amp;attempt={attempt}" method="POST" numDigits="{int(cfg.get("num_digits") or 1)}" timeout="{int(cfg.get("timeout") or 6)}" retries="1" redirect="true"><Speak>{px(prompt or "Please make a selection.")}</Speak></GetDigits>'
        out += f'<Redirect method="POST">{base}/input?{node_q}&amp;attempt={attempt}</Redirect>'
    elif kind in {"queue", "transfer"}:
        out += f"<Speak>{px(prompt)}</Speak>" if prompt else ""
        targets = await resolve_targets(owner_id, node, settings)
        numbers = [t for t in targets if t["kind"] in {"number", "sip"}]
        if not numbers:
            fb = fallback_node(flow, node)
            out += f'<Redirect method="POST">{base}/next?node={fb["id"]}&amp;flow_id={flow["id"]}</Redirect>' if fb else "<Hangup/>"
        else:
            record = ' record="true"' if settings.get("record_calls") else ""
            out += f'<Dial callerId="{px(caller_id)}" timeout="{int(cfg.get("timeout") or 30)}" action="{base}/dial-result?{node_q}" method="POST" redirect="true"{record}>'
            for t in numbers:
                out += f"<User>{px(t['value'])}</User>" if t["kind"] == "sip" else f"<Number>{px(t['value'])}</Number>"
            out += "</Dial>"
    elif kind == "voicemail":
        out += f"<Speak>{px(prompt or 'Please leave a message after the tone.')}</Speak>"
        out += f'<Record action="{base}/voicemail-done?{node_q}" method="POST" maxLength="{int(cfg.get("max_seconds") or 120)}" playBeep="true" redirect="true" callbackUrl="{base}/recording" callbackMethod="POST"/>'
    else:
        out += f"<Speak>{px(prompt)}</Speak>" if prompt else ""
        out += "<Hangup/>"
    return out


async def plivo_handle(owner_id: str, action: str, p: dict, q: dict, settings: dict, request: Request):
    base = webhook_base(request, "plivo", owner_id)
    caller_id = settings["credentials"]["phone_number"]
    call_uuid = p.get("CallUUID", "")

    if action == "hangup":
        await apply_status(owner_id, call_uuid, p.get("CallStatus") or "completed", {"duration_seconds": int(p["Duration"])} if p.get("Duration", "").isdigit() else None)
        if not await find_call(owner_id, call_uuid) and p.get("RequestUUID"):
            await _db().voice_calls.update_one({"owner_id": owner_id, "provider_request_id": p["RequestUUID"]}, {"$set": {"provider_call_id": call_uuid, "status": STATUS_MAP.get((p.get("CallStatus") or "").lower(), "completed"), "ended_at": _now()}})
        return {"ok": True}
    if action == "recording":
        await push_recording(owner_id, call_uuid, p.get("RecordUrl"), p.get("RecordingDuration"))
        return {"ok": True}

    if action == "answer":
        direction = p.get("Direction", "inbound")
        if direction == "outbound":
            call = await _db().voice_calls.find_one({"owner_id": owner_id, "provider_request_id": p.get("RequestUUID")}, {"_id": 0})
            if call:
                await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"provider_call_id": call_uuid, "status": "connected", "connected_at": _now()}})
                if call.get("mode") == "flow":
                    flow = await load_flow(owner_id, call.get("flow_id"))
                    node = first_node(flow) if flow else None
                    if node:
                        await mark_node(call, node)
                        return plivo_xml(await plivo_render(owner_id, flow, node, settings, base, caller_id))
                    return plivo_xml("<Speak>Hello. Thank you for your time. Goodbye.</Speak><Hangup/>")
            target = settings.get("agent_fallback_number")
            if not target:
                return plivo_xml("<Speak>No agent is available. Goodbye.</Speak><Hangup/>")
            return plivo_xml(f'<Speak>Please hold while we connect you.</Speak><Dial callerId="{px(caller_id)}" timeout="30"><Number>{px(target)}</Number></Dial>')
        flow = await load_flow(owner_id, q.get("flow_id") or settings.get("default_flow_id"))
        contact = await contact_for(owner_id, p.get("From", ""))
        call = await upsert_call(owner_id, "plivo", call_uuid, {"direction": "inbound", "status": "connected", "from": _e164(p.get("From", "")), "to": _e164(p.get("To", "")), "flow_id": flow and flow["id"], "flow_name": flow and flow["name"], "contact_id": contact and contact["id"], "contact_name": contact and contact["name"], "connected_at": _now()})
        node = first_node(flow) if flow else None
        if not node:
            return plivo_xml("<Speak>Thank you for calling. Our phone menu is not configured yet.</Speak><Hangup/>")
        await mark_node(call, node)
        return plivo_xml(await plivo_render(owner_id, flow, node, settings, base, caller_id))

    call = await find_call(owner_id, call_uuid)
    flow = await load_flow(owner_id, (call or {}).get("flow_id") or q.get("flow_id"))
    if not flow:
        return plivo_xml("<Speak>Goodbye.</Speak><Hangup/>")
    node = node_by_id(flow, q.get("node"))

    if action == "input":
        digits = p.get("Digits", "")
        routes = (node or {}).get("config", {}).get("routes") or {}
        target = node_by_id(flow, routes.get(digits) or routes.get("default")) if node else None
        if call and digits:
            await _db().voice_calls.update_one({"id": call["id"]}, {"$push": {"collected_digits": digits}})
        if not target:
            attempt = int(q.get("attempt", "1"))
            if attempt >= 3 or not node:
                return plivo_xml("<Speak>We did not receive a valid selection. Goodbye.</Speak><Hangup/>")
            return plivo_xml("<Speak>Sorry, that is not a valid option.</Speak>" + await plivo_render(owner_id, flow, node, settings, base, caller_id, attempt=attempt + 1))
        if call:
            await mark_node(call, target)
        return plivo_xml(await plivo_render(owner_id, flow, target, settings, base, caller_id))
    if action == "next":
        target = next_node(flow, node) if node else None
        if not target:
            return plivo_xml("<Hangup/>")
        if call:
            await mark_node(call, target)
        return plivo_xml(await plivo_render(owner_id, flow, target, settings, base, caller_id))
    if action == "dial-result":
        if p.get("DialStatus") == "completed" or p.get("DialBLegStatus") == "completed":
            if call:
                await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"disposition": "answered_by_agent"}})
            return plivo_xml("<Hangup/>")
        target = fallback_node(flow, node) if node else None
        if target:
            if call:
                await mark_node(call, target)
            return plivo_xml(await plivo_render(owner_id, flow, target, settings, base, caller_id))
        return plivo_xml("<Speak>No one is available right now. Goodbye.</Speak><Hangup/>")
    if action == "voicemail-done":
        if call:
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"disposition": "voicemail_left"}})
        await push_recording(owner_id, call_uuid, p.get("RecordUrl"), p.get("RecordingDuration"))
        return plivo_xml("<Speak>Thank you. Your message has been recorded. Goodbye.</Speak><Hangup/>")
    return plivo_xml("<Speak>Goodbye.</Speak><Hangup/>")


# ---------- Telnyx ----------
def telnyx_signature_ok(raw: bytes, signature: str, timestamp: str, public_key_b64: str, max_skew: int = 300) -> bool:
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        if abs(time.time() - int(timestamp)) > max_skew:
            return False
        Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64)).verify(base64.b64decode(signature), timestamp.encode() + b"|" + raw)
        return True
    except Exception:
        return False


async def telnyx_cmd(api_key: str, call_control_id: str, command: str, body: dict | None = None):
    async with httpx.AsyncClient(base_url="https://api.telnyx.com", timeout=15) as client:
        r = await client.post(f"/v2/calls/{call_control_id}/actions/{command}", headers={"Authorization": f"Bearer {api_key}"}, json={"command_id": str(uuid.uuid4()), **(body or {})})
    if r.status_code >= 400:
        log.warning("Telnyx %s failed: %s %s", command, r.status_code, r.text[:300])
    return r


def _telnyx_state(payload: dict) -> dict:
    try:
        return json.loads(base64.b64decode(payload.get("client_state") or "").decode() or "{}")
    except Exception:
        return {}


async def telnyx_run(owner_id: str, call: dict, flow: dict, node: dict, settings: dict):
    """Execute one IVR node through Telnyx Call Control commands and store the pending continuation."""
    key = settings["credentials"]["api_key"]
    cc = call["provider_call_id"]
    kind = node.get("type")
    prompt = node.get("prompt") or ""
    cfg = node.get("config") or {}
    await mark_node(call, node)
    pending = None
    if kind == "menu":
        routes = cfg.get("routes") or {}
        await telnyx_cmd(key, cc, "gather_using_speak", {"payload": prompt or "Please make a selection.", "voice": TELNYX_VOICE, "language": "en-US", "minimum_digits": 1, "maximum_digits": int(cfg.get("num_digits") or 1), "valid_digits": "".join(k for k in routes if k.isdigit() or k in "*#") or "0123456789", "timeout_millis": int(cfg.get("timeout") or 6) * 1000})
        pending = {"kind": "menu", "node": node["id"], "attempt": 1}
    elif kind in {"queue", "transfer"}:
        targets = await resolve_targets(owner_id, node, settings)
        target = next((t for t in targets if t["kind"] in {"number", "sip"}), None)
        if not target:
            fb = fallback_node(flow, node)
            if fb:
                return await telnyx_run(owner_id, call, flow, fb, settings)
            await telnyx_cmd(key, cc, "speak", {"payload": "No one is available right now. Goodbye.", "voice": TELNYX_VOICE, "language": "en-US"})
            pending = {"kind": "hangup"}
        elif prompt:
            await telnyx_cmd(key, cc, "speak", {"payload": prompt, "voice": TELNYX_VOICE, "language": "en-US"})
            pending = {"kind": "transfer", "to": target["value"], "node": node["id"]}
        else:
            await telnyx_transfer(key, cc, target["value"], settings, node.get("id"))
            pending = {"kind": "transferring", "node": node["id"]}
    elif kind == "voicemail":
        await telnyx_cmd(key, cc, "speak", {"payload": prompt or "Please leave a message after the tone.", "voice": TELNYX_VOICE, "language": "en-US"})
        pending = {"kind": "record", "max": int(cfg.get("max_seconds") or 120)}
    elif kind == "hangup":
        if prompt:
            await telnyx_cmd(key, cc, "speak", {"payload": prompt, "voice": TELNYX_VOICE, "language": "en-US"})
            pending = {"kind": "hangup"}
        else:
            await telnyx_cmd(key, cc, "hangup")
    else:
        nxt = next_node(flow, node)
        if prompt:
            await telnyx_cmd(key, cc, "speak", {"payload": prompt, "voice": TELNYX_VOICE, "language": "en-US"})
            pending = {"kind": "next", "node": nxt["id"]} if nxt else {"kind": "hangup"}
        elif nxt:
            return await telnyx_run(owner_id, call, flow, nxt, settings)
        else:
            await telnyx_cmd(key, cc, "hangup")
    await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": pending}})


async def telnyx_transfer(key: str, cc: str, to: str, settings: dict, node_id: str | None):
    body = {"to": to, "from": settings["credentials"]["phone_number"], "timeout_secs": 30, "client_state": base64.b64encode(json.dumps({"leg": "agent", "node": node_id}).encode()).decode()}
    if settings.get("record_calls"):
        await telnyx_cmd(key, cc, "record_start", {"format": "mp3", "channels": "dual"})
    await telnyx_cmd(key, cc, "transfer", body)


async def telnyx_handle(owner_id: str, event: dict, settings: dict, request: Request):
    etype = event.get("event_type", "")
    p = event.get("payload") or {}
    cc = p.get("call_control_id", "")
    key = settings["credentials"]["api_key"]
    state = _telnyx_state(p)
    if state.get("leg") == "agent":
        return  # events for the bridged agent leg are informational
    call = await find_call(owner_id, cc)

    if etype == "call.initiated":
        if p.get("direction") == "incoming":
            flow = await load_flow(owner_id, settings.get("default_flow_id"))
            contact = await contact_for(owner_id, p.get("from", ""))
            await upsert_call(owner_id, "telnyx", cc, {"direction": "inbound", "status": "ringing", "from": p.get("from"), "to": p.get("to"), "flow_id": flow and flow["id"], "flow_name": flow and flow["name"], "contact_id": contact and contact["id"], "contact_name": contact and contact["name"]})
            await telnyx_cmd(key, cc, "answer")
        return
    if etype == "call.answered":
        if not call:
            return
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"status": "connected", "connected_at": _now()}})
        if call.get("direction") == "outbound" and call.get("mode") != "flow":
            target = settings.get("agent_fallback_number")
            if target:
                await telnyx_cmd(key, cc, "speak", {"payload": "Please hold while we connect you.", "voice": TELNYX_VOICE, "language": "en-US"})
                await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "transfer", "to": target}}})
            else:
                await telnyx_cmd(key, cc, "speak", {"payload": "No agent is available right now. Goodbye.", "voice": TELNYX_VOICE, "language": "en-US"})
                await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "hangup"}}})
            return
        flow = await load_flow(owner_id, call.get("flow_id"))
        node = first_node(flow) if flow else None
        if not node:
            await telnyx_cmd(key, cc, "speak", {"payload": "Thank you for calling. Our phone menu is not configured yet.", "voice": TELNYX_VOICE, "language": "en-US"})
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "hangup"}}})
            return
        await telnyx_run(owner_id, call, flow, node, settings)
        return
    if not call:
        return
    pending = call.get("pending") or {}
    flow = await load_flow(owner_id, call.get("flow_id"))

    if etype == "call.speak.ended":
        kind = pending.get("kind")
        if kind == "next" and flow:
            node = node_by_id(flow, pending.get("node"))
            if node:
                return await telnyx_run(owner_id, call, flow, node, settings)
            await telnyx_cmd(key, cc, "hangup")
        elif kind == "transfer":
            await telnyx_transfer(key, cc, pending["to"], settings, pending.get("node"))
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "transferring", "node": pending.get("node")}}})
        elif kind == "record":
            await telnyx_cmd(key, cc, "record_start", {"format": "mp3", "channels": "single", "play_beep": True, "max_length": pending.get("max", 120)})
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "recording"}, "disposition": "voicemail_left"}})
        elif kind == "hangup":
            await telnyx_cmd(key, cc, "hangup")
        return
    if etype == "call.gather.ended" and flow:
        node = node_by_id(flow, pending.get("node"))
        digits = p.get("digits", "")
        await _db().voice_calls.update_one({"id": call["id"]}, {"$push": {"collected_digits": digits}})
        routes = (node or {}).get("config", {}).get("routes") or {}
        target = node_by_id(flow, routes.get(digits) or routes.get("default")) if node else None
        if target:
            return await telnyx_run(owner_id, call, flow, target, settings)
        attempt = int(pending.get("attempt", 1))
        if attempt >= 3 or not node:
            await telnyx_cmd(key, cc, "speak", {"payload": "We did not receive a valid selection. Goodbye.", "voice": TELNYX_VOICE, "language": "en-US"})
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "hangup"}}})
            return
        await telnyx_cmd(key, cc, "gather_using_speak", {"payload": "Sorry, that is not a valid option. " + (node.get("prompt") or ""), "voice": TELNYX_VOICE, "language": "en-US", "minimum_digits": 1, "maximum_digits": 1, "valid_digits": "".join(k for k in routes if k.isdigit() or k in "*#") or "0123456789", "timeout_millis": 6000})
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"pending": {"kind": "menu", "node": node["id"], "attempt": attempt + 1}}})
        return
    if etype == "call.bridged":
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"disposition": "answered_by_agent", "pending": None}})
        return
    if etype == "call.recording.saved":
        urls = p.get("recording_urls") or p.get("public_recording_urls") or {}
        await push_recording(owner_id, cc, urls.get("mp3") or urls.get("wav"), None)
        return
    if etype == "call.hangup":
        duration = None
        try:
            start, end = p.get("start_time"), p.get("end_time")
            if start and end:
                duration = int((datetime.fromisoformat(end.replace("Z", "+00:00")) - datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds())
        except Exception:
            duration = None
        status = "completed" if call.get("status") == "connected" or call.get("connected_at") else STATUS_MAP.get(p.get("hangup_cause", ""), "no_answer")
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"status": status, "ended_at": _now(), "pending": None, **({"duration_seconds": duration} if duration is not None else {})}})
        await finalize_call(owner_id, call["id"])
        return
    if etype in {"call.machine.detection.ended", "call.dtmf.received", "call.playback.ended", "call.speak.started"}:
        return


# ---------- outbound placement ----------
async def place_call(settings: dict, call: dict, base: str):
    provider = settings["provider"]
    creds = settings["credentials"]
    owner_id = call["owner_id"]
    hooks = f"{base}/api/webhooks/voice/{provider}/{owner_id}"
    try:
        if provider == "twilio":
            from twilio.rest import Client as TwClient
            client = TwClient(creds["account_sid"], creds["auth_token"])
            kwargs = {"to": call["to"], "from_": creds["phone_number"], "url": f"{hooks}/outbound", "method": "POST", "status_callback": f"{hooks}/status", "status_callback_event": ["initiated", "ringing", "answered", "completed"], "status_callback_method": "POST"}
            if settings.get("record_calls"):
                kwargs.update({"record": True, "recording_status_callback": f"{hooks}/recording", "recording_status_callback_event": ["completed"]})
            tw = client.calls.create(**kwargs)
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"provider_call_id": tw.sid, "status": STATUS_MAP.get(tw.status, "queued")}})
        elif provider == "telnyx":
            async with httpx.AsyncClient(base_url="https://api.telnyx.com", timeout=15) as client:
                r = await client.post("/v2/calls", headers={"Authorization": f"Bearer {creds['api_key']}"}, json={"connection_id": creds["connection_id"], "to": call["to"], "from": creds["phone_number"], "webhook_url": hooks, "client_state": base64.b64encode(json.dumps({"call_id": call["id"], "mode": call.get("mode")}).encode()).decode()})
            if r.status_code >= 400:
                raise HTTPException(400, f"Telnyx rejected the call: {r.text[:200]}")
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"provider_call_id": r.json()["data"]["call_control_id"], "status": "ringing"}})
        elif provider == "plivo":
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(f"https://api.plivo.com/v1/Account/{creds['auth_id']}/Call/", auth=(creds["auth_id"], creds["auth_token"]), json={"from": creds["phone_number"], "to": call["to"], "answer_url": f"{hooks}/answer", "answer_method": "POST", "hangup_url": f"{hooks}/hangup", "hangup_method": "POST"})
            if r.status_code >= 400:
                raise HTTPException(400, f"Plivo rejected the call: {r.text[:200]}")
            await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"provider_request_id": r.json().get("request_uuid"), "status": "ringing"}})
    except HTTPException:
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"status": "failed", "ended_at": _now(), "disposition": "provider_rejected"}})
        raise
    except Exception as exc:
        await _db().voice_calls.update_one({"id": call["id"]}, {"$set": {"status": "failed", "ended_at": _now(), "disposition": "provider_error", "error": str(exc)[:300]}})
        raise HTTPException(400, f"{PROVIDERS[provider]['label']} call failed: {str(exc)[:200]}")


async def provider_hangup(settings: dict, provider_call_id: str):
    creds = settings["credentials"]
    if settings["provider"] == "twilio":
        from twilio.rest import Client as TwClient
        TwClient(creds["account_sid"], creds["auth_token"]).calls(provider_call_id).update(status="completed")
    elif settings["provider"] == "telnyx":
        await telnyx_cmd(creds["api_key"], provider_call_id, "hangup")
    elif settings["provider"] == "plivo":
        async with httpx.AsyncClient(timeout=15) as client:
            await client.delete(f"https://api.plivo.com/v1/Account/{creds['auth_id']}/Call/{provider_call_id}/", auth=(creds["auth_id"], creds["auth_token"]))


async def provider_test(settings: dict) -> dict:
    creds = settings["credentials"]
    provider = settings["provider"]
    try:
        if provider == "twilio":
            from twilio.rest import Client as TwClient
            client = TwClient(creds["account_sid"], creds["auth_token"])
            account = client.api.accounts(creds["account_sid"]).fetch()
            numbers = [n.phone_number for n in client.incoming_phone_numbers.list(limit=20)]
            softphone = softphone_ready(settings)
            return {"ok": True, "provider": "twilio", "account": account.friendly_name, "status": account.status, "numbers": numbers, "number_owned": creds["phone_number"] in numbers, "softphone_ready": softphone}
        if provider == "telnyx":
            async with httpx.AsyncClient(base_url="https://api.telnyx.com", timeout=15) as client:
                r = await client.get("/v2/phone_numbers", params={"page[size]": 25}, headers={"Authorization": f"Bearer {creds['api_key']}"})
            if r.status_code >= 400:
                raise HTTPException(400, f"Telnyx rejected the API key (status {r.status_code})")
            numbers = [n.get("phone_number") for n in r.json().get("data", [])]
            return {"ok": True, "provider": "telnyx", "numbers": numbers, "number_owned": creds["phone_number"] in numbers, "signature_verification": bool(creds.get("public_key"))}
        if provider == "plivo":
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(f"https://api.plivo.com/v1/Account/{creds['auth_id']}/", auth=(creds["auth_id"], creds["auth_token"]))
                n = await client.get(f"https://api.plivo.com/v1/Account/{creds['auth_id']}/Number/", auth=(creds["auth_id"], creds["auth_token"]))
            if r.status_code >= 400:
                raise HTTPException(400, f"Plivo rejected the credentials (status {r.status_code})")
            numbers = [x.get("number") for x in n.json().get("objects", [])] if n.status_code < 400 else []
            numbers = [x if str(x).startswith("+") else f"+{x}" for x in numbers]
            return {"ok": True, "provider": "plivo", "account": r.json().get("name"), "numbers": numbers, "number_owned": creds["phone_number"] in numbers}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"{PROVIDERS[provider]['label']} test failed: {str(exc)[:200]}")
    raise HTTPException(400, "No provider selected")
