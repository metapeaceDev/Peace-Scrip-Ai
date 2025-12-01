# ComfyUI + LoRA Setup Guide

## Overview
Peace Script AI ใช้ระบบ ComfyUI สำหรับ **Image + Video Generation** ที่มีคุณภาพสูงสุด:

### ระบบ Image Generation
```
1. Gemini 2.5 Flash Image → (quota หมด)
2. Gemini 2.0 Flash Exp → (quota หมด)
3. Stable Diffusion XL → (ทำงาน แต่ช้า)
4. ComfyUI + LoRA → (คุณภาพสูงสุด, ควบคุมเต็มที่) ⭐
```

### ระบบ Video Generation
```
1. Gemini Veo 3.1 → (best quality, limited quota)
2. ComfyUI + SVD/AnimateDiff + LoRA → (ควบคุมเต็มที่) ⭐
```

## 🎯 LoRA Models ที่รองรับ

### สำหรับ Images
- **CHARACTER_CONSISTENCY**: รักษาลักษณะตัวละครให้เหมือนเดิมทุกภาพ
- **CINEMATIC_STYLE**: สไตล์ภาพยนตร์คุณภาพสูง
- **THAI_STYLE**: สไตล์ภาพยนตร์ไทย
- **FLUX_LORA**: Character Sheet workflow (มีอยู่แล้วใน Desktop)

### สำหรับ Videos
- **Stable Video Diffusion (SVD)**: Text-to-Video generation
- **AnimateDiff**: Motion module สำหรับ animation
- **LoRA Motion**: Custom motion styles

## 📦 การติดตั้ง ComfyUI (macOS)

### ขั้นตอนที่ 1: Clone ComfyUI

```bash
cd ~/Desktop
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

### ขั้นตอนที่ 2: ติดตั้ง Python Environment

```bash
# สร้าง virtual environment
python3 -m venv venv
source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt
pip install torch torchvision torchaudio
```

### ขั้นตอนที่ 3: ดาวน์โหลด Models

#### Base Models (Required)
```bash
cd models/checkpoints

# SDXL Base (สำหรับ images)
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# Stable Video Diffusion (สำหรับ videos)
cd ../checkpoints
wget https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors
```

#### LoRA Models (Optional)
```bash
cd ../loras

# ดาวน์โหลด LoRA จาก CivitAI หรือ HuggingFace
# ตัวอย่าง:
wget https://civitai.com/api/download/models/[MODEL_ID] -O character_consistency_v1.safetensors
wget https://civitai.com/api/download/models/[MODEL_ID] -O cinematic_film_v2.safetensors

