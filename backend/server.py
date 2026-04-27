from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import csv
import io
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from cryptography.fernet import Fernet
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', '')
USE_MOCK_DB = os.environ.get('USE_MOCK_DB', 'false').lower() == 'true'

if USE_MOCK_DB or not mongo_url:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
    logging.warning("Using in-memory mock MongoDB — data will not persist between restarts")
else:
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ.get('DB_NAME', 'pulse_crm')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = "HS256"
JWT_EXP_DAYS = 7
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
INTEGRATIONS_KEY = os.environ.get('INTEGRATIONS_KEY')
fernet = Fernet(INTEGRATIONS_KEY.encode()) if INTEGRATIONS_KEY else None

def encrypt_secret(value: str) -> str:
    if not fernet or not value:
        return value
    return fernet.encrypt(value.encode()).decode()

def decrypt_secret(value: str) -> str:
    if not fernet or not value:
        return value
    try:
        return fernet.decrypt(value.encode()).decode()
    except Exception:
        return ""

# ---------- RBAC ----------
ALL_PERMISSIONS = [
    "contacts.read", "contacts.write", "contacts.delete",
    "deals.read", "deals.write", "deals.delete",
    "activities.read", "activities.write", "activities.delete",
    "emails.read", "emails.write",
    "tickets.read", "tickets.write", "tickets.delete",
    "channels.manage",
    "ai.use",
    "settings.manage",
    "roles.manage",
    "users.manage",
]

SYSTEM_ROLES = {
    "admin": {"name": "Admin", "description": "Full access. Manages users, roles, integrations.", "permissions": ALL_PERMISSIONS, "system": True},
    "manager": {"name": "Manager", "description": "Manages CRM data, AI, channels. Cannot edit roles.", "permissions": [p for p in ALL_PERMISSIONS if p not in ("roles.manage", "users.manage")], "system": True},
    "agent": {"name": "Agent", "description": "Day-to-day sales/support. Read+write CRM, no delete or settings.", "permissions": ["contacts.read", "contacts.write", "deals.read", "deals.write", "activities.read", "activities.write", "emails.read", "emails.write", "tickets.read", "tickets.write", "ai.use"], "system": True},
    "viewer": {"name": "Viewer", "description": "Read-only access.", "permissions": ["contacts.read", "deals.read", "activities.read", "emails.read", "tickets.read"], "system": True},
}

