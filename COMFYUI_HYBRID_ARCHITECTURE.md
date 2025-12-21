# ComfyUI Hybrid Cloud/Local System - Architecture Design

**สร้างวันที่:** ${new Date().toLocaleDateString('th-TH')}  
**เวอร์ชัน:** 1.0.0  
**สถานะ:** 🚧 In Development

---

## 🎯 Vision & Goals

### ปัญหาที่ต้องแก้

1. **ผู้ใช้ที่มี GPU แรง** ต้องการใช้ GPU ของตัวเอง (ฟรี, เร็ว) แต่ต้องติดตั้งเอง
2. **ผู้ใช้ที่ไม่มี GPU** หรือใช้แบบ casual ต้องการใช้ Cloud (pay-as-you-go)
3. **การติดตั้ง ComfyUI** ซับซ้อน (20GB models, dependencies, configuration)
4. **ไม่มีความยืดหยุ่น** ไม่สามารถสลับระหว่าง Cloud/Local ได้

### Solutions (เป้าหมาย)

✅ **One-Click Local Installation** - ติดตั้งอัตโนมัติแค่ปุ่มเดียว  
✅ **Cloud On-Demand** - ใช้ Cloud เมื่อต้องการ ไม่ต้องจ่ายเงินตลอดเวลา  
✅ **Intelligent Routing** - เลือก backend ที่ดีที่สุดอัตโนมัติ (cost, speed, availability)  
✅ **Seamless Switching** - สลับระหว่าง Cloud/Local ได้ทันที  
✅ **User Choice** - ผู้ใช้สามารถเลือกเองได้ว่าจะใช้อะไร

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (React App)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Backend      │  │ One-Click    │  │ Cost Calculator &  │   │
│  │ Selector UI  │  │ Install UI   │  │ Status Monitor     │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ComfyUI Service (Express.js :8000)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Intelligent Load Balancer & Router             │  │
│  │  - Priority: Local > Cloud > Gemini                      │  │
│  │  - Cost Optimization                                      │  │
│  │  - Health Monitoring                                      │  │
│  │  - Queue Management (Bull + Redis)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │              │              │
        ┌───────────┘              │              └───────────┐
        ▼                          ▼                          ▼
┌────────────────┐    ┌──────────────────────┐    ┌──────────────┐
│ Local ComfyUI  │    │   Cloud Workers      │    │   Gemini AI  │
│  (localhost)   │    │   (RunPod/GCP)       │    │   (Fallback) │
│                │    │                      │    │              │
│ RTX 5090       │    │ On-Demand Pods       │    │ Video: Veo 2 │
│ 32GB VRAM      │    │ RTX 3090/4090        │    │ Image: Imagen│
│ FREE           │    │ $0.34-0.50/hr        │    │ Expensive    │
│                │    │ Auto-scale           │    │              │
│ One-click      │    │ Auto-shutdown        │    │              │
│ Installer      │    │ Serverless option    │    │              │
└────────────────┘    └──────────────────────┘    └──────────────┘
```

---

## 📦 Component Details

### 1. Frontend Components (New)

#### 1.1 Backend Selector Component
```typescript
// src/components/BackendSelector.tsx
interface Backend {
  id: 'local' | 'cloud' | 'gemini';
  name: string;
  status: 'available' | 'unavailable' | 'installing';
  cost: number; // USD per video
  speed: number; // seconds per video (estimated)
  icon: string;
}

// Features:
- Radio button selection (local/cloud/auto)
- Real-time status indicators
- Cost estimation display
- Speed comparison
- GPU info (for local)
```

#### 1.2 One-Click Installer Component
```typescript
// src/components/ComfyUIInstaller.tsx
interface InstallationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

// Steps:
1. Check system (GPU detection)
2. Download ComfyUI portable (~500MB)
3. Extract files
4. Download models (~20GB)
   - AnimateDiff (~5GB)
   - SD 1.5 (~4GB)
   - FLUX.1-schnell (~8GB)
5. Setup Python environment
6. Start service
7. Verify installation

