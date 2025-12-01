# 🚀 Quick Start Guide

## เริ่มใช้งานทันที (5 นาที)

### 1️⃣ เริ่ม Development Environment

```bash
# วิธีที่ 1: ใช้ start script (แนะนำ)
./start-dev.sh

# วิธีที่ 2: เริ่มแยกส่วน
npm run dev              # Frontend only
npm run dev:backend      # Backend only
npm run dev:all          # Frontend + Backend พร้อมกัน
```

### 2️⃣ เปิดในเบราว์เซอร์

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Health**: http://localhost:8000/health

### 3️⃣ Login และใช้งาน

1. คลิก "Sign in with Google"
2. เลือก Google account
3. เริ่มสร้างบท (Story)
4. ระบบจะใช้ Gemini AI สร้างบทอัตโนมัติ

---

## ✅ ตรวจสอบระบบ

### ทดสอบ Backend

```bash
cd comfyui-service
node test-backend.js
```

### ทดสอบ Frontend

```bash
npm run build        # Build production
npm run type-check   # ตรวจสอบ TypeScript
```

---

## 🎨 ComfyUI Integration (ทางเลือก)

ถ้าต้องการใช้ ComfyUI สร้างภาพ:

### ติดตั้ง ComfyUI

```bash
# 1. Clone ComfyUI
cd ~/Desktop
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 2. ติดตั้ง dependencies
pip install -r requirements.txt

# 3. ดาวน์โหลด models
# - SDXL checkpoint → ComfyUI/models/checkpoints/
# - LoRA models → ComfyUI/models/loras/

# 4. เริ่ม ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

### ติดตั้ง Required LoRA Models

ดาวน์โหลดและใส่ใน `ComfyUI/models/loras/`:
- `Character-Consistency.safetensors` - สร้างตัวละครสม่ำเสมอ
- `Cinematic.safetensors` - สไตล์ภาพยนตร์

---

## 🔧 Configuration

### Frontend Environment

แก้ไข `.env.local`:

```env
# Firebase (required)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id

# Gemini AI (required)
VITE_GEMINI_API_KEY=your-gemini-api-key

# ComfyUI Backend (optional)
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
```

### Backend Environment

แก้ไข `comfyui-service/.env`:

```env
# Server
PORT=8000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# ComfyUI Workers
COMFYUI_WORKERS=http://localhost:8188
```

---

## 📚 เอกสารเพิ่มเติม

- **การติดตั้ง**: `GETTING_STARTED.md`
- **Development**: `DEVELOPMENT.md`
- **Deployment**: `DEPLOYMENT.md`
- **Backend API**: `comfyui-service/README.md`
- **ComfyUI Setup**: `COMFYUI_QUICKSTART.md`

---

## 🆘 แก้ปัญหา

### Backend ไม่ทำงาน

```bash
# ตรวจสอบ Redis
redis-cli ping  # ควรได้ PONG

# ตรวจสอบ service account
ls comfyui-service/service-account.json

# เริ่ม backend ใหม่
cd comfyui-service
npm run dev
```

### Frontend ไม่ทำงาน

```bash
# ติดตั้ง dependencies ใหม่
rm -rf node_modules package-lock.json
npm install

# ตรวจสอบ .env.local
cat .env.local

# เริ่มใหม่
npm run dev
```

### ComfyUI ไม่เชื่อมต่อ

1. ตรวจสอบ ComfyUI กำลังรัน: http://localhost:8188
2. ตรวจสอบ `comfyui-service/.env`:
   ```env
   COMFYUI_WORKERS=http://localhost:8188
   ```
3. Restart backend service

---

## 🎯 Next Steps

1. ✅ ทดสอบระบบพื้นฐาน (Gemini AI)
2. ✅ Login ด้วย Firebase
3. ⬜ ติดตั้ง ComfyUI (optional)
4. ⬜ Deploy to production

**Need help?** อ่าน `GETTING_STARTED.md` หรือ `DEVELOPMENT.md`
