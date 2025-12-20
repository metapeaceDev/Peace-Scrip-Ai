# ComfyUI Video Generation Setup Guide

Complete setup guide for AnimateDiff and Stable Video Diffusion (SVD) in Peace Script AI.

---

## 📋 Overview

Peace Script AI supports **two video generation methods**:

1. **AnimateDiff** - Text-to-video generation (SD 1.5 based)
2. **Stable Video Diffusion (SVD)** - Image-to-video generation

Both use ComfyUI backend with custom workflow builders.

---

## 🎬 AnimateDiff Setup

### Prerequisites
- ComfyUI installed and running
- 8GB+ VRAM recommended
- Python 3.10+

### 1. Install ComfyUI-AnimateDiff Extension

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
cd ComfyUI-AnimateDiff-Evolved
pip install -r requirements.txt
```

### 2. Download Motion Modules

Download motion modules to `ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models/`:

**Recommended Models:**
- **mm_sd_v15_v2.ckpt** (Default) - [Download](https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt)
- **mm_sd_v15_v3.ckpt** (Improved) - [Download](https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v3.ckpt)

```bash
cd ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt
```

### 3. Download Base Model (SD 1.5)

Download to `ComfyUI/models/checkpoints/`:

- **realisticVisionV51_v51VAE.safetensors** (Recommended) - [CivitAI](https://civitai.com/models/4201)
- Or **v1-5-pruned-emaonly.safetensors** - [Hugging Face](https://huggingface.co/runwayml/stable-diffusion-v1-5)

### 4. Install Video Output Extension (VHS)

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
cd ComfyUI-VideoHelperSuite
pip install -r requirements.txt
```

### 5. Test AnimateDiff Workflow

Start ComfyUI and test with this minimal workflow:

```json
{
  "1": {
    "inputs": { "ckpt_name": "realisticVisionV51_v51VAE.safetensors" },
    "class_type": "CheckpointLoaderSimple"
  },
  "2": {
    "inputs": { "width": 512, "height": 512, "batch_size": 16 },
    "class_type": "EmptyLatentImage"
  },
  "3": {
    "inputs": { "text": "A cat walking", "clip": ["1", 1] },
    "class_type": "CLIPTextEncode"
  },
  "5": {
    "inputs": { "model_name": "mm_sd_v15_v2.ckpt", "model": ["1", 0] },
    "class_type": "AnimateDiffLoaderV1"
  }
}
```

**Expected Output:** 16-frame video at 512x512 resolution

---

## 🎥 Stable Video Diffusion (SVD) Setup

### Prerequisites
- ComfyUI installed
- **12GB+ VRAM required** (SVD is more demanding)
- Python 3.10+

### 1. Download SVD Checkpoint

Download to `ComfyUI/models/checkpoints/`:

- **svd_xt_1_1.safetensors** (25 frames) - [Download](https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors)

```bash
cd ComfyUI/models/checkpoints
wget https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors
```

**File size:** ~5GB

### 2. Install Required Extensions

SVD requires the same VideoHelperSuite as AnimateDiff:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
cd ComfyUI-VideoHelperSuite
pip install -r requirements.txt
```

### 3. Test SVD Workflow

Upload a reference image and test:

```json
{
  "1": {
    "inputs": { "image": "test.png" },
    "class_type": "LoadImage"
  },
  "2": {
    "inputs": {
      "width": 1024,
      "height": 576,
      "video_frames": 25,
      "motion_bucket_id": 127,
      "image": ["1", 0]
    },
    "class_type": "SVD_img2vid_Conditioning"
  },
  "3": {
    "inputs": { "ckpt_name": "svd_xt_1_1.safetensors" },
    "class_type": "CheckpointLoaderSimple"
  }
}
```

**Expected Output:** 25-frame video at 1024x576 resolution

---

## 🚀 API Usage

### AnimateDiff (Text-to-Video)

```bash
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat walking in the garden, realistic, high quality",
    "negativePrompt": "blurry, low quality",
    "numFrames": 16,
    "fps": 8,
    "motionScale": 1.0,
    "width": 512,
    "height": 512,
    "steps": 20,
    "cfg": 8.0
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "AnimateDiff video job queued successfully",
  "data": {
    "jobId": "video-1234567890",
    "type": "animatediff",
    "estimatedTime": 32,
    "queuePosition": 0
  }
}
```

### SVD (Image-to-Video)

```bash
curl -X POST http://localhost:8000/api/video/generate/svd \
  -H "Content-Type: application/json" \
  -d '{
    "referenceImage": "data:image/png;base64,iVBORw0KG...",
    "numFrames": 25,
    "fps": 6,
    "motionScale": 127,
    "width": 1024,
    "height": 576
  }'
