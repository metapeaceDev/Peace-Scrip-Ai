# ComfyUI Video Generation - End-to-End Testing Guide

## Overview
This document provides comprehensive testing procedures for ComfyUI video generation (AnimateDiff and SVD).

**Testing Phases:**
1. ✅ Prerequisites Check
2. ✅ Backend Connectivity Test
3. ✅ Model Detection Test
4. ✅ AnimateDiff Video Generation
5. ✅ SVD Video Generation
6. ✅ Error Handling Tests
7. ✅ Progress Tracking Tests
8. ✅ Fallback System Tests

---

## Phase 1: Prerequisites Check

### 1.1 System Requirements
```bash
# Check NVIDIA GPU
nvidia-smi

# Should show:
# - GPU model (RTX 3060 or better)
# - VRAM (8GB+ for AnimateDiff, 12GB+ for SVD)
# - Driver version (525+)
```

### 1.2 Service Status
```bash
# Check ComfyUI service
curl http://localhost:8188/system_stats

# Check backend service
curl http://localhost:8000/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "comfyui": "connected",
    "redis": "connected",
    "queue": "running"
  }
}
```

### 1.3 Model Files
```bash
# AnimateDiff models
ls ~/ComfyUI/models/animatediff_models/
# Expected: mm_sd_v15_v2.ckpt (1.7GB)

# Checkpoints
ls ~/ComfyUI/models/checkpoints/
# Expected: realisticVisionV60B1_v51VAE.safetensors or similar SD 1.5

# SVD model
ls ~/ComfyUI/models/checkpoints/
# Expected: svd_xt.safetensors (14.6GB)

# VAE
ls ~/ComfyUI/models/vae/
# Expected: vae-ft-mse-840000-ema-pruned.safetensors
```

---

## Phase 2: Backend Connectivity Test

### 2.1 Worker Health Check
```bash
# Get worker stats
curl http://localhost:8000/api/workers

# Expected response:
{
  "totalWorkers": 1,
  "healthyWorkers": 1,
  "workers": [
    {
      "id": "comfyui-1",
      "url": "http://localhost:8188",
      "healthy": true,
      "lastCheck": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2.2 Queue Status
```bash
# Get queue stats
curl http://localhost:8000/api/queue/stats

# Expected response:
{
  "waiting": 0,
  "active": 0,
  "completed": 5,
  "failed": 0,
  "delayed": 0
}
```

---

## Phase 3: Model Detection Test

### 3.1 Detect All Models
```bash
# Run model detection
curl http://localhost:8000/api/video/detect-models

# Expected response:
{
  "animatediff": {
    "available": true,
    "models": {
      "motionModule": "mm_sd_v15_v2.ckpt",
      "checkpoint": "realisticVisionV60B1_v51VAE.safetensors",
      "vae": "vae-ft-mse-840000-ema-pruned.safetensors"
    }
  },
  "svd": {
    "available": true,
    "models": {
      "checkpoint": "svd_xt.safetensors"
    }
  }
}
```

### 3.2 Check Requirements
```bash
# Check AnimateDiff requirements
curl http://localhost:8000/api/video/requirements/animatediff

# Expected: { "ready": true, "vramOk": true, "modelsFound": true }

# Check SVD requirements
curl http://localhost:8000/api/video/requirements/svd

# Expected: { "ready": true, "vramOk": true, "modelsFound": true }
```

### 3.3 WAN (Windows / CMD-first) Model Detection

WAN is validated by ComfyUI at workflow-submit time: the `WanVideoModelLoader` node will reject any `model` value that is not in its enumerated choice list.

On Windows, prefer the provided CMD scripts to avoid PowerShell + PSReadLine unicode-history crashes.

```bat
:: From repo root
cmd /c place-wan-models.cmd
cmd /c diagnose-wan.cmd
```

Confirm ComfyUI is advertising WAN models:

```bash
# Per-node schema (preferred): shows the exact choices list
curl http://127.0.0.1:8188/object_info/WanVideoModelLoader

# Backend aggregated view (shows supported + installed list)
curl http://localhost:8000/api/video/models

# Backend full detection dump (useful for debugging)
curl http://localhost:8000/api/video/detect-models
```

Expected outcomes:
- `/object_info/WanVideoModelLoader` returns a JSON object containing `input.required.model[0]` as a non-empty array.
- `/api/video/models` returns `data.wan.supported: true` and `data.wan.installed` contains your WAN model entries.

---

## Phase 4: AnimateDiff Video Generation

### 4.1 Basic Test (16 frames)
```bash
# Test 1: Simple prompt, low frame count
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A peaceful sunset over mountains, golden hour lighting",
    "numFrames": 16,
    "fps": 8,
    "steps": 25,
    "userId": "test-user"
  }'

