# Pulse/CRM — PRD

## Original problem statement
> build sass product agentic sales support crm

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) on port 8001 with `/api` prefix
- **Frontend**: React 19 + Tailwind 3 (Brutalist Swiss design, Cabinet Grotesk + Satoshi + JetBrains Mono)
- **Auth**: JWT (bcrypt + pyjwt), 7-day expiry
- **AI**: Claude Sonnet 4.5 via emergentintegrations (`EMERGENT_LLM_KEY`)
- **DB collections**: users, contacts, deals, activities, emails

## User Persona
- B2B sales operator (SDR, AE, Sales Manager) wanting an AI-augmented CRM that does the work.

## Core Requirements
- Auth (register/login/me)
- Contacts/Leads CRUD
- Deals pipeline with 6 stages, drag-drop
- Activities/Tasks
- Email composer + sent log
- AI agents: lead scoring, email drafting, conversation summary, next-best-action
- Dashboard with KPIs

## Implemented (2026-04-26)
- ✅ JWT auth (register, login, me) with bcrypt
- ✅ Contacts CRUD + AI lead scoring (`/api/ai/lead-score`)
- ✅ Deals CRUD + Kanban drag-drop with PATCH `/api/deals/:id/stage`
- ✅ Activities/Tasks CRUD with completed toggle
- ✅ Emails compose/log + AI draft (`/api/ai/draft-email`)
- ✅ AI: lead-score, draft-email, summarize, next-best-action
- ✅ Dashboard stats endpoint with stage breakdown
- ✅ Brutalist landing page, auth flow, sidebar app shell
- ✅ Sonner toasts, animations, data-testid throughout

## P0 Backlog
- E2E playwright test pass via testing subagent

## P1 Backlog
- Bulk lead import (CSV)
- Saved views & filters on contacts table
- Email open tracking pixel
- Per-deal AI insight side-drawer

## P2 Backlog
- Team collaboration / multi-user workspaces
- Webhooks + Zapier
- Native email send via SMTP / Gmail integration
- Calendar sync for activities
