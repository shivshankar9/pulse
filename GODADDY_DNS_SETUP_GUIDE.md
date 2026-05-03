# GoDaddy DNS Setup for billbytekot.in Email Receiving

## 📋 Complete Step-by-Step Guide

---

## Part 1: Get DNS Records from Resend (5 minutes)

### Step 1: Add Domain to Resend

1. Go to https://resend.com/domains
2. Click **"Add Domain"** button
3. Enter: `billbytekot.in`
4. Click **"Add"** or **"Continue"**

### Step 2: Copy DNS Records

Resend will show you DNS records. **Keep this page open** - you'll need to copy these values.

You'll see something like:

**TXT Record** (for verification):
```
Name: @
Value: resend-verify=abc123xyz456...
```

**CNAME Records** (for DKIM - 3 records):
```
Name: resend._domainkey
Value: resend1.billbytekot.in.cname.resend.com

Name: resend2._domainkey
Value: resend2.billbytekot.in.cname.resend.com

Name: resend3._domainkey
Value: resend3.billbytekot.in.cname.resend.com
```

---

## Part 2: Add DNS Records in GoDaddy (10 minutes)

### Step 1: Login to GoDaddy

1. Go to https://www.godaddy.com
2. Click **"Sign In"**
3. Login with your credentials

### Step 2: Access DNS Management

1. Click on your **profile icon** (top right)
2. Select **"My Products"**
3. Find **billbytekot.in** in your domains list
4. Click **"DNS"** button next to it
   - Or click the three dots (⋮) → **"Manage DNS"**

### Step 3: Add TXT Record (Verification)

1. Scroll down to **"Records"** section
2. Click **"Add"** button
3. Select **"TXT"** from the Type dropdown
4. Fill in:
   - **Type**: TXT
   - **Name**: @ (or leave blank)
   - **Value**: [Paste the value from Resend - starts with "resend-verify="]
   - **TTL**: 1 Hour (or 3600 seconds)
5. Click **"Save"**

### Step 4: Add CNAME Records (DKIM - 3 records)

**First CNAME Record:**
1. Click **"Add"** button again
2. Select **"CNAME"** from Type dropdown
3. Fill in:
   - **Type**: CNAME
   - **Name**: `resend._domainkey`
   - **Value**: [Paste from Resend - looks like "resend1.billbytekot.in.cname.resend.com"]
   - **TTL**: 1 Hour
4. Click **"Save"**

**Second CNAME Record:**
1. Click **"Add"** button
2. Select **"CNAME"**
3. Fill in:
   - **Type**: CNAME
   - **Name**: `resend2._domainkey`
   - **Value**: [Paste from Resend - looks like "resend2.billbytekot.in.cname.resend.com"]
   - **TTL**: 1 Hour
4. Click **"Save"**

**Third CNAME Record:**
1. Click **"Add"** button
2. Select **"CNAME"**
3. Fill in:
   - **Type**: CNAME
   - **Name**: `resend3._domainkey`
   - **Value**: [Paste from Resend - looks like "resend3.billbytekot.in.cname.resend.com"]
   - **TTL**: 1 Hour
4. Click **"Save"**

### Step 5: Add MX Record (Email Receiving)

⚠️ **IMPORTANT QUESTION**: Do you currently receive emails at billbytekot.in?

#### Option A: If you DON'T currently use billbytekot.in for email

1. **Check existing MX records**:
   - Look in the Records section for any existing MX records
   - If you see MX records pointing to other mail servers, **DELETE them** or set them to lower priority

2. **Add new MX record**:
   - Click **"Add"** button
   - Select **"MX"** from Type dropdown
   - Fill in:
     - **Type**: MX
     - **Name**: @ (or leave blank)
     - **Priority**: 10
     - **Value**: `mx.resend.com`
     - **TTL**: 1 Hour
   - Click **"Save"**

**Result**: Emails to `support@billbytekot.in` will work! ✅

#### Option B: If you DO currently use billbytekot.in for email (RECOMMENDED)

Use a subdomain to avoid breaking existing email:

1. **Add MX record for subdomain**:
   - Click **"Add"** button
   - Select **"MX"** from Type dropdown
   - Fill in:
     - **Type**: MX
     - **Name**: `inbound`
     - **Priority**: 10
     - **Value**: `mx.resend.com`
     - **TTL**: 1 Hour
   - Click **"Save"**

2. **Also add subdomain CNAME records**:
   - Add 3 more CNAME records with names:
     - `resend._domainkey.inbound`
     - `resend2._domainkey.inbound`
     - `resend3._domainkey.inbound`
   - Values: Same as before but for subdomain

**Result**: Emails to `support@inbound.billbytekot.in` will work! ✅
Your existing email at `billbytekot.in` continues to work! ✅

---

## Part 3: Verify Domain in Resend (2 minutes)

### Step 1: Wait a Few Minutes

DNS changes need time to propagate:
- **Minimum**: 5-10 minutes
- **Typical**: 30-60 minutes
- **Maximum**: 24 hours

### Step 2: Verify in Resend

1. Go back to Resend Dashboard → Domains
2. Find `billbytekot.in`
3. Click **"Verify"** button
4. If successful, you'll see ✅ **"Verified"** status

