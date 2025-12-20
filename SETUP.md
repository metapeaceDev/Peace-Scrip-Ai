# 🚀 Peace Script AI - Setup Guide for New Machine

คู่มือการติดตั้งและตั้งค่าโปรเจค Peace Script AI บนเครื่องใหม่

**Last Updated**: December 19, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready

---

## ⚡ Quick Start (เริ่มต้นด่วน - 10 นาที)

**สำหรับคนที่รีบ ทำตามนี้ก่อน:**

```bash
# 1. Clone และติดตั้ง
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai
npm install

# 2. สร้าง environment file
cp .env.example .env.local
# แก้ไข .env.local ใส่ค่าจริง

# 3. Validate environment
npm run validate:env

# 4. Run dev server
npm run dev
```

**ถ้าทำไม่สำเร็จ อ่านคู่มือฉบับเต็มด้านล่าง** 👇

---

## 📋 สารบัญ

1. [Quick Start](#-quick-start-เริ่มต้นด่วน---10-นาที)
2. [Prerequisites (ความต้องการระบบ)](#-prerequisites)
3. [การ Clone Project](#-clone-project)
4. [การติดตั้ง Dependencies](#-dependencies)
5. [การตั้งค่า Environment Variables](#-environment-variables)
6. [การเชื่อมต่อ Firebase Project](#-firebase-setup)
7. [การรัน Local Development](#-local-development)
8. [การ Deploy](#-deployment)
9. [การตรวจสอบ Admin Access](#-admin-setup)
10. [Security Best Practices](#-security-best-practices)
11. [Troubleshooting](#-troubleshooting)
12. [เอกสารอ้างอิง](#-เอกสารอ้างอิง)

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

### วิธีการตั้งค่า (แนะนำ)

**ขั้นตอนที่ 1**: คัดลอกไฟล์ template

```bash
# คัดลอก .env.example มาเป็น .env.local
cp .env.example .env.local
```

**ขั้นตอนที่ 2**: แก้ไข `.env.local` ใส่ค่าจริง

```bash
# เปิดด้วย editor ที่ชอบ
code .env.local   # VS Code
# หรือ
nano .env.local   # Terminal editor
```

**ขั้นตอนที่ 3**: Validate ว่าครบถ้วนหรือไม่

```bash
# ตรวจสอบว่ามี environment variables ครบหรือไม่
npm run validate:env

# ถ้าผ่าน จะแสดง:
# ✅ All required environment variables are properly configured!
```

### ไฟล์ที่ต้องสร้าง

#### 1. `.env.local` (Root Directory) ⭐ แนะนำ

**ไฟล์นี้จะไม่ถูก commit ลง Git (ปลอดภัย)**

สร้างจากไฟล์ `.env.example`:

```bash
cp .env.example .env.local
```

จากนั้นแก้ไขใส่ค่าจริง:

```env
# =============================================================================
# 🔥 CRITICAL - Firebase Configuration (REQUIRED)
# =============================================================================
VITE_FIREBASE_API_KEY=AIzaSy...  # จาก Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=663785367659
VITE_FIREBASE_APP_ID=1:663785367659:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...

# =============================================================================
# 🤖 AI Services (REQUIRED)
# =============================================================================
VITE_GEMINI_API_KEY=your-gemini-api-key  # https://aistudio.google.com/app/apikey

# =============================================================================
# 💳 Payment (Required for production)
# =============================================================================
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SECRET_KEY=sk_test_...

# =============================================================================
# 🎬 Video Generation (Optional)
# =============================================================================
VITE_RUNPOD_API_KEY=your-runpod-api-key
VITE_RUNPOD_ENDPOINT_ID=your-endpoint-id

# ดูเพิ่มเติมใน .env.example
```

**📝 หมายเหตุ**:

- ดูรายการ environment variables ทั้งหมดใน [.env.example](./.env.example)
- ตรวจสอบว่าครบด้วย `npm run validate:env`

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

## � Security Best Practices

### ก่อน Deploy ต้องทำ:

#### 1. ตรวจสอบ Environment Variables

```bash
# Validate ทั้งหมด
npm run validate:env:prod

# Security check
npm run security:check
```

#### 2. ตรวจสอบไฟล์ Sensitive

```bash
# ตรวจสอบว่าไฟล์เหล่านี้ไม่ถูก commit
git status | grep -E '\.env|service-account'

# ถ้าพบไฟล์ sensitive ให้ลบออกจาก Git history ทันที
git log --all --full-history -- "*service-account*.json"
```

#### 3. อ่าน Security Checklist

**📚 เอกสารที่ต้องอ่าน:**

- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - **ต้องอ่าน!** Security best practices ครบถ้วน
- [PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md) - รายงานการตรวจสอบโปรเจค

### Quick Security Checklist:

- [ ] ✅ `.env.local` ไม่ถูก commit (ตรวจสอบด้วย `git status`)
- [ ] ✅ `service-account-key.json` ไม่ถูก commit
- [ ] ✅ เปลี่ยน SMTP password เป็น App Password (ไม่ใช่รหัส Gmail ปกติ)
- [ ] ✅ ตั้งค่า Firestore Security Rules แล้ว
- [ ] ✅ ตั้งค่า Storage Rules แล้ว
- [ ] ✅ ตั้งค่า Firebase Authentication domains
- [ ] ✅ ตรวจสอบ API key restrictions ใน Google Cloud Console
- [ ] ✅ รัน `npm run validate:env:prod` ผ่าน
- [ ] ✅ รัน `npm run security:check` ผ่าน
- [ ] ✅ อ่าน SECURITY_CHECKLIST.md ครบ

### วิธีตรวจสอบ:

```bash
# 1. Validate environment
npm run validate:env:prod

# 2. Security audit
npm run security:check

# 3. ตรวจสอบ Git
git status
git log --all --full-history -- "*.env" "*service-account*"

# 4. ตรวจสอบ npm vulnerabilities
npm audit
```

**⚠️ หากพบปัญหา:**

- อ่าน [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) Section: "Critical Security Issues"
- หรือดูที่ [PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md) Section: "Critical Issues"

---

## 🔍 Troubleshooting

### 🔴 ปัญหาที่พบบ่อยที่สุด

#### ปัญหา 1: `npm run validate:env` ล้มเหลว ❌

**อาการ**: แสดง "Missing: VITE_FIREBASE_API_KEY" หรือ environment variables อื่นๆ

**สาเหตุ**: ยังไม่ได้สร้างไฟล์ `.env.local` หรือใส่ค่าไม่ครบ

**วิธีแก้**:

```bash
# 1. สร้างไฟล์จาก template
cp .env.example .env.local

# 2. แก้ไขใส่ค่าจริง (ดูวิธีใน section Environment Variables)
code .env.local

# 3. ตรวจสอบอีกครั้ง
npm run validate:env
```

**ดูวิธีการ**: [Environment Variables Section](#-environment-variables)

---

#### ปัญหา 2: Firebase Login ไม่ได้ 🔐

**อาการ**: `firebase login` ไม่สำเร็จ

**วิธีแก้**:

```bash
# Clear credentials และ login ใหม่
firebase logout
firebase login --reauth

# ถ้ายังไม่ได้ ลอง interactive mode
firebase login --interactive
```

---

#### ปัญหา 3: npm install ล้มเหลว 📦

**อาการ**: Error ขณะติดตั้ง dependencies

**วิธีแก้**:

```bash
# ลบ node_modules และ lock file
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install

# ถ้ายังไม่ได้ ลองใช้ --legacy-peer-deps
npm install --legacy-peer-deps
```

---

#### ปัญหา 4: Functions Deploy Failed 🔥

**อาการ**: `firebase deploy --only functions` ไม่สำเร็จ

**วิธีแก้**:

```bash
# 1. ตรวจสอบ Node.js version
node --version  # ต้องเป็น v18 ขึ้นไป

# 2. ตรวจสอบ service account key
ls -la functions/service-account-key.json

# 3. Re-build functions
cd functions
npm install
npm run build
cd ..

# 4. Deploy ใหม่
firebase deploy --only functions

# 5. ถ้ายังไม่ได้ ตรวจสอบ logs
firebase functions:log
```

---

#### ปัญหา 5: Environment Variables ไม่ทำงาน ⚙️

**อาการ**: แอปรันได้ แต่ Firebase ไม่ทำงาน

**วิธีแก้**:

```bash
# 1. ตรวจสอบว่าไฟล์มีอยู่
ls -la .env.local

# 2. ตรวจสอบเนื้อหา
cat .env.local | grep VITE_FIREBASE

# 3. Validate
npm run validate:env

# 4. Restart dev server
# กด Ctrl+C ใน terminal ที่รัน npm run dev
npm run dev
```

---

#### ปัญหา 6: Admin Access ไม่ได้ 👤

**อาการ**: Login ได้ แต่เข้า `/admin` ไม่ได้

**วิธีแก้**:

```bash
# 1. ตรวจสอบ custom claims
node check-admin-setup.mjs

# 2. ถ้าไม่มี claims ให้ตั้งค่าใหม่
cd functions
node set-super-admin.mjs your-email@gmail.com
cd ..

# 3. Force logout และ login ใหม่
# - เปิด https://peace-script-ai.web.app
# - Logout
# - Clear browser cache (Ctrl+Shift+Delete)
# - Login ใหม่

# 4. ตรวจสอบ Firebase Console
# Firebase Console > Authentication > Users > [user] > Custom claims
# ควรเห็น: {"admin": true, "adminRole": "super-admin"}
```

---

#### ปัญหา 7: Build ล้มเหลว (TypeScript errors) 📝

**อาการ**: `npm run build` แสดง TypeScript errors

**วิธีแก้**:

```bash
# 1. ตรวจสอบ errors
npm run type-check

# 2. ถ้ามี errors เยอะ อาจเป็น strictNullChecks
# อ่าน: IMPROVEMENT_PLAN.md Section: Phase 2

# 3. Temporary fix (ไม่แนะนำ):
# แก้ไข tsconfig.json:
# "strictNullChecks": false

# 4. แก้ไขถูกต้อง:
# อ่านและทำตาม IMPROVEMENT_PLAN.md
```

---

### 🔧 เครื่องมือช่วยแก้ปัญหา

```bash
# ตรวจสอบสุขภาพโปรเจค
npm run validate:env      # Environment variables
npm run lint             # Code quality
npm run type-check       # TypeScript errors
npm run test             # Unit tests
npm run security:check   # Security audit

# ตรวจสอบ Firebase
firebase projects:list   # โปรเจคที่เชื่อมต่อ
firebase use             # โปรเจคปัจจุบัน
firebase functions:log   # Logs ของ functions

# ตรวจสอบ npm
npm outdated            # Dependencies ล้าสมัย
npm audit               # Security vulnerabilities
```

---

### 📚 เอกสารที่ช่วยได้

**หากพบปัญหาที่แก้ไม่ได้:**

1. อ่าน [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) - แผนการพัฒนาและแก้ไข
2. อ่าน [PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md) - ปัญหาที่ทราบแล้ว
3. อ่าน [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - หาก security issues
4. ดู Firebase Functions logs: `firebase functions:log`
5. ดู browser console (F12) เพื่อดู frontend errors

---

### 🆘 ขอความช่วยเหลือ

ถ้าแก้ไม่ได้:

1. ✅ ตรวจสอบ Troubleshooting ทั้งหมดข้างบนก่อน
2. ✅ อ่านเอกสารที่เกี่ยวข้อง
3. ✅ Collect logs:
   ```bash
   firebase functions:log > functions.log
   npm run dev 2>&1 > dev.log
   ```
4. 📧 ติดต่อทีม: dev@peace-script-ai.web.app

---

## 📚 เอกสารอ้างอิง

### 📖 คู่มือหลัก (ต้องอ่าน)

1. **[README.md](./README.md)** - ข้อมูลโปรเจคและคุณสมบัติ
2. **[QUICK_START.md](./QUICK_START.md)** - คู่มือเริ่มต้นใช้งาน
3. **[SETUP.md](./SETUP.md)** - คู่มือนี้ (การติดตั้ง)

### 🔐 Security & Quality (สำคัญ!)

4. **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** ⭐ - Security best practices
5. **[PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md)** - รายงานการตรวจสอบโปรเจค
6. **[IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)** - แผนการพัฒนาและปรับปรุง

### 👨‍💼 Admin & Management

7. **[QUICK_START_ADMIN_MANAGEMENT.md](./QUICK_START_ADMIN_MANAGEMENT.md)** - คู่มือจัดการ Admin
8. **[ADMIN_README.md](./ADMIN_README.md)** - คู่มือ Admin Dashboard

### 🚀 Deployment & Development

9. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - คู่มือ deployment แบบละเอียด
10. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - คู่มือสำหรับนักพัฒนา

### 📝 Project Information

11. **[CHANGELOG.md](./CHANGELOG.md)** - ประวัติการเปลี่ยนแปลง
12. **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - สถานะโปรเจคปัจจุบัน
13. **[AUDIT_SUMMARY.md](./AUDIT_SUMMARY.md)** - สรุปผลการตรวจสอบล่าสุด

---

### 📊 เอกสารตามหน้าที่

**สำหรับ Developer ใหม่:**

1. README.md → QUICK_START.md → SETUP.md (ไฟล์นี้)
2. DEVELOPMENT_GUIDE.md
3. SECURITY_CHECKLIST.md

**สำหรับ DevOps/Deployment:**

1. SETUP.md → DEPLOYMENT_GUIDE.md
2. SECURITY_CHECKLIST.md (ทั้งไฟล์)
3. PROJECT_AUDIT_REPORT.md

**สำหรับ Admin/Management:**

1. ADMIN_README.md
2. QUICK_START_ADMIN_MANAGEMENT.md
3. PROJECT_STATUS.md

**สำหรับ Team Lead:**

1. PROJECT_AUDIT_REPORT.md (ดูคะแนนและปัญหา)
2. IMPROVEMENT_PLAN.md (วางแผนทีม)
3. AUDIT_SUMMARY.md (สรุปล่าสุด)

---

## ✅ Checklist หลัง Setup

**ก่อนเริ่มทำงาน ตรวจสอบว่า:**

### พื้นฐาน:

- [ ] ✅ Node.js v18+ ติดตั้งแล้ว
- [ ] ✅ Firebase CLI ติดตั้งแล้ว
- [ ] ✅ Clone โปรเจคสำเร็จ
- [ ] ✅ `npm install` สำเร็จ
- [ ] ✅ สร้าง `.env.local` แล้ว
- [ ] ✅ `npm run validate:env` ผ่าน ✅
- [ ] ✅ `npm run dev` รันได้
- [ ] ✅ เปิด http://localhost:5173 เห็นหน้าเว็บ
- [ ] ✅ Login ได้
- [ ] ✅ อ่าน SECURITY_CHECKLIST.md แล้ว
- [ ] ✅ Service account key ไม่อยู่ใน Git

### สำหรับ Admin:

- [ ] ✅ ตั้งค่า Super Admin แล้ว
- [ ] ✅ เข้า `/admin` ได้
- [ ] ✅ ทดสอบส่งคำเชิญ Admin ได้

### สำหรับ Production:

- [ ] ✅ `npm run validate:env:prod` ผ่าน
- [ ] ✅ `npm run security:check` ผ่าน
- [ ] ✅ อ่าน SECURITY_CHECKLIST.md ครบ
- [ ] ✅ Firebase rules deploy แล้ว
- [ ] ✅ Functions deploy แล้ว

---

## 📞 Support & Contact

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. **ตรวจสอบ [Troubleshooting](#-troubleshooting) ก่อน**
2. **อ่าน [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)** - แผนการแก้ไขปัญหาที่ทราบแล้ว
3. **ดู [PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md)** - ปัญหาที่พบและวิธีแก้
4. **อ่าน [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** - หาก security issues
5. **ติดต่อทีม**: dev@peace-script-ai.web.app

---

## 📝 Notes

- **Git History**: ไฟล์เอกสารที่ถูกลบยังอยู่ใน git history สามารถดูได้ด้วย `git log --all -- <filename>`
- **Backup**: แนะนำให้ backup ไฟล์ `.env.local` และ `service-account-key.json` ไว้ในที่ปลอดภัย (อย่าเก็บใน Git)
- **Updates**: ตรวจสอบ dependencies updates เป็นประจำด้วย `npm outdated`
- **Security**: รัน `npm run security:check` เป็นประจำ

---

**Last Updated**: December 19, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready  
**Author**: Peace Script AI Team  
**Audit Score**: 85/100 (เป้าหมาย: 95+)
