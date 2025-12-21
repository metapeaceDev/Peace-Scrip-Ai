# Production Deployment Guide

## Overview

This guide covers deploying the ComfyUI Hybrid System to production with:
- ✅ Intelligent load balancing
- ✅ Auto-scaling cloud workers
- ✅ Local GPU support
- ✅ Monitoring and analytics
- ✅ Cost optimization
- ✅ High availability

## Prerequisites

### Required Services
- [ ] Firebase project (Authentication, Firestore, Storage)
- [ ] Redis server (for job queue)
- [ ] RunPod account with API key
- [ ] Google Cloud account with Gemini API key
- [ ] Node.js 18+ and npm/yarn

### Optional Services
- [ ] Domain name with SSL certificate
- [ ] Monitoring service (DataDog, New Relic, etc.)
- [ ] Log aggregation (LogDNA, Papertrail, etc.)
- [ ] Error tracking (Sentry, Rollbar, etc.)

## Step 1: Environment Configuration

### Frontend Environment Variables
Create `.env` in frontend root:

```bash
# API Endpoints
VITE_COMFYUI_SERVICE_URL=https://api.yourapp.com
VITE_COMFYUI_LOCAL_URL=http://localhost:8188

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# AI APIs
VITE_GEMINI_API_KEY=your-gemini-api-key

# Features
VITE_ENABLE_LOCAL_COMFYUI=true
VITE_ENABLE_CLOUD_WORKERS=true
```

### Backend Environment Variables
Create `.env` in `comfyui-service/`:

```bash
# Server Configuration
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://yourapp.com

# Redis Configuration (Required for production)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password

# ComfyUI Workers
COMFYUI_WORKERS=http://localhost:8188
QUEUE_CONCURRENCY=3
VIDEO_QUEUE_CONCURRENCY=1

# RunPod Cloud Workers
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_SERVERLESS_ENDPOINT_ID=your-endpoint-id
RUNPOD_DOCKER_IMAGE=runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel
RUNPOD_GPU_TYPE=NVIDIA RTX 3090
CLOUD_PREFER_SERVERLESS=true
CLOUD_MAX_PODS=5
CLOUD_IDLE_TIMEOUT=300000
CLOUD_AUTOSCALE_THRESHOLD=5

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Firebase Admin (for backend)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Step 2: Build and Deploy

### Frontend Deployment

#### Option A: Netlify
```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

#### Option B: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option C: Firebase Hosting
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### Backend Deployment

#### Option A: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
cd comfyui-service
railway up
```

#### Option B: Heroku
```bash
# Create Heroku app
heroku create your-comfyui-service

# Add Redis addon
heroku addons:create heroku-redis:premium-0

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set RUNPOD_API_KEY=your-key
# ... set all env vars

# Deploy
git subtree push --prefix comfyui-service heroku main
```

#### Option C: DigitalOcean App Platform
```yaml
# app.yaml
name: comfyui-service
services:
  - name: api
    github:
      repo: your-username/peace-script-ai
      branch: main
      deploy_on_push: true
    source_dir: /comfyui-service
    build_command: npm install && npm run build
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "8000"
    instance_count: 2
    instance_size_slug: professional-xs
databases:
  - name: redis-cache
    engine: REDIS
```

#### Option D: Docker Container
```dockerfile
# Dockerfile (comfyui-service/Dockerfile)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
```

Deploy to any container platform:
```bash
# Build image
docker build -t comfyui-service:latest .

# Push to registry
docker tag comfyui-service:latest your-registry/comfyui-service:latest
docker push your-registry/comfyui-service:latest

# Deploy (example: AWS ECS, Google Cloud Run, Azure Container Instances)
```

## Step 3: Database Setup

### Redis Configuration
Production Redis setup:

```bash
# Using Redis Cloud (recommended)
1. Create Redis Cloud account: https://redis.com/try-free/
2. Create database (30MB free tier)
3. Copy connection string
4. Set REDIS_URL environment variable

# Using self-hosted Redis
1. Install Redis: https://redis.io/download
2. Configure persistence: appendonly yes
3. Set password: requirepass your-strong-password
4. Enable SSL if public-facing
5. Set REDIS_URL=redis://:password@host:6379
```

### Firebase Setup
```bash
# 1. Create Firebase project
firebase projects:create your-project-id

# 2. Enable services
firebase init firestore
firebase init storage
firebase init functions

# 3. Configure Firestore security rules
# See firestore.rules

# 4. Configure Storage security rules
# See storage.rules

# 5. Deploy rules
firebase deploy --only firestore:rules,storage:rules

# 6. Generate service account key
# Go to: Firebase Console > Project Settings > Service Accounts
# Click "Generate new private key"
# Save as service-account-key.json (DO NOT commit to git)
```

## Step 4: RunPod Cloud Configuration

### Setup Cloud Workers
```bash
# 1. Create RunPod account
# Visit: https://www.runpod.io/

# 2. Create API key
# Go to: Settings > API Keys
# Create new key with permissions: pod.create, pod.delete, pod.read

# 3. Deploy serverless endpoint (optional)
# Use runpod-comfyui.Dockerfile
docker build -f runpod-comfyui.Dockerfile -t your-registry/comfyui-runpod .
docker push your-registry/comfyui-runpod

# 4. Configure auto-scaling
# Set environment variables:
CLOUD_MAX_PODS=5              # Maximum concurrent cloud pods
CLOUD_IDLE_TIMEOUT=300000     # 5 minutes idle before shutdown
CLOUD_AUTOSCALE_THRESHOLD=5   # Start new pod when queue > 5
```

## Step 5: Monitoring Setup

### Health Checks
Add health check endpoints:

```javascript
// Already implemented in server.js
GET /health - Basic health check
GET /api/loadbalancer/status - Load balancer health
GET /api/cloud/status - Cloud worker status
GET /api/queue/stats - Queue statistics
```

### Configure Monitoring Service

#### Option A: Sentry (Error Tracking)
```bash
# Install
npm install @sentry/node

