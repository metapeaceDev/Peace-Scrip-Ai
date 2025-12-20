# ComfyUI Video Generation - Testing & Troubleshooting Guide

Complete testing procedures and common issues for AnimateDiff and SVD video generation.

---

## 🧪 Testing Workflows

### Test 1: Basic AnimateDiff Workflow

**Purpose:** Verify AnimateDiff nodes are working

**Workflow JSON:**
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
    "inputs": { "text": "A beautiful sunset over mountains", "clip": ["1", 1] },
    "class_type": "CLIPTextEncode"
  },
  "4": {
    "inputs": { "text": "low quality, blurry", "clip": ["1", 1] },
    "class_type": "CLIPTextEncode"
  },
  "5": {
    "inputs": {
      "model_name": "mm_sd_v15_v2.ckpt",
      "beta_schedule": "sqrt_linear",
      "model": ["1", 0]
    },
    "class_type": "AnimateDiffLoaderV1"
  },
  "6": {
    "inputs": {
      "seed": 12345,
      "steps": 20,
      "cfg": 8.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["5", 0],
      "positive": ["3", 0],
      "negative": ["4", 0],
      "latent_image": ["2", 0]
    },
    "class_type": "KSampler"
  },
  "7": {
    "inputs": { "samples": ["6", 0], "vae": ["1", 2] },
    "class_type": "VAEDecode"
  },
  "8": {
    "inputs": {
      "frame_rate": 8,
      "loop_count": 0,
      "filename_prefix": "test_animatediff",
      "format": "video/h264-mp4",
      "pingpong": false,
      "save_output": true,
      "images": ["7", 0]
    },
    "class_type": "VHS_VideoCombine"
  }
}
```

**Expected Results:**
- ✅ Workflow loads without errors
- ✅ Generation completes in 2-4 minutes
- ✅ Output: 16-frame MP4 video at 512x512
- ✅ File location: `ComfyUI/output/test_animatediff_00001.mp4`

**Validation:**
```bash
# Check video properties
ffprobe ComfyUI/output/test_animatediff_00001.mp4

# Expected output:
# Duration: 2 seconds
# Stream #0:0: Video: h264, 512x512, 8 fps
```

---

### Test 2: SVD Image-to-Video Workflow

**Purpose:** Verify SVD nodes and image conditioning

**Prerequisites:**
- Prepare a test image: `test_input.png` (1024x576 recommended)
- Place in `ComfyUI/input/`

**Workflow JSON:**
```json
{
  "1": {
    "inputs": { "image": "test_input.png", "upload": "image" },
    "class_type": "LoadImage"
  },
  "2": {
    "inputs": {
      "width": 1024,
      "height": 576,
      "video_frames": 25,
      "motion_bucket_id": 127,
      "fps": 6,
      "augmentation_level": 0.0,
      "image": ["1", 0]
    },
    "class_type": "SVD_img2vid_Conditioning"
  },
  "3": {
    "inputs": { "ckpt_name": "svd_xt_1_1.safetensors" },
    "class_type": "CheckpointLoaderSimple"
  },
  "4": {
    "inputs": {
      "seed": 54321,
      "steps": 20,
      "cfg": 2.5,
      "sampler_name": "euler",
      "scheduler": "karras",
      "denoise": 1.0,
      "model": ["3", 0],
      "positive": ["2", 0],
      "negative": ["2", 1],
      "latent_image": ["2", 2]
    },
    "class_type": "KSampler"
  },
  "5": {
    "inputs": { "samples": ["4", 0], "vae": ["3", 2] },
    "class_type": "VAEDecode"
  },
  "6": {
    "inputs": {
      "frame_rate": 6,
      "loop_count": 0,
      "filename_prefix": "test_svd",
      "format": "video/h264-mp4",
      "pingpong": false,
      "save_output": true,
      "images": ["5", 0]
    },
    "class_type": "VHS_VideoCombine"
  }
}
```

**Expected Results:**
- ✅ Image loads successfully
- ✅ Generation completes in 5-8 minutes
- ✅ Output: 25-frame MP4 video at 1024x576
- ✅ Motion is natural and follows image content

---

## 🔍 Common Issues & Solutions

### Error: "Unknown node type: AnimateDiffLoaderV1"

**Cause:** ComfyUI-AnimateDiff extension not installed

**Solution:**
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
cd ComfyUI-AnimateDiff-Evolved
pip install -r requirements.txt

# Restart ComfyUI
```

