#!/bin/bash
#
# Start Complete Development Environment
#

echo "🚀 Peace Script AI - Starting Services..."
echo ""

# Kill existing processes
pkill -9 -f "vite|node.*comfyui-service|python.*ComfyUI" 2>/dev/null
sleep 2

# Start ComfyUI
echo "1️⃣  Starting ComfyUI..."
cd ~/Desktop/ComfyUI && python3 main.py --listen 0.0.0.0 --port 8188 > ~/Desktop/comfyui.log 2>&1 &
echo "   Started (logs: ~/Desktop/comfyui.log)"
sleep 3

# Start Backend
echo "2️⃣  Starting Backend..."
cd ~/Desktop/"peace-script-basic-v1 "/comfyui-service && node src/server.js > ~/Desktop/backend.log 2>&1 &
echo "   Started (logs: ~/Desktop/backend.log)"
sleep 3

# Start Frontend
echo "3️⃣  Starting Frontend..."
cd ~/Desktop/"peace-script-basic-v1 " && npx vite --host 0.0.0.0 &
VITE_PID=$!
echo "   Started (PID: $VITE_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Services Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:8000"
echo "   • ComfyUI:   http://localhost:8188"
echo ""
echo "📝 Logs:"
echo "   • ComfyUI:  ~/Desktop/comfyui.log"
echo "   • Backend:  ~/Desktop/backend.log"
echo "   • Frontend: (in this terminal)"
echo ""
echo "Press Ctrl+C to stop frontend (others run in background)"
echo ""

wait $VITE_PID
