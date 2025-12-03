#!/bin/bash

# Peace Script - System Status Check
# เช็คสถานะระบบทั้งหมด

clear
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🔍 Peace Script - System Status Check           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
  local name=$1
  local port=$2
  local url=$3
  
  echo -n "Checking $name (port $port)... "
  if curl -s "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
    return 0
  else
    echo -e "${RED}❌ Not Running${NC}"
    return 1
  fi
}

# 1. Check Services
echo "📡 Services Status:"
check_service "Frontend" "5173" "http://localhost:5173"
FRONTEND_OK=$?

check_service "Backend" "8000" "http://localhost:8000/health"
BACKEND_OK=$?

check_service "ComfyUI" "8188" "http://localhost:8188/system_stats"
COMFYUI_OK=$?

echo ""

# 2. Check Models
echo "🤖 AI Models:"
if [ -f ~/Desktop/ComfyUI/models/checkpoints/flux_dev.safetensors ]; then
  echo -e "   ${GREEN}✅${NC} FLUX.1-dev (16GB) - Ready"
else
  echo -e "   ${RED}❌${NC} FLUX.1-dev - Not Found"
fi

if [ -f ~/Desktop/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors ]; then
  echo -e "   ${GREEN}✅${NC} SDXL Base (6.5GB) - Ready"
else
  echo -e "   ${RED}❌${NC} SDXL Base - Not Found"
fi

if [ -f ~/Desktop/ComfyUI/models/loras/Hunt3.safetensors ]; then
  echo -e "   ${GREEN}✅${NC} Hunt3 LoRA (36MB) - Ready"
else
  echo -e "   ${RED}❌${NC} Hunt3 LoRA - Not Found"
fi

echo ""

# 3. Test Backend API
echo "🔧 Backend API Test:"
if [ $BACKEND_OK -eq 0 ]; then
  HEALTH=$(curl -s http://localhost:8000/health)
  STATUS=$(echo $HEALTH | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  UPTIME=$(echo $HEALTH | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
  
  if [ "$STATUS" = "healthy" ]; then
    echo -e "   ${GREEN}✅${NC} Health: $STATUS"
    echo -e "   ${GREEN}⏱${NC}  Uptime: ${UPTIME}s"
  else
    echo -e "   ${YELLOW}⚠️${NC}  Health: $STATUS"
  fi
else
  echo -e "   ${RED}❌${NC} Backend not responding"
fi

echo ""

# 4. Summary
echo "╔══════════════════════════════════════════════════════════╗"
if [ $FRONTEND_OK -eq 0 ] && [ $BACKEND_OK -eq 0 ] && [ $COMFYUI_OK -eq 0 ]; then
  echo -e "║  ${GREEN}✅ All Systems Operational - Ready to Use!${NC}          ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "🌐 Access Application:"
  echo "   → http://localhost:5173"
  echo ""
  echo "💡 Next Steps:"
  echo "   1. Open browser: http://localhost:5173"
  echo "   2. Press Cmd+Shift+R (hard refresh)"
  echo "   3. Start creating characters!"
  echo ""
else
  echo -e "║  ${RED}❌ Some Services Not Running${NC}                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "🔧 Fix:"
  echo "   ./start-all-services.sh"
  echo ""
fi

echo "📋 Useful Commands:"
echo "   Status:  ./check-status.sh"
echo "   Start:   ./start-all-services.sh"
echo "   Stop:    ./stop-all-services.sh"
echo "   Logs:    tail -f /tmp/comfyui-backend.log"
echo ""
