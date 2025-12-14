#!/bin/bash

##############################################################################
# RunPod One-Click Setup Script
# Peace Script AI - ComfyUI Backend Deployment
#
# This script automates the entire RunPod setup process:
# 1. Installs ComfyUI
# 2. Downloads all required models (~20GB)
# 3. Sets up Python backend server
# 4. Configures environment
# 5. Starts the service
#
# Usage:
#   ssh root@your-runpod-instance.runpod.io -p PORT
#   wget https://raw.githubusercontent.com/YOUR_REPO/runpod-setup.sh
#   chmod +x runpod-setup.sh
#   ./runpod-setup.sh
#
# Or one-liner:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/runpod-setup.sh | bash
#
# Author: Peace Script AI Team
# Version: 1.0.0
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKSPACE="/workspace"
COMFYUI_DIR="${WORKSPACE}/ComfyUI"
BACKEND_DIR="${WORKSPACE}/peace-script-backend"
MODELS_DIR="${COMFYUI_DIR}/models"

# Model URLs
MODELS=(
  "checkpoints:https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
  "animatediff_models:https://huggingface.co/guoyww/animatediff/resolve/main/mm-sd-v3.safetensors"
  "animatediff_models:https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt"
  "checkpoints:https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors"
  "loras:https://civitai.com/api/download/models/135867"
  "vae:https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors"
)

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "${BLUE}"
  echo "============================================================================"
  echo "$1"
  echo "============================================================================"
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

check_gpu() {
  if ! command -v nvidia-smi &> /dev/null; then
    print_error "NVIDIA GPU not detected! This script requires a GPU instance."
    exit 1
  fi
  
  print_success "GPU detected:"
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
}

##############################################################################
# Step 1: System Check
##############################################################################

step1_system_check() {
  print_header "Step 1: System Check"
  
  print_info "Checking GPU..."
  check_gpu
  
  print_info "Checking disk space..."
  df -h /workspace
  
  print_info "Checking Python version..."
  python --version || python3 --version
  
  print_success "System check complete"
}

##############################################################################
# Step 2: Install ComfyUI
##############################################################################

step2_install_comfyui() {
  print_header "Step 2: Install ComfyUI"
  
  cd ${WORKSPACE}
  
  if [ -d "${COMFYUI_DIR}" ]; then
    print_info "ComfyUI already exists, skipping installation"
  else
    print_info "Cloning ComfyUI repository..."
    git clone https://github.com/comfyanonymous/ComfyUI.git
    
    cd ${COMFYUI_DIR}
    
    print_info "Installing ComfyUI dependencies..."
    pip install -r requirements.txt
    
    print_success "ComfyUI installed successfully"
  fi
}

##############################################################################
# Step 3: Download Models
##############################################################################

step3_download_models() {
  print_header "Step 3: Download Models (~20GB)"
  
  print_info "This will take 20-40 minutes depending on your connection..."
  
  for model_info in "${MODELS[@]}"; do
    # Split into directory and URL
    IFS=':' read -r model_dir url <<< "$model_info"
    
    # Create directory
    mkdir -p "${MODELS_DIR}/${model_dir}"
    
    # Extract filename from URL
    filename=$(basename "$url" | cut -d'?' -f1)
    filepath="${MODELS_DIR}/${model_dir}/${filename}"
    
    # Download if not exists
    if [ -f "$filepath" ]; then
      print_info "Skipping ${filename} (already exists)"
    else
      print_info "Downloading ${filename}..."
      wget -q --show-progress -O "$filepath" "$url"
      print_success "Downloaded ${filename}"
    fi
  done
  
  print_success "All models downloaded"
}

##############################################################################
# Step 4: Setup Backend Server
##############################################################################

step4_setup_backend() {
  print_header "Step 4: Setup Backend Server"
  
  cd ${WORKSPACE}
  
  # Clone backend repository (or download files)
  if [ -d "${BACKEND_DIR}" ]; then
    print_info "Backend already exists, updating..."
    cd ${BACKEND_DIR}
    git pull || print_info "Not a git repo, skipping update"
  else
    print_info "Setting up backend..."
    
    # Option 1: Clone from repository
    # git clone YOUR_REPO_URL ${BACKEND_DIR}
    
    # Option 2: Download files directly
    mkdir -p ${BACKEND_DIR}
    cd ${BACKEND_DIR}
    
    # Download backend files
    print_info "Downloading backend files..."
    
    # You can replace this with your actual repository
    # For now, we'll create a simple structure
    cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "peace-script-comfyui"}

@app.get("/health/detailed")
async def health_detailed():
    import torch
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "workers": {"active": 0, "max": 2},
        "queue": {"pending": 0}
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

    cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
aiofiles==23.2.1
Pillow==10.1.0
python-dotenv==1.0.0
torch
torchvision
EOF

    cat > .env << 'EOF'
