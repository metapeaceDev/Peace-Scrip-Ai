# 🎨 คู่มือการใช้งาน ComfyUI - Peace Script AI

**อัปเดตล่าสุด**: 2 ธันวาคม 2568  
**สถานะ**: ✅ พร้อมใช้งาน

---

## 📋 สถานะระบบ

### ✅ ระบบพร้อมใช้งานแล้ว!

- **ComfyUI Server**: ✅ รันที่ `http://localhost:8188`
- **Backend Service**: ✅ รันที่ `http://localhost:8000`
- **Redis**: ✅ รันอยู่
- **Models**: ✅ 5 Checkpoints + 2 LoRAs
- **Configuration**: ✅ เปิดใช้งานแล้ว

---

## 🚀 วิธีใช้งาน

### 1. เริ่มระบบ ComfyUI (ครั้งแรก)

```bash
cd ~/Desktop/peace-script-basic-v1
./start-comfyui-full.sh
```

**ระบบจะ**:

1. ตรวจสอบและเริ่ม Redis (ถ้าจำเป็น)
2. เริ่ม ComfyUI Server (port 8188)
3. เริ่ม Backend Service (port 8000)
4. ทำ Health Check ทุก service
5. แสดงสถานะและ logs

**ผลลัพธ์**:

```
✅ ComfyUI:  http://localhost:8188
✅ Backend:  http://localhost:8000
✅ Ready for image generation!
```

---

### 2. เริ่มแอป Peace Script AI

```bash
# ในหน้าต่าง terminal อื่น
cd ~/Desktop/peace-script-basic-v1
npm run dev
```

เปิด browser: `http://localhost:5174`

---

### 3. ทดสอบการสร้างภาพ

1. ไปที่ **Step 3: Character Creation**
2. สร้างตัวละคร
3. กด **"Generate Outfit (Face ID)"**

**ระบบจะใช้**:

- ✅ ComfyUI Backend (Tier 1 - คุณภาพสูงสุด)
- ✅ SDXL Base 1.0 + LoRA (Hunt3.safetensors)
- ✅ Face ID Matching (ถ้ามีรูป reference)

---

### 4. หยุดระบบ

```bash
cd ~/Desktop/peace-script-basic-v1
./stop-comfyui-full.sh
```

**ระบบจะ**:

- 🛑 หยุด Backend Service
- 🛑 หยุด ComfyUI Server
- 📝 เก็บ logs ไว้ที่ `/tmp/peace-*.log`

---

## 📊 ตรวจสอบสถานะ

### ดู Logs แบบ Real-time

```bash
# ComfyUI logs
tail -f /tmp/peace-comfyui.log

# Backend logs
tail -f /tmp/peace-backend.log
```

### ตรวจสอบ Backend Health

```bash
curl http://localhost:8000/health/detailed | python3 -m json.tool
```

**ผลลัพธ์**:

```json
{
  "success": true,
  "status": "healthy",
  "workers": {
    "totalWorkers": 1,
    "healthyWorkers": 1
  },
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0
  }
}
```

### ตรวจสอบว่า Services รันอยู่หรือไม่

```bash
# เช็ค ports
lsof -i :8188  # ComfyUI
lsof -i :8000  # Backend
lsof -i :6379  # Redis
```

---

## 🔧 แก้ปัญหา

### ปัญหา: Backend ไม่ start

**สาเหตุ**: Dependencies ยังไม่ติดตั้ง

**วิธีแก้**:

```bash
cd comfyui-service
npm install
cd ..
./start-comfyui-full.sh
```

---

### ปัญหา: ComfyUI ไม่ start

**สาเหตุ**: Python dependencies ขาดหาย

**วิธีแก้**:

```bash
cd ~/Desktop/ComfyUI
python3 -m pip install --user -r requirements.txt
```

---

### ปัญหา: Redis connection failed

**วิธีที่ 1**: ติดตั้ง Redis (แนะนำ)

```bash
brew install redis
brew services start redis
```

**วิธีที่ 2**: ใช้ In-memory Queue

- Backend จะใช้ in-memory queue อัตโนมัติ
- ทำงานได้แต่ช้ากว่า Redis

---

### ปัญหา: การเจนรูปค้างที่ 10%

**สาเหตุ**: Backend ไม่ได้รัน

**วิธีแก้**:

```bash
# ตรวจสอบว่า backend รันอยู่
curl http://localhost:8000/health

# ถ้าไม่รัน ให้ restart
./stop-comfyui-full.sh
./start-comfyui-full.sh
```

---

### ปัญหา: Out of memory / CUDA error

**สาเหตุ**: GPU/RAM ไม่พอ

**วิธีแก้**:

1. **ลด batch size**: ใช้ 1 รูปต่อครั้ง
2. **ลด resolution**: 512x512 แทน 1024x1024
3. **ปิด LoRA**: ถ้าไม่จำเป็น
4. **Restart ComfyUI**: เพื่อคืน memory

```bash
./stop-comfyui-full.sh
sleep 5
./start-comfyui-full.sh
```

---

## 📁 โครงสร้าง Files

```
peace-script-basic-v1/
├── start-comfyui-full.sh      # เริ่มระบบทั้งหมด
├── stop-comfyui-full.sh       # หยุดระบบทั้งหมด
├── .env.local                 # Config (VITE_USE_COMFYUI_BACKEND=true)
├── comfyui-service/           # Backend Service
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── services/
│   │   │   ├── comfyuiClient.js     # ComfyUI API client
│   │   │   ├── queueService.js      # Job queue (Bull + Redis)
│   │   │   └── workerManager.js     # Worker pool
│   │   └── routes/
│   │       ├── comfyui.js     # /api/comfyui/*
│   │       └── health.js      # /health
│   ├── .env                   # Backend config
│   └── package.json
└── src/services/
    ├── comfyuiBackendClient.ts    # Frontend -> Backend client
    ├── comfyuiWorkflowBuilder.ts  # Workflow JSON builder
    └── geminiService.ts           # Fallback cascade logic
```