# Configure (server.js)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### Option B: DataDog (Full Observability)
```bash
# Install
npm install dd-trace

# Configure (at top of server.js)
require('dd-trace').init({
  logInjection: true,
  env: process.env.NODE_ENV,
  service: 'comfyui-service',
});
```

### Logging
```javascript
// Use structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Production: Use cloud logging
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

## Step 6: Performance Optimization

### Redis Optimization
```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js Optimization
```javascript
// Use cluster mode for multi-core
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
}
```

### Load Balancer Tuning
```javascript
// Adjust health check interval
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Adjust cost weights for your use case
const SCORING_WEIGHTS = {
  priority: 0.4,
  cost: 0.3,
  speed: 0.2,
  queue: 0.1,
};
```

## Step 7: Security Configuration

### CORS Setup
```javascript
// server.js
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Rate Limiting
```javascript
// Adjust based on your needs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

### API Key Protection
```javascript
// Protect RunPod and Gemini API keys
// Never expose in frontend
// Use environment variables only
// Rotate keys regularly
```

## Step 8: Testing in Production

### Smoke Tests
```bash
# Test health endpoint
curl https://api.yourapp.com/health

# Test load balancer
curl https://api.yourapp.com/api/loadbalancer/status

# Test job submission
curl -X POST https://api.yourapp.com/api/video/generate/animatediff \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test video"}'
```

### Load Testing
```bash
# Run load test
cd comfyui-service
npm run test:load

# Or use k6
k6 run --vus 50 --duration 5m load-test.js
```

## Step 9: Backup and Recovery

### Database Backup
```bash
# Redis backup
redis-cli --rdb /backup/dump.rdb

# Firebase backup
gcloud firestore export gs://your-bucket/firestore-backup
```

### Disaster Recovery Plan
1. **Database Failure**: Switch to backup Redis instance
2. **API Failure**: Auto-scaling should start new instance
3. **Cloud Worker Failure**: Auto-failover to next backend
4. **Complete Outage**: Restore from backups

## Step 10: Cost Monitoring

### Set Up Alerts
```javascript
// Alert when costs exceed threshold
const COST_ALERT_THRESHOLD = 10.0; // $10 per day

setInterval(async () => {
  const stats = await loadBalancer.getStats();
  const dailyCost = stats.backends.reduce((sum, b) => sum + b.totalCost, 0);
  
  if (dailyCost > COST_ALERT_THRESHOLD) {
    // Send alert (email, SMS, Slack, etc.)
    sendAlert(`Daily cost exceeded: $${dailyCost}`);
  }
}, 3600000); // Check every hour
```

### Cost Optimization Tips
1. Set `CLOUD_IDLE_TIMEOUT` to 5 minutes (300000ms)
2. Enable serverless for sporadic workloads
3. Use local GPU as much as possible (free)
4. Set `maxCostPerJob` limit in frontend
5. Monitor and adjust `CLOUD_AUTOSCALE_THRESHOLD`

## Step 11: Rollback Procedure

### Rollback Steps
```bash
# 1. Identify issue
# Check logs, monitoring, error rates

# 2. Rollback frontend
netlify rollback  # or
vercel rollback   # or
firebase hosting:rollback

# 3. Rollback backend
git revert HEAD
git push origin main
# Or use platform-specific rollback

# 4. Verify health
curl https://api.yourapp.com/health

# 5. Monitor for 15 minutes
# Check error rates, response times

# 6. Communicate to users
# Announce issue resolved
```

## Step 12: Maintenance

### Regular Tasks
- [ ] Weekly: Review error logs
- [ ] Weekly: Check cost reports
- [ ] Monthly: Update dependencies
- [ ] Monthly: Rotate API keys
- [ ] Monthly: Review and optimize costs
- [ ] Quarterly: Load testing
- [ ] Quarterly: Security audit

### Update Procedure
```bash
# 1. Test in staging
npm test
npm run test:integration

# 2. Deploy to staging
# ... deployment steps

# 3. Smoke test staging
# ... run tests

# 4. Deploy to production
# ... deployment steps

# 5. Monitor for issues
# ... watch metrics

# 6. Rollback if needed
# ... rollback steps
```

## Troubleshooting

### Common Issues

**Issue: High costs**
- Check `GET /api/cloud/cost` for breakdown
- Reduce `CLOUD_MAX_PODS`
- Increase `CLOUD_IDLE_TIMEOUT`
- Enable local GPU

**Issue: Slow performance**
- Check Redis connection
- Increase `QUEUE_CONCURRENCY`
- Scale up backend instances
- Enable more cloud workers

**Issue: Jobs failing**
- Check `GET /api/loadbalancer/status`
- Verify backend health
- Check API keys validity
- Review error logs

**Issue: High memory usage**
- Reduce `QUEUE_CONCURRENCY`
- Clear old completed jobs
- Restart Redis
- Scale up instance size

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Redis configured with persistence
- [ ] Firebase rules deployed
- [ ] RunPod API key valid
- [ ] Gemini API key valid
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Monitoring setup complete
- [ ] Error tracking configured
- [ ] Backup strategy implemented
- [ ] Cost alerts configured
- [ ] Load testing passed
- [ ] Health checks passing
- [ ] Documentation updated
- [ ] Team trained on rollback procedure

## Support

For issues or questions:
- Documentation: `/docs`
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@yourapp.com

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Version**: _____________  
**Status**: ⚠️ Pre-production / ✅ Production
