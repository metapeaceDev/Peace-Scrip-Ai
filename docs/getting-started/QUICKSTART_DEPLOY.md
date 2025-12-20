# Quick Start Guide - ComfyUI Backend Deployment

สำหรับคนที่อยากเริ่มทันที โดยไม่ต้องอ่านเอกสารยาว ๆ

## 🎯 เลือก Platform

### Option 1: RunPod (แนะนำสำหรับ Production) 💰 ~$320/เดือน

**ข้อดี:** GPU ดี, ราคาถูกที่สุดถ้าใช้บ่อย, Uptime สูง  
**ข้อเสีย:** ต้องจ่ายทุกเดือน แม้ไม่ได้ใช้

```bash
1. สมัคร RunPod: https://runpod.io
2. เลือก GPU: RTX 3090 (24GB) - $0.44/hr
3. Deploy: ใช้ template "ComfyUI" (one-click)
4. รอ 5-10 นาที
5. ได้ URL: https://xxx-yyy.runpod.io
```

### Option 2: Replicate (แนะนำสำหรับเริ่มต้น) 💰 ~$0.17/วิดีโอ

**ข้อดี:** จ่ายตามใช้, ไม่ต้อง deploy เอง, เริ่มได้ทันที  
**ข้อเสีย:** แพงถ้าใช้มาก (>1700 วิดีโอ/เดือน)

```bash
1. สมัคร Replicate: https://replicate.com
2. Get API Key
3. ไม่ต้อง deploy อะไร!
4. แก้ code ให้เรียก Replicate API แทน ComfyUI
```

### Option 3: Hugging Face Spaces (ทดสอบฟรี) 💰 ฟรี 48 ชม./เดือน

**ข้อดี:** ฟรี!, ง่าย  
**ข้อเสีย:** จำกัด 48 ชั่วโมง GPU/เดือน, ช้า

```bash
1. สมัคร HF: https://huggingface.co
2. Create new Space
3. Upload comfyui-backend/ files
4. Enable GPU (T4)
5. รอ build ~15-20 นาที
```

---

## 🚀 Quick Deploy - RunPod (5 Minutes)

### 1. Create Pod (2 min)

```bash
# Go to RunPod Dashboard
# Click "Deploy" → "Templates" → Search "ComfyUI"
# Select: "ComfyUI Official Template"
# GPU: RTX 3090
# Storage: 100GB
# Click "Deploy"
```

### 2. SSH into Pod (1 min)

```bash
# Copy SSH command from RunPod dashboard
ssh root@xxx.runpod.io -p 12345

# Verify ComfyUI installed
ls /workspace/ComfyUI
```

### 3. Download Models (30 min - runs in background)

```bash
# Copy our download script
curl -O https://raw.githubusercontent.com/[your-repo]/download-models.sh
chmod +x download-models.sh

# Run download (will take ~30 minutes)
./download-models.sh

# Or download manually:
cd /workspace/ComfyUI/models/checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

cd ../animatediff_models
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm-sd-v3.safetensors
```

### 4. Install Backend (1 min)

```bash
# Upload our backend files via SCP or git
cd /workspace
git clone [your-repo]/comfyui-backend
cd comfyui-backend

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure & Run (1 min)

```bash
# Edit .env
cp .env.example .env
nano .env  # Set COMFYUI_PATH=/workspace/ComfyUI

# Run server
python main.py

# Should see:
# 🚀 ComfyUI Backend API starting...
# ✅ ComfyUI found at /workspace/ComfyUI
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### 6. Expose Public URL

```bash
# In RunPod dashboard:
# - Click your pod
# - "TCP Public IP" → Enable
# - Copy URL: https://xxx-8000.proxy.runpod.net
```

### 7. Update Frontend

```bash
# In Peace Script AI project:
# Edit .env
VITE_COMFYUI_SERVICE_URL=https://xxx-8000.proxy.runpod.net
VITE_USE_COMFYUI_BACKEND=true

# Rebuild & deploy
npm run build
firebase deploy
```

### 8. Test! 🎉

```bash
# In Peace Script AI:
# 1. Select a shot
# 2. Click "Generate Video"
# 3. Select "ComfyUI + AnimateDiff"
# 4. Check console:
#    🎬 Tier 2: Trying ComfyUI + AnimateDiff...
#    ✅ Tier 2 Success!
```

