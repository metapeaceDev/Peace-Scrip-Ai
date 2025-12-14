#!/bin/bash

# Peace Script AI - Stop ComfyUI Complete System
# Stops: ComfyUI Server + Backend Service

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🛑 Stopping ComfyUI System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to stop service by PID file
stop_service() {
    local name=$1
    local pid_file="/tmp/peace-$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🛑 Stopping $name (PID: $pid)..."
            kill $pid
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                echo "   ⚠️  Force killing $name..."
                kill -9 $pid
            fi
            rm "$pid_file"
            echo "   ✅ $name stopped"
        else
            echo "   ℹ️  $name not running"
            rm "$pid_file"
        fi
    else
        echo "   ℹ️  No PID file for $name"
    fi
}

# Function to stop by port
stop_by_port() {
    local name=$1
    local port=$2
    
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "🛑 Stopping $name on port $port (PID: $pid)..."
        kill $pid
        sleep 2
        if lsof -ti :$port > /dev/null 2>&1; then
            kill -9 $pid
        fi
        echo "   ✅ $name stopped"
    else
        echo "   ℹ️  $name not running on port $port"
    fi
}

# Stop ComfyUI
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ComfyUI Server (port 8188)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

stop_service "ComfyUI"
stop_by_port "ComfyUI" "8188"

echo ""

# Stop Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend Service (port 8000)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

stop_service "Backend"
stop_by_port "Backend" "8000"

echo ""

# Clean up log files (optional)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "/tmp/peace-comfyui.log" ]; then
    echo "📝 ComfyUI log: /tmp/peace-comfyui.log (preserved)"
fi

if [ -f "/tmp/peace-backend.log" ]; then
    echo "📝 Backend log: /tmp/peace-backend.log (preserved)"
fi

echo ""
echo "✅ All services stopped"
echo ""
