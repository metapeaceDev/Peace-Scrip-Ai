#!/bin/bash

# 🚀 Enable ComfyUI Backend (High Quality Image Generation)

echo "🚀 Enabling ComfyUI Backend..."

# Check if backup exists
if [ -f ".env.local.backup" ]; then
    cp .env.local.backup .env.local
    echo "✅ Restored .env.local from backup"
else
    # Update .env.local
    sed -i '' 's/VITE_USE_COMFYUI_BACKEND=false/VITE_USE_COMFYUI_BACKEND=true/' .env.local
    echo "✅ Updated VITE_USE_COMFYUI_BACKEND=true"
fi

echo ""
echo "✅ ComfyUI Backend enabled"
echo ""
echo "⚠️  Important: ComfyUI Backend Service must be running!"
echo ""
echo "🔧 To start ComfyUI Backend Service:"
echo "   cd comfyui-service"
echo "   npm install  # (first time only)"
echo "   npm start"
echo ""
echo "🚀 Then restart the main app:"
echo "   npm run dev"
echo ""
echo "📊 Benefits of ComfyUI Backend:"
echo "  • Higher image quality (SDXL/FLUX models)"
echo "  • Better Face ID matching (LoRA support)"
echo "  • No quota limits (unlimited)"
echo "  • More control over generation"
