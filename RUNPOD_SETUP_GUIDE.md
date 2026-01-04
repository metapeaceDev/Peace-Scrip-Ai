# 🚀 RunPod GPU Setup Guide - ComfyUI Deployment

**Phase 2: Hybrid System (ComfyUI + Gemini)**

---

## 📋 Overview

ระบบนี้จะใช้:
- **ComfyUI (RunPod GPU)**: Custom LoRA, Face ID, Advanced features
- **Gemini API**: Fallback, Quick generation, Thai language
- **Smart Cascade**: เลือก model ที่เหมาะสมอัตโนมัติ

---

## 💰 Cost Estimate (Monthly)

| Component | Option | Cost |
|-----------|--------|------|
| **Backend** | Render.com Free | ฿0 |
| **Backend** | Render.com Starter | ฿250 |
| **GPU (On-Demand)** | RTX 3090 | ฿12/hr |
| **GPU (Spot)** | RTX 3090 Spot | ฿4-7/hr |
| **Storage** | 50GB Network | ฿150 |
| **Gemini Fallback** | Free tier | ฿0-150 |

**Total: ฿2,500-8,000/month** (depending on usage)

---

## 🎯 Step 1: Setup RunPod GPU

### 1.1 สมัครบัญชี RunPod

```bash
# 1. ไปที่ https://runpod.io
# 2. Sign up (ใช้ GitHub หรือ Email)
# 3. เติมเงิน $10-20 (สำหรับเริ่มต้น)
```

### 1.2 สร้าง Pod (GPU Instance)

**Option A: Secure Cloud (แนะนำสำหรับ Production)**
```
1. ไปที่ "Secure Cloud"
2. คลิก "Deploy"
3. เลือก Template: "ComfyUI"
4. GPU Type: RTX 3090 (24GB) - $0.39/hr
5. Storage: 50GB Network Volume
6. จด: Pod ID, Public IP
```

**Option B: Spot Instance (ประหยัดสุด)**
```
1. ไปที่ "Community Cloud"
2. คลิก "Deploy"
3. เลือก "Spot" pod
4. GPU Type: RTX 3090 - $0.12-0.20/hr
5. ⚠️ Warning: อาจถูก terminate ได้
```

### 1.3 Configure Pod

เมื่อ Pod รัน:

```bash
# 1. เปิด Terminal ใน RunPod
# 2. Install ComfyUI (ถ้ายังไม่มี)
cd /workspace
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# 3. Start ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

### 1.4 Download Models

```bash
cd /workspace/ComfyUI/models

# Checkpoints (Required)
cd checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# ControlNet (Optional)
cd ../controlnet
wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth

# LoRA (Your custom models)
cd ../loras
# Upload your trained LoRA models here

# Face ID Models (InstantID)
cd /workspace
git clone https://github.com/InstantID/InstantID.git
cd InstantID
pip install -r requirements.txt
```

### 1.5 Test ComfyUI

```bash
# เปิดเบราว์เซอร์
http://YOUR_POD_IP:8188

# ทดสอบ generate รูป
# ถ้าได้ → Ready!
```

---

## 🔧 Step 2: Deploy Backend to Render.com

### 2.1 สร้าง Account

```bash
# 1. ไปที่ https://render.com
# 2. Sign up with GitHub
# 3. Connect repository: metapeaceDev/Peace-Scrip-Ai
```

### 2.2 Create Web Service

```yaml
# Service Configuration
Name: peace-script-backend
Region: Singapore (ใกล้ที่สุด)
Branch: main
Root Directory: comfyui-service

# Build Command
npm install

# Start Command
npm start

# Environment: Node
# Plan: Free (750 hrs/month) หรือ Starter ($7/month)
```

### 2.3 Add Environment Variables

```env
# RunPod Configuration
COMFYUI_URL=http://YOUR_RUNPOD_IP:8188
COMFYUI_API_KEY=your-runpod-api-key

# Backend Configuration
PORT=8000
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://peace-script-ai.web.app,https://peace-script-ai.firebaseapp.com

# Queue Configuration
MAX_QUEUE_SIZE=50
PROCESSING_TIMEOUT=300000
```

### 2.4 Deploy

```bash
# 1. คลิก "Create Web Service"
# 2. รอ deploy ~5 นาที
# 3. จด URL: https://peace-script-backend.onrender.com
```

### 2.5 Test Backend

```bash
# Test health check
curl https://peace-script-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "comfyui": "connected",
  "timestamp": "2026-01-05T..."
}
```

---

## ⚙️ Step 3: Update Frontend Configuration

### 3.1 Update .env.production

```env
# =============================================================================
# 🚀 PHASE 2: Hybrid System (ComfyUI + Gemini)
# =============================================================================

# Image Generation Strategy
VITE_PREFERRED_IMAGE_MODEL=auto
# Options:
#   - auto: Smart cascade (ComfyUI → Gemini → Fallback)
#   - comfyui-sdxl: Force ComfyUI SDXL
#   - comfyui-flux: Force ComfyUI FLUX
#   - gemini-pro: Force Gemini Pro
#   - gemini-flash: Force Gemini Flash

# ComfyUI Backend (Render.com)
VITE_COMFYUI_ENABLED=true
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://peace-script-backend.onrender.com

# Gemini Fallback (Always enabled for reliability)
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# Feature Flags
VITE_ENABLE_FACE_ID=true
VITE_ENABLE_CUSTOM_LORA=true
VITE_ENABLE_ADVANCED_FEATURES=true
```

### 3.2 Rebuild & Deploy

```bash
# 1. Set environment
$env:NODE_ENV="production"

# 2. Build
npm run build

# 3. Deploy to Firebase
firebase deploy --only hosting

