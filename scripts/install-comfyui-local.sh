#!/bin/bash

##############################################################################
# One-Click ComfyUI Installer for Peace Script AI (macOS/Linux)
#
# Automatically installs ComfyUI with all required models and dependencies
#
# Features:
# - GPU detection (NVIDIA/AMD/Apple Silicon)
# - ComfyUI installation
# - Model auto-download (~20GB)
# - Python environment setup
# - Systemd service (Linux) or LaunchAgent (macOS)
#
# Usage:
#   ./install-comfyui-local.sh [OPTIONS]
#
# Options:
#   --install-path PATH    Installation directory (default: ~/ComfyUI)
#   --skip-models          Skip model downloads
#   --minimal              Download minimal models only (~5GB)
#   --register-service     Register as system service
#   --help                 Show this help
#
# Examples:
#   ./install-comfyui-local.sh
#   ./install-comfyui-local.sh --install-path /opt/comfyui
#   ./install-comfyui-local.sh --minimal --register-service
##############################################################################

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================

INSTALL_PATH="$HOME/ComfyUI"
SKIP_MODELS=false
MINIMAL_MODELS=false
REGISTER_SERVICE=false
REQUIRED_SPACE_GB=25
MIN_SPACE_GB=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║  $1"
    printf "║%-62s║\n" ""
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --install-path)
                INSTALL_PATH="$2"
                shift 2
                ;;
            --skip-models)
                SKIP_MODELS=true
                shift
                ;;
            --minimal)
                MINIMAL_MODELS=true
                shift
                ;;
            --register-service)
                REGISTER_SERVICE=true
                shift
                ;;
            --help)
                grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //'
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "mac"
    else
        echo "unknown"
    fi
}

# Detect GPU
detect_gpu() {
    local gpu_type="unknown"
    local gpu_name="Unknown"
    local vram="Unknown"
    
    # NVIDIA
    if command -v nvidia-smi &> /dev/null; then
        gpu_type="nvidia"
        gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
        vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -n 1)
    # AMD ROCm
    elif command -v rocm-smi &> /dev/null; then
        gpu_type="amd"
        gpu_name=$(rocm-smi --showproductname | grep "GPU" | head -n 1 | awk '{print $3,$4,$5}')
    # Apple Silicon
    elif [[ "$(uname -m)" == "arm64" ]] && [[ "$(uname -s)" == "Darwin" ]]; then
        gpu_type="apple"
        gpu_name="Apple Silicon $(sysctl -n machdep.cpu.brand_string)"
        vram="Unified Memory"
    # CPU fallback
    else
        gpu_type="cpu"
        gpu_name="CPU Only"
        vram="N/A"
    fi
    
    echo "$gpu_type|$gpu_name|$vram"
}

# Check available disk space
check_disk_space() {
    local path=$1
    local dir=$(dirname "$path")
    
    if [[ "$(uname -s)" == "Darwin" ]]; then
        # macOS
        df -g "$dir" | awk 'NR==2 {print $4}'
    else
        # Linux
        df -BG "$dir" | awk 'NR==2 {print $4}' | tr -d 'G'
    fi
}

# Download file with progress
download_file() {
    local url=$1
    local output=$2
    local description=$3
    
    echo "  📥 $description..."
    
    if command -v wget &> /dev/null; then
        wget --progress=bar:force -O "$output" "$url" 2>&1 | \
            grep --line-buffered "%" | \
            sed -u -e "s,\.,,g" | \
            awk '{printf("\r  Progress: %s", $2); fflush()}'
        echo ""
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$output" "$url"
    else
        print_error "Neither wget nor curl found. Please install one of them."
        return 1
    fi
    
    return 0
}

# ============================================================================
# Main Installation
# ============================================================================

