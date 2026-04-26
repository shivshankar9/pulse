from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = "HS256"
JWT_EXP_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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
    return user

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
        "created_at": now_utc_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return TokenOut(token=token, user=user_doc)

@api_router.post("/auth/login", response_model=TokenOut)
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    user.pop("password_hash", None)
    user.pop("_id", None)
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
    doc = {
        **payload.model_dump(),
        "id": eid,
        "owner_id": user["id"],
        "sent_at": now_utc_iso(),
        "opened": False,
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
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=user_text)
    return await chat.send_message(msg)

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
