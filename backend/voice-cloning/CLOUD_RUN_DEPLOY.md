# 🚀 Voice Cloning - Google Cloud Run Deployment Guide

## Step 1: ติดตั้ง Google Cloud SDK

### สำหรับ Windows:

1. **ดาวน์โหลด Google Cloud SDK Installer:**
   - URL: https://cloud.google.com/sdk/docs/install-sdk#windows
   - หรือดาวน์โหลดตรง: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe

2. **ติดตั้ง:**
   - รัน `GoogleCloudSDKInstaller.exe`
   - เลือก "Install for all users" (แนะนำ)
   - ติดตั้งใน default location: `C:\Program Files\Google\Cloud SDK`
   - ✅ เลือก "Run gcloud init" เมื่อติดตั้งเสร็จ

3. **เปิด PowerShell ใหม่** (สำคัญมาก!)
   - ปิด Terminal เดิม
   - เปิด PowerShell ใหม่

4. **ทดสอบ:**
   ```powershell
   gcloud --version
   ```
   ควรแสดง:
   ```
   Google Cloud SDK 456.0.0
   bq 2.0.98
   core 2023.11.17
   gcloud-crc32c 1.0.0
   gsutil 5.27
   ```

---

## Step 2: Login และตั้งค่า Project

```powershell
# 1. Login เข้า Google Cloud
gcloud auth login

# 2. ตั้งค่า project (ใช้ project ID จาก Firebase)
gcloud config set project peace-script-ai

# 3. ตรวจสอบว่าใช้ project ถูกต้องหรือไม่
gcloud config get-value project

# 4. Enable Cloud Run API และ Container Registry
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## Step 3: Build และ Push Docker Image

```powershell
# Navigate ไปที่ voice-cloning directory
cd backend/voice-cloning

# Build และ push image (ใช้ Cloud Build - ไม่ต้องมี Docker Desktop)
gcloud builds submit --tag gcr.io/peace-script-ai/voice-cloning

# คำสั่งนี้จะ:
# ✓ Upload โค้ดไป Google Cloud
# ✓ Build Docker image บน cloud
# ✓ Push ไป Container Registry
# ⏱️ ใช้เวลา: 5-10 นาที
```

**หมายเหตุ:** ไม่ต้องติดตั้ง Docker Desktop! Cloud Build จะทำให้บน cloud

---

## Step 4: Deploy ไป Cloud Run

```powershell
gcloud run deploy voice-cloning \
  --image gcr.io/peace-script-ai/voice-cloning \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 3 \
  --min-instances 0 \
  --port 8001
```

### คำอธิบาย Parameters:

- `--memory 4Gi` - RAM 4GB (พอสำหรับ voice cloning model)
- `--cpu 2` - 2 vCPUs (ทำงานเร็วขึ้น)
- `--timeout 300` - Timeout 5 นาที (voice cloning ใช้เวลา 5-15 วินาทีต่อประโยค)
- `--max-instances 3` - Scale สูงสุด 3 instances
- `--min-instances 0` - ปิดเมื่อไม่มีใครใช้ (ประหยัดเงิน)
- `--allow-unauthenticated` - ให้เข้าถึงได้โดยไม่ต้อง login
- `--port 8001` - Port ที่ Flask server listen

### Output ที่จะได้:

```
Deploying container to Cloud Run service [voice-cloning] in project [peace-script-ai] region [us-central1]
✓ Deploying new service... Done.
  ✓ Creating Revision...
  ✓ Routing traffic...
