# Custom Domain Email Integration Setup Guide

## Overview

This guide walks you through setting up custom domain email integration for your CRM system. You'll be able to:

- Send emails from your business domain (e.g., support@yourbusiness.com)
- Receive emails directly into your CRM
- Automatically create tickets from support emails
- Maintain professional branding in all communications

## Prerequisites

1. **Domain ownership**: You must own the domain you want to use
2. **DNS access**: Ability to add DNS records to your domain
3. **Email provider**: Choose from Resend (recommended), SendGrid, or custom SMTP

## Step 1: Choose Your Email Provider

### Option A: Resend (Recommended)
- ✅ Easy setup with excellent deliverability
- ✅ 100 emails/day free tier
- ✅ Real-time tracking and analytics
- ✅ Automatic DKIM signing
- ✅ Best for startups and small businesses

### Option B: SendGrid
- ✅ Enterprise-grade features
- ✅ Advanced analytics and A/B testing
- ✅ 100 emails/day free tier
- ✅ Best for growing businesses

### Option C: Custom SMTP
- ✅ Complete control over email infrastructure
- ✅ Works with any SMTP provider
- ✅ No third-party dependencies
- ✅ Best for enterprises with existing email infrastructure

## Step 2: Add Your Domain

1. **Navigate to Settings**
   - Go to Settings → Domains & Email tab
   - Click "Add New Domain" section

