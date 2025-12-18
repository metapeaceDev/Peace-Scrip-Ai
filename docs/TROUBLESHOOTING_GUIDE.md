# Peace Script AI - Troubleshooting Guide

**Comprehensive Solutions for Common Issues**

---

## 📚 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [ComfyUI Issues](#comfyui-issues)
3. [GPU & Device Issues](#gpu--device-issues)
4. [Performance Issues](#performance-issues)
5. [API & Network Issues](#api--network-issues)
6. [Firebase & Deployment Issues](#firebase--deployment-issues)
7. [Build & Development Issues](#build--development-issues)
8. [Error Messages Reference](#error-messages-reference)
9. [Debug Tools](#debug-tools)
10. [Getting Additional Help](#getting-additional-help)

---

## Quick Diagnostics

### Health Check Checklist

Run through this before diving into specific issues:

```
✅ ComfyUI running? http://localhost:8188
✅ GPU detected? Check Settings → ComfyUI → Overview
✅ Internet connection? ping google.com
✅ Browser console errors? Press F12
✅ Latest code? git pull origin main
✅ Dependencies updated? npm install
✅ Environment variables set? Check .env file
```

### Enable Debug Mode

1. Go to Settings → ComfyUI → Advanced
2. Enable "Debug Mode"
3. Open browser console (F12)
4. Reproduce the issue
5. Copy console output for support

---

## ComfyUI Issues

### ❌ "ComfyUI is not running"

**Symptoms**:
- Red badge in top right
- Error: "Connection refused"
- Can't generate videos
- Settings show "Disconnected"

#### Solution 1: Start ComfyUI

```bash
cd ComfyUI

# Windows
python main.py

# Mac/Linux
python3 main.py

# With GPU optimization
python main.py --force-fp16
python main.py --lowvram  # For <8GB VRAM
```

**Expected Output**:
```
Total VRAM 12288 MB, total RAM 32768 MB
Set vram state to: NORMAL_VRAM
Device: cuda

Starting server on localhost:8188
To see the GUI go to: http://127.0.0.1:8188
```

**Verify**:
- Open http://localhost:8188 in browser
- Should see ComfyUI interface
- Peace Script AI badge should turn green

---

#### Solution 2: Check Port Availability

```bash
# Check if port 8188 is in use
# Mac/Linux
lsof -i :8188

# Windows
netstat -ano | findstr :8188
```

**If port is occupied**:
```bash
# Kill the process
# Mac/Linux
kill -9 <PID>

# Windows
taskkill /PID <PID> /F

# Or use different port
python main.py --port 8189
# Then update Settings → Backend → URL to http://localhost:8189
```

---

#### Solution 3: Check Firewall

**Windows**:
1. Windows Defender Firewall → Allow an app
2. Find Python → Allow both Private and Public
3. Restart ComfyUI

**Mac**:
1. System Preferences → Security & Privacy → Firewall
2. Firewall Options
3. Add Python → Allow incoming connections

**Linux**:
```bash
sudo ufw allow 8188/tcp
sudo ufw reload
```

---

#### Solution 4: Verify Installation

```bash
cd ComfyUI

# Check Python version
python --version  # Should be 3.10 or 3.11

# Check dependencies
pip list | grep torch
pip list | grep comfy

# Reinstall if needed
pip install -r requirements.txt --force-reinstall
```

---

### ❌ "ComfyUI Error: Missing Models"

**Symptoms**:
- Error: "Checkpoint not found"
- Error: "No models available"
- Generation fails immediately

#### Solution 1: Download Required Models

```bash
cd ComfyUI/models/checkpoints

# Stable Diffusion 1.5 (essential)
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt

# Or use aria2c (faster)
aria2c -x 16 https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt
```

#### Solution 2: Verify Model Placement

Models must be in correct directories:

```
ComfyUI/
├── models/
│   ├── checkpoints/          # Base models
│   │   └── v1-5-pruned-emaonly.ckpt
│   ├── animatediff/          # Animation models
│   │   └── mm_sd_v15_v2.ckpt
│   ├── vae/                  # VAE models
│   ├── loras/                # LoRA models
│   ├── controlnet/           # ControlNet
│   └── upscale_models/       # Upscalers
```

**Check placement**:
```bash
ls -lh ComfyUI/models/checkpoints/
# Should show .ckpt or .safetensors files
```

---

### ❌ "Workflow Failed to Execute"

**Symptoms**:
- Generation starts but fails at specific step
- Error in ComfyUI console
- Peace Script AI shows "Generation Failed"

#### Solution 1: Check ComfyUI Console

Look for specific errors:

**Missing Node**:
```
Error: Unknown node type 'KSampler'
```
→ Install missing custom nodes or update ComfyUI

**VRAM Overflow**:
```
RuntimeError: CUDA out of memory
```
→ See [Out of VRAM](#-out-of-vram--gpu-memory-error) section

**Model Loading Error**:
```
Error loading checkpoint
```
→ Model file corrupted, re-download

---

#### Solution 2: Simplify Workflow

Test with minimal workflow:

```bash
# In ComfyUI interface
1. Load Default workflow
2. Click Queue Prompt
3. If works → Issue is in Peace Script workflow
4. If fails → ComfyUI installation issue
```

---

#### Solution 3: Clear ComfyUI Cache

```bash
# Delete temp files
rm -rf ComfyUI/temp/*
rm -rf ComfyUI/output/*

# Clear input cache
rm -rf ComfyUI/input/*
```

---

### ❌ "Queue is Stuck"

**Symptoms**:
- Generation at 0% indefinitely
- Other requests not processing
- ComfyUI shows busy but not generating

#### Solution:

```bash
# Stop ComfyUI
Ctrl+C

# Clear queue
rm -rf ComfyUI/queue/*

# Restart
python main.py
```

---

## GPU & Device Issues

### ❌ "No GPU Detected" (but you have one)

**Symptoms**:
- Settings show "Device: CPU"
- Have NVIDIA/AMD/Apple GPU
- Slow generation

#### For NVIDIA GPUs

**Solution 1: Install CUDA Toolkit**

```bash
# Check current CUDA version
nvidia-smi

# Should show CUDA Version (e.g., 12.1)
# If not, install from: https://developer.nvidia.com/cuda-downloads
```

**Solution 2: Install PyTorch with CUDA**

```bash
cd ComfyUI

# Uninstall CPU-only PyTorch
pip uninstall torch torchvision torchaudio

# Install CUDA version
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify
python -c "import torch; print(torch.cuda.is_available())"
# Should print: True
```

**Solution 3: Update GPU Drivers**

1. Download from https://www.nvidia.com/Download/index.aspx
2. Install latest drivers
3. Reboot computer
4. Verify with `nvidia-smi`

---

#### For AMD GPUs (DirectML)

```bash
cd ComfyUI

# Install DirectML version
pip install torch-directml

# Verify
python -c "import torch_directml; print(torch_directml.is_available())"
# Should print: True
```

---

#### For Apple Silicon (M1/M2/M3)

**Solution 1: Verify MPS**

```bash
python -c "import torch; print(torch.backends.mps.is_available())"
# Should print: True
```

**Solution 2: Install ARM64 PyTorch**

```bash
# Use Miniforge (not Anaconda)
brew install miniforge
conda init zsh

# Create environment
conda create -n comfyui python=3.10
conda activate comfyui

# Install PyTorch for Apple Silicon
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cpu

cd ComfyUI
pip install -r requirements.txt
```

---

### ❌ Out of VRAM / GPU Memory Error

**Symptoms**:
- `RuntimeError: CUDA out of memory`
- Generation fails partway through
- Black or corrupted output

#### Quick Fixes

**1. Enable Low VRAM Mode**
```bash
python main.py --lowvram
```

**2. Use FP16 Precision**
```bash
python main.py --force-fp16
```

**3. Combine Flags**
```bash
python main.py --lowvram --force-fp16
```

---

#### Settings Adjustments

1. **Peace Script AI Settings**:
   - Settings → Backend → Low VRAM Mode: ON
   - Reduce resolution (1080p → 720p → 480p)
   - Reduce batch size (2 → 1)
   - Shorter video duration

2. **Close Other Apps**:
   - Chrome/browsers (use 1-2 GB VRAM)
   - Discord with hardware acceleration
   - OBS, Streamlabs
   - Other GPU apps

3. **Monitor VRAM**:
   ```bash
   # Real-time monitoring
   watch -n 1 nvidia-smi
   ```

---

#### VRAM Requirements

| Resolution | Min VRAM | Recommended |
|------------|----------|-------------|
| 480p | 4 GB | 6 GB |
| 720p | 6 GB | 8 GB |
| 1080p | 8 GB | 12 GB |
| 4K | 16 GB | 24 GB |

---

### ❌ "GPU Not Supported"

**Symptoms**:
- Error: "Your GPU is not supported"
- Very old GPU (GTX 900 series or older)

#### Solutions:

**Option 1: Use CPU Mode** (slow)
```bash
python main.py --cpu
```

**Option 2: Use Cloud Backend**
- Switch to Cloud ComfyUI, Replicate, or Gemini
- No local GPU needed
- Small cost per video

**Option 3: Upgrade GPU**
- Minimum: GTX 1060 6GB or RTX 2060
- Recommended: RTX 3060 12GB or better

---

## Performance Issues

### ⚠️ Slow Generation Speed

**Symptoms**:
- Takes 10+ minutes per video
- Expected 1-2 minutes
- CPU usage high, GPU idle

#### Diagnosis

**Check Device**:
```bash
# In Python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
```

**Expected**:
```
CUDA available: True
Device: NVIDIA GeForce RTX 3060
```

**If using CPU → Fix GPU detection** (see above section)

---

#### Optimizations

**1. Model Loading (First Generation Slow)**
- First generation: 5-10 minutes (loading models into VRAM)
- Subsequent: 1-2 minutes (models cached)
- **Normal behavior**, be patient on first run

**2. Disable Preview Mode**
```bash
python main.py --disable-preview
```

**3. Use Faster Sampler**
In ComfyUI workflow, change:
- Sampler: `euler` → `dpm_2` or `dpm_fast`
- Steps: 20 → 15

**4. Reduce Quality Temporarily**
- Resolution: 1080p → 720p
- Frames: 60 → 30
- Duration: 10s → 5s

**5. Check Background Processes**
```bash
# Windows
taskmgr

# Mac
Activity Monitor

# Linux
htop
```
Close unnecessary apps using GPU/CPU

---

#### Expected Generation Times

| GPU | 480p | 720p | 1080p |
|-----|------|------|-------|
| RTX 4090 | 20s | 30s | 60s |
| RTX 4070 | 30s | 45s | 90s |
| RTX 3060 | 60s | 120s | 240s |
| Apple M1 Max | 90s | 180s | 360s |
| CPU (not recommended) | 20min | 40min | 80min |

---

### ⚠️ High CPU/Memory Usage

**Symptoms**:
- Computer slow/laggy
- 90%+ CPU usage
- Running out of RAM

#### Solutions:

**1. Close Browser Tabs**
- Each tab uses 100-500 MB RAM
- Close unused tabs
- Use browser task manager (Shift+Esc in Chrome)

**2. Reduce Batch Processing**
- Generate one video at a time
- Don't queue multiple

**3. Increase Swap/Page File** (Windows)
1. System Properties → Advanced → Performance Settings
2. Virtual Memory → Change
3. Set to 1.5x your RAM (e.g., 16 GB RAM = 24 GB page file)

**4. Monitor Resources**
```bash
# Enable performance monitoring in Peace Script AI
Settings → Advanced → Debug Mode: ON

# Check browser console for memory usage
```

---

### ⚠️ Slow Page Load

**Symptoms**:
- Peace Script AI takes 10+ seconds to load
- White screen on initial load

#### Solutions:

**1. Clear Browser Cache**
```
Chrome: Ctrl+Shift+Delete → Cached images and files
Firefox: Ctrl+Shift+Delete → Cache
Safari: Preferences → Privacy → Manage Website Data → Remove All
```

**2. Disable Extensions**
- Ad blockers can slow down apps
- Try incognito/private mode

**3. Check Bundle Size** (Developers)
```bash
npm run build
# Check dist/assets/ sizes
# Should be <500 KB per chunk
```

**4. Use Production Build**
```bash
# Development is slower
npm run dev

# Production is faster
npm run build
npm run preview
```

---

## API & Network Issues

### ❌ "Network Error" / "Failed to Fetch"

**Symptoms**:
- Error: "Failed to fetch"
- Error: "Network request failed"
- Intermittent connection issues

#### Solution 1: Check Internet Connection

```bash
ping google.com

# If fails
ping 8.8.8.8  # Google DNS
# If works → DNS issue
# If fails → No internet
```

**Fix DNS** (if needed):
```
Windows: Network Settings → Change adapter options → Properties → IPv4 → DNS: 8.8.8.8, 8.8.4.4
Mac: System Preferences → Network → Advanced → DNS → Add 8.8.8.8
Linux: Edit /etc/resolv.conf → nameserver 8.8.8.8
```

---

#### Solution 2: Check Firewall/VPN

**Disable temporarily to test**:
- Firewall: Windows Defender, third-party
- VPN: NordVPN, ExpressVPN, etc.
- Proxy: Corporate proxies
- Antivirus: Kaspersky, Norton, McAfee

**If works when disabled**:
- Add exception for Peace Script AI domains
- Allow `localhost:8188` (ComfyUI)
- Allow `*.google.com` (Gemini API)
- Allow `*.replicate.com`

---

#### Solution 3: CORS Issues

**Symptoms**:
- Browser console: "CORS policy blocked"
- Only affects certain API calls

**For ComfyUI**:
```bash
# Run with CORS enabled
python main.py --enable-cors-header
```

**For Firebase**:
Check `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

---

### ❌ "API Key Invalid" (Gemini/Replicate)

**Symptoms**:
- Error: "Invalid API key"
- Error: "Unauthorized"
- 401/403 errors

#### For Gemini API

**1. Get Valid Key**:
- Go to https://makersuite.google.com/app/apikey
- Create new API key
- Copy key

**2. Add to Environment**:
```bash
# Create .env file in project root
echo "VITE_GEMINI_API_KEY=your_key_here" >> .env

# Or set in Firebase
firebase functions:config:set gemini.api_key="your_key_here"
firebase deploy --only functions
```

**3. Verify**:
```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
# Should return list of models
```

**4. Check Quota**:
- Free tier: 60 requests/minute
- View usage: https://console.cloud.google.com/apis/dashboard

---

#### For Replicate API

**1. Get API Token**:
- Go to https://replicate.com/account/api-tokens
- Create token
- Copy token

**2. Add to Environment**:
```bash
echo "VITE_REPLICATE_API_TOKEN=your_token_here" >> .env
```

---

### ❌ "Rate Limit Exceeded"

**Symptoms**:
- Error: "429 Too Many Requests"
- Error: "Quota exceeded"

#### Solutions:

**1. Wait and Retry**
- Gemini free tier: 60/minute, wait 60 seconds
- Replicate: Variable, check response headers
- Implement exponential backoff (already done in errorHandler)

**2. Upgrade API Plan**
- Gemini: Enable billing for higher limits
- Replicate: Add payment method

**3. Use Different Backend**
- Switch to Local ComfyUI (no limits)
- Switch to Cloud ComfyUI (your own limits)

---

### ❌ Connection Timeout

**Symptoms**:
- Error: "Request timeout"
- Takes 60+ seconds then fails

#### Solutions:

**1. Increase Timeout**:
```typescript
// In settings or code
const timeout = 120000; // 2 minutes
```

**2. Check Backend Health**:
```bash
# ComfyUI
curl http://localhost:8188/system_stats

# Cloud ComfyUI
curl https://your-cloud-url.com/system_stats

# Should respond in <5 seconds
```

**3. Restart Backend**:
```bash
# ComfyUI
Ctrl+C
python main.py

# Cloud: Restart pod/instance
```

---

## Firebase & Deployment Issues

### ❌ "Firebase Deploy Failed"

**Symptoms**:
- Error during `firebase deploy`
- "Authentication error"
- "Permission denied"

#### Solution 1: Re-login

```bash
firebase logout
firebase login
firebase use --add  # Select project
firebase deploy
```

---

#### Solution 2: Check Firebase Project

```bash
# List projects
firebase projects:list

# Use correct project
firebase use peace-script-ai

# Verify
firebase projects:list
# Should show (current) next to peace-script-ai
```

---

#### Solution 3: Check Billing

- Firebase Hosting requires Blaze plan for custom domains
- Free Spark plan OK for *.web.app domains
- Check: https://console.firebase.google.com/project/peace-script-ai/settings/billing

---

#### Solution 4: Build Before Deploy

```bash
# Always build first
npm run build

# Verify dist/ folder exists
ls dist/

# Then deploy
firebase deploy --only hosting
```

---

### ❌ "Build Failed"

**Symptoms**:
- `npm run build` errors
- TypeScript errors
- Module not found

#### Solution 1: Clear Cache & Reinstall

```bash
# Delete node_modules and caches
rm -rf node_modules package-lock.json dist .vite

# Reinstall
npm install

# Rebuild
npm run build
```

---

#### Solution 2: Fix TypeScript Errors

```bash
# Check for errors
npm run build 2>&1 | tee build-errors.log

# Common fixes:
# 1. Missing types
npm install --save-dev @types/node @types/react

# 2. Update dependencies
npm update

# 3. Check tsconfig.json
cat tsconfig.json  # Should have "skipLibCheck": true
```

---

#### Solution 3: Node Version

```bash
# Check version
node --version

# Should be 18.x or 20.x
# If not, install via nvm:

# Mac/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Windows
# Download from nodejs.org
```

---

### ❌ Deployed Site Shows Old Version

**Symptoms**:
- Deployed but still seeing old code
- Changes not appearing
- Cached version

#### Solution 1: Hard Refresh

```
Chrome: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
Firefox: Ctrl+F5 / Cmd+Shift+R
Safari: Cmd+Option+R
```

---

#### Solution 2: Clear Browser Cache

```
Chrome: Ctrl+Shift+Delete → All time → Cached images
Firefox: Ctrl+Shift+Delete → Everything → Cache
Safari: Preferences → Privacy → Manage Website Data
```

---

#### Solution 3: Check Deploy Success

```bash
firebase deploy --only hosting

# Should show:
# ✔ hosting[peace-script-ai]: file upload complete
# ✔ Deploy complete!
# Hosting URL: https://peace-script-ai.web.app
```

---

#### Solution 4: Verify Files

```bash
# Check dist/ matches deployed
ls -la dist/assets/

# Check Firebase console
# https://console.firebase.google.com/project/peace-script-ai/hosting/main
# Should show latest deploy timestamp
```

---

## Build & Development Issues

### ❌ "npm install" Fails

**Symptoms**:
- Errors during `npm install`
- "ERESOLVE unable to resolve dependency tree"
- "Permission denied"

#### Solution 1: Use --legacy-peer-deps

```bash
npm install --legacy-peer-deps
```

---

#### Solution 2: Clear npm Cache

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

#### Solution 3: Permission Issues (Mac/Linux)

```bash
# Don't use sudo! Fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Then retry
npm install
```

---

#### Solution 4: Network Issues

```bash
# Use different registry
npm config set registry https://registry.npmjs.org/
npm install

# Or use Yarn instead
npm install -g yarn
yarn install
```

---

### ❌ "Port Already in Use"

**Symptoms**:
- Error: "Port 5173 already in use"
- `npm run dev` fails

#### Solution:

```bash
# Find process using port
# Mac/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 3000
```

---

### ❌ Hot Reload Not Working

**Symptoms**:
- Make code changes
- Browser doesn't update
- Must manually refresh

#### Solution 1: Check Vite Config

`vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    watch: {
      usePolling: true,  // For some systems
    },
  },
});
```

---

#### Solution 2: Browser Extension Conflict

- Disable ad blockers
- Disable React DevTools temporarily
- Try incognito mode

---

#### Solution 3: File Watcher Limits (Linux)

```bash
# Increase limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Error Messages Reference

### ComfyUI Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Connection refused` | ComfyUI not running | Start ComfyUI |
| `CUDA out of memory` | Not enough VRAM | Lower settings, use --lowvram |
| `Checkpoint not found` | Missing model | Download required models |
| `Unknown node type` | Missing custom node | Install custom nodes |
| `Queue is full` | Too many requests | Wait or clear queue |

---

### API Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 429 | Rate limit | Wait and retry |
| 500 | Server error | Backend issue, retry later |
| 503 | Service unavailable | Backend down, use different |

---

### Network Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Failed to fetch` | Network issue | Check internet |
| `CORS blocked` | Cross-origin issue | Enable CORS in backend |
| `Timeout` | Request too slow | Increase timeout |
| `DNS_PROBE_FINISHED_NXDOMAIN` | Domain not found | Check URL |

---

## Debug Tools

### Browser Console

**Access**: Press `F12` or `Cmd+Option+I` (Mac)

**Useful Commands**:
```javascript
// Check cache stats
requestCache.getStats()

// Check connection pool
getPoolStats()

// Performance summary
PerformanceMonitor.getSummary()

// Clear cache
requestCache.clear()
localStorage.clear()

// Check device detection
detectSystemResources()
```

---

### Network Tab

**Use for**:
- API call inspection
- Response times
- Error responses
- Request/response headers

**Filter by**:
- XHR: API calls
- WS: WebSocket (ComfyUI)
- Img: Image loading
- JS: Script loading

---

### Performance Tab

**Measures**:
- Page load time
- JavaScript execution
- Rendering performance
- Memory usage

**Record**:
1. Open Performance tab
2. Click Record
3. Perform action (e.g., generate video)
4. Click Stop
5. Analyze timeline

---

### React DevTools

**Install**: Chrome Web Store → React Developer Tools

**Features**:
- Component tree inspection
- Props/state viewer
- Hooks debugger
- Performance profiler

---

### Firebase Debug

```bash
# Local emulator
firebase emulators:start

# Check functions logs
firebase functions:log

# Check hosting
firebase hosting:channel:list
```

---

## Getting Additional Help

### Before Asking for Help

**Gather Information**:

```
1. System Info:
   - OS: Windows 11 / macOS 13 / Ubuntu 22.04
   - CPU: AMD Ryzen 9 5900X
   - GPU: NVIDIA RTX 3060 12GB
   - RAM: 32 GB
   - Browser: Chrome 120

2. Software Versions:
   - Python: 3.10.11
   - Node: 20.10.0
   - npm: 10.2.3
   - ComfyUI: latest main branch

3. Error Details:
   - Exact error message (full text)
   - Screenshot or video
   - Browser console output
   - ComfyUI terminal output

4. Steps to Reproduce:
   1. Start ComfyUI
   2. Open Peace Script AI
   3. Click "Generate Video"
   4. Enter prompt: "..."
   5. Error appears at 50% generation

5. What You've Tried:
   - Restarted ComfyUI
   - Cleared cache
   - Tried different browser
   - etc.
```

---

### Support Channels

**1. GitHub Issues** (Bugs & Feature Requests)
- https://github.com/your-repo/issues
- Search existing issues first
- Use issue template
- Provide all info above

**2. Discord Community** (General Help)
- https://discord.gg/your-server
- #support channel
- Real-time assistance
- Community troubleshooting

**3. Email Support** (Direct Help)
- support@peacescript.ai
- Response time: 24-48 hours
- Include system info & screenshots

**4. Documentation** (Self-Help)
- Read User Guide first
- Check API Documentation
- Search this Troubleshooting Guide

---

### Known Issues & Workarounds

| Issue | Workaround | Status |
|-------|-----------|--------|
| Cloudflare URL caching | Clear localStorage | Investigating |
| Git push blocked (old secret) | Local commits only | Fix planned |
| DirectML slow on AMD | Use Cloud backend | Upstream issue |
| Safari WebGL issues | Use Chrome/Firefox | Safari limitation |

---

### Reporting Bugs

**Good Bug Report Template**:

```markdown
**Bug Description**
Clear, concise description of the bug.

**System Information**
- OS: Windows 11
- GPU: RTX 3060 12GB
- Browser: Chrome 120
- ComfyUI: v0.0.1 (commit abc123)

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Enter '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Console Output**
```
Paste browser console output here
```

**ComfyUI Terminal Output**
```
Paste ComfyUI terminal output here
```

**Additional Context**
Any other relevant information.
```

---

## Summary Checklist

**Quick Fix Checklist**:

```
□ ComfyUI running? → python main.py
□ GPU detected? → nvidia-smi / python -c "import torch; print(torch.cuda.is_available())"
□ Models downloaded? → ls ComfyUI/models/checkpoints/
□ Port 8188 available? → lsof -i :8188
□ Firewall allows? → Check Windows Defender / System Preferences
□ Latest code? → git pull origin main
□ Dependencies updated? → npm install
□ Cache cleared? → Ctrl+Shift+Delete
□ Environment variables set? → cat .env
□ Debug mode enabled? → Settings → Advanced → Debug Mode
```

**Still Having Issues?**
1. Enable Debug Mode
2. Check browser console (F12)
3. Copy error messages
4. Join Discord or create GitHub issue
5. Provide all system information

---

**Last Updated**: December 18, 2025
**Version**: 1.0
**Status**: Complete

---

Good luck! 🚀