Done.
Service [voice-cloning] revision [voice-cloning-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://voice-cloning-xxxxxxxxxx-uc.a.run.app
```

**📝 เก็บ Service URL ไว้!** จะต้องใช้ในขั้นตอนถัดไป

---

## Step 5: ทดสอบ Service

```powershell
# Replace URL ด้วย Service URL ที่ได้จากขั้นตอนที่ 4
$CLOUD_RUN_URL = "https://voice-cloning-xxxxxxxxxx-uc.a.run.app"

# ทดสอบ health endpoint
Invoke-RestMethod -Uri "$CLOUD_RUN_URL/health"

# ควรได้ response:
# {
#   "status": "healthy",
#   "model": "tts_models/multilingual/multi-dataset/xtts_v2",
#   "gpu_available": false
# }
```

---

## Step 6: อัพเดท Environment Variables

### 6.1 อัพเดท `.env.production`:

```powershell
# กลับไปที่ root directory
cd ../..

# แก้ไข .env.production
# เปลี่ยนบรรทัดนี้:
# VITE_VOICE_CLONING_ENDPOINT=http://localhost:8001

# เป็น:
VITE_VOICE_CLONING_ENDPOINT=https://voice-cloning-xxxxxxxxxx-uc.a.run.app
```

### 6.2 Rebuild และ Redeploy:

```powershell
# Build ใหม่
npm run build

# Deploy ใหม่
firebase deploy --only hosting

# เสร็จแล้ว! 🎉
```

---

## Step 7: ทดสอบบน Production

1. เปิด https://peace-script-ai.web.app
2. ไปที่ TTS Settings
3. เลือก "Voice Cloning (Coqui XTTS-v2)"
4. Upload ไฟล์เสียงตัวอย่าง (6-30 วินาที)
5. พิมพ์ข้อความ
6. คลิก "Generate Speech"
7. ✅ ควรได้เสียงที่โคลนเสียงจากตัวอย่าง!

---

## 💰 ราคาประมาณการ

### Cloud Run Pricing (us-central1):

| Resource  | Price                   | Usage (1,000 requests/เดือน) | Cost             |
| --------- | ----------------------- | ---------------------------- | ---------------- |
| CPU       | $0.00002400/vCPU-second | 2 vCPU × 15s × 1,000         | $0.72            |
| Memory    | $0.00000250/GiB-second  | 4 GiB × 15s × 1,000          | $0.15            |
| Requests  | $0.40/million           | 1,000 requests               | $0.0004          |
| **Total** |                         |                              | **~$0.87/เดือน** |

### Free Tier (ฟรีทุกเดือน):

- ✓ 2 ล้าน requests
- ✓ 360,000 vCPU-seconds
- ✓ 180,000 GiB-seconds

**สรุป:** สำหรับการใช้งาน 1,000 คลิป/เดือน จะอยู่ใน Free Tier!

---

## 🔧 การจัดการ Service

### ดู logs:

```powershell
gcloud run services logs read voice-cloning --region us-central1
```

### ดู metrics:

```powershell
# เปิด Cloud Console
gcloud run services describe voice-cloning --region us-central1 --format="value(status.url)"
```

จากนั้นไปที่: https://console.cloud.google.com/run

### Update service (เปลี่ยน memory/cpu):

```powershell
gcloud run services update voice-cloning \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4
```

### ลบ service:

```powershell
gcloud run services delete voice-cloning --region us-central1
```

---

## 🐛 Troubleshooting

### ปัญหา: Build ล้มเหลว

```
ERROR: failed to solve: failed to compute cache key
```

**แก้ไข:** ตรวจสอบ Dockerfile และ requirements.txt มีอยู่ครบ

### ปัญหา: Service timeout

```
Error: The request was aborted because it took too long
```

**แก้ไข:** เพิ่ม timeout:

```powershell
gcloud run services update voice-cloning --timeout 600 --region us-central1
```

### ปัญหา: Out of memory

```
Container failed to allocate memory
```

**แก้ไข:** เพิ่ม memory:

```powershell
gcloud run services update voice-cloning --memory 8Gi --region us-central1
```

### ปัญหา: Permission denied

```
ERROR: (gcloud.run.deploy) User [xxx@gmail.com] does not have permission
```

**แก้ไข:** Enable APIs:

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## ✅ Checklist

- [ ] ติดตั้ง Google Cloud SDK
- [ ] `gcloud auth login`
- [ ] `gcloud config set project peace-script-ai`
- [ ] Enable APIs (run, containerregistry, cloudbuild)
- [ ] `gcloud builds submit`
- [ ] `gcloud run deploy`
- [ ] ทดสอบ health endpoint
- [ ] อัพเดท `.env.production` ด้วย Cloud Run URL
- [ ] `npm run build`
- [ ] `firebase deploy --only hosting`
- [ ] ทดสอบบน production

---

## 📚 Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing Calculator](https://cloud.google.com/products/calculator)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Coqui TTS Documentation](https://docs.coqui.ai/)

---

**🎉 Happy Deploying!**