---

## 🧪 Alternative: Test Locally First (Mac/Windows with GPU)

### 1. Install ComfyUI

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Download models (run our script)
cd ..
./comfyui-backend/download-models.sh
```

### 2. Run ComfyUI

```bash
cd ComfyUI
python main.py

# Should open: http://localhost:8188
```

### 3. Run Backend

```bash
cd ../comfyui-backend
cp .env.example .env
# Edit: COMFYUI_PATH=../ComfyUI
python main.py

# Backend at: http://localhost:8000
```

### 4. Test Frontend

```bash
# Edit .env
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=true

# Run dev server
npm run dev

# Test video generation!
```

---

## 🔥 Fastest Way (Replicate - No Deploy)

### 1. Get Replicate API Key

```bash
# Go to: https://replicate.com/account/api-tokens
# Copy token
```

### 2. Install Replicate Client

```bash
npm install replicate
```

### 3. Create Wrapper Function

```typescript
// src/services/replicateVideoService.ts
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_KEY,
});

export async function generateVideoWithReplicate(
  prompt: string,
  baseImage: string
): Promise<string> {
  const output = await replicate.run(
    'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    {
      input: {
        input_image: baseImage,
        cond_aug: 0.02,
        decoding_t: 14,
        video_length: '14_frames_with_svd',
        sizing_strategy: 'maintain_aspect_ratio',
        motion_bucket_id: 127,
        frames_per_second: 6,
      },
    }
  );

  return output as string;
}
```

### 4. Update geminiService.ts

```typescript
// Add to Tier 2/3 fallback
import { generateVideoWithReplicate } from './replicateVideoService';

// In generateVideo function:
if (preferredModel === 'auto') {
  try {
    // Tier 1: Veo (already working)
    ...
  } catch {
    // Tier 2: Replicate SVD
    console.log('🎬 Tier 2: Trying Replicate SVD...');
    const result = await generateVideoWithReplicate(enhancedPrompt, base64Image);
    return result;
  }
}
```

### 5. Add to .env

```bash
VITE_REPLICATE_API_KEY=r8_xxxxxxxxxxxx
```

### 6. Done! No backend needed! 🎉

---

## 📊 Cost Comparison

| Platform            | Setup Time | Monthly Cost     | Best For                     |
| ------------------- | ---------- | ---------------- | ---------------------------- |
| **RunPod RTX 3090** | 30 min     | $320             | Production (>1700 videos/mo) |
| **Replicate**       | 5 min      | $16/1000 videos  | Low volume, testing          |
| **HF Spaces Free**  | 20 min     | $0 (limited)     | Demo only                    |
| **Local GPU**       | 1 hour     | $0 (electricity) | Development                  |

---

## ⏱️ Time to First Video

- **Replicate:** 5 minutes ✅ FASTEST
- **RunPod Template:** 35 minutes (30 min models + 5 min setup)
- **Local:** 1-2 hours (download models + setup)
- **HF Spaces:** 40 minutes (build + models)

---

## 🎯 Recommendation by Use Case

### "ฉันต้องการทดสอบตอนนี้เลย!"

→ **Replicate** (5 นาที, จ่ายตามใช้)

### "ฉันจะทำ Production จริง ๆ"

→ **RunPod** (30 นาที, $320/เดือน)

### "ฉันอยากลองฟรีก่อน"

→ **Hugging Face Spaces** (20 นาที, ฟรี 48 ชม.)

### "ฉันมี GPU แรง ๆ อยู่แล้ว"

→ **Local** (1 ชั่วโมง, ฟรี)

---

## 🆘 Need Help?

1. **Replicate not working?** → Check API key in .env
2. **RunPod can't connect?** → Verify public URL enabled
3. **Models not downloading?** → Check disk space (need 20GB+)
4. **Video quality bad?** → Try different model or increase steps

---

**สรุป:** ถ้าอยากเริ่มเร็วที่สุด → ใช้ **Replicate** (5 นาที!)  
ถ้าอยากประหยัดในระยะยาว → ใช้ **RunPod** (30 นาที)
