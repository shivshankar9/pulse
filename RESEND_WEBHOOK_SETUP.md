# Resend Email Webhook Setup Guide

## Current Configuration

Your Resend webhook URL is correctly configured as:
```
https://puls1.vercel.app/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
```

## Backend Endpoint

The backend now has a dedicated endpoint that accepts the user ID in the URL path:
- **Endpoint**: `POST /webhooks/resend/{owner_id}`
- **Your User ID**: `b175df83-350d-49f0-9eef-e2f1b2a5164e`

## What the Webhook Does

When Resend receives an email and forwards it to your webhook:

1. **Email Storage**: Saves the email to your database with direction="inbound"
2. **Contact Creation**: Automatically creates a contact from the sender's email
3. **Ticket Auto-Creation**: If the email is sent to support addresses (support@, info@, help@, contact@, service@) OR contains support keywords, it automatically creates a support ticket

## Troubleshooting Steps

### 1. Check if Backend is Deployed
Make sure your backend changes are deployed to production:
```bash
# If using Render, check the deployment logs
# The webhook endpoint should be available at:
https://your-backend-url.onrender.com/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e
```

### 2. Test the Webhook Manually
You can test the webhook using curl:
```bash
curl -X POST https://puls1.vercel.app/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@example.com",
    "to": "support@yourdomain.com",
    "subject": "Test Email",
    "text": "This is a test email body",
    "html": "<p>This is a test email body</p>",
    "message_id": "test-123",
    "created_at": "2024-01-01T00:00:00Z"
  }'
```

### 3. Check Resend Webhook Configuration
In your Resend dashboard:
1. Go to **Webhooks** section
2. Verify the webhook URL is: `https://puls1.vercel.app/api/webhooks/resend/b175df83-350d-49f0-9eef-e2f1b2a5164e`
3. Make sure the webhook is **enabled**
4. Check which events are selected (should include "email.received" or "email.delivered")

### 4. Check Backend Logs
Look for these log messages in your backend:
- `Resend webhook received for user {owner_id}: {payload}`
- `Processed email payload for user {owner_id}: from=..., to=..., subject=...`
- `Email saved: {email_id}`
- `Auto-created ticket {ticket_id} from email to {to_email}`

### 5. Verify User ID
Make sure the user ID in the URL matches your actual user ID in the database:
```python
# Check in your database
db.users.find_one({"id": "b175df83-350d-49f0-9eef-e2f1b2a5164e"})
```

## Common Issues and Solutions

### Issue 1: "User not found" Error
**Solution**: The user ID in the webhook URL doesn't match any user in the database. Update the webhook URL with the correct user ID.

### Issue 2: Emails Not Appearing in Frontend
**Possible Causes**:
- Backend not deployed with latest changes
- Webhook not triggered by Resend
- Database connection issues
- User ID mismatch

**Solution**: 
1. Deploy backend changes
2. Check Resend webhook logs for delivery status
3. Verify database connection
4. Confirm user ID is correct

### Issue 3: Tickets Not Auto-Creating
**Possible Causes**:
- Email not sent to support addresses (support@, info@, help@, contact@, service@)
- Email subject doesn't contain support keywords
- Ticket creation failed (check logs)

**Solution**:
- Send test email to support@yourdomain.com
- Include keywords like "help", "support", "issue" in subject
- Check backend logs for ticket creation errors

## Resend Webhook Payload Format

Resend sends webhooks in this format:
```json
{
  "type": "email.received",
  "created_at": "2024-01-01T00:00:00.000Z",
  "data": {
    "from": "sender@example.com",
    "to": ["support@yourdomain.com"],
    "subject": "Need help with...",
    "text": "Email body in plain text",
    "html": "<p>Email body in HTML</p>",
    "message_id": "<unique-message-id>",
    "headers": {...}
  }
}
```

Our webhook handler processes both formats:
- Direct payload: `{from, to, subject, ...}`
- Wrapped payload: `{data: {from, to, subject, ...}}`

## Next Steps

1. **Deploy Backend**: Make sure the latest backend code is deployed
2. **Test Webhook**: Send a test email to your support address
3. **Check Frontend**: Refresh the Emails page to see received emails
4. **Verify Tickets**: Check the Tickets page for auto-created tickets

## Support Email Addresses

Emails sent to these addresses will automatically create tickets:
- support@yourdomain.com
- info@yourdomain.com
- help@yourdomain.com
- contact@yourdomain.com
- service@yourdomain.com

## Support Keywords

Emails with these keywords in the subject will also create tickets:
- support, help, issue, problem, bug, error, complaint, question

## Priority Assignment

Tickets are automatically assigned priority based on keywords:
- **High**: urgent, critical, emergency, asap
- **Low**: low, minor, question, info
- **Medium**: default for all others

## Category Assignment

Tickets are automatically categorized based on content:
- **Bug**: bug, error, broken, not working
- **Feature Request**: feature, request, enhancement, improvement
- **Billing**: billing, payment, invoice, subscription
- **Account**: account, login, password, access
- **General**: default category
