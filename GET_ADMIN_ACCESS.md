# วิธีรับสิทธิ์ Admin (Emergency Guide)

## ปัญหา: Notification ไม่ทำงาน

หาก notification click ไม่ทำงาน ให้ทำตามขั้นตอนนี้:

### ขั้นตอนที่ 1: เอา Confirmation URL จาก Firestore

1. เปิด Firebase Console: https://console.firebase.google.com/project/peace-script-ai/firestore

2. ไปที่ collection: **`notifications`**

3. หา document ที่มี:
   - `userId: "BUh46GBe8RZYGLHC1XigPnn0CWg1"`
   - `type: "admin-invitation"`
   - `read: false` (ยังไม่ได้อ่าน)

4. ในส่วน `data` จะมี field: **`confirmUrl`**

5. **Copy URL นั้น** (จะเป็นแบบนี้):
   ```
   https://peace-script-ai.web.app/accept-admin-invitation?token=xxx...
   ```

6. **วาง URL ลงใน browser** แล้วกด Enter

7. คลิก **"Confirm Admin"**

8. รอจนกระทั่ง redirect กลับมาหน้า Studio

9. **Refresh หน้า** (กด F5)

10. ดูว่าปุ่ม **"Admin"** สีแดงๆ ขึ้นหรือไม่

---

### ขั้นตอนที่ 2: ถ้ายังไม่ได้ - ใช้วิธี Manual Set Claims

ถ้าวิธีข้างบนยังไม่ได้ ให้ใช้ Firebase Admin SDK set custom claims โดยตรง:

1. ไปที่ Firebase Console → Authentication → Users
2. คัดลอก UID ของ `surasak.pongson@gmail.com`
3. ใช้ Firebase CLI หรือ Cloud Functions Console
4. รัน command:

```javascript
const admin = require('firebase-admin');

admin.auth().setCustomUserClaims('BUh46GBe8RZYGLHC1XigPnn0CWg1', {
  admin: true,
  adminRole: 'super-admin'
});
```

5. Sign out และ sign in ใหม่
6. ปุ่ม Admin จะขึ้น

---

### ขั้นตอนที่ 3: Fallback - ตรวจสอบ Firestore Rules

ถ้ายังไม่ได้ อาจเป็นเพราะ Firestore rules block การ confirm:

1. เปิด Firestore Rules
2. เพิ่ม temporary rule:

```javascript
match /admin-invitations/{invitationId} {
  allow read, write: if true; // Temporary - เปิดให้ทุกคนเข้าถึงได้ชั่วคราว
}
```

3. Deploy rules
4. ลองยืนยัน admin อีกครั้ง
5. **อย่าลืมปิด rule นี้ภายหลัง!**

---

## หมายเหตุ

- ปัญหานี้เกิดจาก notification handler ไม่ส่ง URL ไป confirmation page
- วิธี copy URL จาก Firestore เป็น **workaround ที่เร็วที่สุด**
- หลังจากเป็น admin แล้ว ระบบจะทำงานปกติ
