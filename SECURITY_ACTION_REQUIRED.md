# 🔒 Security Action Required - Service Account Key

**Status**: ⚠️ **ACTION REQUIRED**  
**Priority**: 🔴 **CRITICAL**  
**Timeline**: ทำวันนี้ (5-10 นาที)

---

## ⚠️ ปัญหาที่พบ

พบไฟล์ `service-account-key.json` อยู่ในโฟลเดอร์โปรเจ็ค ซึ่ง:

- ✅ มีการป้องกันใน `.gitignore` แล้ว
- ⚠️ แต่ไม่สามารถตรวจสอบ Git history ได้ (Git ไม่อยู่ใน PATH)
- ⚠️ ควรดำเนินการเพื่อความปลอดภัย

---

## 🎯 วิธีแก้ไขที่แนะนำ (Best Practice)

### ขั้นตอนที่ 1: สร้าง Service Account Key ใหม่

1. **ไปที่ Firebase Console**
   - URL: https://console.firebase.google.com/
   - เลือกโปรเจ็คของคุณ

2. **ไปที่ Service Accounts**
   - Project Settings (⚙️) → Service Accounts
   - หรือ: https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk

3. **สร้าง Key ใหม่**
   - คลิก "Generate New Private Key"
   - ยืนยันการสร้าง
   - ดาวน์โหลดไฟล์ JSON

4. **บันทึกไฟล์**
   - **ไม่ใช่**: บันทึกในโฟลเดอร์โปรเจ็ค
   - **ใช่**: บันทึกนอกโปรเจ็ค เช่น:
     - `C:\Users\USER\.firebase\service-account-keys\`
     - `C:\firebase-keys\`
     - หรือที่ปลอดภัยอื่นๆ

---

### ขั้นตอนที่ 2: ใช้ Environment Variable แทน

#### สำหรับ Windows PowerShell:

**วิธีที่ 1: ตั้งค่าชั่วคราว (Session)**

```powershell
# ตั้งค่าสำหรับ session ปัจจุบัน
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\firebase-keys\service-account-key.json"

# ทดสอบว่าตั้งค่าสำเร็จ
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```

**วิธีที่ 2: ตั้งค่าถาวร (System)**

```powershell
# ตั้งค่าถาวรสำหรับ User
[Environment]::SetEnvironmentVariable(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "C:\firebase-keys\service-account-key.json",
    "User"
)

# รีสตาร์ท PowerShell แล้วทดสอบ
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```

#### สำหรับ Linux/Mac:

```bash
# เพิ่มใน ~/.bashrc หรือ ~/.zshrc
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Apply changes
source ~/.bashrc
```

---

### ขั้นตอนที่ 3: ลบไฟล์เก่าออกจากโปรเจ็ค

```powershell
# ลบไฟล์ (ระวัง!)
Remove-Item "service-account-key.json" -Force

# ตรวจสอบว่าลบแล้ว
Test-Path "service-account-key.json"  # ควรได้ False
```

---

### ขั้นตอนที่ 4: Revoke Key เก่า (ถ้าต้องการ)

1. กลับไปที่ Firebase Console → Service Accounts
2. ดูรายการ keys ที่มีอยู่
3. หากมี key เก่าที่ไม่ใช้แล้ว ให้ลบทิ้ง

---

## 🔍 ตรวจสอบว่าใช้งานได้

### Test 1: ตรวจสอบ Environment Variable

```powershell
# ควรเห็น path ไปยังไฟล์ key
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```

### Test 2: ทดสอบ Firebase Admin SDK

```powershell
# ถ้าใช้ Node.js script
node scripts/check-firebase-connection.js
```

หรือสร้างไฟล์ทดสอบ:

```javascript
// test-firebase-admin.js
const admin = require('firebase-admin');

// ถ้ามี GOOGLE_APPLICATION_CREDENTIALS จะใช้อันนั้นอัตโนมัติ
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

console.log('✅ Firebase Admin SDK initialized successfully!');
console.log('Project ID:', admin.app().options.projectId);
```

รัน:

```powershell
node test-firebase-admin.js
```

---

## 📋 Checklist

ทำทีละขั้นตอนและเช็คออก:

- [ ] สร้าง service account key ใหม่ใน Firebase Console
- [ ] บันทึกไฟล์ไว้**นอกโปรเจ็ค** ในที่ปลอดภัย
- [ ] ตั้งค่า `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- [ ] ทดสอบว่า Firebase Admin SDK ใช้งานได้
- [ ] ลบไฟล์ `service-account-key.json` ออกจากโปรเจ็ค
- [ ] (Optional) Revoke key เก่าใน Firebase Console
- [ ] ยืนยันว่า `.gitignore` มีการป้องกัน `**/service-account*.json`

---

## ⚡ Quick Start (Copy-Paste Ready)

```powershell
# 1. ตั้งค่า environment variable (แก้ path ให้ถูกต้อง)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\firebase-keys\service-account-key.json"

# 2. ทดสอบว่าตั้งค่าสำเร็จ
echo $env:GOOGLE_APPLICATION_CREDENTIALS

# 3. (Optional) ลบไฟล์เก่าออกจากโปรเจ็ค
# Remove-Item "service-account-key.json" -Force

# 4. Verify .gitignore
Get-Content .gitignore | Select-String "service-account"
```

---

## 🚨 สิ่งที่ต้องระวัง

### ❌ อย่าทำ:

- ❌ เก็บ service account key ในโฟลเดอร์โปรเจ็ค
- ❌ Commit key เข้า Git
- ❌ แชร์ key ใน chat, email, หรือ public
- ❌ Hard-code path ใน code (ใช้ environment variable)

### ✅ ควรทำ:

- ✅ เก็บ key นอกโปรเจ็ค
- ✅ ใช้ environment variable
- ✅ เพิ่มใน .gitignore
- ✅ Backup key ไว้ในที่ปลอดภัย (เช่น password manager)
- ✅ Rotate key เป็นระยะ (ทุก 6-12 เดือน)

---

## 📚 เอกสารอ้างอิง

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Service Account Permissions](https://cloud.google.com/iam/docs/service-accounts)
- [Best Practices for Managing Service Account Keys](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

---

## ❓ คำถามที่พบบ่อย

**Q: ถ้าลบไฟล์แล้ว Firebase Functions จะทำงานไหม?**  
A: ได้! Firebase Functions ใช้ service account ของตัวเองที่รันบน cloud ไม่ต้องการไฟล์นี้

**Q: ถ้าต้องการใช้หลาย project?**  
A: ตั้งค่า environment variable ต่างกันสำหรับแต่ละ project หรือใช้ Firebase CLI config

**Q: ไฟล์นี้ใช้ทำอะไร?**  
A: สำหรับ Firebase Admin SDK ในการรัน server-side scripts, functions, หรือ backend services

**Q: ทำไมต้องใช้ environment variable?**  
A: เพื่อไม่ให้ key รั่วไหลเข้า Git และสามารถเปลี่ยน key ได้โดยไม่ต้องแก้ code

---

**Status**: 📝 Waiting for Action  
**Next Step**: ทำตาม checklist ข้างบน  
**Estimated Time**: 5-10 นาที

---

**Created**: 19 December 2025  
**Priority**: 🔴 CRITICAL  
**Action Required**: YES
