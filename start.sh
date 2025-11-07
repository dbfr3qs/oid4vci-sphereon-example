#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting OID4VCI Example${NC}"
echo ""

# Check if ports are in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo -e "${YELLOW}   Killing existing process...${NC}"
    kill -9 $(lsof -t -i:3001) 2>/dev/null
    sleep 1
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use${NC}"
    echo -e "${YELLOW}   Killing existing process...${NC}"
    kill -9 $(lsof -t -i:5173) 2>/dev/null
    sleep 1
fi

echo -e "${GREEN}✓ Ports are available${NC}"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "packages/vc-agent/node_modules" ]; then
    echo -e "${BLUE}📦 Installing VC agent dependencies...${NC}"
    cd packages/vc-agent && npm install && cd ../..
fi

if [ ! -d "packages/issuer-backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd packages/issuer-backend && npm install && cd ../..
fi

if [ ! -d "packages/issuer-frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd packages/issuer-frontend && npm install && cd ../..
fi

# Build VC agent if needed
if [ ! -d "packages/vc-agent/dist" ]; then
    echo -e "${BLUE}🔨 Building VC agent...${NC}"
    cd packages/vc-agent && npm run build && cd ../..
fi

echo ""
echo -e "${GREEN}✓ All dependencies ready${NC}"
echo ""
echo -e "${GREEN}🎯 Starting services...${NC}"
echo ""
echo -e "${BLUE}   Backend API:${NC}  http://localhost:3001"
echo -e "${BLUE}   Frontend UI:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}   Press Ctrl+C to stop all services${NC}"
echo ""

# Start services
npm run dev
