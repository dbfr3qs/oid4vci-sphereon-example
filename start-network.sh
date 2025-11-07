#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting OID4VCI Example (Network Mode)${NC}"
echo ""

# Get local IP address
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    else
        # Linux
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    fi
    
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="localhost"
    fi
    
    echo "$LOCAL_IP"
}

LOCAL_IP=$(get_local_ip)

echo -e "${CYAN}📡 Network Configuration${NC}"
echo -e "   Local IP: ${GREEN}${LOCAL_IP}${NC}"
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
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   📱 WALLET TESTING - USE THESE URLS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}   ✅ Open in your browser:${NC}"
echo -e "      ${GREEN}http://${LOCAL_IP}:5173${NC}"
echo ""
echo -e "${GREEN}   ✅ Backend API (for wallet):${NC}"
echo -e "      ${GREEN}http://${LOCAL_IP}:3001${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}   📱 Steps to test with Sphereon Wallet:${NC}"
echo -e "      1. Open ${GREEN}http://${LOCAL_IP}:5173${NC} in your browser"
echo -e "      2. Create a credential offer"
echo -e "      3. Scan the QR code with your wallet"
echo -e "      4. Enter the PIN when prompted"
echo -e "      5. Credential will be added to your wallet! 🎉"
echo ""
echo -e "${YELLOW}   Press Ctrl+C to stop all services${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Export the API URL for frontend
export VITE_API_URL="http://${LOCAL_IP}:3001"

# Start services
npm run dev
