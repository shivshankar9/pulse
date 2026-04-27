@echo off
REM Run Pulse CRM locally on Windows

echo Starting Pulse CRM...

REM Check if backend directory exists
if not exist "backend\" (
    echo Error: backend directory not found!
    exit /b 1
)

REM Check if frontend directory exists
if not exist "frontend\" (
    echo Error: frontend directory not found!
    exit /b 1
)

REM Create backend .env file if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend .env file from example...
    copy "backend\.env.example" "backend\.env"
    echo Please update backend\.env with your actual values
)

REM Create frontend .env file if it doesn't exist
if not exist "frontend\.env.local" (
    echo Creating frontend .env.local file from example...
    copy "frontend\.env.example" "frontend\.env.local"
    echo Please update frontend\.env.local with your actual values
)

echo 1. Starting backend server...
start cmd /k "cd backend && python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"

echo 2. Starting frontend development server...
start cmd /k "cd frontend && npm start"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Documentation: http://localhost:8000/docs
echo.
echo Both servers started in separate windows.
echo Close the windows to stop the servers.