If not verified yet:
- Wait longer (DNS propagation takes time)
- Double-check DNS records in GoDaddy
- Make sure you copied values exactly

---

## Part 4: Enable Receiving in Resend (1 minute)

1. In Resend Dashboard → Domains
2. Click on `billbytekot.in` (or `inbound.billbytekot.in`)
3. Look for **"Receiving"** or **"Inbound"** section
4. Toggle **"Enable Receiving"** to **ON**
5. Click **"Save"** if needed

---

## Part 5: Configure Webhook (2 minutes)

1. Go to https://resend.com/webhooks
2. Click **"Add Webhook"** button
3. Fill in:
   - **Endpoint URL**: 
     ```
     https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
     ```
   - **Events**: Check **`email.received`** ✅
   - **Description** (optional): "Inbound email webhook"
4. Click **"Add"** or **"Create"**

---

## Part 6: Deploy Backend (2 minutes)

Make sure the updated backend code is deployed:

```bash
git add backend/server.py
git commit -m "Fix Resend inbound email webhook"
git push
```

Wait for Render to deploy (~2-3 minutes).

---

## Part 7: Test Email Receiving (1 minute)

### Send Test Email

From any email account (Gmail, Outlook, etc.), send an email:

**If using main domain:**
```
To: support@billbytekot.in
Subject: Test Support Request
Body: This is a test email to verify receiving works.
```

**If using subdomain:**
```
To: support@inbound.billbytekot.in
Subject: Test Support Request
Body: This is a test email to verify receiving works.
```

### Check Results

1. **Resend Dashboard**:
   - Go to Emails → Receiving tab
   - Should see the received email
   - Go to Webhooks → Recent Deliveries
   - Should show 200 OK

2. **Backend Logs** (Render):
   - Go to Render dashboard
   - Open your backend service
   - Click "Logs"
   - Look for:
     ```
     Resend webhook received for user b175df83-350d-49f0-9eef-e2f1b2a5164e
     ✅ Email saved: [id]
     ✅ Contact created: [email]
     ✅ Auto-created ticket [id]
     ```

3. **Your App**:
   - Go to https://puls1.vercel.app
   - Login
   - Go to **Emails** page → Should see the email! 🎉
   - Go to **Tickets** page → Should see auto-created ticket! 🎉

---

## 🎯 Summary of DNS Records to Add in GoDaddy

### For Main Domain (billbytekot.in)

| Type | Name | Value | Priority | TTL |
|------|------|-------|----------|-----|
| TXT | @ | [from Resend] | - | 1 Hour |
| CNAME | resend._domainkey | [from Resend] | - | 1 Hour |
| CNAME | resend2._domainkey | [from Resend] | - | 1 Hour |
| CNAME | resend3._domainkey | [from Resend] | - | 1 Hour |
| MX | @ | mx.resend.com | 10 | 1 Hour |

**Email address**: `support@billbytekot.in`

### For Subdomain (inbound.billbytekot.in) - Recommended if you have existing email

| Type | Name | Value | Priority | TTL |
|------|------|-------|----------|-----|
| TXT | inbound | [from Resend] | - | 1 Hour |
| CNAME | resend._domainkey.inbound | [from Resend] | - | 1 Hour |
| CNAME | resend2._domainkey.inbound | [from Resend] | - | 1 Hour |
| CNAME | resend3._domainkey.inbound | [from Resend] | - | 1 Hour |
| MX | inbound | mx.resend.com | 10 | 1 Hour |

**Email address**: `support@inbound.billbytekot.in`

---

## 🆘 Troubleshooting

### Issue: Can't find DNS management in GoDaddy
**Solution**: 
- Go to https://dcc.godaddy.com/manage/billbytekot.in/dns
- Or: My Products → billbytekot.in → DNS

### Issue: Domain not verifying in Resend
**Solution**:
- Wait 30-60 minutes for DNS propagation
- Check TXT record is added correctly in GoDaddy
- Make sure you copied the exact value from Resend
- Try clicking "Verify" again

### Issue: MX record not accepting value
**Solution**:
- Make sure you're entering just `mx.resend.com` (no http://)
- Priority should be 10
- Name should be @ for root domain or `inbound` for subdomain

### Issue: Emails not being received
**Solution**:
- Check MX record is added and propagated: `nslookup -type=MX billbytekot.in`
- Verify "Receiving" is enabled in Resend
- Check webhook is configured with `email.received` event
- Check backend logs for errors

---

## ✅ Checklist

- [ ] Domain added to Resend
- [ ] TXT record added in GoDaddy
- [ ] 3 CNAME records added in GoDaddy
- [ ] MX record added in GoDaddy
- [ ] Waited 30+ minutes for DNS propagation
- [ ] Domain verified in Resend (shows ✅)
- [ ] Receiving enabled in Resend
- [ ] Webhook configured with email.received event
- [ ] Backend deployed with updated code
- [ ] Test email sent
- [ ] Email appears in app

---

## 📞 Need More Help?

If you get stuck:
1. Take a screenshot of your GoDaddy DNS records
2. Take a screenshot of Resend domain status
3. Share any error messages
4. I'll help you debug!

**Estimated Total Time**: 20-30 minutes + DNS propagation (30-60 min)

Let's get your email receiving working! 🚀
