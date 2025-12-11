# ComfyUI Backend Deployment Guide

## 📋 Overview

เอกสารนี้แนะนำการ Deploy ComfyUI Backend สำหรับ **Peace Script AI v1.0** เพื่อให้ Tier 2 (AnimateDiff) และ Tier 3 (SVD) ทำงานได้

### Current Video Generation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  VIDEO GENERATION TIERS                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tier 1: Gemini Veo 3.1 (Primary) ✅ WORKING            │
│  ├─ Model: veo-3.1-fast-generate-preview                │
│  ├─ Resolution: 720p (1280x720)                         │
│  ├─ Duration: 30-120 seconds                            │
│  ├─ Cost: Paid (Gemini API)                             │
│  └─ Status: Deployed & Tested ✅                        │
│                                                          │
│  Tier 2: ComfyUI + AnimateDiff (Fallback) ❌ NOT DEPLOYED│
│  ├─ Model: AnimateDiff v3                               │
│  ├─ Backend: Python FastAPI + ComfyUI                   │
│  ├─ Resolution: 512x512                                 │
│  ├─ Duration: ~3 seconds (25 frames @ 8fps)             │
│  ├─ Cost: Free (requires GPU)                           │
│  └─ Status: Code ready, backend not deployed ❌         │
│                                                          │
│  Tier 3: ComfyUI + SVD (Final Fallback) ❌ NOT DEPLOYED │
│  ├─ Model: Stable Video Diffusion 1.1                   │
│  ├─ Backend: Python FastAPI + ComfyUI                   │
│  ├─ Resolution: 1024x576                                │
│  ├─ Duration: ~3 seconds (25 frames)                    │
│  ├─ Cost: Free (requires GPU)                           │
│  └─ Status: Code ready, backend not deployed ❌         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Requirements Analysis

### Frontend Requirements (Already Implemented)

**Files:**
- `src/services/geminiService.ts` - Main video generation logic with 3-tier fallback
- `src/services/comfyuiBackendClient.ts` - Client for calling ComfyUI backend API
- `src/services/comfyuiWorkflowBuilder.ts` - Workflow JSON generator for ComfyUI

**API Endpoints Expected:**
```
POST   /api/comfyui/generate   - Submit video generation job
GET    /api/comfyui/job/{id}   - Poll job status
GET    /health/detailed         - Health check
GET    /api/comfyui/workers     - Worker statistics
GET    /api/queue/stats         - Queue statistics
```

**Environment Variables (.env):**
```bash
VITE_COMFYUI_SERVICE_URL=http://localhost:8000  # Backend URL
VITE_USE_COMFYUI_BACKEND=false                   # Enable/disable backend
```

### Backend Requirements (To Be Implemented)

**Core Components:**
1. **FastAPI Server** - REST API for job queue management
2. **ComfyUI Instance** - Image/video generation engine
3. **Job Queue System** - Redis or in-memory queue
4. **Worker Processes** - Execute ComfyUI workflows
5. **Firebase Authentication** - Verify user tokens

**Models Required:**
```
ComfyUI/models/
├── checkpoints/
│   ├── sd_xl_base_1.0.safetensors        (SDXL base model)
│   └── svd_xt_1_1.safetensors            (SVD 1.1 for Tier 3)
├── animatediff_models/
│   ├── mm_sd_v15_v2.ckpt                 (AnimateDiff v2)
│   └── mm-sd-v3.safetensors              (AnimateDiff v3 for Tier 2)
├── loras/
│   └── add_detail.safetensors            (Detail enhancer LoRA)
└── controlnet/
    └── (optional for Face ID)
```

**GPU Requirements:**
- **Minimum:** NVIDIA GPU with 8GB+ VRAM (T4, RTX 3060)
- **Recommended:** NVIDIA GPU with 16GB+ VRAM (RTX 4090, A4000)
- **VRAM Usage:**
  - AnimateDiff: ~6-8GB
  - SVD: ~10-12GB

---

## ☁️ Cloud Platform Comparison

### 1. **RunPod** ⭐ RECOMMENDED

**Pros:**
- GPU-first platform with best pricing
- Pre-built ComfyUI templates available
- Flexible GPU selection (RTX 3090, RTX 4090, A4000, etc.)
- HTTP endpoints support
- Community templates for ComfyUI + AnimateDiff

**Pricing (Approx):**
```
RTX 3090 (24GB):  $0.44/hr  (~$320/month) ✅ Best Value
RTX 4090 (24GB):  $0.64/hr  (~$460/month)
A4000 (16GB):     $0.34/hr  (~$245/month)
```

**Setup Difficulty:** ⭐⭐⭐ (Medium - Template available)

**Best For:** Production deployment with 24/7 uptime

---

### 2. **Replicate**

**Pros:**
- Serverless - pay per generation
- No infrastructure management
- Official AnimateDiff and SVD models available
- Automatic scaling

