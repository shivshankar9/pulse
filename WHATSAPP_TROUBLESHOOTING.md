# WhatsApp Business API Troubleshooting Guide

## 🚨 **Current Issues & Solutions**

### **1. Webhook Verification Fixed**
✅ **Fixed**: Updated webhook to return plain text response instead of JSON

### **2. Environment Variables Missing**
🔧 **Action Required**: Add these to your Render dashboard:

**Go to Render Dashboard → Your Backend Service → Environment**

Add these variables:
```
WHATSAPP_VERIFY_TOKEN=pulse_crm_verify
CORS_ORIGINS=https://puls1.vercel.app,http://localhost:3000,https://localhost:3000
```

### **3. Webhook URL Configuration**
📋 **Use this webhook URL in Meta Developer Console:**

```
https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/01525fe1-11b0-435a-8baa-a47773ec7c34
```

**Verify Token:** `pulse_crm_verify`

### **4. Test Webhook Verification**
After deploying the fixes, test with:
```bash
curl "https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/01525fe1-11b0-435a-8baa-a47773ec7c34?hub.verify_token=pulse_crm_verify&hub.challenge=test123"
```

Should return: `test123`

## 🔍 **Diagnostic Steps**

### **Step 1: Check WhatsApp Business API Credentials**
1. Go to Settings → Integrations → Meta WhatsApp Business API
2. Click "TEST" button
3. Should show ✅ "Connected" status

### **Step 2: Verify Webhook Setup**
1. In Meta Developer Console → WhatsApp → Configuration
2. Webhook URL: `https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/01525fe1-11b0-435a-8baa-a47773ec7c34`
3. Verify Token: `pulse_crm_verify`
4. Click "Verify and Save"

### **Step 3: Test Message Sending**
1. Go to WhatsApp page in your app
2. Try sending a test message
3. Check if it shows "sent" status (not "queued")

### **Step 4: Test Message Receiving**
1. Send a WhatsApp message TO your business number
2. Check if it appears in the WhatsApp inbox
3. Should create a new conversation thread

## 🛠️ **Common Issues & Fixes**

### **Issue: Messages show "queued" status**
**Cause**: WhatsApp Business API credentials not configured properly
**Fix**: 
1. Check Access Token is valid
2. Check Phone Number ID is correct
3. Test credentials in Settings

### **Issue: Can't receive messages**
**Cause**: Webhook not verified or configured
**Fix**:
1. Verify webhook URL is correct
2. Check verify token matches
3. Ensure webhook returns plain text response

### **Issue: Webhook validation fails**
**Cause**: Environment variables not set in production
**Fix**:
1. Add `WHATSAPP_VERIFY_TOKEN=pulse_crm_verify` to Render
2. Redeploy the service
3. Test webhook verification

## 📱 **WhatsApp Business API Setup Checklist**

### **Meta Developer Console Setup**
- [ ] Created Meta Developer Account
- [ ] Created WhatsApp Business App
- [ ] Added WhatsApp Business API product
- [ ] Generated Access Token
- [ ] Got Phone Number ID
- [ ] Configured Webhook URL
- [ ] Verified webhook with correct token
- [ ] Added phone numbers to test recipients (for sandbox)

### **Pulse CRM Configuration**
- [ ] Added Access Token to Settings → Integrations
- [ ] Added Phone Number ID
- [ ] Added Business Account ID (optional)
- [ ] Tested connection (green checkmark)
- [ ] Webhook URL configured in Meta console

### **Environment Variables (Render)**
- [ ] `WHATSAPP_VERIFY_TOKEN=pulse_crm_verify`
- [ ] `CORS_ORIGINS=https://puls1.vercel.app,http://localhost:3000`
- [ ] Service redeployed after adding variables

## 🔄 **Testing Workflow**

### **1. Test Outbound Messages**
```
1. Go to WhatsApp page
2. Start new conversation with test number
3. Send message: "Hello from Pulse CRM"
4. Check status shows "sent" (not "queued")
5. Verify message received on test phone
```

### **2. Test Inbound Messages**
```
1. Send WhatsApp message TO your business number
2. Message should appear in Pulse CRM WhatsApp inbox
3. Should create new conversation thread
4. Should auto-create ticket in Tickets section
```

### **3. Test Webhook**
```bash
# Test verification (should return challenge)
curl "https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/01525fe1-11b0-435a-8baa-a47773ec7c34?hub.verify_token=pulse_crm_verify&hub.challenge=test123"

# Should return: test123
```

## 🚀 **Next Steps After Fixes**

1. **Deploy Backend Changes**
   - Push the webhook fix to your repository
   - Render will auto-deploy the changes

2. **Add Environment Variables**
   - Go to Render dashboard
   - Add the required environment variables
   - Restart the service

3. **Test Webhook Verification**
   - Use the curl command above
   - Should return the challenge value

4. **Configure Meta Webhook**
   - Go to Meta Developer Console
   - Update webhook URL if needed
   - Verify and save

5. **Test End-to-End**
   - Send test message from app
   - Send test message to your business number
   - Verify both directions work

## 📞 **Support**

If issues persist after following this guide:
1. Check Render logs for errors
2. Check Meta Developer Console for webhook delivery logs
3. Verify all credentials are correct and not expired
4. Test with a fresh phone number (not previously used)

## 🔐 **Security Notes**

- Keep Access Tokens secure and rotate regularly
- Use environment variables for all secrets
- Monitor webhook delivery logs for suspicious activity
- Verify webhook signatures in production (optional enhancement)