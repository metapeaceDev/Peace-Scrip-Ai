# ✅ Checklist: ย้ายโปรเจคไปเครื่องใหม่

## 📋 ก่อนย้ายเครื่อง (เครื่องเก่า)

### 1. Backup ไฟล์สำคัญ

- [ ] **`.env`** - สำรองไฟล์ environment variables
- [ ] **`functions/.env`** - สำรอง SMTP และ Admin email config
- [ ] **`functions/service-account-key.json`** - สำรอง Firebase service account key
- [ ] **รหัสผ่านและ API Keys** - บันทึกไว้ในที่ปลอดภัย (Password Manager)
  - Firebase API Key
  - RunPod API Key
  - Gemini API Key
  - SMTP App Password
  - Google Cloud credentials

### 2. ตรวจสอบข้อมูล Git

- [x] ✅ Git commit ครบทุกไฟล์
- [x] ✅ Git push ไป GitHub แล้ว
- [ ] ตรวจสอบ commit ล่าสุด:
  ```bash
  git log -1 --oneline
  # ควรเห็น: 75448e10b docs: Add comprehensive SETUP.md...
  ```

### 3. ตรวจสอบ Deployment

- [x] ✅ Firebase Functions deployed
- [x] ✅ Firebase Hosting deployed
- [x] ✅ Firestore Rules deployed
- [ ] ตรวจสอบว่าเว็บไซต์ทำงานปกติ: https://peace-script-ai.web.app
- [ ] ทดสอบ Admin Dashboard: https://peace-script-ai.web.app/admin

### 4. บันทึกข้อมูล Firebase Project

- [ ] **Project ID**: `peace-script-ai`
- [ ] **Project Number**: `663785367659`
- [ ] **Region**: `asia-southeast1`
- [ ] **Super Admin Email**: (บันทึกไว้)

### 5. สำรองไฟล์เพิ่มเติม (ถ้ามี)

- [ ] ComfyUI Models (ถ้าดาวน์โหลดไว้)
- [ ] Voice Cloning Models
- [ ] ไฟล์ทดสอบและ sample data

---

## 🖥️ ที่เครื่องใหม่

### 1. ติดตั้ง Software ที่จำเป็น

- [ ] **Node.js v18+**
  ```bash
  node --version  # ตรวจสอบว่าเป็น v18.x.x+
  ```
- [ ] **Git**
  ```bash
  git --version
  ```
- [ ] **Firebase CLI**
  ```bash
  npm install -g firebase-tools
  firebase --version
  ```
- [ ] **Google Cloud SDK**
  ```bash
  gcloud --version
  ```
- [ ] **Python 3.8+** (ถ้าใช้ Voice Cloning)
  ```bash
  python3 --version
  ```

### 2. Clone Project

- [ ] Clone repository:
  ```bash
  git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
  cd Peace-Scrip-Ai
  ```
- [ ] ตรวจสอบว่า clone สำเร็จ:
  ```bash
  ls -la SETUP.md  # ควรเห็นไฟล์
  ```

### 3. ติดตั้ง Dependencies

- [ ] Install frontend dependencies:
  ```bash
  npm install
  ```
- [ ] Install functions dependencies:
  ```bash
  cd functions
  npm install
  cd ..
  ```

### 4. กู้คืนไฟล์ที่ Backup ไว้

#### ไฟล์ `.env` (Root)

- [ ] สร้างไฟล์ `.env` ที่ root:
  ```bash
  touch .env
  ```
- [ ] Copy ข้อมูลจากเครื่องเก่า (หรือใช้ข้อมูลที่ backup ไว้)
- [ ] ตรวจสอบว่ามีครบทุก key:
  ```bash
  cat .env | grep VITE_
  ```

#### ไฟล์ `functions/.env`

- [ ] สร้างไฟล์ `functions/.env`:
  ```bash
  touch functions/.env
  ```
- [ ] Copy ข้อมูล SMTP และ Admin email
- [ ] ตรวจสอบ:
  ```bash
  cat functions/.env
  ```

#### Service Account Key

- [ ] Copy `service-account-key.json` ไปที่ `functions/`:

  ```bash
  # ตรวจสอบว่าไฟล์อยู่ที่ถูกต้อง
  ls -la functions/service-account-key.json

  # ตรวจสอบว่าเป็น JSON ที่ถูกต้อง
  cat functions/service-account-key.json | grep private_key_id
  ```

