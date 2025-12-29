# 🎨 ComfyUI Backend Service - Peace Script AI

Microservice สำหรับ ComfyUI + LoRA image generation พร้อม queue system และ GPU pool management

## 🏗️ สถาปัตยกรรม

```
Frontend (React)
    ↓ HTTP Request
ComfyUI Service (Node.js + Express)
    ↓ Queue Job
Bull Queue (Redis)
    ↓ Process
ComfyUI Workers (GPU Pool)
    ↓ Store Result
Firebase (Firestore + Storage)
```

## ✨ Features

- ✅ **Queue System**: Bull + Redis สำหรับจัดการ concurrent requests
- ✅ **Worker Pool**: รองรับ ComfyUI หลาย instance (GPU load balancing)
- ✅ **Firebase Integration**: Authentication + Firestore + Storage
- ✅ **Real-time Progress**: WebSocket tracking
- ✅ **Auto-retry**: ลองใหม่อัตโนมัติเมื่อ fail
- ✅ **Health Checks**: ตรวจสอบ worker health ทุก 30 วินาที
- ✅ **LoRA Verification**: ตรวจสอบ LoRA models ก่อนเจน
- ✅ **Docker Ready**: พร้อม deploy ด้วย Docker Compose

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
cd comfyui-service
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# แก้ไข .env ตามค่าของคุณ
```

**Storage URL แบบลิงก์ถาวร (ไม่หมดอายุ):**

- ตั้ง `FIREBASE_STORAGE_URL_MODE=token` เพื่อให้ backend คืน Firebase download token URL (ไม่หมดอายุ)
- ถ้าตั้งเป็น `public` จะพยายาม `makePublic()` (อาจล้มเหลวถ้า bucket เปิด UBLA)
- ถ้าตั้งเป็น `signed` จะเป็น Signed URL (มีวันหมดอายุ)
**ตัวอย่าง .env:**

```env
NODE_ENV=development
PORT=8000
REDIS_HOST=localhost
REDIS_PORT=6379
COMFYUI_WORKERS=http://localhost:8188
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
FIREBASE_STORAGE_BUCKET=<your-bucket-name>
FIREBASE_STORAGE_URL_MODE=token
```

### 3. เตรียม Firebase Service Account

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Generate new private key
4. บันทึกเป็น `service-account.json` ในโฟลเดอร์นี้

### 4. Start Services

**แบบ Development:**

```bash
npm run dev
```

**แบบ Docker Compose (แนะนำ):**

```bash
docker-compose up -d
```

## 📡 API Endpoints

### Generate Image

```http
POST /api/comfyui/generate
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "prompt": "A beautiful sunset...",
  "workflow": { /* ComfyUI workflow JSON */ },
  "referenceImage": "data:image/png;base64,...", // optional
  "priority": 5 // 1-10, default 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Job queued successfully",
  "data": {
    "jobId": "job-1234567890",
    "position": 2,
    "status": "queued"
  }
}
```

### Check Job Status

```http
GET /api/comfyui/job/:jobId
Authorization: Bearer <firebase-id-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "job-1234567890",
    "state": "completed",
    "progress": 100,
    "result": {
      "imageUrl": "https://...",
      "imageData": "data:image/png;base64,...",
      "processingTime": 5420
    }
  }
}
```

### Worker Stats

```http
GET /api/comfyui/workers
Authorization: Bearer <firebase-id-token>
```

### Queue Stats

```http
GET /api/queue/stats
Authorization: Bearer <firebase-id-token>
```

### Health Check

```http
GET /health
GET /health/detailed
```

## 🔧 Configuration

### ComfyUI Workers

รองรับหลาย ComfyUI instance:

```env
# Single worker
COMFYUI_WORKERS=http://localhost:8188

# Multiple workers (GPU pool)
COMFYUI_WORKERS=http://gpu1:8188,http://gpu2:8188,http://gpu3:8188
```

### Queue Concurrency

```env
# จำนวน job ที่ process พร้อมกัน
QUEUE_CONCURRENCY=3
```

### Redis

```env
# แบบ URL
REDIS_URL=redis://username:password@host:port

# แบบแยก
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t peace-comfyui-service .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

**Services:**

- `redis`: Queue backend (port 6379)
- `comfyui-service`: API server (port 8000)

### Logs

```bash
docker-compose logs -f comfyui-service
```

## ☁️ Cloud Deployment

### Google Cloud Run

```bash
# Build for Cloud Run
gcloud builds submit --tag gcr.io/peace-script-ai/comfyui-service

# Deploy
gcloud run deploy comfyui-service \
  --image gcr.io/peace-script-ai/comfyui-service \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars COMFYUI_WORKERS=https://your-comfyui-workers
```

### Kubernetes (GKE)

```bash
# Deploy to GKE
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## 🧪 Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

## 📊 Monitoring

### Worker Health

```bash
curl http://localhost:8000/health/detailed
```

### Queue Status

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/queue/stats
```

## 🔐 Security

- ✅ Firebase Authentication required
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Environment variables for secrets

## 🛠️ Troubleshooting

### Worker not connecting

```bash
# ตรวจสอบ ComfyUI running
curl http://localhost:8188/system_stats

# ตรวจสอบ firewall
# ตรวจสอบ COMFYUI_WORKERS URL ใน .env
```

### Redis connection failed

```bash
# ตรวจสอบ Redis running
redis-cli ping

# หรือใช้ Docker
docker-compose ps redis
```

### Job stuck in queue

```bash
# ดู queue stats
curl http://localhost:8000/api/queue/stats

# ดู worker stats
curl http://localhost:8000/api/comfyui/workers
```

## 📝 License

MIT

## 🎬 Peace Script Team

สร้างด้วย ❤️ สำหรับ Peace Script AI
