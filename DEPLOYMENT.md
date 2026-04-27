# Deployment Guide

This application is ready for deployment to Vercel, Render, or Supabase.

## Frontend (React App)

### Vercel Deployment
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Configure build settings:
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`
   - Install Command: `cd frontend && npm install`
4. Add environment variables:
   - `REACT_APP_BACKEND_URL`: Your backend API URL

### Render Deployment
1. Create a new Static Site on Render
2. Connect your repository
3. Build Command: `cd frontend && npm run build`
4. Publish Directory: `frontend/build`

### Netlify Deployment
1. Connect your repository to Netlify
2. Build Command: `cd frontend && npm run build`
3. Publish Directory: `frontend/build`

## Backend (FastAPI)

### Render Deployment
1. Create a new Web Service on Render
2. Select your repository
3. Build Command: `pip install -r backend/requirements.txt`
4. Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `DB_NAME`: Database name
   - `JWT_SECRET`: Secret for JWT tokens
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `INTEGRATIONS_KEY`: Fernet encryption key (generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)

### Railway Deployment
1. Create a new project on Railway
2. Connect your repository
3. Add environment variables as above
4. Railway will automatically detect FastAPI and deploy

### Supabase Deployment
1. Create a new project on Supabase
2. For backend, use Supabase Edge Functions or deploy to a separate service
3. For database, Supabase PostgreSQL can replace MongoDB with some code changes

## Environment Variables

### Frontend (.env file in frontend/)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Backend (.env file in backend/)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=pulse_crm
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
INTEGRATIONS_KEY=your-fernet-encryption-key
```

## Local Development

1. Start backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

2. Start frontend:
```bash
cd frontend
npm install
npm start
```

## Database Setup

The application uses MongoDB. You can use:
- MongoDB Atlas (cloud)
- Local MongoDB installation
- Railway MongoDB
- MongoDB on Render

## Notes

- The application has been cleaned of all "Made with Emergent" references
- Favicon has been updated to a simple SVG icon
- AI integration has been switched from Emergent to OpenAI API
- All dependencies have been updated for standalone deployment