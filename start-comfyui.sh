#!/bin/bash

# Peace Script AI - ComfyUI Startup Script
# ใช้สำหรับเริ่มต้น ComfyUI server สำหรับ Image + Video Generation

echo "🎬 Starting ComfyUI for Peace Script AI..."
echo ""

# ตรวจสอบว่ามี ComfyUI folder
if [ ! -d "$HOME/Desktop/ComfyUI" ]; then
    echo "❌ ComfyUI not found at ~/Desktop/ComfyUI"
    echo ""
    echo "📦 Installing ComfyUI..."
    cd "$HOME/Desktop"
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    
    echo "🐍 Setting up Python environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install torch torchvision torchaudio
    
    echo ""
    echo "✅ ComfyUI installed successfully!"
    echo ""
    echo "📥 Next steps:"
    echo "1. Download models to models/checkpoints/"
    echo "2. Download LoRA to models/loras/"
    echo "3. Run this script again"
    echo ""
    exit 0
fi

cd "$HOME/Desktop/ComfyUI"

# เปิดใช้งาน virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found"
    echo "Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

echo "✅ ComfyUI environment activated"
echo ""

# ตรวจสอบ models
echo "📦 Checking models..."
CHECKPOINTS_COUNT=$(ls models/checkpoints/*.safetensors 2>/dev/null | wc -l)
LORAS_COUNT=$(ls models/loras/*.safetensors 2>/dev/null | wc -l)

echo "  Checkpoints: $CHECKPOINTS_COUNT"
echo "  LoRAs: $LORAS_COUNT"
echo ""

if [ "$CHECKPOINTS_COUNT" -eq 0 ]; then
    echo "⚠️  No checkpoint models found!"
    echo "Download SDXL: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0"
    echo "Download SVD: https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1"
    echo ""
fi

# ตรวจสอบ custom nodes
echo "🔌 Checking custom nodes..."
if [ -d "custom_nodes/ComfyUI-VideoHelperSuite" ]; then
    echo "  ✅ VideoHelperSuite installed"
else
    echo "  ❌ VideoHelperSuite not found (required for video generation)"
    echo "  Install: cd custom_nodes && git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git"
fi

if [ -d "custom_nodes/ComfyUI-AnimateDiff-Evolved" ]; then
    echo "  ✅ AnimateDiff-Evolved installed"
else
    echo "  ℹ️  AnimateDiff-Evolved not found (optional for advanced animation)"
fi

echo ""
echo "🚀 Starting ComfyUI server..."
echo "   URL: http://localhost:8188"
echo "   Press Ctrl+C to stop"
echo ""

# เริ่ม ComfyUI
python main.py --listen 0.0.0.0 --port 8188