```

### Check Job Status

```bash
curl http://localhost:8000/api/video/job/video-1234567890
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "video-1234567890",
    "state": "processing",
    "progress": 65,
    "currentFrame": 10,
    "totalFrames": 16,
    "videoUrl": null
  }
}
```

---

## ⚙️ Configuration

### Environment Variables (comfyui-service)

```bash
# .env file
COMFYUI_WORKERS=http://localhost:8188
VIDEO_QUEUE_CONCURRENCY=1  # Lower concurrency for video (resource intensive)
REDIS_URL=redis://localhost:6379
```

### Recommended Settings

**AnimateDiff:**
- Frames: 16-32 (good balance)
- FPS: 8 (smooth motion)
- Resolution: 512x512 (faster) or 768x768 (quality)
- Steps: 20-25
- CFG: 7.5-8.5

**SVD:**
- Frames: 25 (fixed)
- FPS: 6 (cinematic)
- Resolution: 1024x576 (native)
- Motion Scale: 127 (default) - Higher = more motion
- Steps: 20
- CFG: 2.5 (lower for SVD)

---

## 🐛 Troubleshooting

### Issue: "AnimateDiffLoaderV1 not found"

**Solution:** Install ComfyUI-AnimateDiff-Evolved extension

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
```

### Issue: "VHS_VideoCombine not found"

**Solution:** Install VideoHelperSuite extension

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
```

### Issue: CUDA out of memory (OOM)

**Solutions:**
1. Reduce frame count: `numFrames: 12` instead of 16
2. Lower resolution: `512x512` instead of `768x768`
3. Close other GPU applications
4. For SVD: Requires minimum 12GB VRAM

### Issue: Video generation is slow

**Optimization:**
- Reduce steps: `15-20` instead of `25-30`
- Lower frame count: `12-16` frames
- Use faster motion modules: `mm_sd_v15_v2.ckpt`
- Ensure GPU is not throttling (check temperatures)

**Expected Generation Times:**
- AnimateDiff (16 frames): 2-4 minutes (RTX 3080)
- SVD (25 frames): 5-8 minutes (RTX 3080)

### Issue: Motion is too slow/fast

**AnimateDiff:**
- Adjust `motionScale`: 0.5 (subtle) to 1.5 (dramatic)
- Try different motion modules: `v2` vs `v3`

**SVD:**
- Adjust `motion_bucket_id`: 1-255
  - 50-100: Subtle motion
  - 127: Default
  - 150-255: Strong motion

---

## 📊 System Requirements

### Minimum
- GPU: NVIDIA RTX 2060 (8GB VRAM)
- RAM: 16GB
- Storage: 20GB free space
- OS: Windows 10/11, Linux, macOS (MPS limited)

### Recommended
- GPU: NVIDIA RTX 3080+ (12GB+ VRAM)
- RAM: 32GB
- Storage: 50GB SSD
- OS: Windows 11 or Ubuntu 22.04

### Model Sizes
- AnimateDiff motion modules: ~1.6GB each
- SD 1.5 checkpoint: ~2GB
- SVD checkpoint: ~5GB
- Total: ~10GB models

---

## 📚 Additional Resources

- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [AnimateDiff Evolved](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved)
- [Stable Video Diffusion Paper](https://stability.ai/research/stable-video-diffusion)
- [Peace Script AI Development Plan](COMFYUI_DEVELOPMENT_PLAN.md)

---

## ✅ Quick Setup Checklist

- [ ] ComfyUI installed and running
- [ ] AnimateDiff extension installed
- [ ] VideoHelperSuite extension installed
- [ ] Motion modules downloaded (mm_sd_v15_v2.ckpt)
- [ ] SD 1.5 checkpoint downloaded
- [ ] SVD checkpoint downloaded (optional, 12GB+ VRAM)
- [ ] Backend service configured (.env)
- [ ] Test workflow run successfully
- [ ] API endpoints responding

---

**Need Help?** Check [COMFYUI_DEVELOPMENT_PLAN.md](COMFYUI_DEVELOPMENT_PLAN.md) for technical architecture details.
