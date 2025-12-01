# 🚀 ComfyUI Quick Start - Peace Script AI

## เริ่มต้นใช้งาน ComfyUI ภายใน 5 นาที

### ✅ สิ่งที่ต้องมี

- macOS (M1/M2/M3 หรือ Intel)
- Python 3.10+ (check: `python3 --version`)
- 20GB free disk space
- (Optional) NVIDIA GPU สำหรับความเร็ว

---

## 📦 Step 1: เริ่มต้น ComfyUI

```bash
# อยู่ที่ project folder
cd ~/Desktop/peace-script-basic-v1\ 

# รัน startup script
./start-comfyui.sh
```

Script จะทำให้อัตโนมัติ:
- ติดตั้ง ComfyUI (ถ้ายังไม่มี)
- Setup Python environment
- ตรวจสอบ models
- เริ่ม server ที่ http://localhost:8188

---

## 📥 Step 2: ดาวน์โหลด Models

### Images (Required)
```bash
cd ~/Desktop/ComfyUI/models/checkpoints

# SDXL Base (2.5GB)
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
```

### Videos (Optional)
```bash
# Stable Video Diffusion (4.7GB)
wget https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors
```

### LoRA Models (Optional)
```bash
cd ../loras

# คัดลอกจาก Desktop (มี FLUX LoRA อยู่แล้ว)
cp ~/Desktop/ComfyUI/*.safetensors ./

# หรือดาวน์โหลดจาก CivitAI
# https://civitai.com/models
```

---

## 🔌 Step 3: ติดตั้ง Video Support

```bash
cd ~/Desktop/ComfyUI/custom_nodes

# VideoHelperSuite (Required for video export)
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
cd ComfyUI-VideoHelperSuite
pip install -r requirements.txt

# AnimateDiff (Optional for advanced animation)
cd ..
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
cd ComfyUI-AnimateDiff-Evolved
pip install -r requirements.txt
```

---

## ⚙️ Step 4: เปิดใช้งานใน Peace Script AI

```bash
cd ~/Desktop/peace-script-basic-v1\ 

# Edit .env.local
nano .env.local
```

เปลี่ยน:
```env
VITE_COMFYUI_ENABLED=true
```

Save (Ctrl+O, Enter, Ctrl+X)

```bash
# Rebuild & Deploy
npm run build
firebase deploy --only hosting
```

---

## 🧪 Step 5: ทดสอบ

### ทดสอบ ComfyUI UI
```bash
# เปิด browser
open http://localhost:8188

# ลอง Queue Prompt
# ถ้าเห็น UI = success!
```

### ทดสอบกับ Peace Script AI
```bash
# เปิด production
open https://peace-script-ai.web.app

# Login → Create/Open Project → Generate Image/Video
# ถ้า Gemini quota หมด จะใช้ ComfyUI อัตโนมัติ
```

---

## 📊 การทำงาน

### Image Generation Flow
```
User กด Generate Image
    ↓
Try Gemini 2.5 → (429 quota)
    ↓
Try Gemini 2.0 → (429 quota)
    ↓
Try SD XL (HF) → (401 auth error)
    ↓
✅ ComfyUI + LoRA → SUCCESS!
```

### Video Generation Flow
```
User กด Generate Video
    ↓
Try Gemini Veo 3.1 → (quota/timeout)
    ↓
✅ ComfyUI + SVD + LoRA → SUCCESS!
```

---

## 💡 Tips & Tricks

### เร่งความเร็ว
```bash
# ใช้ GPU (ถ้ามี NVIDIA)
python main.py --highvram

# หรือลด quality เพื่อความเร็ว
# Edit workflow: steps 20 → 15, cfg 7 → 5
```

### ประหยัด VRAM
```bash
# ใช้ CPU mode (ช้ากว่าแต่ใช้ RAM)
python main.py --cpu

# หรือลด batch size
# Edit workflow: batch_size 4 → 1
```

### Debug
```bash
# ดู logs
tail -f ~/Desktop/ComfyUI/comfyui.log

# ตรวจสอบ queue
curl http://localhost:8188/queue
```

---

## 🆘 Troubleshooting

### ComfyUI ไม่เริ่มต้น
```bash
# ติดตั้ง dependencies ใหม่
cd ~/Desktop/ComfyUI
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Models ไม่โหลด
```bash
# ตรวจสอบชื่อไฟล์และ path
ls -lh ~/Desktop/ComfyUI/models/checkpoints/
ls -lh ~/Desktop/ComfyUI/models/loras/

# ต้องเป็น .safetensors หรือ .ckpt
```

### Video ไม่ export
```bash
# ติดตั้ง ffmpeg
brew install ffmpeg

# ตรวจสอบ VideoHelperSuite
ls ~/Desktop/ComfyUI/custom_nodes/ | grep Video
```

---

## 📈 Performance Benchmarks

### M1 Mac (8GB RAM)
- Image (1024x1024): ~30s
- Video (25 frames): ~2-3 min
- LoRA: ~40s

### M2 Mac (16GB RAM)
- Image: ~20s
- Video: ~1.5 min
- LoRA: ~25s

### RTX 3090 (Cloud)
- Image: ~5s
- Video: ~30s
- LoRA: ~8s

---

## 🎓 Next Steps

1. **Train Custom LoRA**: https://civitai.com/models
2. **Create Custom Workflows**: http://localhost:8188
3. **Join Community**: https://discord.gg/comfyui
4. **Explore Models**: https://huggingface.co/models

---

**พร้อมใช้งานแล้ว!** 🎬✨

ComfyUI + LoRA พร้อมสำหรับ Image + Video generation คุณภาพสูงสุด!