app = FastAPI(title="Pulse CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ---------- Helpers ----------
def now_utc_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Resolve permissions from role
    role_id = user.get("role", "admin")
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role and role_id in SYSTEM_ROLES:
        role = {"id": role_id, **SYSTEM_ROLES[role_id]}
    user["permissions"] = role.get("permissions", []) if role else []
    user["role_label"] = role.get("name") if role else "Admin"
    return user

def require_permission(permission: str):
    async def checker(user=Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user
    return checker

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    token: str
    user: dict

class ContactIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    status: Literal["lead", "qualified", "customer", "lost"] = "lead"
    source: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []

class Contact(ContactIn):
    id: str
    owner_id: str
    score: Optional[int] = None
    score_reason: Optional[str] = None
    created_at: str
    updated_at: str

DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]

class DealIn(BaseModel):
    title: str
    contact_id: Optional[str] = None
    company: Optional[str] = None
    value: float = 0.0
    currency: str = "USD"
    stage: Literal["lead", "qualified", "proposal", "negotiation", "won", "lost"] = "lead"
    expected_close: Optional[str] = None
    notes: Optional[str] = None
    probability: int = 20

class DealStageUpdate(BaseModel):
    stage: Literal["lead", "qualified", "proposal", "negotiation", "won", "lost"]

class ActivityIn(BaseModel):
    title: str
    type: Literal["call", "email", "meeting", "task"] = "task"
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False
    notes: Optional[str] = None

class EmailIn(BaseModel):
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    to: EmailStr
    subject: str
    body: str

class AILeadScoreIn(BaseModel):
    contact_id: str

class AIDraftEmailIn(BaseModel):
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    intent: str  # e.g. "follow up after demo", "introduction", "negotiate price"
    tone: Optional[str] = "professional"

class AISummarizeIn(BaseModel):
    text: str
    contact_id: Optional[str] = None

class AINextActionIn(BaseModel):
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None

# ---------- Auth ----------
async def _enrich_user_with_role(user_doc):
    role_id = user_doc.get("role", "admin")
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role and role_id in SYSTEM_ROLES:
        role = SYSTEM_ROLES[role_id]
    user_doc["permissions"] = role.get("permissions", []) if role else []
    user_doc["role_label"] = role.get("name") if role else "Admin"
    return user_doc

@api_router.post("/auth/register", response_model=TokenOut)
async def register(payload: RegisterIn):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "admin",
        "created_at": now_utc_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    user_doc = await _enrich_user_with_role(user_doc)
    return TokenOut(token=token, user=user_doc)

@api_router.post("/auth/login", response_model=TokenOut)
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    user = await _enrich_user_with_role(user)
    return TokenOut(token=token, user=user)

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ---------- Contacts ----------
@api_router.get("/contacts")
async def list_contacts(user=Depends(get_current_user)):
    items = await db.contacts.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/contacts")
async def create_contact(payload: ContactIn, user=Depends(get_current_user)):
    cid = str(uuid.uuid4())
    doc = {
        **payload.model_dump(),
        "id": cid,
        "owner_id": user["id"],
        "score": None,
        "score_reason": None,
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
    }
    await db.contacts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/contacts/{cid}")
async def get_contact(cid: str, user=Depends(get_current_user)):
    c = await db.contacts.find_one({"id": cid, "owner_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Not found")
    return c

@api_router.put("/contacts/{cid}")
async def update_contact(cid: str, payload: ContactIn, user=Depends(get_current_user)):
    update = {**payload.model_dump(), "updated_at": now_utc_iso()}
    res = await db.contacts.update_one({"id": cid, "owner_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    c = await db.contacts.find_one({"id": cid}, {"_id": 0})
    return c

@api_router.delete("/contacts/{cid}")
async def delete_contact(cid: str, user=Depends(get_current_user)):
    await db.contacts.delete_one({"id": cid, "owner_id": user["id"]})
    return {"ok": True}

# ---------- Deals ----------
@api_router.get("/deals")
async def list_deals(user=Depends(get_current_user)):
    items = await db.deals.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/deals")
async def create_deal(payload: DealIn, user=Depends(get_current_user)):
    did = str(uuid.uuid4())
    doc = {
        **payload.model_dump(),
        "id": did,
        "owner_id": user["id"],
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
    }
    await db.deals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/deals/{did}")
async def update_deal(did: str, payload: DealIn, user=Depends(get_current_user)):
    update = {**payload.model_dump(), "updated_at": now_utc_iso()}
    res = await db.deals.update_one({"id": did, "owner_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.deals.find_one({"id": did}, {"_id": 0})

@api_router.patch("/deals/{did}/stage")
async def update_deal_stage(did: str, payload: DealStageUpdate, user=Depends(get_current_user)):
    res = await db.deals.update_one(
        {"id": did, "owner_id": user["id"]},
        {"$set": {"stage": payload.stage, "updated_at": now_utc_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.deals.find_one({"id": did}, {"_id": 0})

@api_router.delete("/deals/{did}")
async def delete_deal(did: str, user=Depends(get_current_user)):
    await db.deals.delete_one({"id": did, "owner_id": user["id"]})
    return {"ok": True}

# ---------- Activities ----------
@api_router.get("/activities")
async def list_activities(user=Depends(get_current_user)):
    items = await db.activities.find({"owner_id": user["id"]}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return items

@api_router.post("/activities")
async def create_activity(payload: ActivityIn, user=Depends(get_current_user)):
    aid = str(uuid.uuid4())
    doc = {
        **payload.model_dump(),
        "id": aid,
        "owner_id": user["id"],
        "created_at": now_utc_iso(),
    }
    await db.activities.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/activities/{aid}")
async def update_activity(aid: str, payload: ActivityIn, user=Depends(get_current_user)):
    res = await db.activities.update_one(
        {"id": aid, "owner_id": user["id"]},
        {"$set": payload.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.activities.find_one({"id": aid}, {"_id": 0})

@api_router.delete("/activities/{aid}")
async def delete_activity(aid: str, user=Depends(get_current_user)):
    await db.activities.delete_one({"id": aid, "owner_id": user["id"]})
    return {"ok": True}

# ---------- Emails (log) ----------
@api_router.get("/emails")
async def list_emails(user=Depends(get_current_user)):
    items = await db.emails.find({"owner_id": user["id"]}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return items

@api_router.post("/emails")
async def log_email(payload: EmailIn, user=Depends(get_current_user)):
    eid = str(uuid.uuid4())
    cfg = await get_decrypted_integration(user["id"], "resend")
    sent_via = "log"
    resend_id = None
    error = None
    if cfg and cfg.get("api_key"):
        try:
            import resend as resend_sdk
            resend_sdk.api_key = cfg["api_key"]
            from_email = cfg.get("from_email") or f"{user.get('name','sender').lower().replace(' ','.')}@onboarding.resend.dev"
            r = resend_sdk.Emails.send({
                "from": from_email,
                "to": [payload.to],
                "subject": payload.subject,
                "html": payload.body.replace("\n", "<br/>"),
            })
            resend_id = (r or {}).get("id") if isinstance(r, dict) else getattr(r, "id", None)
            sent_via = "resend"
        except Exception as e:
            error = str(e)
            sent_via = "log_failed"
    doc = {
        **payload.model_dump(),
        "id": eid,
        "owner_id": user["id"],
        "sent_at": now_utc_iso(),
        "opened": False,
        "sent_via": sent_via,
        "resend_id": resend_id,
        "error": error,
    }
    await db.emails.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ---------- Dashboard ----------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    contacts_count = await db.contacts.count_documents({"owner_id": user["id"]})
    deals = await db.deals.find({"owner_id": user["id"]}, {"_id": 0}).to_list(2000)
    activities = await db.activities.find({"owner_id": user["id"]}, {"_id": 0}).to_list(2000)

    pipeline_value = sum(d.get("value", 0) for d in deals if d.get("stage") not in ("won", "lost"))
    won_value = sum(d.get("value", 0) for d in deals if d.get("stage") == "won")
    open_deals = sum(1 for d in deals if d.get("stage") not in ("won", "lost"))
    won_deals = sum(1 for d in deals if d.get("stage") == "won")
    pending_tasks = sum(1 for a in activities if not a.get("completed"))

    by_stage = {s: {"count": 0, "value": 0} for s in DEAL_STAGES}
    for d in deals:
        s = d.get("stage", "lead")
        by_stage[s]["count"] += 1
        by_stage[s]["value"] += d.get("value", 0)

    return {
        "contacts_count": contacts_count,
        "pipeline_value": pipeline_value,
        "won_value": won_value,
        "open_deals": open_deals,
        "won_deals": won_deals,
        "pending_tasks": pending_tasks,
        "by_stage": by_stage,
    }

# ---------- AI ----------
async def _llm_chat(system: str, user_text: str, session_id: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OpenAI API key not configured")
    
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    
    response = await client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_text}
        ],
        temperature=0.7,
        max_tokens=1000
    )
    
    return response.choices[0].message.content

@api_router.post("/ai/lead-score")
async def ai_lead_score(payload: AILeadScoreIn, user=Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": payload.contact_id, "owner_id": user["id"]}, {"_id": 0})
    if not contact:
        raise HTTPException(404, "Contact not found")

    sys_msg = (
        "You are an expert B2B sales analyst. Score leads from 0 to 100 (higher = better fit). "
        "Respond strictly in JSON format: {\"score\": <int 0-100>, \"reason\": \"<one short sentence>\", "
        "\"signals\": [\"<signal 1>\", \"<signal 2>\", \"<signal 3>\"]}."
    )
    prompt = (
        f"Contact:\nName: {contact.get('name')}\nCompany: {contact.get('company')}\n"
        f"Title: {contact.get('title')}\nStatus: {contact.get('status')}\n"
        f"Source: {contact.get('source')}\nNotes: {contact.get('notes')}\nTags: {', '.join(contact.get('tags') or [])}\n\n"
        "Analyze fit, intent, and engagement signals. Reply JSON only."
    )
    resp = await _llm_chat(sys_msg, prompt, f"score-{payload.contact_id}")

    import json, re
    score, reason, signals = 50, "Unable to parse AI response", []
    try:
        match = re.search(r"\{.*\}", resp, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            score = int(data.get("score", 50))
            reason = data.get("reason", "")
            signals = data.get("signals", [])
    except Exception:
        pass

    await db.contacts.update_one(
        {"id": payload.contact_id, "owner_id": user["id"]},
        {"$set": {"score": score, "score_reason": reason, "updated_at": now_utc_iso()}},
    )
    return {"score": score, "reason": reason, "signals": signals, "raw": resp}

@api_router.post("/ai/draft-email")
async def ai_draft_email(payload: AIDraftEmailIn, user=Depends(get_current_user)):
    context_parts = [f"Sender name: {user.get('name')}"]
    if payload.contact_id:
        c = await db.contacts.find_one({"id": payload.contact_id, "owner_id": user["id"]}, {"_id": 0})
        if c:
            context_parts.append(f"Recipient: {c.get('name')} at {c.get('company') or 'Unknown'} ({c.get('title') or ''})")
            if c.get("notes"):
                context_parts.append(f"Notes about recipient: {c.get('notes')}")
    if payload.deal_id:
        d = await db.deals.find_one({"id": payload.deal_id, "owner_id": user["id"]}, {"_id": 0})
        if d:
            context_parts.append(f"Deal: {d.get('title')} | Value: ${d.get('value')} | Stage: {d.get('stage')}")

    sys_msg = (
        "You are a top-performing B2B sales copywriter. Write concise, personalized sales emails. "
        "Output JSON only: {\"subject\": \"<subject>\", \"body\": \"<email body with newlines>\"}."
    )
    prompt = (
        f"{chr(10).join(context_parts)}\n\nIntent: {payload.intent}\nTone: {payload.tone or 'professional'}\n"
        "Write a short, high-converting email (under 120 words). JSON only."
    )
    resp = await _llm_chat(sys_msg, prompt, f"draft-{user['id']}")

    import json, re
    subject, body = "Following up", resp
    try:
        match = re.search(r"\{.*\}", resp, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            subject = data.get("subject", subject)
            body = data.get("body", body)
    except Exception:
        pass
    return {"subject": subject, "body": body}

@api_router.post("/ai/summarize")
async def ai_summarize(payload: AISummarizeIn, user=Depends(get_current_user)):
    sys_msg = "You are a concise sales assistant. Summarize conversations into 3 bullet points and 1 next action."
    resp = await _llm_chat(sys_msg, payload.text, f"sum-{user['id']}")
    return {"summary": resp}

@api_router.post("/ai/next-best-action")
async def ai_next_action(payload: AINextActionIn, user=Depends(get_current_user)):
    parts = []
    if payload.contact_id:
        c = await db.contacts.find_one({"id": payload.contact_id, "owner_id": user["id"]}, {"_id": 0})
        if c:
            parts.append(f"Contact: {c}")
    if payload.deal_id:
        d = await db.deals.find_one({"id": payload.deal_id, "owner_id": user["id"]}, {"_id": 0})
        if d:
            parts.append(f"Deal: {d}")
    if not parts:
        # Global recommendation
        deals = await db.deals.find({"owner_id": user["id"]}, {"_id": 0}).to_list(50)
        contacts = await db.contacts.find({"owner_id": user["id"]}, {"_id": 0}).to_list(50)
        parts.append(f"Open deals: {len(deals)}; Contacts: {len(contacts)}")
        parts.append(f"Top 5 deals: {deals[:5]}")

    sys_msg = (
        "You are an agentic sales coach. Recommend the SINGLE highest-leverage next action. "
        "Reply with: ACTION: <one line>; WHY: <one sentence>; HOW: <2-3 short steps>."
    )
    resp = await _llm_chat(sys_msg, "\n".join(parts), f"nba-{user['id']}")
    return {"recommendation": resp}

# ---------- Bulk CSV Import ----------
@api_router.post("/contacts/import")
async def import_contacts_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files supported")
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    errors = []
    valid_status = {"lead", "qualified", "customer", "lost"}
    for i, row in enumerate(reader, start=2):
        name = (row.get("name") or row.get("Name") or "").strip()
        if not name:
            errors.append(f"Row {i}: missing name")
            continue
        status_v = (row.get("status") or "lead").strip().lower()
        if status_v not in valid_status:
            status_v = "lead"
        tags_raw = row.get("tags") or ""
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
        doc = {
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            "name": name,
            "email": (row.get("email") or "").strip() or None,
            "phone": (row.get("phone") or "").strip() or None,
            "company": (row.get("company") or "").strip() or None,
            "title": (row.get("title") or "").strip() or None,
            "status": status_v,
            "source": (row.get("source") or "").strip() or None,
            "notes": (row.get("notes") or "").strip() or None,
            "tags": tags,
            "score": None,
            "score_reason": None,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso(),
        }
        await db.contacts.insert_one(doc)
        created += 1
    return {"created": created, "errors": errors}

# ---------- Saved Views ----------
class SavedViewIn(BaseModel):
    name: str
    entity: Literal["contacts", "deals"] = "contacts"
    filters: dict = {}

@api_router.get("/views")
async def list_views(user=Depends(get_current_user)):
    items = await db.saved_views.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api_router.post("/views")
async def create_view(payload: SavedViewIn, user=Depends(get_current_user)):
    doc = {
        **payload.model_dump(),
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "created_at": now_utc_iso(),
    }
    await db.saved_views.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/views/{vid}")
async def delete_view(vid: str, user=Depends(get_current_user)):
    await db.saved_views.delete_one({"id": vid, "owner_id": user["id"]})
    return {"ok": True}

# ---------- Tickets ----------
class TicketIn(BaseModel):
    subject: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    status: Literal["open", "pending", "resolved", "closed"] = "open"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    channel: Literal["portal", "email", "whatsapp", "call", "chat", "internal"] = "internal"
    assignee_id: Optional[str] = None
    group_id: Optional[str] = None
    custom: dict = {}

class TicketCommentIn(BaseModel):
    body: str
    internal: bool = False

class PublicTicketIn(BaseModel):
    workspace_email: EmailStr  # the operator email to route the ticket to
    subject: str
    description: str
    requester_name: str
    requester_email: EmailStr

@api_router.get("/tickets")
async def list_tickets(user=Depends(get_current_user)):
    items = await db.tickets.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/tickets")
async def create_ticket(payload: TicketIn, user=Depends(get_current_user)):
    cfg = await db.helpdesk_config.find_one({}, {"_id": 0}) or {}
    sla_cfg = cfg.get("sla") or SLAConfigIn().model_dump()
    sla_dates = _sla_due_dates(payload.priority, sla_cfg)
    assignee = payload.assignee_id
    if not assignee:
        assignee = await _auto_assign(payload.channel)
    doc = {
        **payload.model_dump(),
        "assignee_id": assignee,
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "comments": [],
        **sla_dates,
        "first_responded_at": None,
        "resolved_at": None,
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/tickets/{tid}")
async def update_ticket(tid: str, payload: TicketIn, user=Depends(get_current_user)):
    update_set = {**payload.model_dump(), "updated_at": now_utc_iso()}
    # If status flipped to resolved, mark resolved_at
    existing = await db.tickets.find_one({"id": tid, "owner_id": user["id"]}, {"_id": 0})
    if existing and payload.status == "resolved" and existing.get("status") != "resolved":
        update_set["resolved_at"] = now_utc_iso()
    res = await db.tickets.update_one(
        {"id": tid, "owner_id": user["id"]},
        {"$set": update_set},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.tickets.find_one({"id": tid}, {"_id": 0})

@api_router.post("/tickets/{tid}/comments")
async def add_ticket_comment(tid: str, payload: TicketCommentIn, user=Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()),
        "author": user["name"],
        "author_id": user["id"],
        "body": payload.body,
        "internal": payload.internal,
        "created_at": now_utc_iso(),
    }
    update_set = {"updated_at": now_utc_iso()}
    # Mark first_responded if this is a public reply by an operator
    if not payload.internal:
        ticket = await db.tickets.find_one({"id": tid, "owner_id": user["id"]}, {"_id": 0})
        if ticket and not ticket.get("first_responded_at"):
            update_set["first_responded_at"] = now_utc_iso()
    res = await db.tickets.update_one(
        {"id": tid, "owner_id": user["id"]},
        {"$push": {"comments": comment}, "$set": update_set},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.tickets.find_one({"id": tid}, {"_id": 0})

@api_router.delete("/tickets/{tid}")
async def delete_ticket(tid: str, user=Depends(get_current_user)):
    await db.tickets.delete_one({"id": tid, "owner_id": user["id"]})
    return {"ok": True}

# Public ticket submission (no auth)
@api_router.post("/public/tickets")
async def public_create_ticket(payload: PublicTicketIn):
    operator = await db.users.find_one({"email": payload.workspace_email.lower()})
    if not operator:
        raise HTTPException(404, "Workspace not found")
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": operator["id"],
        "subject": payload.subject,
        "description": payload.description,
        "contact_id": None,
        "status": "open",
        "priority": "medium",
        "comments": [],
        "source": "public_portal",
        "channel": "portal",
        "requester_name": payload.requester_name,
        "requester_email": payload.requester_email.lower(),
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
    }
    await db.tickets.insert_one(doc)
    return {"ok": True, "ticket_id": doc["id"]}

# ---------- AI: Per-deal insight ----------
class AIDealInsightIn(BaseModel):
    deal_id: str

@api_router.post("/ai/deal-insight")
async def ai_deal_insight(payload: AIDealInsightIn, user=Depends(get_current_user)):
    deal = await db.deals.find_one({"id": payload.deal_id, "owner_id": user["id"]}, {"_id": 0})
    if not deal:
        raise HTTPException(404, "Deal not found")
    contact = None
    if deal.get("contact_id"):
        contact = await db.contacts.find_one({"id": deal["contact_id"]}, {"_id": 0})

    sys_msg = (
        "You are a senior B2B deal strategist. Output in this exact format:\n"
        "RISK: <low|medium|high>\n"
        "WIN_PROBABILITY: <0-100>%\n"
        "BLOCKERS:\n  - <blocker 1>\n  - <blocker 2>\n"
        "MOVES:\n  1. <next move>\n  2. <next move>\n  3. <next move>\n"
        "TALKING_POINTS:\n  - <point>\n  - <point>"
    )
    prompt = f"Deal: {deal}\nContact: {contact}\n\nProvide a concise strategic readout."
    resp = await _llm_chat(sys_msg, prompt, f"insight-{payload.deal_id}")
    return {"insight": resp}

# ---------- Channels (integration config) ----------
class ChannelConfigIn(BaseModel):
    channel: Literal["email", "whatsapp", "calls", "chat"]
    enabled: bool = False
    config: dict = {}

@api_router.get("/channels")
async def list_channels(user=Depends(get_current_user)):
    items = await db.channels.find({"owner_id": user["id"]}, {"_id": 0}).to_list(50)
    return items

@api_router.put("/channels")
async def upsert_channel(payload: ChannelConfigIn, user=Depends(get_current_user)):
    existing = await db.channels.find_one({"owner_id": user["id"], "channel": payload.channel})
    if existing:
        await db.channels.update_one(
            {"owner_id": user["id"], "channel": payload.channel},
            {"$set": {"enabled": payload.enabled, "config": payload.config, "updated_at": now_utc_iso()}},
        )
    else:
        await db.channels.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            "channel": payload.channel,
            "enabled": payload.enabled,
            "config": payload.config,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso(),
        })
    return await db.channels.find_one({"owner_id": user["id"], "channel": payload.channel}, {"_id": 0})

# ---------- Roles ----------
class RoleIn(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[str] = []

@api_router.get("/roles")
async def list_roles(user=Depends(get_current_user)):
    custom = await db.roles.find({}, {"_id": 0}).to_list(200)
    custom_ids = {r["id"] for r in custom}
    items = []
    for rid, base in SYSTEM_ROLES.items():
        if rid not in custom_ids:
            items.append({"id": rid, **base})
    items.extend(custom)
    return items

@api_router.post("/roles")
async def create_role(payload: RoleIn, user=Depends(require_permission("roles.manage"))):
    invalid = [p for p in payload.permissions if p not in ALL_PERMISSIONS]
    if invalid:
        raise HTTPException(400, f"Unknown permissions: {invalid}")
    rid = payload.name.lower().replace(" ", "_")
    if rid in SYSTEM_ROLES:
        raise HTTPException(400, "Cannot use a system role id")
    if await db.roles.find_one({"id": rid}):
        raise HTTPException(400, "Role already exists")
    doc = {
        "id": rid, "name": payload.name, "description": payload.description,
        "permissions": payload.permissions, "system": False,
        "created_at": now_utc_iso(),
    }
    await db.roles.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/roles/{rid}")
async def update_role(rid: str, payload: RoleIn, user=Depends(require_permission("roles.manage"))):
    if rid in SYSTEM_ROLES:
        raise HTTPException(400, "System roles are read-only")
    invalid = [p for p in payload.permissions if p not in ALL_PERMISSIONS]
    if invalid:
        raise HTTPException(400, f"Unknown permissions: {invalid}")
    res = await db.roles.update_one({"id": rid}, {"$set": {"name": payload.name, "description": payload.description, "permissions": payload.permissions, "updated_at": now_utc_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.roles.find_one({"id": rid}, {"_id": 0})

@api_router.delete("/roles/{rid}")
async def delete_role(rid: str, user=Depends(require_permission("roles.manage"))):
    if rid in SYSTEM_ROLES:
        raise HTTPException(400, "System roles cannot be deleted")
    in_use = await db.users.count_documents({"role": rid})
    if in_use > 0:
        raise HTTPException(400, f"Role assigned to {in_use} user(s)")
    await db.roles.delete_one({"id": rid})
    return {"ok": True}

@api_router.get("/permissions")
async def list_permissions(user=Depends(get_current_user)):
    return ALL_PERMISSIONS

# ---------- Users management ----------
class UserRoleUpdateIn(BaseModel):
    role: str

@api_router.get("/users")
async def list_users(user=Depends(require_permission("users.manage"))):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return items

@api_router.patch("/users/{uid}/role")
async def update_user_role(uid: str, payload: UserRoleUpdateIn, user=Depends(require_permission("users.manage"))):
    valid = list(SYSTEM_ROLES.keys()) + [r["id"] for r in await db.roles.find({}, {"id": 1, "_id": 0}).to_list(200)]
    if payload.role not in valid:
        raise HTTPException(400, "Unknown role")
    # Last-admin guard
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    if target.get("role") == "admin" and payload.role != "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(400, "Cannot demote the last admin. Promote another user to admin first.")
    res = await db.users.update_one({"id": uid}, {"$set": {"role": payload.role}})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return u

# ---------- Integrations (per-user secret vault) ----------
class IntegrationIn(BaseModel):
    config: dict  # plaintext keys; will be encrypted

PROVIDER_KEYS = {
    "resend": ["api_key", "from_email"],
    "twilio": ["account_sid", "auth_token", "whatsapp_number", "voice_number"],
    "google": ["client_id", "client_secret", "refresh_token", "calendar_id"],
}

def mask(s: Optional[str]) -> str:
    if not s:
        return ""
    return "•" * max(0, len(s) - 4) + s[-4:]

@api_router.get("/integrations")
async def list_integrations(user=Depends(get_current_user)):
    items = await db.integrations.find({"owner_id": user["id"]}, {"_id": 0}).to_list(20)
    out = {}
    for it in items:
        cfg = it.get("config", {})
        masked = {k: mask(decrypt_secret(v)) for k, v in cfg.items()}
        out[it["provider"]] = {
            "configured": True,
            "config_masked": masked,
            "updated_at": it.get("updated_at"),
        }
    for p in PROVIDER_KEYS:
        if p not in out:
            out[p] = {"configured": False, "config_masked": {}}
    return out

@api_router.put("/integrations/{provider}")
async def upsert_integration(provider: str, payload: IntegrationIn, user=Depends(require_permission("settings.manage"))):
    if provider not in PROVIDER_KEYS:
        raise HTTPException(400, "Unknown provider")
    encrypted = {}
    for k, v in payload.config.items():
        if k in PROVIDER_KEYS[provider] and v:
            encrypted[k] = encrypt_secret(str(v))
    doc = {
        "owner_id": user["id"],
        "provider": provider,
        "config": encrypted,
        "updated_at": now_utc_iso(),
    }
    await db.integrations.update_one(
        {"owner_id": user["id"], "provider": provider},
        {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_utc_iso()}},
        upsert=True,
    )
    return {"ok": True, "provider": provider}

@api_router.delete("/integrations/{provider}")
async def delete_integration(provider: str, user=Depends(require_permission("settings.manage"))):
    await db.integrations.delete_one({"owner_id": user["id"], "provider": provider})
    return {"ok": True}

async def get_decrypted_integration(owner_id: str, provider: str) -> Optional[dict]:
    it = await db.integrations.find_one({"owner_id": owner_id, "provider": provider}, {"_id": 0})
    if not it:
        return None
    return {k: decrypt_secret(v) for k, v in it.get("config", {}).items()}

@api_router.post("/integrations/{provider}/test")
async def test_integration(provider: str, user=Depends(require_permission("settings.manage"))):
    cfg = await get_decrypted_integration(user["id"], provider)
    if not cfg:
        raise HTTPException(400, "Provider not configured")
    if provider == "resend":
        try:
            import resend as resend_sdk
            resend_sdk.api_key = cfg.get("api_key")
            # Use API key to fetch domains (lightweight verify)
            import requests
            r = requests.get("https://api.resend.com/domains", headers={"Authorization": f"Bearer {cfg.get('api_key')}"}, timeout=10)
            if r.status_code >= 400:
                raise HTTPException(400, f"Invalid Resend API key (status {r.status_code})")
            return {"ok": True, "provider": "resend", "info": r.json()}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Resend test failed: {str(e)}")
    if provider == "twilio":
        try:
            from twilio.rest import Client as TwClient
            tw = TwClient(cfg.get("account_sid"), cfg.get("auth_token"))
            acc = tw.api.accounts(cfg.get("account_sid")).fetch()
            return {"ok": True, "provider": "twilio", "account_status": acc.status, "friendly_name": acc.friendly_name}
        except Exception as e:
            raise HTTPException(400, f"Twilio test failed: {str(e)}")
    if provider == "google":
        # Without performing OAuth flow we just confirm presence
        return {"ok": bool(cfg.get("client_id") and cfg.get("client_secret")), "provider": "google", "note": "OAuth flow setup required to fully connect"}
    raise HTTPException(400, "Unknown provider")

# ---------- WhatsApp / Voice via Twilio ----------
class WhatsAppSendIn(BaseModel):
    to: str  # E.164 like +15551234567
    body: str
    contact_id: Optional[str] = None

@api_router.post("/whatsapp/send")
async def whatsapp_send(payload: WhatsAppSendIn, user=Depends(require_permission("tickets.write"))):
    cfg = await get_decrypted_integration(user["id"], "twilio")
    if not cfg or not cfg.get("whatsapp_number"):
        raise HTTPException(400, "Twilio WhatsApp not configured")
    try:
        from twilio.rest import Client as TwClient
        tw = TwClient(cfg["account_sid"], cfg["auth_token"])
        msg = tw.messages.create(
            from_=f"whatsapp:{cfg['whatsapp_number']}",
            to=f"whatsapp:{payload.to}",
            body=payload.body,
        )
    except Exception as e:
        raise HTTPException(500, f"Twilio send failed: {str(e)}")
    doc = {
        "id": str(uuid.uuid4()), "owner_id": user["id"],
        "channel": "whatsapp", "direction": "outbound",
        "to": payload.to, "from": cfg["whatsapp_number"],
        "body": payload.body, "sid": msg.sid, "status": msg.status,
        "contact_id": payload.contact_id, "sent_at": now_utc_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/whatsapp/messages")
async def whatsapp_list(user=Depends(get_current_user)):
    items = await db.messages.find({"owner_id": user["id"], "channel": "whatsapp"}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return items

class VoiceCallIn(BaseModel):
    to: str
    contact_id: Optional[str] = None
    twiml_url: Optional[str] = None

@api_router.post("/voice/call")
async def voice_call(payload: VoiceCallIn, user=Depends(require_permission("activities.write"))):
    cfg = await get_decrypted_integration(user["id"], "twilio")
    if not cfg or not cfg.get("voice_number"):
        raise HTTPException(400, "Twilio Voice not configured")
    try:
        from twilio.rest import Client as TwClient
        tw = TwClient(cfg["account_sid"], cfg["auth_token"])
        # Default TwiML - simple announce, can be replaced by user-supplied URL
        twiml_url = payload.twiml_url or "http://demo.twilio.com/docs/voice.xml"
        call = tw.calls.create(to=payload.to, from_=cfg["voice_number"], url=twiml_url, record=True)
    except Exception as e:
        raise HTTPException(500, f"Twilio call failed: {str(e)}")
    doc = {
        "id": str(uuid.uuid4()), "owner_id": user["id"], "sid": call.sid,
        "to": payload.to, "from": cfg["voice_number"], "status": call.status,
        "contact_id": payload.contact_id, "initiated_at": now_utc_iso(),
        "direction": "outbound", "recording_urls": [],
    }
    await db.voice_calls.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/voice/calls")
async def voice_list(user=Depends(get_current_user)):
    items = await db.voice_calls.find({"owner_id": user["id"]}, {"_id": 0}).sort("initiated_at", -1).to_list(500)
    return items

# ---------- Webhooks (inbound) ----------
@api_router.post("/webhooks/{channel}/{owner_id}")
async def webhook_inbound(channel: str, owner_id: str, request: Request):
    """Generic inbound webhook. Operator points provider here.
    URL pattern: /api/webhooks/{channel}/{owner_id}
    Channels supported: resend, whatsapp, voice
    """
    from fastapi import Request
    raw = await request.body()
    headers = dict(request.headers)
    try:
        data = await request.json()
    except Exception:
        try:
            form = await request.form()
            data = dict(form)
        except Exception:
            data = {}

    if channel == "resend":
        # Resend webhook event types: email.sent, email.delivered, email.opened, etc.
        event_type = data.get("type", "unknown")
        message_id = (data.get("data") or {}).get("email_id") or (data.get("data") or {}).get("id")
        if event_type == "email.opened" and message_id:
            await db.emails.update_one({"id": message_id, "owner_id": owner_id}, {"$set": {"opened": True, "opened_at": now_utc_iso()}})
        await db.webhook_events.insert_one({
            "id": str(uuid.uuid4()), "owner_id": owner_id, "channel": channel,
            "event_type": event_type, "payload": data, "received_at": now_utc_iso(),
        })
        return {"ok": True}

    if channel == "whatsapp":
        # Twilio WhatsApp inbound
        from_number = (data.get("From") or "").replace("whatsapp:", "")
        body = data.get("Body", "")
        sid = data.get("MessageSid")
        # If status callback (delivered/read) update existing message
        status_v = data.get("MessageStatus")
        if status_v and sid:
            await db.messages.update_one({"sid": sid}, {"$set": {"status": status_v, "updated_at": now_utc_iso()}})
        else:
            # New inbound message → create a ticket on first contact
            contact = await db.contacts.find_one({"phone": from_number, "owner_id": owner_id}, {"_id": 0})
            await db.messages.insert_one({
                "id": str(uuid.uuid4()), "owner_id": owner_id, "channel": "whatsapp", "direction": "inbound",
                "from": from_number, "body": body, "sid": sid, "received_at": now_utc_iso(),
                "contact_id": contact["id"] if contact else None,
            })
            await db.tickets.insert_one({
                "id": str(uuid.uuid4()), "owner_id": owner_id, "subject": f"WhatsApp: {body[:60]}",
                "description": body, "channel": "whatsapp", "status": "open", "priority": "medium",
                "contact_id": contact["id"] if contact else None,
                "requester_name": contact["name"] if contact else from_number,
                "requester_email": contact.get("email") if contact else None,
                "comments": [], "created_at": now_utc_iso(), "updated_at": now_utc_iso(),
            })
        return {"ok": True}

    if channel == "voice":
        # Twilio voice status / recording callback
        sid = data.get("CallSid")
        recording_url = data.get("RecordingUrl")
        status_v = data.get("CallStatus")
        if sid and recording_url:
            await db.voice_calls.update_one({"sid": sid}, {"$push": {"recording_urls": {"url": recording_url, "completed_at": now_utc_iso()}}})
        if sid and status_v:
            await db.voice_calls.update_one({"sid": sid}, {"$set": {"status": status_v}})
        return {"ok": True}

    return {"ok": True, "channel": channel, "stored": True}

# ---------- Mount ----------

# ---------- Invitations ----------
class InviteIn(BaseModel):
    email: EmailStr
    role: str = "agent"

class InviteAcceptIn(BaseModel):
    token: str
    name: str
    password: str = Field(min_length=6)

@api_router.get("/invitations")
async def list_invitations(user=Depends(require_permission("users.manage"))):
    items = await db.invitations.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api_router.post("/invitations")
async def create_invitation(payload: InviteIn, user=Depends(require_permission("users.manage"))):
    valid = list(SYSTEM_ROLES.keys()) + [r["id"] for r in await db.roles.find({}, {"id": 1, "_id": 0}).to_list(200)]
    if payload.role not in valid:
        raise HTTPException(400, "Unknown role")
    if await db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(400, "User already exists")
    token = str(uuid.uuid4())
    doc = {
        "id": str(uuid.uuid4()), "token": token,
        "email": payload.email.lower(), "role": payload.role,
        "invited_by": user["id"], "status": "pending",
        "created_at": now_utc_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }
    await db.invitations.insert_one(doc)
    invite_url = f"{os.environ.get('FRONTEND_URL', '')}/accept-invite?token={token}"
    cfg = await get_decrypted_integration(user["id"], "resend")
    sent = False
    if cfg and cfg.get("api_key"):
        try:
            import resend as resend_sdk
            resend_sdk.api_key = cfg["api_key"]
            from_email = cfg.get("from_email") or "onboarding@resend.dev"
            resend_sdk.Emails.send({
                "from": from_email,
                "to": [payload.email],
                "subject": f"You're invited to join {user.get('name','our')} workspace on Pulse/CRM",
                "html": f"<p>{user.get('name')} invited you to Pulse/CRM as <b>{payload.role}</b>.</p><p><a href='{invite_url}'>Accept invitation</a></p>",
            })
            sent = True
        except Exception:
            pass
    doc.pop("_id", None)
    doc["invite_url"] = invite_url
    doc["email_sent"] = sent
    return doc

@api_router.delete("/invitations/{iid}")
async def delete_invitation(iid: str, user=Depends(require_permission("users.manage"))):
    await db.invitations.delete_one({"id": iid})
    return {"ok": True}

@api_router.get("/invitations/check/{token}")
async def check_invitation(token: str):
    inv = await db.invitations.find_one({"token": token, "status": "pending"}, {"_id": 0, "token": 0})
    if not inv:
        raise HTTPException(404, "Invitation not found")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Invitation expired")
    return {"email": inv["email"], "role": inv["role"], "expires_at": inv["expires_at"]}

@api_router.post("/invitations/accept")
async def accept_invitation(payload: InviteAcceptIn):
    inv = await db.invitations.find_one({"token": payload.token, "status": "pending"}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invitation not found or already used")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Invitation expired")
    if await db.users.find_one({"email": inv["email"]}):
        raise HTTPException(400, "User already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id, "email": inv["email"], "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": inv["role"], "created_at": now_utc_iso(),
    }
    await db.users.insert_one(user_doc)
    await db.invitations.update_one({"id": inv["id"]}, {"$set": {"status": "accepted", "accepted_at": now_utc_iso(), "user_id": user_id}})
    token = create_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    user_doc = await _enrich_user_with_role(user_doc)
    return TokenOut(token=token, user=user_doc)

# ---------- Helpdesk: SLA, Custom Fields, Canned, Groups, Auto-assign ----------
class SLAConfigIn(BaseModel):
    low: dict = {"first_response_minutes": 720, "resolution_minutes": 4320}
    medium: dict = {"first_response_minutes": 240, "resolution_minutes": 1440}
    high: dict = {"first_response_minutes": 60, "resolution_minutes": 480}
    urgent: dict = {"first_response_minutes": 15, "resolution_minutes": 240}

class AssignRuleIn(BaseModel):
    mode: Literal["off", "round_robin", "channel", "load_balanced"] = "off"
    eligible_role: str = "agent"
    channel_map: dict = {}

class HelpdeskConfigIn(BaseModel):
    sla: Optional[SLAConfigIn] = None
    assignment: Optional[AssignRuleIn] = None

@api_router.get("/helpdesk/config")
async def get_helpdesk_config(user=Depends(get_current_user)):
    cfg = await db.helpdesk_config.find_one({}, {"_id": 0}) or {}
    if "sla" not in cfg:
        cfg["sla"] = SLAConfigIn().model_dump()
    if "assignment" not in cfg:
        cfg["assignment"] = AssignRuleIn().model_dump()
    return cfg

@api_router.put("/helpdesk/config")
async def update_helpdesk_config(payload: HelpdeskConfigIn, user=Depends(require_permission("settings.manage"))):
    update = {}
    if payload.sla:
        update["sla"] = payload.sla.model_dump()
    if payload.assignment:
        update["assignment"] = payload.assignment.model_dump()
    update["updated_at"] = now_utc_iso()
    await db.helpdesk_config.update_one({}, {"$set": update}, upsert=True)
    return await db.helpdesk_config.find_one({}, {"_id": 0})

class CustomFieldIn(BaseModel):
    label: str
    type: Literal["text", "select", "number", "date", "checkbox"] = "text"
    options: List[str] = []
    required: bool = False
    order: int = 0

@api_router.get("/ticket-fields")
async def list_ticket_fields(user=Depends(get_current_user)):
    return await db.ticket_fields.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.post("/ticket-fields")
async def create_ticket_field(payload: CustomFieldIn, user=Depends(require_permission("settings.manage"))):
    key = payload.label.lower().replace(" ", "_") + "_" + uuid.uuid4().hex[:4]
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "key": key, "created_at": now_utc_iso()}
    await db.ticket_fields.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/ticket-fields/{fid}")
async def delete_ticket_field(fid: str, user=Depends(require_permission("settings.manage"))):
    await db.ticket_fields.delete_one({"id": fid})
    return {"ok": True}

class CannedIn(BaseModel):
    name: str
    body: str
    shortcut: Optional[str] = None

@api_router.get("/canned-responses")
async def list_canned(user=Depends(get_current_user)):
    return await db.canned_responses.find({"owner_id": user["id"]}, {"_id": 0}).sort("name", 1).to_list(200)

@api_router.post("/canned-responses")
async def create_canned(payload: CannedIn, user=Depends(get_current_user)):
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "owner_id": user["id"], "created_at": now_utc_iso()}
    await db.canned_responses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/canned-responses/{cid}")
async def delete_canned(cid: str, user=Depends(get_current_user)):
    await db.canned_responses.delete_one({"id": cid, "owner_id": user["id"]})
    return {"ok": True}

class GroupIn(BaseModel):
    name: str
    description: Optional[str] = ""
    member_ids: List[str] = []

@api_router.get("/groups")
async def list_groups(user=Depends(get_current_user)):
    return await db.groups.find({}, {"_id": 0}).to_list(200)

@api_router.post("/groups")
async def create_group(payload: GroupIn, user=Depends(require_permission("settings.manage"))):
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "created_at": now_utc_iso()}
    await db.groups.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/groups/{gid}")
async def delete_group(gid: str, user=Depends(require_permission("settings.manage"))):
    await db.groups.delete_one({"id": gid})
    return {"ok": True}

# Helpers
async def _eligible_assignees(role_id: str) -> list:
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role and role_id in SYSTEM_ROLES:
        role = SYSTEM_ROLES[role_id]
    perms = role.get("permissions", []) if role else []
    if "tickets.write" not in perms:
        return []
    return await db.users.find({"role": role_id}, {"_id": 0, "password_hash": 0}).to_list(500)

async def _auto_assign(channel: str = "internal") -> Optional[str]:
    cfg = await db.helpdesk_config.find_one({}, {"_id": 0}) or {}
    rule = (cfg.get("assignment") or {})
    mode = rule.get("mode", "off")
    if mode == "off":
        return None
    if mode == "channel":
        return (rule.get("channel_map") or {}).get(channel)
    eligible_role = rule.get("eligible_role", "agent")
    candidates = await _eligible_assignees(eligible_role)
    if not candidates:
        return None
    if mode == "round_robin":
        last = rule.get("last_assigned_index", -1)
        idx = (last + 1) % len(candidates)
        await db.helpdesk_config.update_one({}, {"$set": {"assignment.last_assigned_index": idx}}, upsert=True)
        return candidates[idx]["id"]
    if mode == "load_balanced":
        counts = []
        for c in candidates:
            n = await db.tickets.count_documents({"assignee_id": c["id"], "status": {"$in": ["open", "pending"]}})
            counts.append((n, c["id"]))
        counts.sort()
        return counts[0][1] if counts else None
    return None

def _sla_due_dates(priority: str, sla_cfg: dict) -> dict:
    p = (sla_cfg or {}).get(priority) or {"first_response_minutes": 240, "resolution_minutes": 1440}
    now = datetime.now(timezone.utc)
    return {
        "first_response_due_at": (now + timedelta(minutes=p["first_response_minutes"])).isoformat(),
        "resolution_due_at": (now + timedelta(minutes=p["resolution_minutes"])).isoformat(),
    }

class TicketAssignIn(BaseModel):
    assignee_id: Optional[str] = None
    group_id: Optional[str] = None

@api_router.patch("/tickets/{tid}/assign")
async def assign_ticket(tid: str, payload: TicketAssignIn, user=Depends(require_permission("tickets.write"))):
    update = {"updated_at": now_utc_iso()}
    if "assignee_id" in payload.model_fields_set:
        update["assignee_id"] = payload.assignee_id
    if "group_id" in payload.model_fields_set:
        update["group_id"] = payload.group_id
    res = await db.tickets.update_one({"id": tid, "owner_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.tickets.find_one({"id": tid}, {"_id": 0})

# ---------- Mount ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
