# 🔐 Firebase Password Reset Configuration Guide

## ปัญหาที่พบ (Issues Found)

### 1. ❌ ขาด Firebase API Key
- **ปัญหา:** `VITE_FIREBASE_API_KEY` ถูก comment out ใน `.env`
- **ผลกระทบ:** Firebase Authentication ไม่สามารถทำงานได้อย่างสมบูรณ์
- **แก้ไข:** ✅ เพิ่ม API Key แล้ว

### 2. ⚠️ ต้องตรวจสอบ Firebase Console Settings

## การตั้งค่าที่จำเป็นใน Firebase Console

### ขั้นตอนที่ 1: Enable Email Template
1. เปิด [Firebase Console](https://console.firebase.google.com/project/peace-script-ai/authentication/emails)
2. ไปที่ **Authentication** > **Templates** (หรือ Email Templates)
3. เลือก **Password reset**
4. ตรวจสอบว่า:
   - ✅ Template ถูกเปิดใช้งาน (Enabled)
   - ✅ Sender name: "Peace Script AI" (หรือชื่อที่ต้องการ)
   - ✅ Sender email: `noreply@peace-script-ai.firebaseapp.com`

### ขั้นตอนที่ 2: ตั้งค่า Authorized Domains
1. ไปที่ **Authentication** > **Settings** > **Authorized domains**
2. ตรวจสอบว่ามี domains เหล่านี้:
   - ✅ `peace-script-ai.web.app`
   - ✅ `peace-script-ai.firebaseapp.com`
   - ✅ `localhost` (สำหรับ development)

### ขั้นตอนที่ 3: ตั้งค่า Action URL (Continue URL)
1. ไปที่ **Authentication** > **Settings** > **Authorized domains**
2. เพิ่ม domain ที่ใช้งานจริง

### ขั้นตอนที่ 4: ตรวจสอบ Email Provider
1. ไปที่ **Authentication** > **Sign-in method**
2. ตรวจสอบว่า **Email/Password** เปิดใช้งานแล้ว

## การทดสอบ

### วิธีที่ 1: ใช้ Test File
```bash
# เปิด firebase-test.html ในเบราว์เซอร์
open firebase-test.html
```

### วิธีที่ 2: ทดสอบใน Production
1. เปิด https://peace-script-ai.web.app
2. คลิก "ลืมรหัสผ่าน?"
3. กรอกอีเมลที่ลงทะเบียนแล้ว
4. คลิก "ส่งลิงก์รีเซ็ตรหัสผ่าน"
5. ตรวจสอบอีเมล (และ Spam folder)

### วิธีที่ 3: ตรวจสอบ Console Logs
เปิด Browser DevTools (F12) แล้วดูที่:
- **Console tab** - ดู error messages
- **Network tab** - ดู Firebase API calls

## การแก้ไขที่ทำไปแล้ว

### 1. เพิ่ม API Key
```bash
# ไฟล์: .env
# Get your API key from: firebase apps:sdkconfig web
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
```

### 2. ปรับปรุง resetPassword() Function
```typescript
// เพิ่ม validation
// เพิ่ม actionCodeSettings
// เพิ่ม detailed error logging
// เพิ่ม Thai error messages
```

### 3. ปรับปรุง Frontend Validation
```typescript
// ตรวจสอบอีเมลก่อนส่ง
// แสดง error messages ที่ชัดเจน
// เพิ่ม loading states
```

## Error Messages ที่เป็นไปได้

| Error Code | ความหมาย | วิธีแก้ |
|------------|---------|---------|
| `auth/user-not-found` | ไม่พบอีเมลในระบบ | ให้ user ตรวจสอบอีเมลหรือสมัครใหม่ |
| `auth/invalid-email` | รูปแบบอีเมลไม่ถูกต้อง | แจ้งให้ใส่อีเมลที่ถูกต้อง |
| `auth/too-many-requests` | ส่งคำขอมากเกินไป | รอสักครู่แล้วลองใหม่ |
| `auth/network-request-failed` | ไม่มีอินเทอร์เน็ต | ตรวจสอบการเชื่อมต่อ |
| `auth/configuration-not-found` | Firebase config ไม่ถูกต้อง | ตรวจสอบการตั้งค่าใน Console |

## ขั้นตอนการ Deploy

```bash
# 1. Build โปรเจ็ค
npm run build

# 2. Commit changes
git add -A
git commit -m "🔧 Fix: Added Firebase API Key and improved password reset"

# 3. Deploy to Firebase
firebase deploy --only hosting

# 4. ทดสอบบน production
# เปิด https://peace-script-ai.web.app
```

## Next Steps

1. ✅ Deploy โปรเจ็คใหม่
2. ⏳ ตรวจสอบ Firebase Console settings
3. ⏳ ทดสอบส่งอีเมลจริง
4. ⏳ ตรวจสอบว่าอีเมลมาถึง inbox

## สิ่งที่ต้องทำใน Firebase Console

### 🎯 สำคัญมาก!
**ไปที่ Firebase Console และตรวจสอบ:**

1. **Authentication > Templates > Password reset**
   - ต้อง **ENABLE** template
   - ตั้ง sender name และ email

2. **Authentication > Settings > Authorized domains**
   - เพิ่ม production domain

3. **Project Settings > Service accounts**
   - ตรวจสอบว่า API key มีสิทธิ์ส่งอีเมล

## การตรวจสอบว่าใช้งานได้

### ✅ สัญญาณที่ดี:
- Console แสดง "Password reset email sent successfully"
- ไม่มี error ใน Network tab
- ได้รับอีเมลภายใน 1-2 นาที

### ❌ สัญญาณที่มีปัญหา:
- Error: "auth/configuration-not-found"
- Error: "auth/invalid-continue-uri"
- ไม่ได้รับอีเมล

## ติดต่อ Support

หากยังมีปัญหา:
1. ตรวจสอบ Firebase Console > Authentication > Users ว่ามี user อยู่
2. ดู Firebase Console > Authentication > Usage ว่ามี email sent
3. ตรวจสอบ Spam folder ในอีเมล
4. ลอง whitelist `noreply@peace-script-ai.firebaseapp.com`
