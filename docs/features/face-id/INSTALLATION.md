# InstantID Installation Guide

## Overview

InstantID is an advanced face-preserving image generation system that requires specific models and checkpoints to function properly. This guide covers the complete installation process.

## Prerequisites

- ComfyUI installed and running
- Python environment with required packages
- At least 10 GB free disk space for models

## Required Models

### 1. SDXL Checkpoint (Required)

**Default Checkpoint** (always available):

- `sd_xl_base_1.0.safetensors` - Included with ComfyUI

**Recommended Checkpoint** (optional, better quality):

- `Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors`
- Download: https://civitai.com/models/133005/juggernaut-xl
- Place in: `ComfyUI/models/checkpoints/`

### 2. InsightFace Models (Required for Face Analysis)

The system requires InsightFace `antelopev2` models for face detection and analysis.

**Required files** (5 models):

```
ComfyUI/models/insightface/models/antelopev2/
├── 1k3d68.onnx              (5.03 MB)  - 3D face alignment
├── 2d106det.onnx            (5.03 MB)  - 2D facial landmark detection
├── genderage.onnx           (1.32 MB)  - Gender and age estimation
├── glintr100.onnx           (260 MB)   - Face recognition embeddings
└── scrfd_10g_bnkps.onnx     (16.9 MB)  - Face detection
```

**Quick Installation**:

```powershell
# Run automated installer
.\install-insightface-models.ps1
```

**Manual Installation**:

1. Create directory: `ComfyUI/models/insightface/models/antelopev2/`
2. Download models from: https://huggingface.co/MonsterMMORPG/tools/tree/main
3. Place all 5 `.onnx` files in the directory

### 3. InstantID ControlNet Models (Required)

**IP-Adapter Model**:

- `ip-adapter.bin`
- Place in: `ComfyUI/models/instantid/`

**ControlNet Model**:

- `diffusion_pytorch_model.safetensors`
- Place in: `ComfyUI/models/controlnet/`

## Configuration

### Environment Variables

Edit your `.env.local` file:

```env
# Use default checkpoint (always works)
VITE_FACEID_SDXL_CHECKPOINT=sd_xl_base_1.0.safetensors

# Or use Juggernaut-XL if you downloaded it
# VITE_FACEID_SDXL_CHECKPOINT=Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors
```

### Automatic Fallback

The system automatically falls back to `sd_xl_base_1.0.safetensors` if:

- Configured checkpoint is not found
- Configured checkpoint fails to load

## Troubleshooting

### Error: "Checkpoint not available on this ComfyUI install"

**Cause**: Configured checkpoint doesn't exist in `ComfyUI/models/checkpoints/`

**Solution**:

1. System will automatically fallback to `sd_xl_base_1.0.safetensors`
2. Or download recommended checkpoint and place it correctly

### Error: "InsightFace models (antelopev2) are not properly installed"

**Cause**: Missing or incomplete InsightFace models

**Solution**:

```powershell
# Option 1: Use automated installer
.\install-insightface-models.ps1

# Option 2: Manual installation
# Download all 5 models from:
# https://huggingface.co/MonsterMMORPG/tools/tree/main
# Place in: ComfyUI/models/insightface/models/antelopev2/
```

### Error: "AssertionError: assert 'detection' in self.models"

**Cause**: Missing `scrfd_10g_bnkps.onnx` (face detection model)

**Solution**: Run `.\install-insightface-models.ps1` to download all required models

### Face ID Generation Not Working

**Checklist**:

1. ✅ ComfyUI backend service running (`npm run dev` in `comfyui-service/`)
2. ✅ All 5 InsightFace models installed
3. ✅ SDXL checkpoint available
4. ✅ Reference image uploaded
5. ✅ "Face ID" mode selected (not "Standard")

## Verification

### Check Model Installation

**InsightFace Models**:

```powershell
Get-ChildItem "C:\ComfyUI_windows_portable\ComfyUI\models\insightface\models\antelopev2\*.onnx"
```

Expected: 5 files (1k3d68, 2d106det, genderage, glintr100, scrfd_10g_bnkps)

**SDXL Checkpoints**:

```powershell
Get-ChildItem "C:\ComfyUI_windows_portable\ComfyUI\models\checkpoints\*.safetensors"
```

Expected: At least `sd_xl_base_1.0.safetensors`

### Test Generation

1. Open application
2. Upload a face reference image
3. Select "Face ID" mode
4. Generate image
5. Check console for any errors

## Fallback Behavior

The system implements intelligent fallback:

```
1st Attempt: Use configured checkpoint + InstantID
    ↓ (if checkpoint missing)
2nd Attempt: Use sd_xl_base_1.0.safetensors + InstantID
    ↓ (if InsightFace models missing)
Error: Display helpful message with installation instructions
```

## Performance Notes

- **First load**: May take 30-60 seconds to load models
- **Subsequent generations**: 10-30 seconds depending on GPU
- **GPU Memory**: Requires ~8-10 GB VRAM
- **CPU Mode**: Not recommended (extremely slow)

## Alternative: IP-Adapter Mode

If InstantID models are unavailable, use **IP-Adapter mode** instead:

- Works on Mac/CPU
- Requires less VRAM
- Slightly less accurate face matching
- No InsightFace models needed

To use IP-Adapter:

1. Select "Face ID" mode
2. System automatically uses IP-Adapter on Mac
3. Or set `VITE_USE_IP_ADAPTER=true` in `.env.local`

## Support

If issues persist:

1. Check ComfyUI logs: `comfyui-service/logs/`
2. Check browser console for errors
3. Verify all model files exist and have correct sizes
4. Restart ComfyUI backend service

## Model Sizes Reference

| Model                        | Size          | Purpose                       |
| ---------------------------- | ------------- | ----------------------------- |
| sd_xl_base_1.0.safetensors   | ~6.5 GB       | Base SDXL checkpoint          |
| Juggernaut-XL (optional)     | ~6.5 GB       | Enhanced photoreal checkpoint |
| InsightFace models (5 files) | ~287 MB total | Face analysis                 |
| IP-Adapter model             | ~1.8 GB       | Face matching                 |
| ControlNet model             | ~5 GB         | Pose/structure control        |

**Total Required**: ~13-20 GB depending on checkpoint choice
