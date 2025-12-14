#!/bin/bash
#
# Check ComfyUI Models Status
#

COMFYUI_DIR="$HOME/Desktop/ComfyUI"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 ComfyUI Models Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_directory() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir" ]; then
        echo "❌ $name: Directory not found"
        return
    fi
    
    local count=$(ls -1 "$dir"/*.safetensors 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$count" -eq 0 ]; then
        echo "⚠️  $name: No models found"
    else
        echo "✅ $name: $count model(s)"
        ls -lh "$dir"/*.safetensors 2>/dev/null | awk '{printf "   • %s (%s)\n", $9, $5}' | sed 's|.*/||'
    fi
}

echo "📁 Model Directories:"
echo ""

check_directory "$COMFYUI_DIR/models/checkpoints" "Checkpoints"
echo ""
check_directory "$COMFYUI_DIR/models/loras" "LoRA Models"
echo ""
check_directory "$COMFYUI_DIR/models/vae" "VAE Models"
echo ""

# Check total size
if [ -d "$COMFYUI_DIR/models" ]; then
    total_size=$(du -sh "$COMFYUI_DIR/models" 2>/dev/null | awk '{print $1}')
    echo "💾 Total Models Size: $total_size"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
