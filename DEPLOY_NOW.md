# 🚀 คู่มือ Deploy ฉบับรวดเร็ว

## ✅ สถานะปัจจุบัน

**Build Status**: ✅ สำเร็จ  
**TypeScript Errors**: ✅ แก้ไขหมดแล้ว  
**Git Status**: ✅ Synced to GitHub  
**Latest Commit**: `6ec695d78`  
**พร้อม Deploy**: ✅ ใช่

---

## 📦 วิธี Deploy (เลือก 1 วิธี)

### วิธีที่ 1: Netlify (แนะนำ - ง่ายที่สุด)

#### Frontend Deploy
```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Deploy (จะถาม link to site หรือสร้างใหม่)
netlify deploy --prod --dir=dist

# หรือใช้ UI:
# - ไปที่ https://app.netlify.com/
# - ลาก folder dist/ ไปวาง
# - เสร็จ!
```

**Environment Variables** (ตั้งใน Netlify UI):
```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_COMFYUI_SERVICE_URL=https://your-backend.herokuapp.com
```

#### Backend Deploy
```bash
# 1. สร้าง Procfile
echo "web: node src/server.js" > comfyui-service/Procfile

# 2. Deploy ไป Heroku (หรือ Railway)
cd comfyui-service

# Heroku
heroku create peace-script-backend
git subtree push --prefix comfyui-service heroku main

# หรือ Railway
railway init
railway up
```

---

### วิธีที่ 2: Vercel (รวดเร็ว)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# จะถามคำถาม:
# - Project name: peace-script-ai
# - Override settings? No
# - Deploy? Yes
```

**Environment Variables** (ใส่ตอนถาม หรือใน Vercel Dashboard):
- เหมือนกับ Netlify ด้านบน

---

### วิธีที่ 3: Firebase Hosting (ใช้ Firebase อยู่แล้ว)

```bash
# 1. Build
npm run build

# 2. Deploy
firebase deploy --only hosting

# เสร็จ! URL จะอยู่ที่:
# https://peace-script-ai.web.app
```

---

## 🔧 Backend Deploy Options

### Option A: Railway (แนะนำ)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Init project
cd comfyui-service
railway init

# 4. Deploy
railway up

# 5. Add environment variables ใน Railway Dashboard
```

### Option B: Heroku
```bash
# 1. Create app
heroku create peace-script-backend

# 2. Add Redis addon
heroku addons:create heroku-redis:mini

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=8000
heroku config:set FIREBASE_PROJECT_ID=peace-script-ai
# ... ตั้งค่าตาม comfyui-service/.env

# 4. Deploy
git subtree push --prefix comfyui-service heroku main

# 5. Open
heroku open
```

### Option C: Render
```bash
# 1. ไปที่ https://render.com
# 2. New > Web Service
# 3. Connect GitHub repo
# 4. Root Directory: comfyui-service
# 5. Build Command: npm install
# 6. Start Command: npm start
# 7. Add environment variables
# 8. Deploy!
```

---

## ⚙️ Environment Variables ที่ต้องตั้ง

### Frontend (.env)
```bash
# Firebase (ใช้ค่าจริงจาก Firebase Console)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# APIs
VITE_GEMINI_API_KEY=your-gemini-api-key

# Backend URL (อัพเดทหลัง deploy backend)
VITE_COMFYUI_SERVICE_URL=https://your-backend-url.com
VITE_USE_COMFYUI_BACKEND=true
```

### Backend (comfyui-service/.env)
```bash
# Server
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://your-frontend-url.com

# Firebase (ใช้ค่าจริงจาก Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Redis (จะได้จาก addon)
REDIS_URL=redis://...

# ComfyUI
COMFYUI_WORKERS=http://localhost:8188
MAX_CONCURRENT_JOBS=5

# Logging
LOG_LEVEL=info
```

---

## 🚀 Deploy ทีละขั้นตอน (Quick Start)

### 1. Deploy Frontend (Netlify)
```bash
# Build
npm run build

# Deploy
npx netlify-cli deploy --prod --dir=dist

# จด URL ที่ได้ เช่น: https://peace-script-ai.netlify.app
```

### 2. Deploy Backend (Railway)
```bash
# Go to backend
cd comfyui-service

# Deploy
npx @railway/cli up

# จด URL ที่ได้ เช่น: https://peace-script-backend.railway.app
```

### 3. Update Frontend Environment
```bash
# แก้ไข .env
VITE_COMFYUI_SERVICE_URL=https://peace-script-backend.railway.app

# Build อีกครั้ง
npm run build

# Deploy อีกครั้ง
npx netlify-cli deploy --prod --dir=dist
```

### 4. เปิดใช้งาน
```
Frontend: https://peace-script-ai.netlify.app
Backend API: https://peace-script-backend.railway.app/health
```

---

## ✅ Checklist หลัง Deploy

