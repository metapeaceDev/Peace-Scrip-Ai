# 🎬 ComfyUI Local Setup Guide - Peace Script AI
# สำหรับ NVIDIA RTX 5090 (32GB VRAM)

> **Status:** ✅ SETUP COMPLETED - December 21, 2025  
> **Services:** ComfyUI Server + Service + VideoHelperSuite  
> **Models:** AnimateDiff Motion Module + SD 1.5

## 📋 ขั้นตอนการติดตั้ง ComfyUI แบบ Local

### 1️⃣ ติดตั้ง Python 3.10 หรือ 3.11

**ดาวน์โหลด Python:**
```
https://www.python.org/downloads/
```

**เลือก Python 3.10.11 (Recommended) หรือ 3.11.x**

⚠️ **สำคัญ**: ติ๊กถูก "Add Python to PATH" ตอนติดตั้ง!

**ทดสอบหลังติดตั้ง:**
```powershell
python --version
# ควรแสดง: Python 3.10.11 หรือ 3.11.x
```

---

### 2️⃣ ติดตั้ง ComfyUI (Portable Version)

**ดาวน์โหลด ComfyUI Portable:**
```
https://github.com/comfyanonymous/ComfyUI/releases/latest
```

**เลือก: `ComfyUI_windows_portable_nvidia_cu128.7z` (1.85 GB)**

💡 **ทำไมเลือก cu128?**
- GPU ของคุณ: RTX 5090 + CUDA 13.1
- cu128 = CUDA 12.8 (เข้ากันได้ดีกับ CUDA 13.x)
- เวอร์ชันใหม่สุด รองรับ RTX 50 series

**ติดตั้ง:**
1. ดาวน์โหลด `ComfyUI_windows_portable_nvidia_cu128.7z`
2. แตกไฟล์ไปที่ `C:\ComfyUI` (ใช้ 7-Zip)
3. เปิด Command Prompt/PowerShell
4. รันคำสั่ง:

```powershell
cd C:\ComfyUI
.\run_nvidia_gpu.bat
```

---

### 3️⃣ ดาวน์โหลด Models สำหรับ Video Generation

#### 📦 AnimateDiff Models (Text-to-Video)

**Motion Module:**
```powershell
# สร้างโฟลเดอร์
mkdir C:\ComfyUI\models\animatediff_models

# ดาวน์โหลด (ใช้เบราว์เซอร์)
https://huggingface.co/guoyww/animatediff/blob/main/mm_sd_v15_v2.ckpt
```
- บันทึกไปที่: `C:\ComfyUI\models\animatediff_models\mm_sd_v15_v2.ckpt`

**Base Model (Stable Diffusion 1.5):**
```powershell
# สร้างโฟลเดอร์
mkdir C:\ComfyUI\models\checkpoints

# ดาวน์โหลด (ใช้เบราว์เซอร์)
https://huggingface.co/runwayml/stable-diffusion-v1-5/blob/main/v1-5-pruned-emaonly.safetensors
```
- บันทึกไปที่: `C:\ComfyUI\models\checkpoints\v1-5-pruned-emaonly.safetensors`

#### 📦 SVD Models (Image-to-Video)

```powershell
# ดาวน์โหลด SVD (ใช้เบราว์เซอร์)
https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt/blob/main/svd_xt.safetensors
```
- บันทึกไปที่: `C:\ComfyUI\models\checkpoints\svd_xt.safetensors`

---

### 4️⃣ รัน ComfyUI Server

```powershell
cd C:\ComfyUI
.\run_nvidia_gpu.bat
```

**ตรวจสอบ:**
- เปิดเบราว์เซอร์ไปที่: http://localhost:8188
- ควรเห็น ComfyUI UI

---

### 5️⃣ รัน ComfyUI Backend Service (Peace Script)

**เปิด Terminal ใหม่:**

```powershell
cd peace-script-basic-v1\comfyui-service

# ติดตั้ง dependencies
npm install

# เริ่ม service
npm run dev
```

**ตรวจสอบ:**
```powershell
curl http://localhost:8000/health
```

ควรแสดง:
```json
{
  "success": true,
  "service": "comfyui-service",
  "status": "healthy"
}
```

---

### 6️⃣ ทดสอบ Video Generation

**ใช้ Test Script:**
```powershell
cd peace-script-basic-v1

# รันสคริปต์ทดสอบ
.\test-video-generation.ps1
```

