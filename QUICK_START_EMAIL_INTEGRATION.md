# Email Integration - Quick Start (5 minutes)

## TL;DR

```bash
# Terminal 1: Start Backend
cd backend
python server.py

# Terminal 2: Start Frontend  
cd frontend
npm start

# Browser: http://localhost:3000
# Settings → Integrations → "Setup Email" button
```

---

## ✅ Pre-requisites

- [ ] Python 3.10+ installed
- [ ] Node.js 16+ installed
- [ ] npm installed
- [ ] Both `backend` and `frontend` directories exist

---

## 🚀 Quick Setup

### 1. Backend (Terminal 1)
```bash
cd /vercel/share/v0-project/backend

# One-time setup:
python -m pip install --break-system-packages -q -r requirements.txt

# Start server:
python server.py
```

**Expected Output:**
```
🔶 Using in-memory mock MongoDB
🚀 Running on http://0.0.0.0:8000
```

### 2. Frontend (Terminal 2)
```bash
cd /vercel/share/v0-project/frontend

# If first time:
npm install

# Start dev server:
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view pulse-crm in the browser.
  Local:            http://localhost:3000
```

### 3. Browser
1. Open http://localhost:3000
2. Register: `test@example.com` / `test1234`
3. Navigate to **Settings** tab
4. Click **"Setup Email"** button (orange/amber button)
5. Select provider: **Resend** (recommended)
6. Enter test API key from https://resend.com/api-keys
7. Click **Next** → **Test**
8. ✅ Done!

---

## 🔧 Troubleshooting

### Backend not starting?
```bash
# Check Python:
python --version  # Should be 3.10+

# Reinstall dependencies:
python -m pip install --break-system-packages -q -r requirements.txt

# Run with verbose errors:
python server.py
```

### Frontend not compiling?
```bash
# Clear cache and reinstall:
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Button not appearing?
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check browser console: `F12` → Console tab
3. Verify you're logged in (should see user profile)

### "Failed to save configuration"?
1. Check backend is running: `curl http://localhost:8000/api/health`
2. Check browser console (F12): Look for error details
3. Verify `.env` files exist in both folders

---

## 📁 Key Files

```
/vercel/share/v0-project/
├── frontend/
│   ├── .env                                      ← Must have REACT_APP_BACKEND_URL
│   ├── src/
│   │   ├── components/EmailIntegrationSetup.jsx ← Main component
│   │   └── pages/
│   │       ├── Settings.jsx                      ← Has "Setup Email" button
│   │       └── Emails.jsx                        ← Alternative button location
│   └── npm start                                 ← Run this
│
└── backend/
    ├── .env                                      ← Must have USE_MOCK_DB=true
    ├── server.py                                 ← Has /api/integrations endpoints
    └── python server.py                          ← Run this
```

---

## ✨ Features

✅ One-click email setup  
✅ 3 email providers: Resend, SMTP, GoDaddy  
✅ Real-time validation  
✅ Connection testing  
✅ Secure credential storage  
✅ Mobile responsive  

---

## 🧪 Test Credentials

### Resend (Recommended)
1. Go to https://resend.com
2. Sign up free account
3. Get API key from dashboard
4. Use any email for "From Email"

### Gmail SMTP
- Host: `smtp.gmail.com`
- Port: `587`
- Email: your email
- Password: **App Password** (not regular password!)
  - Setup: https://myaccount.google.com/apppasswords

### GoDaddy
- Host: `smtp.secureserver.net`
- Port: `587`
- Email: your GoDaddy email
- Password: GoDaddy email password

---

## 🔗 Useful Links

- **Resend:** https://resend.com/api-keys
- **Gmail App Password:** https://myaccount.google.com/apppasswords
- **GoDaddy Email:** https://www.godaddy.com/hosting/email
- **Troubleshooting:** `TROUBLESHOOTING_EMAIL_INTEGRATION.md`
- **Full Documentation:** `EMAIL_INTEGRATION_STATUS.md`

---

## ❌ Common Mistakes

❌ Only starting backend (frontend must run too)  
❌ Only starting frontend (backend must run too)  
❌ Using regular Gmail password instead of app password  
❌ Forgetting to register/login before clicking button  
❌ Using wrong Resend API key format  
❌ Not creating `.env` files  

✅ Always start both servers  
✅ Use app passwords for Gmail  
✅ Make sure you're logged in  
✅ Double-check API keys  
✅ Create `.env` files before running  

---

## 🎯 Success Checklist

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] Can access app in browser
- [ ] Can register/login
- [ ] Settings page loads
- [ ] "Setup Email" button visible and clickable
- [ ] Modal opens when clicking button
- [ ] Can select email provider
- [ ] Can fill in credentials
- [ ] Can test connection
- [ ] Integration saved successfully

---

## 📞 Still Stuck?

1. Check: `TROUBLESHOOTING_EMAIL_INTEGRATION.md`
2. Browser console: `F12` → Console tab
3. Backend output: Look for error messages
4. Network tab: `F12` → Network → Look for API errors

Good luck! 🚀
