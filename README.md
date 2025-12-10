# Peace Script AI

Peace Script is a professional AI-assisted screenwriting and pre-production tool designed to help creators generate detailed movie script outlines, characters, scenes, and storyboards.

## 🌟 Features

- **Step-by-Step Creation**: Guided process from Genre selection to Final Output.
- **AI Character Generation**: Create detailed character profiles with psychological depth and AI-generated portraits.
- **Scene Generator**: Automatically generate scene breakdowns, dialogue, and shot lists.
- **🎨 Multi-Tier Image Generation System**: Intelligent cascade fallback system for maximum reliability:
  - **Tier 1**: Gemini 2.5 Flash Image (highest quality, standard generation)
  - **Tier 2**: Gemini 2.0 Flash Exp (experimental, better quota)
  - **Tier 3**: Stable Diffusion XL (open source, unlimited)
  - **🔥 Tier 4**: ComfyUI Backend Service (server-side, queue-based, LoRA support)
    - **Scalable**: Multi-worker GPU pool with load balancing
    - **Reliable**: Queue system with auto-retry and progress tracking
    - **Advanced**: LoRA models for character consistency & cinematic style
    - **No Installation**: Users don't need to install anything locally
- **Storyboard AI**: Generate visual storyboards (images and video previews) for every shot.
- **Cloud Storage**: Firebase Storage for large media files (34+ MB supported).
- **Offline Support**: Works offline using IndexedDB, syncs when online.

## 🚀 Live Demo

**Production**: https://peace-script-ai.web.app

## 💰 Pricing

Peace Script AI offers flexible pricing tiers for every creator:

| Plan           | Price             | Best For               | Key Features                                     |
| -------------- | ----------------- | ---------------------- | ------------------------------------------------ |
| **FREE**       | ฿0/เดือน          | Students, Hobbyists    | 1 project, 3 characters, 9 scenes, 500MB storage |
| **BASIC**      | **฿299/เดือน** ⭐ | Indie Filmmakers       | 5 projects, 100 credits, Premium AI models       |
| **PRO**        | **฿999/เดือน**    | Production Houses      | Unlimited projects, 500 credits, All features    |
| **ENTERPRISE** | Custom            | Studios, Organizations | Custom quotas, On-premise, White label           |

**💡 Cost Optimization:** Choose between Cloud APIs (fast) or Open Source (free)
- 🆓 **Open Source Mode**: ComfyUI + FLUX + LoRA (Free, requires GPU or cloud hosting)
- ☁️ **Cloud API Mode**: Gemini + Veo (Paid, faster, no setup needed)
- 🔀 **Hybrid Mode**: Mix both for best value (recommended)

**💡 Early Bird:** Get 50% OFF for the first year!

📊 See full details: [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) | [COST_OPTIMIZATION_ROADMAP.md](./COST_OPTIMIZATION_ROADMAP.md)

## 🛠️ Tech Stack

### Frontend

- React 18, TypeScript, Vite, Tailwind CSS
- Firebase (Hosting, Firestore, Storage, Auth)
- IndexedDB for offline support

### Backend Services

- **ComfyUI Microservice** (Node.js + Express + Bull + Redis)
  - Queue management with Bull
  - Worker pool management
  - Firebase Admin integration
  - WebSocket progress tracking
  - Docker deployment ready

### AI Providers

- Google Gemini 2.5 Flash (text generation)
- Google Gemini 2.5/2.0 Flash Image (image generation)
- Stable Diffusion XL via Pollinations.ai (fallback)
- ComfyUI Backend Service (advanced generation)
- Google Veo 3.1 (video generation)

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create `.env.local` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key

# ComfyUI Local/Cloud Configuration
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=true

# Cloud Rendering Options (Optional)
VITE_COMFYUI_CLOUD_URL=https://your-cloud-function.cloudfunctions.net/comfyui
VITE_COLAB_TUNNEL_URL=https://xxxx.ngrok-free.app  # Google Colab Pro+ (แนะนำ!)
VITE_RUNPOD_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID
VITE_REPLICATE_URL=https://api.replicate.com
```

### 4. Setup Cloud Rendering (Optional - แต่คุ้มมาก!)

**🎓 Google Colab Pro+ Users** (ถ้าคุณจ่ายแล้ว ใช้ให้คุ้ม!):

1. อ่านคู่มือ: [COLAB_SETUP_GUIDE.md](./COLAB_SETUP_GUIDE.md)
2. ติดตั้ง ComfyUI ใน Colab (~10 นาที)
3. เปิด ngrok tunnel
4. คัดลอก URL มาใส่ใน `.env.local`
5. เลือก "Google Colab Pro+" ใน DeviceSettings

**ประโยชน์**:

- ⚡ A100 GPU เร็วกว่าเครื่องตัวเอง 5-10 เท่า
- 💰 คุ้มค่า ~$0.008/รูป (ถูกกว่า RunPod)
- 🔋 ประหยัดไฟบ้าน ไม่กินทรัพยากรเครื่อง
- 📱 เจนได้ทุกที่ มีแต่อินเทอร์เน็ต

### 5. Setup Backend Service (Local - Optional)

See [comfyui-service/QUICKSTART.md](./comfyui-service/QUICKSTART.md) for detailed backend setup.

Quick setup:

```bash
# One-command setup
./setup-dev.sh

