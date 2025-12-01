# Peace Script AI - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Netlify (Recommended)

#### Via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Via Netlify Dashboard
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment variables** (IMPORTANT):
   - Add `VITE_GEMINI_API_KEY` with your API key
6. Click "Deploy site"

### Option 2: Vercel

#### Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Build settings (auto-detected from vercel.json):
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. **Environment variables** (IMPORTANT):
   - Add `VITE_GEMINI_API_KEY` with your API key
6. Click "Deploy"

### Option 3: Manual Static Hosting

#### Build locally
```bash
npm run build
```

The `dist/` folder is ready to upload to any static hosting:
- **GitHub Pages**: Use `gh-pages` branch
- **Firebase Hosting**: `firebase deploy`
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Azure Static Web Apps**: Deploy via VS Code extension

---

## 🔑 Environment Variables Setup

### Required Variable
```
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Optional Variables
```
VITE_API_URL=https://your-backend-api.com/api
```

### How to Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create new API key or use existing
4. Copy the key

---

## 📋 Pre-Deployment Checklist

- [x] Build successful (`npm run build`)
- [x] Environment variables prepared
- [x] `.gitignore` configured
- [x] `netlify.toml` or `vercel.json` present
- [ ] Update repository URL in README.md
- [ ] Test production build locally (`npm run preview`)

---

## 🔧 Post-Deployment Setup

### 1. Update CORS (if using backend)
Add your deployed domain to backend CORS settings

### 2. Custom Domain (Optional)
- **Netlify**: Settings → Domain management → Add custom domain
- **Vercel**: Settings → Domains → Add domain

### 3. Environment Variables
Always set `VITE_GEMINI_API_KEY` in hosting platform dashboard

### 4. Analytics (Optional)
- Google Analytics
- Plausible
- Umami

---

## 🧪 Testing Deployment

After deployment, test these features:
1. Authentication (Login/Offline mode)
2. Create new project
3. AI features (requires valid API key)
4. Save/Load projects
5. Export functions
6. Offline mode

---

## 🐛 Troubleshooting

### Build fails
- Check Node.js version (18+)
- Run `npm install` first
- Check for TypeScript errors

### API Key not working
- Ensure variable name is exactly `VITE_GEMINI_API_KEY`
- Verify API key is valid
- Check API quotas in Google Cloud Console

### Routing issues (404 on refresh)
- Ensure redirects are configured (netlify.toml/vercel.json)
- For other hosts, configure SPA fallback to index.html

### Large bundle size warning
- This is normal (530KB includes React + AI SDK)
- Gzipped size is much smaller (127KB)
- Consider code splitting for optimization

---

## 📊 Deployment Status

| Platform | Status | URL |
|----------|--------|-----|
| Netlify  | ⚪ Not deployed | - |
| Vercel   | ⚪ Not deployed | - |
| Production | 🟢 Ready | - |

---

## 🎯 Next Steps

1. Choose hosting platform
2. Connect Git repository
3. Set environment variables
4. Deploy backend service (see below)
5. Monitor and scale

---

## 🔧 Backend Service Deployment

### ComfyUI Microservice

See detailed guide: [comfyui-service/README.md](./comfyui-service/README.md)

#### Quick Deploy (Docker)

```bash
cd comfyui-service

# Using docker-compose (includes Redis)
docker-compose up -d

# Or build and run manually
docker build -t comfyui-service .
docker run -d -p 8000:8000 \
  -e REDIS_URL=redis://your-redis:6379 \
  -e COMFYUI_WORKERS=http://worker1:8188 \
  -e FIREBASE_PROJECT_ID=your-project-id \
  comfyui-service
```

#### Cloud Deployment Options

##### Option 1: Google Cloud Run (Recommended for API)
```bash
# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT/comfyui-service

# Deploy
gcloud run deploy comfyui-service \
  --image gcr.io/YOUR_PROJECT/comfyui-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars REDIS_URL=redis://your-redis:6379
```

##### Option 2: GKE with GPU
```bash
# Create cluster with GPU nodes
gcloud container clusters create comfyui-cluster \
  --accelerator type=nvidia-tesla-t4,count=1 \
  --num-nodes 2

# Deploy (see k8s/ directory)
kubectl apply -f k8s/
```

##### Option 3: Render.com
1. Create account at [render.com](https://render.com)
2. New Web Service → Connect repository
3. Environment: Docker
4. Add environment variables
5. Deploy

#### Environment Variables (Backend)
```env
PORT=8000
REDIS_URL=redis://your-redis-host:6379
COMFYUI_WORKERS=http://worker1:8188,http://worker2:8188
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json
```

#### Setup ComfyUI Workers

**GPU Server Requirements:**
- NVIDIA GPU (T4/A10/A100)
- CUDA 11.8+
- Docker with NVIDIA runtime

**Install ComfyUI:**
```bash
# Using Docker
docker run -d --gpus all -p 8188:8188 \
  -v /opt/comfyui:/app \
  comfyanonymous/comfyui

# Manual installation
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt
python main.py --listen 0.0.0.0 --port 8188
```

**Add LoRA Models:**
```bash
cd ComfyUI/models/loras
wget https://civitai.com/api/download/models/XXXXX -O character_consistency.safetensors
```

#### Update Frontend URL

After deploying backend, update frontend `.env`:
```env
VITE_COMFYUI_SERVICE_URL=https://your-service.run.app
VITE_USE_COMFYUI_BACKEND=true
```

---

## 🏗️ Full Architecture Deployment

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Firebase   │ ◀────── │    React     │ ──────▶ │  ComfyUI    │
│  Hosting    │         │   Frontend   │         │  Service    │
└─────────────┘         └──────────────┘         └─────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────┐         ┌─────────────┐
                        │   Firebase   │         │   Redis     │
                        │  Auth/DB     │         │  + Workers  │
                        └──────────────┘         └─────────────┘
```

**Deployment Checklist:**
- [ ] Frontend deployed to Firebase/Netlify/Vercel
- [ ] Backend service deployed to Cloud Run/GKE
- [ ] Redis instance running (Cloud Memorystore/Redis Cloud)
- [ ] ComfyUI workers with GPU configured
- [ ] LoRA models installed on workers
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Firebase rules configured
- [ ] Monitoring/logging enabled

---
4. Deploy!
5. Share with team and users

---

**Need help?** Check the full documentation in `README_FULL.md`
