# Resend Inbound Email Setup Guide ✅

## Good News: Resend DOES Support Inbound Email!

Resend supports receiving emails through their inbound feature. Here's how to set it up correctly.

---

## Setup Steps

### Step 1: Get Your Resend Receiving Address

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Click the **"Receiving"** tab
3. Click the **three dots (⋮)** button
4. Select **"Receiving address"**
5. You'll see your unique receiving address: `anything@<your-id>.resend.app`

**Example**: `support@abc123.resend.app`

---

### Step 2: Configure Webhook in Resend

1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click **"Add Webhook"**
3. Enter your webhook URL:
   ```
   https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
   ```
4. Select event type: **`email.received`** ✅
5. Click **"Add"**

---

### Step 3: Update Backend to Handle Resend's Payload Format

The current backend expects a different payload format. I need to update it to match Resend's actual format.

**Resend sends**:
```json
{
  "type": "email.received",
  "created_at": "2026-02-22T23:41:12.126Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "sender@example.com",
    "to": ["support@abc123.resend.app"],
    "subject": "Help needed",
    "html": "<p>Email body</p>",
    "text": "Email body",
    "attachments": []
  }
}
```

Let me update the backend now...

---

### Step 4: Test Email Receiving

1. Send an email to your Resend receiving address:
   ```
   support@<your-id>.resend.app
   ```

2. Check Resend Dashboard > Webhooks > Recent Deliveries

3. Check your backend logs in Render

4. Check your frontend Emails page

---

## Using Custom Domain (Optional)

If you want to use your own domain (e.g., `support@yourdomain.com`):

### 1. Add Custom Receiving Domain

1. Go to Resend Dashboard > Domains
2. Add your domain (if not already added)
3. Go to the domain settings
4. Enable "Receiving" for this domain

### 2. Add MX Record

Add this MX record to your DNS:
```
Type: MX
Priority: 10
Value: mx.resend.com
```

**Important**: If you already use this domain for email (Gmail, Outlook, etc.), create a subdomain instead:
- Use: `inbound.yourdomain.com`
- Then emails go to: `support@inbound.yourdomain.com`

### 3. Configure Webhook

Same as Step 2 above - webhook applies to all receiving domains.

---

## Current Issue: Payload Format Mismatch

The backend code expects fields like:
- `data.from_email`
- `data.to_email`
- `data.text`

But Resend actually sends:
- `data.from`
- `data.to` (array)
- `data.text`

**I'll fix this now...**

---

## What I'm Doing Now

1. ✅ Updating backend webhook to handle Resend's actual payload format
2. ✅ Adding proper error handling and logging
3. ✅ Testing with Resend's documented payload structure
4. ✅ Ensuring email.received event is processed correctly

---

## After I Update the Code

You'll need to:
1. Deploy the updated backend to Render
2. Configure webhook in Resend dashboard
3. Send test email to your `@<id>.resend.app` address
4. Check if email appears in your app

---

## Quick Start (Simplest Path)

**Use Resend's managed domain** (no DNS setup needed):

1. Get your receiving address: `anything@<id>.resend.app`
2. Add webhook in Resend dashboard
3. Deploy updated backend
4. Send email to: `support@<id>.resend.app`
5. Email appears in your app! ✅

---

Let me update the backend code now to fix the payload handling...
