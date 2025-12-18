# 🔐 Admin Access Setup Guide - Step by Step

**สำหรับ:** Peace Script AI Admin System  
**วันที่:** 19 ธันวาคม 2568  
**ระดับความสำคัญ:** 🔴 CRITICAL - ต้องทำก่อนใช้งาน Admin Dashboard

---

## 📋 Overview

เอกสารนี้แนะนำวิธีการตั้งค่า Admin Access สำหรับระบบ Peace Script AI ทีละขั้นตอน เพื่อให้คุณสามารถ:
- ✅ Grant admin privileges ให้ user แรก
- ✅ เข้าถึง Admin Dashboard
- ✅ จัดการ admin users เพิ่มเติม
- ✅ ตรวจสอบสิทธิ์และ permissions

---

## 🎯 Prerequisites (สิ่งที่ต้องมี)

### 1. Firebase Project
- ✅ Project: `peace-script-ai`
- ✅ Authentication enabled
- ✅ Firestore database
- ✅ Hosting deployed

### 2. Node.js & npm
```bash
node --version  # ควรเป็น v16 ขึ้นไป
npm --version   # ควรเป็น v8 ขึ้นไป
```

### 3. Firebase CLI
```bash
firebase --version  # ควรเป็น v11 ขึ้นไป
firebase login      # ต้อง login แล้ว
```

### 4. User Account
- มี email account ที่ต้องการให้เป็น admin
- Login เข้าระบบ Peace Script AI แล้วอย่างน้อย 1 ครั้ง
- รู้ User ID (UID) ของ account นั้น

---

## 🚀 Step 1: เตรียม Firebase Admin SDK

### 1.1 Download Service Account Key

1. เข้า **Firebase Console**: https://console.firebase.google.com
2. เลือก project **peace-script-ai**
3. ไปที่ **Project Settings** (⚙️ ด้านบนซ้าย)
4. เลือกแท็บ **Service Accounts**
5. คลิก **"Generate new private key"**
6. ยืนยันการ download → ได้ไฟล์ JSON

### 1.2 วางไฟล์ในโปรเจค

```bash
cd /Users/surasak.peace/Desktop/peace-script-basic-v1

# สร้าง directory scripts ถ้ายังไม่มี
mkdir -p scripts

# วางไฟล์ที่ download มาเป็นชื่อ service-account-key.json
# (ย้ายจาก Downloads folder)
mv ~/Downloads/peace-script-ai-*.json scripts/service-account-key.json
```

### 1.3 ตรวจสอบไฟล์

```bash
# ตรวจสอบว่ามีไฟล์
ls -la scripts/service-account-key.json

# ตรวจสอบ JSON structure
cat scripts/service-account-key.json | jq '.project_id'
# ควรแสดง: "peace-script-ai"
```

### 1.4 ⚠️ Security Warning

**อย่า commit ไฟล์นี้เข้า git!**

ตรวจสอบ `.gitignore`:
```bash
# ตรวจสอบ
grep "service-account-key.json" .gitignore

# ถ้าไม่มี ให้เพิ่ม
echo "scripts/service-account-key.json" >> .gitignore
```

---

## 🔑 Step 2: ติดตั้ง Firebase Admin SDK

### 2.1 Install Dependencies

```bash
cd /Users/surasak.peace/Desktop/peace-script-basic-v1

# Install firebase-admin (สำหรับ Node.js script)
npm install firebase-admin --save-dev
```

### 2.2 ตรวจสอบ Installation

```bash
# ตรวจสอบว่าติดตั้งแล้ว
npm list firebase-admin

# ควรเห็น
# └── firebase-admin@X.X.X
```

---

## 👤 Step 3: หา User ID ที่ต้องการให้เป็น Admin

### 3.1 วิธีที่ 1: จาก Firebase Console

1. ไปที่ **Firebase Console** → **Authentication**
2. ดูรายชื่อ users ในแท็บ **Users**
3. คลิกที่ user ที่ต้องการ
4. คัดลอก **User UID** (เช่น: `abc123def456...`)

### 3.2 วิธีที่ 2: จาก Code (ถ้า login อยู่)

เปิด browser console ใน https://peace-script-ai.web.app:

```javascript
// ดู current user UID
firebase.auth().currentUser.uid
```

### 3.3 บันทึก UID

```bash
# บันทึก UID ไว้ใช้ (แทนที่ด้วย UID จริง)
export ADMIN_USER_ID="abc123def456..."

# ตรวจสอบ
echo $ADMIN_USER_ID
```

---

## 🎯 Step 4: Grant Admin Access

### 4.1 ตรวจสอบ Script

