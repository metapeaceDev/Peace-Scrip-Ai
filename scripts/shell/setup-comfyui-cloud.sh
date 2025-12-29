#!/bin/bash
# Quick Setup Script for ComfyUI + WAN on Cloud GPU
# สคริปต์ติดตั้งแบบอัตโนมัติสำหรับ ComfyUI + WAN บน Cloud
# Tested on: RunPod, Vast.ai
# GPU: RTX 4090, RTX 3090, A100

set -e  # Exit on error

echo "============================================"
echo "  ComfyUI + WAN Video Setup Script"
echo "  For Cloud GPU (RunPod/Vast.ai)"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${CYAN}[1/7] Updating system...${NC}"
apt-get update -qq
apt-get install -y -qq git wget curl aria2 > /dev/null 2>&1
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install ComfyUI
echo -e "${CYAN}[2/7] Installing ComfyUI...${NC}"
cd /workspace
if [ -d "ComfyUI" ]; then
    echo -e "${YELLOW}⚠️  ComfyUI directory exists, skipping clone${NC}"
    cd ComfyUI
    git pull > /dev/null 2>&1
else
    git clone https://github.com/comfyanonymous/ComfyUI.git > /dev/null 2>&1
    cd ComfyUI
fi

pip install -q -r requirements.txt
echo -e "${GREEN}✅ ComfyUI installed${NC}"

# Step 3: Install WAN Wrapper
echo -e "${CYAN}[3/7] Installing WAN Video Wrapper...${NC}"
cd custom_nodes
if [ -d "ComfyUI-WanVideoWrapper" ]; then
    echo -e "${YELLOW}⚠️  WAN wrapper exists, updating...${NC}"
    cd ComfyUI-WanVideoWrapper
    git pull > /dev/null 2>&1
else
    git clone https://github.com/logtd/ComfyUI-WanVideoWrapper.git > /dev/null 2>&1
    cd ComfyUI-WanVideoWrapper
fi

pip install -q -r requirements.txt
echo -e "${GREEN}✅ WAN wrapper installed${NC}"

# Step 4: Download WAN Models
echo -e "${CYAN}[4/7] Downloading WAN models (this may take 10-30 minutes)...${NC}"
cd /workspace/ComfyUI/models/checkpoints

pip install -q huggingface-hub

python3 << 'PYTHON_SCRIPT'
from huggingface_hub import snapshot_download
import os

print("  Downloading WAN 2.0 models from Hugging Face...")
try:
    snapshot_download(
        repo_id="Wanx-AI/Wanx-2",
        local_dir="./wanx",
        local_dir_use_symlinks=False,
        resume_download=True
    )
    
    # Check size
    size = 0
    for dirpath, dirnames, filenames in os.walk('./wanx'):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            size += os.path.getsize(fp)
    
    size_gb = size / (1024**3)
    print(f"  ✅ Models downloaded: {size_gb:.2f} GB")
except Exception as e:
    print(f"  ⚠️  Warning: {e}")
    print("  You may need to download models manually")
PYTHON_SCRIPT

echo -e "${GREEN}✅ Models ready${NC}"

# Step 5: Install additional dependencies
echo -e "${CYAN}[5/7] Installing additional dependencies...${NC}"
pip install -q xformers
pip install -q opencv-python-headless
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 6: Verify GPU
echo -e "${CYAN}[6/7] Verifying GPU setup...${NC}"
python3 << 'PYTHON_VERIFY'
import torch

print(f"  PyTorch: {torch.__version__}")
print(f"  CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Test CUDA
    x = torch.randn(1000, 1000, device='cuda')
    y = torch.matmul(x, x)
    print(f"  CUDA operations: ✅ WORKING")
else:
    print(f"  ⚠️  WARNING: CUDA not available!")
PYTHON_VERIFY

echo -e "${GREEN}✅ GPU verified${NC}"

# Step 7: Create start script
echo -e "${CYAN}[7/7] Creating start script...${NC}"
cat > /workspace/start_comfyui.sh << 'START_SCRIPT'
#!/bin/bash
cd /workspace/ComfyUI
echo "Starting ComfyUI..."
echo "Access at: http://0.0.0.0:8188"
echo "Or use your RunPod URL"
python main.py --listen 0.0.0.0 --port 8188
START_SCRIPT

chmod +x /workspace/start_comfyui.sh
echo -e "${GREEN}✅ Start script created${NC}"

# Summary
echo ""
echo "============================================"
echo -e "${GREEN}  ✅ Installation Complete!${NC}"
echo "============================================"
echo ""
echo -e "${CYAN}To start ComfyUI:${NC}"
echo "  cd /workspace/ComfyUI"
echo "  python main.py --listen 0.0.0.0 --port 8188"
echo ""
echo -e "${CYAN}Or use the shortcut:${NC}"
echo "  /workspace/start_comfyui.sh"
echo ""
echo -e "${CYAN}Access ComfyUI:${NC}"
echo "  - RunPod: Click 'Connect' > 'HTTP Services'"
echo "  - Direct: http://0.0.0.0:8188"
echo ""
echo -e "${CYAN}Models location:${NC}"
echo "  /workspace/ComfyUI/models/checkpoints/wanx/"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start ComfyUI (command above)"
echo "  2. Access web UI"
echo "  3. Load WAN workflow from:"
echo "     ComfyUI-WanVideoWrapper/example_workflows/"
echo "  4. Start testing!"
echo ""
echo -e "${GREEN}🚀 Ready for WAN POC testing!${NC}"
echo "============================================"
