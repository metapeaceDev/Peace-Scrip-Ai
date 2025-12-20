#!/bin/bash

# ========================================
# Download FLUX.1-schnell Model
# ========================================
# Faster variant of FLUX.1-dev
# Speed: 2x faster (20s vs 45s)
# Quality: Same as dev
# Size: ~16GB
# ========================================

set -e

echo "🚀 Starting FLUX.1-schnell download..."
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

# Create models directory if it doesn't exist
MODELS_DIR="$COMFYUI_DIR/models/checkpoints"
mkdir -p "$MODELS_DIR"

echo ""
echo "📂 Models directory: $MODELS_DIR"
echo ""

# Model details
MODEL_NAME="flux1-schnell.safetensors"
MODEL_PATH="$MODELS_DIR/$MODEL_NAME"
MODEL_URL="https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
MODEL_SIZE="~16GB"

# Check if model already exists
if [ -f "$MODEL_PATH" ]; then
    echo -e "${YELLOW}⚠️  FLUX.1-schnell already exists!${NC}"
    echo ""
    read -p "Re-download? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Skipping download."
        exit 0
    fi
    echo "Removing old file..."
    rm "$MODEL_PATH"
fi

# Check available disk space
echo "📊 Checking disk space..."
AVAILABLE_SPACE=$(df -h "$MODELS_DIR" | awk 'NR==2 {print $4}')
echo "Available space: $AVAILABLE_SPACE"
echo -e "${YELLOW}Required: $MODEL_SIZE${NC}"
echo ""

# Download using wget or curl
echo "📥 Downloading FLUX.1-schnell..."
echo "This will take a while (16GB download)..."
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

# Verify download
if [ -f "$MODEL_PATH" ]; then
    FILE_SIZE=$(du -h "$MODEL_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Download complete!${NC}"
    echo "File: $MODEL_PATH"
    echo "Size: $FILE_SIZE"
    echo ""
    
    # Show model info
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎨 FLUX.1-schnell Model Info"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Type: Text-to-Image"
    echo "Speed: ⚡⚡⚡ Fast (20s avg)"
    echo "Quality: ⭐⭐⭐⭐⭐ Excellent"
    echo "Steps: 8 (vs 28 for dev)"
    echo "VRAM: 12-16GB required"
    echo ""
    echo "Comparison with FLUX.1-dev:"
    echo "  Speed: 2x faster (20s vs 45s)"
    echo "  Quality: Same"
    echo "  Steps: 8 vs 28"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Next steps
    echo "📝 Next Steps:"
    echo "1. Update comfyuiWorkflowBuilder.ts to use this model"
    echo "2. Set steps=8 for schnell (vs steps=28 for dev)"
    echo "3. Test generation speed"
    echo "4. Download SDXL Turbo for even faster generation"
    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
else
    echo -e "${RED}❌ Download failed!${NC}"
    exit 1
fi
