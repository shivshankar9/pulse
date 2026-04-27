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

## P0 Backlog
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
