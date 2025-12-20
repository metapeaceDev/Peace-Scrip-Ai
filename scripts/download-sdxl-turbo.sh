#!/bin/bash

# ========================================
# Download SDXL Turbo Model
# ========================================
# Ultra-fast SDXL variant
# Speed: 4 steps only (5s generation)
# Quality: Good (⭐⭐⭐⭐)
# Size: ~6.5GB
# ========================================

set -e

echo "🚀 Starting SDXL Turbo download..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect ComfyUI directory
COMFYUI_DIR=""
POSSIBLE_DIRS=(
    "$HOME/ComfyUI"
    "$HOME/Desktop/ComfyUI"
    "/Applications/ComfyUI"
    "$(dirname "$0")/../ComfyUI"
)

echo "🔍 Searching for ComfyUI installation..."
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        COMFYUI_DIR="$dir"
        echo -e "${GREEN}✓ Found ComfyUI at: $COMFYUI_DIR${NC}"
        break
    fi
done

if [ -z "$COMFYUI_DIR" ]; then
    echo -e "${RED}❌ ComfyUI not found!${NC}"
    echo ""
    echo "Please specify ComfyUI directory:"
    read -p "Path: " COMFYUI_DIR
    
    if [ ! -d "$COMFYUI_DIR" ]; then
        echo -e "${RED}❌ Directory does not exist!${NC}"
        exit 1
    fi
fi

# Create models directory
MODELS_DIR="$COMFYUI_DIR/models/checkpoints"
mkdir -p "$MODELS_DIR"

echo ""
echo "📂 Models directory: $MODELS_DIR"
echo ""

# Model details
MODEL_NAME="sd_xl_turbo_1.0.safetensors"
MODEL_PATH="$MODELS_DIR/$MODEL_NAME"
MODEL_URL="https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors"
MODEL_SIZE="~6.5GB"

# Check if model exists
if [ -f "$MODEL_PATH" ]; then
    echo -e "${YELLOW}⚠️  SDXL Turbo already exists!${NC}"
    echo ""
    read -p "Re-download? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Skipping download."
        exit 0
    fi
    echo "Removing old file..."
    rm "$MODEL_PATH"
fi

# Check disk space
echo "📊 Checking disk space..."
AVAILABLE_SPACE=$(df -h "$MODELS_DIR" | awk 'NR==2 {print $4}')
echo "Available space: $AVAILABLE_SPACE"
echo -e "${YELLOW}Required: $MODEL_SIZE${NC}"
echo ""

# Download
echo "📥 Downloading SDXL Turbo..."
echo "This will take 10-20 minutes (6.5GB download)..."
echo ""

if command -v wget &> /dev/null; then
    echo "Using wget..."
    wget --continue \
         --show-progress \
         --progress=bar:force:noscroll \
         -O "$MODEL_PATH" \
         "$MODEL_URL"
elif command -v curl &> /dev/null; then
    echo "Using curl..."
    curl -L \
         --progress-bar \
         -C - \
         -o "$MODEL_PATH" \
         "$MODEL_URL"
else
    echo -e "${RED}❌ Neither wget nor curl found!${NC}"
    echo "Please install wget or curl:"
    echo "  brew install wget"
    exit 1
fi

# Verify
if [ -f "$MODEL_PATH" ]; then
    FILE_SIZE=$(du -h "$MODEL_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Download complete!${NC}"
    echo "File: $MODEL_PATH"
    echo "Size: $FILE_SIZE"
    echo ""
    
    # Model info
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚡ SDXL Turbo Model Info"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Type: Text-to-Image (Ultra-Fast)"
    echo "Speed: ⚡⚡⚡⚡ Ultra Fast (5s avg)"
    echo "Quality: ⭐⭐⭐⭐ Good"
    echo "Steps: 4 only!"
    echo "CFG: 1.0 (low guidance)"
    echo "VRAM: 6-8GB required"
    echo ""
    echo "Best For:"
    echo "  • Quick previews"
    echo "  • Rapid iteration"
    echo "  • Low-end GPUs"
    echo "  • Speed over quality"
    echo ""
    echo "Comparison:"
    echo "  vs SDXL Base: 5x faster (5s vs 25s)"
    echo "  vs FLUX dev: 9x faster (5s vs 45s)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Next steps
    echo "📝 Next Steps:"
    echo "1. Use SDXL Turbo for SPEED mode"
    echo "2. Set steps=4, cfg=1.0"
    echo "3. Perfect for quick storyboard sketches"
    echo "4. Download LoRA models for better quality"
    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
else
    echo -e "${RED}❌ Download failed!${NC}"
    exit 1
fi
