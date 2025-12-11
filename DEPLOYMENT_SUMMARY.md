# ComfyUI Backend Deployment Summary

**Date:** December 11, 2024  
**Status:** Ready for Deployment ✅  
**Project:** Peace Script AI v1.0

---

## 📊 What Was Done

### ✅ 1. Requirements Analysis (Completed)
- ✅ Analyzed existing frontend code (`geminiService.ts`, `comfyuiBackendClient.ts`)
- ✅ Identified API endpoints needed: `/api/comfyui/generate`, `/health/detailed`, etc.
- ✅ Documented video generation tiers and fallback logic
- ✅ Calculated model requirements (~20GB total)

### ✅ 2. Platform Evaluation (Completed)
- ✅ Compared 5 platforms: RunPod, Replicate, Hugging Face, Railway, Self-hosted
- ✅ Analyzed pricing for each option
- ✅ Recommended **RunPod (RTX 3090)** for production
- ✅ Recommended **Replicate** for quick start/low volume

### ✅ 3. Backend Server Code (Completed)
Created complete Python FastAPI backend:
- ✅ `comfyui-backend/main.py` - FastAPI server with job queue
- ✅ `comfyui-backend/requirements.txt` - Python dependencies
- ✅ `comfyui-backend/.env.example` - Environment template
- ✅ `comfyui-backend/README.md` - API documentation
- ✅ `comfyui-backend/Dockerfile` - Docker container config
- ✅ `comfyui-backend/docker-compose.yml` - Multi-container setup

**Features Implemented:**
- Job queue management (in-memory, can upgrade to Redis)
- Firebase Authentication (optional)
- Progress tracking via polling
- Multi-worker support (configurable concurrency)
- CORS for frontend integration
- RESTful API endpoints matching frontend expectations
- Health monitoring
- Error handling

### ✅ 4. Model Configuration (Completed)
- ✅ Created `download-models.sh` script for automated model downloads
- ✅ Documented all required models:
  - SDXL Base 1.0 (~6.9GB)
  - AnimateDiff v2 & v3 (~3.5GB)
  - SVD 1.1 (~9.6GB)
  - Detail LoRA (~154MB)
  - SDXL VAE (~335MB)
- ✅ Total: ~20GB models needed

### ✅ 5. Documentation (Completed)
- ✅ `COMFYUI_BACKEND_DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ `QUICKSTART_DEPLOY.md` - Quick start for busy developers
- ✅ `comfyui-backend/README.md` - API documentation
- ✅ All with Thai language support

---

## 📁 Files Created

```
peace-script-basic-v1 /
├── COMFYUI_BACKEND_DEPLOYMENT.md      (Main deployment guide - 350+ lines)
├── QUICKSTART_DEPLOY.md               (Quick start guide - 250+ lines)
└── comfyui-backend/                   (New directory)
    ├── main.py                        (FastAPI server - 450+ lines)
    ├── requirements.txt               (Python dependencies)
    ├── .env.example                   (Environment template)
    ├── README.md                      (API docs)
    ├── Dockerfile                     (Docker config)
    ├── docker-compose.yml             (Multi-container setup)
    └── download-models.sh             (Model downloader - executable)
```

---

## 🎯 Next Steps (For User)

### Option A: Quick Start with Replicate (5 minutes)
**Best for:** Immediate testing, low volume usage

1. Sign up at https://replicate.com
2. Get API key
3. Add to `.env`: `VITE_REPLICATE_API_KEY=xxx`
4. Use Replicate wrapper (see QUICKSTART_DEPLOY.md)
5. Test immediately! 🎉

**Cost:** ~$0.17 per 3-second video

---

### Option B: Deploy to RunPod (30 minutes)
**Best for:** Production, high volume (>1700 videos/month)

1. **Sign up RunPod** (2 min)
   - Go to https://runpod.io
   - Add payment method
   - Deposit $10+

2. **Deploy Pod** (5 min)
   - Use "ComfyUI" template (one-click)
   - Select RTX 3090 (24GB)
   - Storage: 100GB+
   - Wait for deployment

3. **Download Models** (30 min - background)
   - SSH into pod
   - Run: `./download-models.sh`
   - Or download manually

4. **Install Backend** (2 min)
   - Upload `comfyui-backend/` files
   - Run: `pip install -r requirements.txt`

5. **Configure & Run** (1 min)
   - Edit `.env` (set COMFYUI_PATH)
   - Run: `python main.py`

6. **Get Public URL** (1 min)
   - Enable TCP Public IP in RunPod
   - Copy URL: `https://xxx-8000.proxy.runpod.net`

