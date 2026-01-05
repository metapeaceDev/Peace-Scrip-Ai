# 🚀 Deployment Checklist - Peace Script AI

## Pre-Deployment Checklist

### 🔐 Security Check
- [ ] ตรวจสอบว่าไม่มี secrets ใน git
  ```bash
  git grep -i "api.*key"
  git grep -i "secret"
  git grep -i "password"
  ```
- [ ] ตรวจสอบ .gitignore ครอบคลุมทุกไฟล์ sensitive
- [ ] ลบ service-account.json จาก git history (ถ้ามี)
- [ ] ตรวจสอบ environment variables ทั้งหมด

### 📦 Build & Test
- [ ] รัน `npm run lint` (ไม่มี errors)
- [ ] รัน `npm run type-check` (TypeScript ถูกต้อง)
- [ ] รัน `npm test` (tests ผ่านทั้งหมด)
- [ ] รัน `npm run build` (build สำเร็จ)
- [ ] ทดสอบ build locally: `npm run preview`

### 🔧 Configuration Files

#### Frontend (.env)
- [ ] VITE_FIREBASE_API_KEY
- [ ] VITE_FIREBASE_AUTH_DOMAIN
- [ ] VITE_FIREBASE_PROJECT_ID
- [ ] VITE_FIREBASE_STORAGE_BUCKET
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID
- [ ] VITE_FIREBASE_APP_ID
- [ ] VITE_GEMINI_API_KEY
- [ ] VITE_USE_COMFYUI_BACKEND=true
- [ ] VITE_COMFYUI_BACKEND_URL=http://localhost:8000

#### Backend (comfyui-service/.env)
- [ ] PORT=8000
- [ ] NODE_ENV=production
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_CLIENT_EMAIL
- [ ] FIREBASE_PRIVATE_KEY
- [ ] COMFYUI_WORKERS (ComfyUI URLs)
- [ ] CORS_ORIGIN (allowed origins)

---

## 🌐 Frontend Deployment (Netlify/Firebase Hosting)

### Option 1: Netlify

#### Netlify Dashboard Setup
1. Connect GitHub repository
2. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18 or higher

3. Environment Variables (Settings → Environment Variables):
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_USE_COMFYUI_BACKEND=true
   VITE_COMFYUI_BACKEND_URL=https://your-backend.com
   ```

4. Deploy settings:
   - [ ] Enable continuous deployment
   - [ ] Set production branch: `main`
   - [ ] Enable deploy previews for PRs

#### Manual Deploy
```bash
# Build
npm run build

# Deploy using Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Option 2: Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Or use the npm script
npm run firebase:hosting
```

---

## 🖥️ Backend Deployment (ComfyUI Service)

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker installed
- Docker Compose installed
- GPU support configured (NVIDIA Container Toolkit)

#### Deploy Steps
```bash
cd comfyui-service

# Create .env file
cp .env.example .env
# Edit .env with production values

# Build image
docker build -t peace-script-backend .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    image: peace-script-backend
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

### Option 2: Railway Deployment

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and create project:
   ```bash
   railway login
   cd comfyui-service
   railway init
   ```

3. Add environment variables:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=8000
   # Add all other env vars
   ```

4. Deploy:
   ```bash
   railway up
   ```

### Option 3: Render Deployment

1. Create new Web Service on Render
2. Connect GitHub repository
3. Build settings:
   - **Root Directory:** `comfyui-service`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
4. Add environment variables in Render dashboard
5. Deploy

### Option 4: VPS/Dedicated Server

```bash
# SSH into server
ssh user@your-server.com

# Clone repository
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai/peace-script-basic-v1/comfyui-service

# Install dependencies
npm install

# Create .env
nano .env
# Paste your environment variables

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name peace-script-backend
pm2 save
pm2 startup

# Setup Nginx reverse proxy (optional)
sudo nano /etc/nginx/sites-available/peace-script
```

#### Nginx config:
```nginx
server {
    listen 80;
    server_name api.yoursite.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔥 Firebase Functions Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy functions only
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:yourFunctionName
```

### Environment Variables for Functions
```bash
# Set via CLI
firebase functions:config:set \
  stripe.secret_key="your_stripe_key" \
  openai.api_key="your_openai_key"

# View current config
firebase functions:config:get
```

---

## 🗄️ Database & Storage Setup

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Storage Rules
```bash
firebase deploy --only storage:rules
```

### Indexes
```bash
firebase deploy --only firestore:indexes
```

---

## 📊 Post-Deployment Verification

### Frontend
- [ ] เข้าถึงได้ที่ URL ที่ deploy แล้ว
- [ ] Login/Logout ทำงาน
- [ ] Generate image ทำงาน
- [ ] Generate video ทำงาน
- [ ] Upload files ทำงาน
- [ ] Check browser console (ไม่มี errors)
- [ ] Test on mobile devices

### Backend
- [ ] Health check endpoint: `GET /health`
  ```bash
  curl https://your-backend.com/health
  ```
- [ ] ComfyUI workers status: `GET /api/comfyui/workers`
- [ ] Generate endpoint: `POST /api/comfyui/generate`
- [ ] Check logs ไม่มี errors
- [ ] Test image generation end-to-end
- [ ] Test video generation end-to-end

### Database
- [ ] Firestore rules ใช้งานได้
- [ ] Storage rules ใช้งานได้
- [ ] Data เขียนได้ถูกต้อง
- [ ] Query performance ดี

---

## 🚨 Rollback Plan

### Frontend (Netlify)
```bash
# List deployments
netlify deploy list

# Rollback to specific deploy
netlify deploy:rollback <deploy-id>
```

### Frontend (Firebase)
```bash
# View hosting releases
firebase hosting:list

# Rollback to previous version
firebase hosting:rollback
```

### Backend
```bash
# Docker
docker-compose down
docker-compose up -d --force-recreate

# PM2
pm2 restart peace-script-backend
pm2 logs
```

---

## 📈 Monitoring & Logs

### Frontend
- Netlify Analytics (built-in)
- Firebase Performance Monitoring
- Browser console errors

### Backend
- Application logs: `docker-compose logs -f`
- PM2 logs: `pm2 logs peace-script-backend`
- Error tracking (Sentry - if configured)

### Database
- Firebase Console → Firestore → Usage
- Check quota usage
- Monitor query performance

---

## ✅ Final Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed and responding
- [ ] Database rules deployed
- [ ] Storage rules deployed
- [ ] All environment variables set correctly
- [ ] SSL certificates active (HTTPS)
- [ ] CORS configured properly
- [ ] Monitoring setup complete
- [ ] Rollback plan tested
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Create git tag for release
  ```bash
  git tag -a v1.0.0 -m "Production release v1.0.0"
  git push origin v1.0.0
  ```

---

## 📞 Support Contacts

- **DevOps:** [Your DevOps Team]
- **Backend:** [Backend Team]
- **Frontend:** [Frontend Team]
- **Emergency:** [Emergency Contact]

---

## 📝 Notes

- Always deploy to **staging** first before production
- Test thoroughly after each deployment
- Keep backup of database before major changes
- Document any manual configuration changes
- Update this checklist with lessons learned

---

**Last Updated:** 2026-01-01
**Version:** 1.0.0
