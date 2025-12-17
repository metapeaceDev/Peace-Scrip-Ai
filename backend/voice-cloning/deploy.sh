#!/bin/bash

###############################################################################
# Voice Cloning Server - Quick Deploy Script
# Deploys Coqui XTTS-v2 voice cloning server in one command
###############################################################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎙️  VOICE CLONING SERVER - QUICK DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check Python version
echo "📋 Step 1: Checking Python version..."
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if [ "$PYTHON_VERSION" = "3.11" ]; then
        PYTHON_CMD="python3"
    else
        echo "❌ ERROR: Python 3.11 required (found $PYTHON_VERSION)"
        echo "Please install Python 3.11 first"
        exit 1
    fi
else
    echo "❌ ERROR: Python 3 not found"
    exit 1
fi

echo "   ✅ Using: $PYTHON_CMD ($($PYTHON_CMD --version))"
echo ""

# Create virtual environment if not exists
if [ ! -d "venv-tts" ]; then
    echo "📦 Step 2: Creating virtual environment..."
    $PYTHON_CMD -m venv venv-tts
    echo "   ✅ Virtual environment created"
else
    echo "📦 Step 2: Virtual environment exists"
fi
echo ""

# Activate virtual environment
echo "🔧 Step 3: Activating environment..."
source venv-tts/bin/activate
echo "   ✅ Environment activated"
echo ""

# Upgrade pip
echo "⬆️  Step 4: Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo "   ✅ pip upgraded"
echo ""

# Install dependencies
echo "📥 Step 5: Installing dependencies..."
if [ -f "requirements.txt" ]; then
    echo "   Installing from requirements.txt..."
    pip install -r requirements.txt
    echo "   ✅ Dependencies installed"
else
    echo "   Installing core packages..."
    pip install TTS flask flask-cors torch torchaudio
    echo "   ✅ Core packages installed"
fi
echo ""

# Create directories
echo "📁 Step 6: Creating directories..."
mkdir -p uploads outputs models
echo "   ✅ Directories created"
echo ""

# Check if model exists
echo "🔍 Step 7: Checking XTTS-v2 model..."
if [ -d "$HOME/.local/share/tts/tts_models--multilingual--multi-dataset--xtts_v2" ]; then
    echo "   ✅ Model already downloaded"
else
    echo "   ⏳ Downloading XTTS-v2 model (~1.8GB)..."
    echo "   This may take 5-10 minutes..."
    python3 -c "from TTS.api import TTS; TTS(model_name='tts_models/multilingual/multi-dataset/xtts_v2')" 2>&1 | grep -v "WARNING"
    echo "   ✅ Model downloaded"
fi
echo ""

# Test import
echo "🧪 Step 8: Testing TTS import..."
python3 -c "from TTS.api import TTS; print('   ✅ TTS import successful')" 2>&1 | grep "✅"
echo ""

# Check port availability
echo "🔌 Step 9: Checking port 8001..."
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ⚠️  Port 8001 is in use"
    echo "   Attempting to stop existing server..."
    lsof -ti:8001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi
echo "   ✅ Port 8001 available"
echo ""

# Start server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STARTING VOICE CLONING SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Server will start on: http://localhost:8001"
echo "Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run server
python3 server.py
