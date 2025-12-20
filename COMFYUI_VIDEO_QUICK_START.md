# ComfyUI Video Generation - Quick Start Guide

## 🚀 การเริ่มต้นใช้งานอย่างรวดเร็ว

### Prerequisites
- ✅ ComfyUI installed และเปิดอยู่ที่ port 8188
- ✅ Models downloaded (AnimateDiff, SVD)
- ✅ Backend service เปิดอยู่ที่ port 8000
- ✅ GPU with 8GB+ VRAM (12GB+ for SVD)

---

## 📦 Installation

### 1. ติดตั้ง Dependencies
```bash
# Backend
cd comfyui-service
npm install

# Frontend
cd ..
npm install
```

### 2. Download Models
```bash
# AnimateDiff Models
cd ~/ComfyUI/models/animatediff_models/
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt

# SD 1.5 Checkpoint
cd ~/ComfyUI/models/checkpoints/
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors

# SVD Model (Large!)
wget https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt/resolve/main/svd_xt.safetensors

# VAE
cd ~/ComfyUI/models/vae/
wget https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors
```

### 3. Configuration
```bash
# Create .env file
cat > comfyui-service/.env << EOF
COMFYUI_URL=http://localhost:8188
COMFYUI_WORKERS=1
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=3
VIDEO_QUEUE_CONCURRENCY=1
VIDEO_TIMEOUT=1200000
PORT=8000
EOF
```

---

## 🎬 Usage

### วิธีที่ 1: ใช้ API โดยตรง

#### AnimateDiff (Text-to-Video)
```bash
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene sunset over mountains, golden hour lighting",
    "numFrames": 16,
    "fps": 8,
    "steps": 25,
    "userId": "your-user-id"
  }'

# Response:
# {
#   "jobId": "video-1234567890",
#   "queuePosition": 0,
#   "status": "queued"
# }
```

#### SVD (Image-to-Video)
```bash
# Convert image to base64
BASE64_IMAGE=$(base64 -w 0 image.jpg)

curl -X POST http://localhost:8000/api/video/generate/svd \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"Animate this image with gentle motion\",
    \"referenceImage\": \"data:image/jpeg;base64,$BASE64_IMAGE\",
    \"fps\": 24,
    \"steps\": 25,
    \"userId\": \"your-user-id\"
  }"
```

#### Check Job Status
```bash
# Replace JOB_ID with actual job ID
curl http://localhost:8000/api/video/job/JOB_ID

# Response:
# {
#   "jobId": "video-1234567890",
#   "status": "processing",
#   "progress": 45,
#   "result": null
# }
```

### วิธีที่ 2: ใช้ React Components

```typescript
import VideoGenerationDemo from './pages/VideoGenerationDemo';
import VideoGenerationProgress from './components/VideoGenerationProgress';
import VideoGenerationError from './components/VideoGenerationError';

// ใน component
function MyVideoPage() {
  return (
    <div>
      <VideoGenerationDemo />
    </div>
  );
}
```

### วิธีที่ 3: ใช้ Fallback System

```typescript
import { generateVideoWithFallback } from './services/videoGenerationFallback';

async function generateVideo() {
  const result = await generateVideoWithFallback(
    {
      prompt: "Beautiful landscape",
      videoType: "animatediff",
      numFrames: 16,
      fps: 8
    },
    'comfyui', // Preferred method
    (progress, status) => {
      console.log(`Progress: ${progress}% - ${status}`);
    }
  );

  if (result.success) {
    console.log('Video URL:', result.videoUrl);
  } else {
    console.error('Error:', result.error);
  }
}
```

---

## 🧪 Testing

### Automated Tests
```bash
# Run test suite
chmod +x test-video-generation.sh
./test-video-generation.sh

# Expected output:
# 📋 Phase 1: Health Checks
# ✅ Backend health... PASS
# ✅ Worker stats... PASS
# ...
# Results: 15 passed, 0 failed
```

### Manual Tests
```bash
# 1. Check models
curl http://localhost:8000/api/video/detect-models

# 2. Check requirements
curl http://localhost:8000/api/video/requirements/animatediff
curl http://localhost:8000/api/video/requirements/svd

# 3. Generate test video
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test video","numFrames":16,"fps":8}'

# 4. Monitor progress
# (Replace JOB_ID from step 3)
watch -n 2 "curl -s http://localhost:8000/api/video/job/JOB_ID | jq"
```

