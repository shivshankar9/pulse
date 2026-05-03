# Email Receiving Troubleshooting Guide

## Issue: Unable to Receive Emails

### Your Webhook URL
```
https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
```

---

## Step 1: Verify Backend is Running

1. Check if your backend is deployed and running on Render
2. Visit: `https://puls1.onrender.com/health`
3. You should see a response indicating the server is healthy

---

## Step 2: Test the Webhook Locally

Run the test script to verify the webhook endpoint works:

```bash
python test_resend_webhook.py
```

This will:
- Check if backend is accessible
- Send test payloads to your webhook
- Show you the response

**Expected Result**: Status 200 with email_id and user_id in response

---

## Step 3: Check Resend Configuration

### A. Verify Webhook is Added in Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Check if webhook exists with URL:
   ```
   https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
   ```

### B. Verify Webhook Events

Make sure these events are selected:
- ✅ `email.received` (for inbound emails)
- ✅ `email.delivered` (optional, for delivery confirmation)

### C. Check Webhook Status

In Resend dashboard:
- Webhook should show as "Active"
- Check "Recent Deliveries" for any failed attempts
- Look for error messages

---

## Step 4: Configure Inbound Email Routing in Resend

**IMPORTANT**: Resend needs to know which emails to forward to your webhook.

### Option A: Domain-based Routing (Recommended)

1. Go to Resend Dashboard > Domains
2. Select your domain
3. Go to "Inbound" or "Email Routing" section
4. Add routing rule:
   - **Match**: `support@yourdomain.com` (or `*@yourdomain.com` for all)
   - **Forward to**: Your webhook URL
   - **Action**: Forward to webhook

### Option B: Email Address Routing

1. Create specific email addresses in Resend
2. Configure each to forward to your webhook
3. Common addresses to set up:
   - `support@yourdomain.com`
   - `info@yourdomain.com`
   - `help@yourdomain.com`
   - `contact@yourdomain.com`

---

## Step 5: Verify DNS Records

For inbound email to work, you need proper MX records:

1. Go to your domain DNS settings
2. Add MX records provided by Resend:
   ```
   Priority: 10
   Value: mx1.resend.com
   
   Priority: 20
   Value: mx2.resend.com
   ```

3. Verify DNS propagation (can take up to 48 hours):
   ```bash
   nslookup -type=MX yourdomain.com
   ```

---

## Step 6: Test Email Receiving

### A. Send Test Email

Send an email to: `support@yourdomain.com`

### B. Check Resend Logs

1. Go to Resend Dashboard > Logs
2. Look for incoming email
3. Check if webhook was triggered
4. Look for any error messages

### C. Check Backend Logs

1. Go to Render Dashboard
2. Open your backend service
3. View logs
4. Look for:
   ```
   Resend webhook received for user b175df83-350d-49f0-9eef-e2f1b2a5164e
   Email saved: [email-id]
   ```

### D. Check Frontend

1. Go to your app: `https://puls1.vercel.app`
2. Navigate to Emails page
3. Look for the received email
4. Refresh if needed

---

## Common Issues and Solutions

### Issue 1: Webhook Returns 404

**Cause**: URL is incorrect or backend not deployed

**Solution**:
- Verify backend is running: `https://puls1.onrender.com/health`
- Check URL exactly matches: `/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e`
- Ensure user ID is correct

### Issue 2: Webhook Returns 500

**Cause**: Server error processing the webhook

**Solution**:
- Check backend logs in Render dashboard
- Look for Python errors or stack traces
- Verify database connection is working

### Issue 3: No Emails Received

**Cause**: Resend not forwarding emails to webhook

**Solution**:
- Verify inbound routing is configured in Resend
- Check MX records are set correctly
- Verify domain is verified in Resend
- Send test email and check Resend logs

### Issue 4: Emails Received but Not Showing in Frontend

**Cause**: Frontend not fetching or displaying emails

**Solution**:
- Check browser console for errors
- Verify API endpoint `/api/emails/inbound` works
- Check if user is logged in correctly
- Try hard refresh (Ctrl+Shift+R)

### Issue 5: Webhook Timeout

**Cause**: Backend taking too long to respond

**Solution**:
- Check database connection speed
- Verify Render service is not sleeping (free tier)
- Consider upgrading Render plan for better performance

---

## Debugging Checklist

Use this checklist to systematically debug:

- [ ] Backend is deployed and running
- [ ] Health endpoint responds: `https://puls1.onrender.com/health`
- [ ] Webhook endpoint exists in code
- [ ] Webhook URL is correct in Resend
- [ ] Webhook events are selected in Resend
- [ ] Inbound routing is configured in Resend
- [ ] MX records are set correctly
- [ ] Domain is verified in Resend
- [ ] Test email sent to support address
- [ ] Resend logs show email received
- [ ] Resend logs show webhook triggered
- [ ] Backend logs show webhook received
- [ ] Backend logs show email saved
- [ ] Frontend shows received email

---

## Manual Testing with cURL

Test the webhook directly:

```bash
curl -X POST https://puls1.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "from": "test@example.com",
      "to": ["support@yourdomain.com"],
      "subject": "Test Email",
      "text": "This is a test",
      "message_id": "test-123",
      "created_at": "2024-01-15T10:00:00Z"
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

## Alternative: Check if Resend Supports Inbound Email

**IMPORTANT**: Not all Resend plans support inbound email routing!

1. Check your Resend plan features
2. Inbound email might require:
   - Pro plan or higher
   - Custom domain setup
   - Additional configuration

If Resend doesn't support inbound on your plan, consider:
- **SendGrid** (has inbound email parsing)
- **Mailgun** (has inbound routing)
- **Postmark** (has inbound email support)
- **AWS SES** (with SNS/Lambda)

---

## Contact Support

If issues persist:

1. **Resend Support**:
   - Email: support@resend.com
   - Ask about inbound email configuration
   - Provide your webhook URL and domain

2. **Check Resend Documentation**:
   - [Resend Webhooks](https://resend.com/docs/webhooks)
   - [Resend Inbound Email](https://resend.com/docs/inbound)

---

## Quick Fix: Use Alternative Email Provider

If Resend doesn't support inbound email on your plan, I can help you set up:

1. **SendGrid Inbound Parse** - Free tier available
2. **Mailgun Routes** - Free tier available
3. **Generic Webhook** - Works with any provider

Let me know which provider you'd like to use!

---

## Next Steps

1. Run `python test_resend_webhook.py` to test webhook
2. Check Resend dashboard for inbound routing configuration
3. Verify MX records are set
4. Send test email and check logs
5. Report back with any error messages you see

---

## Success Indicators

You'll know it's working when:
- ✅ Test script returns 200 status
- ✅ Resend logs show webhook triggered
- ✅ Backend logs show "Email saved"
- ✅ Email appears in frontend Emails page
- ✅ Ticket auto-created for support emails
