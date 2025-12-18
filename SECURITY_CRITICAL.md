# 🔒 SECURITY - ห้ามให้คีย์หลุดออกไปเด็ดขาด

## ✅ สถานะปัจจุบัน: **ปลอดภัย**

```
✅ service-account-key.json ไม่อยู่ใน Git
✅ .gitignore ป้องกันไฟล์ sensitive
✅ Pre-commit hook ติดตั้งแล้ว (บล็อกการ commit อัตโนมัติ)
✅ Security check script พร้อมใช้งาน
✅ ไม่มีคีย์ใน Git history
```

## 🛡️ ระบบป้องกัน 4 ชั้น

### 1️⃣ .gitignore (ป้องกันอัตโนมัติ)
```
service-account-key.json
**/service-account.json
**/serviceAccountKey.json
firebase-adminsdk-*.json
.env.local
```

### 2️⃣ Pre-commit Hook (ตรวจสอบก่อน commit)
- ติดตั้งที่: `.git/hooks/pre-commit`
- ทำงานอัตโนมัติทุกครั้งที่ `git commit`
- บล็อกทันทีถ้าพบไฟล์ sensitive

### 3️⃣ Security Check Script
```bash
./scripts/security-check.sh
```
- ตรวจสอบไฟล์ sensitive
- ตรวจหา private key patterns
- รัน manually ได้ตลอดเวลา

### 4️⃣ Manual Verification
```bash
# เช็คว่าไฟล์ถูก ignore
git status --ignored | grep service-account

# เช็ค Git history
git log --all -- service-account-key.json

# เช็คว่าไม่อยู่ใน staging
git diff --cached --name-only
```

## ⚠️ ไฟล์ที่ห้าม Commit

| ไฟล์ | เหตุผล |
|------|--------|
| `service-account-key.json` | Firebase Admin Private Key |
| `.env.local` | Environment secrets |
| `firebase-adminsdk-*.json` | Firebase service accounts |
| `*.pem`, `*.key` | SSL/TLS certificates |

## 🚨 ถ้าคีย์หลุดไปแล้ว - ทำทันที!

### ขั้นตอนฉุกเฉิน (5 นาที)

1. **เพิกถอนคีย์ทันที** (สำคัญที่สุด!)
   ```
   Firebase Console → Settings → Service Accounts
   → Manage service account permissions → Delete old key
   ```

2. **ลบออกจาก Git history**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch service-account-key.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   git push origin --force --all
   ```

3. **สร้างคีย์ใหม่**
   ```
   Firebase Console → Generate new private key
   → Save as service-account-key.json
   ```

4. **ตั้งค่า admin ใหม่**
   ```bash
   node get-user-id.js metapeaceofficial@gmail.com
   node scripts/set-admin-claims.js <USER_ID> super-admin
   ```

## 📋 Checklist ก่อน Commit/Push

```bash
# 1. รัน security check
./scripts/security-check.sh

# 2. ตรวจสอบ status
git status

# 3. เช็คไฟล์ที่จะ commit
git diff --cached --name-only

# 4. ถ้าทุกอย่างโอเค
git commit -m "Your message"
git push
```

## 🎯 Best Practices

1. **ไม่เก็บ secrets ใน Git เลย**
2. **ใช้ environment variables แทน**
3. **Rotate keys ทุก 3-6 เดือน**
4. **จำกัดสิทธิ์ service account ให้น้อยที่สุด**
5. **Monitor Firebase logs เป็นประจำ**

## ⚡️ Quick Test

ทดสอบว่าระบบป้องกันทำงาน:

```bash
# ทดสอบ security check
./scripts/security-check.sh
# Expected: ✅ Safe to commit

# ทดสอบ pre-commit hook (อย่า commit จริง!)
git add service-account-key.json
git commit -m "test" --dry-run
# Expected: ⛔️ COMMIT BLOCKED

# รีเซ็ต
git reset HEAD service-account-key.json
```

## 📞 Contact (ถ้ามีปัญหา)

- **ถ้าคีย์หลุด:** เพิกถอนคีย์ทันที → สร้างใหม่
- **ถ้าไม่แน่ใจ:** รัน `./scripts/security-check.sh`
- **ถ้าต้องการตรวจสอบ:** เช็ค Git history + status

---

**สร้างเมื่อ:** 19 ธันวาคม 2568  
**อัพเดทล่าสุด:** วันนี้  
**สถานะ:** ✅ ปลอดภัย - พร้อมใช้งาน