# Or manually
cd comfyui-service
npm install
docker-compose up -d  # Start Redis
npm run dev
```

### 5. Run Development Server

```bash
# Frontend only
npm run dev

# Frontend + Backend together
npm run dev:all
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000

### 6. Build for Production

```bash
npm run build
```

### 7. Deploy to Firebase

```bash
firebase login
firebase init hosting
firebase deploy --only hosting
```

For backend deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📖 Usage Guide

1. **Genre**: Select your main and secondary genres.
2. **Boundary**: Define the core premise, theme, and timeline.
3. **Character**: Detailed profiling with AI assistance and image generation.
4. **Structure**: Edit the 9-point plot structure.
5. **Output**: Generate full scenes, edit dialogue, and create storyboards.

## 🎨 ComfyUI Backend Service

The ComfyUI Backend Service provides scalable, server-side image generation with LoRA support.

See [comfyui-service/README.md](./comfyui-service/README.md) for deployment instructions.

**Benefits**:

- No user-side installation required
- Multi-worker GPU pool with load balancing
- Queue system with auto-retry
- Real-time progress tracking via WebSocket
- Firebase integration for job persistence
- Character consistency with LoRA models
- Cinematic & Thai movie style transfer

**Quick Start (Backend Service)**:

```bash
cd comfyui-service
npm install
docker-compose up -d
npm run dev
```

## 🔧 Architecture

### System Overview

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   React     │─────▶│  ComfyUI Service │─────▶│  ComfyUI    │
│  Frontend   │      │  (Node + Queue)  │      │  Workers    │
└─────────────┘      └──────────────────┘      └─────────────┘
       │                      │                        │
       │                      ▼                        ▼
       │              ┌──────────────┐        ┌──────────────┐
       └─────────────▶│   Firebase   │◀───────│     GPU      │
                      │  (Auth/DB)   │        │    Pool      │
                      └──────────────┘        └──────────────┘
```

### Image Generation Flow (New Architecture)

```
User Request
    ↓
Frontend (React)
    ↓
Check Auth (Firebase)
    ↓
POST /api/comfyui/generate
    ↓
ComfyUI Service
    ↓
Add to Queue (Bull + Redis)
    ↓
Worker picks job
    ↓
Select healthy GPU worker (Round-robin)
    ↓
Generate with ComfyUI + LoRA
    ↓
Track progress via WebSocket
    ↓
Save to Firebase Storage
    ↓
Return jobId → Poll status
    ↓
Return base64 image to Frontend
```

### Legacy ComfyUI Flow (Deprecated)

```
⚠️ Local ComfyUI installation is deprecated
✅ Use VITE_USE_COMFYUI_BACKEND=true instead
```

    ↓ AUTO-CHECK every 10s

User installs ComfyUI
↓ RUNNING
Check LoRA Models (/system_stats API)
↓ MISSING REQUIRED
Show LoRASetup.tsx Modal
↓ TRY AUTO-DOWNLOAD or MANUAL
User installs LoRA models
↓ ALL INSTALLED
Proceed to AuthPage → App

````

### Storage Architecture
- **Small Data** (<1MB): Firestore documents
- **Large Data** (>1MB): Firebase Storage (JSON files)
- **Images**: Base64 in Storage only (not in Firestore)
- **Offline Cache**: IndexedDB

## 💰 Cost Breakdown

- **Gemini API**: Free tier → $7/month (1M tokens/min)
- **HuggingFace**: Free → $9/month PRO (20x credits)
- **Firebase**: Blaze plan, pay-as-you-go (currently ฿0.00)
- **ComfyUI**: Free (local) or $0.30-0.50/hr (cloud)

**Current Production Cost**: ฿0.00/month (free tier)

## 🐛 Troubleshooting

### Backend Service Not Starting
```bash
# Check Docker is running
docker ps

# Restart Redis
npm run docker:redis

# Check logs
npm run dev:backend
````

### Frontend Can't Connect to Backend

```bash
# Verify backend URL in .env.local
cat .env.local | grep COMFYUI_SERVICE

# Check backend health
curl http://localhost:8000/health
```

### Quota Exceeded Error

The app handles this automatically via cascade fallback. If all tiers fail:

1. Wait 24 hours for quota reset
2. Enable ComfyUI backend for unlimited generation
3. Upgrade Gemini API: https://ai.google.dev/pricing

### Images Not Loading

- Check browser console for CORS errors
- Verify Firebase Storage rules allow read access
- Check if images are stored correctly in Storage

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

## 📚 Documentation

- **[Quick Start Guide](./comfyui-service/QUICKSTART.md)** - Get up and running in 5 minutes
- **[Development Guide](./DEVELOPMENT.md)** - Development workflow and best practices
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Backend Integration Summary](./BACKEND_INTEGRATION_SUMMARY.md)** - Architecture overview
- **[Backend API Documentation](./comfyui-service/README.md)** - Complete API reference

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## 📚 Documentation

- **Main Documentation**: This README
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **ComfyUI Setup**: [COMFYUI_SETUP.md](COMFYUI_SETUP.md) | [Quick Start](COMFYUI_QUICKSTART.md)
- **Additional Docs**: [docs/](docs/) folder
- **Full Documentation Index**: [docs/README.md](docs/README.md)

## 📧 Contact

- Repository: https://github.com/metapeaceDev/Peace-Scrip-Ai
- Live Demo: https://peace-script-ai.web.app