# Expected response:
{
  "jobId": "video-1234567890",
  "queuePosition": 0,
  "status": "queued"
}

# Save jobId for next step
```

### 4.2 Monitor Progress
```bash
# Poll job status (replace JOB_ID)
curl http://localhost:8000/api/video/job/JOB_ID

# Expected progression:
# status: "queued" → "processing" → "completed"
# progress: 0 → 50 → 100

# When completed:
{
  "jobId": "video-1234567890",
  "status": "completed",
  "progress": 100,
  "result": {
    "videoUrl": "https://storage.googleapis.com/...",
    "processingTime": 45000
  }
}
```

### 4.3 Extended Test (64 frames)
```bash
# Test 2: More frames
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A bustling Tokyo street at night with neon lights",
    "numFrames": 64,
    "fps": 12,
    "steps": 30,
    "userId": "test-user"
  }'

# Monitor until completion (should take 2-3 minutes)
```

### 4.4 Maximum Test (128 frames)
```bash
# Test 3: Maximum frames
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cinematic drone shot flying through clouds",
    "numFrames": 128,
    "fps": 16,
    "steps": 35,
    "userId": "test-user"
  }'

# Monitor until completion (should take 5-8 minutes)
```

---

## Phase 5: SVD Video Generation

### 5.1 Prepare Reference Image
```bash
# Create test image (or use existing)
# Save as test-image.jpg
```

### 5.2 Basic SVD Test
```bash
# Convert image to base64
BASE64_IMAGE=$(base64 -w 0 test-image.jpg)

# Test SVD generation
curl -X POST http://localhost:8000/api/video/generate/svd \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"Animate this image with gentle motion\",
    \"referenceImage\": \"data:image/jpeg;base64,$BASE64_IMAGE\",
    \"fps\": 24,
    \"steps\": 25,
    \"userId\": \"test-user\"
  }"

# Monitor progress (should take 2-4 minutes)
```

---

## Phase 6: Error Handling Tests

### 6.1 Missing Models Error
```bash
# Temporarily rename motion module
mv ~/ComfyUI/models/animatediff_models/mm_sd_v15_v2.ckpt \
   ~/ComfyUI/models/animatediff_models/mm_sd_v15_v2.ckpt.backup

# Try to generate
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "numFrames": 16
  }'

# Expected error response:
{
  "error": "Required models not found",
  "type": "model_not_found",
  "details": {
    "missing": ["motion_module"]
  }
}

# Restore model
mv ~/ComfyUI/models/animatediff_models/mm_sd_v15_v2.ckpt.backup \
   ~/ComfyUI/models/animatediff_models/mm_sd_v15_v2.ckpt
```

### 6.2 Invalid Parameters Error
```bash
# Test with invalid frame count
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test",
    "numFrames": 500,
    "fps": 8
  }'

# Expected error: "invalid_params"
```

### 6.3 Worker Unavailable Error
```bash
# Stop ComfyUI
pkill -f "python.*main.py"

# Try to generate
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test",
    "numFrames": 16
  }'

# Expected error: "worker_unavailable"

# Restart ComfyUI
./start-comfyui.sh
```

### 6.4 Timeout Test
```bash
# Generate with very high frame count (will timeout)
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Complex scene with many details",
    "numFrames": 128,
    "steps": 50
  }'

# Should timeout after 20 minutes
```

---

## Phase 7: Progress Tracking Tests

### 7.1 WebSocket Progress
```javascript
// Run in browser console or Node.js
const ws = new WebSocket('ws://localhost:8000');

ws.onopen = () => {
  console.log('✅ WebSocket connected');
  
  // Start generation
  fetch('http://localhost:8000/api/video/generate/animatediff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Test WebSocket progress',
      numFrames: 32
    })
  }).then(r => r.json()).then(data => {
    console.log('Job started:', data.jobId);
  });
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress update:', data);
  // Should show: { progress: X, details: {...} }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### 7.2 HTTP Polling Progress
```bash
# Start generation
RESPONSE=$(curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "numFrames": 16}')

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')

# Poll every 2 seconds
while true; do
  STATUS=$(curl -s http://localhost:8000/api/video/job/$JOB_ID)
  PROGRESS=$(echo $STATUS | jq -r '.progress')
  echo "Progress: $PROGRESS%"
  
  if [ "$PROGRESS" == "100" ]; then
    echo "✅ Completed!"
    break
  fi
  
  sleep 2
done
```

---

## Phase 8: Fallback System Tests

### 8.1 ComfyUI → Gemini Veo Fallback
```bash
# Disable ComfyUI temporarily
pkill -f "python.*main.py"

# Try to generate (should fallback to Gemini Veo)
curl -X POST http://localhost:8000/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test fallback",
    "numFrames": 16,
    "enableFallback": true
  }'

# Should succeed using Gemini Veo
# Response will include: { "method": "gemini-veo", "fallbackUsed": true }

# Restart ComfyUI
./start-comfyui.sh
```