2. **Enter Domain Details**
   - Domain Name: `yourbusiness.com` (without http:// or www)
   - Email Provider: Select your chosen provider
   - Click "Add Domain"

3. **Get DNS Records**
   - After adding, click "Show DNS" to view required records
   - You'll see different records based on your provider

## Step 3: Configure DNS Records

### For Resend Provider

Add these DNS records to your domain registrar:

```
Type: TXT
Name: _resend.yourbusiness.com
Value: resend-verify=abc123def456
Purpose: Domain verification

Type: TXT  
Name: yourbusiness.com
Value: v=spf1 include:_spf.resend.com ~all
Purpose: SPF record

Type: TXT
Name: resend._domainkey.yourbusiness.com  
Value: [DKIM key provided after verification]
Purpose: DKIM signature

Type: TXT
Name: _dmarc.yourbusiness.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourbusiness.com
Purpose: DMARC policy
```

### For SendGrid Provider

```
Type: CNAME
Name: em1234.yourbusiness.com
Value: sendgrid.net
Purpose: Email routing

Type: CNAME
Name: s1._domainkey.yourbusiness.com
Value: s1.domainkey.sendgrid.net
Purpose: DKIM signature

Type: CNAME  
Name: s2._domainkey.yourbusiness.com
Value: s2.domainkey.sendgrid.net
Purpose: DKIM signature

Type: TXT
Name: yourbusiness.com
Value: v=spf1 include:sendgrid.net ~all
Purpose: SPF record
```

### For Custom SMTP

```
Type: TXT
Name: yourbusiness.com
Value: v=spf1 a mx ~all
Purpose: SPF record

Type: TXT
Name: _dmarc.yourbusiness.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourbusiness.com
Purpose: DMARC policy
```

## Step 4: Add DNS Records to Your Registrar

### GoDaddy
1. Log into GoDaddy account
2. Go to "My Products" → "DNS"
3. Click "Manage" next to your domain
4. Add each DNS record using the "Add" button
5. Select record type (TXT/CNAME)
6. Enter Name and Value exactly as shown
7. Save changes

### Namecheap
1. Log into Namecheap account
2. Go to "Domain List" → "Manage"
3. Click "Advanced DNS" tab
4. Add new records using "Add New Record"
5. Select Type, enter Host and Value
6. Save all changes

### Cloudflare
1. Log into Cloudflare dashboard
2. Select your domain
3. Go to "DNS" → "Records"
4. Click "Add record"
5. Select Type, enter Name and Content
6. Set Proxy status to "DNS only" (gray cloud)
7. Save

### Other Registrars
- Look for "DNS Management", "DNS Records", or "Advanced DNS"
- Add records with exact Type, Name/Host, and Value
- TTL can be left as default (usually 3600 or Auto)

## Step 5: Verify Domain

1. **Wait for DNS Propagation**
   - DNS changes can take up to 24 hours
   - Usually propagates within 1-2 hours
   - Use online DNS checkers to verify

2. **Verify in CRM**
   - Go back to Settings → Domains & Email
   - Click "Verify" button next to your domain
   - System will check all DNS records
   - Status will change to "Verified" when successful

## Step 6: Configure Email Receiving

### Set Up Webhook (For Inbound Emails)

1. **Get Webhook URL**
   - In Settings → Domains & Email
   - Copy the webhook URL shown at the top
   - Format: `https://yourcrm.com/api/webhooks/resend/your-user-id`

2. **Configure in Resend Dashboard**
   - Log into resend.com
   - Go to "Webhooks" section
   - Click "Add Webhook"
   - Paste your webhook URL
   - Select "email.received" event
   - Save webhook

3. **Configure Email Addresses**
   - In Resend, go to "Domains" → Your domain
   - Set up email addresses like:
     - `support@yourbusiness.com`
     - `info@yourbusiness.com`
     - `help@yourbusiness.com`
   - Enable "Inbound" for each address

## Step 7: Test Your Setup

### Test Outbound Email
1. Go to Emails page in your CRM
2. Click "Compose" 
3. Send a test email
4. Check that it arrives and shows your domain in "From" field

### Test Inbound Email
1. Send an email TO your support address
2. Check that it appears in Emails page
3. Verify that a ticket was created (for support addresses)
4. Confirm webhook is working

## Step 8: Configure Integration Settings

### Update Email Integration
1. Go to Settings → Integrations
2. Configure your email provider:
   - **Resend**: Add API key and set from_email to your domain
   - **SendGrid**: Add API key and configure from_email/from_name
   - **SMTP**: Enter your SMTP server details

### Set Default From Address
- Update `from_email` to use your custom domain
- Example: `no-reply@yourbusiness.com`
- This will be used for all outbound emails

## Troubleshooting

### Domain Not Verifying
- **Check DNS records**: Use online DNS lookup tools
- **Wait longer**: DNS can take up to 24 hours
- **Check spelling**: Ensure exact match of record names/values
- **Contact registrar**: Some registrars have specific requirements

### Emails Not Sending
- **Check integration settings**: Verify API keys are correct
- **Test provider directly**: Send test email through provider dashboard
- **Check domain status**: Ensure domain is verified
- **Review error logs**: Check for specific error messages

### Emails Not Receiving
- **Verify webhook URL**: Ensure it's correctly configured
- **Check webhook events**: Confirm "email.received" is selected
- **Test webhook**: Send test email and check logs
- **Verify inbound setup**: Ensure email addresses are configured for receiving

### Common DNS Issues
- **TTL too high**: Set TTL to 300-3600 seconds
- **Proxy enabled**: Disable proxy (Cloudflare gray cloud)
- **Wrong record type**: Ensure TXT vs CNAME is correct
- **Missing @ symbol**: Some registrars require @ for root domain

## Security Best Practices

### SPF Records
- Always include your email provider in SPF
- Use `~all` (soft fail) initially, then `-all` (hard fail) when confident
- Don't exceed 10 DNS lookups in SPF record

### DKIM Signing
- Enable DKIM in your email provider
- Add DKIM DNS records as provided
- Rotate DKIM keys periodically

### DMARC Policy
- Start with `p=none` for monitoring
- Gradually move to `p=quarantine` then `p=reject`
- Monitor DMARC reports regularly

## Advanced Configuration

### Multiple Domains
- Add multiple domains for different brands/departments
- Each domain can use different email providers
- Configure separate webhook URLs if needed

### Subdomain Setup
- Use subdomains for different purposes:
  - `support.yourbusiness.com`
  - `marketing.yourbusiness.com`
  - `noreply.yourbusiness.com`

### Email Routing Rules
- Set up rules to route emails to specific teams
- Configure auto-assignment based on email address
- Create different ticket categories for different addresses

## Monitoring and Maintenance

### Regular Checks
- Monitor email deliverability rates
- Check DNS record status monthly
- Review bounce and complaint rates
- Update DKIM keys as recommended

### Performance Optimization
- Monitor email sending volumes
- Optimize email templates for better engagement
- A/B test subject lines and content
- Track open and click rates

## Support Resources

### Documentation Links
- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [DNS Record Types Explained](https://www.cloudflare.com/learning/dns/dns-records/)

### Tools for Testing
- [MX Toolbox](https://mxtoolbox.com) - DNS and email testing
- [Mail Tester](https://www.mail-tester.com) - Email deliverability testing
- [DMARC Analyzer](https://www.dmarcanalyzer.com) - DMARC report analysis

### Getting Help
- Check the CRM logs for specific error messages
- Contact your email provider support for delivery issues
- Reach out to your domain registrar for DNS problems
- Use the CRM support system for integration questions

---

## Quick Setup Checklist

- [ ] Choose email provider (Resend recommended)
- [ ] Add domain in CRM Settings
- [ ] Copy DNS records from CRM
- [ ] Add DNS records to domain registrar
- [ ] Wait for DNS propagation (1-24 hours)
- [ ] Verify domain in CRM
- [ ] Configure webhook URL in email provider
- [ ] Set up inbound email addresses
- [ ] Update integration settings with API keys
- [ ] Test outbound email sending
- [ ] Test inbound email receiving
- [ ] Verify ticket creation from support emails
- [ ] Monitor deliverability and performance

**Estimated Setup Time**: 30 minutes + DNS propagation time

**Need Help?** Contact support with your domain name and any error messages you're seeing.