// Features:
- Progress bar with ETA
- Pause/Resume download
- Error handling with retry
- Success celebration 🎉
```

#### 1.3 Cost Calculator & Monitor
```typescript
// src/components/CostMonitor.tsx
interface UsageStats {
  totalVideos: number;
  localVideos: number;
  cloudVideos: number;
  totalCost: number;
  savedMoney: number; // vs using cloud only
  estimatedMonthlyCost: number;
}

// Features:
- Real-time cost tracking
- Monthly cost projection
- Savings calculator (local vs cloud)
- Cost breakdown chart
```

---

### 2. Backend Services (Enhanced)

#### 2.1 Intelligent Load Balancer
```javascript
// comfyui-service/src/services/loadBalancer.js

class IntelligentLoadBalancer {
  constructor() {
    this.backends = {
      local: { workers: [], priority: 1, costPerVideo: 0 },
      cloud: { workers: [], priority: 2, costPerVideo: 0.02 },
      gemini: { priority: 3, costPerVideo: 0.08 }
    };
    this.userPreference = 'auto'; // 'local', 'cloud', 'auto'
    this.queue = new PriorityQueue();
  }

  async selectBackend(job) {
    // Priority logic:
    // 1. User preference (if specified)
    // 2. Local GPU (if available and healthy)
    // 3. Cloud worker (spawn if needed)
    // 4. Gemini (fallback)
    
    if (this.userPreference !== 'auto') {
      return this.userPreference;
    }
    
    // Check local availability
    if (await this.isLocalAvailable()) {
      return 'local';
    }
    
    // Check cloud cost vs Gemini
    const cloudWorker = await this.getOrSpawnCloudWorker();
    if (cloudWorker && cloudWorker.cost < this.backends.gemini.costPerVideo) {
      return 'cloud';
    }
    
    return 'gemini'; // Last resort
  }

  async isLocalAvailable() {
    try {
      const response = await fetch('http://localhost:8188/system_stats', { timeout: 2000 });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async getOrSpawnCloudWorker() {
    // Check existing workers
    const healthyWorker = this.backends.cloud.workers.find(w => w.status === 'healthy');
    if (healthyWorker) {
      return healthyWorker;
    }
    
    // Spawn new worker (RunPod Serverless or On-Demand Pod)
    return await this.spawnCloudWorker();
  }
}
```

#### 2.2 Cloud Worker Manager (RunPod Integration)
```javascript
// comfyui-service/src/services/cloudWorkerManager.js

class CloudWorkerManager {
  constructor() {
    this.runpodApiKey = process.env.RUNPOD_API_KEY;
    this.activePods = [];
    this.serverlessEndpoint = process.env.RUNPOD_SERVERLESS_ENDPOINT;
  }

  // Option 1: Serverless (fastest start, pay-per-second)
  async invokeServerless(workflow) {
    const response = await fetch(this.serverlessEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.runpodApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { workflow }
      })
    });
    