**Verification:**
```bash
# Check if extension folder exists
ls ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/

# Should contain:
# - animatediff/
# - __init__.py
# - requirements.txt
```

---

### Error: "Model file not found: mm_sd_v15_v2.ckpt"

**Cause:** Motion module not downloaded

**Solution:**
```bash
cd ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models

# Download motion module
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt

# Or use curl on Windows
curl -L -o mm_sd_v15_v2.ckpt https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt
```

**Expected file size:** ~1.6GB

**Verification:**
```bash
ls -lh ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models/
# Should show: mm_sd_v15_v2.ckpt (1.6G)
```

---

### Error: "VHS_VideoCombine: No module named 'imageio_ffmpeg'"

**Cause:** VideoHelperSuite dependencies not installed

**Solution:**
```bash
cd ComfyUI/custom_nodes/ComfyUI-VideoHelperSuite
pip install -r requirements.txt

# Or install manually
pip install imageio-ffmpeg opencv-python pillow
```

**Verification:**
```bash
python -c "import imageio_ffmpeg; print('OK')"
# Should print: OK
```

---

### Error: "CUDA out of memory" during video generation

**Symptoms:**
```
RuntimeError: CUDA out of memory. Tried to allocate X MiB
```

**Solutions:**

**1. Reduce Frame Count (Easiest)**
```json
{
  "2": {
    "inputs": { 
      "batch_size": 12  // Reduced from 16
    }
  }
}
```

**2. Lower Resolution**
```json
{
  "2": {
    "inputs": { 
      "width": 448,   // Reduced from 512
      "height": 448
    }
  }
}
```

**3. Enable Model Offloading (Advanced)**

Edit `ComfyUI/extra_model_paths.yaml`:
```yaml
comfyui:
  vae_approx: vae_approx
  clip_vision: clip_vision
  lowvram: true  # Enable VAE/CLIP offloading
```

**4. Use --lowvram flag**
```bash
python main.py --lowvram
```

**VRAM Usage Guide:**
| Configuration | VRAM Required | Recommended GPU |
|--------------|---------------|-----------------|
| AnimateDiff 512x512, 12 frames | 6GB | RTX 2060 |
| AnimateDiff 512x512, 16 frames | 8GB | RTX 3060 |
| AnimateDiff 768x768, 16 frames | 12GB | RTX 3080 |
| SVD 1024x576, 25 frames | 12GB | RTX 3080 |

---

### Error: "Workflow execution failed: Node X"

**Debug Steps:**

**1. Check ComfyUI Console Output**
```bash
# Look for detailed error messages
tail -f ComfyUI/comfyui.log
```

**2. Verify Node Connections**
- Ensure all node inputs reference valid outputs
- Check node IDs match exactly: `["5", 0]` not `["5", 1]`

**3. Validate Model Files**
```bash
# Check checkpoint exists
ls -lh ComfyUI/models/checkpoints/realisticVisionV51_v51VAE.safetensors

# Check file integrity (should not be 0 bytes)
```

**4. Test Workflow Step-by-Step**
- Remove nodes 6-8 (KSampler onwards)
- Add SaveImage node to node 5 output
- Verify each stage works independently

---

### Issue: Video has no motion / static frames

**Cause:** Motion module not loaded correctly or motion_scale too low

**Diagnosis:**
```json
// Check AnimateDiffLoaderV1 is connected
{
  "5": {
    "inputs": {
      "model_name": "mm_sd_v15_v2.ckpt",  // ✅ Correct
      "model": ["1", 0]  // ✅ Must connect to checkpoint
    }
  },
  "6": {
    "inputs": {
      "model": ["5", 0]  // ✅ Must use AnimateDiff model, not ["1", 0]
    }
  }
}
```

