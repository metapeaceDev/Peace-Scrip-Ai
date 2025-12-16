# 🚀 Peace Script AI - Quick Start Guide

**สถานะ:** ✅ ระบบพร้อมใช้งาน 100%  
**อัพเดทล่าสุด:** 2 ธันวาคม 2568

---

## ⚡ Quick Start (3 ขั้นตอน)

### 1. เริ่มระบบทั้งหมด

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "
./start-all-services.sh
```

### 2. เปิด Browser

```
http://localhost:5173
```

### 3. Hard Refresh

กด **Cmd + Shift + R** เพื่อโหลด code ใหม่

---

## 📊 ตรวจสอบสถานะระบบ

```bash
./check-status.sh
```

**ควรเห็น:**

```
✅ Frontend (port 5173) - Running
✅ Backend (port 8000) - Running
✅ ComfyUI (port 8188) - Running
✅ FLUX.1-dev (16GB) - Ready
✅ SDXL Base (6.5GB) - Ready
```

---

## 🛠️ คำสั่งที่ใช้บ่อย

| คำสั่ง                             | คำอธิบาย         |
| ---------------------------------- | ---------------- |
| `./start-all-services.sh`          | เริ่มระบบทั้งหมด |
| `./stop-all-services.sh`           | หยุดระบบทั้งหมด  |
| `./check-status.sh`                | เช็คสถานะ        |
| `tail -f /tmp/comfyui-backend.log` | ดู Backend logs  |
| `tail -f /tmp/vite-frontend.log`   | ดู Frontend logs |

---

## 🤖 AI Models ที่ใช้ได้

### Checkpoints (Full Models)

- **FLUX.1-dev** (16GB) - คุณภาพสูงสุด ⭐⭐⭐⭐⭐
  - ช้ากว่า (~2-3 นาที)
  - ใช้ RAM ~20GB
  - เหมาะสำหรับ: ภาพคุณภาพสูง, ตัวละครหลัก

- **SDXL Base 1.0** (6.5GB) - คุณภาพดี ⭐⭐⭐⭐ (Default)
  - เร็วกว่า (~1 นาที)
  - ใช้ RAM ~10GB
  - เหมาะสำหรับ: ใช้งานทั่วไป

### LoRAs (Enhancement)

- **Hunt3** (36MB) - Character enhancement
- **Add-detail-xl** (218MB) - Detail enhancement

### Face ID Portrait (NEW) 🆕

- **InstantID** - คัดลอกใบหน้าจากรูปภาพอ้างอิง
  - Models ที่ต้องมี:
    - `ip-adapter.bin` (1.6GB) - Main InstantID model
    - `diffusion_pytorch_model.safetensors` (2.3GB) - ControlNet
    - `antelopev2` (407MB) - InsightFace face analysis
  - วิธีใช้: อัพโหลดรูปหน้าในขั้นตอน Character Creation
  - ผลลัพธ์: ตัวละครที่มีหน้าตาเหมือนรูปอ้างอิง

---

## 🔧 Troubleshooting

### ปัญหา: ERR_CONNECTION_REFUSED

**สาเหตุ:** Backend Service หยุดทำงาน

**วิธีแก้:**

```bash
./stop-all-services.sh
./start-all-services.sh
```

จากนั้นกด **Cmd+Shift+R** ใน browser

---

### ปัญหา: Frontend ไม่โหลด

**วิธีแก้:**

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "
rm -rf node_modules/.vite dist
npm run dev
```

---

### ปัญหา: ComfyUI ช้า

**วิธีแก้:**

- ลด Steps: 20 → 15
- ลด Resolution: 1024 → 768
- ปิดโปรแกรมอื่นเพื่อเพิ่ม RAM
- ใช้ SDXL แทน FLUX

---

## 📡 Services & Ports

| Service         | Port | URL                   |
| --------------- | ---- | --------------------- |
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend Service | 8000 | http://localhost:8000 |
| ComfyUI         | 8188 | http://localhost:8188 |

---

## 🎯 การใช้งาน FLUX.1

**Default:** ระบบใช้ SDXL (เร็ว, ประหยัด RAM)

**ถ้าต้องการใช้ FLUX.1:**

- ต้องเพิ่ม option: `useFlux: true` ใน code
- หรือรอ Phase B: เพิ่ม UI toggle

---

## 📚 เอกสารเพิ่มเติม

- `FLUX_SETUP.md` - คู่มือ FLUX.1 Integration
- `SYSTEM_STATUS.md` - สถานะระบบโดยละเอียด
- `start-all-services.sh` - Script เริ่มระบบ
- `stop-all-services.sh` - Script หยุดระบบ
- `check-status.sh` - Script เช็คสถานะ

---

## ✅ Checklist ก่อนใช้งาน

- [x] ✅ ติดตั้ง FLUX.1-dev (16GB)
- [x] ✅ ติดตั้ง SDXL Base (6.5GB)
- [x] ✅ ติดตั้ง Hunt3 LoRA (36MB)
- [x] ✅ ติดตั้ง Add-detail-xl LoRA (218MB)
- [x] ✅ ติดตั้ง InstantID Models (4.3GB):
  - [x] ip-adapter.bin (1.6GB)
  - [x] diffusion_pytorch_model.safetensors (2.3GB)
  - [x] antelopev2 InsightFace models (407MB)
- [x] ✅ ComfyUI ทำงาน (port 8188)
- [x] ✅ Backend Service ทำงาน (port 8000)
- [x] ✅ Frontend ทำงาน (port 5173)
- [x] ✅ Code อัพเดท FLUX + InstantID support
- [x] ✅ Workflow ทดสอบสำเร็จ

---

## 🎉 พร้อมใช้งาน!

**ระบบพร้อม 100%** - เริ่มสร้างตัวละครได้เลย! 🚀

```bash
# เริ่มระบบ
./start-all-services.sh

# เปิด browser
open http://localhost:5173

# Hard refresh
# กด Cmd+Shift+R
```

---

**ติดปัญหา?** รัน `./check-status.sh` เพื่อดูสถานะระบบ