    const { id } = await response.json();
    return await this.pollServerlessResult(id);
  }

  // Option 2: On-Demand Pod (for batch processing)
  async spawnOnDemandPod() {
    const mutation = `
      mutation {
        podFindAndDeployOnDemand(
          input: {
            cloudType: SECURE
            gpuTypeId: "NVIDIA RTX 3090"
            containerDiskInGb: 50
            volumeInGb: 100
            dockerArgs: "peace-comfyui:latest"
            ports: "8188/http"
            env: [
              {key: "COMFYUI_MODELS_PRELOAD", value: "true"}
            ]
          }
        ) {
          id
          desiredStatus
          imageName
          machineId
        }
      }
    `;

    const response = await fetch('https://api.runpod.io/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.runpodApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    });

    const { data } = await response.json();
    const pod = data.podFindAndDeployOnDemand;
    
    this.activePods.push({
      id: pod.id,
      url: `https://${pod.id}-8188.proxy.runpod.net`,
      status: 'starting',
      createdAt: Date.now(),
      costPerHour: 0.34, // RTX 3090 pricing
      jobsProcessed: 0
    });

    // Wait for pod to be ready
    await this.waitForPodReady(pod.id);
    
    return this.activePods.find(p => p.id === pod.id);
  }

  // Auto-shutdown idle pods to save cost
  async monitorAndShutdownIdlePods() {
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    
    for (const pod of this.activePods) {
      if (Date.now() - pod.lastJobAt > IDLE_TIMEOUT) {
        await this.terminatePod(pod.id);
      }
    }
  }

  async terminatePod(podId) {
    const mutation = `
      mutation {
        podTerminate(input: { podId: "${podId}" })
      }
    `;

    await fetch('https://api.runpod.io/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.runpodApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    });

    this.activePods = this.activePods.filter(p => p.id !== podId);
    console.log(`💰 Terminated idle pod ${podId} - saving money!`);
  }
}
```

---

### 3. Local Auto-Installer

#### 3.1 PowerShell Installer (Windows)
```powershell
# scripts/install-comfyui-local.ps1

<#
.SYNOPSIS
    One-Click ComfyUI Installer for Peace Script AI
    
.DESCRIPTION
    Automatically installs ComfyUI with all required models and dependencies.
    Optimized for RTX GPUs with CUDA support.
    
.FEATURES
    - GPU detection (NVIDIA/AMD/CPU)
    - ComfyUI portable download
    - Model auto-download (~20GB)
    - Python environment setup
    - Service registration
    - Automatic startup
#>

param(
    [string]$InstallPath = "$env:USERPROFILE\ComfyUI",
    [switch]$SkipModels = $false,
    [switch]$RegisterService = $false
)

Write-Host "🚀 Peace Script AI - ComfyUI Local Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Step 1: Check GPU
Write-Host "`n📊 Detecting GPU..." -ForegroundColor Yellow
$gpu = Get-WmiObject Win32_VideoController | Select-Object -First 1
if ($gpu.Name -match "NVIDIA") {
    Write-Host "✅ NVIDIA GPU detected: $($gpu.Name)" -ForegroundColor Green
    $gpuType = "nvidia"
} elseif ($gpu.Name -match "AMD") {
    Write-Host "✅ AMD GPU detected: $($gpu.Name)" -ForegroundColor Green
    $gpuType = "amd"
} else {
    Write-Host "⚠️  No dedicated GPU detected. Will use CPU mode (slower)" -ForegroundColor Yellow
    $gpuType = "cpu"
}

# Step 2: Download ComfyUI
Write-Host "`n📥 Downloading ComfyUI portable..." -ForegroundColor Yellow
$comfyUrl = "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z"
$downloadPath = "$env:TEMP\ComfyUI.7z"

# Download with progress bar
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri $comfyUrl -OutFile $downloadPath -UseBasicParsing
$ProgressPreference = 'Continue'

Write-Host "✅ Download complete!" -ForegroundColor Green

# Step 3: Extract
Write-Host "`n📂 Extracting to $InstallPath..." -ForegroundColor Yellow
if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath | Out-Null
}

# Use 7-Zip or built-in extraction
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    & 7z x $downloadPath -o"$InstallPath" -y | Out-Null
} else {
    Expand-Archive -Path $downloadPath -DestinationPath $InstallPath -Force
}

Write-Host "✅ Extraction complete!" -ForegroundColor Green

# Step 4: Download Models (if not skipped)
if (!$SkipModels) {
    Write-Host "`n📦 Downloading AI models (~20GB)..." -ForegroundColor Yellow
    Write-Host "This will take 10-30 minutes depending on your internet speed." -ForegroundColor Yellow
    
    $modelPath = "$InstallPath\ComfyUI\models\checkpoints"
    
    # AnimateDiff
    Write-Host "`n  📥 AnimateDiff (~5GB)..." -ForegroundColor Cyan
    & "$PSScriptRoot\download-model.ps1" `
        -Url "https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt" `
        -OutputPath "$modelPath\v3_sd15_mm.ckpt"
    
    # FLUX.1-schnell
    Write-Host "`n  📥 FLUX.1-schnell (~8GB)..." -ForegroundColor Cyan
    & "$PSScriptRoot\download-model.ps1" `
        -Url "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors" `
        -OutputPath "$modelPath\flux1-schnell.safetensors"
    
    Write-Host "`n✅ All models downloaded!" -ForegroundColor Green
}

