# Final Email Receiving Setup Steps ✅

## What I Fixed

I've updated the backend webhook to properly handle Resend's `email.received` event format. The webhook now:
- ✅ Correctly parses Resend's payload structure
- ✅ Handles "Name <email>" format in from field
- ✅ Processes to field as array
- ✅ Extracts text and HTML body
- ✅ Creates email records with proper fields
- ✅ Auto-creates contacts from senders
- ✅ Auto-creates tickets for support emails
- ✅ Better logging for debugging

---

## Your Action Items

### Step 1: Deploy Updated Backend ⚡

The backend code has been updated. You need to deploy it:

1. **Commit and push changes**:
   ```bash
   git add backend/server.py
   git commit -m "Fix Resend inbound email webhook payload handling"
   git push
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)
   - Or manually deploy from Render dashboard

3. **Wait for deployment** to complete (~2-3 minutes)

---

### Step 2: Get Your Resend Receiving Address 📧

1. Go to [Resend Dashboard - Emails](https://resend.com/emails)
2. Click the **"Receiving"** tab
3. Click the **three dots (⋮)** menu button
4. Select **"Receiving address"**
5. Copy your unique address: `anything@<your-id>.resend.app`

**Example**: If your ID is `abc123`, you can use:
- `support@abc123.resend.app`
- `help@abc123.resend.app`
- `info@abc123.resend.app`
- `anything@abc123.resend.app`

---

### Step 3: Configure Webhook in Resend 🔗

1. Go to [Resend Dashboard - Webhooks](https://resend.com/webhooks)

2. Click **"Add Webhook"** button

3. Fill in the form:
   - **Endpoint URL**: 
     ```
     https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
     ```
   - **Events**: Select **`email.received`** ✅
   - **Description** (optional): "Inbound email webhook"

4. Click **"Add"** or **"Create"**

5. Webhook should now show as "Active"

---

### Step 4: Test Email Receiving 🧪

1. **Send a test email** to your Resend receiving address:
   ```
   To: support@<your-id>.resend.app
   Subject: Test Support Request
   Body: This is a test email to verify receiving works.
   ```

2. **Check Resend Dashboard**:
   - Go to Webhooks > Your webhook
   - Click "Recent Deliveries" or "Logs"
   - You should see the webhook POST request
   - Status should be 200 OK

3. **Check Backend Logs** (Render Dashboard):
   - Go to your backend service in Render
   - Click "Logs" tab
   - Look for:
     ```
     Resend webhook received for user b175df83-350d-49f0-9eef-e2f1b2a5164e
     Processed email: from=..., to=..., subject=...
     ✅ Email saved: [email-id]
     ✅ Contact created: [email]
     ✅ Auto-created ticket [ticket-id] from email
     ```

4. **Check Frontend**:
   - Go to https://puls1.vercel.app
   - Login to your account
   - Navigate to **Emails** page
   - You should see the received email
   - Navigate to **Tickets** page
   - You should see the auto-created ticket

---

## Troubleshooting

### Issue: Webhook Returns 404
**Solution**: Make sure backend is deployed with the updated code

### Issue: Webhook Returns 500
**Solution**: Check backend logs in Render for error details

### Issue: No Webhook Triggered
**Solution**: 
- Verify webhook is added in Resend dashboard
- Check `email.received` event is selected
- Verify webhook URL is exactly correct
- Try sending another test email

### Issue: Email Not Showing in Frontend
**Solution**:
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify you're logged in as the correct user
- Check API call to `/api/emails/inbound` works

---

## Using Custom Domain (Optional)

If you want to use your own domain instead of `@<id>.resend.app`:

### 1. Add Domain in Resend
1. Go to Resend Dashboard > Domains
2. Add your domain (if not already added)
3. Verify domain ownership

### 2. Enable Receiving for Domain
1. Go to domain settings in Resend
2. Look for "Receiving" or "Inbound" section
3. Enable receiving for this domain

### 3. Add MX Record to DNS
Add this to your domain's DNS settings:
```
Type: MX
Name: @ (or subdomain like "inbound")
Priority: 10
Value: mx.resend.com
TTL: 3600
```

**⚠️ Warning**: If you already use this domain for email (Gmail, Outlook, etc.), use a subdomain:
- Create subdomain: `inbound.yourdomain.com`
- Add MX record for subdomain only
- Use: `support@inbound.yourdomain.com`

### 4. Wait for DNS Propagation
- Can take 1-48 hours
- Check with: `nslookup -type=MX yourdomain.com`

### 5. Test
Send email to: `support@yourdomain.com` (or subdomain)

---

## Expected Behavior

When everything is working:

1. **Email sent** to `support@<id>.resend.app`
2. **Resend receives** the email
3. **Resend triggers** webhook to your backend
4. **Backend processes** email:
   - Saves email to database
   - Creates contact from sender
   - Creates ticket (if support-related)
5. **Frontend displays**:
   - Email in Emails page
   - Ticket in Tickets page
   - Contact in Contacts page

---

## Quick Test Command

Test webhook directly with curl:

```bash
curl -X POST https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.received",
    "created_at": "2024-01-15T10:00:00Z",
    "data": {
      "email_id": "test-123",
      "from": "customer@example.com",
      "to": ["support@test.resend.app"],
      "subject": "Test Support Request",
      "text": "This is a test email",
      "html": "<p>This is a test email</p>",
      "message_id": "test-msg-123",
      "attachments": []
    }
  }'
```

**Expected Response**:
```json
{
  "ok": true,
  "email_id": "some-uuid",
  "user_id": "b175df83-350d-49f0-9eef-e2f1b2a5164e"
}
```

---

## Summary

✅ **Backend Updated**: Webhook now handles Resend's format correctly
⏳ **Your Turn**: 
1. Deploy backend
2. Get Resend receiving address
3. Add webhook in Resend dashboard
4. Test by sending email

**Estimated Time**: 10 minutes

---

## Need Help?

If you encounter issues:
1. Check backend logs in Render
2. Check webhook logs in Resend dashboard
3. Run the curl test command above
4. Share any error messages you see

The setup should work once you complete these steps! 🚀
