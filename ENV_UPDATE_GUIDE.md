# Frontend Environment Variables Update Guide

หลังจาก deploy ComfyUI backend แล้ว ต้องอัพเดท `.env` ให้ frontend รู้จัก backend URL

---

## 📝 Current Status

**Frontend (.env):**
```bash
VITE_COMFYUI_SERVICE_URL=http://localhost:8000  # ❌ Local only
VITE_USE_COMFYUI_BACKEND=false                   # ❌ Disabled
```

**Expected After Deployment:**
```bash
VITE_COMFYUI_SERVICE_URL=https://your-backend-url  # ✅ Production URL
VITE_USE_COMFYUI_BACKEND=true                      # ✅ Enabled
```

---

## 🚀 Update Steps

### Scenario 1: Deployed to RunPod

```bash
# 1. Get your RunPod public URL (from dashboard)
# Example: https://abc123-8000.proxy.runpod.net

# 2. Edit .env
nano .env

# 3. Update these lines:
VITE_COMFYUI_SERVICE_URL=https://abc123-8000.proxy.runpod.net
VITE_USE_COMFYUI_BACKEND=true

# 4. Rebuild frontend
npm run build

# 5. Deploy to Firebase
firebase deploy --only hosting

# 6. Test!
# Open: https://peace-script-ai.web.app
# Generate video with "ComfyUI + AnimateDiff"
```

---

### Scenario 2: Using Replicate (No backend deploy needed)

```bash
# 1. Get Replicate API key from: https://replicate.com/account/api-tokens

# 2. Edit .env
nano .env

# 3. Add:
VITE_REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxxxxxxx

# 4. Keep backend disabled (we'll use Replicate API):
VITE_USE_COMFYUI_BACKEND=false

# 5. Update geminiService.ts to call Replicate
# (See QUICKSTART_DEPLOY.md for code)

# 6. Rebuild & deploy
npm run build
firebase deploy --only hosting
```

---

### Scenario 3: Testing Locally

```bash
# 1. Start ComfyUI backend locally:
cd comfyui-backend
python main.py
# Should see: "Uvicorn running on http://0.0.0.0:8000"

# 2. Edit .env (keep localhost):
VITE_COMFYUI_SERVICE_URL=http://localhost:8000
VITE_USE_COMFYUI_BACKEND=true

# 3. Run dev server (no need to rebuild):
npm run dev

# 4. Test at: http://localhost:5173
```

---

## ✅ Verification Checklist

After updating `.env` and deploying:

### 1. Check Environment Variables Loaded
```javascript
// Open browser console on https://peace-script-ai.web.app
console.log(import.meta.env.VITE_COMFYUI_SERVICE_URL);
console.log(import.meta.env.VITE_USE_COMFYUI_BACKEND);

// Should see:
// "https://your-backend-url"
// "true"
```

### 2. Check Backend Connection
```javascript
// In browser console:
fetch('https://your-backend-url/health/detailed')
  .then(r => r.json())
  .then(d => console.log(d));

// Should see:
// {success: true, workers: {...}, queue: {...}}
```

### 3. Test Video Generation
```
1. Open Peace Script AI
2. Go to Studio
3. Select a shot
4. Click "Generate Video"
5. Select model: "ComfyUI + AnimateDiff"
6. Check console for:
   ✅ "🎬 Tier 2: Trying ComfyUI + AnimateDiff..."
   ✅ "📤 Job submitted: <job-id>"
   ✅ "📊 Job <id>: running (X%)"
   ✅ "✅ Tier 2 Success: ComfyUI + AnimateDiff"
```

---

## 🔧 Environment Variables Reference

### Required for ComfyUI Backend

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_COMFYUI_SERVICE_URL` | `https://abc-8000.proxy.runpod.net` | Backend API endpoint |
| `VITE_USE_COMFYUI_BACKEND` | `true` | Enable backend service |

### Optional (for Replicate)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_REPLICATE_API_KEY` | `r8_xxxxx` | Replicate API token |

### Keep Existing (Don't Change)

| Variable | Current Value | Note |
|----------|---------------|------|
| `VITE_GEMINI_API_KEY` | (keep as is) | For Tier 1 (Veo) |
| `VITE_FIREBASE_*` | (keep as is) | Firebase config |
| `VITE_COMFYUI_URL` | (deprecated) | Old direct ComfyUI URL |
| `VITE_COMFYUI_ENABLED` | (deprecated) | Use `VITE_USE_COMFYUI_BACKEND` |