# 4. Wait ~2 minutes
# 5. Test: https://peace-script-ai.web.app
```

---

## 🎨 Step 4: Configure Smart Cascade

ระบบจะเลือก model อัตโนมัติตามเงื่อนไข:

```typescript
// Auto Cascade Logic (Already implemented in geminiService.ts)

1. User selects model → Use that model
2. If ComfyUI enabled:
   - Try ComfyUI first
   - If fail/timeout → Gemini Pro
3. If Gemini Pro fail → Gemini Flash
4. If all fail → Pollinations (free)

// Feature-based routing:
- Custom LoRA → ComfyUI only
- Face ID → ComfyUI (InstantID)
- Quick generation → Gemini Flash
- High quality → Gemini Pro
- Thai language → Gemini (better results)
```

---

## 🧪 Step 5: Testing

### 5.1 Test ComfyUI Path

```bash
# In frontend console (F12)
1. เลือก "ComfyUI SDXL" model
2. Generate image
3. Check logs:
   ✅ "Using ComfyUI backend"
   ✅ "Job submitted: job-xxx"
   ✅ "Image URL: ..."
```

### 5.2 Test Fallback

```bash
# Stop RunPod pod temporarily
# Then generate image
# Should see:
⚠️ "ComfyUI unavailable"
✅ "Falling back to Gemini..."
✅ Image generated successfully
```

### 5.3 Test Hybrid Flow

```typescript
// Scenario 1: Custom LoRA (ComfyUI only)
model: "comfyui-sdxl"
loraModel: "my-custom-lora"
→ Uses ComfyUI (no fallback)

// Scenario 2: Face ID (ComfyUI preferred)
enableFaceId: true
referenceImage: "data:image..."
→ Tries ComfyUI → Falls back to Gemini

// Scenario 3: Quick gen (Gemini preferred)
model: "gemini-flash"
→ Uses Gemini directly

// Scenario 4: Auto (Smart cascade)
model: "auto"
→ ComfyUI → Gemini Pro → Gemini Flash → Pollinations
```

---

## 📊 Step 6: Monitor & Optimize

### 6.1 RunPod Monitoring

```bash
# Check GPU usage
nvidia-smi

# Check logs
tail -f /workspace/ComfyUI/comfyui.log

# Check costs
# RunPod Dashboard → Billing
```

### 6.2 Backend Monitoring

```bash
# Render.com Dashboard
- Logs: Check for errors
- Metrics: Response time, memory
- Events: Deploy history

# Set up alerts:
- Response time > 10s
- Error rate > 5%
- Memory > 90%
```

### 6.3 Cost Optimization

**Strategy 1: Spot Instances**
```
- ใช้ Spot pods (ถูกกว่า 60-70%)
- ตั้ง auto-restart
- Fallback to Gemini ถ้า pod terminate
```

**Strategy 2: Auto-shutdown**
```bash
# Stop pod เมื่อไม่ใช้งาน (เช่น กลางคืน)
# Script: stop-pod-at-night.sh
```

**Strategy 3: Queue batching**
```typescript
// รวม requests เข้า batch
// Process 10 images at once
// Reduce GPU idle time
```

---

## 🔒 Security Checklist

- [ ] RunPod API key ปลอดภัย
- [ ] Backend CORS configured
- [ ] Environment variables ใน Render encrypted
- [ ] Gemini API key rotated regularly
- [ ] Rate limiting enabled
- [ ] HTTPS only (no HTTP)

---

## 🚨 Troubleshooting

### Issue 1: "ComfyUI connection timeout"

```bash
# Check:
1. RunPod pod running? (Dashboard)
2. Port 8188 exposed?
3. COMFYUI_URL correct in Render?
4. Firewall blocking?

# Fix:
- Restart pod
- Check environment variables
- Enable public IP access
```

### Issue 2: "Backend not responding"

```bash
# Check:
1. Render.com service healthy?
2. Environment variables set?
3. Logs showing errors?

# Fix:
- Restart service
- Check logs
- Verify RunPod connection
```

### Issue 3: "Images not generating"

```bash
# Check:
1. ComfyUI models downloaded?
2. Workflow valid?
3. Queue not full?

# Debug:
- Test ComfyUI directly: http://POD_IP:8188
- Check backend logs
- Verify model names
```

---

## 💡 Pro Tips

**1. Use Network Volumes**
```
- Save models ใน Network Volume
- Faster pod startup
- No need to re-download models
```

**2. Pre-warm Pods**
```
- Keep 1 pod running 24/7
- Auto-scale ตาม load
- Reduce cold start time
```

**3. Image Caching**
```typescript
// Cache generated images
// Reduce redundant generations
// Save GPU costs
```

**4. Monitor Costs Daily**
```
- Set budget alerts
- Stop unused pods
- Use Spot when possible
```

---

## 📈 Success Metrics

### Week 1:
- [ ] ComfyUI responding < 5s
- [ ] Fallback working 100%
- [ ] Cost < ฿1,000

### Month 1:
- [ ] 100+ images generated via ComfyUI
- [ ] 90%+ uptime
- [ ] Cost < ฿5,000

### Month 3:
- [ ] Custom LoRA working
- [ ] Face ID working
- [ ] Hybrid system optimized

---

## 🔗 Resources

**RunPod:**
- Dashboard: https://www.runpod.io/console
- Docs: https://docs.runpod.io
- Community: https://discord.gg/runpod

**Render.com:**
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Status: https://status.render.com

**ComfyUI:**
- GitHub: https://github.com/comfyanonymous/ComfyUI
- Wiki: https://github.com/comfyanonymous/ComfyUI/wiki
- Community: https://www.reddit.com/r/comfyui

---

**Ready to deploy! 🚀**

**Estimated Setup Time: 30-45 minutes**  
**Next File: Deploy scripts and automation**
