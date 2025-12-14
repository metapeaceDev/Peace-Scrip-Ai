#!/bin/bash
#
# Download Essential Models for ComfyUI
#

set -e

COMFYUI_DIR="$HOME/Desktop/ComfyUI"
CHECKPOINT_DIR="$COMFYUI_DIR/models/checkpoints"
LORA_DIR="$COMFYUI_DIR/models/loras"
VAE_DIR="$COMFYUI_DIR/models/vae"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎨 Peace Script AI - Model Downloader"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create directories
mkdir -p "$CHECKPOINT_DIR"
mkdir -p "$LORA_DIR"
mkdir -p "$VAE_DIR"

# Function to download file
download_model() {
    local url=$1
    local dest=$2
    local name=$3
    
    if [ -f "$dest" ]; then
        echo "⏭️  Skipping: $name (already exists)"
        return 0
    fi
    
    echo "📥 Downloading: $name"
    echo "   → $dest"
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress "$url" -O "$dest" 2>&1 || {
            echo "   ❌ Download failed"
            rm -f "$dest"
            return 1
        }
    elif command -v curl &> /dev/null; then
        curl -L -# "$url" -o "$dest" || {
            echo "   ❌ Download failed"
            rm -f "$dest"
            return 1
        }
    else
        echo "   ❌ Neither wget nor curl found"
        return 1
    fi
    
    echo "   ✅ Downloaded successfully"
    return 0
}

echo "🎯 Option 1: Download FLUX.1 Schnell (Recommended - Fast)"
echo "   Size: ~23 GB"
echo "   Source: HuggingFace"
echo ""
echo "🎯 Option 2: Download SDXL 1.0 Base"
echo "   Size: ~6.9 GB"
echo "   Source: HuggingFace"
echo ""
echo "🎯 Option 3: Manual Download (Civitai)"
echo "   Visit: https://civitai.com"
echo "   Download to: $CHECKPOINT_DIR"
echo ""

read -p "Choose option (1/2/3) or 's' to skip: " choice

case $choice in
    1)
        echo ""
        echo "📦 Downloading FLUX.1 Schnell..."
        download_model \
            "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors" \
            "$CHECKPOINT_DIR/flux1-schnell.safetensors" \
            "FLUX.1 Schnell"
        ;;
    2)
        echo ""
        echo "📦 Downloading SDXL 1.0 Base..."
        download_model \
            "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" \
            "$CHECKPOINT_DIR/sd_xl_base_1.0.safetensors" \
            "SDXL 1.0 Base"
        
        echo ""
        echo "📦 Downloading SDXL VAE..."
        download_model \
            "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors" \
            "$VAE_DIR/sdxl_vae.safetensors" \
            "SDXL VAE"
        ;;
    3)
        echo ""
        echo "ℹ️  Manual download instructions:"
        echo "   1. Visit: https://civitai.com"
        echo "   2. Search for models (SDXL, FLUX, etc.)"
        echo "   3. Download .safetensors files"
        echo "   4. Place in: $CHECKPOINT_DIR"
        echo ""
        ;;
    s|S)
        echo ""
        echo "⏭️  Skipping checkpoint download"
        echo ""
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 LoRA Models (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ℹ️  LoRA models enhance image generation"
echo "   Recommended: Add Details XL, SDXL Render"
echo ""
echo "Manual download:"
echo "   1. Visit: https://civitai.com/models"
echo "   2. Search: 'add details xl' or 'sdxl render'"
echo "   3. Download .safetensors files"
echo "   4. Place in: $LORA_DIR"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Model Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

checkpoint_count=$(ls -1 "$CHECKPOINT_DIR"/*.safetensors 2>/dev/null | wc -l | tr -d ' ')
lora_count=$(ls -1 "$LORA_DIR"/*.safetensors 2>/dev/null | wc -l | tr -d ' ')
vae_count=$(ls -1 "$VAE_DIR"/*.safetensors 2>/dev/null | wc -l | tr -d ' ')

echo "📁 Checkpoints: $checkpoint_count models"
echo "📁 LoRA models: $lora_count models"
echo "📁 VAE models:  $vae_count models"
echo ""

if [ "$checkpoint_count" -eq 0 ]; then
    echo "⚠️  No checkpoint models found"
    echo "   ComfyUI requires at least one checkpoint to work"
    echo ""
    echo "Quick download commands:"
    echo ""
    echo "   # FLUX.1 Schnell (23 GB - Recommended)"
    echo "   wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors \\"
    echo "        -O $CHECKPOINT_DIR/flux1-schnell.safetensors"
    echo ""
    echo "   # SDXL 1.0 Base (6.9 GB)"
    echo "   wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors \\"
    echo "        -O $CHECKPOINT_DIR/sd_xl_base_1.0.safetensors"
    echo ""
else
    echo "✅ Ready to use ComfyUI!"
    echo ""
    echo "🚀 Start ComfyUI:"
    echo "   ./start-comfyui.sh"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
