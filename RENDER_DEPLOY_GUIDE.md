# Deploy Backend to Render (No Docker Required!)

Render supports Python natively - no Docker needed!

## 🚀 Quick Deploy Steps

### Option 1: Using render.yaml (Automatic)

1. **Push to GitHub** (already done)
2. **Go to Render**: https://render.com
3. **Sign up/Login** with GitHub
4. **New → Blueprint**
5. **Connect your repository**: `shivshankar9/pulse`
6. **Render will auto-detect** `render.yaml` and configure everything
7. **Click "Apply"**
8. **Done!** Your backend will be live at: `https://pulse-backend.onrender.com`

### Option 2: Manual Setup (More Control)

1. **Go to Render**: https://render.com
2. **New → Web Service**
3. **Connect GitHub** repository: `shivshankar9/pulse`
4. **Configure**:
   - **Name**: `pulse-backend`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. **Add Environment Variables**:
   ```
   USE_MOCK_DB=true
   DB_NAME=pulse_crm
   JWT_SECRET=your-secret-key-here
   ```

6. **Click "Create Web Service"**

## 📊 Using Real Database (MongoDB Atlas)

If you want persistent data instead of mock DB:

1. **Create MongoDB Atlas account**: https://www.mongodb.com/cloud/atlas
2. **Create free cluster** (M0 - Free tier)
3. **Create database user**
4. **Whitelist IP**: `0.0.0.0/0` (allow all)
5. **Get connection string**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/pulse_crm?retryWrites=true&w=majority
   ```
6. **Update Render environment variables**:
   ```
   MONGO_URL=mongodb+srv://...
   USE_MOCK_DB=false
   DB_NAME=pulse_crm
   JWT_SECRET=your-secret-key
   ```

## 🔗 After Backend Deploys

1. **Copy your backend URL**: `https://pulse-backend.onrender.com`
2. **Update Vercel environment variable**:
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Update `REACT_APP_BACKEND_URL` to: `https://pulse-backend.onrender.com`
3. **Redeploy frontend** in Vercel

## ⚡ Free Tier Notes

Render free tier:
- ✅ 750 hours/month (enough for 1 service 24/7)
- ✅ Automatic HTTPS
- ✅ Auto-deploy on git push
- ⚠️ Spins down after 15 min of inactivity (first request takes ~30s)
- ⚠️ 512 MB RAM limit

## 🐛 Troubleshooting

### Build fails
- Check `backend/requirements.txt` is correct
- Ensure Python version is compatible (3.11 recommended)

### Service won't start
- Check environment variables are set
- View logs in Render dashboard
- Ensure `$PORT` is used in start command

### Can't connect from frontend
- Ensure CORS is enabled (already configured in `server.py`)
- Check `REACT_APP_BACKEND_URL` in Vercel matches Render URL
- No trailing slash in URL

## 🎉 Complete Setup

Once both are deployed:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://pulse-backend.onrender.com`
- **API Docs**: `https://pulse-backend.onrender.com/docs`

Test by:
1. Open frontend URL
2. Register a new account
3. Create contacts, deals, etc.

---

**No Docker required!** Render handles everything automatically.