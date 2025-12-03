#!/bin/bash

# 🔧 Disable ComfyUI Backend (Use Gemini API Instead)
# This script temporarily disables ComfyUI Backend to prevent hanging at 10%

echo "🔧 Disabling ComfyUI Backend..."

# Backup .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup
    echo "✅ Backed up .env.local to .env.local.backup"
fi

# Create new .env.local without ComfyUI Backend
cat > .env.local << 'EOF'
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCMZn8sVtszG_gl1NHjbViAnPy6JVeCHvo
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=624211706340
VITE_FIREBASE_APP_ID=1:624211706340:web:b46101b954cd19535187f1
VITE_FIREBASE_MEASUREMENT_ID=G-G9VBJB26Q8

# Gemini AI
VITE_GEMINI_API_KEY=AIzaSyALCWflX-gooPrxQQOv_tef1uSwlcEdOsA

# ComfyUI Configuration - DISABLED for now
# Using Gemini API instead (faster, free, no setup required)
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=false

# To re-enable ComfyUI Backend:
# 1. Start ComfyUI Backend Service: cd comfyui-service && npm start
# 2. Change VITE_USE_COMFYUI_BACKEND=true
# 3. Restart app: npm run dev
EOF

echo "✅ ComfyUI Backend disabled"
echo ""
echo "📌 Now using:"
echo "  • Gemini 2.5 Flash Image (primary)"
echo "  • Gemini 2.0 Flash Exp (fallback)"
echo "  • Pollinations.ai (last resort)"
echo ""
echo "🚀 Restart the app to apply changes:"
echo "   npm run dev"
echo ""
echo "💡 To re-enable ComfyUI Backend, run:"
echo "   ./enable-comfyui.sh"
