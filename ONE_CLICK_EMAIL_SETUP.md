# One-Click Email Integration Setup Guide

## Overview

The **One-Click Email Setup** feature provides a streamlined, user-friendly process to integrate email services with Pulse CRM in just a few minutes. This replaces the need to manually navigate through complex integration settings.

## Features

✨ **One-Click Setup**: Connect your email in 3 simple steps
- Choose your email provider
- Enter credentials
- Verify connection

🚀 **Quick & Easy**: Minimal setup time (2-5 minutes depending on provider)
- Pre-configured email providers
- Clear field descriptions
- Helpful hints for each provider

📧 **Multiple Providers Supported**:
- **Resend** (Cloud-based, recommended for beginners)
- **SMTP** (Gmail, Outlook, custom servers)
- **GoDaddy Email** (Professional hosted email)

✅ **Instant Verification**: Automatic connection testing
- Validates credentials immediately after setup
- Clear success/error feedback
- Step-by-step guidance for fixes

## How to Use

### From Settings Page
1. Navigate to **Settings** → **Integrations**
2. Look for the **"Quick Email Setup"** card (highlighted in amber/orange)
3. Click the **"Setup Email"** button
4. Follow the 3-step wizard

### From Emails Page
1. Open the **Email Center**
2. Click the **"Setup Email"** button in the header (next to Compose)
3. Follow the 3-step wizard

## Setup Steps

### Step 1: Choose Provider
Select your email provider from the available options:

| Provider | Difficulty | Setup Time | Best For |
|----------|-----------|-----------|----------|
| **Resend** | Easy | 2 min | Cloud-based, managed email |
| **SMTP** | Medium | 5 min | Gmail, Outlook, custom servers |
| **GoDaddy** | Easy | 3 min | GoDaddy hosted email |

### Step 2: Enter Credentials
Fill in the required fields with your provider credentials:

**For Resend:**
- API Key: Get from [resend.com/api-keys](https://resend.com/api-keys)
- From Email: Your support email address

**For SMTP:**
- SMTP Host: e.g., `smtp.gmail.com`
- Port: Usually `587` or `465`
- Username: Your email address
- Password: Your email password (or app password for Gmail)
- From Email: Sender email address
- From Name: Display name (optional)

**For GoDaddy:**
- Host: Pre-filled with `smtp.secureserver.net`
- Port: Pre-filled with `587`
- Email Address: Your GoDaddy email
- Email Password: Your GoDaddy email password
- From Email: Sender address
- From Name: Display name (optional)

### Step 3: Verify Connection
- Click "Connect Email"
- The system automatically tests your connection
- See success/error feedback
- If successful, you'll see the completion screen

## Integration Success

Once your email is integrated:
✅ Your inbox receives all support messages
✅ Emails automatically create tickets
✅ Reply directly from Pulse to manage conversations
✅ All support information in one place

## Tips for Success

### Gmail Users
1. Enable "Less secure app access" or use an **App Password**
2. If using App Password, use that instead of your Gmail password
3. SMTP Host: `smtp.gmail.com`
4. Port: `587`

### Outlook/Microsoft 365
1. Generate an app-specific password
2. SMTP Host: `smtp-mail.outlook.com`
3. Port: `587`

### GoDaddy Email
1. Your email must be hosted on GoDaddy
2. Credentials are from GoDaddy Email settings, not your account login
3. No DNS configuration needed

### Custom SMTP
1. Verify your SMTP server settings with your provider
2. Check if your server requires TLS/SSL
3. Port 587 is typically for TLS, 465 for SSL
4. Some servers block port 465 - try 587 first

## Troubleshooting

### Connection Failed
- **Check credentials**: Verify username and password are correct
- **Enable less secure apps**: For Gmail, enable "Less secure app access"
- **Use app password**: Gmail and Outlook require app-specific passwords
- **Check port**: Confirm the correct SMTP port (587 or 465)
- **Verify server**: Make sure SMTP host is correct

### Emails Not Receiving
- **Check inbox**: Verify emails are reaching your inbox
- **Check spam**: Some emails may be marked as spam
- **Verify sender**: Ensure "From Email" is authorized for your provider
- **Check domain**: Custom domain emails may need DNS verification

### Need More Help?
1. Visit Settings → Integrations → [Your Provider] → Edit
2. Test the connection using the "Test" button
3. Check error messages for specific guidance
4. Refer to your email provider's SMTP documentation

## Component Details

### EmailIntegrationSetup Component
Location: `/frontend/src/components/EmailIntegrationSetup.jsx`

**Features:**
- Multi-step modal interface
- Provider selection with difficulty ratings
- Field validation and error handling
- Show/hide password toggles
- Real-time connection testing
- Success confirmation screen

**Props:**
- `onComplete()`: Callback when setup is finished

**States:**
- `step`: 0 (choose), 1 (configure), 2 (success)
- `provider`: Selected email provider
- `config`: Form fields and values
- `testResult`: Connection test results

### Integration Points
The setup modal is integrated into:
1. **Settings.jsx** - Quick setup button in Integrations tab
2. **Emails.jsx** - Setup button in email center header

## API Endpoints Used

The component communicates with these backend endpoints:

```
PUT /integrations/{provider}        # Save configuration
POST /integrations/{provider}/test  # Test connection
```

## Architecture Benefits

✨ **User-Centric Design**
- Simplified wizard removes complexity
- Clear guidance at each step
- Helpful field descriptions

⚡ **Performance**
- Modal-based approach (no page reload)
- Immediate feedback on setup
- Auto-test prevents configuration mistakes

🔒 **Security**
- Password fields masked by default
- Secure API communication
- Credentials validated before saving

## Future Enhancements

Potential improvements for the future:
- OAuth flow for Gmail/Google Workspace
- Bulk email import from existing folders
- Email signature templates
- Automatic email categorization
- Scheduled email sync intervals

## Support & Feedback

For issues or suggestions:
1. Check this guide for troubleshooting steps
2. Review error messages in the setup wizard
3. Test your credentials on the provider's website
4. Contact support for persistent issues

---

**Last Updated**: May 2026
**Version**: 1.0