**Solutions:**

**1. Verify Motion Module Connection**
- KSampler must use AnimateDiff model output `["5", 0]`
- NOT the base checkpoint `["1", 0]`

**2. Increase Motion Strength (SVD)**
```json
{
  "2": {
    "inputs": {
      "motion_bucket_id": 180  // Increased from 127
    }
  }
}
```

**3. Try Different Motion Module**
```json
{
  "5": {
    "inputs": {
      "model_name": "mm_sd_v15_v3.ckpt"  // v3 has stronger motion
    }
  }
}
```

---

### Issue: Video quality is poor / artifacts

**Solutions:**

**1. Increase Steps**
```json
{
  "6": {
    "inputs": {
      "steps": 25  // Increased from 20
    }
  }
}
```

**2. Adjust CFG Scale**
```json
{
  "6": {
    "inputs": {
      "cfg": 8.5  // AnimateDiff: 7.5-9.0
      // or
      "cfg": 3.0  // SVD: 2.0-3.5
    }
  }
}
```

**3. Use Better Base Model**
```json
{
  "1": {
    "inputs": {
      "ckpt_name": "realisticVisionV51_v51VAE.safetensors"  // High quality
    }
  }
}
```

**4. Improve Prompt Quality**
```json
{
  "3": {
    "inputs": {
      "text": "cinematic shot of a cat walking, high quality, detailed, 4k, professional lighting"
    }
  },
  "4": {
    "inputs": {
      "text": "low quality, blurry, distorted, watermark, text, deformed, duplicate frames, static"
    }
  }
}
```

---

## 📊 Performance Optimization

### Generation Speed Benchmarks

**AnimateDiff (RTX 3080, 12GB):**
| Configuration | Time | FPS |
|--------------|------|-----|
| 512x512, 12 frames, 15 steps | 1:30 | - |
| 512x512, 16 frames, 20 steps | 2:45 | - |
| 768x768, 16 frames, 20 steps | 4:20 | - |

**SVD (RTX 3080, 12GB):**
| Configuration | Time |
|--------------|------|
| 1024x576, 25 frames, 20 steps | 6:30 |
| 1024x576, 25 frames, 15 steps | 4:45 |

### Speed Optimization Tips

**1. Reduce Steps** (Minimal quality loss)
```json
{
  "6": {
    "inputs": {
      "steps": 15  // Instead of 20-25
    }
  }
}
```

**2. Use Faster Samplers**
```json
{
  "6": {
    "inputs": {
      "sampler_name": "dpm_2",  // Faster than euler_ancestral
      "scheduler": "simple"      // Faster than karras
    }
  }
}
```

**3. Batch Multiple Jobs**
- Use queue system to process multiple videos
- Avoid reloading models between jobs

---

## ✅ Pre-Production Checklist

Before deploying to production:

- [ ] All motion modules downloaded and verified
- [ ] Base models (SD 1.5 / SVD) downloaded
- [ ] Extensions installed and loaded
- [ ] Test workflows run successfully
- [ ] VRAM requirements met for target resolution
- [ ] Error handling tested (OOM, timeouts)
- [ ] Queue system configured (Redis)
- [ ] Video output accessible via API
- [ ] Progress tracking working
- [ ] Cancel job functionality tested

---

## 📞 Support Resources

**ComfyUI Issues:**
- [ComfyUI GitHub Issues](https://github.com/comfyanonymous/ComfyUI/issues)
- [ComfyUI Discord](https://discord.gg/comfyui)

**AnimateDiff:**
- [AnimateDiff-Evolved Repo](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved)
- [AnimateDiff Paper](https://arxiv.org/abs/2307.04725)

**SVD:**
- [Stability AI Research](https://stability.ai/research/stable-video-diffusion)
- [SVD Hugging Face](https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1)

---

**Last Updated:** December 21, 2025
