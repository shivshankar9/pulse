# Vercel Deployment Guide - Pulse CRM

## ✅ Pre-Deployment Checklist

Your project is ready for Vercel deployment! Here's what's been configured:

- ✅ `vercel.json` configured for frontend deployment
- ✅ Dependency conflicts resolved (using `--legacy-peer-deps`)
- ✅ Favicon and branding updated
- ✅ Environment variables documented
- ✅ All "Made with Emergent" references removed

## 🚀 Deploy to Vercel (Frontend Only)

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository: `shivshankar9/pulse`
4. Vercel will auto-detect the configuration from `vercel.json`
5. **IMPORTANT**: Add environment variable:
   - Name: `REACT_APP_BACKEND_URL`
   - Value: Your backend URL (see Backend Deployment below)
6. Click "Deploy"

#### Option B: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

### Step 3: Set Environment Variables in Vercel

After deployment, go to your project settings:
1. Navigate to: Project Settings → Environment Variables
2. Add: `REACT_APP_BACKEND_URL` = `https://your-backend-url.com`
3. Redeploy for changes to take effect

## 🔧 Backend Deployment (Required)

Your frontend needs a backend API. Deploy the backend separately:

### Option 1: Render (Recommended for Backend)

1. Go to https://render.com
2. Create new "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: Leave empty (or set to `backend`)
5. Add Environment Variables:
   ```
   MONGO_URL=your-mongodb-atlas-connection-string
   DB_NAME=pulse_crm
   JWT_SECRET=your-secret-key-here
   OPENAI_API_KEY=your-openai-key (optional)
   INTEGRATIONS_KEY=your-fernet-key (optional)
   ```
6. Deploy

### Option 2: Railway

1. Go to https://railway.app
2. Create new project from GitHub
3. Select your repository
4. Railway auto-detects Python
5. Add environment variables (same as above)
6. Deploy

### Option 3: Use Mock Database (Development Only)

If you want to test without setting up MongoDB:
- Set environment variable: `USE_MOCK_DB=true`
- **Warning**: Data will not persist between restarts

## 📊 Database Setup (MongoDB)

### MongoDB Atlas (Free Tier - Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (M0 Free tier)
4. Create database user
5. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
6. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/pulse_crm?retryWrites=true&w=majority
   ```
7. Use this as `MONGO_URL` in your backend deployment

## 🔗 Complete Deployment Flow

```
1. Deploy Backend to Render/Railway
   ↓
2. Get Backend URL (e.g., https://pulse-backend.onrender.com)
   ↓
3. Deploy Frontend to Vercel
   ↓
4. Set REACT_APP_BACKEND_URL in Vercel to Backend URL
   ↓
5. Access your app at: https://your-app.vercel.app
```

## 🎯 Quick Deploy Commands

```bash
# Commit and push changes
git add -A
git commit -m "Deploy to Vercel"
git push origin main

# Deploy to Vercel (if using CLI)
vercel --prod
```

## ⚙️ Environment Variables Summary

### Frontend (Vercel)
```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

### Backend (Render/Railway)
```
MONGO_URL=mongodb+srv://...
DB_NAME=pulse_crm
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-... (optional)
INTEGRATIONS_KEY=... (optional)
USE_MOCK_DB=false
```

## 🐛 Troubleshooting

### Build Fails with Dependency Error
- Vercel should use `--legacy-peer-deps` from `vercel.json`
- If it doesn't, manually set in Vercel dashboard:
  - Settings → General → Install Command: `npm install --legacy-peer-deps`

### Frontend Can't Connect to Backend
- Check `REACT_APP_BACKEND_URL` is set correctly
- Ensure backend has CORS enabled (already configured in `server.py`)
- Backend URL should NOT have trailing slash

### Backend Crashes
- Check MongoDB connection string is correct
- Ensure all required environment variables are set
- Check backend logs in Render/Railway dashboard

## 📝 Post-Deployment

1. Test the application:
   - Register a new account
   - Create contacts, deals, activities
   - Test AI features (requires OpenAI API key)

2. Monitor:
   - Vercel Dashboard: Frontend logs and analytics
   - Render/Railway Dashboard: Backend logs and performance

3. Custom Domain (Optional):
   - Add custom domain in Vercel settings
   - Update CORS settings in backend if needed

## 🎉 Your App is Live!

Once deployed:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`
- API Docs: `https://your-backend.onrender.com/docs`

---

**Need Help?** Check the logs in Vercel and Render dashboards for detailed error messages.