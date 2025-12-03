#!/bin/bash

# Peace Script AI - Complete ComfyUI System Startup
# Starts: ComfyUI Server + Backend Service + Redis (if needed)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMFYUI_DIR="$HOME/Desktop/ComfyUI"
BACKEND_DIR="$PROJECT_DIR/comfyui-service"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎬 Peace Script AI - ComfyUI Complete System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -i :$port > /dev/null 2>&1
}

# Function to start a service in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    
    echo "🚀 Starting $name..."
    
    # Check if already running
    if check_port $port; then
        echo "   ✅ $name already running on port $port"
        return 0
    fi
    
    # Start service
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "/tmp/peace-$name.pid"
    
    # Wait for service to be ready
    echo -n "   ⏳ Waiting for $name to start"
    local max_wait=30
    local count=0
    while ! check_port $port && [ $count -lt $max_wait ]; do
        echo -n "."
        sleep 1
        count=$((count + 1))
    done
    echo ""
    
    if check_port $port; then
        echo "   ✅ $name started successfully (PID: $pid)"
        echo "   📝 Logs: $log_file"
        return 0
    else
        echo "   ❌ $name failed to start"
        cat "$log_file" | tail -10
        return 1
    fi
}

# Step 1: Check Redis
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Redis Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "⚠️  Redis not running. Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        sleep 2
        if redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis started successfully"
        else
            echo "❌ Failed to start Redis"
            echo "   Install Redis: brew install redis"
            exit 1
        fi
    else
        echo "⚠️  Redis not installed. Backend will use in-memory queue."
        echo "   For better performance, install Redis: brew install redis"
    fi
fi

echo ""

# Step 2: Start ComfyUI
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: ComfyUI Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$COMFYUI_DIR" ]; then
    echo "❌ ComfyUI not found at: $COMFYUI_DIR"
    exit 1
fi

# Check models
CHECKPOINTS_COUNT=$(ls -1 "$COMFYUI_DIR/models/checkpoints/"*.safetensors 2>/dev/null | wc -l | tr -d ' ')
LORAS_COUNT=$(ls -1 "$COMFYUI_DIR/models/loras/"*.safetensors 2>/dev/null | wc -l | tr -d ' ')

echo "📦 Models Status:"
echo "   • Checkpoints: $CHECKPOINTS_COUNT"
echo "   • LoRAs: $LORAS_COUNT"
echo ""

if [ "$CHECKPOINTS_COUNT" -eq 0 ]; then
    echo "⚠️  No checkpoint models found!"
    echo "   Download SDXL checkpoint to: $COMFYUI_DIR/models/checkpoints/"
    echo ""
fi

# ComfyUI startup (use MPS on Mac for better performance)
COMFYUI_ARGS="--listen 0.0.0.0 --port 8188"

start_service "ComfyUI" \
    "cd '$COMFYUI_DIR' && python3 main.py $COMFYUI_ARGS" \
    "8188" \
    "/tmp/peace-comfyui.log"

echo ""

# Step 3: Start Backend Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Backend Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

start_service "Backend" \
    "cd '$BACKEND_DIR' && npm start" \
    "8000" \
    "/tmp/peace-backend.log"

echo ""

# Step 4: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 4: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 3

echo "🔍 Testing endpoints..."
echo ""

# Test ComfyUI
if curl -s http://localhost:8188 > /dev/null 2>&1; then
    echo "✅ ComfyUI:  http://localhost:8188"
else
    echo "❌ ComfyUI: Not responding"
fi

# Test Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend:  http://localhost:8000"
    echo ""
    echo "📊 Backend Status:"
    curl -s http://localhost:8000/health/detailed | python3 -m json.tool 2>/dev/null || echo "   (JSON parse error)"
else
    echo "❌ Backend: Not responding"
fi

echo ""

# Step 5: Final Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 System Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 API Endpoints:"
echo "   • ComfyUI:  http://localhost:8188"
echo "   • Backend:  http://localhost:8000"
echo "   • Health:   http://localhost:8000/health/detailed"
echo ""
echo "📝 Logs:"
echo "   • ComfyUI:  tail -f /tmp/peace-comfyui.log"
echo "   • Backend:  tail -f /tmp/peace-backend.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop-comfyui-full.sh"
echo ""
echo "✅ Ready for image generation!"
echo ""
