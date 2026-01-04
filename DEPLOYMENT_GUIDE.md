# 🚀 Peace Script AI - Deployment Guide

**Strategy:** เริ่มด้วย Gemini → ค่อย Scale ไป ComfyUI

---

## 📋 Table of Contents

1. [Phase 1: MVP (Gemini Only)](#phase-1-mvp-gemini-only)
2. [Phase 2: Scale (Add ComfyUI)](#phase-2-scale-add-comfyui)
3. [Cost Comparison](#cost-comparison)
4. [Monitoring & Analytics](#monitoring--analytics)

---

## 🎯 Phase 1: MVP (Gemini Only)

### ✅ ข้อดี
- ✅ Deploy ง่าย (5 นาที)
- ✅ ต้นทุนต่ำ (฿0-150/เดือน)
- ✅ ไม่ต้องจัดการ GPU/Backend
- ✅ High availability (99.9%)
- ✅ Quality ดี (Imagen 3)

### ⚠️ ข้อจำกัด
- ❌ ไม่มี Custom LoRA
- ❌ ไม่มี Face ID (InstantID)
- ❌ Limited styles

---

## 🚀 Step-by-Step Deployment

### Step 1: เตรียม Environment Variables

```bash
# 1. คัดลอก template
cp .env.production.template .env.production

# 2. เปิดไฟล์
code .env.production
```

### Step 2: กรอก API Keys

```env
# =============================================================================
# ✅ REQUIRED: Gemini API Key
# =============================================================================
# ไปที่: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# =============================================================================
# ✅ REQUIRED: Firebase Configuration
# =============================================================================
# ไปที่: https://console.firebase.google.com/
# Project Settings > General > Your apps > Config
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# =============================================================================
# ✅ Image Generation Strategy
# =============================================================================
VITE_PREFERRED_IMAGE_MODEL=auto
# Options: auto | gemini-pro | gemini-flash | pollinations

# =============================================================================
# ⚠️ ComfyUI: ปิดไว้สำหรับ Phase 1
# =============================================================================
VITE_COMFYUI_ENABLED=false
VITE_USE_COMFYUI_BACKEND=false
VITE_COMFYUI_SERVICE_URL=
```

### Step 3: ติดตั้ง Dependencies

```bash
npm install
```

### Step 4: Build for Production

```bash
# Set NODE_ENV
export NODE_ENV=production  # Mac/Linux
# หรือ
$env:NODE_ENV="production"  # Windows PowerShell

# Build
npm run build
```

### Step 5: ทดสอบ Build Locally

```bash
# Preview production build
npm run preview

# เปิดเบราว์เซอร์: http://localhost:4173
# ทดสอบ:
# - Login/Register
# - สร้างโปรเจกต์
# - Generate Image (ควรใช้ Gemini)
# - เปิด Console (F12) → ดู logs
```

### Step 6: Deploy to Firebase

```bash
# 1. Login to Firebase
firebase login

# 2. Initialize (ถ้ายังไม่เคย)
firebase init hosting

# 3. Deploy
firebase deploy --only hosting

# 4. เสร็จแล้ว!
# URL: https://peace-script-ai.web.app
```

---

## 📊 Verification Checklist

หลัง deploy ให้ตรวจสอบ:

- [ ] เปิด https://peace-script-ai.web.app ได้
- [ ] Login/Register ทำงาน
- [ ] สร้างโปรเจกต์ได้
- [ ] Generate Image ทำงาน (ใช้ Gemini)
- [ ] Console ไม่มี error สีแดง
- [ ] Image quality ดี (ไม่เบลอ, ไม่มี artifact)

### Debug Console Logs

เปิด Console (F12) ควรเห็น:

```
✅ Using Gemini API for image generation
🎨 Tier 1: Gemini Pro
✅ Image generated successfully
📊 Generation time: 3.5s
```

**ถ้าเห็น:**
```
❌ ComfyUI backend not available
ℹ️ Falling back to Gemini...
```
→ ปกติ! นี่คือ fallback system ทำงาน

---

## 💰 Cost Tracking (Phase 1)

### Gemini API Quota

**Free Tier:**
- Gemini 2.0 Flash: 1,500 requests/day (ฟรี!)
- Gemini 2.5 Pro: 50 requests/day (ฟรี!)

**Paid Tier:**
- Gemini 2.0 Flash: $0.001/request (~฿0.035/รูป)
- Gemini 2.5 Pro: $0.002/request (~฿0.07/รูป)

### ตัวอย่างการใช้งาน

| Users | Images/Month | Gemini Cost | Firebase Cost | Total |
|-------|-------------|-------------|---------------|-------|
| 10 | 300 | ฟรี! | ฟรี! | **฿0** |
| 100 | 3,000 | ฟรี! | ~฿50 | **฿50** |
| 500 | 15,000 | ~฿500 | ~฿200 | **฿700** |
| 1,000 | 30,000 | ~฿1,000 | ~฿500 | **฿1,500** |

### Monitoring

ดู usage ที่:
- Gemini: https://aistudio.google.com/app/apikey
- Firebase: https://console.firebase.google.com/ → Usage

---

## 🔄 Phase 2: Scale (Add ComfyUI)

เมื่อต้องการ:
- ✅ Custom LoRA (Face training)
- ✅ Face ID (InstantID)
- ✅ More control
- ✅ Advanced features

### Prerequisites

- [ ] มี users > 500
- [ ] ต้องการ custom features
- [ ] พร้อมจัดการ backend
- [ ] งบประมาณ: ฿3,000-8,000/เดือน

### Step 1: Deploy Backend to Render

```bash
# 1. ไปที่ render.com
# 2. New Web Service
# 3. Connect GitHub: metapeaceDev/Peace-Scrip-Ai
# 4. Configuration:
#    - Name: peace-script-backend
#    - Root Directory: comfyui-service
#    - Build Command: npm install
#    - Start Command: npm start
#    - Environment: Node
# 5. Add Environment Variables:
#    COMFYUI_URL=http://your-runpod-url:8188
# 6. Deploy
```

### Step 2: Setup RunPod GPU

```bash
# 1. ไปที่ runpod.io
# 2. Rent GPU:
#    - RTX 3090 (24GB) - $0.39/hr
#    - Spot Instance: $0.12-0.20/hr (ถูกกว่า 50-70%)
# 3. Deploy ComfyUI:
#    - Template: ComfyUI
#    - Storage: 50GB
#    - Port: 8188
# 4. Download Models:
#    - SDXL Base
#    - InstantID
#    - IP-Adapter
#    - LoRA models
```

### Step 3: Update Environment

```env
# .env.production
VITE_COMFYUI_ENABLED=true
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://peace-script-backend.onrender.com

# Keep Gemini as fallback
VITE_GEMINI_API_KEY=your-key
VITE_PREFERRED_IMAGE_MODEL=auto
```

### Step 4: Rebuild & Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## 🎯 Hybrid Strategy (Recommended!)

ใช้ทั้งสองระบบพร้อมกัน:

```typescript
// ระบบจะลองตามลำดับ:
1. ComfyUI (ถ้า available) → Custom LoRA, Face ID
2. Gemini Pro (fallback) → High quality
3. Gemini Flash (fallback) → Fast & free
4. Pollinations (last resort) → Free backup
```

**ข้อดี:**
- ✅ High availability (99%+)
- ✅ ประหยัดค่าใช้จ่าย
- ✅ Best of both worlds

**Configuration:**
```env
VITE_COMFYUI_ENABLED=true
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://peace-script-backend.onrender.com
VITE_GEMINI_API_KEY=your-key
VITE_PREFERRED_IMAGE_MODEL=auto  # Smart cascade
```

---

## 📊 Cost Comparison (1,000 users, 30,000 images/month)

| Option | Monthly Cost | Features | Availability |
|--------|-------------|----------|--------------|
| **Gemini Only** | **฿1,500** | Basic | 99.9% |
| **ComfyUI Only** | **฿10,200** | Full | 95% |
| **Hybrid** | **฿3,500** | Full | 99% |

**Recommendation: Hybrid Strategy** ✅

---

## 🔍 Monitoring & Troubleshooting

### Firebase Console

```
https://console.firebase.google.com/
→ Usage & Billing
→ Performance
→ Crash & Error Logs
```

### Common Issues

**1. "Gemini API quota exceeded"**
```
Solution: Upgrade to paid tier
Cost: ~฿1,000/month for 30,000 images
```

**2. "Firebase hosting quota exceeded"**
```
Solution: Upgrade Blaze plan
Cost: ~฿500/month
```

**3. "Image generation slow"**
```
Check: Network latency
Solution: Use CDN for Firebase Storage
```

### Performance Optimization

```typescript
// 1. Enable caching
VITE_ENABLE_IMAGE_CACHE=true

// 2. Compress images
VITE_IMAGE_QUALITY=85

// 3. Use WebP format
VITE_IMAGE_FORMAT=webp
```

---

## 🎯 Success Metrics

**Phase 1 (Month 1-3):**
- [ ] 100+ active users
- [ ] 3,000+ images generated
- [ ] <฿500/month cost
- [ ] 95%+ user satisfaction

**Phase 2 (Month 4-6):**
- [ ] 500+ active users
- [ ] 15,000+ images/month
- [ ] Deploy ComfyUI backend
- [ ] Add custom LoRA

**Phase 3 (Month 7+):**
- [ ] 1,000+ active users
- [ ] 30,000+ images/month
- [ ] Hybrid strategy
- [ ] Revenue > ฿50,000/month

---

## 📞 Support

**Issues?**
- GitHub: https://github.com/metapeaceDev/Peace-Scrip-Ai/issues
- Discord: [Your Discord Link]
- Email: support@peace-script-ai.com

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0 (Gemini-First)  
**Strategy:** MVP → Scale → Optimize