---

## 📊 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video/generate/animatediff` | POST | Generate text-to-video |
| `/api/video/generate/svd` | POST | Generate image-to-video |
| `/api/video/job/:jobId` | GET | Get job status |
| `/api/video/cancel/:jobId` | POST | Cancel generation |
| `/api/video/detect-models` | GET | Detect installed models |
| `/api/video/requirements/:type` | GET | Check readiness |
| `/api/video/queue-stats` | GET | Queue statistics |
| `/api/video/history` | GET | Generation history |

### Request Parameters

#### AnimateDiff
```typescript
{
  prompt: string;        // Text description
  numFrames?: number;    // 16-128 (default: 16)
  fps?: number;          // 6-24 (default: 8)
  steps?: number;        // 20-50 (default: 25)
  userId?: string;       // User ID for tracking
}
```

#### SVD
```typescript
{
  prompt: string;         // Text description
  referenceImage: string; // Base64 image (required!)
  fps?: number;           // 6-24 (default: 24)
  steps?: number;         // 20-50 (default: 25)
  userId?: string;        // User ID for tracking
}
```

### Response Format

#### Job Submission
```json
{
  "jobId": "video-1234567890",
  "queuePosition": 0,
  "status": "queued"
}
```

#### Job Status
```json
{
  "jobId": "video-1234567890",
  "status": "processing",
  "progress": 45,
  "details": {
    "currentStep": 12,
    "totalSteps": 25,
    "currentNode": "KSampler",
    "numFrames": 16
  }
}
```

#### Completed
```json
{
  "jobId": "video-1234567890",
  "status": "completed",
  "progress": 100,
  "result": {
    "videoUrl": "https://storage.googleapis.com/...",
    "processingTime": 45000,
    "filename": "video.mp4"
  }
}
```

---

## 🔧 Troubleshooting

### "ComfyUI backend is not running"
```bash
# Check ComfyUI
curl http://localhost:8188/system_stats

# Start if not running
cd ~/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

### "Model not found"
```bash
# Check model files
ls ~/ComfyUI/models/animatediff_models/
ls ~/ComfyUI/models/checkpoints/

# Re-download if missing (see Installation section)
```

### "Out of memory (VRAM)"
```bash
# Reduce frame count
# AnimateDiff: Try 16 frames instead of 64
# Or use AnimateDiff instead of SVD (lower VRAM)

# Check GPU memory
nvidia-smi
```

### "Timeout"
```bash
# Increase timeout in .env
VIDEO_TIMEOUT=2400000  # 40 minutes

# Or reduce complexity
# - Lower frame count
# - Lower steps (20-25)
# - Use smaller checkpoint
```

---

## 📚 Documentation

- **Setup Guide**: [docs/COMFYUI_VIDEO_SETUP.md](docs/COMFYUI_VIDEO_SETUP.md)
- **Testing Guide**: [docs/COMFYUI_VIDEO_TESTING.md](docs/COMFYUI_VIDEO_TESTING.md)
- **End-to-End Tests**: [docs/COMFYUI_VIDEO_END_TO_END_TESTING.md](docs/COMFYUI_VIDEO_END_TO_END_TESTING.md)
- **Completion Report**: [docs/COMFYUI_VIDEO_COMPLETION_REPORT.md](docs/COMFYUI_VIDEO_COMPLETION_REPORT.md)
- **Project Summary (Thai)**: [COMFYUI_VIDEO_SUMMARY.md](COMFYUI_VIDEO_SUMMARY.md)

---

## 🎯 Performance Tips

1. **Start Small**: Begin with 16 frames to test quickly
2. **Optimize Parameters**: Use recommended settings for your GPU
3. **Monitor VRAM**: Watch nvidia-smi during generation
4. **Use Fallback**: Enable automatic fallback to Gemini Veo
5. **Queue Management**: Limit concurrent jobs to 1 for video

---

## 🆘 Support

**Issues?** Check:
1. [Troubleshooting section](#troubleshooting) above
2. [COMFYUI_VIDEO_TESTING.md](docs/COMFYUI_VIDEO_TESTING.md)
3. GitHub Issues

**Contact:** See project documentation

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** December 2025
