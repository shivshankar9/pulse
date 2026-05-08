# Email Integration Troubleshooting Guide

## Issue: "Integration not working"

This guide helps you diagnose and fix issues with the one-click email integration setup.

---

## Checklist: Quick Diagnostics

### 1. **Backend Server Status** ✓ Critical
Check if the backend is running:

```bash
# Check if backend is running on port 8000
curl http://localhost:8000/api/health

# Expected response:
# Should return 200 status code
```

**If backend is NOT running:**
```bash
cd /vercel/share/v0-project/backend

# Install dependencies first
python -m pip install --break-system-packages -q -r requirements.txt

# Create .env file
cat > .env << 'EOF'
USE_MOCK_DB=true
OPENAI_API_KEY=sk-test-key
JWT_SECRET=test-secret-key
ENCRYPTION_KEY=your-encryption-key
EOF

# Start the backend
python server.py
# Should see: "🚀 Running on http://0.0.0.0:8000"
```

---

### 2. **Frontend Configuration** ✓ Important
Check if frontend can reach backend:

```bash
cd /vercel/share/v0-project/frontend

# Verify .env file exists
cat .env
# Should contain: REACT_APP_BACKEND_URL=http://localhost:8000
```

**If .env doesn't exist:**
```bash
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8000
EOF
```

---

### 3. **Frontend Server Status** ✓ Important
Check if frontend is running:

```bash
# Frontend should be running on port 3000
curl http://localhost:3000

# If NOT running:
cd /vercel/share/v0-project/frontend
npm start
```

---

### 4. **Authentication Status** ✓ Important
Make sure you're logged in to the app:

1. Open the app at `http://localhost:3000`
2. Navigate to **Settings** or **Emails**
3. You should see your user profile
4. If not logged in, register/login first

**To register a test user:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test1234",
    "name": "Test User"
  }'
```

---

## Common Issues & Solutions

### Issue A: "Failed to save configuration"

**Cause:** Backend not responding or database error

**Solution:**
1. Verify backend is running (see Checklist #1)
2. Check backend logs for errors:
   ```bash
   # Tail the backend logs (if running in background)
   ps aux | grep "python server.py"
   ```
3. Verify `.env` file in backend folder has:
   - `USE_MOCK_DB=true` (for testing without MongoDB)
   - Required keys configured

4. Try a simple test:
   ```bash
   curl -X GET http://localhost:8000/api/health
   ```

---

### Issue B: "Connection test failed"

**Cause:** Invalid email provider credentials

**Solution:**
1. Double-check your credentials:
   - **Resend:** API key from https://resend.com/api-keys
   - **SMTP:** Host, port, username, password correct
   - **GoDaddy:** Email credentials from GoDaddy control panel

2. For Gmail with SMTP:
   - Use an **App Password**, NOT your regular password
   - Enable 2-factor authentication first
   - Create app password at https://myaccount.google.com/apppasswords

3. Test credentials manually:
   ```bash
   # For Resend
   curl -X POST https://api.resend.com/domains \
     -H "Authorization: Bearer YOUR_API_KEY"
   
   # For SMTP (requires telnet or mail client)
   ```

---

### Issue C: "API call to /integrations/{provider} returns 400"

**Cause:** Missing required fields

**Solution:**
Check the PROVIDER_KEYS in backend/server.py:

```python
PROVIDER_KEYS = {
    "resend": ["api_key", "from_email"],
    "smtp": ["host", "port", "username", "password", "from_email", "from_name"],
    "godaddy_smtp": ["host", "port", "username", "password", "from_email", "from_name"],
}
```

Make sure all required fields are provided.

---

### Issue D: "CORS Error"

**Cause:** Backend CORS configuration issue

**Solution:**
1. Backend automatically configures CORS for localhost:3000
2. If using different ports, verify in `server.py`:
   ```python
   # Around line 85-90 in server.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
       ...
   )
   ```

3. Restart backend after changes

---

### Issue E: "Modal doesn't appear when clicking 'Setup Email' button"

**Cause:** Component not imported or modal state not working

**Solution:**
1. Check if EmailIntegrationSetup is imported in Settings.jsx:
   ```javascript
   import EmailIntegrationSetup from "../components/EmailIntegrationSetup";
   ```

2. Check if `showEmailSetup` state is being used:
   ```javascript
   const [showEmailSetup, setShowEmailSetup] = useState(false);
   {showEmailSetup && <EmailIntegrationSetup onComplete={() => setShowEmailSetup(false)} />}
   ```

3. Clear browser cache and reload

---

## Browser Developer Tools

Use these to debug in the browser console:

```javascript
// Check if API is configured
console.log(localStorage.getItem('pulse_token'))  // Should show auth token

