# 🚀 Peace Script AI - Setup Guide for New Machine

คู่มือการติดตั้งและตั้งค่าโปรเจค Peace Script AI บนเครื่องใหม่

---

## 📋 สารบัญ

1. [Prerequisites (ความต้องการระบบ)](#-prerequisites)
2. [การ Clone Project](#-clone-project)
3. [การติดตั้ง Dependencies](#-dependencies)
4. [การตั้งค่า Environment Variables](#-environment-variables)
5. [การเชื่อมต่อ Firebase Project](#-firebase-setup)
6. [การรัน Local Development](#-local-development)
7. [การ Deploy](#-deployment)
8. [การตรวจสอบ Admin Access](#-admin-setup)
9. [Troubleshooting](#-troubleshooting)

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v18 หรือสูงกว่า)
   ```bash
   node --version  # ควรเป็น v18.x.x หรือสูงกว่า
   ```
   Download: https://nodejs.org/

2. **Git**
   ```bash
   git --version
   ```
   Download: https://git-scm.com/

3. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

4. **Google Cloud SDK** (gcloud CLI)
   ```bash
   gcloud --version
   ```
   Download: https://cloud.google.com/sdk/docs/install

5. **Python** (v3.8+) - สำหรับ Voice Cloning Backend
   ```bash
   python3 --version
   ```

### Optional (for full features)

- **ComfyUI Dependencies** - สำหรับ AI Video Generation
- **CUDA Toolkit** - สำหรับ GPU acceleration (Mac: Metal)

---

## 📦 Clone Project

```bash
# Clone from GitHub
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai

# ตรวจสอบว่า clone สำเร็จ
ls -la
```

---

## 📥 Dependencies

### 1. Install Main Dependencies

```bash
# ติดตั้ง dependencies ของ frontend
npm install

# ติดตั้ง dependencies ของ Firebase Functions
cd functions
npm install
cd ..
```

### 2. Build Functions (ถ้าต้องการ)

```bash
cd functions
npm run build  # Compile TypeScript to JavaScript
cd ..
```

---

## 🔑 Environment Variables

### ไฟล์ที่ต้องสร้าง

#### 1. `.env` (Root Directory)

สร้างไฟล์ `.env` ที่ root ของโปรเจค:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...  # จาก Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=663785367659
VITE_FIREBASE_APP_ID=1:663785367659:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...

# RunPod API (for AI Video)
VITE_RUNPOD_API_KEY=your-runpod-api-key
VITE_RUNPOD_ENDPOINT_ID=your-endpoint-id

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Other Services
VITE_VOICE_CLONING_BACKEND_URL=http://localhost:5000
```

#### 2. `functions/.env` (Cloud Functions)

สร้างไฟล์ `.env` ใน `functions/` folder:

```env
# Email Service (สำหรับส่งอีเมล invitation)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Admin Email
ADMIN_EMAIL=admin@peace-script-ai.web.app
```

**หมายเหตุ**: 
- ใช้ Google App Password สำหรับ SMTP_PASSWORD (ไม่ใช่รหัสผ่าน Gmail ปกติ)
- สร้าง App Password ที่: https://myaccount.google.com/apppasswords

#### 3. Service Account Key (สำคัญมาก!)

**⚠️ ไฟล์นี้ห้าม commit ลง Git เด็ดขาด!**

1. ไปที่ Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. บันทึกไฟล์เป็น `service-account-key.json` ใน `functions/` folder

```bash
# ตรวจสอบว่าไฟล์อยู่ที่ถูกต้อง
ls -la functions/service-account-key.json
```

**หมายเหตุ**: ไฟล์นี้อยู่ใน `.gitignore` แล้ว จะไม่ถูก commit

---

## 🔥 Firebase Setup

### 1. Login to Firebase

```bash
firebase login
```

### 2. เชื่อมต่อกับ Firebase Project

```bash
# ตรวจสอบ project ที่เชื่อมต่ออยู่
firebase projects:list

# เชื่อมต่อกับ project (ถ้ายังไม่ได้เชื่อมต่อ)
firebase use peace-script-ai
```

### 3. ตรวจสอบ Firebase Configuration

```bash
# ดู current project
firebase projects:list
firebase use  # แสดง current project

# ตรวจสอบ functions config
firebase functions:config:get
```

### 4. Login to Google Cloud

```bash
gcloud auth login
gcloud config set project peace-script-ai
```

---

## 💻 Local Development

### 1. Start Frontend Development Server

```bash
# Terminal 1: Frontend
npm run dev

# เปิดเบราว์เซอร์ที่ http://localhost:5173
```

### 2. Start Firebase Emulators (Optional)

```bash
# Terminal 2: Firebase Emulators
firebase emulators:start
```

### 3. Start Voice Cloning Backend (Optional)

```bash
# Terminal 3: Voice Cloning
cd backend/voice-cloning
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python server.py
```

---

## 🚀 Deployment

### Deploy ทั้งหมด (Functions + Hosting + Rules)

```bash
# Deploy all
firebase deploy

# หรือ deploy แยกส่วน:
firebase deploy --only hosting          # Deploy frontend เท่านั้น
firebase deploy --only functions        # Deploy Cloud Functions
firebase deploy --only firestore:rules  # Deploy Firestore rules
```

### ตั้งค่า Invoker Permissions (ครั้งแรกเท่านั้น)

```bash
# Admin Invitation Functions
gcloud functions add-invoker-policy-binding createAdminInvitation \
  --region=asia-southeast1 \
  --member="allUsers" \
  --project=peace-script-ai

gcloud functions add-invoker-policy-binding confirmAdminInvitation \
  --region=asia-southeast1 \
  --member="allUsers" \
  --project=peace-script-ai
```

---

## 👤 Admin Setup

### 1. ตรวจสอบ Super Admin

```bash
# รัน script ตรวจสอบ admin
node check-admin-setup.mjs
```

### 2. ตั้งค่า Super Admin (ครั้งแรกเท่านั้น)

```bash
cd functions
node set-super-admin.mjs your-email@gmail.com
cd ..
```

### 3. ทดสอบ Admin Dashboard

1. เปิด https://peace-script-ai.web.app
2. Login ด้วย Super Admin account
3. ไปที่ `/admin` - ควรเห็น Admin Dashboard

---

## 🔍 Troubleshooting

### ปัญหา: Firebase Login ไม่ได้

```bash
# Clear credentials and login again
firebase logout
firebase login --reauth
```

### ปัญหา: Functions Deploy Failed

```bash
# ตรวจสอบ Node.js version
node --version  # ควรเป็น v18+

# ตรวจสอบ service account key
ls -la functions/service-account-key.json

# Re-build functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### ปัญหา: Environment Variables ไม่ทำงาน

```bash
# ตรวจสอบว่าไฟล์ .env มีอยู่
ls -la .env
cat .env  # ดูเนื้อหา

# Restart dev server
npm run dev
```

### ปัญหา: Admin Access ไม่ได้

```bash
# ตรวจสอบ custom claims
node check-admin-setup.mjs

# ถ้าไม่มี claims ให้ตั้งค่าใหม่
cd functions
node set-super-admin.mjs your-email@gmail.com
cd ..

# Force logout and login again
# เปิด: https://peace-script-ai.web.app
# Clear browser cache
# Login ใหม่
```

### ปัญหา: ComfyUI ไม่ทำงาน

```bash
# ตรวจสอบ Python environment
python3 --version

# ตรวจสอบ dependencies
cd backend/comfyui-service
pip list | grep torch

# Restart ComfyUI server
python main.py
```

---

## 📚 เอกสารเพิ่มเติม

- [README.md](./README.md) - ข้อมูลโปรเจคและคุณสมบัติ
- [QUICK_START.md](./QUICK_START.md) - คู่มือเริ่มต้นใช้งาน
- [QUICK_START_ADMIN_MANAGEMENT.md](./QUICK_START_ADMIN_MANAGEMENT.md) - คู่มือจัดการ Admin
- [ADMIN_README.md](./ADMIN_README.md) - คู่มือ Admin Dashboard
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - คู่มือ deployment แบบละเอียด
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - คู่มือสำหรับนักพัฒนา
- [CHANGELOG.md](./CHANGELOG.md) - ประวัติการเปลี่ยนแปลง
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - สถานะโปรเจคปัจจุบัน

---

## 🔒 Security Checklist

- [ ] ตรวจสอบว่าไฟล์ `.env` ไม่ถูก commit
- [ ] ตรวจสอบว่า `service-account-key.json` ไม่ถูก commit
- [ ] เปลี่ยน SMTP password เป็น App Password
- [ ] ตั้งค่า Firestore Security Rules
- [ ] ตั้งค่า Firebase Authentication domains
- [ ] ตรวจสอบ API key restrictions ใน Google Cloud Console

---

## 📞 Support

หากพบปัญหาหรือมีคำถาม:

1. ตรวจสอบ [Troubleshooting](#-troubleshooting) ก่อน
2. อ่านเอกสารที่เกี่ยวข้อง
3. ตรวจสอบ logs:
   ```bash
   # Firebase Functions logs
   firebase functions:log
   
   # Frontend dev server logs
   # (ดูใน terminal ที่รัน npm run dev)
   ```

---

## 📝 Notes

- **Git History**: ไฟล์เอกสารที่ถูกลบยังอยู่ใน git history สามารถดูได้ด้วย `git log --all -- <filename>`
- **Backup**: แนะนำให้ backup ไฟล์ `.env` และ `service-account-key.json` ไว้ในที่ปลอดภัย (อย่าเก็บใน Git)
- **Updates**: ตรวจสอบ dependencies updates เป็นประจำด้วย `npm outdated`

---

**Last Updated**: 2024
**Version**: 1.0.0
**Author**: Peace Script AI Team
