#!/bin/bash
# Download ComfyUI models for AnimateDiff and SVD
# Run this script after installing ComfyUI

set -e

COMFYUI_PATH=${COMFYUI_PATH:-"/workspace/ComfyUI"}
MODELS_PATH="$COMFYUI_PATH/models"

echo "📦 ComfyUI Model Downloader"
echo "=========================="
echo "Target path: $MODELS_PATH"
echo ""

# Create model directories
echo "📁 Creating model directories..."
mkdir -p "$MODELS_PATH/checkpoints"
mkdir -p "$MODELS_PATH/animatediff_models"
mkdir -p "$MODELS_PATH/loras"
mkdir -p "$MODELS_PATH/vae"
mkdir -p "$MODELS_PATH/clip"

# ============================================
# 1. SDXL Base Model (Required for AnimateDiff)
# ============================================
echo ""
echo "⬇️  Downloading SDXL Base Model..."
echo "Size: ~6.9GB | Time: ~10-20 minutes"
cd "$MODELS_PATH/checkpoints"

if [ ! -f "sd_xl_base_1.0.safetensors" ]; then
  wget -c https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors \
    -O sd_xl_base_1.0.safetensors
  echo "✅ SDXL Base downloaded"
else
  echo "✅ SDXL Base already exists"
fi

# ============================================
# 2. AnimateDiff Models (Tier 2)
# ============================================
echo ""
echo "⬇️  Downloading AnimateDiff Models..."
cd "$MODELS_PATH/animatediff_models"

# AnimateDiff v2 (fallback)
if [ ! -f "mm_sd_v15_v2.ckpt" ]; then
  echo "Downloading AnimateDiff v2..."
  wget -c https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt \
    -O mm_sd_v15_v2.ckpt
  echo "✅ AnimateDiff v2 downloaded"
else
  echo "✅ AnimateDiff v2 already exists"
fi

# AnimateDiff v3 (primary)
if [ ! -f "mm-sd-v3.safetensors" ]; then
  echo "Downloading AnimateDiff v3..."
  wget -c https://huggingface.co/guoyww/animatediff/resolve/main/mm-sd-v3.safetensors \
    -O mm-sd-v3.safetensors
  echo "✅ AnimateDiff v3 downloaded"
else
  echo "✅ AnimateDiff v3 already exists"
fi

# ============================================
# 3. SVD Model (Tier 3)
# ============================================
echo ""
echo "⬇️  Downloading Stable Video Diffusion 1.1..."
echo "Size: ~9.6GB | Time: ~15-25 minutes"
cd "$MODELS_PATH/checkpoints"

if [ ! -f "svd_xt_1_1.safetensors" ]; then
  wget -c https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors \
    -O svd_xt_1_1.safetensors
  echo "✅ SVD 1.1 downloaded"
else
  echo "✅ SVD 1.1 already exists"
fi

# ============================================
# 4. Detail Enhancer LoRA (Optional but recommended)
# ============================================
echo ""
echo "⬇️  Downloading Detail Enhancer LoRA..."
cd "$MODELS_PATH/loras"

if [ ! -f "add_detail.safetensors" ]; then
  # Using direct download from CivitAI
  wget -c "https://civitai.com/api/download/models/87153" \
    -O add_detail.safetensors \
    --header="User-Agent: Mozilla/5.0"
  echo "✅ Detail LoRA downloaded"
else
  echo "✅ Detail LoRA already exists"
fi

# ============================================
# 5. VAE (Optional - improves quality)
# ============================================
echo ""
echo "⬇️  Downloading VAE..."
cd "$MODELS_PATH/vae"

if [ ! -f "sdxl_vae.safetensors" ]; then
  wget -c https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors \
    -O sdxl_vae.safetensors
  echo "✅ SDXL VAE downloaded"
else
  echo "✅ SDXL VAE already exists"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "================================"
echo "✅ Model Download Complete!"
echo "================================"
echo ""
echo "📊 Downloaded Models:"
echo "  ✅ SDXL Base 1.0         (~6.9GB)"
echo "  ✅ AnimateDiff v2        (~1.7GB)"
echo "  ✅ AnimateDiff v3        (~1.8GB)"
echo "  ✅ SVD 1.1               (~9.6GB)"
echo "  ✅ Detail LoRA           (~154MB)"
echo "  ✅ SDXL VAE              (~335MB)"
echo ""
echo "📁 Model Paths:"
echo "  Checkpoints:    $MODELS_PATH/checkpoints/"
echo "  AnimateDiff:    $MODELS_PATH/animatediff_models/"
echo "  LoRAs:          $MODELS_PATH/loras/"
echo "  VAE:            $MODELS_PATH/vae/"
echo ""
echo "💾 Total Size: ~20GB"
echo ""
echo "🚀 Next Steps:"
echo "  1. Verify models: ls -lh $MODELS_PATH/**/*.safetensors"
echo "  2. Start ComfyUI backend: cd comfyui-backend && python main.py"
echo "  3. Test generation from Peace Script AI"
echo ""