// Test API call manually
fetch('http://localhost:8000/api/integrations', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('pulse_token')}`
  }
}).then(r => r.json()).then(console.log)
```

---

## Detailed Setup: Step-by-Step

### To get everything working from scratch:

#### Step 1: Start Backend (Terminal 1)
```bash
cd /vercel/share/v0-project/backend
python -m pip install --break-system-packages -q -r requirements.txt
cat > .env << 'EOF'
USE_MOCK_DB=true
OPENAI_API_KEY=sk-test-key
JWT_SECRET=test-secret-key
ENCRYPTION_KEY=your-encryption-key
EOF
python server.py
# Wait for: "🚀 Running on http://0.0.0.0:8000"
```

#### Step 2: Start Frontend (Terminal 2)
```bash
cd /vercel/share/v0-project/frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8000
EOF
npm start
# Wait for: "Compiled successfully!"
```

#### Step 3: Register & Login (Browser)
```
1. Open http://localhost:3000
2. Click "Register"
3. Create account: test@example.com / test1234
4. Should see dashboard/home page
```

#### Step 4: Test Integration (Browser)
```
1. Navigate to Settings → Integrations
2. Click "Setup Email" button
3. Choose provider (Resend recommended)
4. Enter credentials
5. Click "Next"
6. Should test and verify connection
```

---

## Logs to Check

### Frontend Browser Console
Open DevTools (F12) → Console tab
Look for `[v0]` messages:
- `[v0] Saving integration config:`
- `[v0] Testing integration:`
- `[v0] Error messages with details`

### Backend Logs
If running in terminal, check output for:
- `🚀 Running on http://0.0.0.0:8000`
- `PUT /api/integrations/...`
- `POST /api/integrations/.../test`
- Any errors with traceback

---

## Getting Help

If you're still having issues:

1. **Collect information:**
   - Browser console errors (F12 → Console)
   - Backend startup errors
   - Network tab in DevTools
   - .env files contents (without secrets)

2. **Check the implementation:**
   - `/frontend/src/components/EmailIntegrationSetup.jsx` - Setup component
   - `/frontend/src/pages/Settings.jsx` - Settings integration
   - `/frontend/src/pages/Emails.jsx` - Email center integration
   - `/backend/server.py` - API endpoints (lines 1028-1160)

3. **Verify files exist:**
   ```bash
   ls -la /vercel/share/v0-project/frontend/src/components/EmailIntegrationSetup.jsx
   ls -la /vercel/share/v0-project/frontend/.env
   ls -la /vercel/share/v0-project/backend/.env
   ```

---

## Quick Reset

If something is broken, reset everything:

```bash
# Kill all servers
pkill -f "python server.py"
pkill -f "npm start"

# Clean and reinstall
cd /vercel/share/v0-project/frontend
rm -rf node_modules
npm install

cd ../backend
# Follow Step 1 instructions above again
```

---

## Success Indicators

✓ Backend responds to health check: `curl http://localhost:8000/api/health`
✓ Frontend loads: `http://localhost:3000`
✓ You're logged in (see user profile)
✓ Settings page shows "Setup Email" button
✓ Modal appears when clicking button
✓ Can select provider and enter credentials
✓ Can test connection successfully