# หรือคัดลอกจาก Desktop (มี FLUX LoRA อยู่แล้ว)
cp ~/Desktop/ComfyUI/*.json ./
cp ~/Desktop/ComfyUI/*.safetensors ./
```

### ขั้นตอนที่ 4: ติดตั้ง Custom Nodes

```bash
cd custom_nodes

# Video Helper Suite (สำหรับ video export)
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git

# Advanced ControlNet
git clone https://github.com/Kosinkadink/ComfyUI-Advanced-ControlNet.git

# AnimateDiff Evolved
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git

# ติดตั้ง dependencies
cd ComfyUI-VideoHelperSuite
pip install -r requirements.txt
cd ../ComfyUI-AnimateDiff-Evolved
pip install -r requirements.txt
```

### ขั้นตอนที่ 5: เริ่มต้น ComfyUI Server

```bash
cd ~/Desktop/ComfyUI
source venv/bin/activate
python main.py --listen 0.0.0.0 --port 8188
```

**เปิด browser ที่**: http://localhost:8188

---

## 🎬 Video Generation Setup

### ดาวน์โหลด AnimateDiff Motion Modules

```bash
cd ~/Desktop/ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/models

# Motion Module v2
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt

# Motion Module v3
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v3.ckpt
```

### Workflow สำหรับ Video

1. **Text-to-Video**: ใช้ AnimateDiff + LoRA
2. **Image-to-Video**: ใช้ SVD (Stable Video Diffusion)
3. **Character Animation**: ใช้ AnimateDiff + Character LoRA

---

## ⚙️ การตั้งค่าใน Peace Script AI

### 1. อัพเดท .env.local

```bash
cd ~/Desktop/peace-script-basic-v1\ 

# Edit .env.local
VITE_COMFYUI_API_URL=http://localhost:8188
VITE_COMFYUI_ENABLED=true
```

### 2. Rebuild และ Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## 🎨 การใช้งาน

### Image Generation with LoRA

```typescript
// Automatic - ระบบจะใช้ ComfyUI เมื่อ Gemini quota หมด
await generateStoryboardImage(prompt);
// → ใช้ CINEMATIC_STYLE LoRA

await generateCharacterImage(desc, style, features);
// → ใช้ CHARACTER_CONSISTENCY LoRA

await generateCostumeImage(..., style="Thai Traditional");
// → ใช้ THAI_STYLE LoRA (ถ้ามี style Thai)
```

### Video Generation with SVD

```typescript
// Automatic - ลอง Veo ก่อน, ถ้าล้มเหลวจะใช้ ComfyUI
await generateStoryboardVideo(prompt, baseImage);
// → Tier 1: Gemini Veo 3.1
// → Tier 2: ComfyUI + SVD + CINEMATIC_STYLE LoRA
```

---

## 📊 Performance Comparison

### Images
| Provider | Speed | Quality | LoRA | Cost |
|----------|-------|---------|------|------|
| Gemini 2.5 | ⚡⚡⚡ 3s | ⭐⭐⭐⭐⭐ | ❌ | Free (limited) |
| Gemini 2.0 | ⚡⚡⚡ 3s | ⭐⭐⭐⭐ | ❌ | Free (better) |
| SD XL (HF) | ⚡⚡ 8s | ⭐⭐⭐ | ❌ | Free (unlimited) |
| **ComfyUI + LoRA** | ⚡ 15-30s | ⭐⭐⭐⭐⭐ | ✅ | Hardware |

### Videos
| Provider | Speed | Quality | LoRA | Cost |
|----------|-------|---------|------|------|
| Gemini Veo 3.1 | ⚡⚡⚡ 30s | ⭐⭐⭐⭐⭐ | ❌ | Free (limited) |
| **ComfyUI + SVD** | ⚡ 60-120s | ⭐⭐⭐⭐ | ✅ | Hardware |

---

## 🔧 Troubleshooting

### ComfyUI ไม่ทำงาน
```bash
# ตรวจสอบ server
curl http://localhost:8188/queue

# ดู logs
cd ~/Desktop/ComfyUI
tail -f comfyui.log

# ตรวจสอบ models
ls models/checkpoints/*.safetensors
ls models/loras/*.safetensors
```

### LoRA ไม่ทำงาน
1. ตรวจสอบว่าไฟล์ LoRA อยู่ใน `models/loras/`
2. ตรวจสอบชื่อไฟล์ตรงกับ `LORA_MODELS` ใน `geminiService.ts`
3. Restart ComfyUI server

### Video Generation ล้มเหลว
1. ตรวจสอบว่าติดตั้ง VideoHelperSuite แล้ว
2. ตรวจสอบว่ามี SVD model ใน `models/checkpoints/`
3. ตรวจสอบว่ามี ffmpeg installed:
   ```bash
   brew install ffmpeg
   ```

### Out of Memory (GPU)
```bash
# ลด resolution หรือ frame count
# หรือใช้ CPU mode (ช้ากว่า)
python main.py --cpu
```

---

## 🚀 Advanced: Cloud Deployment

### RunPod Setup (แนะนำ)

1. ไปที่ https://runpod.io
2. เลือก template: **ComfyUI**
3. GPU: RTX 3090 หรือ 4090 ($0.30-0.50/hr)
4. เปิด port 8188
5. อัพเดท `.env.local`:
   ```env
   VITE_COMFYUI_API_URL=https://your-pod-id.runpod.io:8188
   VITE_COMFYUI_ENABLED=true
   ```

### Vast.ai Setup

1. ไปที่ https://vast.ai
2. เลือก instance with GPU
3. Template: `comfyanonymous/comfyui`
4. เปิด port 8188
5. Copy URL และอัพเดท `.env.local`

---

## 💰 ค่าใช้จ่าย

### Local (แนะนำสำหรับ Development)
- **Hardware**: Mac with M1/M2 (ใช้ได้แต่ช้า) หรือ PC with GPU
- **Cost**: ฟรี (ใช้ไฟฟ้าเท่านั้น)
- **Speed**: ช้ากว่า cloud แต่ cost-effective

### Cloud (แนะนำสำหรับ Production)
- **RunPod**: $0.30-0.50/hr (RTX 3090/4090)
- **Vast.ai**: $0.20-0.40/hr (varies)
- **Replicate**: Pay per generation (~$0.01-0.05/image)

---

## 📝 สรุป

### การใช้งานปัจจุบัน (Recommended)

**Images:**
1. Gemini quota หมด → ใช้ SD XL (HuggingFace) ✅
2. ต้องการคุณภาพสูง → เปิด ComfyUI + LoRA

**Videos:**
1. Gemini Veo 3.1 (ทำงานได้ แต่มี quota) ✅
2. ต้องการควบคุมเต็มที่ → เปิด ComfyUI + SVD + LoRA

### ขั้นตอนถัดไป (เลือก 1 หรือทั้งหมด)

**Option 1: ใช้งานตามปัจจุบัน** ✅
- ไม่ต้องติดตั้งอะไรเพิ่ม
- Images: SD XL fallback (ช้าแต่ฟรี)
- Videos: Gemini Veo (มี quota limit)

**Option 2: Setup ComfyUI Local** 🖥️
```bash
# 1. ติดตั้งตามขั้นตอนข้างบน
cd ~/Desktop/ComfyUI
source venv/bin/activate
python main.py --listen 0.0.0.0 --port 8188

# 2. เปิดใช้งาน
cd ~/Desktop/peace-script-basic-v1\ 
# Edit .env.local: VITE_COMFYUI_ENABLED=true
npm run build && firebase deploy
```

**Option 3: Use Cloud ComfyUI** ☁️
- RunPod: https://runpod.io (แนะนำ)
- Vast.ai: https://vast.ai
- Cost: ~$0.30-0.50/hr
- Quality: เหมือน local แต่เร็วกว่า

---

## �� Resources

- **ComfyUI Docs**: https://github.com/comfyanonymous/ComfyUI
- **LoRA Training**: https://civitai.com/models
- **Video Workflows**: https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved
- **Community**: https://discord.gg/comfyui

---

**ระบบพร้อมใช้งานแล้ว!** 

Images + Videos สามารถใช้ ComfyUI + LoRA สำหรับคุณภาพสูงสุด 🎬✨
