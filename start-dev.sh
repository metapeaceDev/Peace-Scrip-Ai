#!/bin/bash
#
# Peace Script AI - Complete Development Environment Startup
# Starts all services: Frontend + Backend + Redis
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎨 Peace Script AI - Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check Redis
echo ""
echo "🔍 Checking Redis..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis CLI not found"
    echo "   Installing Redis via Homebrew..."
    brew install redis
fi

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo "🚀 Starting Redis..."
    brew services start redis
    sleep 2
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully"
    else
        echo "⚠️  Redis failed to start (will use in-memory queue)"
    fi
else
    echo "✅ Redis already running"
fi

# Check frontend dependencies
echo ""
echo "🔍 Checking frontend dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies installed"
fi

# Check backend dependencies
echo ""
echo "🔍 Checking backend dependencies..."
cd comfyui-service
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
else
    echo "✅ Backend dependencies installed"
fi

# Check backend .env
if [ ! -f ".env" ]; then
    echo "⚠️  Backend .env not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please configure .env with Firebase credentials"
fi

# Check service-account.json
if [ ! -f "service-account.json" ]; then
    echo "⚠️  Firebase service-account.json not found"
    echo ""
    echo "   To create service account key:"
    echo "   gcloud iam service-accounts keys create service-account.json \\"
    echo "     --iam-account=firebase-adminsdk-fbsvc@peace-script-ai.iam.gserviceaccount.com \\"
    echo "     --project=peace-script-ai"
    echo ""
fi

cd "$SCRIPT_DIR"

# Check frontend .env
if [ ! -f ".env.local" ]; then
    echo "⚠️  Frontend .env.local not found"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Starting Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Services will start on:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:8000"
echo "   • Redis:     localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""
sleep 2

# Start services using npm run dev:all
npm run dev:all
