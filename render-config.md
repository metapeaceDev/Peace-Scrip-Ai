# =============================================================================
# Render.com Backend Configuration
# =============================================================================
# This file contains configuration for deploying the ComfyUI backend service
# to Render.com
#
# How to use:
# 1. Create a new Web Service on Render.com
# 2. Connect your GitHub repository
# 3. Copy these settings
# 4. Deploy!
# =============================================================================

# Service Configuration
name: peace-script-backend
type: web
env: node
region: singapore  # Closest to Thailand

# Build & Start
buildCommand: cd comfyui-service && npm install
startCommand: cd comfyui-service && npm start

# Instance Type
plan: starter  # $7/month (or use free tier)
# Free tier: 750 hours/month, sleeps after 15 min inactivity

# Health Check
healthCheckPath: /health

# Auto-Deploy
autoDeploy: true
branch: main

# Environment Variables (to add in Render Dashboard)
envVars:
  # ComfyUI Configuration
  - key: COMFYUI_URL
    value: http://YOUR_RUNPOD_IP:8188
    # ⚠️ Replace with your actual RunPod public IP
    
  - key: COMFYUI_API_KEY
    value: your-runpod-api-key
    # Optional: If you set up API key on RunPod
    
  # Server Configuration
  - key: PORT
    value: 8000
    
  - key: NODE_ENV
    value: production
    
  # CORS Configuration
  - key: ALLOWED_ORIGINS
    value: https://peace-script-ai.web.app,https://peace-script-ai.firebaseapp.com
    # Add your production domains
    
  # Queue Configuration
  - key: MAX_QUEUE_SIZE
    value: 50
    # Max number of jobs in queue
    
  - key: PROCESSING_TIMEOUT
    value: 300000
    # 5 minutes timeout per job
    
  - key: MAX_RETRIES
    value: 3
    # Retry failed jobs 3 times
    
  # Model Configuration (Optional)
  - key: DEFAULT_CHECKPOINT
    value: sd_xl_base_1.0.safetensors
    
  - key: DEFAULT_STEPS
    value: 30
    
  - key: DEFAULT_CFG
    value: 7.5
    
  # Monitoring (Optional)
  - key: ENABLE_LOGGING
    value: true
    
  - key: LOG_LEVEL
    value: info
    # Options: error, warn, info, debug
    
  # Performance
  - key: ENABLE_CACHE
    value: true
    
  - key: CACHE_TTL
    value: 3600
    # Cache results for 1 hour

# =============================================================================
# Manual Setup Steps
# =============================================================================

# 1. Go to https://dashboard.render.com
# 2. Click "New +" → "Web Service"
# 3. Connect GitHub repository: metapeaceDev/Peace-Scrip-Ai
# 4. Fill in:
#    - Name: peace-script-backend
#    - Region: Singapore
#    - Branch: main
#    - Root Directory: comfyui-service
#    - Build Command: npm install
#    - Start Command: npm start
# 5. Add Environment Variables (from above)
# 6. Click "Create Web Service"
# 7. Wait ~5 minutes for first deploy
# 8. Copy URL: https://peace-script-backend.onrender.com

# =============================================================================
# Verify Deployment
# =============================================================================

# Test health endpoint:
# curl https://peace-script-backend.onrender.com/health

# Expected response:
# {
#   "status": "ok",
#   "comfyui": "connected",
#   "timestamp": "2026-01-05T...",
#   "uptime": 123
# }

# =============================================================================
# Cost Estimate
# =============================================================================

# Free Tier:
# - 750 hours/month
# - Sleeps after 15 min inactivity
# - Cold start: ~30s
# - Good for: Development, Testing

# Starter Plan ($7/month):
# - Always on
# - No cold starts
# - Better performance
# - Good for: Production with <1000 users

# =============================================================================
# Troubleshooting
# =============================================================================

# Issue: "Cannot connect to ComfyUI"
# Fix: Check COMFYUI_URL in environment variables

# Issue: "Service keeps sleeping"
# Fix: Upgrade to Starter plan ($7/month)

# Issue: "CORS error"
# Fix: Check ALLOWED_ORIGINS includes your frontend URL

# Issue: "Timeout errors"
# Fix: Increase PROCESSING_TIMEOUT or optimize workflow

# =============================================================================
# Monitoring
# =============================================================================

# Logs:
# - Render Dashboard → Your Service → Logs

# Metrics:
# - Render Dashboard → Your Service → Metrics
# - Response time, Memory usage, CPU usage

# Alerts:
# - Set up alerts for:
#   - Response time > 10s
#   - Memory > 90%
#   - Error rate > 5%

# =============================================================================
# Scaling
# =============================================================================

# When to scale:
# - Response time > 5s consistently
# - Memory > 80% consistently
# - Queue size > 30 regularly
# - Users > 1000

# How to scale:
# 1. Upgrade plan (Standard: $25/month)
# 2. Add more instances (load balancing)
# 3. Optimize workflows
# 4. Add caching layer
