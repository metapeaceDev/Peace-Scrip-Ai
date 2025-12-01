# 🚀 Getting Started with Peace Script AI

## Welcome!

Peace Script AI is now easier than ever to use with our new backend architecture. Follow this guide to start creating amazing stories in minutes.

---

## For Users (No Installation Required!)

### Quick Start

1. **Visit the App**
   - Production: https://peace-script-ai.web.app
   - Local: http://localhost:5173 (if running locally)

2. **Sign In or Skip**
   - Sign in with Google for cloud sync
   - Or use offline mode (data saved locally)

3. **Create Your First Project**
   - Click "New Project"
   - Choose project type (Movie, Series, etc.)
   - Enter title
   - Click Create

4. **Follow the 5 Steps**
   - **Step 1: Genre** - Select main & secondary genres
   - **Step 2: Boundary** - Define premise, theme, timeline
   - **Step 3: Character** - Create detailed characters with AI
   - **Step 4: Structure** - Edit 9-point plot structure
   - **Step 5: Output** - Generate scenes, dialogue, storyboards

5. **Generate Content with AI**
   - Click "Generate" buttons
   - AI creates content automatically
   - Edit and refine as needed
   - Export when done

### Features You'll Love

✅ **AI Character Generation** - Complete profiles with psychology  
✅ **AI Portrait Generation** - Character images (now server-side!)  
✅ **Scene Generation** - Full scenes with dialogue  
✅ **Storyboard Creation** - Visual shot-by-shot breakdown  
✅ **Offline Support** - Works without internet  
✅ **Cloud Sync** - Save to Firebase (optional)  
✅ **Export** - TXT, CSV, HTML, JSON formats  

### No Installation Needed! 🎉

The new backend architecture means you don't need to:
- ❌ Install ComfyUI
- ❌ Install Python
- ❌ Have a GPU
- ❌ Download LoRA models

Everything runs on our servers!

---

## For Developers (Full Setup)

### Prerequisites

- Node.js 18+ (https://nodejs.org)
- Docker Desktop (https://docker.com/get-started)
- Git (https://git-scm.com)
- Firebase project (https://console.firebase.google.com)

### 1. Clone Repository

```bash
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai
```

### 2. Quick Setup (Recommended)

```bash
# One command to set everything up
./setup-dev.sh

# Follow prompts to configure environment
# Edit .env.local and comfyui-service/.env

# Start everything
npm run dev:all
```

### 3. Manual Setup (Alternative)

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd comfyui-service
npm install
cd ..

# Copy environment files
cp .env.example .env.local
cp comfyui-service/.env.example comfyui-service/.env

# Edit with your credentials
nano .env.local
nano comfyui-service/.env

# Start Redis
npm run docker:redis

# Start backend (Terminal 1)
npm run dev:backend

# Start frontend (Terminal 2)
npm run dev
```

### 4. Configure Environment

#### Frontend (.env.local)
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project
VITE_GEMINI_API_KEY=your_gemini_key
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=true
```

#### Backend (comfyui-service/.env)
```env
PORT=8000
REDIS_URL=redis://localhost:6379
COMFYUI_WORKERS=http://localhost:8188
FIREBASE_PROJECT_ID=your_project
```

### 5. Verify Setup

```bash
# Check frontend
curl http://localhost:5173

# Check backend
curl http://localhost:8000/health

# Check Redis
docker ps | grep redis
```

### 6. (Optional) Add ComfyUI Worker

If you have a GPU and want to use advanced image generation:

```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Download SDXL model
cd models/checkpoints
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# Start ComfyUI
cd ../..
python main.py --listen 0.0.0.0 --port 8188

# Verify
curl http://localhost:8188/system_stats
```

Update backend .env:
```env
COMFYUI_WORKERS=http://localhost:8188
```

---

## Access Points

After setup, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Docs**: See [comfyui-service/README.md](./comfyui-service/README.md)
- **Redis**: localhost:6379 (internal)
- **ComfyUI** (optional): http://localhost:8188

---

## Next Steps

### For Users
1. ✅ Create your first project
2. ✅ Explore AI generation features
3. ✅ Export and share your work
4. 📚 Read [User Guide](./docs/USER_GUIDE.md) (if available)

### For Developers
1. ✅ Read [DEVELOPMENT.md](./DEVELOPMENT.md)
2. ✅ Check [API Documentation](./comfyui-service/README.md)
3. ✅ Run tests: `npm test`
4. ✅ Deploy to production: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Troubleshooting

### Frontend won't start
```bash
rm -rf node_modules
npm install
npm run dev
```

### Backend won't start
```bash
# Check Docker is running
docker ps

# Restart Redis
npm run docker:redis

# Check logs
npm run dev:backend
```

### Can't connect to backend
```bash
# Verify URL in .env.local
cat .env.local | grep COMFYUI_SERVICE

# Test backend
curl http://localhost:8000/health
```

### AI generation fails
1. Check you have valid API keys (.env.local)
2. Check backend is running (http://localhost:8000/health)
3. Check browser console for errors
4. Check backend logs for errors

---

## Getting Help

- **Documentation**: See `/docs` folder and README.md
- **Issues**: [GitHub Issues](https://github.com/metapeaceDev/Peace-Scrip-Ai/issues)
- **API Reference**: [Backend README](./comfyui-service/README.md)
- **Development Guide**: [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## Common Commands

```bash
# Development
npm run dev              # Frontend only
npm run dev:backend      # Backend only
npm run dev:all          # Frontend + Backend

# Docker
npm run docker:redis     # Start Redis
npm run docker:stop      # Stop all containers

# Testing
npm test                 # Frontend tests
cd comfyui-service && ./test-api.sh  # Backend tests

# Building
npm run build            # Build frontend
npm run preview          # Preview build

# Deployment
npm run firebase:hosting # Deploy frontend
# See DEPLOYMENT.md for backend
```

---

## Project Structure

```
peace-script-ai/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── services/           # API clients
│   └── config/             # Configuration
│
├── comfyui-service/        # Backend service
│   ├── src/                # Backend source
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   └── middleware/     # Auth, errors
│   └── .env                # Backend config
│
├── .env.local              # Frontend config
├── package.json            # Dependencies
└── README.md               # Main documentation
```

---

## Tips for Success

### For Creating Great Stories
- 💡 Spend time on character development
- 💡 Use AI to generate initial ideas, then refine
- 💡 Export frequently to save progress
- 💡 Experiment with different genres
- 💡 Use storyboards to visualize scenes

### For Developers
- 💡 Read DEVELOPMENT.md for best practices
- 💡 Use `npm run dev:all` for full-stack development
- 💡 Check logs when debugging
- 💡 Test backend with curl or Postman
- 💡 Use React DevTools for frontend debugging

---

**Ready to create amazing stories? Let's go! 🎬**
