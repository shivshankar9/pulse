# Action Plan - UI Redesign + Email Fix

## Tasks

### Priority 1: UI Redesigns (Option 1 - All High Priority Pages)
1. ✅ Tickets - DONE
2. 🔄 Emails - In Progress
3. 🔄 WhatsApp - Pending
4. 🔄 Dashboard - Pending  
5. 🔄 Contacts - Pending

### Priority 2: Email Receiving Fix
- Add Email Integration UI to Settings
- Show webhook email address
- Add setup instructions
- Add test functionality

## Current Status

### What's Working
- ✅ Backend webhook endpoint ready
- ✅ Resend webhook code updated
- ✅ Tickets page redesigned beautifully

### What's Needed for Email Receiving
**You need to do these steps in Resend + GoDaddy**:

1. **Add domain to Resend** (billbytekot.in)
2. **Add DNS records in GoDaddy**:
   - MX record: `mx.resend.com` (priority 10)
   - TXT record for verification
   - 3 CNAME records for DKIM
3. **Enable Receiving** in Resend domain settings
4. **Add webhook** in Resend with `email.received` event

**OR use the easy way**:
- Get Resend's managed email: `support@abc123.resend.app`
- Use that directly (no DNS setup needed)

## Next Steps

I'll now redesign the high priority pages one by one with the same beautiful Freshdesk/Zendesk style!

Starting with Emails page...