### 8.2 Manual Fallback Test
```bash
# Force Gemini Veo
curl -X POST http://localhost:8000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Beautiful landscape",
    "method": "gemini-veo"
  }'

# Should use Gemini Veo directly
```

---

## Test Results Template

### Test Summary
```
Date: __________
Tester: __________
Environment: __________

Phase 1 - Prerequisites:
[ ] GPU detected (model: ______, VRAM: ______GB)
[ ] Services running (ComfyUI: ____, Backend: ____)
[ ] Models present (AnimateDiff: ____, SVD: ____)

Phase 2 - Connectivity:
[ ] Workers healthy (count: ____)
[ ] Queue operational (status: ____)

Phase 3 - Model Detection:
[ ] AnimateDiff models detected
[ ] SVD models detected
[ ] Requirements check passed

Phase 4 - AnimateDiff Generation:
[ ] 16 frames test (time: ____s, result: ____)
[ ] 64 frames test (time: ____s, result: ____)
[ ] 128 frames test (time: ____s, result: ____)

Phase 5 - SVD Generation:
[ ] Basic test (time: ____s, result: ____)
[ ] Image-to-video quality: ____

Phase 6 - Error Handling:
[ ] Missing models error handled
[ ] Invalid params error handled
[ ] Worker unavailable error handled
[ ] Timeout error handled

Phase 7 - Progress Tracking:
[ ] WebSocket updates working
[ ] HTTP polling working
[ ] Progress accuracy: ____%

Phase 8 - Fallback System:
[ ] Auto-fallback to Gemini Veo working
[ ] Manual fallback working
[ ] Error recovery successful

Overall Status: [ ] PASS [ ] FAIL
Issues Found: __________
Notes: __________
```

---

## Automated Test Script

Save as `test-video-generation.sh`:

```bash
#!/bin/bash

echo "🧪 ComfyUI Video Generation Test Suite"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  
  echo -n "Testing $name... "
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code="${response: -3}"
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL (HTTP $http_code)${NC}"
    ((FAIL++))
  fi
}

# Run tests
echo -e "\n📋 Phase 1: Health Checks"
test_endpoint "Backend health" "GET" "/api/health"
test_endpoint "Worker stats" "GET" "/api/workers"
test_endpoint "Queue stats" "GET" "/api/queue/stats"

echo -e "\n📋 Phase 2: Model Detection"
test_endpoint "Detect models" "GET" "/api/video/detect-models"
test_endpoint "AnimateDiff requirements" "GET" "/api/video/requirements/animatediff"
test_endpoint "SVD requirements" "GET" "/api/video/requirements/svd"

echo -e "\n📋 Phase 3: Video Generation"
test_endpoint "AnimateDiff generation" "POST" "/api/video/generate/animatediff" \
  '{"prompt":"Test","numFrames":16,"fps":8,"userId":"test"}'

echo -e "\n========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
```

Run with:
```bash
chmod +x test-video-generation.sh
./test-video-generation.sh
```

---

## Performance Benchmarks

### Expected Generation Times

| Configuration | Frames | GPU | Time (avg) |
|--------------|--------|-----|-----------|
| AnimateDiff Quick | 16 | RTX 3060 | 30-45s |
| AnimateDiff Standard | 32 | RTX 3060 | 60-90s |
| AnimateDiff Extended | 64 | RTX 3060 | 2-3min |
| AnimateDiff Max | 128 | RTX 3060 | 5-8min |
| SVD Standard | 25 | RTX 3060 | 2-4min |
| SVD (High VRAM) | 25 | RTX 4090 | 1-2min |

### VRAM Usage

| Model | Minimum | Recommended | Maximum |
|-------|---------|-------------|---------|
| AnimateDiff | 6GB | 8GB | 12GB |
| SVD | 10GB | 12GB | 16GB |

---

## Troubleshooting

### Common Issues

1. **"Model not found" error**
   - Check model files exist in correct directories
   - Run model detection API
   - See COMFYUI_VIDEO_SETUP.md

2. **"Out of memory" error**
   - Reduce frame count
   - Close other GPU applications
   - Use AnimateDiff instead of SVD

3. **Timeout errors**
   - Reduce frame count
   - Check GPU isn't throttling
   - Verify ComfyUI isn't busy

4. **WebSocket connection fails**
   - Check firewall settings
   - Verify ports 8000, 8188 are open
   - Check CORS configuration

---

## Next Steps

After completing all tests:
1. ✅ Document any issues found
2. ✅ Update configuration if needed
3. ✅ Share results with team
4. ✅ Deploy to production (if all pass)

For detailed setup instructions, see [COMFYUI_VIDEO_SETUP.md](./COMFYUI_VIDEO_SETUP.md)
