# Pulse CRM Q

A modern Customer Relationship Management system built with React and FastAPI.

## Features
- Contact management
- Deal pipeline tracking
- Activity scheduling
- Email integration
- Support ticket system
- AI-powered insights

## Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- MongoDB (or MongoDB Atlas)

### Local Development

1. **Clone and install dependencies:**
```bash
# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
# Copy example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env with your values
# Edit frontend/.env.local with your backend URL
```

3. **Run the application:**
```bash
# Option 1: Using scripts
# Windows: run run-local.bat
# Mac/Linux: bash run-local.sh

# Option 2: Manual
# Terminal 1: Start backend
cd backend
uvicorn server:app --reload

# Terminal 2: Start frontend
cd frontend
npm start
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Deployment

### Frontend (Vercel)
The frontend is configured for Vercel deployment. See `vercel.json` for configuration.

### Backend (Render/Railway)
The backend can be deployed to Render, Railway, or similar platforms. See `DEPLOYMENT.md` for details.

## Project Structure
```
├── frontend/          # React frontend
├── backend/           # FastAPI backend
├── tests/            # Test files
├── vercel.json       # Vercel deployment config
├── DEPLOYMENT.md     # Deployment instructions
└── README.md         # This file
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=pulse_crm
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
INTEGRATIONS_KEY=your-encryption-key
```

### Frontend (.env.local)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## License
MIT
