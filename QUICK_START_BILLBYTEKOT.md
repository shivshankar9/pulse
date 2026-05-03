# Quick Start: Receive Emails at support@billbytekot.in

## 🎯 Goal
Receive customer emails sent to `support@billbytekot.in` in your CRM.

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Add Domain to Resend (5 min)

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `billbytekot.in`
4. Resend will show DNS records to add

### Step 2: Add DNS Records (5 min)

Go to your domain registrar (where you bought billbytekot.in) and add these records:

**A. Verification TXT Record**
```
Type: TXT
Name: @
Value: [Copy from Resend dashboard]
```

**B. DKIM CNAME Records** (3 records)
```
Type: CNAME
Name: resend._domainkey
Value: [Copy from Resend]

Type: CNAME
Name: resend2._domainkey
Value: [Copy from Resend]

Type: CNAME
Name: resend3._domainkey
Value: [Copy from Resend]
```

**C. MX Record for Receiving**
```
Type: MX
Name: @
Priority: 10
Value: mx.resend.com
```

⚠️ **IMPORTANT**: If you already receive emails at billbytekot.in (Gmail, Outlook, etc.), use subdomain instead:
- Use `inbound.billbytekot.in`
- Change MX record Name from `@` to `inbound`
- Emails will go to: `support@inbound.billbytekot.in`

### Step 3: Configure Resend (2 min)

**A. Enable Receiving**
1. Go to Resend → Domains → billbytekot.in
2. Find "Receiving" section
3. Toggle ON
4. Save

**B. Add Webhook**
1. Go to https://resend.com/webhooks
2. Click "Add Webhook"
3. URL: `https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e`
4. Event: Select `email.received` ✅
5. Click "Add"

---

## ⏱️ Wait for DNS (1-24 hours)

DNS changes take time to propagate. Check status:
```bash
nslookup -type=MX billbytekot.in
```

Should show: `mx.resend.com`

---

## ✅ Test It

1. Send email to: `support@billbytekot.in`
2. Check your app: https://puls1.vercel.app
3. Go to Emails page
4. Email should appear! 🎉

---

## 🆘 Need Help?

**Tell me**:
1. Where did you buy billbytekot.in? (GoDaddy, Namecheap, Cloudflare, etc.)
2. Do you currently receive emails at billbytekot.in?
3. Do you want to use subdomain or main domain?

I'll give you exact DNS records to add! 📧
