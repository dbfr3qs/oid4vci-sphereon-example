#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OID4VCI + OID4VP Complete System Startup                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect local IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

echo -e "${GREEN}📡 Network IP detected: ${LOCAL_IP}${NC}"
echo ""

# Kill any existing processes on our ports
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
sleep 1

# Check if node_modules exist
if [ ! -d "packages/vc-agent/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies for vc-agent...${NC}"
    cd packages/vc-agent && npm install && cd ../..
fi

if [ ! -d "packages/issuer-backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies for issuer-backend...${NC}"
    cd packages/issuer-backend && npm install && cd ../..
fi

if [ ! -d "packages/issuer-frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies for issuer-frontend...${NC}"
    cd packages/issuer-frontend && npm install && cd ../..
fi

if [ ! -d "packages/verifier-backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies for verifier-backend...${NC}"
    cd packages/verifier-backend && npm install && cd ../..
fi

if [ ! -d "packages/verifier-frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies for verifier-frontend...${NC}"
    cd packages/verifier-frontend && npm install && cd ../..
fi

# Build vc-agent
echo -e "${YELLOW}🔨 Building vc-agent...${NC}"
cd packages/vc-agent && npm run build && cd ../..

echo ""
echo -e "${GREEN}🚀 Starting all services...${NC}"
echo ""

# Set environment variables
export ISSUER_URL="http://${LOCAL_IP}:3001"
export VERIFIER_URL="http://${LOCAL_IP}:3002"
export VITE_API_URL="http://${LOCAL_IP}:3001"
export VITE_VERIFIER_API_URL="http://${LOCAL_IP}:3002"

# Create logs directory
mkdir -p logs

# Start issuer-backend
echo -e "${BLUE}[1/4]${NC} Starting Issuer Backend..."
cd packages/issuer-backend
npm run dev > ../../logs/issuer-backend.log 2>&1 &
ISSUER_BACKEND_PID=$!
cd ../..
sleep 3

# Start issuer-frontend
echo -e "${BLUE}[2/4]${NC} Starting Issuer Frontend..."
cd packages/issuer-frontend
npm run dev > ../../logs/issuer-frontend.log 2>&1 &
ISSUER_FRONTEND_PID=$!
cd ../..
sleep 3

# Start verifier-backend
echo -e "${BLUE}[3/4]${NC} Starting Verifier Backend..."
cd packages/verifier-backend
npm run dev > ../../logs/verifier-backend.log 2>&1 &
VERIFIER_BACKEND_PID=$!
cd ../..
sleep 3

# Start verifier-frontend
echo -e "${BLUE}[4/4]${NC} Starting Verifier Frontend..."
cd packages/verifier-frontend
npm run dev > ../../logs/verifier-frontend.log 2>&1 &
VERIFIER_FRONTEND_PID=$!
cd ../..
sleep 3

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Service URLs                                              ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  ${GREEN}Issuer Backend:${NC}   http://localhost:3001                  ${BLUE}║${NC}"
echo -e "${BLUE}║                      http://${LOCAL_IP}:3001           ${BLUE}║${NC}"
echo -e "${BLUE}║  ${GREEN}Issuer Frontend:${NC}  http://localhost:5173                  ${BLUE}║${NC}"
echo -e "${BLUE}║                      http://${LOCAL_IP}:5173           ${BLUE}║${NC}"
echo -e "${BLUE}║  ${GREEN}Verifier Backend:${NC} http://localhost:3002                  ${BLUE}║${NC}"
echo -e "${BLUE}║                      http://${LOCAL_IP}:3002           ${BLUE}║${NC}"
echo -e "${BLUE}║  ${GREEN}Verifier Frontend:${NC} http://localhost:5174                 ${BLUE}║${NC}"
echo -e "${BLUE}║                      http://${LOCAL_IP}:5174           ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📱 For wallet testing, use the network URLs (${LOCAL_IP})${NC}"
echo -e "${YELLOW}💻 For browser testing, use localhost URLs${NC}"
echo ""
echo -e "${GREEN}📋 Logs are being written to ./logs/ directory${NC}"
echo -e "${RED}🛑 Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    kill $ISSUER_BACKEND_PID 2>/dev/null
    kill $ISSUER_FRONTEND_PID 2>/dev/null
    kill $VERIFIER_BACKEND_PID 2>/dev/null
    kill $VERIFIER_FRONTEND_PID 2>/dev/null
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:3002 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    lsof -ti:5174 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for all background processes
wait