# Step 5: Create start scripts
Write-Host "`n📝 Creating startup scripts..." -ForegroundColor Yellow

# Create run script
$runScript = @"
@echo off
cd /d "$InstallPath\ComfyUI"
if "$gpuType" == "nvidia" (
    python_embeded\python.exe -s ComfyUI\main.py --auto-launch
) else (
    python_embeded\python.exe -s ComfyUI\main.py --cpu --auto-launch
)
"@

Set-Content -Path "$InstallPath\Start-ComfyUI.bat" -Value $runScript

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\ComfyUI.lnk")
$Shortcut.TargetPath = "$InstallPath\Start-ComfyUI.bat"
$Shortcut.IconLocation = "$InstallPath\ComfyUI\icon.ico"
$Shortcut.Save()

Write-Host "✅ Shortcuts created!" -ForegroundColor Green

# Step 6: Register as Windows Service (optional)
if ($RegisterService) {
    Write-Host "`n🔧 Registering Windows Service..." -ForegroundColor Yellow
    
    $serviceName = "ComfyUI"
    $serviceDisplayName = "ComfyUI Image Generation Service"
    $servicePath = "$InstallPath\Start-ComfyUI.bat"
    
    # Use NSSM (Non-Sucking Service Manager)
    if (!(Get-Command nssm -ErrorAction SilentlyContinue)) {
        Write-Host "  Installing NSSM..." -ForegroundColor Cyan
        choco install nssm -y
    }
    
    nssm install $serviceName $servicePath
    nssm set $serviceName AppDirectory "$InstallPath\ComfyUI"
    nssm set $serviceName DisplayName $serviceDisplayName
    nssm set $serviceName Start SERVICE_AUTO_START
    
    Write-Host "✅ Service registered! ComfyUI will start automatically on boot." -ForegroundColor Green
}

# Step 7: Start ComfyUI
Write-Host "`n🚀 Starting ComfyUI..." -ForegroundColor Yellow
Start-Process "$InstallPath\Start-ComfyUI.bat"

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
Write-Host "`nComfyUI is now running at: http://localhost:8188" -ForegroundColor Cyan
Write-Host "Return to Peace Script AI to start generating!" -ForegroundColor Cyan
```

#### 3.2 Bash Installer (macOS/Linux)
```bash
#!/bin/bash
# scripts/install-comfyui-local.sh

echo "🚀 Peace Script AI - ComfyUI Local Installer"
echo "============================================"

# Check OS
OS_TYPE="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="mac"
fi

# GPU Detection
echo "📊 Detecting GPU..."
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
    echo "✅ NVIDIA GPU detected: $GPU_INFO"
    GPU_TYPE="nvidia"
elif command -v rocm-smi &> /dev/null; then
    echo "✅ AMD GPU detected (ROCm)"
    GPU_TYPE="amd"
else
    echo "⚠️  No dedicated GPU detected. Will use CPU mode."
    GPU_TYPE="cpu"
fi

# Install Python if needed
if ! command -v python3 &> /dev/null; then
    echo "📥 Installing Python 3..."
    if [ "$OS_TYPE" == "mac" ]; then
        brew install python@3.11
    else
        sudo apt-get update && sudo apt-get install -y python3 python3-pip
    fi
fi

# Clone ComfyUI
INSTALL_PATH="$HOME/ComfyUI"
echo "📥 Cloning ComfyUI to $INSTALL_PATH..."
git clone https://github.com/comfyanonymous/ComfyUI.git "$INSTALL_PATH"
cd "$INSTALL_PATH"

# Install dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install --upgrade pip
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip3 install -r requirements.txt

# Download models
echo "📦 Downloading models (~20GB)..."
mkdir -p models/checkpoints models/vae models/loras

# AnimateDiff
echo "  Downloading AnimateDiff..."
wget -P models/checkpoints \
    https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt

