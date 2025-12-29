#!/bin/bash
# RunPod ComfyUI + WAN Auto Setup Script
# Version: 1.0
# Date: December 28, 2025

set -e  # Exit on error

echo "=================================================="
echo "  RunPod ComfyUI + WAN Video Setup"
echo "  Automation Script v1.0"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Check if running on RunPod
print_status "Checking environment..."
if [ ! -d "/workspace" ]; then
    print_warning "Not running on RunPod (no /workspace directory)"
    print_status "Creating /workspace for local testing..."
    mkdir -p /workspace
fi

cd /workspace
print_success "Working directory: $(pwd)"

# Step 2: Check GPU
print_status "Checking GPU availability..."
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
    GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -1)
    print_success "GPU detected: $GPU_NAME ($GPU_MEMORY)"
else
    print_error "No GPU detected! This script requires CUDA-capable GPU."
    exit 1
fi

# Step 3: Install system dependencies
print_status "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq git wget curl python3-pip > /dev/null 2>&1
print_success "System dependencies installed"

# Step 4: Check if ComfyUI exists
print_status "Checking ComfyUI installation..."
if [ -d "/workspace/ComfyUI" ]; then
    print_success "ComfyUI already installed"
    cd /workspace/ComfyUI
    git pull origin master > /dev/null 2>&1 || print_warning "Could not update ComfyUI"
else
    print_status "Installing ComfyUI..."
    cd /workspace
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    print_success "ComfyUI cloned"
fi

# Step 5: Install ComfyUI requirements
print_status "Installing ComfyUI Python dependencies..."
pip install -q -r requirements.txt
print_success "ComfyUI dependencies installed"

# Step 6: Install WAN wrapper
print_status "Checking WAN Video wrapper..."
cd /workspace/ComfyUI/custom_nodes

if [ -d "ComfyUI-WanVideoWrapper" ]; then
    print_success "WAN wrapper already installed"
    cd ComfyUI-WanVideoWrapper
    git pull origin main > /dev/null 2>&1 || print_warning "Could not update WAN wrapper"
else
    print_status "Installing WAN Video wrapper..."
    git clone https://github.com/logtd/ComfyUI-WanVideoWrapper.git
    cd ComfyUI-WanVideoWrapper
    print_success "WAN wrapper cloned"
fi

# Step 7: Install WAN wrapper requirements
print_status "Installing WAN wrapper dependencies..."
pip install -q -r requirements.txt
print_success "WAN wrapper dependencies installed"

# Step 8: Create models directory
print_status "Setting up models directory..."
mkdir -p /workspace/ComfyUI/models/WAN
print_success "Models directory ready"

# Step 9: Check if models exist
print_status "Checking WAN models..."
MODEL_DIR="/workspace/ComfyUI/models/WAN"
MODEL_SIZE=$(du -sh "$MODEL_DIR" 2>/dev/null | cut -f1)

if [ -n "$(ls -A $MODEL_DIR 2>/dev/null)" ]; then
    print_success "WAN models found: $MODEL_SIZE"
    print_warning "Skipping model download (already exists)"
else
    print_status "Downloading WAN models (this will take 15-20 minutes)..."
    print_warning "Total size: ~86 GB"
    
    # Install huggingface-cli if not present
    if ! command -v huggingface-cli &> /dev/null; then
        print_status "Installing huggingface-cli..."
        pip install -q huggingface_hub[cli]
    fi
    
    # Download models
    cd "$MODEL_DIR"
    print_status "Downloading from Wanx-AI/Wanx-Video-1.0..."
    huggingface-cli download \
        --repo-id Wanx-AI/Wanx-Video-1.0 \
        --local-dir . \
        --local-dir-use-symlinks False
    
    MODEL_SIZE=$(du -sh "$MODEL_DIR" | cut -f1)
    print_success "Models downloaded: $MODEL_SIZE"
fi

# Step 10: Create startup script
print_status "Creating startup script..."
cat > /workspace/start-comfyui.sh << 'EOF'
#!/bin/bash
cd /workspace/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
EOF

chmod +x /workspace/start-comfyui.sh
print_success "Startup script created: /workspace/start-comfyui.sh"

# Step 11: Summary
echo ""
echo "=================================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${CYAN}ComfyUI Location:${NC} /workspace/ComfyUI"
echo -e "${CYAN}WAN Models:${NC} $MODEL_SIZE in /workspace/ComfyUI/models/WAN"
echo -e "${CYAN}GPU:${NC} $GPU_NAME"
echo ""
echo -e "${YELLOW}To start ComfyUI:${NC}"
echo "  cd /workspace/ComfyUI"
echo "  python main.py --listen 0.0.0.0 --port 8188"
echo ""
echo -e "${YELLOW}Or use shortcut:${NC}"
echo "  /workspace/start-comfyui.sh"
echo ""
echo -e "${YELLOW}Access Web UI:${NC}"
echo "  http://0.0.0.0:8188"
echo "  (From RunPod: Use HTTP Service [8188] button)"
echo ""
echo -e "${YELLOW}Example Workflows:${NC}"
echo "  /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/"
echo ""
echo "=================================================="
echo -e "${GREEN}Ready to generate WAN videos!${NC}"
echo "=================================================="
