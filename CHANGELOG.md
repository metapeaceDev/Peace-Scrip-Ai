# Changelog

All notable changes to Peace Script AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-XX (Backend Integration Update)

### 🎉 Major Changes - ComfyUI Backend Microservice

#### Added

- **ComfyUI Backend Service** - Complete microservice architecture
  - Node.js + Express API server (16 core files)
  - Bull + Redis queue management with priority support
  - Worker pool management with round-robin load balancing
  - Firebase Admin SDK integration
  - WebSocket progress tracking (real-time)
  - Docker deployment ready (Dockerfile + docker-compose)
- **Frontend Integration**
  - `comfyuiBackendClient.ts` - Backend API client with authentication
  - `ComfyUIStatus.tsx` - Real-time service status widget
  - Updated `geminiService.ts` to route to backend
  - Auto-refresh status every 30 seconds
- **Development Tools**
  - `setup-dev.sh` - One-command development environment setup
  - `test-api.sh` - Backend API testing script
  - `npm run dev:all` - Run frontend + backend simultaneously
  - `npm run docker:redis` - Quick Redis startup
  - `concurrently` for parallel process management
- **Documentation** (5 new comprehensive guides)
  - `comfyui-service/QUICKSTART.md` - 5-minute setup guide
  - `DEVELOPMENT.md` - Complete development workflow
  - `DEPLOYMENT.md` - Production deployment (updated)
  - `BACKEND_INTEGRATION_SUMMARY.md` - Architecture deep-dive
  - Enhanced `README.md` with new architecture

#### Changed

- **Architecture Migration**
  - From: Client-side ComfyUI (requires local installation)
  - To: Server-side microservice (no user installation needed)
  - Benefit: Works on any device, scalable GPU pool
- **Environment Configuration**
  - Added `VITE_COMFYUI_SERVICE_URL=http://localhost:8000`
  - Added `VITE_USE_COMFYUI_BACKEND=true`
  - Deprecated `VITE_COMFYUI_API_URL` (legacy)
  - Simplified `.env.example` structure

#### Deprecated

- Local ComfyUI installation requirement
- Direct localhost:8188 connection from frontend
- `VITE_COMFYUI_ENABLED` flag

### 🔧 Technical Implementation

#### Backend Service (22 new files)

**Core Services:**

- `workerManager.js` - GPU pool, health checks, load balancing
- `queueService.js` - Bull queue with retry logic (3 attempts)
- `comfyuiClient.js` - ComfyUI API, WebSocket progress
- `firebaseService.js` - Firestore jobs, Storage integration

**API Endpoints (8 routes):**

- `POST /api/comfyui/generate` - Queue job (async)
- `POST /api/comfyui/generate/sync` - Sync generation (2min timeout)
- `GET /api/comfyui/job/:jobId` - Job status polling
- `GET /api/comfyui/workers` - Worker pool stats
- `GET /api/queue/stats` - Queue statistics
- `GET /health` - Basic health check
- `GET /health/detailed` - Workers + queue stats

**Middleware:**

- Firebase ID token authentication
- Error handling with proper status codes
- CORS configuration for local dev
- Rate limiting (optional)

#### Frontend Updates

- Integrated status widget in Studio page
- Real-time worker and queue monitoring
- Job polling with progress tracking
- Auto-fallback to Gemini/SD on backend failure
- Improved error messages

### 📦 New Dependencies

**Backend:**

- express v4.18.2 - Web framework
- bull v4.12.0 - Queue management
- redis v4.6.11 - Queue backend
- firebase-admin v12.0.0 - Server auth
- ws v8.16.0 - WebSocket
- axios v1.6.5 - HTTP client
- sharp v0.33.1 - Image processing
- helmet v7.1.0 - Security headers
- express-rate-limit v7.1.5 - Rate limiting

**Frontend:**

- concurrently v8.2.2 - Parallel commands

### 🐛 Bug Fixes

- Fixed TypeScript errors in backend client
- Improved CORS handling for local development
- Fixed environment variable loading
- Removed legacy ComfyUI code from geminiService

### 🔐 Security

- Firebase Admin SDK for server-side operations
- Bearer token authentication on protected routes
- Secure error handling (no stack traces in prod)
- Optional rate limiting middleware
- Helmet security headers

### 📈 Performance

- Queue-based processing (no blocking)
- Multi-worker GPU pool (horizontal scaling)
- Health checks prevent routing to dead workers
- Auto-retry with exponential backoff
- WebSocket for efficient progress updates

### 🎯 User Experience Improvements

- **Before**: Install ComfyUI + Python + GPU + LoRA locally
- **After**: Just use the app - everything server-side
- No installation required
- Works on mobile/tablet
- Consistent results across devices
- Real-time progress tracking

---

## [1.0.0] - 2024-11-29

### Added

- ✨ Complete 5-step screenwriting workflow (Genre, Boundary, Character, Structure, Output)
- 🤖 AI-powered character generation with Google Gemini
- 🎨 Character portrait and costume generation
- 📝 Scene generation with dialogue and shot lists
- 🎬 Storyboard image generation
- 🎥 Video generation (Gemini Veo 3.1)
- 💾 Offline mode with IndexedDB
- ☁️ Cloud sync ready (optional backend)
- ↩️ Undo/Redo system
- 👥 Team management features
- 📤 Export to TXT, CSV, HTML, JSON
- 🐳 Docker support for backend
- 🔐 JWT authentication
- 📊 MongoDB database integration

### Frontend

- React 18 + TypeScript
- Vite build system
- Tailwind CSS (CDN)
- Google Gemini AI integration
- IndexedDB for offline storage
- Error boundary for graceful error handling

### Backend

- Node.js 18 + Express
- MongoDB + Mongoose
- JWT authentication with bcrypt
- Docker & Docker Compose ready
- RESTful API design
- CORS & Security middleware
- Rate limiting
- Input validation

### DevOps

- GitHub Actions CI/CD pipeline
- ESLint + Prettier configuration
- Vitest testing framework
- VS Code recommended extensions
- Netlify deployment configuration
- Vercel deployment configuration

### Documentation

- Comprehensive README
- API documentation
- Deployment guides
- Project health reports
- Contributing guidelines
- Quick deploy links

## [Unreleased]

### Planned

- [ ] Unit test coverage >80%
- [ ] E2E testing with Playwright
- [ ] PWA support
- [ ] Code splitting optimization
- [ ] Sentry error tracking
- [ ] Analytics integration
- [ ] Swagger API documentation
- [ ] Architecture diagrams

---

## Version History

- **1.0.0** - Initial production release
  - Full-featured screenwriting tool
  - AI integration
  - Offline/online hybrid mode
  - Complete documentation

---

[1.0.0]: https://github.com/metapeaceDev/Peace-Scrip-Ai/releases/tag/v1.0.0
