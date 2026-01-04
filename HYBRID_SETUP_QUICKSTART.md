# 🎯 Hybrid System Quick Start Guide

**ComfyUI (RunPod) + Gemini API**

---

## ⚡ Quick Setup (15 minutes)

### 1️⃣ RunPod (5 minutes)

```bash
1. ไปที่ https://runpod.io → Sign up
2. เติมเงิน $10
3. Deploy → Templates → "ComfyUI"
4. GPU: RTX 3090
5. จด Public IP: __.__.__.__
```

### 2️⃣ Render.com (5 minutes)

```bash
1. ไปที่ https://render.com → Sign up
2. New Web Service
3. Connect GitHub: metapeaceDev/Peace-Scrip-Ai
4. Root: comfyui-service
5. Add env var:
   COMFYUI_URL=http://YOUR_RUNPOD_IP:8188
6. Deploy
7. จด URL: https://peace-script-backend.onrender.com
```

### 3️⃣ Update Frontend (5 minutes)

```env
# .env.production
VITE_COMFYUI_ENABLED=true
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://peace-script-backend.onrender.com
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

```bash
npm run build
firebase deploy --only hosting
```

---

## ✅ Verification

```bash
# 1. Test RunPod
curl http://YOUR_RUNPOD_IP:8188

# 2. Test Backend
curl https://peace-script-backend.onrender.com/health

# 3. Test Frontend
# เปิด https://peace-script-ai.web.app
# Generate image → Should work!
```

---

## 🎨 Usage

### Auto Mode (Recommended)
```typescript
// ระบบเลือกอัตโนมัติ:
// 1. ComfyUI (if available)
// 2. Gemini Pro (fallback)
// 3. Gemini Flash (fast)

model: "auto"
```

### Force ComfyUI
```typescript
// ใช้ ComfyUI เท่านั้น (ถ้ามี custom LoRA)
model: "comfyui-sdxl"
loraModel: "my-custom-lora"
```

### Force Gemini
```typescript
// ใช้ Gemini เท่านั้น (fast, free tier)
model: "gemini-flash"
```

---

## 💰 Costs

| Scenario | Daily Cost | Monthly Cost |
|----------|-----------|--------------|
| **100 users, Light use** | ฿50-100 | **฿1,500-3,000** |
| **500 users, Medium use** | ฿150-300 | **฿4,500-9,000** |
| **1000 users, Heavy use** | ฿300-500 | **฿9,000-15,000** |

**With Gemini Fallback:**
- Reduced cost by 30-50%
- Better reliability
- Faster response

---

## 🔧 Commands

```bash
# Start RunPod Pod
# (via RunPod Dashboard)

# Deploy Backend
git push origin main
# (auto-deploy on Render)

# Deploy Frontend
npm run build && firebase deploy --only hosting

# Monitor Costs
# RunPod: Dashboard → Billing
# Render: Dashboard → Metrics
```

---

## 🚨 Emergency

**If ComfyUI down:**
- ✅ Frontend still works (Gemini fallback)
- ⚠️ Custom LoRA unavailable
- ✅ 90% features still working

**If Render down:**
- ✅ Gemini still works
- ⚠️ ComfyUI unavailable
- ✅ Core features still working

**If both down:**
- ✅ Pollinations fallback (free)
- ⚠️ Lower quality
- ✅ Basic generation works

---

## 📞 Support

**Issues:** https://github.com/metapeaceDev/Peace-Scrip-Ai/issues  
**Full Guide:** RUNPOD_SETUP_GUIDE.md  
**Deployment:** DEPLOYMENT_GUIDE.md

---

**สำเร็จ! ระบบ Hybrid พร้อมใช้งาน 🎉**
