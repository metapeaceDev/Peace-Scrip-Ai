# ⚠️ SECURITY WARNING - Service Account Key

**Date**: December 19, 2025  
**Status**: 🔴 CRITICAL - Action Required

## 🚨 Issue Detected

ไฟล์ `service-account-key.json` พบในโฟลเดอร์โปรเจ็ค

## ✅ Current Protection

- `.gitignore` มีการป้องกันแล้ว (บรรทัด 22-26)
- ไฟล์ไม่ควรถูก commit ไปใน Git

## 🔧 Recommended Actions

### Option 1: Use Environment Variables (BEST PRACTICE)

```bash
# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\path\service-account-key.json"

# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/service-account-key.json"
```

### Option 2: Generate New Key (If Compromised)

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Delete old key file
5. Store new key securely (NOT in project folder)

## ✅ Security Checklist

- [x] `.gitignore` includes service-account\*.json
- [ ] Key file stored outside project folder
- [ ] Environment variable configured
- [ ] Old key revoked (if ever committed to Git)

---

**DO NOT commit this file to Git - keep it local only**