---

## 🧪 Testing Different Configurations

### Test 1: Backend Enabled, Backend Available
```bash
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://your-backend  # Running

Expected: Tier 2 works ✅
```

### Test 2: Backend Enabled, Backend Down
```bash
VITE_USE_COMFYUI_BACKEND=true
VITE_COMFYUI_SERVICE_URL=https://offline-backend  # Not running

Expected: 
- Tier 1 (Veo) works ✅
- Tier 2 fails with connection error ❌
- Shows user-friendly error message
```

### Test 3: Backend Disabled
```bash
VITE_USE_COMFYUI_BACKEND=false

Expected:
- Tier 1 (Veo) works ✅
- Tier 2 skipped (not attempted)
- Only uses Gemini Veo API
```

---

## 🚨 Troubleshooting

### "CORS Error" in Console
```
Problem: Backend not allowing frontend origin
Solution:
1. Check backend CORS config in main.py
2. Ensure peace-script-ai.web.app is in allow_origins
3. Restart backend after changing
```

### "Backend timeout"
```
Problem: Backend URL incorrect or backend down
Solution:
1. Verify URL: curl https://your-backend/health/detailed
2. Check backend logs for errors
3. Ensure port 8000 is exposed (RunPod)
```

### "Job not found"
```
Problem: Backend restarted, lost job queue
Solution:
1. Backend uses in-memory queue (jobs lost on restart)
2. For production: Use Redis for persistent queue
3. Or: Just retry video generation
```

### Environment Variables Not Loading
```
Problem: .env changes not reflected
Solution:
1. Rebuild: npm run build
2. Deploy: firebase deploy --only hosting
3. Hard refresh browser: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
4. Or open Incognito mode
```

---

## 📊 Deployment Checklist

Before going to production:

- [ ] Backend deployed and accessible via HTTPS
- [ ] Backend health check returns 200 OK
- [ ] `.env` updated with production backend URL
- [ ] `VITE_USE_COMFYUI_BACKEND=true`
- [ ] Frontend rebuilt: `npm run build`
- [ ] Frontend deployed: `firebase deploy --only hosting`
- [ ] Browser cache cleared (test in Incognito)
- [ ] Test Tier 1 (Veo) still works
- [ ] Test Tier 2 (AnimateDiff) works
- [ ] Test fallback chain (Tier 1 → 2)
- [ ] Check console for no errors
- [ ] Video quality acceptable
- [ ] Generation time < 60 seconds

---

## 🔄 Rollback Plan

If backend causes issues:

```bash
# Quick disable:
# Edit .env
VITE_USE_COMFYUI_BACKEND=false

# Rebuild & redeploy
npm run build
firebase deploy --only hosting

# System reverts to Tier 1 (Veo) only ✅
```

---

## 📝 Example: Complete Update Flow

```bash
# 1. Deploy backend to RunPod
# Get URL: https://abc123-8000.proxy.runpod.net

# 2. Test backend
curl https://abc123-8000.proxy.runpod.net/health/detailed
# ✅ Returns: {"success": true}

# 3. Update .env
cd /path/to/peace-script-basic-v1
nano .env
# Change:
#   VITE_COMFYUI_SERVICE_URL=https://abc123-8000.proxy.runpod.net
#   VITE_USE_COMFYUI_BACKEND=true

# 4. Rebuild
npm run build
# ✅ Build completes without errors

# 5. Deploy
firebase deploy --only hosting
# ✅ Deploy successful

# 6. Test production
# Open: https://peace-script-ai.web.app
# Generate video
# ✅ See "Tier 2: Trying ComfyUI..." in console
# ✅ Video generates successfully

# 7. Done! 🎉
```

---

## 🎯 Next Steps After Update

1. ✅ Update `.env` (this guide)
2. ✅ Rebuild & deploy frontend
3. 🔄 Test Tier 2 (AnimateDiff) - See TESTING_GUIDE.md
4. 🔄 Test Tier 3 (SVD) - See TESTING_GUIDE.md
5. 🔄 Monitor performance & costs
6. 🔄 Optimize as needed

---

**Status:** Ready to update after backend deployment  
**Time Required:** 5-10 minutes  
**Risk Level:** Low (can rollback easily)
