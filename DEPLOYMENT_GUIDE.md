# Peace Script AI - Production Deployment Guide

**Version:** 1.0  
**Last Updated:** December 18, 2024  
**Status:** Production Ready  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Configuration](#backend-configuration)
5. [Database Setup](#database-setup)
6. [Cloud Infrastructure](#cloud-infrastructure)
7. [Verification & Testing](#verification--testing)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts
- [ ] Firebase account with Blaze plan
- [ ] Google Cloud Platform account (for Gemini API)
- [ ] RunPod account (optional, for cloud GPU)
- [ ] Domain name (optional, for custom domain)

### Required Tools
```bash
# Node.js 18 or higher
node --version  # Should be >= 18.0.0

# npm or yarn
npm --version   # Should be >= 9.0.0

# Firebase CLI
npm install -g firebase-tools
firebase --version

# Git
git --version
```

### Required API Keys
- [ ] Firebase project credentials
- [ ] Google Gemini API key
- [ ] RunPod API key (optional)

---

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local` file in the root directory:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# RunPod Configuration (Optional)
VITE_RUNPOD_API_KEY=your_runpod_api_key
VITE_RUNPOD_POD_ID=your_pod_id
VITE_RUNPOD_DOCKER_IMAGE=peace-script/comfyui:latest

# Local ComfyUI (Optional)
VITE_COMFYUI_LOCAL_URL=http://localhost:8188

# Application Settings
VITE_APP_MODE=production
VITE_DEFAULT_LANGUAGE=th
```

### 4. Verify Configuration
```bash
npm run build
```

If successful, you should see:
```
✓ built in XXXms
dist/index.html                   X.XX kB
dist/assets/index-XXXXX.js        XXX.XX kB
```

---

## Frontend Deployment

### Option 1: Firebase Hosting (Recommended)

#### Step 1: Initialize Firebase
```bash
firebase login
firebase init hosting
```

Select:
- [ ] Use an existing project
- [ ] Public directory: `dist`
- [ ] Configure as single-page app: `Yes`
- [ ] Set up automatic builds: `No`
- [ ] Overwrite index.html: `No`

#### Step 2: Build Production Bundle
```bash
npm run build
```

#### Step 3: Deploy to Firebase
```bash
firebase deploy --only hosting
```

#### Step 4: Verify Deployment
```bash
# Firebase will output your deployment URL
# Example: https://your-project.web.app

# Open in browser and verify:
# - Homepage loads
# - Authentication works
# - Script generation functional
```

### Option 2: Other Hosting Platforms

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### AWS S3 + CloudFront
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Backend Configuration

### 1. Firebase Authentication Setup

```bash
# Enable authentication methods
firebase auth:export auth-config.json
```

Enable in Firebase Console:
- [ ] Email/Password
- [ ] Google Sign-in
- [ ] Anonymous (optional)

### 2. Firestore Database

#### Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

#### Initialize Collections
Run this script once:
```javascript
// scripts/init-firestore.js
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Create initial collections
await db.collection('users').doc('_init').set({ created: new Date() });
await db.collection('projects').doc('_init').set({ created: new Date() });
await db.collection('analytics').doc('_init').set({ created: new Date() });

console.log('Firestore initialized');
```

### 3. Firebase Storage

Configure CORS for Firebase Storage:

Create `cors.json`:
```json
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://your-bucket-name.appspot.com
```

---

## Database Setup

### Firestore Collections Structure

```
firestore/
├── users/
│   └── {userId}/
│       ├── profile
│       ├── subscription
│       ├── usage
│       └── preferences
│
├── projects/
│   └── {projectId}/
│       ├── metadata
│       ├── script
│       ├── characters
│       └── videos
│
├── teams/
│   └── {teamId}/
│       ├── members
│       ├── projects
│       └── settings
│
└── analytics/
    └── {date}/
        ├── users
        ├── projects
        └── costs
```

### Initialize Database
```bash
node scripts/init-firestore.js
```

### Verify Database
```bash
firebase firestore:indexes
```

---

## Cloud Infrastructure

### Option 1: RunPod GPU Cloud (Recommended)

#### Step 1: Build Docker Image
```bash
cd /path/to/project
docker build -f runpod-comfyui.Dockerfile -t peace-script/comfyui:latest .
```

#### Step 2: Push to Registry
```bash
# Tag for Docker Hub
docker tag peace-script/comfyui:latest your-username/comfyui:latest

# Push
docker push your-username/comfyui:latest
```

#### Step 3: Deploy to RunPod
```bash
# Use deployment script
chmod +x scripts/deploy-runpod.sh
./scripts/deploy-runpod.sh
```

Or manually via RunPod Console:
1. Go to https://runpod.io
2. Create new pod
3. Select RTX 3090 GPU
4. Use Docker image: `your-username/comfyui:latest`
5. Expose port 8188
6. Deploy

#### Step 4: Update Environment Variables
```bash
# Get pod ID from RunPod dashboard
export VITE_RUNPOD_POD_ID=your-pod-id

# Update .env.local
echo "VITE_RUNPOD_POD_ID=$VITE_RUNPOD_POD_ID" >> .env.local
```

### Option 2: Local ComfyUI (Development/Testing)

#### Step 1: Install ComfyUI
```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI

# Install dependencies
pip install -r requirements.txt
```

#### Step 2: Download Models
```bash
# FLUX.1-schnell
cd models/checkpoints
wget https://huggingface.co/.../flux1-schnell.safetensors

# VAE
cd ../vae
wget https://huggingface.co/.../ae.safetensors

# Text Encoders
cd ../clip
wget https://huggingface.co/.../clip_l.safetensors
wget https://huggingface.co/.../t5xxl_fp16.safetensors
```

#### Step 3: Start ComfyUI
```bash
python main.py --listen 0.0.0.0 --port 8188
```

#### Step 4: Verify
```bash
curl http://localhost:8188/system_stats
```

---

## Verification & Testing

### 1. Frontend Verification
```bash
# Visit your deployed URL
open https://your-project.web.app

# Check:
# ✓ Homepage loads
# ✓ Login works
# ✓ Multi-language toggle works
# ✓ Script wizard accessible
```

### 2. Backend Verification
```bash
# Test Firebase connection
npm run test:firebase

# Test Gemini API
npm run test:gemini

# Test RunPod connection (if configured)
npm run test:runpod
```

### 3. End-to-End Testing
```bash
# Run full test suite
npm test -- --run

# Should see:
# ✓ 1,945 tests passing
# ✓ 0 tests failing
```

### 4. Manual Testing Checklist
- [ ] User registration
- [ ] User login
- [ ] Script generation (all 5 steps)
- [ ] Video generation (if GPU available)
- [ ] Buddhist psychology features
- [ ] Language switching
- [ ] Payment flow (if enabled)
- [ ] Team features
- [ ] Export functionality

---

## Monitoring & Maintenance

### 1. Firebase Console Monitoring

Monitor in Firebase Console:
- **Authentication:** Active users, sign-ins
- **Firestore:** Document reads/writes
- **Hosting:** Bandwidth, requests
- **Storage:** Files, bandwidth
- **Functions:** Invocations, errors

### 2. Application Monitoring

#### Setup Analytics
```typescript
// src/services/analytics.ts
import { logEvent } from 'firebase/analytics';

// Track user actions
logEvent(analytics, 'script_generated', {
  genre: 'comedy',
  length: 'medium'
});

logEvent(analytics, 'video_generated', {
  backend: 'cloud',
  cost: 0.02
});
```

#### Setup Error Tracking
```typescript
// src/services/errorTracking.ts
window.onerror = (message, source, lineno, colno, error) => {
  logEvent(analytics, 'error', {
    message,
    source,
    line: lineno
  });
};
```

### 3. Performance Monitoring

```bash
# Enable Firebase Performance
firebase deploy --only functions

# Monitor in Firebase Console:
# - Page load times
# - API response times
# - Resource loading
```

### 4. Cost Monitoring

```typescript
// Track costs in real-time
const costMetrics = backendManager.getLoadBalancerMetrics();

logEvent(analytics, 'cost_update', {
  totalCost: costMetrics.totalCost,
  activePods: costMetrics.activePods,
  requestsPerMinute: costMetrics.requestsPerMinute
});
```

---

## Troubleshooting

### Common Issues

#### 1. Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 2. Firebase Deployment Fails
```bash
# Check Firebase project
firebase use --add

# Verify configuration
firebase projects:list

# Re-deploy
firebase deploy --only hosting --debug
```

#### 3. API Connection Issues
```bash
# Test API endpoints
curl https://generativelanguage.googleapis.com/v1beta/models \
  -H "x-goog-api-key: $VITE_GEMINI_API_KEY"

# Check CORS settings
# Verify environment variables
echo $VITE_GEMINI_API_KEY
```

#### 4. RunPod Connection Issues
```bash
# Test pod health
curl https://your-pod-id-8188.proxy.runpod.net/health

# Check pod status
curl -X POST https://api.runpod.io/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VITE_RUNPOD_API_KEY" \
  -d '{"query": "query { pod(id: \"$POD_ID\") { status } }"}'
```

#### 5. Test Failures
```bash
# Run specific test file
npm test -- path/to/test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Clear test cache
npm test -- --clearCache
```

---

## Rollback Procedures

### Frontend Rollback

#### Firebase Hosting
```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Database Rollback

#### Firestore Rules
```bash
# Backup current rules
firebase firestore:rules > firestore.rules.backup

# Restore previous rules
firebase deploy --only firestore:rules
```

### Full System Rollback

```bash
# 1. Rollback frontend
firebase hosting:rollback

# 2. Restore database rules
firebase deploy --only firestore:rules

# 3. Stop RunPod pods (if needed)
curl -X POST https://api.runpod.io/graphql \
  -H "Authorization: Bearer $VITE_RUNPOD_API_KEY" \
  -d '{"query": "mutation { podStop(input: {podId: \"$POD_ID\"}) { id } }"}'

# 4. Clear cache
firebase hosting:channel:deploy preview
```

---

## Production Checklist

### Pre-Deployment
- [ ] All tests passing (1,945/1,945)
- [ ] Environment variables configured
- [ ] Firebase project created
- [ ] API keys obtained
- [ ] Build successful
- [ ] Documentation reviewed

### Deployment
- [ ] Frontend deployed to hosting
- [ ] Database rules deployed
- [ ] Storage CORS configured
- [ ] Authentication methods enabled
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### Post-Deployment
- [ ] Homepage accessible
- [ ] Authentication working
- [ ] Script generation functional
- [ ] Video generation tested
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backup strategy in place
- [ ] Team notified

### Ongoing Maintenance
- [ ] Monitor daily usage
- [ ] Review error logs
- [ ] Check cost metrics
- [ ] Update dependencies monthly
- [ ] Review security rules quarterly
- [ ] Performance optimization
- [ ] User feedback collection

---

## Support & Resources

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [RunPod Documentation](https://docs.runpod.io)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Project README](../README.md)

### Internal Documentation
- [RunPod Setup Guide](./RUNPOD_SETUP.md)
- [Phase 2.1 Report](../PHASE_2.1_RUNPOD_IMPLEMENTATION_REPORT.md)
- [Phase 2.2 Report](../PHASE_2.2_DEPLOYMENT_TESTING_REPORT.md)
- [Phase 2.3 Report](../PHASE_2.3_LOAD_BALANCING_REPORT.md)
- [Project Completion Report](../PROJECT_COMPLETION_REPORT.md)

### Contact
- **Project Repository:** https://github.com/metapeaceDev/Peace-Scrip-Ai
- **Issues:** https://github.com/metapeaceDev/Peace-Scrip-Ai/issues

---

**Last Updated:** December 18, 2024  
**Version:** 1.0  
**Status:** Production Ready ✅
