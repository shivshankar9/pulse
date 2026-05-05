# GoDaddy Email Integration Guide
## Direct Domain Registrar Email Solution

Since Resend verification is stuck due to DNSSEC, let's use GoDaddy's email services directly. This is often easier and more reliable for custom domain emails.

## 🎯 **Why GoDaddy Email is Better for You:**

✅ **No DNS Verification Issues** - Works directly with your domain  
✅ **No DNSSEC Conflicts** - GoDaddy handles everything internally  
✅ **Professional Email** - support@billbytekot.in, info@billbytekot.in  
✅ **Easy Setup** - 5-minute configuration  
✅ **SMTP Integration** - Works with your CRM  
✅ **Affordable** - Starting at $1.99/month per mailbox  

## 📧 **GoDaddy Email Options:**

### **Option 1: GoDaddy Email Essentials ($1.99/month)**
- 10GB storage per mailbox
- Custom domain email addresses
- SMTP/IMAP access for CRM integration
- Webmail interface
- Mobile app support

### **Option 2: GoDaddy Email Plus ($3.99/month)**
- 25GB storage per mailbox
- Calendar and contacts sync
- Advanced spam protection
- Email forwarding and aliases

### **Option 3: Microsoft 365 via GoDaddy ($6.99/month)**
- Full Office suite
- 50GB email storage
- Teams integration
- Advanced security features

## 🚀 **Setup Process:**

### **Step 1: Purchase GoDaddy Email**

1. **Log into GoDaddy Account**
2. **Go to "My Products"**
3. **Find your domain** (billbytekot.in)
4. **Click "Email"** or **"Add Email"**
5. **Choose Email Essentials** (recommended for CRM use)
6. **Select number of mailboxes** (start with 2-3)
7. **Complete purchase**

### **Step 2: Create Email Addresses**

Create these essential business email addresses:
- `support@billbytekot.in` (for customer support)
- `info@billbytekot.in` (for general inquiries)
- `noreply@billbytekot.in` (for automated emails)

### **Step 3: Get SMTP Settings**

GoDaddy will provide SMTP settings like:
```
SMTP Server: smtpout.secureserver.net
Port: 587 (TLS) or 465 (SSL)
Username: support@billbytekot.in
Password: [your email password]
Authentication: Required
```

### **Step 4: Configure Your CRM**

Update your CRM's email settings with GoDaddy SMTP:

```python
# In your backend/.env file
EMAIL_PROVIDER=smtp
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USERNAME=support@billbytekot.in
SMTP_PASSWORD=your_email_password
SMTP_USE_TLS=true
FROM_EMAIL=support@billbytekot.in
FROM_NAME=Pulse CRM Support
```

## 🔧 **CRM Integration Code:**

I'll update your backend to support GoDaddy SMTP:

### **Updated Email Configuration:**

```python
# Add to backend/server.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

class GoDaddyEmailService:
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtpout.secureserver.net')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.username = os.getenv('SMTP_USERNAME')
        self.password = os.getenv('SMTP_PASSWORD')
        self.use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.from_email = os.getenv('FROM_EMAIL')
        self.from_name = os.getenv('FROM_NAME', 'Pulse CRM')
    
    def send_email(self, to_email, subject, body, attachments=None):
        """Send email via GoDaddy SMTP"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'html'))
            
            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment["filename"]}'
                    )
                    msg.attach(part)
            
            # Connect and send
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            if self.use_tls:
                server.starttls()
            server.login(self.username, self.password)
            
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            
            return {"success": True, "message": "Email sent successfully"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# Initialize email service
godaddy_email = GoDaddyEmailService()
```

### **Email Sending Endpoint:**

```python
@api_router.post("/emails/send")
async def send_email_godaddy(request: Request):
    """Send email via GoDaddy SMTP"""
    try:
        data = await request.json()
        
        result = godaddy_email.send_email(
            to_email=data.get('to'),
            subject=data.get('subject'),
            body=data.get('body'),
            attachments=data.get('attachments')
        )
        
        if result['success']:
            # Log email in database
            email_record = {
                'id': str(uuid.uuid4()),
                'to': data.get('to'),
                'subject': data.get('subject'),
                'body': data.get('body'),
                'status': 'sent',
                'provider': 'godaddy_smtp',
                'sent_at': datetime.now().isoformat(),
                'owner_id': 'system'  # or get from auth
            }
            
            if USE_MOCK_DB:
                if 'emails' not in globals():
                    globals()['emails'] = []
                globals()['emails'].append(email_record)
            else:
                await db.emails.insert_one(email_record)
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}
```

