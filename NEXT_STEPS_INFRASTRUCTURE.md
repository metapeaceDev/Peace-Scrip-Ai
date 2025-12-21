# Testing and Production Deployment Next Steps

## Current Status ✅

**Testing Infrastructure**: Created and configured
- ✅ Vitest installed and configured
- ✅ Unit tests created (loadBalancer.test.js)
- ✅ Integration tests created (integration-failover.test.js)
- ✅ Load testing script created (load-test.ts)

**Issue Found**: The tests require the actual load balancer to be fully integrated with the worker manager. The current error is due to module resolution.

---

## Immediate Actions Required

### 1. Fix Test Setup (5 minutes)

The tests need the actual services to be properly initialized. Since this is a complex integration test, I recommend:

**Option A: Run Integration Tests After Service is Running**
```bash
# Start the ComfyUI service first
cd comfyui-service
npm start

# In another terminal, run specific tests
npm run test:integration
```

**Option B: Create Simplified Unit Tests**
Create standalone tests that don't require the full service:
- Test configuration parsing
- Test scoring algorithm logic
- Test cost calculations

### 2. Infrastructure Setup (60 minutes)

You need to create accounts and get API keys for these services:

#### A. Firebase Setup ⭐ **REQUIRED**
1. **Create Firebase Project**
   - Go to: https://console.firebase.google.com/
   - Click "Add project"
   - Project name: `peace-script-ai` (or your preferred name)
   - Disable Google Analytics (optional)
   - Click "Create project"

2. **Enable Services**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login
   firebase login
   
   # Initialize services
   cd c:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
   firebase init firestore
   firebase init storage
   firebase init functions
   ```

3. **Get Configuration**
   - Go to: Project Settings > General
   - Under "Your apps" > Web app > Config
   - Copy the config object
   - Add to `.env` file

4. **Generate Service Account Key** (Backend)
   - Go to: Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `service-account-key.json`
   - **⚠️ DO NOT commit this file to Git**

5. **Configure Firestore Rules**
   - Go to: Firestore Database > Rules
   - Use the rules from `firestore.rules` file

6. **Configure Storage Rules**
   - Go to: Storage > Rules
   - Use the rules from `storage.rules` file

#### B. Redis Setup ⭐ **REQUIRED**
**Option 1: Redis Cloud (Recommended - Free Tier)**
1. Go to: https://redis.com/try-free/
2. Sign up for free account
3. Create database:
   - Name: `peace-script-queue`
   - Cloud: AWS
   - Region: Closest to you
   - Plan: Free (30MB)
4. Copy connection string
5. Add to `.env`:
   ```
   REDIS_URL=redis://default:password@host:port
   ```

**Option 2: Local Redis**
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
# Start Redis
redis-server

# Add to .env
REDIS_URL=redis://localhost:6379
```

#### C. RunPod Setup 💰 **Pay-as-you-go**
1. **Create Account**
   - Go to: https://www.runpod.io/
   - Sign up and verify email
   - Add payment method (credit card)

2. **Get API Key**
   - Go to: Settings > API Keys
   - Click "Create API Key"
   - Name: `peace-script-api`
   - Permissions: `pod.create`, `pod.delete`, `pod.read`
   - Copy the API key

3. **Add to .env**
   ```
   RUNPOD_API_KEY=your-api-key-here
   ```

4. **Optional: Deploy Serverless Endpoint**
   - Go to: Serverless > Endpoints
   - Create new endpoint
   - Use Docker image: Your ComfyUI image
   - Copy endpoint ID
   ```
   RUNPOD_SERVERLESS_ENDPOINT_ID=your-endpoint-id
   ```

#### D. Gemini API Setup 🎯 **REQUIRED**
1. **Get API Key**
   - Go to: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. **Add to .env**
   ```
   GEMINI_API_KEY=your-gemini-api-key
   ```

### 3. Environment Configuration (10 minutes)

#### Frontend .env
Create `peace-script-basic-v1/.env`:
```bash
# API Endpoints
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_COMFYUI_LOCAL_URL=http://localhost:8188

# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc

# AI APIs
VITE_GEMINI_API_KEY=AIza...

# Features
VITE_ENABLE_LOCAL_COMFYUI=true
VITE_ENABLE_CLOUD_WORKERS=true
```

