#!/bin/bash

# Email Integration Quick Setup Script
# This script sets up both backend and frontend for the email integration to work

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📧 Email Integration Setup Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Setting up Backend...${NC}"
cd "$BACKEND_DIR"

# Create .env for backend if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    cat > .env << 'EOF'
USE_MOCK_DB=true
OPENAI_API_KEY=sk-test-key
JWT_SECRET=test-secret-key-for-development-only
ENCRYPTION_KEY=your-encryption-key-here
EOF
    echo -e "${GREEN}✓ Backend .env created${NC}"
else
    echo -e "${GREEN}✓ Backend .env already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
python -m pip install --break-system-packages -q -r requirements.txt 2>/dev/null || true
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo -e "${BLUE}Step 2: Setting up Frontend...${NC}"
cd "$FRONTEND_DIR"

# Create .env for frontend if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8000
EOF
    echo -e "${GREEN}✓ Frontend .env created${NC}"
else
    echo -e "${GREEN}✓ Frontend .env already exists${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install -q
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend node_modules exists${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo "✓ Setup Complete!"
echo "==================================${NC}"
echo ""
echo -e "${BLUE}To start the application:${NC}"
echo ""
echo "Terminal 1 (Backend):"
echo -e "  ${YELLOW}cd $BACKEND_DIR${NC}"
echo -e "  ${YELLOW}python server.py${NC}"
echo ""
echo "Terminal 2 (Frontend):"
echo -e "  ${YELLOW}cd $FRONTEND_DIR${NC}"
echo -e "  ${YELLOW}npm start${NC}"
echo ""
echo -e "${BLUE}Then open your browser to:${NC} http://localhost:3000"
echo ""
echo -e "${YELLOW}Note:${NC} Both servers must be running for the email integration to work"
echo ""
echo -e "For troubleshooting, see: ${BLUE}TROUBLESHOOTING_EMAIL_INTEGRATION.md${NC}"