- [ ] **⚠️ ห้าม commit ไฟล์นี้!** (อยู่ใน .gitignore แล้ว)

### 5. เชื่อมต่อ Firebase และ Google Cloud

#### Firebase Login

- [ ] Login:
  ```bash
  firebase login
  ```
- [ ] เชื่อมต่อกับ project:
  ```bash
  firebase use peace-script-ai
  ```
- [ ] ตรวจสอบ:
  ```bash
  firebase projects:list
  firebase use  # ควรแสดง peace-script-ai
  ```

#### Google Cloud Login

- [ ] Login:
  ```bash
  gcloud auth login
  ```
- [ ] ตั้งค่า project:
  ```bash
  gcloud config set project peace-script-ai
  ```
- [ ] ตรวจสอบ:
  ```bash
  gcloud config get-value project
  ```

### 6. ทดสอบ Local Development

- [ ] Start dev server:
  ```bash
  npm run dev
  ```
- [ ] เปิดเบราว์เซอร์: http://localhost:5173
- [ ] ทดสอบ login
- [ ] ทดสอบ admin access (ถ้าคุณเป็น super admin)

### 7. ทดสอบ Functions (Optional)

- [ ] Build functions:
  ```bash
  cd functions
  npm run build
  cd ..
  ```
- [ ] Deploy functions (ถ้าต้องการ):
  ```bash
  firebase deploy --only functions
  ```

### 8. ตรวจสอบ Git Configuration

- [ ] ตั้งค่า Git user:
  ```bash
  git config user.name "Your Name"
  git config user.email "your-email@example.com"
  ```
- [ ] ตรวจสอบ remote:
  ```bash
  git remote -v
  # ควรเห็น origin pointing to GitHub
  ```

---

## 🔒 Security Verification

- [ ] ตรวจสอบว่า `.env` **ไม่อยู่ใน** git:
  ```bash
  git status  # ไม่ควรเห็น .env
  ```
- [ ] ตรวจสอบว่า `service-account-key.json` **ไม่อยู่ใน** git:
  ```bash
  git status  # ไม่ควรเห็น service-account-key.json
  ```
- [ ] ตรวจสอบ .gitignore:
  ```bash
  cat .gitignore | grep -E "\.env|service-account"
  ```

---

## ✅ Final Checks

- [ ] Local development server ทำงานปกติ
- [ ] Login ได้
- [ ] Admin dashboard เข้าได้ (ถ้าเป็น admin)
- [ ] Git push/pull ได้
- [ ] Firebase deploy ได้ (ถ้าต้องการ)

---

## 📝 Notes

**ไฟล์ที่ต้อง Backup** (ห้าม commit):

- `.env`
- `functions/.env`
- `functions/service-account-key.json`

**ไฟล์ที่อยู่ใน Git** (Clone มาได้เลย):

- Source code ทั้งหมด
- `SETUP.md` (คู่มือนี้)
- Documentation files
- Firebase configuration files (firebase.json, firestore.rules, etc.)

**คำแนะนำ**:

- ใช้ Password Manager (1Password, Bitwarden, etc.) เก็บ API keys และรหัสผ่าน
- สำรองไฟล์ `.env` และ service account key ไว้ในที่ปลอดภัย (เช่น encrypted USB, cloud storage ที่ secure)
- อย่าส่งไฟล์ sensitive ผ่าน email หรือ messaging apps

---

## 🆘 Troubleshooting

### ปัญหา: npm install ล้มเหลว

```bash
# ลบ node_modules และ package-lock.json
rm -rf node_modules package-lock.json
npm install
```

### ปัญหา: Firebase login ไม่ได้

```bash
firebase logout
firebase login --reauth
```

### ปัญหา: Functions build failed

```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
cd ..
```

### ปัญหา: Git clone ช้า

```bash
# Clone แบบ shallow (ไม่เอา history เก่า)
git clone --depth 1 https://github.com/metapeaceDev/Peace-Scrip-Ai.git
```

---

**เอกสารอ้างอิง**: [SETUP.md](./SETUP.md)

---

**Last Updated**: 2024
**Checklist Version**: 1.0.0