# FLUX
echo "  Downloading FLUX.1-schnell..."
wget -P models/checkpoints \
    https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors

# Create start script
echo "📝 Creating start script..."
cat > "$HOME/start-comfyui.sh" << 'EOF'
#!/bin/bash
cd "$HOME/ComfyUI"
python3 main.py --listen 0.0.0.0 --port 8188
EOF

chmod +x "$HOME/start-comfyui.sh"

# Create systemd service (Linux only)
if [ "$OS_TYPE" == "linux" ]; then
    echo "🔧 Creating systemd service..."
    sudo tee /etc/systemd/system/comfyui.service > /dev/null << EOF
[Unit]
Description=ComfyUI Image Generation Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/ComfyUI
ExecStart=/usr/bin/python3 $HOME/ComfyUI/main.py --listen 0.0.0.0 --port 8188
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable comfyui
    sudo systemctl start comfyui
    
    echo "✅ Service installed and started!"
fi

# Start ComfyUI (if not using systemd)
if [ "$OS_TYPE" != "linux" ]; then
    echo "🚀 Starting ComfyUI..."
    "$HOME/start-comfyui.sh" &
fi

echo ""
echo "✅ Installation complete!"
echo "ComfyUI is now running at: http://localhost:8188"
echo "Return to Peace Script AI to start generating!"
```

---

## 🔄 Workflow Examples

### Use Case 1: First-Time User (No GPU)
```
1. User opens Peace Script AI
2. System detects no local ComfyUI
3. Shows options:
   - "Use Cloud ($0.02/video)" ← Default selected
   - "Install Local (Free, one-time setup 30min)"
4. User clicks "Use Cloud"
5. Generates video → Uses RunPod serverless
6. Cost tracked: $0.02
```

### Use Case 2: Power User (RTX 5090)
```
1. User clicks "Install Local"
2. Installation UI appears:
   [GPU Detected: RTX 5090 32GB ✅]
   [Step 1/7] Downloading ComfyUI... ████░░░░ 60%
3. 20 minutes later... ✅ Done!
4. System detects local ComfyUI available
5. Auto-selects "Local (Free)" as default
6. Generates 100 videos → $0 cost
7. If local busy → Auto fallback to cloud
```

### Use Case 3: Hybrid User
```
1. Has local GPU installed
2. Queue builds up (10 videos pending)
3. Load balancer decides:
   - Local: Process 3 videos (GPU capacity)
   - Cloud: Spawn 2 RunPod workers for remaining 7
4. Total cost: $0.14 (7 × $0.02)
5. Idle pods auto-shutdown after 5 min
```

---

## 📊 Cost Optimization Strategy

### Priority Matrix

| Scenario | Backend Choice | Cost | Speed | Reasoning |
|----------|----------------|------|-------|-----------|
| Local available, no queue | **Local** | $0 | Fast (10s) | No cost, fast |
| Local available, small queue | **Local** | $0 | Medium (30s) | Wait is acceptable |
| Local available, long queue | **Local + Cloud** | $0.02-0.04 | Fast (10s) | Hybrid to balance |
| Local unavailable | **Cloud** | $0.02 | Medium (20s) | On-demand pod |
| Cloud expensive/slow | **Gemini** | $0.08 | Very fast (5s) | Premium fallback |
| All unavailable | **Error** | - | - | Show clear error message |

### Auto-Shutdown Logic
```javascript
// Save money by shutting down idle cloud workers
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const COST_THRESHOLD = 0.10; // If cost > $0.10, be aggressive

