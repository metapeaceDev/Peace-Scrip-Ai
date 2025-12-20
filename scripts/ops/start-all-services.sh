#!/bin/bash

# Peace Script - Start All Services
# วันที่: 2 ธันวาคม 2568

echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 Starting Peace Script Services...          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ฟังก์ชันตรวจสอบ port
check_port() {
  lsof -ti:$1 > /dev/null 2>&1
}

# ฟังก์ชันหยุด process บน port
kill_port() {
  echo "🔄 Stopping service on port $1..."
  lsof -ti:$1 | xargs kill -9 2>/dev/null
  sleep 1
}

# 1. หยุด services เก่า
echo "1️⃣ Stopping old services..."
kill_port 5173
kill_port 8000
echo "✅ Old services stopped"
echo ""

# 2. เริ่ม ComfyUI Backend Service
echo "2️⃣ Starting ComfyUI Backend Service (port 8000)..."
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 /comfyui-service"
nohup npm start > /tmp/comfyui-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

# ตรวจสอบ backend
if check_port 8000; then
  echo "   ✅ Backend running on port 8000"
else
  echo "   ❌ Backend failed to start"
  echo "   📋 Check logs: tail -f /tmp/comfyui-backend.log"
  exit 1
fi
echo ""

# 3. เริ่ม Frontend (Vite)
echo "3️⃣ Starting Frontend (port 5173)..."
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "
nohup npm run dev > /tmp/vite-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
sleep 3

# ตรวจสอบ frontend
if check_port 5173; then
  echo "   ✅ Frontend running on port 5173"
else
  echo "   ❌ Frontend failed to start"
  echo "   📋 Check logs: tail -f /tmp/vite-frontend.log"
  exit 1
fi
echo ""

# 4. ตรวจสอบและเริ่ม ComfyUI
echo "4️⃣ Checking ComfyUI (port 8188)..."
if check_port 8188; then
  echo "   ✅ ComfyUI is already running on port 8188"
else
  echo "   🔄 Starting ComfyUI..."
  cd ~/Desktop/ComfyUI
  nohup python3 main.py --listen 127.0.0.1 --port 8188 > /tmp/comfyui.log 2>&1 &
  COMFY_PID=$!
  echo "   ComfyUI PID: $COMFY_PID"
  sleep 5
  
  if check_port 8188; then
    echo "   ✅ ComfyUI started successfully on port 8188"
  else
    echo "   ❌ ComfyUI failed to start"
    echo "   📋 Check logs: tail -f /tmp/comfyui.log"
  fi
fi
echo ""

# 5. สรุปสถานะ
echo "╔══════════════════════════════════════════════════╗"
echo "║          ✅ All Services Started!               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📊 Service Status:"
echo "   ✅ Frontend:  http://localhost:5173 (PID: $FRONTEND_PID)"
echo "   ✅ Backend:   http://localhost:8000 (PID: $BACKEND_PID)"
echo "   ✅ ComfyUI:   http://localhost:8188"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/comfyui-backend.log"
echo "   Frontend: tail -f /tmp/vite-frontend.log"
echo ""
echo "🌐 Open browser: http://localhost:5173"
echo "   กด Cmd+Shift+R เพื่อ hard refresh"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop-all-services.sh"
echo ""
