#!/bin/bash

# Peace Script AI - Development Environment Setup Script
# This script sets up and starts both frontend and backend services

set -e  # Exit on error

echo "🚀 Peace Script AI - Development Setup"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "🔍 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if .env.local exists
echo "🔍 Checking frontend environment..."
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from .env.example...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}📝 Please edit .env.local with your API keys${NC}"
    echo ""
fi
echo -e "${GREEN}✅ Frontend environment configured${NC}"
echo ""

# Check if backend .env exists
echo "🔍 Checking backend environment..."
if [ ! -f "comfyui-service/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env not found. Creating from .env.example...${NC}"
    cp comfyui-service/.env.example comfyui-service/.env
    echo -e "${YELLOW}📝 Please edit comfyui-service/.env with your Firebase credentials${NC}"
    echo ""
fi
echo -e "${GREEN}✅ Backend environment configured${NC}"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
if [ ! -d "comfyui-service/node_modules" ]; then
    cd comfyui-service
    npm install
    cd ..
else
    echo -e "${GREEN}✅ Backend dependencies already installed${NC}"
fi
echo ""

# Start Redis using Docker Compose
echo "🔄 Starting Redis..."
cd comfyui-service
if docker ps | grep -q comfyui-redis; then
    echo -e "${GREEN}✅ Redis is already running${NC}"
else
    docker-compose up -d redis
    echo -e "${GREEN}✅ Redis started${NC}"
fi
cd ..
echo ""

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 3
echo -e "${GREEN}✅ Redis is ready${NC}"
echo ""

# Check if ComfyUI is running (optional)
echo "🔍 Checking ComfyUI availability..."
if curl -s http://localhost:8188/system_stats > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ComfyUI is running on http://localhost:8188${NC}"
else
    echo -e "${YELLOW}⚠️  ComfyUI is not running on http://localhost:8188${NC}"
    echo -e "${YELLOW}   Backend will start without workers. You can add them later.${NC}"
fi
echo ""

echo "🎯 Setup complete! You can now start the services:"
echo ""
echo -e "${GREEN}Option 1: Start all services (recommended)${NC}"
echo "  npm run dev:all"
echo ""
echo -e "${GREEN}Option 2: Start services separately${NC}"
echo "  Terminal 1: npm run dev              # Frontend"
echo "  Terminal 2: npm run dev:backend      # Backend"
echo ""
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo "  1. Update .env.local with your Firebase & Gemini API keys"
echo "  2. Update comfyui-service/.env with Firebase service account"
echo "  3. Start ComfyUI if you want to use advanced image generation"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"
