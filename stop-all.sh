#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OID4VCI + OID4VP System Shutdown                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ports used by the system
PORTS=(3001 3002 5173 5174)

echo -e "${YELLOW}🔍 Checking for running services...${NC}"
echo ""

# Check each port and kill processes if found
FOUND_PROCESSES=false

for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        FOUND_PROCESSES=true
        echo -e "${YELLOW}🛑 Stopping processes on port ${PORT}...${NC}"
        echo "$PIDS" | xargs kill -9 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}   ✓ Port ${PORT} cleared${NC}"
        else
            echo -e "${RED}   ✗ Failed to stop processes on port ${PORT}${NC}"
        fi
    else
        echo -e "${BLUE}   ℹ No processes found on port ${PORT}${NC}"
    fi
done

echo ""

if [ "$FOUND_PROCESSES" = true ]; then
    echo -e "${GREEN}✅ All services stopped successfully${NC}"
else
    echo -e "${BLUE}ℹ️  No running services found${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stopped Services                                          ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  Port 3001: Issuer Backend                                 ║${NC}"
echo -e "${BLUE}║  Port 5173: Issuer Frontend                                ║${NC}"
echo -e "${BLUE}║  Port 3002: Verifier Backend                               ║${NC}"
echo -e "${BLUE}║  Port 5174: Verifier Frontend                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
