# Firebase API Key Error - Complete Fix Guide
# วิธีแก้ไขปัญหา API key not valid อย่างละเอียด

## 🔍 วินิจฉัยปัญหา

Error: `API key not valid. Please pass a valid API key.`
Service: `identitytoolkit.googleapis.com`

## ✅ วิธีแก้ไข (ทำตามลำดับ)

### **Step 1: ตรวจสอบและเปิดใช้งาน APIs**

1. **เปิด Identity Toolkit API:**
   ```
   https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=peace-script-ai
   ```
   - คลิก "ENABLE" (ถ้ายังไม่ได้เปิด)
   - รอให้ status เป็น "API enabled"

2. **ตรวจสอบ APIs อื่นๆ:**
   - Token Service API: https://console.cloud.google.com/apis/library/securetoken.googleapis.com?project=peace-script-ai
   - Cloud Firestore API: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=peace-script-ai

### **Step 2: รับ API Key ที่ถูกต้องจาก Firebase**

**วิธีที่ 1: จาก Firebase Console (แนะนำ)**

1. ไปที่: https://console.firebase.google.com/project/peace-script-ai/settings/general
2. Scroll ลงมาที่ส่วน "Your apps"
3. คลิกที่ Web app (มีไอคอน 🌐 `</>`)
4. ดูที่ส่วน "SDK setup and configuration"
5. เลือก "Config"
6. Copy ค่า `apiKey` (ควรเป็น `AIza...`)

**วิธีที่ 2: ตรวจสอบจาก Google Cloud Console**

1. ไปที่: https://console.cloud.google.com/apis/credentials?project=peace-script-ai
2. ดูรายการ API keys
3. หา key ที่ชื่อคล้ายๆ "Browser key (auto created by Firebase)" หรือ "Web API key"
4. คลิกเพื่อดูรายละเอียด
5. Copy API key

### **Step 3: ตรวจสอบและแก้ไข Restrictions (สำคัญมาก!)**

เปิด API key ที่: https://console.cloud.google.com/apis/credentials?project=peace-script-ai

**Application restrictions:**
```
✓ HTTP referrers (web sites)

Referrers:
- https://peace-script-ai.web.app/*
- https://peace-script-ai.firebaseapp.com/*
- http://localhost:*/*
- http://127.0.0.1:*/*
```

**API restrictions:**
```
✓ Restrict key

Select APIs:
☑ Identity Toolkit API
☑ Token Service API  
☑ Cloud Firestore API
☑ Cloud Storage API
☑ Firebase Installations API
```

**หรือ:** ถ้าเป็น development ให้เลือก "Don't restrict key" ก่อน

### **Step 4: อัพเดท API Key ในโปรเจค**

**แบบอัตโนมัติ (แนะนำ):**
```powershell
# รัน script
.\update-api-key.ps1
```

**แบบ Manual:**

1. แก้ไขไฟล์ `.env.local`:
```env
VITE_FIREBASE_API_KEY=AIzaYourNewKeyHere
```

2. แก้ไขไฟล์ `.env.production`:
```env
VITE_FIREBASE_API_KEY=AIzaYourNewKeyHere
```

3. แก้ไขไฟล์ `.env` (ถ้ามี):
```env
VITE_FIREBASE_API_KEY=AIzaYourNewKeyHere
```

### **Step 5: Rebuild และ Deploy**

```powershell
# Build โปรเจค
npm run build

# Deploy
firebase deploy --only hosting
```

### **Step 6: Clear Cache และทดสอบ**

1. เปิด Browser
2. กด `Ctrl + Shift + Delete` (Windows) หรือ `Cmd + Shift + Delete` (Mac)
3. เลือก "Cached images and files"
4. คลิก "Clear data"
5. Refresh หน้าเว็บ (หรือกด `Ctrl + F5`)
6. ลอง Login/Signup ใหม่

## 🔍 วิธีตรวจสอบว่าแก้ไขสำเร็จ

### **1. ตรวจสอบใน Browser Console**
```javascript
// เปิด Console (F12) แล้วพิมพ์:
console.log(import.meta.env.VITE_FIREBASE_API_KEY)
// ควรแสดง API key ที่ถูกต้อง (ขึ้นต้นด้วย AIza)
```

### **2. ตรวจสอบ Network Requests**
1. เปิด DevTools (F12)
2. ไปที่แท็บ "Network"
3. Filter: `identitytoolkit`
4. ลอง Login
5. ดู response:
   - ✅ Status 200 = สำเร็จ
   - ❌ Status 400 = API key ยังไม่ถูกต้อง

### **3. ทดสอบ Authentication**
1. ลอง Sign Up ด้วย email/password
2. ลอง Sign In with Google
3. ตรวจสอบว่าไม่มี error `API_KEY_INVALID`

## 🚨 Troubleshooting

### ปัญหา: ยังเจอ error เดิม

**วิธีแก้:**
1. รอ 5-10 นาที (API restrictions ต้องใช้เวลา propagate)
2. ลบ cache browser ทั้งหมด
3. ทดสอบใน Incognito/Private mode
4. ตรวจสอบว่า build ใหม่แล้ว (`npm run build`)
5. ตรวจสอบว่า deploy แล้ว (`firebase deploy --only hosting`)

### ปัญหา: API key ใน console แสดง undefined

**วิธีแก้:**
1. ตรวจสอบว่าไฟล์ `.env.local` อยู่ใน root directory
2. Restart dev server: `npm run dev`
3. ตรวจสอบว่าชื่อตัวแปรขึ้นต้นด้วย `VITE_`

### ปัญหา: API restrictions ไม่ให้เลือก Identity Toolkit API

**วิธีแก้:**
1. ไปเปิดใช้งาน API ก่อนที่: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=peace-script-ai
2. รอ 2-3 นาที
3. Refresh หน้า API key settings
4. จะเห็น Identity Toolkit API ในรายการ

## 📋 Checklist

ก่อน deploy production ตรวจสอบ:

- [ ] Identity Toolkit API เปิดใช้งานแล้ว
- [ ] Token Service API เปิดใช้งานแล้ว
- [ ] API key มี restrictions ที่ถูกต้อง (Application + API)
- [ ] ทดสอบ Login/Signup ใน localhost สำเร็จ
- [ ] Build โปรเจคสำเร็จ (`npm run build`)
- [ ] Deploy สำเร็จ (`firebase deploy --only hosting`)
- [ ] ทดสอบบน production domain สำเร็จ
- [ ] Clear cache และทดสอบใน incognito mode สำเร็จ

## 🆘 ติดต่อ Support

หากยังแก้ไขไม่ได้:

1. Firebase Support: https://firebase.google.com/support/contact
2. Stack Overflow: https://stackoverflow.com/questions/tagged/firebase
3. Firebase Discord: https://discord.gg/firebase

## 📚 เอกสารอ้างอิง

- Firebase Web API Keys: https://firebase.google.com/docs/projects/api-keys
- Identity Toolkit: https://cloud.google.com/identity-platform/docs
- API Key Best Practices: https://cloud.google.com/docs/authentication/api-keys
