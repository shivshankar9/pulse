# Email Integration UI - Mockup

## What Users Will See in Settings

```
┌────────────────────────────────────────────────────────────────┐
│  Settings                                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Profile] [Team] [Integrations] [Email Setup] [Security]     │
│                                   ^^^^^^^^^^^                   │
│                                   (New Tab)                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  📧 Email Receiving Setup                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✨ Easy Setup - No DNS Configuration Required!                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Your Webhook Email Address                              │ │
│  │                                                          │ │
│  │  crm-b175df83@inbound.resend.app                        │ │
│  │  [📋 Copy]                                               │ │
│  │                                                          │ │
│  │  Forward emails to this address to receive them in      │ │
│  │  your CRM automatically.                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─────────────────── Quick Setup ───────────────────────       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🔵 Gmail                                                │ │
│  │                                                          │ │
│  │  [Connect Gmail & Auto-Setup Forwarding]                │ │
│  │                                                          │ │
│  │  One-click setup - we'll automatically configure        │ │
│  │  email forwarding for you.                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🔷 Outlook                                              │ │
│  │                                                          │ │
│  │  [Connect Outlook & Auto-Setup Forwarding]              │ │
│  │                                                          │ │
│  │  One-click setup for Microsoft 365 and Outlook.com     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─────────────────── Manual Setup ──────────────────────       │
│                                                                 │
│  ▼ Gmail Manual Setup                                          │
│  │  1. Open Gmail Settings → Forwarding and POP/IMAP         │
│  │  2. Click "Add a forwarding address"                       │
│  │  3. Enter: crm-b175df83@inbound.resend.app                │
│  │  4. Verify and enable forwarding                           │
│  │  [Open Gmail Settings →]                                   │
│                                                                 │
│  ▼ Outlook Manual Setup                                        │
│  │  1. Open Outlook Settings → Mail → Forwarding             │
│  │  2. Enable forwarding                                      │
│  │  3. Enter: crm-b175df83@inbound.resend.app                │
│  │  4. Save changes                                           │
│  │  [Open Outlook Settings →]                                 │
│                                                                 │
│  ▼ Custom Domain Setup (Advanced)                              │
│  │  For receiving at support@billbytekot.in                   │
│  │  [View DNS Setup Guide →]                                  │
│                                                                 │
│  ─────────────────── Test Setup ────────────────────────       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Test Email Receiving                                    │ │
│  │                                                          │ │
│  │  [Send Test Email]                                       │ │
│  │                                                          │ │
│  │  We'll send a test email to verify your setup is       │ │
│  │  working correctly.                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─────────────────── Status ─────────────────────────          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📊 Email Receiving Status                               │ │
│  │                                                          │ │
│  │  ✅ Webhook configured                                   │ │
│  │  ⏳ Waiting for first email...                          │ │
│  │                                                          │ │
│  │  Last email received: Never                             │ │
│  │  Total emails received: 0                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## After Gmail Connection

```
┌────────────────────────────────────────────────────────────────┐
│  📧 Email Receiving Setup                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ✅ Gmail Connected                                       │ │
│  │                                                          │ │
│  │  📧 your.email@gmail.com                                 │ │
│  │                                                          │ │
│  │  Status: Forwarding Active ✅                            │ │
│  │  Forwarding to: crm-b175df83@inbound.resend.app         │ │
│  │                                                          │ │
│  │  [Disconnect] [Test Connection]                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📊 Email Receiving Status                               │ │
│  │                                                          │ │
│  │  ✅ Webhook configured                                   │ │
│  │  ✅ Gmail forwarding active                              │ │
│  │  ✅ Receiving emails                                     │ │
│  │                                                          │ │
│  │  Last email received: 2 minutes ago                     │ │
│  │  Total emails received: 15                              │ │
│  │                                                          │ │
│  │  [View Received Emails →]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Mobile View

```
┌─────────────────────────┐
│  📧 Email Setup          │
├─────────────────────────┤
│                         │
│  Your Webhook Email:    │
│  ┌───────────────────┐ │
│  │ crm-b175df83@...  │ │
│  │ [Copy]            │ │
│  └───────────────────┘ │
│                         │
│  Quick Setup:           │
│                         │
│  [🔵 Connect Gmail]     │
│                         │
│  [🔷 Connect Outlook]   │
│                         │
│  ▼ Manual Setup         │
│                         │
│  [Send Test Email]      │
│                         │
│  Status: ⏳ Waiting     │
│                         │
└─────────────────────────┘
```

## Features

### 1. Copy Webhook Email
- One-click copy to clipboard
- Toast notification: "Email address copied!"
- Auto-select on click

### 2. Gmail OAuth Flow
```
User clicks "Connect Gmail"
    ↓
Opens Google OAuth popup
    ↓
User grants permission
    ↓
We create forwarding rule via Gmail API
    ↓
Shows success: "Gmail connected! ✅"
    ↓
Emails start flowing to CRM
```

### 3. Manual Setup Guides
- Expandable accordions
- Step-by-step instructions
- Direct links to provider settings
- Screenshots (optional)

### 4. Test Email
- Sends test email to webhook
- Shows real-time status
- Confirms setup is working

### 5. Status Dashboard
- Real-time connection status
- Email count statistics
- Last received timestamp
- Quick link to emails page

---

## Implementation Time

- **UI Components**: 30 minutes
- **Copy functionality**: 5 minutes
- **Manual setup guides**: 10 minutes
- **Test email feature**: 15 minutes
- **Status dashboard**: 20 minutes

**Total for basic UI**: ~1.5 hours

**Gmail OAuth integration**: +2 hours
**Outlook OAuth integration**: +2 hours

---

## Benefits

✅ **No DNS knowledge required**
✅ **Works in minutes, not hours**
✅ **One-click setup for Gmail/Outlook**
✅ **Professional UX**
✅ **Works for all users**
✅ **Easy to maintain**

---

## Want me to build this?

I can start right now! Just say:
- "Build the basic UI" (1.5 hours)
- "Build with Gmail OAuth" (3.5 hours)
- "Build everything" (5.5 hours)

🚀
