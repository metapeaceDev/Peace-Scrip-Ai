# 🛠️ Development Guide

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- Firebase project with credentials
- (Optional) ComfyUI with GPU for advanced image generation

### One-Command Setup

```bash
# Run setup script
./setup-dev.sh

# Start everything (frontend + backend)
npm run dev:all
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000  
Redis: localhost:6379

---

## Manual Setup

### 1. Install Dependencies

```bash
# Root (frontend)
npm install

# Backend service
cd comfyui-service
npm install
cd ..
```

### 2. Configure Environment

#### Frontend `.env.local`
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project
VITE_GEMINI_API_KEY=your_key
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=true
```

#### Backend `comfyui-service/.env`
```env
PORT=8000
REDIS_URL=redis://localhost:6379
COMFYUI_WORKERS=http://localhost:8188
FIREBASE_PROJECT_ID=your_project
```

### 3. Start Services

```bash
# Terminal 1: Redis
npm run docker:redis

# Terminal 2: Backend
npm run dev:backend

# Terminal 3: Frontend
npm run dev
```

### 4. (Optional) Start ComfyUI Worker

```bash
# If you have ComfyUI installed
cd path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

---

## Development Workflow

### Making Changes

#### Frontend Changes
1. Edit files in `src/`
2. Hot reload automatically updates browser
3. Check errors in browser console
4. Test with React DevTools

#### Backend Changes
1. Edit files in `comfyui-service/src/`
2. Service auto-restarts (nodemon)
3. Check logs in terminal
4. Test with `curl` or Postman

### Testing

```bash
# Frontend tests
npm test

# Backend API tests
cd comfyui-service
./test-api.sh
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

---

## Project Structure

```
peace-script-basic-v1/
├── src/                          # Frontend React app
│   ├── components/               # UI components
│   │   ├── Studio.tsx           # Main studio page
│   │   ├── ComfyUIStatus.tsx    # Backend status widget
│   │   └── ...
│   ├── services/                # API clients
│   │   ├── geminiService.ts     # AI generation
│   │   ├── comfyuiBackendClient.ts  # Backend client
│   │   └── api.ts               # Firebase integration
│   └── config/                  # Configuration
│       └── firebase.ts
│
├── comfyui-service/             # Backend microservice
│   ├── src/
│   │   ├── server.js            # Express app
│   │   ├── services/            # Business logic
│   │   │   ├── workerManager.js
│   │   │   ├── queueService.js
│   │   │   ├── comfyuiClient.js
│   │   │   └── firebaseService.js
│   │   ├── routes/              # API endpoints
│   │   ├── middleware/          # Auth, errors
│   │   └── config/              # Firebase config
│   ├── .env                     # Environment config
│   └── docker-compose.yml       # Redis setup
│
├── .env.local                   # Frontend environment
└── package.json                 # Root dependencies
```

---

## Common Tasks

### Add New Frontend Component

```bash
# Create component
touch src/components/MyComponent.tsx

# Template
import React from 'react';

interface MyComponentProps {
  // props
}

const MyComponent: React.FC<MyComponentProps> = (props) => {
  return <div>My Component</div>;
};

export default MyComponent;
```

### Add New Backend Endpoint

```bash
# Create route file
touch comfyui-service/src/routes/myroute.js
```

```javascript
// myroute.js
const express = require('express');
const router = express.Router();

router.get('/my-endpoint', async (req, res) => {
  try {
    res.json({ success: true, data: 'Hello' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

```javascript
// Add to server.js
const myRoute = require('./routes/myroute');
app.use('/api/my', myRoute);
```

### Add Environment Variable

```bash
# 1. Add to .env.example
echo "VITE_NEW_VAR=value" >> .env.example

# 2. Add to .env.local
echo "VITE_NEW_VAR=actual_value" >> .env.local

# 3. Use in code
const myVar = import.meta.env.VITE_NEW_VAR;
```

### Debug Backend

```bash
# Start with debug logging
cd comfyui-service
LOG_LEVEL=debug npm run dev

# Or use Node debugger
node --inspect src/server.js
```

---

## Troubleshooting

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend won't connect to Redis
```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis
npm run docker:stop
npm run docker:redis

# Test connection
redis-cli ping
```

### Firebase Auth errors
```bash
# Check .env.local has correct keys
cat .env.local | grep FIREBASE

# Verify in Firebase Console
# https://console.firebase.google.com
```

### ComfyUI worker unhealthy
```bash
# Check ComfyUI is running
curl http://localhost:8188/system_stats

# Check backend logs
# Look for health check errors

# Verify worker URL in .env
cat comfyui-service/.env | grep COMFYUI_WORKERS
```

### CORS errors
```bash
# Check CORS_ORIGIN in backend .env
# Should match frontend URL
CORS_ORIGIN=http://localhost:5173
```

---

## Debugging Tips

### Frontend Debugging
1. Open browser DevTools (F12)
2. Check Console for errors
3. Network tab for API calls
4. React DevTools for component state

### Backend Debugging
1. Check terminal logs
2. Add `console.log()` statements
3. Use Postman for API testing
4. Check Redis with `redis-cli`

### Database Debugging
1. Firebase Console → Firestore
2. Check document structure
3. Verify security rules
4. Monitor usage/quota

---

## Performance Optimization

### Frontend
```bash
# Analyze bundle size
npm run build
npm run preview

# Check Lighthouse scores
# Chrome DevTools → Lighthouse
```

### Backend
```bash
# Monitor Redis
redis-cli info

# Check queue stats
curl http://localhost:8000/api/queue/stats

# Monitor workers
curl http://localhost:8000/api/comfyui/workers
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: add my feature"

# Push to GitHub
git push origin feature/my-feature

# Create Pull Request on GitHub
```

---

## Build & Deploy

### Development Build
```bash
npm run build
npm run preview
```

### Production Deploy
```bash
# Frontend (Firebase)
npm run firebase:hosting

# Backend (Cloud Run)
cd comfyui-service
gcloud builds submit --tag gcr.io/PROJECT/comfyui-service
gcloud run deploy comfyui-service --image gcr.io/PROJECT/comfyui-service
```

See [DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.

---

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Express.js Guide](https://expressjs.com)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [ComfyUI API](https://github.com/comfyanonymous/ComfyUI)

---

## Getting Help

- **Documentation**: Check README.md, QUICKSTART.md
- **Issues**: GitHub Issues
- **API Docs**: See comfyui-service/README.md
- **Firebase**: Firebase Console logs

---

**Happy Coding! 🚀**