### Frontend
- [ ] เปิด URL ได้
- [ ] Login Firebase ทำงาน
- [ ] สามารถสร้าง Video ได้
- [ ] Load Balancer Status แสดงผล
- [ ] Cost Calculator ทำงาน

### Backend
- [ ] Health endpoint: `GET /health` return 200
- [ ] Load Balancer Status: `GET /api/loadbalancer/status`
- [ ] Create video job: `POST /api/video/generate/animatediff`
- [ ] Queue status: `GET /api/queue/stats`

### Environment
- [ ] Firebase connected
- [ ] Gemini API working
- [ ] Redis connected (ถ้าใช้)
- [ ] CORS configured correctly

---

## 🔍 การตรวจสอบหลัง Deploy

### Test Frontend
```bash
# เปิด browser
https://your-app.netlify.app

# ทดสอบ:
# 1. Login
# 2. สร้าง Video ง่ายๆ
# 3. ตรวจสอบ Backend Status
# 4. ดู Cost Calculator
```

### Test Backend
```bash
# Health check
curl https://your-backend.railway.app/health

# Load Balancer Status
curl https://your-backend.railway.app/api/loadbalancer/status

# Expected response:
{
  "backends": [
    {"name": "local", "available": false, ...},
    {"name": "cloud", "available": false, ...},
    {"name": "gemini", "available": true, ...}
  ]
}
```

---

## 🆘 Troubleshooting

### Frontend ไม่เปิด
**ปัญหา**: Blank page  
**แก้**: 
1. เช็ค Browser Console (F12)
2. ดู Network tab หา errors
3. ตรวจสอบ Environment Variables

### Backend ไม่ตอบ
**ปัญหา**: 500 error  
**แก้**:
1. เช็ค Logs ใน Railway/Heroku Dashboard
2. ตรวจสอบ Environment Variables
3. ดู Redis connection (ถ้าใช้)

### CORS Error
**ปัญหา**: CORS policy error  
**แก้**:
```bash
# ใน Backend .env
CORS_ORIGIN=https://your-frontend-url.com

# Deploy backend อีกครั้ง
```

### Firebase Error
**ปัญหา**: Firebase not initialized  
**แก้**:
1. ตรวจสอบ API Keys ใน .env
2. ตรวจสอบ Firebase Project Settings
3. Enable Firestore และ Storage

---

## 📊 ค่าใช้จ่าย (ประมาณการ)

### Free Tier (Development)
- Netlify/Vercel: Free
- Railway: $5/month (500 hours free)
- Heroku: $7/month (หรือ free dynos)
- Firebase: Free (Spark plan)
- **รวม**: $0-12/month

### Production
- Frontend Hosting: $0-25/month
- Backend Hosting: $5-20/month
- Firebase: $5-50/month (ขึ้นกับ usage)
- RunPod (optional): $0.007/video
- Gemini API: $0.08/video
- **รวม**: $10-100/month + usage

---

## 🎯 Next Steps หลัง Deploy

### Monitoring
```bash
# Setup monitoring
1. UptimeRobot - https://uptimerobot.com/
2. Sentry - https://sentry.io/
3. Google Analytics - https://analytics.google.com/
```

### Custom Domain (Optional)
```bash
# Netlify
1. Buy domain (Namecheap, GoDaddy)
2. Add custom domain in Netlify
3. Update DNS records

# Vercel
vercel domains add yourdomain.com
```

### SSL Certificate
- Netlify: ✅ Auto (Let's Encrypt)
- Vercel: ✅ Auto
- Railway: ✅ Auto
- Heroku: ✅ Auto

---

## 📞 Support

**Documentation**:
- PRODUCTION_DEPLOYMENT_GUIDE.md - Full guide
- MONITORING_SETUP.md - Monitoring
- TESTING_DEPLOYMENT_STATUS.md - Status

**URLs**:
- Repository: https://github.com/metapeaceDev/Peace-Scrip-Ai
- Commit: `6ec695d78`

---

## ✨ สรุป

### ตอนนี้คุณมี:
✅ Frontend build สำเร็จ (dist/ folder)  
✅ Backend พร้อม deploy  
✅ Environment variables ครบ  
✅ TypeScript errors แก้หมดแล้ว  
✅ Git synced แล้ว

### เลือก Deploy ด้วยวิธีใดก็ได้:
1. **ง่ายที่สุด**: Netlify (Frontend) + Railway (Backend)
2. **รวดเร็ว**: Vercel (Frontend) + Render (Backend)
3. **ใช้ Firebase**: Firebase Hosting + Cloud Functions

### เวลาที่ใช้:
- Netlify/Vercel deploy: 5-10 นาที
- Railway/Heroku deploy: 5-10 นาที
- **รวม**: 15-20 นาที จาก code ถึง production!

**🎉 Good Luck! System is production-ready!**

---

*Created: December 21, 2025*  
*Status: ✅ Ready to Deploy*