#### Backend .env
Update `comfyui-service/.env`:
```bash
# Server Configuration
NODE_ENV=development
PORT=8000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# ComfyUI Workers
COMFYUI_WORKERS=http://localhost:8188
QUEUE_CONCURRENCY=3
VIDEO_QUEUE_CONCURRENCY=1

# RunPod Cloud Workers
RUNPOD_API_KEY=your-key
RUNPOD_SERVERLESS_ENDPOINT_ID=your-endpoint
RUNPOD_GPU_TYPE=NVIDIA RTX 3090
CLOUD_PREFER_SERVERLESS=true
CLOUD_MAX_PODS=5
CLOUD_IDLE_TIMEOUT=300000
CLOUD_AUTOSCALE_THRESHOLD=5

# Gemini API
GEMINI_API_KEY=your-key

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Monitoring (Optional)
SENTRY_DSN=
LOG_LEVEL=info
DAILY_COST_THRESHOLD=10
```

### 4. Local Testing (15 minutes)

After setting up infrastructure:

```bash
# 1. Start Redis (if local)
redis-server

# 2. Start ComfyUI Service
cd comfyui-service
npm install
npm start
# Should see: "ComfyUI Service running on port 8000"

# 3. Test health endpoint
curl http://localhost:8000/health
# Expected: {"status":"ok","timestamp":"..."}

# 4. Test load balancer status
curl http://localhost:8000/api/loadbalancer/status

# 5. Start Frontend
cd ..
npm install
npm run dev
# Open: http://localhost:5173
```

### 5. Deploy to Production (Follow guides)

Once local testing works:

1. **Frontend Deployment**
   - Follow: `PRODUCTION_DEPLOYMENT_GUIDE.md` Section "Frontend Deployment"
   - Recommended: Netlify or Vercel

2. **Backend Deployment**
   - Follow: `PRODUCTION_DEPLOYMENT_GUIDE.md` Section "Backend Deployment"
   - Recommended: Railway or Heroku

3. **Monitoring Setup**
   - Follow: `MONITORING_SETUP.md`
   - Set up health checks, metrics, alerts

---

## Quick Start Checklist

- [ ] **Firebase**: Create project, get config, enable Firestore/Storage
- [ ] **Redis**: Sign up for Redis Cloud OR install locally
- [ ] **RunPod**: Create account, get API key (optional - for cloud scaling)
- [ ] **Gemini**: Get API key from Google AI Studio
- [ ] **Environment**: Configure .env files (frontend + backend)
- [ ] **Install**: Run `npm install` in both root and comfyui-service
- [ ] **Test Local**: Start Redis, backend, frontend
- [ ] **Verify**: Check all endpoints work
- [ ] **Deploy**: Follow production guides
- [ ] **Monitor**: Set up monitoring

---

## Cost Estimate for Infrastructure

### Free Tier (Development)
- **Firebase**: Free (Spark plan)
- **Redis Cloud**: Free (30MB)
- **Gemini API**: Free quota (60 requests/minute)
- **Netlify/Vercel**: Free tier
- **Total**: $0/month

### Production (Pay-as-you-go)
- **Firebase**: ~$5-25/month (depending on usage)
- **Redis Cloud**: $0 (free tier) or $10/month (250MB)
- **RunPod**: $0.007 per video (only when used)
- **Gemini API**: $0.08 per video (only when used)
- **Backend Hosting**: $5-10/month (Railway/Heroku)
- **Total**: ~$10-40/month + usage costs

### Estimated Usage Costs
- 100 videos/day with hybrid system: ~$0.46/day = $13.80/month
- 100 videos/day with 100% Gemini: ~$8/day = $240/month
- **Savings**: $226.20/month (94.3%)

---

## Support Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Redis Docs**: https://redis.io/docs/
- **RunPod Docs**: https://docs.runpod.io/
- **Gemini API**: https://ai.google.dev/docs

- **Production Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Monitoring Guide**: `MONITORING_SETUP.md`
- **Phase 7 Summary**: `PHASE_7_COMPLETE.md`

---

## Next Steps

1. **Today**: Set up Firebase + Redis (30 min)
2. **Today**: Configure environment variables (10 min)
3. **Today**: Test locally (15 min)
4. **Tomorrow**: Get RunPod API key (if needed)
5. **Next week**: Deploy to production

**Start with Firebase and Redis - these are required for the system to run!**