```bash
# ตรวจสอบว่ามี script
ls -la scripts/set-admin-claims.js
```

ถ้าไม่มี → ไฟล์อยู่ที่ `/Users/surasak.peace/Desktop/peace-script-basic-v1/scripts/set-admin-claims.js`

### 4.2 รัน Script เพื่อ Grant Admin

```bash
cd /Users/surasak.peace/Desktop/peace-script-basic-v1

# Grant super-admin role
node scripts/set-admin-claims.js $ADMIN_USER_ID super-admin
```

**Expected Output:**
```
🔐 Firebase Admin SDK initialized
✅ Successfully granted super-admin role to user abc123def456...
🔑 Custom claims set: { admin: true, adminRole: 'super-admin' }
📄 Admin user document created in /admin-users/abc123def456...

✅ Done! User is now a super-admin.
⚠️  User must logout and login again for changes to take effect.
```

### 4.3 ตรวจสอบ Admin Claims

```bash
# ตรวจสอบว่า user มี admin claims แล้ว
node scripts/set-admin-claims.js $ADMIN_USER_ID permissions
```

**Expected Output:**
```
👤 User: abc123def456...
🔑 Admin: true
👑 Role: super-admin
✅ Permissions:
  - canViewAnalytics: true
  - canExportData: true
  - canManageAdmins: true
  - canViewAuditLog: true
  - canModifySettings: true
```

### 4.4 ดู Admin Users ทั้งหมด

```bash
# List all admin users
node scripts/set-admin-claims.js list
```

**Expected Output:**
```
📋 Admin Users:

1. abc123def456...
   Role: super-admin
   Created: 2024-12-19 14:30:45

Total: 1 admin user(s)
```

---

## ✅ Step 5: ทดสอบ Admin Access

### 5.1 Logout และ Login ใหม่

**สำคัญ!** Custom claims จะมีผลเมื่อ refresh token เท่านั้น

1. เปิด https://peace-script-ai.web.app
2. คลิก **Logout**
3. คลิก **Login** อีกครั้ง
4. Login ด้วย admin account

### 5.2 ตรวจสอบ Admin Button

หลัง login:
1. ไปที่ **Studio** page
2. ควรเห็นปุ่ม **📊 Admin** สีส้ม-แดง (ด้านบนขวา)

### 5.3 เข้า Admin Dashboard

1. คลิกปุ่ม **📊 Admin**
2. ระบบจะเปลี่ยนไปหน้า Admin Dashboard
3. ควรเห็น:
   - Overview Cards (6 cards)
   - User Table
   - Export Button

### 5.4 ทดสอบ User Details Modal

1. คลิก row ใดๆ ใน User Table
2. Modal ควรเปิดขึ้นมา แสดง:
   - User Information
   - Subscription
   - Monthly Usage
   - Projects

---

## 🔧 Troubleshooting

### ❌ ปัญหา: ไม่เห็นปุ่ม Admin

**สาเหตุเป็นไปได้:**

1. **ยังไม่ได้ logout/login ใหม่**
   ```bash
   # ตรวจสอบว่า grant admin แล้วหรือยัง
   node scripts/set-admin-claims.js $ADMIN_USER_ID permissions
   ```
   → ถ้า grant แล้ว: **Logout และ Login ใหม่**

2. **Grant admin ไม่สำเร็จ**
   ```bash
   # ลองรันอีกครั้ง
   node scripts/set-admin-claims.js $ADMIN_USER_ID super-admin
   ```

3. **Service account key ไม่ถูกต้อง**
   ```bash
   # ตรวจสอบไฟล์
   cat scripts/service-account-key.json | jq '.project_id'
   # ต้องเป็น "peace-script-ai"
   ```

### ❌ ปัญหา: Error "Cannot find module 'firebase-admin'"

```bash
# Install firebase-admin
npm install firebase-admin --save-dev

# ลองรันอีกครั้ง
node scripts/set-admin-claims.js $ADMIN_USER_ID super-admin
```

### ❌ ปัญหา: Error "ENOENT: no such file or directory"

```bash
# ตรวจสอบว่ามีไฟล์
ls scripts/service-account-key.json

# ถ้าไม่มี → download ใหม่จาก Firebase Console
```

### ❌ ปัญหา: "Access Denied" ใน Admin Dashboard

1. **ตรวจสอบ custom claims:**
   ```bash
   node scripts/set-admin-claims.js $ADMIN_USER_ID permissions
   ```

2. **ตรวจสอบ Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Clear browser cache และ logout/login ใหม่**

---

## 👥 จัดการ Admin Users เพิ่มเติม