main() {
    parse_args "$@"
    
    print_header "🚀 Peace Script AI - ComfyUI Local Installer"
    
    echo "Version: 1.0.0"
    echo "Installation Path: $INSTALL_PATH"
    echo ""
    
    OS_TYPE=$(detect_os)
    
    # Step 1: System Requirements Check
    print_step "Step 1/7: System Requirements Check"
    
    # Detect GPU
    IFS='|' read -r GPU_TYPE GPU_NAME VRAM <<< "$(detect_gpu)"
    
    echo "  GPU Type: $GPU_NAME"
    case $GPU_TYPE in
        nvidia)
            echo "  VRAM: $VRAM"
            print_success "NVIDIA GPU detected - CUDA support available"
            ;;
        amd)
            print_warning "AMD GPU detected - ROCm support may be limited"
            ;;
        apple)
            print_success "Apple Silicon detected - Metal support available"
            ;;
        cpu)
            print_warning "No dedicated GPU detected - Will use CPU mode (slower)"
            ;;
    esac
    
    # Check disk space
    AVAILABLE_SPACE=$(check_disk_space "$INSTALL_PATH")
    echo "  Available Space: ${AVAILABLE_SPACE}GB"
    
    if [[ $AVAILABLE_SPACE -lt $MIN_SPACE_GB ]]; then
        print_error "Insufficient disk space. Need at least ${MIN_SPACE_GB}GB"
        exit 1
    fi
    
    if [[ $AVAILABLE_SPACE -lt $REQUIRED_SPACE_GB ]]; then
        print_warning "Recommended space: ${REQUIRED_SPACE_GB}GB"
        print_warning "Some models may need to be downloaded later"
    fi
    
    print_success "System requirements check passed"
    
    # Step 2: Install Python
    print_step "Step 2/7: Check Python Installation"
    
    if ! command -v python3 &> /dev/null; then
        print_info "Python 3 not found. Installing..."
        
        if [[ "$OS_TYPE" == "mac" ]]; then
            if command -v brew &> /dev/null; then
                brew install python@3.11
            else
                print_error "Homebrew not found. Please install from https://brew.sh"
                exit 1
            fi
        else
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv
        fi
    fi
    
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
    
    # Step 3: Clone/Download ComfyUI
    print_step "Step 3/7: Download ComfyUI"
    
    if [[ -d "$INSTALL_PATH" ]]; then
        print_info "Installation directory already exists"
        read -p "Overwrite existing installation? (y/N): " overwrite
        if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
            print_info "Installation cancelled"
            exit 0
        fi
        rm -rf "$INSTALL_PATH"
    fi
    
    print_info "Cloning ComfyUI repository..."
    git clone https://github.com/comfyanonymous/ComfyUI.git "$INSTALL_PATH"
    
    cd "$INSTALL_PATH"
    
    print_success "ComfyUI downloaded to $INSTALL_PATH"
    
    # Step 4: Install Dependencies
    print_step "Step 4/7: Install Python Dependencies"
    
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    print_info "Upgrading pip..."
    pip install --upgrade pip
    
    print_info "Installing PyTorch..."
    if [[ "$GPU_TYPE" == "nvidia" ]]; then
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    elif [[ "$GPU_TYPE" == "apple" ]]; then
        pip install torch torchvision torchaudio
    else
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    fi
    
    print_info "Installing ComfyUI requirements..."
    pip install -r requirements.txt
    
    print_success "Dependencies installed"
    
    # Step 5: Download Models
    print_step "Step 5/7: Download AI Models"
    
    if [[ "$SKIP_MODELS" == true ]]; then
        print_info "Skipping model downloads (--skip-models flag)"
    else
        mkdir -p models/checkpoints
        mkdir -p models/vae
        mkdir -p models/animatediff_models
        mkdir -p models/loras
        
        print_info "Downloading models (~20GB total)"
        print_info "This will take 15-60 minutes depending on your internet speed"
        echo ""
        
        # AnimateDiff
        if [[ ! -f "models/animatediff_models/v3_sd15_mm.ckpt" ]]; then
            download_file \
                "https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt" \
                "models/animatediff_models/v3_sd15_mm.ckpt" \
                "AnimateDiff v3 (~5GB)"
        fi
        
        # Stable Diffusion 1.5
        if [[ ! -f "models/checkpoints/v1-5-pruned-emaonly.safetensors" ]]; then
            download_file \
                "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors" \
                "models/checkpoints/v1-5-pruned-emaonly.safetensors" \
                "Stable Diffusion 1.5 (~4GB)"
        fi
        
        # VAE
        if [[ ! -f "models/vae/vae-ft-mse-840000-ema-pruned.safetensors" ]]; then
            download_file \
                "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors" \
                "models/vae/vae-ft-mse-840000-ema-pruned.safetensors" \
                "VAE (~350MB)"
        fi
        
        # FLUX (optional for minimal)
        if [[ "$MINIMAL_MODELS" != true ]] && [[ ! -f "models/checkpoints/flux1-schnell.safetensors" ]]; then
            download_file \
                "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors" \
                "models/checkpoints/flux1-schnell.safetensors" \
                "FLUX.1-schnell (~8GB)"
        fi
        
        print_success "Model downloads complete"
    fi
    
    # Step 6: Create Startup Scripts
    print_step "Step 6/7: Create Startup Scripts"
    
    # Create start script
    cat > "$INSTALL_PATH/start-comfyui.sh" << 'EOF'