---

## 🎯 Tier System (Fallback Strategy)

การเจนรูปจะลองตาม tier ดังนี้:

### Tier 1: ComfyUI Backend (ถ้าเปิดใช้งาน)

- **คุณภาพ**: ⭐⭐⭐⭐⭐
- **ความเร็ว**: 20-40 วินาที
- **Face ID**: รองรับ (ดีที่สุด)
- **LoRA**: ใช้ได้
- **Quota**: ไม่จำกัด

### Tier 2: Gemini 2.5 Flash Image

- **คุณภาพ**: ⭐⭐⭐⭐
- **ความเร็ว**: 5-10 วินาที
- **Face ID**: รองรับ
- **LoRA**: ไม่ได้
- **Quota**: 15 req/min

### Tier 3: Gemini 2.0 Flash Exp

- **คุณภาพ**: ⭐⭐⭐⭐
- **ความเร็ว**: 8-12 วินาที
- **Face ID**: รองรับ
- **LoRA**: ไม่ได้
- **Quota**: 30 req/min

### Tier 4: Pollinations.ai

- **คุณภาพ**: ⭐⭐⭐
- **ความเร็ว**: 10-15 วินาที
- **Face ID**: ❌ ไม่รองรับ
- **LoRA**: ไม่ได้
- **Quota**: ไม่จำกัด

---

## 🧪 Advanced: Worker Pool

### เพิ่ม ComfyUI Worker (สำหรับ GPU หลายตัว)

แก้ไข `comfyui-service/.env`:

```env
# หลาย workers (แยก GPU)
COMFYUI_WORKERS=http://localhost:8188,http://localhost:8189,http://localhost:8190

# Max concurrent jobs
MAX_CONCURRENT_JOBS=10
```

เริ่ม ComfyUI หลาย instance:

```bash
# Worker 1 (GPU 0)
CUDA_VISIBLE_DEVICES=0 python3 main.py --port 8188 &

# Worker 2 (GPU 1)
CUDA_VISIBLE_DEVICES=1 python3 main.py --port 8189 &

# Worker 3 (GPU 2)
CUDA_VISIBLE_DEVICES=2 python3 main.py --port 8190 &
```

Backend จะ load balance อัตโนมัติ!

---

## 📈 Performance Tuning

### เร็วขึ้น

1. ใช้ **FLUX.1** แทน SDXL (เร็วกว่า 2 เท่า)
2. ลด **steps** จาก 25 เป็น 20
3. ใช้ **Redis** แทน in-memory queue
4. เพิ่ม **worker pool** (หลาย GPU)

### คุณภาพสูงขึ้น

1. เพิ่ม **steps** เป็น 30-40
2. เพิ่ม **CFG** เป็น 8.0-9.0
3. ใช้ **LoRA strength** 0.9 (Face ID)
4. ใช้ **SDXL Refiner** (2-pass)

---

## 🎓 เข้าใจระบบ

### Flow การทำงาน

```
Frontend (React)
    ↓
geminiService.ts (Tier 1 Check)
    ↓
comfyuiBackendClient.ts (Submit Job)
    ↓
Backend Service (port 8000)
    ↓
Bull Queue (Redis)
    ↓
Worker Manager (Load Balancer)
    ↓
ComfyUI Worker (port 8188)
    ↓
PyTorch + SDXL/FLUX
    ↓
Generated Image (Base64)
    ↓
Frontend Display
```

### ทำไมต้องมี Backend Service?

**ไม่มี Backend** (Direct ComfyUI):

- ❌ ไม่มี queue management
- ❌ ไม่มี retry logic
- ❌ ไม่มี load balancing
- ❌ ไม่มี monitoring
- ❌ ต้อง handle timeout เอง

**มี Backend** (ComfyUI Service):

- ✅ Queue + Priority
- ✅ Auto-retry
- ✅ Worker pool
- ✅ Health monitoring
- ✅ Firebase integration
- ✅ WebSocket progress
- ✅ Graceful shutdown

---

## 📞 ติดต่อสอบถาม

หากมีปัญหา:

1. **ตรวจสอบ Logs**:

   ```bash
   tail -f /tmp/peace-comfyui.log
   tail -f /tmp/peace-backend.log
   ```

2. **ตรวจสอบ Console** (F12 ใน browser):
   - ดู Network tab
   - ดู Console errors

3. **Restart ระบบ**:
   ```bash
   ./stop-comfyui-full.sh
   sleep 5
   ./start-comfyui-full.sh
   ```

---

## ✅ Checklist การใช้งาน

- [ ] Redis รันอยู่ (`redis-cli ping`)
- [ ] ComfyUI มี models (checkpoints + LoRAs)
- [ ] Backend dependencies ติดตั้งแล้ว (`npm install`)
- [ ] `.env.local` ตั้งค่า `VITE_USE_COMFYUI_BACKEND=true`
- [ ] รัน `./start-comfyui-full.sh`
- [ ] ตรวจสอบ health: `curl localhost:8000/health`
- [ ] รัน `npm run dev`
- [ ] ทดสอบ generate image

---

**สนุกกับการสร้างหนัง!** 🎬✨
