# GoDaddy Email SMTP Setup Guide
## Quick 5-Minute Setup for Custom Domain Emails

Your CRM already supports SMTP! Here's how to set up GoDaddy email in 5 minutes:

## 🚀 **Step 1: Purchase GoDaddy Email (2 minutes)**

1. **Log into GoDaddy Account**
2. **Go to "My Products"**
3. **Find billbytekot.in** → Click "Email"
4. **Choose "Email Essentials"** ($1.99/month)
5. **Add 2-3 mailboxes:**
   - `support@billbytekot.in`
   - `info@billbytekot.in` 
   - `noreply@billbytekot.in`
6. **Complete purchase**

## 📧 **Step 2: Get SMTP Settings (1 minute)**

After purchase, GoDaddy provides these settings:

```
SMTP Server: smtpout.secureserver.net
Port: 587
Security: STARTTLS
Username: support@billbytekot.in
Password: [your email password]
```

## ⚙️ **Step 3: Configure Your CRM (2 minutes)**

### **Option A: Via CRM Settings (Recommended)**

1. **Go to your CRM Settings**
2. **Navigate to Integrations tab**
3. **Find "SMTP" integration**
4. **Add these settings:**
   ```
   Host: smtpout.secureserver.net
   Port: 587
   Username: support@billbytekot.in
   Password: [your GoDaddy email password]
   From Email: support@billbytekot.in
   From Name: Pulse CRM Support
   ```
5. **Test the connection**

### **Option B: Via Environment Variables**

Add to your `backend/.env` file:
```env
# GoDaddy Email SMTP Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USERNAME=support@billbytekot.in
SMTP_PASSWORD=your_godaddy_email_password
SMTP_USE_TLS=true
FROM_EMAIL=support@billbytekot.in
FROM_NAME=Pulse CRM Support
```

## 🧪 **Step 4: Test Email Sending**

1. **Go to your CRM Emails page**
2. **Click "Compose"**
3. **Send a test email to yourself**
4. **Check that it arrives from support@billbytekot.in**

## 📨 **Step 5: Set Up Email Receiving (Optional)**

### **Method 1: Email Forwarding (Easiest)**
1. **In GoDaddy Email settings**
2. **Set up forwarding:**
   - `support@billbytekot.in` → your personal email
   - `info@billbytekot.in` → your personal email
3. **Manually create tickets** when you receive emails

### **Method 2: Auto-Ticket Creation (Advanced)**
Your CRM can check GoDaddy email via IMAP and auto-create tickets:

```env
# Add to .env for IMAP receiving
IMAP_HOST=imap.secureserver.net
IMAP_PORT=993
IMAP_USERNAME=support@billbytekot.in
IMAP_PASSWORD=your_godaddy_email_password
IMAP_USE_SSL=true
```

## ✅ **Benefits of This Setup:**

- ✅ **Works Immediately** - No DNS verification needed
- ✅ **Professional Emails** - support@billbytekot.in
- ✅ **Reliable Delivery** - GoDaddy's email infrastructure
- ✅ **Cost Effective** - $1.99/month vs $20/month for Resend
- ✅ **Easy Management** - Familiar GoDaddy interface
- ✅ **No DNSSEC Issues** - Works with your current DNS setup

## 🎯 **What You Get:**

### **Sending Emails:**
- Send from your CRM using support@billbytekot.in
- Professional email signatures
- Ticket notifications from your domain
- Marketing emails with your branding

### **Receiving Emails:**
- Customers can email support@billbytekot.in
- Auto-forward to your personal email
- Optional: Auto-create tickets from emails

### **Professional Appearance:**
```
From: Pulse CRM Support <support@billbytekot.in>
To: customer@example.com
Subject: Your Support Ticket #12345

Dear Customer,

Thank you for contacting us...

Best regards,
Pulse CRM Support Team
support@billbytekot.in
```

## 🔧 **Troubleshooting:**

### **If emails don't send:**
1. Check username/password are correct
2. Verify SMTP settings in CRM
3. Check GoDaddy email is active
4. Test with GoDaddy webmail first

### **If emails go to spam:**
1. Set up SPF record (GoDaddy handles this automatically)
2. Use professional email content
3. Avoid spam trigger words
4. Send from consistent address

## 📞 **GoDaddy Support:**
- **Phone:** 1-480-505-8877
- **Chat:** Available in GoDaddy dashboard
- **Help:** help.godaddy.com

## 🎉 **Result:**

After this 5-minute setup, you'll have:
- Professional custom domain emails
- Working email sending from your CRM
- No DNS verification headaches
- Immediate functionality

**Total Cost:** $1.99/month (vs $20/month for other providers)
**Setup Time:** 5 minutes
**Reliability:** Enterprise-grade GoDaddy infrastructure

This is the fastest way to get professional custom domain emails working with your CRM!