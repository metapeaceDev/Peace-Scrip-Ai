# 🎯 Testing & Deployment Status

## Summary

**Tests Status**: ⚠️ Needs infrastructure setup  
**Infrastructure Status**: ✅ Environment files exist, needs service configuration  
**Deployment Status**: ⏳ Ready to deploy after infrastructure setup

---

## ✅ What's Complete

### 1. Testing Infrastructure
- ✅ Unit tests created (`tests/loadBalancer.test.js`)
- ✅ Integration tests created (`tests/integration-failover.test.js`)
- ✅ Load testing script created (`tests/load-test.ts`)
- ✅ Vitest installed and configured
- ✅ Test scripts added to package.json

### 2. Documentation
- ✅ Production Deployment Guide (`PRODUCTION_DEPLOYMENT_GUIDE.md`)
- ✅ Monitoring Setup Guide (`MONITORING_SETUP.md`)
- ✅ Phase 7 Complete Summary (`PHASE_7_COMPLETE.md`)
- ✅ Infrastructure Setup Guide (`NEXT_STEPS_INFRASTRUCTURE.md`)
- ✅ Verification scripts (`.bat` and `.ps1`)

### 3. Environment
- ✅ Frontend `.env` file exists
- ✅ Backend `.env` file exists
- ✅ Node.js v24.12.0 installed
- ✅ npm installed

---

## ⏳ What Needs Setup

### Required for Testing
The tests cannot run until these services are configured:

1. **Redis** (Required)
   - Option A: Redis Cloud (free tier) - https://redis.com/try-free/
   - Option B: Local Redis installation
   - Update `REDIS_URL` in `comfyui-service/.env`

2. **Firebase** (Required)
   - Create project at https://console.firebase.google.com/
   - Enable Firestore and Storage
   - Get service account key
   - Update Firebase config in `.env` files

3. **Gemini API** (Required for video generation)
   - Get API key from https://makersuite.google.com/app/apikey
   - Update `GEMINI_API_KEY` in `.env` files

4. **RunPod** (Optional - for cloud scaling)
   - Create account at https://www.runpod.io/
   - Get API key from Settings > API Keys
   - Update `RUNPOD_API_KEY` in `comfyui-service/.env`

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Firebase Setup (30 minutes)

**A. Create Firebase Project**
```bash
1. Go to: https://console.firebase.google.com/
2. Click "Add project"
3. Name: peace-script-ai
4. Disable Google Analytics (optional)
5. Click "Create project"
```

**B. Enable Services**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize in project directory
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
firebase init

# Select:
# - Firestore
# - Storage  
# - Functions
```

**C. Get Web Config**
```
1. Go to: Project Settings > General
2. Scroll to "Your apps" section
3. Click "Web" icon (</>)
4. Register app: "Peace Script AI"
5. Copy the config object
6. Update frontend .env with values
```

**D. Get Service Account Key (Backend)**
```
1. Go to: Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save as: comfyui-service/service-account-key.json
4. ⚠️ DO NOT commit this file
5. Extract values for .env:
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY (the entire key with \n)
   - FIREBASE_CLIENT_EMAIL
```

**E. Deploy Security Rules**
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

### Step 2: Redis Setup (10 minutes)

**Option A: Redis Cloud (Recommended)**
```
1. Go to: https://redis.com/try-free/
2. Sign up (free account)
3. Create database:
   - Name: peace-script-queue
   - Cloud: AWS
   - Region: us-east-1 (or closest)
   - Plan: Free 30MB
4. Go to database > Configuration
5. Copy "Public endpoint"
6. Update comfyui-service/.env:
   REDIS_URL=redis://default:password@endpoint:port
```

**Option B: Local Redis**
```powershell
# Install Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL:
wsl --install
wsl
sudo apt-get install redis-server
redis-server

# Update .env:
REDIS_URL=redis://localhost:6379
```

### Step 3: Gemini API (5 minutes)

```
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select project (or create new)
4. Copy the API key
5. Update both .env files:
   GEMINI_API_KEY=AIza...your-key...
```

### Step 4: RunPod (Optional - 10 minutes)

```
1. Go to: https://www.runpod.io/
2. Sign up and verify email
3. Add payment method (credit card)
4. Go to: Settings > API Keys
5. Create API key with permissions:
   - pod.create
   - pod.delete
   - pod.read
6. Copy API key
7. Update comfyui-service/.env:
   RUNPOD_API_KEY=your-key-here
```

### Step 5: Install Dependencies

```bash
# Frontend dependencies
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
npm install

# Backend dependencies
cd comfyui-service
npm install
```

### Step 6: Start Services

```bash
# Terminal 1: Start Redis (if local)
redis-server