## 📨 **Email Receiving Setup:**

### **Option 1: Email Forwarding (Easiest)**

1. **In GoDaddy Email Settings:**
   - Set up email forwarding
   - Forward `support@billbytekot.in` → your personal email
   - You'll receive emails and can manually create tickets

### **Option 2: IMAP Integration (Advanced)**

```python
import imaplib
import email
from email.header import decode_header

class GoDaddyEmailReceiver:
    def __init__(self):
        self.imap_host = 'imap.secureserver.net'
        self.imap_port = 993
        self.username = os.getenv('SMTP_USERNAME')
        self.password = os.getenv('SMTP_PASSWORD')
    
    def check_new_emails(self):
        """Check for new emails and create tickets"""
        try:
            # Connect to IMAP
            mail = imaplib.IMAP4_SSL(self.imap_host, self.imap_port)
            mail.login(self.username, self.password)
            mail.select('INBOX')
            
            # Search for unread emails
            status, messages = mail.search(None, 'UNSEEN')
            
            for msg_id in messages[0].split():
                # Fetch email
                status, msg_data = mail.fetch(msg_id, '(RFC822)')
                
                # Parse email
                msg = email.message_from_bytes(msg_data[0][1])
                subject = decode_header(msg['Subject'])[0][0]
                from_email = msg['From']
                
                # Create ticket automatically
                await self.create_ticket_from_email(subject, from_email, msg)
                
                # Mark as read
                mail.store(msg_id, '+FLAGS', '\\Seen')
            
            mail.close()
            mail.logout()
            
        except Exception as e:
            logging.error(f"Error checking emails: {e}")
    
    async def create_ticket_from_email(self, subject, from_email, message):
        """Create support ticket from received email"""
        ticket = {
            'id': str(uuid.uuid4()),
            'subject': subject,
            'description': str(message.get_payload()),
            'customer_email': from_email,
            'status': 'open',
            'priority': 'medium',
            'source': 'email',
            'created_at': datetime.now().isoformat()
        }
        
        # Save ticket to database
        if USE_MOCK_DB:
            if 'tickets' not in globals():
                globals()['tickets'] = []
            globals()['tickets'].append(ticket)
        else:
            await db.tickets.insert_one(ticket)
```

## 🎯 **Advantages of GoDaddy Email:**

### **Immediate Benefits:**
- ✅ **Works Right Now** - No verification delays
- ✅ **Professional Appearance** - support@billbytekot.in
- ✅ **Reliable Delivery** - GoDaddy's reputation
- ✅ **Easy Management** - Familiar GoDaddy interface

### **CRM Integration:**
- ✅ **SMTP Sending** - Send emails from CRM
- ✅ **Ticket Creation** - Auto-create tickets from emails
- ✅ **Email Tracking** - Log all sent emails
- ✅ **Professional Templates** - Branded email signatures

### **Cost Comparison:**
- **GoDaddy Email**: $1.99/month (unlimited emails)
- **Resend**: $20/month (50k emails)
- **SendGrid**: $19.95/month (40k emails)

## 🚀 **Quick Start (5 Minutes):**

1. **Buy GoDaddy Email Essentials** ($1.99/month)
2. **Create support@billbytekot.in**
3. **Get SMTP settings** from GoDaddy
4. **Update your CRM .env file** with SMTP details
5. **Test sending email** from your CRM
6. **Set up email forwarding** for receiving

## 📞 **Need Help?**

GoDaddy has excellent support for email setup:
- **Phone**: 1-480-505-8877
- **Chat**: Available 24/7 in GoDaddy dashboard
- **Email**: support@godaddy.com

This solution will get you professional custom domain emails working immediately, without any DNS verification headaches!

Would you like me to help you set this up?