# 🔧 CORS Issue Fix - Local GPU Access

## ❌ Problem

When using the **deployed production site** (https://peace-script-ai.web.app):
```
❌ Access to fetch at 'http://localhost:8188' from origin 'https://peace-script-ai.web.app' 
   has been blocked by CORS policy
```

**Why?**
- Production site (HTTPS) cannot access localhost (HTTP) due to browser security
- CORS policy blocks cross-origin requests to `unknown` address space (localhost)

## ✅ Solution 1: Run Frontend Locally (Recommended)

**Step 1: Start all services**
```powershell
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
.\start-dev-full.ps1
```

Or manually:
```powershell
# Terminal 1: ComfyUI
cd C:\ComfyUI\ComfyUI_windows_portable
.\run_nvidia_gpu.bat

# Terminal 2: ComfyUI Service
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service
npm run dev

# Terminal 3: Frontend
cd C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1
npm run dev
```

**Step 2: Access local frontend**
```
Open: http://localhost:5173
```

**Why this works?**
- Same origin: `http://localhost:5173` → `http://localhost:8188` ✅
- No CORS issues between localhost addresses
- Full access to local ComfyUI server

---

## 🌐 Solution 2: Expose ComfyUI with Tunnel (For Production Access)

If you want to use the deployed site with your local GPU:

### Option A: Cloudflare Tunnel (Free)

1. Install cloudflared:
```powershell
# Download from: https://github.com/cloudflare/cloudflared/releases
# Or use: winget install --id Cloudflare.cloudflared
```

2. Start tunnel:
```powershell
cloudflared tunnel --url http://localhost:8188
```

3. Update `.env` with tunnel URL:
```env
VITE_COMFYUI_URL=https://your-tunnel-id.trycloudflare.com
VITE_COMFYUI_API_URL=https://your-tunnel-id.trycloudflare.com
```

4. Rebuild and deploy:
```powershell
npm run build
firebase deploy --only hosting
```

### Option B: ngrok (Paid for persistent URLs)

1. Install ngrok: https://ngrok.com/download
2. Start tunnel:
```powershell
ngrok http 8188
```

3. Use the provided URL in `.env`

---

## 🔍 Quick Diagnosis

**Check if services are running:**
```powershell
# ComfyUI Server
curl http://localhost:8188 -UseBasicParsing

# ComfyUI Service
curl http://localhost:8000/health -UseBasicParsing

# Frontend (production)
curl https://peace-script-ai.web.app -UseBasicParsing

# Frontend (local dev)
curl http://localhost:5173 -UseBasicParsing
```

**Check CORS in browser console:**
- Open DevTools (F12)
- Look for: "blocked by CORS policy"
- If blocked: You're on production site → Switch to localhost:5173

---

## 📊 Comparison

| Method | Pros | Cons |
|--------|------|------|
| **Local Dev (Recommended)** | ✅ No CORS issues<br>✅ Fast development<br>✅ Full GPU access<br>✅ Free | ⚠️ Only works on your computer |
| **Production + Tunnel** | ✅ Works from anywhere<br>✅ Share with others | ⚠️ Tunnel URLs expire (cloudflare)<br>⚠️ Slower (network latency)<br>⚠️ Security risk (expose local server) |
| **Production Only** | ✅ Accessible anywhere<br>✅ No local setup | ❌ Can't use local GPU<br>❌ Must use cloud APIs<br>❌ Costs money |

---

## 🚀 Recommended Workflow

**For Development:**
```
Use: http://localhost:5173
Access: Local GPU via localhost:8188
```

**For Production/Sharing:**
```
Use: https://peace-script-ai.web.app
Access: Cloud APIs (Replicate, Hugging Face)
OR: Expose ComfyUI with tunnel (temporary testing only)
```

---

## ✅ Current Status

- **ComfyUI**: ✅ Installed (cu128 + VideoHelperSuite)
- **Service**: ✅ Running on port 8000
- **Frontend Config**: ✅ Already set up in `.env`
- **Issue**: Using production site instead of local dev

**Solution**: Open http://localhost:5173 instead of https://peace-script-ai.web.app

---

**Last Updated**: December 21, 2025
