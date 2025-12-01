# 🚀 Peace Script AI - Deployment Guide

## สถานะโปรเจค

✅ **80% Complete** - พร้อม Deploy!

- ✅ Code เสร็จสมบูรณ์
- ✅ Firebase SDK ติดตั้งแล้ว
- ✅ Security Rules พร้อมใช้งาน
- ✅ Build ผ่าน (0 errors)
- ⏳ รอ Firebase Project Config

---

## 🎯 Quick Deploy (10 นาที)

### ขั้นตอนที่ 1: สร้าง Firebase Project

1. เข้า https://console.firebase.google.com/
2. Create Project → ตั้งชื่อ → Create
3. เปิดใช้งาน:
   - **Authentication** (Email + Google)
   - **Firestore** (asia-southeast1)
   - **Storage** (asia-southeast1)

### ขั้นตอนที่ 2: ตั้งค่า Environment

```bash
# คัดลอก template
cp .env.template .env.local

# แก้ไข .env.local ใส่ค่าจาก Firebase Console
# (Project Settings > Your apps > Config)
```

### ขั้นตอนที่ 3: Deploy

**วิธีที่ 1: ใช้ Script (แนะนำ)**
```bash
./deploy.sh
```

**วิธีที่ 2: Manual**
```bash
firebase login
firebase init
npm run firebase:deploy
```

---

## 📚 คู่มือละเอียด

| ไฟล์ | จุดประสงค์ |
|------|-----------|
| `QUICK_START_FIREBASE.md` | ⚡ เริ่มต้นเร็ว (อ่านก่อน!) |
| `FIREBASE_SETUP_GUIDE.md` | 📖 ขั้นตอนละเอียดทุกขั้น |
| `FIREBASE_DEPLOY.md` | 🚀 การ Deploy แบบเต็ม |
| `DEPLOYMENT_STATUS.md` | 📊 สถานะปัจจุบัน |

---

## 🔧 Scripts

```bash
# Build project
npm run build

# Deploy ทั้งหมด
npm run firebase:deploy

# Deploy เฉพาะ Rules
npm run firebase:rules

# Deploy เฉพาะ Hosting
npm run firebase:hosting

# ใช้ Deploy Script (All-in-one)
./deploy.sh
```

---

## ✅ Checklist

### ก่อน Deploy
- [ ] สร้าง Firebase Project แล้ว
- [ ] เปิดใช้งาน Authentication
- [ ] สร้าง Firestore Database
- [ ] เปิดใช้งาน Storage
- [ ] คัดลอก Config ใส่ `.env.local`
- [ ] Build สำเร็จ (`npm run build`)

### หลัง Deploy
- [ ] Website เปิดได้
- [ ] Sign Up ทำงาน
- [ ] Google Sign-in ทำงาน
- [ ] สร้างโปรเจคได้
- [ ] บันทึกข้อมูลได้
- [ ] ตรวจสอบ Firestore Console

---

## 🎯 Expected Results

**Hosting URL:**
```
https://YOUR-PROJECT-ID.web.app
https://YOUR-PROJECT-ID.firebaseapp.com
```

**Features:**
- ✅ Email/Password Authentication
- ✅ Google Sign-in
- ✅ Cloud Database (Firestore)
- ✅ File Storage
- ✅ Offline Mode
- ✅ Auto-sync
- ✅ SSL/HTTPS

---

## 🆘 Troubleshooting

### Build Error
```bash
# ลบ node_modules แล้วติดตั้งใหม่
rm -rf node_modules
npm install
npm run build
```

### Firebase CLI Error
```bash
# อัพเดท Firebase CLI
npm install -g firebase-tools@latest
firebase --version
```

### Permission Denied
```bash
# Deploy Security Rules
firebase deploy --only firestore:rules,storage:rules
```

### Google Sign-in Error
```
1. Firebase Console
2. Authentication > Settings > Authorized domains
3. เพิ่ม: YOUR-PROJECT-ID.web.app
```

---

## 📊 Performance

**Build Stats:**
- Build Time: ~1.15s
- Bundle Size: 1.06 MB
- Gzipped: 251 KB
- Chunks: 4 (optimized)

**Firebase Quotas (Free Tier):**
- Firestore Reads: 50,000/day
- Firestore Writes: 20,000/day
- Storage: 5 GB
- Hosting: 10 GB/month

---

## 🔐 Security

✅ **Implemented:**
- Firestore Security Rules (user isolation)
- Storage Security Rules (10MB limit)
- Environment Variables (.env.local)
- HTTPS (automatic)
- Input Validation
- Type Safety (TypeScript)

---

## 🌟 Features

### Authentication
- Email/Password registration
- Email/Password login
- Google OAuth Sign-in
- Session persistence
- Offline mode fallback

### Database
- Create/Read/Update/Delete projects
- Real-time sync
- Offline storage (IndexedDB)
- Auto-save (2s debounce)
- Cloud backup

### AI Features
- Character generation
- Scene generation
- Dialogue creation
- Storyboard generation
- Image generation (Gemini)

---

## 📞 Support

**Documentation:**
- `QUICK_START_FIREBASE.md` - Quick start
- `FIREBASE_SETUP_GUIDE.md` - Detailed setup
- `FIREBASE_DEPLOY.md` - Full deployment guide

**Resources:**
- Firebase Docs: https://firebase.google.com/docs
- Gemini AI: https://ai.google.dev/

---

## 🎉 Success!

เมื่อ Deploy สำเร็จ คุณจะได้:

✅ Professional screenwriting tool  
✅ Online ใช้งานได้ทั่วโลก  
✅ ระบบ Authentication ครบ  
✅ ฐานข้อมูล Cloud  
✅ ทำงาน Offline ได้  
✅ ปลอดภัย SSL/HTTPS  

---

**Ready to Deploy? อ่าน `QUICK_START_FIREBASE.md` 📖**
