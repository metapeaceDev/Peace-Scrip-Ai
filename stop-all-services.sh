#!/bin/bash

# Peace Script - Stop All Services
# วันที่: 2 ธันวาคม 2568

echo "╔══════════════════════════════════════════════════╗"
echo "║   🛑 Stopping Peace Script Services...          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ฟังก์ชันหยุด process บน port
kill_port() {
  if lsof -ti:$1 > /dev/null 2>&1; then
    echo "🔄 Stopping service on port $1..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null
    sleep 1
    echo "   ✅ Port $1 freed"
  else
    echo "   ℹ️  No service on port $1"
  fi
}

# หยุด services
kill_port 5173  # Frontend
kill_port 8000  # Backend

echo ""
echo "✅ All services stopped"
echo ""