setInterval(() => {
  for (const pod of cloudPods) {
    const idleTime = Date.now() - pod.lastJobAt;
    const hourlyRate = pod.costPerHour;
    
    // Shutdown if:
    // 1. Idle > 5 minutes
    // 2. OR (cost high AND idle > 2 minutes)
    if (idleTime > IDLE_TIMEOUT || 
        (hourlyRate > COST_THRESHOLD && idleTime > 2 * 60 * 1000)) {
      terminatePod(pod.id);
    }
  }
}, 60 * 1000); // Check every minute
```

---

## 🎨 UI/UX Design

### Backend Selector Component
```
┌────────────────────────────────────────────────────────┐
│  🎬 Video Generation Backend                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ○ Auto (Recommended)                                 │
│    └─ Uses local if available, cloud as backup       │
│                                                        │
│  ◉ Local GPU (RTX 5090 32GB) ✅                       │
│    └─ Free • ~10s per video • Available              │
│                                                        │
│  ○ Cloud (RunPod)                                     │
│    └─ $0.02/video • ~20s • On-demand                 │
│                                                        │
│  ○ Gemini Video (Premium)                            │
│    └─ $0.08/video • ~5s • Always available           │
│                                                        │
├────────────────────────────────────────────────────────┤
│  💰 This month: 47 videos • $0.24 spent               │
│  💎 Saved $3.52 using local GPU                       │
└────────────────────────────────────────────────────────┘
```

### One-Click Installer
```
┌────────────────────────────────────────────────────────┐
│  ⚡ Install ComfyUI Locally                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Your System:                                         │
│  • GPU: NVIDIA RTX 5090 (32GB) ✅                     │
│  • Space: 120GB available (need 25GB) ✅              │
│  • Internet: Fast (50 Mbps) ✅                        │
│                                                        │
│  What will be installed:                              │
│  • ComfyUI (~500MB)                                   │
│  • AI Models (~20GB)                                  │
│  • Python Environment (~2GB)                          │
│                                                        │
│  ⏱️ Estimated time: 15-30 minutes                     │
│                                                        │
│  [  Install Now - Free Forever!  ]                    │
│                                                        │
│  Benefits:                                            │
│  ✓ Generate unlimited videos for FREE                │
│  ✓ 2-3x faster than cloud                            │
│  ✓ Full privacy (no data sent to cloud)              │
│  ✓ Works offline                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Installation Progress
```
┌────────────────────────────────────────────────────────┐
│  🚀 Installing ComfyUI...                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [✅] Detect GPU: RTX 5090 32GB                        │
│  [✅] Download ComfyUI (500MB)                         │
│  [✅] Extract files                                    │
│  [⏳] Download AI models                               │
│       ████████████████░░░░░░ 65%                      │
│       Downloading FLUX.1-schnell (5.2GB / 8GB)        │
│       Speed: 12 MB/s • ETA: 3m 45s                    │
│  [⏳] Setup Python environment                         │
│  [  ] Start service                                   │
│  [  ] Verify installation                             │
│                                                        │
│                                                        │
│  [ Pause Download ]  [ Cancel ]                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### API Key Management
```javascript
// Backend: Never expose RunPod API key to frontend
// Use environment variables only

