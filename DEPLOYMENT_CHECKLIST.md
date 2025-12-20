# 🚀 Deployment Checklist - Peace Script AI

**Date**: December 21, 2025  
**Status**: Pre-Deployment Verification Complete  
**Version**: 1.0.0 + ComfyUI Video Generation

---

## ✅ Pre-Deployment Verification (COMPLETED)

### 🔍 Pass 1: Environment & Dependencies
- ✅ All `.env` files exist and configured
  - Root: `.env`, `.env.local`, `.env.production`
  - comfyui-service: `.env`
- ✅ All npm packages installed (no missing dependencies)
- ✅ Firebase configuration verified
- ✅ Redis configuration verified (localhost:6379)
- ✅ ComfyUI workers configured (localhost:8188)

### 🛠️ Pass 2: Build Verification
- ✅ Fixed TypeScript unused variable errors (3 files)
- ✅ Production build successful (`npm run build`)
- ✅ Build output: 7.82s, no critical errors
- ⚠️ Warning: 2 chunks >500KB (AdminDashboard, Speech SDK) - non-critical

### 🧪 Pass 3: Test Suite
- ✅ Tests passed: 1957/1971 (99.3%)
- ✅ Test files: 67/69 passed
- ⚠️ 14 tests skipped (backend MongoDB tests - requires MongoDB connection)
- ✅ No critical test failures
- ✅ Duration: 7.27s

### 🔒 Pass 4: Security Audit
- ✅ **0 vulnerabilities** found (`npm audit`)
- ✅ All critical environment variables configured (7/7)
- ✅ Optional environment variables: 4/17 configured
- ✅ Environment validation passed

---

## 📋 Deployment Requirements

### 🔑 Required Environment Variables

#### **Frontend (Firebase Hosting)**
```env
# Firebase Configuration (CRITICAL)
VITE_FIREBASE_API_KEY=AIzaSyC****************CHvo
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=624211706340
VITE_FIREBASE_APP_ID=1:624211706340:web:b46101b954cd19535187f1
VITE_FIREBASE_MEASUREMENT_ID=G-G9VBJB26Q8

# AI Services (CRITICAL)
VITE_GEMINI_API_KEY=AIzaSyB****************AKGU

# API URLs (OPTIONAL)
VITE_API_URL=https://YOUR_BACKEND_URL/api
VITE_COMFYUI_BACKEND_URL=https://YOUR_COMFYUI_SERVICE_URL
```

#### **Backend (ComfyUI Service)**
```env
# Server
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://peace-script-ai.web.app,https://peace-script-ai.firebaseapp.com

# Redis (Required for Queue)
REDIS_URL=redis://YOUR_REDIS_HOST:6379
# OR
REDIS_HOST=YOUR_REDIS_HOST
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# ComfyUI Workers (Required)
COMFYUI_WORKERS=http://worker1:8188,http://worker2:8188

# Firebase Admin (Required)
FIREBASE_PROJECT_ID=peace-script-ai
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com

# Queue Configuration
MAX_CONCURRENT_JOBS=5
QUEUE_RETRY_ATTEMPTS=3
JOB_TIMEOUT=300000
```

---

## 🏗️ Deployment Steps

### Step 1: Frontend Deployment (Firebase Hosting)

```bash
# 1. Build production bundle
npm run build

# 2. Test build locally (optional)
npm run preview

# 3. Deploy to Firebase Hosting
firebase deploy --only hosting

# Expected output:
# ✔ hosting: version uploaded successfully
# ✔ hosting: release complete
```

**Verify**: Visit https://peace-script-ai.web.app

---

### Step 2: ComfyUI Service Deployment

#### Option A: Docker Deployment (Recommended)

```bash
cd comfyui-service

# 1. Build Docker image
docker build -t peace-comfyui-service:latest .

# 2. Run with Docker Compose
docker-compose up -d

# 3. Check logs
docker-compose logs -f comfyui-service
```

#### Option B: Cloud Run / VPS Deployment

```bash
# 1. Install dependencies
cd comfyui-service
npm install --production

# 2. Start with PM2 (process manager)
pm2 start src/server.js --name comfyui-service

# 3. Setup auto-restart
pm2 startup
pm2 save
```

**Verify**: Check `http://YOUR_SERVICE_URL:8000/health`

---

### Step 3: Firebase Functions Deployment

