# 🚀 Quick Start Guide - ComfyUI Backend Service

## Overview

This guide helps you get the ComfyUI Backend Service running in **5 minutes**.

---

## Prerequisites

- Node.js 18+ installed
- Docker installed (for Redis)
- Firebase project setup
- ComfyUI instance with GPU (local or cloud)

---

## Step 1: Setup Backend Service

```bash
# Navigate to service directory
cd comfyui-service

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Step 2: Configure Environment

Edit `.env`:

```env
# Server
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# ComfyUI Workers (comma-separated URLs)
COMFYUI_WORKERS=http://localhost:8188
HEALTH_CHECK_INTERVAL=30000

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=./service-account.json

# IMPORTANT: Bucket name must be the exact Storage bucket name.
# Depending on your Firebase project, this is commonly either:
# - <project-id>.appspot.com
# - <project-id>.firebasestorage.app
FIREBASE_STORAGE_BUCKET=<your-bucket-name>

# URL mode for Storage results:
# - token: permanent link (recommended) (no expiry)
# - public: permanent public URL via object ACLs (may fail when UBLA is enabled)
# - signed: signed URL (expires)
FIREBASE_STORAGE_URL_MODE=token

# Default behavior returns a Signed URL after upload (works with private buckets / UBLA).
FIREBASE_STORAGE_MAKE_PUBLIC=false
FIREBASE_SIGNED_URL_TTL_HOURS=168
# OR use individual keys:
# FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# LoRA Models (optional)
LORA_CHARACTER_CONSISTENCY=character_consistency_v1.safetensors
LORA_CINEMATIC_STYLE=cinematic_film_v2.safetensors
```

## Step 3: Setup Firebase Service Account

### Option A: Download Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Save as `comfyui-service/service-account.json`

### Option B: Use Environment Variables

```bash
# Set in .env
FIREBASE_CLIENT_EMAIL=your-service@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Step 4: Start Redis

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# OR using Docker directly
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Verify Redis is running
docker ps | grep redis
```

## Step 5: Setup ComfyUI Worker

### Option A: Local GPU Machine

```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Download models (SDXL base)
cd models/checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# Install LoRA models (optional)
cd ../loras
# Download from Civitai or HuggingFace

# Start ComfyUI
cd ../..
python main.py --listen 0.0.0.0 --port 8188
```

### Option B: Docker with GPU

```bash
docker run -d --gpus all -p 8188:8188 \
  -v /path/to/models:/app/models \
  comfyanonymous/comfyui
```

### Option C: Cloud GPU (RunPod, Vast.ai)

1. Create GPU instance
2. Install ComfyUI (see Option A)
3. Get external IP/URL
4. Add to `.env`: `COMFYUI_WORKERS=http://YOUR_IP:8188`

## Step 6: Start Backend Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Expected output:

```
🚀 Server running on port 8000
✅ Redis connected
✅ Firebase initialized
🔧 Worker Manager initialized
📊 Queue system ready
🎯 1 ComfyUI workers configured
```

## Step 7: Verify Service

### Check Health

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "success": true,
  "timestamp": "2025-01-...",
  "uptime": 123.45
}
```

### Check Workers

```bash
curl http://localhost:8000/api/comfyui/workers
```

Expected response:

```json
{
  "success": true,
  "data": {
    "totalWorkers": 1,
    "healthyWorkers": 1,
    "workers": [
      {
        "url": "http://localhost:8188",
        "healthy": true,
        "lastCheck": "2025-01-..."
      }
    ]
  }
}
```

---

## Step 8: Setup Frontend

```bash
# Navigate to frontend directory
cd ..  # Back to project root

# Update .env.local
echo "VITE_COMFYUI_SERVICE_URL=http://localhost:8000" >> .env.local
echo "VITE_USE_COMFYUI_BACKEND=true" >> .env.local

# Start frontend
npm run dev
```

---

## Step 9: Test Image Generation

### Via Frontend

1. Open http://localhost:5173
2. Login or skip
3. Create new project
4. Generate character image
5. Check ComfyUI Status widget

### Via API (cURL)

```bash
# Get Firebase ID token first (from browser console)
TOKEN="your-firebase-id-token"

# Generate image (async)
curl -X POST http://localhost:8000/api/comfyui/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "A cinematic portrait of a Thai warrior, 4K, detailed",
    "workflow": {},
    "priority": 5
  }'

# Response: { "data": { "jobId": "abc123..." } }

# Check status
curl http://localhost:8000/api/comfyui/job/abc123... \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Success Checklist

After setup, verify:

- [ ] Redis running on port 6379
- [ ] ComfyUI running on port 8188 (or cloud URL)
- [ ] Backend service running on port 8000
- [ ] Health check returns 200 OK
- [ ] Workers show healthy status
- [ ] Frontend can connect to backend
- [ ] ComfyUI Status widget shows "Online"
- [ ] Image generation works end-to-end

---

## 🐛 Troubleshooting

### Redis Connection Error

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Expected: PONG

# Restart Redis
docker-compose restart redis
```

### ComfyUI Worker Unhealthy

```bash
# Check ComfyUI is running
curl http://localhost:8188/system_stats
# Should return JSON

# Check firewall
# Ensure port 8188 is accessible

# Restart ComfyUI
# Kill process and restart
```

### Firebase Auth Error

```bash
# Verify service account file exists
ls -la service-account.json

# Check Firebase project ID
grep FIREBASE_PROJECT_ID .env

# Test Firebase Admin SDK
node -e "require('./src/config/firebase'); console.log('✅ Firebase OK')"
```

### CORS Error

```bash
# Check CORS_ORIGIN in .env matches frontend URL
# Default: http://localhost:5173

# For multiple origins
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### "No healthy workers" Error

```bash
# Check worker URL is correct
curl http://localhost:8188/system_stats

# Check health check logs
# Look for errors in service console

# Manually trigger health check
curl http://localhost:8000/health/detailed
```

---

## 📊 Monitoring

### View Logs

```bash
# Backend service logs
npm run dev
# Watch console output

# Redis logs
docker logs redis -f

# ComfyUI logs
tail -f ComfyUI/comfyui.log
```

### Queue Stats

```bash
curl http://localhost:8000/api/queue/stats
```

### Worker Stats

```bash
curl http://localhost:8000/api/comfyui/workers
```

---

## 🚀 Production Deployment

Once everything works locally, deploy to production:

1. **Deploy Backend**: See [DEPLOYMENT.md](../DEPLOYMENT.md)
2. **Deploy Frontend**: Update `VITE_COMFYUI_SERVICE_URL` to production URL
3. **Setup GPU Workers**: Cloud GPU instances
4. **Configure Redis**: Cloud Memorystore or Redis Cloud
5. **Enable Monitoring**: Cloud Logging, Sentry, etc.

---

## 📚 Next Steps

- [ ] Read full [Backend README](./README.md)
- [ ] Review [API Documentation](./README.md#api-endpoints)
- [ ] Setup monitoring and logging
- [ ] Configure auto-scaling
- [ ] Add more GPU workers
- [ ] Install additional LoRA models
- [ ] Setup CI/CD pipeline
- [ ] Load testing

---

## 🆘 Need Help?

- **Documentation**: [README.md](./README.md)
- **Issues**: GitHub Issues
- **Discord**: [Peace Script Community](#)

---

**Estimated Setup Time**: 5-10 minutes  
**Difficulty**: Beginner-Intermediate  
**Requirements**: Node.js, Docker, Firebase account