# Terminal 2: Start Backend
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service
npm start
# Should see: "ComfyUI Service running on port 8000"

# Terminal 3: Start Frontend
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
npm run dev
# Should see: "Local: http://localhost:5173"
```

### Step 7: Verify Setup

```bash
# Test backend health
curl http://localhost:8000/health
# Expected: {"status":"ok","timestamp":"..."}

# Test load balancer
curl http://localhost:8000/api/loadbalancer/status

# Open frontend
# http://localhost:5173
```

### Step 8: Run Tests

```bash
# Run all tests
cd comfyui-service
npm test

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage
```

---

## 🚀 Quick Start (Minimal Setup)

For fastest testing with minimal setup:

```bash
# 1. Setup Redis Cloud (10 min) - FREE
https://redis.com/try-free/
Update: REDIS_URL in comfyui-service/.env

# 2. Setup Gemini API (5 min) - FREE
https://makersuite.google.com/app/apikey
Update: GEMINI_API_KEY in both .env files

# 3. Skip Firebase temporarily
# Comment out Firebase code in backend for testing

# 4. Install & Start
npm install
cd comfyui-service
npm install
npm start

# 5. Test
npm test
```

---

## 💰 Cost Summary

### Free Tier (Good for testing)
- Firebase Spark Plan: FREE
- Redis Cloud 30MB: FREE
- Gemini API: FREE (60 requests/min)
- **Total: $0/month**

### Production (Pay-as-you-go)
- Firebase Blaze: ~$5-25/month
- Redis Cloud: FREE or $10/month (250MB)
- RunPod: $0.007 per video (only when used)
- Gemini: $0.08 per video (only when used)
- Hosting: $5-10/month
- **Total: ~$10-40/month + usage**

### Usage Costs (100 videos/day)
- Hybrid System: ~$0.46/day = $13.80/month
- 100% Gemini: ~$8/day = $240/month
- **Savings: $226/month (94.3%)**

---

## 🆘 Troubleshooting

### Tests Won't Run
**Issue**: Module resolution errors  
**Fix**: Ensure dependencies installed: `cd comfyui-service && npm install`

### "Cannot connect to Redis"
**Issue**: Redis not running or URL incorrect  
**Fix**: 
- Check Redis Cloud connection string
- OR start local Redis: `redis-server`
- Verify REDIS_URL in .env

### "Firebase admin error"
**Issue**: Service account not configured  
**Fix**: 
- Download service account JSON from Firebase Console
- Extract values to .env file
- Ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL are set

### "Gemini API error"
**Issue**: API key invalid or missing  
**Fix**: 
- Get new key from https://makersuite.google.com/app/apikey
- Update GEMINI_API_KEY in .env
- Ensure no spaces or quotes in key

### Backend won't start
**Issue**: Port 8000 already in use  
**Fix**: 
- Stop other process on port 8000
- Or change PORT in .env

---

## 📚 Documentation Reference

- **Setup Guide**: `NEXT_STEPS_INFRASTRUCTURE.md`
- **Production Deployment**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Monitoring Setup**: `MONITORING_SETUP.md`
- **Phase 7 Summary**: `PHASE_7_COMPLETE.md`
- **Verification Script**: `verify-setup.bat` or `verify-setup.ps1`

---

## ✅ Current Status Checklist

Run `verify-setup.bat` to check current status.

**Completed**:
- [x] Tests created
- [x] Documentation complete
- [x] Environment files exist
- [x] Node.js installed
- [x] Verification scripts ready

**Pending**:
- [ ] Redis configured
- [ ] Firebase configured
- [ ] Gemini API key added
- [ ] RunPod API key added (optional)
- [ ] Dependencies installed
- [ ] Services started
- [ ] Tests passing

---

## 🎯 Priority Actions (Today)

1. **Setup Redis Cloud** (10 minutes) - ⭐ REQUIRED
   - Free tier available
   - No credit card needed
   - https://redis.com/try-free/

2. **Get Gemini API Key** (5 minutes) - ⭐ REQUIRED  
   - Free quota available
   - https://makersuite.google.com/app/apikey

3. **Install Dependencies** (5 minutes)
   ```bash
   npm install
   cd comfyui-service && npm install
   ```

4. **Start & Test** (5 minutes)
   ```bash
   cd comfyui-service
   npm start
   # In another terminal:
   npm test
   ```

**Total Time**: ~25 minutes to get testing!

---

## 📞 Need Help?

- Firebase Help: https://firebase.google.com/support
- Redis Help: https://redis.io/docs/getting-started/
- Gemini API: https://ai.google.dev/docs

---

*Last updated: December 21, 2025*  
*Status: Ready for infrastructure setup*
