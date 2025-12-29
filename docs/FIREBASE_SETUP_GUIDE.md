# 🔥 Firebase Setup Guide - Peace Script AI

## ขั้นตอนที่ 1: สร้าง Firebase Project (5 นาที)

### 1.1 ไปที่ Firebase Console

```
https://console.firebase.google.com/
```

### 1.2 คลิก "Add project" (เพิ่มโปรเจค)

### 1.3 ตั้งชื่อโปรเจค

```
ชื่อแนะนำ: peace-script-ai
หรือชื่อที่คุณต้องการ
```

### 1.4 Google Analytics

- เปิด/ปิดตามต้องการ (แนะนำปิดสำหรับความเร็ว)
- หากเปิด เลือก Default Account

### 1.5 คลิก "Create project"

- รอ 30-60 วินาที
- คลิก "Continue"

---

## ขั้นตอนที่ 2: เปิดใช้งาน Authentication (3 นาที)

### 2.1 ไปที่ Authentication

```
เมนูซ้าย > Build > Authentication
```

### 2.2 คลิก "Get started"

### 2.3 เปิดใช้งาน Email/Password

1. คลิก "Email/Password"
2. เปิด Enable (สวิตช์แรก)
3. คลิก "Save"

### 2.4 เปิดใช้งาน Google Sign-in

1. คลิก "Google"
2. เปิด Enable
3. เลือก Support email (อีเมลของคุณ)
4. คลิก "Save"

---

## ขั้นตอนที่ 3: สร้าง Firestore Database (4 นาที)

### 3.1 ไปที่ Firestore Database

```
เมนูซ้าย > Build > Firestore Database
```

### 3.2 คลิก "Create database"

### 3.3 เลือกโหมด

```
✅ เลือก: Start in production mode
(เราจะใส่ Security Rules ทีหลัง)
```

### 3.4 เลือก Region (สำคัญ!)

```
แนะนำสำหรับไทย:
- asia-southeast1 (Singapore)
- asia-southeast2 (Jakarta)

คลิก "Enable"
รอ 1-2 นาที
```

---

## ขั้นตอนที่ 4: เปิดใช้งาน Storage (2 นาที)

### 4.1 ไปที่ Storage

```
เมนูซ้าย > Build > Storage
```

### 4.2 คลิก "Get started"

### 4.3 Security Rules

```
✅ เลือก: Start in production mode
```

### 4.4 เลือก Location

```
ใช้ Location เดียวกับ Firestore
เช่น: asia-southeast1
```

### 4.5 คลิก "Done"

---

## ขั้นตอนที่ 5: รับ Firebase Config (3 นาที)

### 5.1 ไปที่ Project Settings

```
คลิกไอคอน ⚙️ ข้าง Project Overview
เลือก "Project settings"
```

### 5.2 Scroll ลงมาหา "Your apps"

### 5.3 คลิก Web Icon `</>`

```
ตั้งชื่อ App: Peace Script AI
ไม่ต้องติ๊ก "Firebase Hosting" ตอนนี้
คลิก "Register app"
```

### 5.4 คัดลอก Config

จะเห็นโค้ดแบบนี้:

```javascript
const firebaseConfig = {
  apiKey: 'REDACTED_API_KEY',
  authDomain: 'peace-script-ai.firebaseapp.com',
  projectId: 'peace-script-ai',
  storageBucket: 'peace-script-ai.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
};
```

### 5.5 คัดลอกค่าเหล่านี้ไปใส่ในไฟล์ `.env`

---

## ขั้นตอนที่ 6: อัพเดท .env File (2 นาที)

### 6.1 เปิดไฟล์ `.env.local` ใน Project

```bash
# หากยังไม่มีไฟล์ ให้สร้างใหม่
touch .env.local
```

### 6.2 ใส่ข้อมูล Firebase Config

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=REDACTED_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=peace-script-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=peace-script-ai
VITE_FIREBASE_STORAGE_BUCKET=peace-script-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Gemini AI (ที่มีอยู่แล้ว)
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 6.3 บันทึกไฟล์

---

## ขั้นตอนที่ 7: ทดสอบ Local (2 นาที)

### 7.1 เปิด Terminal และรัน

```bash
npm run dev
```

### 7.2 เปิดเบราว์เซอร์

```
http://localhost:5173
```

### 7.3 ทดสอบ Sign Up

1. คลิก "Sign Up"
2. ใส่อีเมล, รหัสผ่าน, ชื่อ
3. คลิก "Sign Up"
4. ตรวจสอบว่าสมัครสำเร็จ

### 7.4 ทดสอบ Google Sign-in

1. คลิก "Sign in with Google"
2. เลือกบัญชี Google
3. ตรวจสอบว่าเข้าสู่ระบบสำเร็จ

### 7.5 ตรวจสอบใน Firebase Console

```
Authentication > Users
ควรเห็นผู้ใช้ที่สร้างใหม่
```

---

## ⚠️ ข้อควรระวัง

### Security Rules ยังไม่ Deploy!

- ตอนนี้ใช้งาน Local ได้แล้ว
- **แต่ต้อง Deploy Security Rules ก่อนใช้งานจริง**
- จะทำในขั้นตอนถัดไป (Phase 5)

### Authorized Domains สำหรับ Google Sign-in

หากต้องการใช้ Google Sign-in บน Production:

1. ไปที่ `Authentication > Settings > Authorized domains`
2. เพิ่ม Domain ของคุณ เช่น:
   - `peace-script-ai.web.app` (Firebase Hosting)
   - `yourdomain.com` (Custom Domain)

---

## 📊 สรุปสิ่งที่ทำ

✅ สร้าง Firebase Project  
✅ เปิดใช้งาน Email/Password Authentication  
✅ เปิดใช้งาน Google Sign-in  
✅ สร้าง Firestore Database (asia-southeast1)  
✅ เปิดใช้งาน Storage  
✅ รับ Firebase Config  
✅ อัพเดท .env.local  
✅ ทดสอบ Local สำเร็จ

---

## 🚀 พร้อมสำหรับ Phase 5: Deployment!

ต่อไปจะเป็น:

1. Deploy Firestore Security Rules
2. Deploy Storage Security Rules
3. Deploy Website ไปที่ Firebase Hosting
4. ทดสอบ Production

---

## 🆘 แก้ไขปัญหาที่พบบ่อย

### ปัญหา: Google Sign-in ไม่ทำงานบน Local

**แก้ไข:**

```
1. ไปที่ Authentication > Settings > Authorized domains
2. เพิ่ม "localhost"
```

### ปัญหา: Firestore Permission Denied

**แก้ไข:**

```
ยังไม่ได้ Deploy Security Rules
จะแก้ไขใน Phase 5
```

### ปัญหา: Build Error - Cannot find module 'firebase'

**แก้ไข:**

```bash
npm install firebase
```

### ปัญหา: Environment Variables ไม่ทำงาน

**แก้ไข:**

```bash
# Restart Dev Server
npm run dev
```

---

**หากทุกขั้นตอนทำสำเร็จ พร้อม Deploy แล้ว! 🎉**

