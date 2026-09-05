# Pulse/CRM — PRD

## Original problem statement
> build sass product agentic sales support crm + Freshworks-style channels + Operator-level integration setup with Salesforce-style RBAC + Freshdesk-style helpdesk (invites, SLA, custom fields, auto-assignment, internal notes, canned responses, groups)

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) with `/api` prefix (~1400 lines, ready to split into routers)
- **Frontend**: React 19 + Tailwind 3 brutalist Swiss design
- **Auth**: JWT (bcrypt + pyjwt) with role-resolved permissions
- **AI**: GPT-4 Turbo via OpenAI API
- **Encryption**: Fernet for at-rest credential vault (`INTEGRATIONS_KEY`)
- **DB collections**: users, roles, contacts, deals, activities, emails, tickets, channels, saved_views, integrations, messages, voice_calls, webhook_events, invitations, helpdesk_config, ticket_fields, canned_responses, groups

## RBAC
- 19 permissions, 4 system roles (admin/manager/agent/viewer) + custom roles
- Last-admin demotion guard
- Sidebar nav and pages permission-gated

## Implemented
### MVP, Round A, Round B Phase 1 — see prior versions

### Round B Phase 2 (2026-04-26)
- ✅ Email-invite flow: `/api/invitations` (CRUD) + `/api/invitations/check/:token` (public) + `/api/invitations/accept` (public) → creates user with assigned role + JWT
- ✅ Auto-emails the invite via Resend if configured; else returns invite_url for clipboard copy
- ✅ Last-admin demotion guard with clear 400 error
- ✅ Helpdesk config (`/api/helpdesk/config` GET/PUT) for SLA matrix per priority + assignment mode
- ✅ Auto-assignment: round-robin / load-balanced / channel-mapped / off
- ✅ SLA timers: `first_response_due_at`, `resolution_due_at` set on ticket create from priority
- ✅ `first_responded_at` set when first non-internal comment posted; `resolved_at` set on status flip
- ✅ Custom fields (`/api/ticket-fields`): text/select/number/date/checkbox + required + order
- ✅ Internal vs Public comments (`internal: bool` on TicketCommentIn)
- ✅ Canned responses (`/api/canned-responses` CRUD) with shortcuts
- ✅ Ticket groups/departments (`/api/groups` CRUD)
- ✅ Ticket assignment endpoint (`PATCH /api/tickets/:id/assign`) — scoped to owner_id (security fix)
- ✅ Frontend: `/accept-invite?token=...` page, Settings → Helpdesk tab (5 sections), Settings → Team invite section, rewrote Tickets page with assignee picker, group picker, custom fields, SLA badges (FR/RES + breached), internal/public toggle, canned picker, AI draft button
- ✅ 79/79 backend tests passing (CRM 14 + Round A 10 + Round B P1 30 + Round B P2 25)

### Round C — Real telephony & self-hosted IVR (2026-09-05)
- ✅ Fixed missing `frontend/.env`, switched backend from in-memory mock DB to real local MongoDB (tls only for `mongodb+srv`), fixed lint blockers (dead code, route shadowing, ObjectId leak)
- ✅ New `backend/telephony.py`: provider-neutral IVR engine (greeting/play/menu/queue/transfer/voicemail/hangup, business hours, round-robin/ring-all queues, fallback number, `sip:` / `client:` / extension targets) driven by carrier webhooks
- ✅ Adapters: **Twilio** (TwiML, REST dial, status/recording callbacks, HMAC signature check, Voice JS SDK access tokens, TwiML App `/client` handler), **Telnyx** (Call Control v2 commands + events, Ed25519 verification, event dedupe), **Plivo** (XML answer/input/dial/record, V3 HMAC)
- ✅ Endpoints: `GET/PUT /api/voice/settings`, `POST /api/voice/settings/test`, `GET /api/voice/token`, `POST /api/voice/dial`, `POST /api/voice/calls/{id}/hangup`, `GET /api/voice/calls/live`, `/api/webhooks/voice/{twilio|plivo}/{owner}/{action}`, `/api/webhooks/voice/telnyx/{owner}`; overview + campaign launch now use the real provider when configured
- ✅ Frontend: Telephony tab (provider cards, encrypted creds, webhook URL copy, test connection), Live calls tab (real call log, recordings, click-to-dial agent/flow), Queue members editor (agents/numbers/extensions), global Twilio browser SoftphoneDock (incoming/outgoing, mute, DTMF), click-to-call on Contacts; added missing `.field`/`.btn-secondary` CSS
- ✅ Docs: `docs/TELEPHONY_SETUP.md` (per-carrier credential walkthrough, webhook URLs, env vars, go-live checklist, troubleshooting) + `docs/SELF_HOSTED_DEPLOYMENT.md` (Docker Compose / VM / k8s, hardening, multi-tenant); served at `/docs/*.md`; README links
- ✅ Tested: 36/36 backend pytest (`backend/tests/test_telephony_voice.py`) + full frontend flow (iteration_5)
- ⏳ Waiting on user: real carrier credentials to validate live PSTN audio end-to-end

## P0 Backlog
- Validate with real Twilio/Telnyx/Plivo account once user provides credentials (`PUBLIC_BASE_URL` must be set in production)
- Visual drag-and-drop IVR flow builder (current builder is a linear step list with key→node routes)
- Refactor `server.py` (1400 lines) into `/app/backend/routers/` — flagged 3 iterations now
- Per-tenant scoping for helpdesk_config (currently singleton) when multi-tenant launches
- Webhook signature verification (Twilio HMAC + Svix Resend)
- Validate ticket `custom` keys against active ticket_fields
- Move ticket comments to their own collection (avoid 16MB doc limit at scale)

## P1 Backlog
- Google OAuth full flow (currently only credential storage)
- Email-template editor + variables ({{contact.name}}, etc.)
- Knowledge base / solution articles
- CSAT survey on ticket close
- Ticket merge/split, automation workflows
- Time tracking on tickets
- Reports & analytics (CSAT, FRT, agent leaderboard)

## P2 Backlog
- Embeddable chat widget snippet
- Inbound email parser (Resend Inbound)
- Multilingual support templates