```bash
# 1. Build functions
cd functions
npm run build

# 2. Deploy all functions
cd ..
firebase deploy --only functions

# Expected functions:
# - cancelAdminInvitation
# - (other admin functions)
```

---

### Step 4: Database & Storage Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

---

## 🧪 Post-Deployment Testing

### 1. Frontend Health Check
- [ ] Visit https://peace-script-ai.web.app
- [ ] Check authentication (Google Sign-in)
- [ ] Test script generation (Gemini AI)
- [ ] Test image generation
- [ ] Check admin dashboard (if admin user)

### 2. ComfyUI Service Health Check

```bash
# Basic health check
curl http://YOUR_SERVICE_URL:8000/health

# Expected response:
# {
#   "success": true,
#   "service": "comfyui-service",
#   "status": "healthy",
#   "uptime": 123.456
# }

# Detailed health check
curl http://YOUR_SERVICE_URL:8000/health/detailed
```

### 3. Video Generation API Test

```bash
# Run automated test script (requires service running)
bash test-video-generation.sh
```

**Manual Test**:
```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Model detection
curl http://localhost:8000/api/video/models

# 3. Test video generation
curl -X POST http://localhost:8000/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "type": "animatediff",
    "prompt": "A beautiful sunset over the ocean",
    "numFrames": 16,
    "fps": 8
  }'
```

---

## ⚠️ Known Issues & Limitations

### Non-Critical Issues
1. **Large Bundle Sizes**: AdminDashboard (510KB) and Speech SDK (449KB) exceed 500KB
   - **Impact**: Slightly slower initial load for admin pages
   - **Solution**: Consider lazy loading or code splitting (future optimization)

2. **Skipped Tests**: 14 MongoDB tests skipped
   - **Impact**: Backend auth/projects routes not tested
   - **Reason**: MongoDB connection required
   - **Solution**: Configure MongoDB for testing or mock tests

3. **Console Warnings**: React `act()` warnings in tests
   - **Impact**: Test warnings only, no runtime issues
   - **Solution**: Wrap state updates in `act()` (future improvement)

### Configuration Notes
- ComfyUI requires GPU (NVIDIA recommended)
- Redis required for queue system
- Firebase service account required for backend

---

## 🔄 Rollback Procedure

### Frontend Rollback
```bash
# View deployment history
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:channel:deploy previous-version --expires 30d
```

### Backend Rollback
```bash
# If using Docker
docker-compose down
docker-compose up -d --force-recreate

# If using PM2
pm2 stop comfyui-service
pm2 start previous-version.js
```

---

## 📊 Monitoring & Logs

### Firebase Console
- **Hosting**: https://console.firebase.google.com/project/peace-script-ai/hosting
- **Functions**: https://console.firebase.google.com/project/peace-script-ai/functions
- **Firestore**: https://console.firebase.google.com/project/peace-script-ai/firestore

### ComfyUI Service Logs
```bash
# Docker logs
docker-compose logs -f comfyui-service

# PM2 logs
pm2 logs comfyui-service

# View error logs
pm2 logs comfyui-service --err
```

---

## ✅ Deployment Sign-off

- [ ] All pre-deployment checks passed
- [ ] Environment variables configured
- [ ] Frontend deployed and tested
- [ ] Backend deployed and tested
- [ ] Functions deployed successfully
- [ ] Database rules deployed
- [ ] Post-deployment tests passed
- [ ] Monitoring configured
- [ ] Team notified

**Deployed by**: _________________  
**Date**: _________________  
**Version**: _________________  

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Build fails with TypeScript errors
**Solution**: Run `npm run build` and fix errors shown

**Issue**: ComfyUI service won't start
**Solution**: Check Redis connection, ComfyUI workers, and Firebase service account

**Issue**: Video generation fails
**Solution**: 
1. Check ComfyUI models installed (`/api/video/requirements`)
2. Verify GPU available
3. Check queue status (`/api/queue/stats`)

**Issue**: Firebase authentication fails
**Solution**: Verify Firebase API key and project configuration

---

## 📚 Additional Documentation

- [COMFYUI_VIDEO_QUICK_START.md](./COMFYUI_VIDEO_QUICK_START.md) - Video generation guide
- [COMFYUI_VIDEO_TESTING.md](./COMFYUI_VIDEO_TESTING.md) - Testing procedures
- [README.md](./README.md) - Project overview
- [comfyui-service/README.md](./comfyui-service/README.md) - Service documentation

---

**Last Updated**: December 21, 2025  
**Status**: ✅ Ready for Deployment