HOST=0.0.0.0
PORT=8000
COMFYUI_PATH=/workspace/ComfyUI
MAX_CONCURRENT_JOBS=2
JOB_TIMEOUT=300
EOF
  fi
  
  print_info "Installing backend dependencies..."
  pip install -r requirements.txt
  
  print_success "Backend setup complete"
}

##############################################################################
# Step 5: Start Services
##############################################################################

step5_start_services() {
  print_header "Step 5: Start Services"
  
  # Start ComfyUI in background
  print_info "Starting ComfyUI server..."
  cd ${COMFYUI_DIR}
  nohup python main.py --listen 0.0.0.0 --port 8188 > /tmp/comfyui.log 2>&1 &
  COMFYUI_PID=$!
  
  sleep 5
  
  if ps -p $COMFYUI_PID > /dev/null; then
    print_success "ComfyUI started (PID: $COMFYUI_PID)"
  else
    print_error "ComfyUI failed to start. Check /tmp/comfyui.log"
    exit 1
  fi
  
  # Start Backend server
  print_info "Starting Backend server..."
  cd ${BACKEND_DIR}
  nohup python main.py > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  
  sleep 3
  
  if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend started (PID: $BACKEND_PID)"
  else
    print_error "Backend failed to start. Check /tmp/backend.log"
    exit 1
  fi
  
  print_success "All services started"
}

##############################################################################
# Step 6: Test Installation
##############################################################################

step6_test() {
  print_header "Step 6: Test Installation"
  
  print_info "Testing ComfyUI..."
  if curl -s http://localhost:8188 > /dev/null; then
    print_success "ComfyUI is responding"
  else
    print_error "ComfyUI is not responding"
  fi
  
  print_info "Testing Backend..."
  if curl -s http://localhost:8000/health > /dev/null; then
    print_success "Backend is responding"
    curl -s http://localhost:8000/health/detailed | python -m json.tool
  else
    print_error "Backend is not responding"
  fi
}

##############################################################################
# Step 7: Get Public URL
##############################################################################

step7_public_url() {
  print_header "Step 7: Get Public URL"
  
  print_info "Your RunPod instance details:"
  
  # Get RunPod ID (if available)
  if [ -f "/etc/runpod/pod_id" ]; then
    POD_ID=$(cat /etc/runpod/pod_id)
    print_info "Pod ID: ${POD_ID}"
  fi
  
  # Get public IP
  PUBLIC_IP=$(curl -s ifconfig.me)
  print_info "Public IP: ${PUBLIC_IP}"
  
  # Instructions
  echo ""
  print_info "To expose your service publicly:"
  echo "  1. Go to RunPod dashboard"
  echo "  2. Find your pod"
  echo "  3. Click 'Connect'"
  echo "  4. Copy the public URL"
  echo ""
  print_info "Or use RunPod's port forwarding:"
  echo "  Port 8000 → Your Backend API"
  echo "  Port 8188 → ComfyUI Web UI"
  echo ""
  print_info "Example public URLs:"
  echo "  https://xxxxx-8000.proxy.runpod.net  (Backend)"
  echo "  https://xxxxx-8188.proxy.runpod.net  (ComfyUI)"
}

##############################################################################
# Main Execution
##############################################################################

main() {
  print_header "🚀 RunPod Setup for Peace Script AI"
  
  print_info "This script will:"
  echo "  1. Check system requirements"
  echo "  2. Install ComfyUI"
  echo "  3. Download models (~20GB, 20-40 min)"
  echo "  4. Setup backend server"
  echo "  5. Start services"
  echo "  6. Test installation"
  echo "  7. Get public URL"
  echo ""
  
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Installation cancelled"
    exit 0
  fi
  
  step1_system_check
  step2_install_comfyui
  step3_download_models
  step4_setup_backend
  step5_start_services
  step6_test
  step7_public_url
  
  print_header "✅ Installation Complete!"
  
  echo ""
  print_success "Next Steps:"
  echo "  1. Copy your public URL from RunPod dashboard"
  echo "  2. Update VITE_COMFYUI_SERVICE_URL in your frontend .env"
  echo "  3. Set VITE_USE_COMFYUI_BACKEND=true"
  echo "  4. Rebuild and deploy your frontend"
  echo "  5. Test video generation!"
  echo ""
  
  print_info "Logs:"
  echo "  ComfyUI:  tail -f /tmp/comfyui.log"
  echo "  Backend:  tail -f /tmp/backend.log"
  echo ""
  
  print_info "Management:"
  echo "  Check status:   curl http://localhost:8000/health/detailed"
  echo "  Restart backend: pkill -f 'python main.py' && python ${BACKEND_DIR}/main.py &"
  echo "  Restart ComfyUI: pkill -f 'comfyui' && python ${COMFYUI_DIR}/main.py --listen 0.0.0.0 &"
  echo ""
  
  print_success "Happy Creating! 🎬✨"
}

# Run main
main "$@"
