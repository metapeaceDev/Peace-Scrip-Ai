# 🔑 Firebase API Key Error - วิธีแก้ไข

## ❌ Error ที่เกิดขึ้น:
```
API key not valid. Please pass a valid API key.
service: identitytoolkit.googleapis.com
```

## 🎯 สาเหตุ:
- Firebase API Key ไม่มีสิทธิ์เข้าถึง Identity Toolkit API (Firebase Authentication)
- API Key ถูก restrict หรือมี limitations

## ✅ วิธีแก้ไข (เลือก 1 วิธี):

### **วิธีที่ 1: ปลดล็อก API Restrictions (แนะนำสำหรับ Development)**

1. ไปที่: https://console.cloud.google.com/apis/credentials?project=peace-script-ai
2. คลิกที่ API key ของคุณ (ชื่อคล้ายๆ "Browser key" หรือ "AIzaSy...")
3. ในส่วน **"API restrictions"**:
   - เลือก **"Don't restrict key"** 
   - หรือเลือก **"Restrict key"** แล้วเพิ่ม:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API (Identity Platform)
     - ✅ Cloud Firestore API
     - ✅ Cloud Storage for Firebase API
4. คลิก **"Save"**

### **วิธีที่ 2: เปิดใช้งาน Identity Toolkit API**

1. ไปที่: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=peace-script-ai
2. คลิก **"ENABLE"**
3. รอ 1-2 นาที แล้วลอง refresh หน้าเว็บ

### **วิธีที่ 3: สร้าง API Key ใหม่**

#### ขั้นตอนที่ 1: สร้าง API Key ใหม่
1. ไปที่: https://console.cloud.google.com/apis/credentials?project=peace-script-ai
2. คลิก **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy API key ที่ได้

#### ขั้นตอนที่ 2: กำหนด Restrictions (สำหรับ Production)
1. คลิก **"Edit API key"**
2. ตั้งชื่อ: `Firebase Web Client Key`
3. **Application restrictions**:
   - เลือก **"HTTP referrers (web sites)"**
   - เพิ่ม:
     ```
     https://peace-script-ai.web.app/*
     https://peace-script-ai.firebaseapp.com/*
     http://localhost:*/*
     ```
4. **API restrictions**:
   - เลือก **"Restrict key"**
   - เลือก APIs ต่อไปนี้:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API
     - ✅ Cloud Firestore API
     - ✅ Cloud Storage for Firebase API
     - ✅ Firebase Hosting API
5. คลิก **"Save"**

#### ขั้นตอนที่ 3: อัพเดท Environment Variables
```bash
# แก้ไขไฟล์ .env.local
VITE_FIREBASE_API_KEY=<API_KEY_ใหม่>
```

```bash
# แก้ไขไฟล์ .env.production
VITE_FIREBASE_API_KEY=<API_KEY_ใหม่>
```

#### ขั้นตอนที่ 4: Rebuild และ Deploy
```powershell
npm run build
firebase deploy --only hosting
```

## 🔍 ตรวจสอบว่าแก้ไขสำเร็จ:

1. เปิด Browser Console (F12)
2. ไปที่แท็บ "Network"
3. ลอง Login/Signup
4. ดูว่ามี request ไป `identitytoolkit.googleapis.com` หรือไม่
5. ถ้าสำเร็จจะเห็น status `200` แทน `400`

## 📚 ข้อมูลเพิ่มเติม:

- Firebase Web API Key: https://firebase.google.com/docs/projects/api-keys
- Identity Toolkit: https://cloud.google.com/identity-platform/docs
- API Restrictions: https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions

## ⚠️ หมายเหตุ:

- **Development**: ใช้ "Don't restrict key" เพื่อความสะดวก
- **Production**: ต้อง restrict ตาม domain และ API ที่ใช้งาน
- หลังจากแก้ไข รอประมาณ 2-5 นาที ให้ระบบอัพเดท
- ถ้ายังไม่ได้ ให้ clear browser cache และลองใหม่