**หรือทดสอบจากเว็บ:**
1. เปิด https://peace-script-ai.web.app
2. เลือก project
3. ไปที่ Step 5: Output
4. คลิก "Generate Video"
5. เลือก Model: "Local GPU"

---

## 🔧 คำสั่งที่ใช้บ่อย

### เช็คสถานะ GPU
```powershell
nvidia-smi
```

### รัน ComfyUI
```powershell
cd C:\ComfyUI
.\run_nvidia_gpu.bat
```

### รัน ComfyUI Service
```powershell
cd peace-script-basic-v1\comfyui-service
npm run dev
```

### ทดสอบ API
```powershell
# Health check
curl http://localhost:8000/health

# Model detection
curl http://localhost:8000/api/video/detect-models

# Video requirements
curl http://localhost:8000/api/video/requirements?type=animatediff
```

---

## 📊 ขนาดไฟล์ที่ต้องดาวน์โหลด

| Model | ขนาด | จำเป็น |
|-------|------|--------|
| AnimateDiff Motion Module | ~1.7 GB | ✅ Yes |
| SD 1.5 Base Model | ~4 GB | ✅ Yes |
| SVD Model | ~9.6 GB | 🔷 Optional |

**รวมประมาณ: 5.7 GB (จำเป็น) + 9.6 GB (ถ้าต้องการ SVD)**

---

## ⚡ ประสิทธิภาพบน RTX 5090

- **AnimateDiff (16 frames)**: ~30-60 วินาที
- **AnimateDiff (128 frames)**: ~3-5 นาที
- **SVD (25 frames)**: ~45-90 วินาที
- **VRAM ใช้**: ~8-12 GB (จาก 32 GB)

---

## 🐛 แก้ปัญหาที่พบบ่อย

### Python ไม่รัน
```powershell
# เพิ่ม Python เข้า PATH manually
# System Properties > Environment Variables > Path
# เพิ่ม: C:\Users\YOUR_USERNAME\AppData\Local\Programs\Python\Python310
```

### ComfyUI ไม่เริ่ม
```powershell
# ตรวจสอบ CUDA
nvidia-smi

# ลอง CPU mode
.\run_cpu.bat
```

### Port 8188 ถูกใช้แล้ว
```powershell
# หา process ที่ใช้ port
netstat -ano | findstr :8188

# Kill process
taskkill /PID <PID> /F
```

### Service ไม่เชื่อมต่อ ComfyUI
```powershell
# เช็ค .env ใน comfyui-service
cd comfyui-service
notepad .env

# ตรวจสอบ:
# COMFYUI_WORKERS=http://localhost:8188
```

---

## 📚 เอกสารเพิ่มเติม

- **ComfyUI Official**: https://github.com/comfyanonymous/ComfyUI
- **AnimateDiff**: https://github.com/guoyww/AnimateDiff
- **SVD**: https://stability.ai/stable-video

---

## 🚀 Quick Start (สรุป)

```powershell
# 1. ติดตั้ง Python 3.10
# ดาวน์โหลดจาก: https://www.python.org/downloads/

# 2. ดาวน์โหลด ComfyUI Portable
# https://github.com/comfyanonymous/ComfyUI/releases

# 3. แตกไฟล์ไปที่ C:\ComfyUI

# 4. รัน ComfyUI (Terminal 1)
cd C:\ComfyUI
.\run_nvidia_gpu.bat

# 5. รัน Service (Terminal 2)
cd peace-script-basic-v1\comfyui-service
npm run dev

# 6. ทดสอบ (Terminal 3)
cd peace-script-basic-v1
.\test-video-generation.ps1

# 7. เปิดเว็บ
# http://localhost:5173 (development)
# https://peace-script-ai.web.app (production)
```

---

## 🚀 Quick Start Commands

**Start all services at once:**
```powershell
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
.\start-dev-full.ps1
```

**Test commands:** See [TEST_COMMANDS.md](comfyui-service/TEST_COMMANDS.md)

---

**Status**: ✅ INSTALLATION COMPLETED  
**Setup Date**: December 21, 2025  
**GPU**: ✅ RTX 5090 32GB VRAM (CUDA 13.1)  
**ComfyUI**: ✅ cu128 Portable + VideoHelperSuite  
**Models**: ✅ AnimateDiff + SD 1.5  
**Service**: ✅ Running on port 8000 (in-memory queue)  
**Python**: ❌ Need to install  
**ComfyUI**: ❌ Need to install