7. **Update Frontend** (2 min)
   - Edit Peace Script AI `.env`:
     ```bash
     VITE_COMFYUI_SERVICE_URL=https://xxx-8000.proxy.runpod.net
     VITE_USE_COMFYUI_BACKEND=true
     ```
   - Rebuild: `npm run build`
   - Deploy: `firebase deploy`

8. **Test!** 🎉
   - Generate video with "ComfyUI + AnimateDiff"
   - Check console for success logs

**Cost:** $320/month (~$0.44/hour × 24/7)

---

### Option C: Test Locally (1 hour)
**Best for:** Development, testing without cloud costs

1. Install ComfyUI locally
2. Download models (run `download-models.sh`)
3. Run ComfyUI: `python main.py`
4. Run backend: `cd comfyui-backend && python main.py`
5. Update `.env`: `VITE_COMFYUI_SERVICE_URL=http://localhost:8000`
6. Test with `npm run dev`

**Cost:** Free (electricity only)

---

## 🔍 Testing Checklist

Once deployed, verify:

### Backend Health
```bash
curl https://your-backend-url/health/detailed
# Should return: {"success": true, "workers": {...}}
```

### Tier 2 - AnimateDiff
```
1. Open Peace Script AI
2. Select shot with base image
3. Click "Generate Video"
4. Select model: "ComfyUI + AnimateDiff"
5. Check console:
   ✅ "🎬 Tier 2: Trying ComfyUI + AnimateDiff..."
   ✅ "✅ Tier 2 Success: ComfyUI + AnimateDiff"
6. Verify video plays
```

### Tier 3 - SVD
```
1. Click "Generate Video"
2. Select model: "ComfyUI + SVD"
3. Check console:
   ✅ "🎬 Tier 2: Trying ComfyUI + SVD..."
   ✅ "✅ Tier 2 Success: ComfyUI + SVD"
4. Verify video quality
```

### Full Fallback Chain
```
1. Temporarily disable Veo (wrong API key)
2. Generate with model="auto"
3. Should see tier progression:
   ⚠️  "❌ Tier 1 (Veo) failed: ..."
   ✅ "🎬 Tier 2: Trying ComfyUI + AnimateDiff..."
   ✅ "✅ Tier 2 Success!"
```

---

## 💰 Cost Analysis

### Scenario 1: Low Volume (100 videos/month)
- **Replicate:** 100 × $0.17 = **$17/month** ✅ CHEAPEST
- **RunPod:** $320/month ❌ Too expensive

**Recommendation:** Use Replicate

### Scenario 2: Medium Volume (1000 videos/month)
- **Replicate:** 1000 × $0.17 = **$170/month**
- **RunPod:** **$320/month** (fixed)

**Recommendation:** Still Replicate (but close)

### Scenario 3: High Volume (2000+ videos/month)
- **Replicate:** 2000 × $0.17 = **$340/month** ❌ Expensive
- **RunPod:** **$320/month** ✅ CHEAPER

**Recommendation:** RunPod (more scalable)

### Break-even Point
```
Replicate cost = RunPod cost
Videos × $0.17 = $320
Videos = 1,882 videos/month

If > 1,882 videos/month → RunPod is cheaper
If < 1,882 videos/month → Replicate is cheaper
```

---

## 🎓 Technical Details

### Architecture
```
Frontend (React/Vite)
    ↓
Firebase Hosting (peace-script-ai.web.app)
    ↓
[Tier 1] Gemini Veo API → ✅ WORKING
    ↓ (on failure)
[Tier 2] ComfyUI Backend (FastAPI) → ⏳ TO BE DEPLOYED
    ↓
ComfyUI (Python)
    ↓
AnimateDiff v3 or SVD 1.1
    ↓
Video Output (base64 → Firebase Storage)
```

