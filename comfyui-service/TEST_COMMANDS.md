# ComfyUI Service - Quick Test Commands

## Service Status

```powershell
# Check health
curl http://localhost:8000/health -UseBasicParsing

# Expected response:
# StatusCode: 200
# Content: {"success":true,"status":"healthy",...}
```

## Test Image Generation

```powershell
# Simple image generation test (15-30 seconds)
$body = '{"prompt":"mountain landscape","negative_prompt":"blurry","width":512,"height":512,"steps":15,"seed":999}'
Invoke-RestMethod -Uri "http://localhost:8000/api/comfyui/generate" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 90
```

## Test Video Generation (AnimateDiff)

```powershell
# Video generation test (60-120 seconds)
$body = '{"prompt":"peaceful mountain sunset","negativePrompt":"blurry","width":512,"height":512,"numFrames":16,"fps":8,"steps":20}'
Invoke-RestMethod -Uri "http://localhost:8000/api/video/generate/animatediff" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 300
```

## Service Management

```powershell
# Start service (in new window)
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Stop service
$pid = (netstat -ano | findstr :8000 | Select-Object -First 1) -split '\s+' | Select-Object -Last 1
taskkill /PID $pid /F
```

## ComfyUI Server Management

```powershell
# Start ComfyUI (in new window)
cd C:\ComfyUI\ComfyUI_windows_portable
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\run_nvidia_gpu.bat"

# Check ComfyUI status
curl http://localhost:8188 -UseBasicParsing

# Verify VHS nodes loaded
curl http://localhost:8188/object_info/VHS_VideoCombine -UseBasicParsing
```

## Troubleshooting

### Service won't start
```powershell
# Check if port is busy
netstat -ano | findstr :8000

# Kill process on port 8000
$pid = (netstat -ano | findstr :8000 | Select-Object -First 1) -split '\s+' | Select-Object -Last 1
taskkill /PID $pid /F
```

### Redis errors
Make sure Redis is commented out in `.env`:
```env
# REDIS_URL=redis://localhost:6379
# REDIS_MAX_RETRIES=3
```

### VHS nodes not found
1. Check custom nodes installed:
   ```powershell
   Get-ChildItem "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\custom_nodes"
   ```

2. Reinstall dependencies:
   ```powershell
   cd C:\ComfyUI\ComfyUI_windows_portable
   .\python_embeded\python.exe -m pip install opencv-python imageio-ffmpeg
   ```

3. Restart ComfyUI

## Current Status

✅ ComfyUI Server: Running on port 8188
✅ ComfyUI Service: Running on port 8000  
✅ GPU: RTX 5090 32GB detected
✅ Models: AnimateDiff Motion Module + SD 1.5
✅ Custom Nodes: VideoHelperSuite (VHS_VideoCombine)
✅ Queue: In-memory mode
✅ Frontend Config: Already configured in root `.env`

## Next Steps

1. Test image generation (verify workflow works)
2. Test video generation (AnimateDiff)
3. Access website at http://localhost:5173
4. Generate video with "Local GPU" option
5. Check Firebase Storage for uploaded videos

---

**Last Updated:** December 21, 2025
**Setup Completed:** Video generation infrastructure ready
