# Pulse/CRM — PRD

## Original problem statement
> build sass product agentic sales support crm
> + Round A enhancements + Freshworks-style channels (whatsapp, email, calls)
> + Operator/Manager-level integration setup with multiple custom roles (Salesforce/Freshdesk style)

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) on port 8001 with `/api` prefix
- **Frontend**: React 19 + Tailwind 3 (Brutalist Swiss design)
- **Auth**: JWT (bcrypt + pyjwt), 7-day expiry
- **AI**: Claude Sonnet 4.5 via emergentintegrations (`EMERGENT_LLM_KEY`)
- **Encryption**: Fernet (`INTEGRATIONS_KEY` env) for at-rest credential vault
- **DB collections**: users, roles, contacts, deals, activities, emails, tickets, channels, saved_views, integrations, messages, voice_calls, webhook_events

## RBAC
- 19 permissions across 9 resources (contacts, deals, activities, emails, tickets, channels, ai, settings, roles, users)
- 4 system roles: admin, manager, agent, viewer
- Custom roles can be created with permission matrix
- Role assigned per-user; permissions resolved into JWT user payload
- Sidebar nav and pages gated by permissions

## Implemented (2026-04-26)
### MVP
- ✅ JWT auth with bcrypt + role-aware /auth/me
- ✅ Contacts/Deals/Activities/Emails CRUD
- ✅ Pipeline Kanban with drag-drop
- ✅ AI: lead-score, draft-email, summarize, next-best-action, deal-insight
- ✅ Dashboard KPIs

### Round A
- ✅ Bulk CSV contacts import
- ✅ Saved views/filters
- ✅ Per-deal AI insight drawer
- ✅ Tickets module + comments + public portal at /support
- ✅ Channels page (email/whatsapp/calls/chat scaffolding)

### Round B Phase 1 (today)
- ✅ Settings page with 4 tabs: Integrations / Roles / Team / Webhooks
- ✅ Integration vault (Fernet-encrypted) for Resend, Twilio, Google
- ✅ Test connection endpoints (resend/twilio)
- ✅ Real Resend email send via /api/emails when configured
- ✅ Twilio WhatsApp send (`/api/whatsapp/send`) and Voice call (`/api/voice/call`)
- ✅ Webhooks `/api/webhooks/{resend|whatsapp|voice}/{owner_id}` (no signature verification yet)
- ✅ Inbound WhatsApp creates a ticket automatically; Resend opened event flips email.opened
- ✅ Custom roles CRUD; system roles read-only; users.manage gating
- ✅ Team management — assign roles via dropdown
- ✅ 54/54 backend tests passing

## P0 Backlog
- Webhook signature verification (Twilio + Svix for Resend) before public launch
- Google OAuth full flow (currently only credential storage)
- Multi-user invite by email link

## P1 Backlog
- PATCH endpoints for partial updates (tickets, integrations)
- Rate limiting + CAPTCHA on /api/public/tickets
- Bulk insert_many in CSV import + size cap
- Last-admin demotion guard
- Refactor server.py into routers (auth, rbac, crm, ai, integrations, channels, webhooks)