### Grant Admin ให้ user อื่น

```bash
# Admin role (ไม่สามารถจัดการ admin คนอื่นได้)
node scripts/set-admin-claims.js <USER_ID> admin

# Viewer role (ดูได้อย่างเดียว ไม่สามารถ export)
node scripts/set-admin-claims.js <USER_ID> viewer
```

### Revoke Admin

```bash
# ยกเลิก admin access
node scripts/set-admin-claims.js <USER_ID> revoke
```

### List All Admins

```bash
# ดู admin ทั้งหมด
node scripts/set-admin-claims.js list
```

---

## 🎯 Admin Roles & Permissions

### Super Admin
- ✅ ดู analytics ทั้งหมด
- ✅ Export data
- ✅ จัดการ admin users อื่น (grant/revoke)
- ✅ ดู audit logs
- ✅ แก้ไข settings

### Admin
- ✅ ดู analytics ทั้งหมด
- ✅ Export data
- ✅ ดู audit logs
- ❌ จัดการ admin users

### Viewer
- ✅ ดู analytics (read-only)
- ❌ Export data
- ❌ ดู audit logs
- ❌ จัดการ admin users

---

## 📊 Firestore Collections

หลัง grant admin, ระบบจะสร้าง:

### `/admin-users/{userId}`
```json
{
  "userId": "abc123...",
  "email": "admin@example.com",
  "role": "super-admin",
  "permissions": {
    "canViewAnalytics": true,
    "canExportData": true,
    "canManageAdmins": true,
    "canViewAuditLog": true,
    "canModifySettings": true
  },
  "createdAt": Timestamp,
  "createdBy": "system",
  "lastActive": Timestamp
}
```

### `/admin-audit-log/{logId}`
```json
{
  "timestamp": Timestamp,
  "userId": "abc123...",
  "action": "view_dashboard",
  "resource": "/admin/analytics",
  "ipAddress": "xxx.xxx.xxx.xxx",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🔐 Security Best Practices

### 1. Service Account Key
- ❌ อย่า commit เข้า git
- ❌ อย่าแชร์ไฟล์กับใคร
- ✅ เก็บไฟล์ไว้ที่ปลอดภัย
- ✅ เพิ่มใน `.gitignore`

### 2. Admin Users
- ✅ Grant admin เฉพาะคนที่ไว้ใจได้
- ✅ ใช้ super-admin เฉพาะเจ้าของระบบ
- ✅ Review admin list เป็นประจำ
- ✅ Revoke access เมื่อไม่ใช้แล้ว

### 3. Audit Logs
- ✅ ตรวจสอบ audit logs เป็นประจำ
- ✅ ดูว่ามี suspicious activity หรือไม่
- ✅ เก็บ logs ไว้อย่างน้อย 90 วัน

---

## 📝 Quick Reference Commands

```bash
# Grant super-admin
node scripts/set-admin-claims.js <USER_ID> super-admin

# Grant admin
node scripts/set-admin-claims.js <USER_ID> admin

# Grant viewer
node scripts/set-admin-claims.js <USER_ID> viewer

# Revoke admin
node scripts/set-admin-claims.js <USER_ID> revoke

# Check permissions
node scripts/set-admin-claims.js <USER_ID> permissions

# List all admins
node scripts/set-admin-claims.js list
```

---

## ✅ Verification Checklist

หลังตั้งค่าเสร็จ ตรวจสอบว่า:

- [ ] Service account key downloaded และวางไว้ที่ `scripts/service-account-key.json`
- [ ] firebase-admin installed (`npm list firebase-admin`)
- [ ] `.gitignore` มี `scripts/service-account-key.json`
- [ ] Grant admin สำเร็จ (เห็น success message)
- [ ] Logout และ Login ใหม่แล้ว
- [ ] เห็นปุ่ม Admin ใน Studio
- [ ] เปิด Admin Dashboard ได้
- [ ] User Details Modal ทำงาน
- [ ] Export data ทำงาน

---

## 🆘 Need Help?

### ติดปัญหา?

1. ตรวจสอบ error message
2. ดู Troubleshooting section
3. ตรวจสอบ Firebase Console logs
4. ดู browser console (F12)

### ต้องการความช่วยเหลือ?

- 📧 Email: support@peacescript.ai
- 📚 Documentation: `/ADMIN_ANALYTICS_PLAN.md`
- 🔗 Firebase Docs: https://firebase.google.com/docs/admin/setup

---

**เอกสารจัดทำโดย:** GitHub Copilot  
**วันที่อัพเดท:** 19 ธันวาคม 2568  
**เวอร์ชัน:** 1.0
