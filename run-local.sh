#!/bin/bash

# Run Pulse CRM locally

echo "Starting Pulse CRM..."

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "Error: backend directory not found!"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "Error: frontend directory not found!"
    exit 1
fi

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "Creating backend .env file from example..."
    cp backend/.env.example backend/.env
    echo "Please update backend/.env with your actual values"
fi

# Create frontend .env file if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "Creating frontend .env.local file from example..."
    cp frontend/.env.example frontend/.env.local
    echo "Please update frontend/.env.local with your actual values"
fi

echo "1. Starting backend server..."
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "2. Starting frontend development server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait