# Custom Domain Email Setup: support@billbytekot.in

## Goal
Receive emails sent to `support@billbytekot.in` in your CRM application.

---

## Step 1: Add Domain to Resend

1. Go to [Resend Dashboard - Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter: `billbytekot.in`
4. Click **"Add"**

---

## Step 2: Verify Domain Ownership

Resend will show you DNS records to add. You need to add these to your domain's DNS settings:

### A. TXT Record (for verification)
```
Type: TXT
Name: @ (or leave blank)
Value: [Resend will provide this]
TTL: 3600
```

### B. DKIM Records (for email authentication)
Resend will provide 3 CNAME records like:
```
Type: CNAME
Name: resend._domainkey
Value: [Resend provides]
TTL: 3600

Type: CNAME
Name: resend2._domainkey
Value: [Resend provides]
TTL: 3600

Type: CNAME
Name: resend3._domainkey
Value: [Resend provides]
TTL: 3600
```

**Where to add these**: Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these DNS records.

---

## Step 3: Add MX Record for Receiving Emails

**⚠️ IMPORTANT**: This will route ALL emails for `billbytekot.in` through Resend.

### Option A: Route ALL emails through Resend (Simple)

Add this MX record:
```
Type: MX
Name: @ (or leave blank for root domain)
Priority: 10
Value: mx.resend.com
TTL: 3600
```

**Result**: All emails to `*@billbytekot.in` will go through Resend.

### Option B: Use Subdomain (Recommended if you have existing email)

If you already use `billbytekot.in` for email (Gmail, Outlook, etc.), create a subdomain:

1. **Create subdomain**: `inbound.billbytekot.in`
2. **Add MX record for subdomain**:
   ```
   Type: MX
   Name: inbound
   Priority: 10
   Value: mx.resend.com
   TTL: 3600
   ```
3. **Use email address**: `support@inbound.billbytekot.in`

**Result**: Only emails to `*@inbound.billbytekot.in` go through Resend. Your main domain email stays unchanged.

---

## Step 4: Enable Receiving in Resend

1. Go to [Resend Dashboard - Domains](https://resend.com/domains)
2. Click on `billbytekot.in` (or `inbound.billbytekot.in`)
3. Look for **"Receiving"** or **"Inbound"** section
4. Toggle **"Enable Receiving"** to ON
5. Save changes

---

## Step 5: Configure Webhook

1. Go to [Resend Dashboard - Webhooks](https://resend.com/webhooks)
2. Click **"Add Webhook"**
3. Enter webhook URL:
   ```
   https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
   ```
4. Select event: **`email.received`** ✅
5. Click **"Add"**

---

## Step 6: Wait for DNS Propagation

DNS changes can take time:
- **Minimum**: 5-10 minutes
- **Typical**: 1-2 hours
- **Maximum**: 24-48 hours

Check DNS propagation:
```bash
# Check MX records
nslookup -type=MX billbytekot.in

# Or use online tool
# https://mxtoolbox.com/SuperTool.aspx?action=mx%3abillbytekot.in
```

You should see:
```
billbytekot.in  MX preference = 10, mail exchanger = mx.resend.com
```

---

## Step 7: Test Email Receiving

1. **Send test email** to: `support@billbytekot.in`
   - From any email account (Gmail, Outlook, etc.)
   - Subject: "Test Support Request"
   - Body: "Testing email receiving"

2. **Check Resend Dashboard**:
   - Go to Emails → Receiving tab
   - You should see the received email
   - Go to Webhooks → Check "Recent Deliveries"
   - Should show 200 OK response

3. **Check Backend Logs** (Render):
   - Look for: "Resend webhook received"
   - Look for: "✅ Email saved"
   - Look for: "✅ Auto-created ticket"

4. **Check Your App**:
   - Go to https://puls1.vercel.app
   - Navigate to Emails page
   - Email should appear!
   - Navigate to Tickets page
   - Ticket should be auto-created!

---

## DNS Configuration Summary

Here's what you need to add to your DNS (at your domain registrar):

### For Full Domain (billbytekot.in)

```
# Verification (Resend provides exact value)
Type: TXT
Name: @
Value: [from Resend]

# DKIM Authentication (Resend provides exact values)
Type: CNAME
Name: resend._domainkey
Value: [from Resend]

Type: CNAME
Name: resend2._domainkey
Value: [from Resend]

Type: CNAME
Name: resend3._domainkey
Value: [from Resend]

# MX Record for Receiving
Type: MX
Name: @
Priority: 10
Value: mx.resend.com
```

### For Subdomain (inbound.billbytekot.in) - Recommended

```
# Verification
Type: TXT
Name: inbound
Value: [from Resend]

# DKIM Authentication
Type: CNAME
Name: resend._domainkey.inbound
Value: [from Resend]

Type: CNAME
Name: resend2._domainkey.inbound
Value: [from Resend]

Type: CNAME
Name: resend3._domainkey.inbound
Value: [from Resend]

# MX Record for Receiving
Type: MX
Name: inbound
Priority: 10
Value: mx.resend.com
```

---

## Important Notes

### ⚠️ If You Already Use billbytekot.in for Email

If you currently receive emails at `billbytekot.in` (e.g., through Gmail, Outlook, cPanel):

**DO NOT** add the MX record to the root domain (@). Instead:

1. **Use subdomain approach**: `inbound.billbytekot.in`
2. **Only add MX record for subdomain**
3. **Your existing email continues to work**
4. **CRM receives at**: `support@inbound.billbytekot.in`

### ✅ If billbytekot.in is NOT Used for Email

If you don't currently receive emails at this domain:

1. **Use root domain**: `billbytekot.in`
2. **Add MX record to root domain**
3. **CRM receives at**: `support@billbytekot.in`

---

## Troubleshooting

### Issue: DNS Not Propagating
**Solution**: 
- Wait longer (can take 24-48 hours)
- Check with: `nslookup -type=MX billbytekot.in`
- Use online tool: https://mxtoolbox.com

### Issue: Domain Not Verified in Resend
**Solution**:
- Check TXT record is added correctly
- Wait for DNS propagation
- Click "Verify" button in Resend dashboard

### Issue: Emails Not Received
**Solution**:
- Verify MX record points to `mx.resend.com`
- Check "Receiving" is enabled in Resend
- Check webhook is configured with `email.received` event
- Send test email and check Resend logs

### Issue: Webhook Returns Error
**Solution**:
- Make sure backend is deployed with updated code
- Check backend logs in Render
- Test webhook with curl command

---

## Quick Checklist

- [ ] Domain added to Resend
- [ ] TXT record added for verification
- [ ] DKIM CNAME records added
- [ ] Domain verified in Resend
- [ ] MX record added (root or subdomain)
- [ ] DNS propagated (check with nslookup)
- [ ] Receiving enabled in Resend dashboard
- [ ] Webhook configured with email.received event
- [ ] Backend deployed with updated code
- [ ] Test email sent
- [ ] Email appears in app

---

## Expected Timeline

1. **Add DNS records**: 5 minutes
2. **DNS propagation**: 1-24 hours
3. **Verify domain in Resend**: 1 minute
4. **Enable receiving**: 1 minute
5. **Configure webhook**: 2 minutes
6. **Test**: 1 minute

**Total**: ~10 minutes + DNS propagation time

---

## What Happens After Setup

When someone sends email to `support@billbytekot.in`:

1. **Email arrives** at Resend's mail server (mx.resend.com)
2. **Resend processes** the email
3. **Resend triggers** webhook to your backend
4. **Backend saves** email to database
5. **Backend creates** contact from sender
6. **Backend creates** support ticket automatically
7. **Frontend displays** email and ticket
8. **You can reply** from the app

---

## Need Help?

If you need help with:
- **DNS configuration**: I can provide exact records
- **Domain registrar**: Tell me which one (GoDaddy, Namecheap, Cloudflare, etc.)
- **Subdomain setup**: I can guide you step-by-step
- **Testing**: I can help debug any issues

Just let me know! 🚀