**Cons:**
- Higher per-generation cost
- Less control over workflows
- May need to fork models for custom workflows

**Pricing (Approx):**
```
AnimateDiff:  $0.0055/sec  (~$0.17 for 3sec video)
SVD:          $0.0145/sec  (~$0.44 for 3sec video)
```

**Setup Difficulty:** ⭐ (Easy - API only)

**Best For:** Low-traffic/testing, simple workflows

---

### 3. **Hugging Face Spaces**

**Pros:**
- Free tier with GPU (limited hours)
- Community models readily available
- Easy deployment via Gradio/Streamlit

**Cons:**
- Free GPU limited to 48 hours/month
- Performance inconsistent (shared resources)
- Paid tier expensive ($20-30/month for basic GPU)

**Pricing:**
```
Free:           48 GPU hours/month (T4)
Paid T4:        $0.60/hr (~$432/month) ❌ Expensive
```

**Setup Difficulty:** ⭐⭐ (Easy-Medium)

**Best For:** Testing/Demo, not production

---

### 4. **Railway**

**Pros:**
- Simple deployment (like Heroku)
- Environment variable management
- Automatic HTTPS

**Cons:**
- **NO GPU SUPPORT** ❌
- Only CPU instances available

**Verdict:** ❌ **Not suitable** for ComfyUI (requires GPU)

---

### 5. **Self-Hosted (Local Machine)**

**Pros:**
- No recurring costs
- Full control
- No API rate limits

**Cons:**
- Requires powerful GPU at home
- Power consumption costs
- Downtime if machine offline
- Need public URL (ngrok/cloudflare tunnel)

**Setup Difficulty:** ⭐⭐⭐⭐ (High)

**Best For:** Development/testing only

---

## 🏆 Final Recommendation

### For Production: **RunPod (RTX 3090)**
- **Cost:** ~$320/month
- **Performance:** Excellent (24GB VRAM)
- **Uptime:** 99.9%
- **Setup:** Use RunPod ComfyUI template

### For Testing: **Hugging Face Spaces Free Tier**
- **Cost:** $0 (48 GPU hours/month)
- **Performance:** Moderate
- **Uptime:** Limited
- **Setup:** Deploy FastAPI + ComfyUI via Docker

---

## 🚀 Deployment Steps (RunPod)

### Step 1: Create RunPod Account
1. Go to https://runpod.io
2. Sign up & add payment method
3. Deposit $10+ credit

### Step 2: Deploy ComfyUI Pod

**Option A: Use Pre-built Template (EASIEST)**
```bash
# Search RunPod templates for "ComfyUI AnimateDiff"
# One-click deploy with pre-installed models
```

**Option B: Custom Deployment**
```bash
# 1. Create new GPU Pod
# 2. Select GPU: RTX 3090 (24GB)
# 3. Container Image: runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel
# 4. Volume: 100GB+ for models
# 5. Expose HTTP ports: 8000, 8188
```

### Step 3: Install ComfyUI Backend

SSH into pod and run:

```bash
# Clone ComfyUI
cd /workspace
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI

# Install dependencies
pip install -r requirements.txt
pip install fastapi uvicorn redis firebase-admin

# Download models (see next section)
```

### Step 4: Download Models

```bash
cd /workspace/ComfyUI/models

# SDXL Base Model (Required for AnimateDiff)
cd checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# AnimateDiff v3 (Tier 2)
cd ../animatediff_models
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm-sd-v3.safetensors

# SVD 1.1 (Tier 3)
cd ../checkpoints
wget https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors

# Detail Enhancer LoRA (Optional)
cd ../loras
wget https://civitai.com/api/download/models/87153 -O add_detail.safetensors
```

### Step 5: Create Backend Server

Create `/workspace/backend/main.py`:

