# Voice Cloning Production Deployment Guide

## Option 1: Google Cloud Run (แนะนำ - ใช้ Firebase อยู่แล้ว)

### ขั้นตอน Deploy

```bash
# 1. ติดตั้ง Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# 2. Login
gcloud auth login

# 3. Set project
gcloud config set project peace-script-ai

# 4. Build และ Push Docker image
cd backend/voice-cloning
gcloud builds submit --tag gcr.io/peace-script-ai/voice-cloning

# 5. Deploy ไป Cloud Run
gcloud run deploy voice-cloning \
  --image gcr.io/peace-script-ai/voice-cloning \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 3 \
  --min-instances 0

# 6. Get URL
gcloud run services describe voice-cloning --region us-central1 --format 'value(status.url)'
```

### ราคา (Pay as you go)

- **Idle**: ฟรี (min-instances = 0)
- **Active**: ~$0.15/hour เมื่อมีการใช้งาน
- **Free Tier**: 2 ล้าน requests/เดือน ฟรี

---

## Option 2: Railway (ง่ายที่สุด)

### ขั้นตอน Deploy

1. ไปที่ https://railway.app/
2. Login ด้วย GitHub
3. Create New Project → Deploy from GitHub repo
4. เลือก repository ของคุณ
5. Root Directory: `backend/voice-cloning`
6. Railway จะ detect Dockerfile อัตโนมัติ
7. Add environment variables (ถ้ามี)
8. Deploy!

### ราคา

- **Free Tier**: $5/เดือน credit
- **After**: ~$20/เดือน สำหรับ always-on

---

## Option 3: Render.com (ง่ายและราคาดี)

### ขั้นตอน Deploy

1. ไปที่ https://render.com/
2. Login ด้วย GitHub
3. New → Web Service
4. Connect repository
5. Root Directory: `backend/voice-cloning`
6. Docker
7. Plan: Starter ($7/month) หรือ Free (sleep after 15 min idle)
8. Deploy!

### ราคา

- **Free**: นอนหลัง 15 นาที ไม่ใช้งาน
- **Starter**: $7/เดือน, always-on

---

## 🎯 คำแนะนำ

### สำหรับ Production ใช้งานจริง

✅ **Google Cloud Run** (Option 1)

- ดีที่สุดสำหรับ traffic ไม่แน่นอน
- จ่ายตามการใช้งานจริง
- Scale อัตโนมัติ
- มี Free tier

### สำหรับ Demo/Development

✅ **Render Free Tier** (Option 3)

- ฟรี (แต่นอนหลัง 15 นาที)
- ง่ายที่สุด

---

## หลัง Deploy เสร็จ

1. Copy URL ที่ได้
2. เพิ่มใน `.env.production`:

```bash
VITE_VOICE_CLONING_ENDPOINT=https://your-service-url.run.app
```

3. Build และ deploy ใหม่:

```bash
npm run build
firebase deploy --only hosting
```

4. ทดสอบ:

```bash
curl https://your-service-url.run.app/health
```

---

## 📊 การประมาณค่าใช้จ่าย

### Scenario: 1,000 คลิปเสียง/เดือน (แต่ละคลิป 30 วินาที)

**Google Cloud Run:**

- Request time: ~15 วินาที/คลิป
- Total: 1,000 × 15 วินาที = 15,000 วินาที = 4.17 ชั่วโมง
- ราคา: ~$0.62/เดือน (ถูกมาก!)

**Railway/Render Always-On:**

- ราคา: $7-20/เดือน (คงที่ ไม่ว่าจะใช้เท่าไหร่)

---

## ✅ Next Steps

กรุณาเลือก option ที่ต้องการ แล้วบอกให้ฉันช่วย deploy!
