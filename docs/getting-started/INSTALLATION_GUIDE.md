# Installation Guide - Complete Setup for Peace Script AI

## 🎯 Overview

คู่มือการติดตั้งระบบครบวงจร สำหรับการลดต้นทุน 70-90% ด้วย Open Source AI

**ระยะเวลาการติดตั้ง:** 30-60 นาที  
**ความยาก:** ⭐⭐⭐ (ปานกลาง)  
**ประหยัดได้:** ฿30-35 ต่อโปรเจกต์

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**สำหรับ Open Source Mode:**

- **CPU**: Intel i5/AMD Ryzen 5 ขึ้นไป (4+ cores recommended)
- **RAM**: 16GB+ (32GB สำหรับ advanced models)
- **Storage**: 50GB+ ว่าง
- **GPU**: NVIDIA 8GB+ VRAM (optional แต่แนะนำ) หรือ Apple Silicon (M1/M2/M3)
- **OS**: macOS 11+, Windows 10+, Ubuntu 20.04+

**สำหรับ Hybrid/Cloud Mode:**

- **RAM**: 8GB
- **Storage**: 10GB
- **Internet**: 10 Mbps+

### Software Requirements

- **Node.js**: 18.x+ ([Download](https://nodejs.org))
- **Python**: 3.10+ ([Download](https://python.org))
- **Git**: Latest ([Download](https://git-scm.com))

---

## Quick Start

### Option 1: Cloud Only (ง่ายที่สุด)

```bash
# 1. Clone repository
git clone https://github.com/metapeaceDev/peace-script-ai.git
cd peace-script-ai

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env and add your API keys

# 4. Run
npm run dev
```

**ใช้เวลา:** 5 นาที  
**ค่าใช้จ่าย:** ฿34.65 ต่อโปรเจกต์

---

### Option 2: Hybrid (แนะนำ)

```bash
# 1-3. Same as Cloud Only

# 4. Install Redis
brew install redis  # macOS
# or: sudo apt install redis-server  # Linux

# 5. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:7b

# 6. Run everything
npm run dev
```

**ใช้เวลา:** 15-20 นาที  
**ค่าใช้จ่าย:** ฿5-15 ต่อโปรเจกต์ (ประหยัด 70%)

---

### Option 3: Full Open Source (ประหยัดสุด)

```bash
# 1-5. Same as Hybrid

# 6. Install ComfyUI
cd ~/Desktop
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# 7. Download models
cd /path/to/peace-script-ai
bash scripts/download-flux-schnell.sh
bash scripts/download-sdxl-turbo.sh
bash scripts/download-lora-models.sh

# 8. Start ComfyUI
cd ~/Desktop/ComfyUI
python main.py

# 9. Start Peace Script (in new terminal)
cd /path/to/peace-script-ai
npm run dev
```

**ใช้เวลา:** 45-60 นาที (+ 1-2 ชั่วโมงดาวน์โหลดโมเดล)  
**ค่าใช้จ่าย:** ฿0 ต่อโปรเจกต์ (ประหยัด 100%! 🎉)

---

## Step-by-Step Installation

### Step 1: Install Core Dependencies

#### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Python
brew install python@3.11

# Install Git
brew install git
```

#### Windows

```powershell
# Install via Chocolatey
choco install nodejs python git

# Or download installers manually
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3.11 python3-pip

# Install Git
sudo apt install -y git
```

---

### Step 2: Install Redis (Queue System)

**ทำไมต้องใช้ Redis?**

- รองรับ concurrent jobs
- Priority queue (ENTERPRISE > PRO > BASIC > FREE)
- Auto-retry on failure
- Real-time progress tracking

#### macOS

```bash
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return: PONG
```

#### Windows (WSL)

```bash
sudo apt install redis-server
sudo service redis-server start

# Verify
redis-cli ping
```

#### Docker (All platforms)

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

📚 **Detailed Guide:** [REDIS_QUEUE_SETUP.md](./REDIS_QUEUE_SETUP.md)

---

### Step 3: Install Ollama (Text Generation)

**ทำไมต้องใช้ Ollama?**

- Text generation ฟรี 100%
- ประหยัด ฿0.35 ต่อโปรเจกต์
- ไม่ต้องพึ่ง API keys
- รองรับภาษาไทย

#### macOS/Linux

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Download models (choose one or more)
ollama pull llama3.2:3b    # Quick (2GB, 1-2s)
ollama pull llama3.2:7b    # Balanced (4GB, 3-5s) ⭐ Recommended
ollama pull qwen2.5:14b    # Advanced (9GB, 8-12s)

# Verify
ollama run llama3.2:7b "สวัสดี"
```

#### Windows

1. Download: https://ollama.com/download/windows
2. Run installer
3. Open terminal and run: `ollama pull llama3.2:7b`

📚 **Detailed Guide:** [OLLAMA_SETUP.md](./OLLAMA_SETUP.md)

---

### Step 4: Install ComfyUI (Image/Video Generation)

**ทำไมต้องใช้ ComfyUI?**

- Image generation ฟรี 100%
- ประหยัด ฿16.80 ต่อรูป
- คุณภาพสูง (FLUX models)
- ควบคุมได้ทุกอย่าง

#### Clone ComfyUI

```bash
cd ~/Desktop
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

#### Install Dependencies

**macOS:**

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
pip install torch torchvision torchaudio
```

**Windows:**

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

**Linux:**

```bash
# Same as macOS
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install torch torchvision torchaudio
```

#### Test ComfyUI

```bash
python main.py

# Should start server at http://localhost:8188
```

---

### Step 5: Download AI Models

**Model Storage Requirements:**

- FLUX.1-schnell: 16GB
- SDXL Turbo: 6.5GB
- LoRA models: ~700MB
- **Total:** ~23GB

#### Download Base Models

```bash
cd /path/to/peace-script-ai

# FLUX.1-schnell (quality mode, 20s)
bash scripts/download-flux-schnell.sh

# SDXL Turbo (speed mode, 5s)
bash scripts/download-sdxl-turbo.sh
```

#### Download LoRA Models (Optional)

```bash
# Character consistency + enhancements
bash scripts/download-lora-models.sh
```

**What you get:**

- ✅ IP-Adapter FaceID Plus v2 (character consistency)
- ✅ LCM LoRA (4-8 step generation)
- ✅ Detail Tweaker (quality boost)
- ✅ Cinematic Style (film look)

---

### Step 6: Configure Environment

```bash
cd /path/to/peace-script-ai
cp .env.example .env
```

**Edit `.env`:**

```env
# ============================================
# Cloud API Keys (for Cloud/Hybrid mode)
# ============================================
GEMINI_API_KEY=your_gemini_key_here
IMAGEN_API_KEY=your_imagen_key_here
VEO_API_KEY=your_veo_key_here

# ============================================
# Redis Configuration
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# Ollama Configuration
# ============================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2:7b
OLLAMA_TEMPERATURE=0.7

# ============================================
# ComfyUI Configuration
# ============================================
COMFYUI_API_URL=http://localhost:8188
COMFYUI_DEFAULT_MODEL=flux-schnell

# ============================================
# Default Provider Mode
# ============================================
# Options: 'cloud' | 'open-source' | 'hybrid'
DEFAULT_PROVIDER_MODE=hybrid
```

---

### Step 7: Install Peace Script Dependencies

```bash
cd /path/to/peace-script-ai

# Install npm packages
npm install

# Install additional packages for queue system
npm install bull redis
npm install --save-dev @types/bull
```

---

### Step 8: Start Everything

**Terminal 1: Redis**

```bash
redis-server
```

**Terminal 2: Ollama**

```bash
ollama serve
```

**Terminal 3: ComfyUI**

```bash
cd ~/Desktop/ComfyUI
python main.py
```

**Terminal 4: Peace Script**

```bash
cd /path/to/peace-script-ai
npm run dev
```

**Access App:**

- http://localhost:5173

---

## Verification

### ✅ Check Redis

```bash
redis-cli ping
# Expected: PONG
```

### ✅ Check Ollama

```bash
ollama list
# Should show: llama3.2:7b (or your models)

ollama run llama3.2:7b "สวัสดี"
# Should generate Thai response
```

### ✅ Check ComfyUI

```bash
curl http://localhost:8188
# Should return: {"status": "running"}
```

### ✅ Check Peace Script

1. Open http://localhost:5173
2. Click "Provider Settings"
3. See 3 modes: Cloud ☁️ | Open Source 🔓 | Hybrid 🔀
4. Select "Open Source"
5. Test text generation

---

## Troubleshooting

### ❌ Redis connection refused

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Docker
docker start redis
```

### ❌ Ollama not found

```bash
# Reinstall
curl -fsSL https://ollama.com/install.sh | sh

# Check if running
ps aux | grep ollama
```

### ❌ ComfyUI models not loading

```bash
# Check models directory
ls -lh ~/Desktop/ComfyUI/models/checkpoints/

# Should see:
# flux1-schnell.safetensors (16GB)
# sd_xl_turbo_1.0.safetensors (6.5GB)
```

### ❌ Out of memory

**Solution 1: Use smaller models**

```bash
ollama pull llama3.2:3b  # Only 2GB RAM
```

**Solution 2: Close other apps**

```bash
# macOS: Force quit heavy apps
# Windows: Task Manager → End heavy processes
```

**Solution 3: Increase swap space**

```bash
# Linux
sudo fallocate -l 8G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Performance Benchmarks

### Text Generation

| Model        | Size | RAM  | Speed | Quality    |
| ------------ | ---- | ---- | ----- | ---------- |
| Llama 3.2 3B | 2GB  | 8GB  | 1-2s  | ⭐⭐⭐     |
| Llama 3.2 7B | 4GB  | 16GB | 3-5s  | ⭐⭐⭐⭐   |
| Qwen 2.5 14B | 9GB  | 32GB | 8-12s | ⭐⭐⭐⭐⭐ |

### Image Generation

| Model        | Size  | VRAM | Speed | Quality    |
| ------------ | ----- | ---- | ----- | ---------- |
| SDXL Turbo   | 6.5GB | 6GB  | 5s    | ⭐⭐⭐⭐   |
| FLUX schnell | 16GB  | 12GB | 20s   | ⭐⭐⭐⭐⭐ |
| FLUX dev     | 16GB  | 16GB | 45s   | ⭐⭐⭐⭐⭐ |

---

## Cost Comparison

### Per 100 Projects

| Setup                | Cost       | Time            | Setup Difficulty |
| -------------------- | ---------- | --------------- | ---------------- |
| **Cloud Only**       | ฿3,465     | Fast (3-10s)    | ⭐ Easy          |
| **Hybrid**           | ฿500-1,500 | Medium (10-30s) | ⭐⭐ Medium      |
| **Full Open Source** | **฿0**     | Slower (20-60s) | ⭐⭐⭐ Hard      |

**Savings: ฿3,465/100 projects = 100% cost reduction! 🎉**

---

## Next Steps

1. ✅ Complete installation
2. ✅ Test each component
3. ✅ Create first project
4. 📊 Monitor usage with UsageDashboard
5. 🎯 Optimize based on your needs

---

## Support & Resources

- **Documentation**: [/docs](./docs)
- **API Reference**: [/api-reference.md](./api-reference.md)
- **Community**: [Discord](https://discord.gg/peace-script)
- **Issues**: [GitHub Issues](https://github.com/metapeaceDev/peace-script-ai/issues)

---

**Installation Complete! 🎉**

เริ่มสร้างโปรเจกต์แรกของคุณได้เลย:

```bash
npm run dev
# Then open http://localhost:5173
```