// Frontend: Only show pod status, not API key
const podStatus = await fetch('/api/comfyui/cloud-status', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

### Local Installation Safety
- Download from official GitHub releases only
- Verify checksums before extraction
- Run installation in sandboxed environment
- Ask for admin permissions only when needed

### Cost Protection
```javascript
// Prevent runaway costs
const DAILY_CLOUD_LIMIT = 5.00; // $5/day max
const MONTHLY_CLOUD_LIMIT = 50.00; // $50/month max

if (userCloudSpendToday >= DAILY_CLOUD_LIMIT) {
  throw new Error('Daily cloud spending limit reached. Use local GPU or try tomorrow.');
}
```

---

## 📈 Metrics & Monitoring

### Track These Metrics
```typescript
interface SystemMetrics {
  // Usage
  totalJobs: number;
  localJobs: number;
  cloudJobs: number;
  geminiJobs: number;
  
  // Performance
  avgProcessTimeLocal: number; // seconds
  avgProcessTimeCloud: number;
  avgProcessTimeGemini: number;
  
  // Cost
  totalCloudCost: number; // USD
  savedMoney: number; // local vs cloud
  
  // Reliability
  successRateLocal: number; // %
  successRateCloud: number;
  failoverCount: number; // times cloud rescued local failures
  
  // Cloud Efficiency
  avgPodUptime: number; // minutes
  avgJobsPerPod: number;
  wastedCost: number; // idle pod time
}
```

### Dashboard (Admin)
```
┌────────────────────────────────────────────────────────┐
│  📊 ComfyUI System Dashboard (Last 30 days)           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Usage:                                               │
│  • Total Videos: 2,847                                │
│    ├─ Local: 2,103 (74%) ✅                          │
│    ├─ Cloud: 678 (24%)                               │
│    └─ Gemini: 66 (2%)                                │
│                                                        │
│  Cost:                                                │
│  • Cloud Spend: $13.56                                │
│  • Gemini Spend: $5.28                                │
│  • Total: $18.84                                      │
│  • Saved: $55.66 (using local)                        │
│                                                        │
│  Performance:                                         │
│  • Avg Speed (Local): 12.3s                           │
│  • Avg Speed (Cloud): 18.7s                           │
│  • Avg Speed (Gemini): 5.1s                           │
│                                                        │
│  Reliability:                                         │
│  • Success Rate: 98.2%                                │
│  • Failover Events: 23 (cloud saved the day!)        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 2: Architecture Design ← **Current Phase**
- [x] System architecture diagram
- [x] Component specifications
- [x] API design
- [x] Cost optimization strategy
- [x] UI/UX mockups
- [ ] Review and approval

### Phase 3: Cloud Worker Management
- [ ] RunPod API integration
- [ ] Serverless endpoint setup
- [ ] On-demand pod spawning
- [ ] Auto-scaling logic
- [ ] Cost tracking
- [ ] Auto-shutdown implementation

### Phase 4: Local Auto-Installer
- [ ] PowerShell installer (Windows)
- [ ] Bash installer (macOS/Linux)
- [ ] GPU detection
- [ ] Model downloader with progress
- [ ] Service registration
- [ ] Desktop shortcuts

### Phase 5: Intelligent Load Balancer
- [ ] Backend selector logic
- [ ] Priority queue system
- [ ] Cost calculator
- [ ] Health monitoring
- [ ] Fallback mechanism
- [ ] User preference handling

### Phase 6: Frontend Integration
- [ ] Backend selector UI
- [ ] One-click installer UI
- [ ] Installation progress UI
- [ ] Cost monitor dashboard
- [ ] Real-time status indicators
- [ ] Settings page enhancements

### Phase 7: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] Cloud deployment tests
- [ ] Local installation tests (clean machines)
- [ ] Load testing
- [ ] Cost optimization verification
- [ ] Documentation
- [ ] Production deployment

---

## 📝 Notes & Decisions

### Why RunPod?
- ✅ Best pricing ($0.34/hr for RTX 3090)
- ✅ Serverless option available
- ✅ GraphQL API (easy integration)
- ✅ Auto-scaling support
- ✅ Docker support
- ✅ Already have scripts/docs for RunPod

### Why Not Other Providers?
- **Replicate**: More expensive ($0.08/video), less control
- **AWS/GCP**: Complex setup, higher cost, overkill for this use case
- **Vast.ai**: Cheaper but reliability concerns
- **Banana.dev**: Deprecated serverless offering

### User Preference Priority
```
Auto Mode:
1. Local GPU (if available, healthy, and queue < 5)
2. Cloud worker (spawn if needed, cost-effective)
3. Gemini (last resort, expensive but reliable)

User Override:
- Allow users to force local/cloud/gemini
- Show cost implications
- Remember user preference
```

---

## ✅ Success Criteria

This implementation is successful if:

1. ✅ **One-Click Install** works on clean Windows/Mac/Linux machines
2. ✅ **Cloud Deployment** can spawn RunPod workers in < 60 seconds
3. ✅ **Cost Optimization** saves users at least 50% vs cloud-only
4. ✅ **Reliability** maintains 99%+ success rate with automatic fallbacks
5. ✅ **User Experience** requires zero manual configuration
6. ✅ **Performance** local GPU is 2x faster than cloud
7. ✅ **Flexibility** users can switch backends without service restart

---

**Status:** 📋 Architecture Design Complete  
**Next Step:** Phase 3 - Implement Cloud Worker Management  
**Estimated Time:** 15-20 hours total implementation