#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting ComfyUI for Peace Script AI..."
echo ""

# Activate virtual environment
source venv/bin/activate

# Detect GPU and start appropriately
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected - Starting with CUDA"
    python main.py --listen 0.0.0.0 --port 8188
elif [[ "$(uname -m)" == "arm64" ]] && [[ "$(uname -s)" == "Darwin" ]]; then
    echo "✅ Apple Silicon detected - Starting with Metal"
    python main.py --listen 0.0.0.0 --port 8188
else
    echo "⚠️  No GPU detected - Starting with CPU mode"
    echo "Note: CPU mode is significantly slower"
    python main.py --listen 0.0.0.0 --port 8188 --cpu
fi
EOF
    
    chmod +x "$INSTALL_PATH/start-comfyui.sh"
    
    print_success "Startup script created: start-comfyui.sh"
    
    # Step 7: Service Registration (Optional)
    if [[ "$REGISTER_SERVICE" == true ]]; then
        print_step "Step 7/7: Register System Service"
        
        if [[ "$OS_TYPE" == "linux" ]]; then
            # Linux systemd service
            print_info "Creating systemd service..."
            
            sudo tee /etc/systemd/system/comfyui.service > /dev/null << EOF
[Unit]
Description=ComfyUI Image Generation Service for Peace Script AI
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_PATH
ExecStart=$INSTALL_PATH/start-comfyui.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            
            sudo systemctl daemon-reload
            sudo systemctl enable comfyui
            sudo systemctl start comfyui
            
            print_success "Systemd service installed and started"
            
        elif [[ "$OS_TYPE" == "mac" ]]; then
            # macOS LaunchAgent
            print_info "Creating LaunchAgent..."
            
            PLIST_PATH="$HOME/Library/LaunchAgents/com.peacescript.comfyui.plist"
            
            cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.peacescript.comfyui</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_PATH/start-comfyui.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$INSTALL_PATH/logs/service.log</string>
    <key>StandardErrorPath</key>
    <string>$INSTALL_PATH/logs/service-error.log</string>
</dict>
</plist>
EOF
            
            mkdir -p "$INSTALL_PATH/logs"
            launchctl load "$PLIST_PATH"
            
            print_success "LaunchAgent installed and started"
        fi
    else
        print_step "Step 7/7: Service Registration (Skipped)"
        print_info "To register as a system service, run with --register-service flag"
    fi
    
    # Installation Complete
    print_step "Installation Complete!"
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ Installation Successful!                ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${CYAN}📦 Installation Summary:${NC}"
    echo "   Location: $INSTALL_PATH"
    echo "   GPU: $GPU_NAME"
    echo "   Models: $(if [[ "$SKIP_MODELS" == true ]]; then echo "Skipped"; else echo "Downloaded"; fi)"
    echo ""
    
    echo -e "${YELLOW}🚀 Next Steps:${NC}"
    echo ""
    echo "   1. Start ComfyUI:"
    echo "      → $INSTALL_PATH/start-comfyui.sh"
    echo ""
    echo "   2. Wait for ComfyUI to start (~30 seconds)"
    echo ""
    echo "   3. ComfyUI will be available at:"
    echo -e "      → ${CYAN}http://localhost:8188${NC}"
    echo ""
    echo -e "   4. Return to Peace Script AI and start generating! ${GREEN}🎬${NC}"
    echo ""
    
    if [[ "$REGISTER_SERVICE" == true ]]; then
        echo -e "   ${CYAN}ℹ️  ComfyUI service is running and will start automatically on boot${NC}"
    else
        echo -e "   ${GRAY}💡 Tip: Run with --register-service to start ComfyUI automatically on boot${NC}"
    fi
    
    echo ""
    echo -e "${GRAY}📚 Documentation:${NC}"
    echo "   → COMFYUI_HYBRID_ARCHITECTURE.md"
    echo "   → COMFYUI_CLOUD_IMPLEMENTATION.md"
    echo ""
    
    echo -e "${GREEN}🎉 All done! Enjoy using Peace Script AI with local ComfyUI!${NC}"
    echo ""
    
    # Ask if user wants to start ComfyUI now
    if [[ "$REGISTER_SERVICE" != true ]]; then
        read -p "Start ComfyUI now? (Y/n): " start_now
        if [[ "$start_now" == "" || "$start_now" == "y" || "$start_now" == "Y" ]]; then
            print_info "Starting ComfyUI..."
            "$INSTALL_PATH/start-comfyui.sh"
        fi
    fi
}

# Run main function
main "$@"
