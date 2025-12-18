# ComfyUI System - User Guide

**Peace Script AI - Complete Documentation**

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [System Requirements](#system-requirements)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Using the System](#using-the-system)
7. [Backend Options](#backend-options)
8. [Cost Calculator](#cost-calculator)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)
11. [Advanced Features](#advanced-features)

---

## Introduction

### What is Peace Script AI ComfyUI System?

Peace Script AI includes a powerful video generation system powered by **ComfyUI** - a node-based workflow engine for AI image and video generation. The system automatically detects your hardware and recommends the best backend for your needs.

### Key Features

- ✅ **Auto GPU Detection** - Detects NVIDIA CUDA, Apple Silicon MPS, AMD DirectML
- ✅ **Smart Backend Selection** - Automatically chooses the best option
- ✅ **Cost Calculator** - Compare costs across different backends
- ✅ **Real-time Monitoring** - Track GPU usage, memory, and performance
- ✅ **Multiple Backends** - Local GPU, Cloud ComfyUI, Replicate, Gemini Veo
- ✅ **Progress Tracking** - See exactly what's happening during generation
- ✅ **Error Handling** - Automatic retries and helpful error messages

---

## Quick Start

### 5-Minute Setup

1. **Open Peace Script AI** at https://peace-script-ai.web.app

2. **Check System Status**
   - Look at the top right corner
   - You'll see a badge showing your current backend
   - Green = Local GPU (FREE)
   - Blue = Cloud backend

3. **Generate Your First Video**
   - Go to Video Generation page
   - Enter your prompt
   - Click "Generate"
   - Wait for progress indicators
   - Download your video!

### First Time Users

If you see "No GPU Detected":
- Don't worry! The system will use **Gemini Veo** automatically
- Cost: $0.50 per video
- Quality: Excellent (720p, 30-120 seconds)
- Alternative: Set up local ComfyUI (FREE, see Installation section)

---

## System Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10, macOS 11, Linux | Windows 11, macOS 13+ |
| **RAM** | 8 GB | 16 GB+ |
| **Storage** | 10 GB free | 50 GB+ SSD |
| **CPU** | 4 cores | 8+ cores |
| **GPU** | Optional | NVIDIA RTX 3060+ / Apple M1+ |

### GPU Support

#### ✅ **NVIDIA (CUDA)**
- GeForce RTX 20/30/40 series
- Minimum 6 GB VRAM (8+ GB recommended)
- CUDA 11.8+ drivers
- **Best Performance**: RTX 4090 (24 GB VRAM)

#### ✅ **Apple Silicon (MPS)**
- M1, M1 Pro, M1 Max, M1 Ultra
- M2, M2 Pro, M2 Max, M2 Ultra
- M3, M3 Pro, M3 Max
- **Unified Memory**: 16 GB+

#### ✅ **AMD (DirectML)**
- Radeon RX 6000/7000 series
- Windows 10/11 only
- DirectML drivers
- **Limited support** (experimental)

#### ⚠️ **No GPU?**
- Use cloud backends
- Options: Cloud ComfyUI ($0.02/video) or Gemini Veo ($0.50/video)

---

## Installation

### Option 1: No Installation (Cloud Only)

**Perfect for beginners or no-GPU users**

1. Open https://peace-script-ai.web.app
2. Click "Generate Video"
3. System uses Gemini Veo automatically
4. **Cost**: $0.50 per video
5. **No setup required!**

---

### Option 2: Local ComfyUI (FREE, requires GPU)

**Best for frequent users with NVIDIA/Apple Silicon GPU**

#### Step 1: Install Python

**Windows**:
```bash
# Download Python 3.10 from python.org
# Check installation:
python --version  # Should show 3.10.x
```

**macOS**:
```bash
# Install via Homebrew
brew install python@3.10

# Verify
python3 --version
```

**Linux**:
```bash
sudo apt update
sudo apt install python3.10 python3-pip
```

#### Step 2: Install ComfyUI

**Method A: Quick Install (Recommended)**
```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# For NVIDIA GPU
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For Mac (Apple Silicon)
pip3 install --pre torch torchvision
```

**Method B: Manual Install**
1. Download from https://github.com/comfyanonymous/ComfyUI
2. Extract to `C:\ComfyUI` (Windows) or `~/ComfyUI` (Mac/Linux)
3. Install dependencies as shown above

#### Step 3: Download Models

**Required Models** (~10 GB):
```bash
cd ComfyUI/models/checkpoints

# Stable Diffusion 1.5
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt

# AnimateDiff
cd ../animatediff
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt
```

**Optional Models**:
- Stable Video Diffusion (~7 GB)
- FLUX.1 (~23 GB) - Best quality
- ControlNet models

#### Step 4: Start ComfyUI

```bash
cd ComfyUI

# Windows
python main.py

# Mac/Linux
python3 main.py

# With GPU acceleration
python main.py --force-fp16  # For 6-8 GB VRAM
python main.py --lowvram     # For 4-6 GB VRAM
```

**Success Indicators**:
```
Starting server on localhost:8188
To see the GUI go to: http://127.0.0.1:8188
```

#### Step 5: Verify Connection

1. Open http://localhost:8188 in browser
2. You should see ComfyUI interface
3. Go back to Peace Script AI
4. Top right badge should show "Local ComfyUI (FREE)" 🟢

---

### Option 3: Cloud ComfyUI Setup

**For users who want GPU power without local installation**

#### Deploy to RunPod (Recommended)

**Cost**: $0.44/hour pay-per-use (~$0.02/video)

1. **Create RunPod Account**
   - Go to https://runpod.io
   - Sign up (credit card required)
   - Add $10 credit

2. **Deploy Template**
   ```
   Template: ComfyUI
   GPU: RTX 3090 (24 GB)
   Region: US-West (lowest latency)
   Volume: 50 GB
   ```

3. **Get URL**
   - Once deployed, copy the HTTPS URL
   - Example: `https://abc123-8188.proxy.runpod.net`

4. **Configure Peace Script AI**
   - Open Settings
   - Go to "Backend" tab
   - Enter URL in "Cloud ComfyUI URL"
   - Save

5. **Verify**
   - Badge should show "Cloud ComfyUI" 🔵
   - Test with a video generation

#### Alternative: Google Colab

**Cost**: FREE (with limits) or $9.99/month

1. Open our Colab notebook (link in docs)
2. Run all cells
3. Copy ngrok/Cloudflare tunnel URL
4. Add to Peace Script AI settings

---

## Configuration

### System Settings

#### Access Settings
1. Click profile icon (top right)
2. Select "ComfyUI Settings"
3. Or go to `/settings/comfyui`

#### Overview Tab

**What you'll see**:
- 🎮 GPU & Device Status
- 🏥 System Health (CPU, Memory, GPU usage)
- 💡 Smart Recommendations
- ⚡ Quick Actions

**Quick Actions**:
- **Refresh Device Detection** - Re-scan for GPUs
- **Test Backend Connection** - Verify ComfyUI is working
- **View Performance Stats** - See generation speeds

#### Backend Tab

**Manual Backend Selection**:
1. Go to "Backend" tab
2. Choose from available options:
   - Local ComfyUI (if running)
   - Cloud ComfyUI (if configured)
   - Replicate Hotshot-XL
   - Gemini Veo 3.1

3. Click "Save Settings"

**Device Settings**:
- **Device Type**: CUDA, MPS, DirectML, or CPU
- **Low VRAM Mode**: Enable for GPUs with <8 GB
- **Batch Size**: 1-4 (higher = faster but more VRAM)
- **Preview Mode**: See generation in real-time

#### Cost Analysis Tab

**Monthly Budget Planner**:
1. Enter expected videos per month
2. See cost breakdown for each backend
3. Compare total monthly costs
4. Make informed decision

**Example**:
```
100 videos/month:
- Local GPU: $0 (FREE)
- Cloud ComfyUI: $2.00
- Replicate: $1.80
- Gemini Veo: $50.00
```

#### Advanced Tab

**Debug Mode**:
- Enable to see detailed logs
- Useful for troubleshooting
- Disable in production

**Cache Settings**:
- Enable: Faster repeated operations
- Disable: Always fetch fresh data
- Clear: Remove all cached data

**Max Retry Attempts**:
- 0-10 retries on errors
- Recommended: 3
- Higher = more resilient but slower on failures

**Danger Zone**:
- 🗑️ Clear All Cache
- 🔄 Reset to Defaults
- Use with caution!

---

## Using the System

### Video Generation Workflow

#### 1. **Prepare Your Prompt**

**Good Prompt Example**:
```
A Buddhist monk meditating peacefully under a golden bodhi tree, 
soft morning light filtering through leaves, serene temple garden, 
cinematic lighting, 4K quality
```

**Tips**:
- Be specific and detailed
- Include style keywords (cinematic, realistic, anime)
- Mention lighting and atmosphere
- Specify camera movement if needed

#### 2. **Choose Settings**

**Quality**:
- 480p: Fast, lower quality
- 720p: Balanced (recommended)
- 1080p: High quality
- 4K: Best quality (requires powerful GPU)

**Aspect Ratio**:
- 16:9: Widescreen (YouTube, TV)
- 4:3: Classic
- 1:1: Square (Instagram)
- 9:16: Vertical (TikTok, Stories)

**Duration**:
- 3-5 seconds: Quick clips
- 5-10 seconds: Standard
- 10-30 seconds: Long-form (Gemini Veo only)

#### 3. **Start Generation**

1. Click "Generate Video"
2. Watch progress indicator
3. See stages:
   - 🏁 Preparing
   - ✓ Validating
   - 🎬 Generating (0-100%)
   - 🎨 Processing
   - ✅ Complete

**Estimated Times**:
- Local GPU (RTX 4090): 30-60 seconds
- Local GPU (RTX 3060): 2-4 minutes
- Cloud ComfyUI: 1-2 minutes
- Gemini Veo: 2-5 minutes

#### 4. **Download & Use**

- Video appears in preview
- Click "Download" button
- Format: MP4 or GIF (depending on backend)
- Ready to use in your project!

---

## Backend Options

### Comparison Table

| Backend | Cost | Speed | Quality | GPU Required | Setup |
|---------|------|-------|---------|--------------|-------|
| **Local GPU** | FREE | ⚡ Very Fast | ⭐⭐⭐⭐⭐ | ✅ NVIDIA/Apple | Medium |
| **Cloud ComfyUI** | $0.02/video | ⚡ Fast | ⭐⭐⭐⭐⭐ | ❌ No | Easy |
| **Replicate** | $0.018/video | 🔶 Medium | ⭐⭐⭐⭐ | ❌ No | Easy |
| **Gemini Veo** | $0.50/video | 🔶 Medium | ⭐⭐⭐⭐⭐ | ❌ No | Very Easy |

### When to Use Each

#### 🟢 **Local GPU** (FREE)
**Best for**:
- Frequent video generation
- Privacy-sensitive content
- Unlimited usage
- Full customization

**Requirements**:
- NVIDIA RTX or Apple Silicon
- ComfyUI installed
- Models downloaded (~10-30 GB)

**Pros**:
- ✅ FREE unlimited usage
- ✅ Fastest generation
- ✅ Complete control
- ✅ Works offline
- ✅ Privacy (local processing)

**Cons**:
- ❌ Requires GPU
- ❌ Initial setup time
- ❌ Disk space needed

---

#### 🔵 **Cloud ComfyUI** ($0.02/video)
**Best for**:
- No local GPU
- High volume (100+ videos/month)
- Better than Gemini cost

**Setup**:
- Deploy on RunPod/Colab
- Configure URL in settings

**Pros**:
- ✅ Low cost ($0.02/video)
- ✅ Fast generation
- ✅ No local installation
- ✅ RTX 3090/4090 power
- ✅ Pay per use

**Cons**:
- ❌ Requires cloud account
- ❌ Internet connection needed
- ❌ Per-hour billing (~$0.44/hr)

---

#### 🟣 **Replicate** ($0.018/video)
**Best for**:
- Occasional use
- Quick GIF animations
- No setup wanted

**Pros**:
- ✅ Lowest cost
- ✅ Zero setup
- ✅ Reliable API
- ✅ Good quality

**Cons**:
- ❌ GIF format only (not MP4)
- ❌ Limited duration (few seconds)
- ❌ API key required

---

#### 🟠 **Gemini Veo 3.1** ($0.50/video)
**Best for**:
- Highest quality needed
- Longer videos (30-120s)
- One-off projects

**Pros**:
- ✅ Best quality (720p)
- ✅ Longest duration
- ✅ Zero setup
- ✅ Most reliable
- ✅ Advanced AI

**Cons**:
- ❌ Highest cost
- ❌ API quota limits
- ❌ Slower than local GPU

---

## Cost Calculator

### How to Use

1. Go to Settings → Cost Analysis
2. Enter "Videos per month"
3. See monthly costs for each backend
4. Compare and decide

### Cost Examples

#### **Scenario 1: Hobbyist** (10 videos/month)
```
Local GPU: $0
Cloud ComfyUI: $0.20
Replicate: $0.18
Gemini Veo: $5.00
```
**Recommendation**: Local GPU if available, otherwise Cloud ComfyUI

#### **Scenario 2: Content Creator** (100 videos/month)
```
Local GPU: $0
Cloud ComfyUI: $2.00
Replicate: $1.80
Gemini Veo: $50.00
```
**Recommendation**: Local GPU strongly recommended

#### **Scenario 3: Business** (1000 videos/month)
```
Local GPU: $0
Cloud ComfyUI: $20.00
Replicate: $18.00
Gemini Veo: $500.00
```
**Recommendation**: Local GPU essential, or hybrid (local + cloud fallback)

### ROI Calculation

**Local GPU Setup Cost**: ~$800-2000 (RTX 4070-4090)

**Break-even points**:
- vs Cloud ComfyUI: 40,000-100,000 videos
- vs Gemini Veo: 1,600-4,000 videos

**For 100 videos/month**:
- Cloud savings: $2/month → Break-even: 33-83 years
- Gemini savings: $50/month → Break-even: 16-40 months

**Verdict**: Local GPU worth it if:
1. Generating 100+ videos/month AND
2. Planning to use for 1+ years AND
3. Want fastest speeds

Otherwise, Cloud ComfyUI or Replicate is more economical.

---

## Troubleshooting

### Common Issues

#### ❌ "ComfyUI is not running"

**Symptoms**:
- Badge shows error
- Can't generate videos
- "Connection refused" error

**Solutions**:
1. **Check if ComfyUI is running**
   ```bash
   # Terminal should show:
   # "Starting server on localhost:8188"
   ```

2. **Verify URL**
   - Should be `http://localhost:8188`
   - Not `https://` (local doesn't use SSL)

3. **Check firewall**
   - Allow port 8188
   - Disable antivirus temporarily to test

4. **Restart ComfyUI**
   ```bash
   # Stop: Ctrl+C
   # Start: python main.py
   ```

5. **Check logs**
   - Look for errors in terminal
   - Common: Missing models, CUDA errors

---

#### ❌ "Out of VRAM" / GPU Memory Error

**Symptoms**:
- Generation fails midway
- "CUDA out of memory"
- Black screen or corrupted output

**Solutions**:
1. **Enable Low VRAM Mode**
   - Settings → Backend → Low VRAM Mode: ON

2. **Reduce Settings**
   - Lower resolution (720p → 480p)
   - Reduce duration
   - Smaller batch size

3. **Close Other Apps**
   - Chrome/browsers use GPU memory
   - Close games, video editors

4. **Use --lowvram Flag**
   ```bash
   python main.py --lowvram
   ```

5. **Upgrade GPU** (long-term)
   - Minimum 8 GB VRAM recommended
   - RTX 3060 12GB or better

---

#### ⚠️ "Slow Generation Speed"

**Symptoms**:
- Takes 10+ minutes per video
- CPU usage high, GPU idle
- Progress stuck

**Solutions**:
1. **Check Device Selection**
   - Settings → Backend
   - Should show CUDA/MPS, not CPU
   - If CPU, GPU not detected

2. **Update GPU Drivers**
   - NVIDIA: GeForce Experience
   - AMD: Adrenalin
   - Mac: System Update

3. **Install CUDA Toolkit** (NVIDIA)
   - Download from nvidia.com
   - Version 11.8 or 12.1

4. **Check Model Loading**
   - First generation slow (loading models)
   - Subsequent ones faster

5. **Optimize Settings**
   - Disable preview mode
   - Use FP16 precision
   - Increase batch size

---

#### 🔒 "Invalid API Key" (Gemini Veo)

**Symptoms**:
- Error during Gemini generation
- "API key not valid"

**Solutions**:
1. **Get API Key**
   - Go to https://makersuite.google.com/app/apikey
   - Create new key
   - Copy key

2. **Add to Environment**
   - Create `.env` file
   - Add: `VITE_GEMINI_API_KEY=your_key_here`
   - Restart app

3. **Check Quota**
   - Free tier: 60 requests/minute
   - Paid: Higher limits
   - Check console for quota errors

---

#### 🌐 "Connection Timeout" (Cloud)

**Symptoms**:
- Can't reach cloud ComfyUI
- Timeout after 30 seconds
- "ERR_CONNECTION_TIMED_OUT"

**Solutions**:
1. **Check URL**
   - Must be HTTPS (not HTTP)
   - No trailing slash
   - Example: `https://abc-8188.proxy.runpod.net`

2. **Verify Cloud Instance**
   - Is RunPod pod running?
   - Check pod status
   - Restart if needed

3. **Check Network**
   - Firewall blocking?
   - VPN interfering?
   - Try different network

4. **Increase Timeout**
   - Settings → Advanced → Timeout: 60s

---

### Debug Mode

**Enable Debug Mode**:
1. Settings → Advanced → Debug Mode: ON
2. Open browser console (F12)
3. Try operation again
4. Check detailed logs

**What to look for**:
- ✅ Cache HIT/MISS messages
- ⚡ Performance timings
- 🔗 Connection pool status
- ❌ Error stack traces

---

## FAQ

### General Questions

**Q: Is Peace Script AI free?**
A: The app is free. Video generation costs depend on backend:
- Local GPU: FREE
- Cloud/API: $0.02-0.50 per video

**Q: Do I need a GPU?**
A: No! You can use cloud backends. GPU only needed for free local generation.

**Q: What's the best quality?**
A: Local GPU or Cloud ComfyUI with good models. Gemini Veo is also excellent.

**Q: Can I use it offline?**
A: Yes, if using Local GPU mode. Cloud backends require internet.

**Q: Is my data private?**
A: Local GPU: 100% private. Cloud: Depends on provider (read their terms).

---

### Technical Questions

**Q: Which GPU is best?**
A: 
- Budget: RTX 3060 12GB ($300)
- Recommended: RTX 4070 ($600)
- Best: RTX 4090 ($1600)
- Mac: M1 Max/Ultra, M2 Max/Ultra

**Q: How much VRAM do I need?**
A:
- Minimum: 6 GB
- Recommended: 8-12 GB
- Ideal: 16+ GB

**Q: Can I use AMD GPU?**
A: Yes, via DirectML (Windows only), but experimental. NVIDIA recommended.

**Q: Does it work on Mac?**
A: Yes! Apple Silicon (M1/M2/M3) works great via MPS.

**Q: What models should I download?**
A:
- Essential: Stable Diffusion 1.5 (~4 GB)
- Recommended: AnimateDiff (~2 GB)
- Optional: SVD, FLUX (~7-23 GB each)

---

### Pricing Questions

**Q: How accurate is the cost calculator?**
A: Very accurate. Based on actual provider pricing. May change if providers update rates.

**Q: Are there hidden fees?**
A: No. Costs shown are complete. Cloud providers may charge separately for hosting.

**Q: Can I get a refund?**
A: Depends on API provider (Gemini, Replicate). Check their terms.

**Q: Is there a free trial?**
A: Gemini has free tier (limited). RunPod offers $10 free credit for new users.

---

## Advanced Features

### Character Consistency (Coming Soon)

**IP-Adapter V2**:
- Upload face image
- Maintains character across videos
- Works with LoRA models

### Video Extension (Beta)

**Seamless Continuation**:
- Extend existing videos
- Uses last frame as seed
- Creates smooth transitions

### Batch Processing

**Generate Multiple Videos**:
1. Prepare scene list
2. Use batch API
3. Progress tracking for each
4. Download all when done

### Custom Workflows

**Advanced Users**:
- Create custom ComfyUI workflows
- Import/export workflows
- Share with community

---

## Getting Help

### Support Channels

1. **Documentation**: Read this guide first
2. **Troubleshooting**: Check common issues above
3. **GitHub Issues**: Report bugs
4. **Discord**: Community support
5. **Email**: support@peacescript.ai

### Before Asking for Help

**Provide**:
- System info (GPU, OS, RAM)
- Backend used
- Error message (full text)
- Screenshot/video of issue
- Steps to reproduce

**Example Good Report**:
```
System: Windows 11, RTX 3060 12GB, 16GB RAM
Backend: Local ComfyUI
Error: "CUDA out of memory"
Settings: 1080p, 10 seconds, batch size 2
Steps:
1. Start ComfyUI
2. Generate video with complex prompt
3. Fails at 50% generation
Screenshot: [attached]
```

---

## Summary

### Quick Reference Card

```
┌─────────────────────────────────────────┐
│  PEACE SCRIPT AI COMFYUI CHEAT SHEET   │
├─────────────────────────────────────────┤
│ 🟢 Local GPU         FREE        ⚡⚡⚡  │
│ 🔵 Cloud ComfyUI     $0.02       ⚡⚡   │
│ 🟣 Replicate         $0.018      ⚡     │
│ 🟠 Gemini Veo        $0.50       ⚡     │
├─────────────────────────────────────────┤
│ Settings: ⚙️ → ComfyUI Settings        │
│ Status: Top right badge 🔴🟢🔵         │
│ Cost: Settings → Cost Analysis 💰      │
│ Help: F12 → Enable Debug Mode 🐛       │
└─────────────────────────────────────────┘
```

### Key Takeaways

1. ✅ System auto-detects best backend
2. ✅ Local GPU = FREE (if you have GPU)
3. ✅ Cloud options available ($0.02-0.50/video)
4. ✅ Real-time progress tracking
5. ✅ Cost calculator helps plan budget
6. ✅ Comprehensive error handling
7. ✅ Works with or without GPU

---

**Last Updated**: December 18, 2025
**Version**: 1.0
**Status**: Complete

---

Happy Creating! 🎬✨