### API Flow
```
1. Frontend calls: POST /api/comfyui/generate
2. Backend creates job, returns jobId
3. Frontend polls: GET /api/comfyui/job/{jobId}
4. Backend executes ComfyUI workflow
5. Backend returns video as base64
6. Frontend displays video
```

### Models Used
- **Tier 2 (AnimateDiff):**
  - Checkpoint: `sd_xl_base_1.0.safetensors`
  - Motion: `mm-sd-v3.safetensors`
  - LoRA: `add_detail.safetensors`
  - Output: 512×512, 25 frames @ 8fps (~3 sec)

- **Tier 3 (SVD):**
  - Checkpoint: `svd_xt_1_1.safetensors`
  - Output: 1024×576, 25 frames (~3 sec)
  - Better quality, slower generation

---

## 🔧 Configuration

### Frontend (.env)
```bash
VITE_COMFYUI_SERVICE_URL=https://your-backend-url
VITE_USE_COMFYUI_BACKEND=true
```

### Backend (.env)
```bash
HOST=0.0.0.0
PORT=8000
COMFYUI_PATH=/workspace/ComfyUI
MAX_CONCURRENT_JOBS=2
JOB_TIMEOUT=300
FIREBASE_SERVICE_ACCOUNT=firebase-service-account.json
```

---

## 📈 Performance Expectations

### Generation Times
- **Tier 1 (Veo):** ~30-60 seconds (cloud API)
- **Tier 2 (AnimateDiff):** ~20-40 seconds (GPU)
- **Tier 3 (SVD):** ~30-60 seconds (GPU)

### GPU Utilization
- **RTX 3090:** Can handle 2 concurrent jobs
- **VRAM:** ~8-10GB per job
- **CPU:** Minimal usage

### Throughput
- **Single GPU:** ~60-120 videos/hour
- **With queue:** Unlimited (queued processing)

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Backend health check returns 200 OK
- ✅ Console shows "Tier 2: Trying ComfyUI..."
- ✅ Video generates successfully (not error)
- ✅ Video quality is acceptable
- ✅ Generation time < 60 seconds
- ✅ Fallback chain works (Tier 1 → 2 → 3)

---

## 🆘 Troubleshooting

### Common Issues

**"ComfyUI not found"**
- Check `COMFYUI_PATH` in `.env`
- Verify: `ls $COMFYUI_PATH`

**"Model not found"**
- Re-run `download-models.sh`
- Check disk space (need 20GB+)

**"CUDA out of memory"**
- Reduce `MAX_CONCURRENT_JOBS` to 1
- Use smaller batch size
- Upgrade GPU

**"Connection refused"**
- Verify backend is running: `curl http://localhost:8000/health/detailed`
- Check firewall settings
- Enable public URL in RunPod

**"Firebase auth failed"**
- Verify `firebase-service-account.json` exists
- Or remove file to disable auth (testing only)

---

## 📚 Documentation Index

1. **COMFYUI_BACKEND_DEPLOYMENT.md** - Full deployment guide
2. **QUICKSTART_DEPLOY.md** - Quick start (5-30 min)
3. **comfyui-backend/README.md** - API documentation
4. **This file** - Deployment summary

---

## ✅ Completion Status

- [x] Requirements analysis
- [x] Platform evaluation
- [x] Backend code complete
- [x] Model configuration
- [x] Documentation complete
- [x] Docker setup
- [x] Testing checklist
- [ ] **User chooses platform** ← YOU ARE HERE
- [ ] Deploy backend
- [ ] Update frontend .env
- [ ] Test Tier 2 & 3
- [ ] Production ready! 🎉

---

**Prepared by:** GitHub Copilot  
**For:** Peace Script AI v1.0  
**Next Action:** Choose deployment platform (Replicate or RunPod)  
**Estimated Time to First Video:** 5-30 minutes depending on platform
