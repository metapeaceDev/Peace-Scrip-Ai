#!/bin/bash

# Peace Script AI - ComfyUI Startup Script
# Start ComfyUI server for Image + Video Generation

set -e

COMFYUI_DIR="$HOME/Desktop/ComfyUI"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎬 Peace Script AI - ComfyUI Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if ComfyUI is installed
if [ ! -d "$COMFYUI_DIR" ]; then
    echo "❌ ComfyUI not found at: $COMFYUI_DIR"
    echo ""
    echo "✅ ComfyUI is already cloned but dependencies need to be installed"
    echo ""
    echo "Run these commands:"
    echo "  cd ~/Desktop/ComfyUI"
    echo "  python3 -m pip install --user -r requirements.txt"
    echo ""
    exit 1
fi

cd "$COMFYUI_DIR"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found"
    exit 1
fi

echo "✅ ComfyUI: $(pwd)"
echo "✅ Python: $(python3 --version)"
echo ""

# Check models
echo "🔍 Checking models..."
if [ ! -d "models/checkpoints" ]; then
    mkdir -p models/checkpoints
fi
if [ ! -d "models/loras" ]; then
    mkdir -p models/loras
fi

CHECKPOINTS_COUNT=$(ls -1 models/checkpoints/*.safetensors 2>/dev/null | wc -l | tr -d ' ')
LORAS_COUNT=$(ls -1 models/loras/*.safetensors 2>/dev/null | wc -l | tr -d ' ')

echo "   • Checkpoints: $CHECKPOINTS_COUNT models"
echo "   • LoRA models: $LORAS_COUNT models"

if [ "$CHECKPOINTS_COUNT" -eq 0 ]; then
    echo ""
    echo "⚠️  No checkpoint models found!"
    echo "   Download SDXL/FLUX checkpoint to:"
    echo "   $COMFYUI_DIR/models/checkpoints/"
    echo ""
    echo "   Popular models:"
    echo "   • SDXL: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0"
    echo "   • FLUX: https://huggingface.co/black-forest-labs/FLUX.1-schnell"
    echo ""
fi

if [ "$LORAS_COUNT" -eq 0 ]; then
    echo "⚠️  No LoRA models found (optional but recommended)"
    echo "   Download to: $COMFYUI_DIR/models/loras/"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Starting ComfyUI Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🌐 Web UI:  http://localhost:8188"
echo "   📡 API:     http://localhost:8188/api"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start ComfyUI
python3 main.py --listen 0.0.0.0 --port 8188