```python
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import subprocess
import json
import uuid
import time
from typing import Optional, Dict
import firebase_admin
from firebase_admin import credentials, auth

app = FastAPI()

# Initialize Firebase Admin SDK
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)

# In-memory job queue (use Redis for production)
jobs: Dict[str, dict] = {}

class GenerateRequest(BaseModel):
    prompt: str
    workflow: dict
    referenceImage: Optional[str] = None
    priority: int = 5

@app.post("/api/comfyui/generate")
async def generate_video(
    req: GenerateRequest,
    authorization: str = Header(None)
):
    # Verify Firebase token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")
    
    # Create job
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id,
        "state": "queued",
        "progress": 0,
        "userId": user_id,
        "createdAt": time.time()
    }
    
    # Start background task (simplified - use Celery/Redis for production)
    # For now, execute ComfyUI workflow synchronously
    try:
        # Save workflow to file
        workflow_path = f"/tmp/workflow_{job_id}.json"
        with open(workflow_path, 'w') as f:
            json.dump(req.workflow, f)
        
        # Execute ComfyUI
        result = subprocess.run(
            ["python", "/workspace/ComfyUI/main.py", "--input", workflow_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            jobs[job_id]["state"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["result"] = {
                "imageData": "data:video/mp4;base64,..."  # Parse from ComfyUI output
            }
        else:
            jobs[job_id]["state"] = "failed"
            jobs[job_id]["failedReason"] = result.stderr
    
    except Exception as e:
        jobs[job_id]["state"] = "failed"
        jobs[job_id]["failedReason"] = str(e)
    
    return {"data": {"jobId": job_id}}

@app.get("/api/comfyui/job/{job_id}")
async def get_job_status(
    job_id: str,
    authorization: str = Header(None)
):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    return {"data": jobs[job_id]}

@app.get("/health/detailed")
async def health_check():
    return {
        "success": True,
        "workers": {
            "totalWorkers": 1,
            "healthyWorkers": 1
        },
        "queue": {
            "pending": len([j for j in jobs.values() if j["state"] == "queued"]),
            "running": len([j for j in jobs.values() if j["state"] == "running"])
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 6: Run Backend

```bash
cd /workspace/backend
python main.py
```

### Step 7: Expose Public URL

**In RunPod:**
1. Go to pod settings
2. Enable "Expose HTTP Ports"
3. Get public URL: `https://<pod-id>.runpod.io`

**Update `.env` in frontend:**
```bash
VITE_COMFYUI_SERVICE_URL=https://<pod-id>.runpod.io
VITE_USE_COMFYUI_BACKEND=true
```

---

## 🧪 Testing

### Test Tier 2 (AnimateDiff)

```bash
# In Peace Script AI:
# 1. Select a shot with base image
# 2. Click "Generate Video"
# 3. Select model: "ComfyUI + AnimateDiff"
# 4. Check console for:
#    "🎬 Tier 2: Trying ComfyUI + AnimateDiff..."
#    "✅ Tier 2 Success: ComfyUI + AnimateDiff"
```

### Test Tier 3 (SVD)

```bash
# 1. Click "Generate Video"
# 2. Select model: "ComfyUI + SVD"
# 3. Check console for:
#    "🎬 Tier 2: Trying ComfyUI + SVD..."
#    "✅ Tier 2 Success: ComfyUI + SVD"
```

### Test Full Fallback Chain

```bash
# 1. Temporarily break Veo API (wrong API key)
# 2. Click "Generate Video" with model="auto"
# 3. Should see:
#    "🎬 Tier 1: Trying Gemini Veo 3.1..."
#    "❌ Tier 1 (Veo) failed: ..."
#    "🎬 Tier 2: Trying ComfyUI + AnimateDiff..."
#    "✅ Tier 2 Success: ComfyUI + AnimateDiff"
```

---

## 📊 Cost Estimation

### RunPod (RTX 3090) - 24/7

```
Monthly Cost: $320
- Video generations: Unlimited (free, just GPU time)
- Concurrent users: ~10-20
- Average generation time: 30-60 seconds
- Throughput: ~60-120 videos/hour
```

### Replicate (Pay-per-use)

```
Assumptions:
- 1000 generations/month
- 3 seconds/video
- $0.0055/sec for AnimateDiff

Monthly Cost: $16.50 (for 1000 videos)

Break-even point: ~1700 videos/month
(After 1700 videos, RunPod becomes cheaper)
```

**Recommendation:**
- **< 1700 videos/month** → Use Replicate ✅
- **> 1700 videos/month** → Use RunPod ✅

---

## 🔐 Security Checklist

- [ ] Enable Firebase Authentication verification
- [ ] Set up CORS properly (only allow frontend domain)
- [ ] Use HTTPS for all endpoints
- [ ] Add rate limiting (e.g., max 10 jobs per user)
- [ ] Store Firebase service account key securely
- [ ] Monitor GPU usage & costs
- [ ] Set up automatic pod shutdown if idle > 1 hour

---

## 📝 Next Steps

1. **Choose Platform:** RunPod or Replicate based on expected usage
2. **Deploy Backend:** Follow steps above
3. **Update Environment Variables:** Point frontend to backend URL
4. **Test Thoroughly:** Verify all 3 tiers work
5. **Monitor Costs:** Set up billing alerts
6. **Optimize Performance:** Adjust frame count, resolution based on results

---

## 🆘 Troubleshooting

### "ComfyUI Backend timeout"
- Check if pod is running
- Verify public URL is correct
- Check firewall/port settings

### "Job failed: CUDA out of memory"
- Reduce frame count (25 → 16)
- Use smaller resolution (512x512 → 256x256)
- Upgrade to larger GPU

### "Model not found"
- Verify model files exist in `/workspace/ComfyUI/models/`
- Check file names match exactly (case-sensitive)
- Re-download models if corrupted

---

**Status:** Ready for deployment 🚀
**Estimated Setup Time:** 2-4 hours
**Estimated Monthly Cost:** $16-320 depending on platform
