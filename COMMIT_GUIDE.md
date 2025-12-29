# Git Commit และ Deployment Guide

**วันที่อัพเดต:** 29 ธันวาคม 2025  
**สำหรับโปรเจกต์:** Peace Script AI

---

## 🚨 สำคัญมาก: ไฟล์ที่ห้าม Commit

### 🔐 ไฟล์ที่มี Credentials (ห้ามเด็ดขาด!)

```bash
# Environment files
.env
.env.local
.env.production
.env.backup
.env.*.backup

# Firebase Service Accounts
service-account-key.json
**/service-account.json
**/serviceAccountKey.json
firebase-adminsdk-*.json

# API Keys และ Secrets
*.key
*.pem
*.p12
*.pfx
*.secret
```

**⚠️ หากคุณเคย commit ไฟล์เหล่านี้แล้ว:**
1. ลบออกจาก git history ทันที
2. เปลี่ยน API keys และ secrets ทั้งหมด
3. Revoke service account keys
4. อ่าน [SECURITY_INCIDENT.md](docs/SECURITY.md)

---

## ✅ ไฟล์ที่ควร Commit

### 1. Source Code
```bash
src/                    # โค้ดหลักทั้งหมด
├── components/         ✅ Commit
├── pages/             ✅ Commit
├── services/          ✅ Commit
├── hooks/             ✅ Commit
├── contexts/          ✅ Commit
└── utils/             ✅ Commit
```

### 2. Configuration Files (ที่ไม่มี secrets)
```bash
package.json           ✅ Commit
package-lock.json      ✅ Commit
tsconfig.json          ✅ Commit
vite.config.ts         ✅ Commit
vitest.config.ts       ✅ Commit
.eslintrc.json         ✅ Commit
.prettierrc.json       ✅ Commit
```

### 3. Firebase Configuration (Public only)
```bash
firebase.json          ✅ Commit
firestore.rules        ✅ Commit
firestore.indexes.json ✅ Commit
storage.rules          ✅ Commit
```

### 4. Documentation
```bash
README.md              ✅ Commit
CHANGELOG.md           ✅ Commit
docs/                  ✅ Commit (active docs only)
.env.example           ✅ Commit (template without real keys)
.env.local.example     ✅ Commit (template)
```

### 5. Scripts (ที่ไม่มี credentials)
```bash
scripts/
├── powershell/        ✅ Commit (ถ้าเป็น utility ทั่วไป)
├── python/            ✅ Commit (ถ้าไม่มี API keys)
└── shell/             ✅ Commit (ถ้าเป็น setup scripts)
```

### 6. Tests
```bash
tests/                 ✅ Commit
src/__tests__/         ✅ Commit
*.test.ts              ✅ Commit
*.spec.ts              ✅ Commit
vitest.config.ts       ✅ Commit
```

---

## ❌ ไฟล์ที่ไม่ควร Commit

### 1. Build Outputs
```bash
dist/                  ❌ ห้าม (auto-generated)
dist-ssr/              ❌ ห้าม
node_modules/          ❌ ห้าม (install จาก package.json)
coverage/              ❌ ห้าม (test coverage reports)
```

### 2. Temporary Files
```bash
logs/                  ❌ ห้าม
*.log                  ❌ ห้าม
*.tmp                  ❌ ห้าม
*.temp                 ❌ ห้าม
*.err                  ❌ ห้าม
tmp-*.json             ❌ ห้าม
```

### 3. Editor Files
```bash
.vscode/settings.json  ❌ ห้าม (personal settings)
.idea/                 ❌ ห้าม (IntelliJ)
*.swp                  ❌ ห้าม (Vim)
.DS_Store              ❌ ห้าม (macOS)
```

### 4. Test Files (Development)
```bash
test-*.html            ❌ ห้าม (temporary test pages)
test-*.json            ❌ ห้าม (test data)
firebase-test.html     ❌ ห้าม
stats.html             ❌ ห้าม (build stats)
psychology-test-suite.js ❌ ห้าม (development testing)
```

### 5. Archived Documentation
```bash
docs-archive/          ❌ ห้าม (historical only, too large)
ORGANIZATION_REPORT.md ⚠️  พิจารณา (รายงานภายใน)
```

### 6. Duplicate/Unused Folders
```bash
comfy-backend/         ❌ ห้าม (ถ้าไม่ใช้)
comfyui-docker-cuda12/ ❌ ห้าม (ถ้ามี Dockerfile หลักแล้ว)
archive/               ❌ ห้าม (เก็บไว้ local only)
```

---

## 📋 Commit Checklist

ก่อน commit ให้ตรวจสอบ:

```bash
# 1. ตรวจสอบไฟล์ที่จะ commit
git status

# 2. ตรวจสอบว่าไม่มีไฟล์ sensitive
git diff --cached | grep -i "api.*key\|secret\|password\|token"

# 3. ตรวจสอบ .gitignore
cat .gitignore

# 4. ลบไฟล์ที่ไม่ต้องการ
git reset HEAD <file>

# 5. Commit
git add <files>
git commit -m "descriptive message"
```

---

## 🔍 ตรวจสอบก่อน Push

### ขั้นตอนการตรวจสอบความปลอดภัย:

```bash
# 1. ตรวจสอบว่าไม่มี credentials
git log -p | grep -i "api.*key\|secret\|password"

# 2. ตรวจสอบไฟล์ใหญ่ (>100MB)
git rev-list --objects --all | 
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  awk '/^blob/ {print substr($0,6)}' | 
  sort -n -k 2 | 
  tail -n 10

# 3. Run security check
npm run security:check

# 4. Run tests
npm test

# 5. Type check
npm run type-check

# 6. Lint
npm run lint
```

---

## 🚀 Deployment Workflow

### Development → Staging → Production

```bash
# 1. Development (Local)
npm run dev                    # Test locally
npm run type-check             # Check types
npm run lint                   # Check code quality
npm test                       # Run tests

# 2. Build
npm run build                  # Build for production
npm run preview                # Preview build

# 3. Deploy to Firebase (Production)
npm run firebase:deploy        # Deploy everything

# หรือแยกเป็นส่วนๆ:
npm run firebase:hosting       # Deploy hosting only
npm run firebase:rules         # Deploy rules only
```

---

## 📦 Files for Deployment

### ไฟล์ที่ต้องการสำหรับ Firebase Hosting:

```bash
dist/                  # Build output (auto-generated)
├── index.html
├── assets/
│   ├── *.js
│   ├── *.css
│   └── images/
└── ...

firebase.json          # Firebase configuration
.firebaserc            # Firebase projects
```

### ไฟล์ที่ต้องการสำหรับ Firebase Functions:

```bash
functions/
├── package.json
├── src/
│   └── index.js
└── node_modules/      # Install on deployment
```

---

## 🔐 Environment Variables Setup

### Local Development (.env.local)

```bash
# สร้างจาก template
cp .env.example .env.local

# แก้ไขด้วย editor
code .env.local

# เพิ่มค่าจริง (ไม่ commit!)
VITE_FIREBASE_API_KEY=AIza...
VITE_GEMINI_API_KEY=AIza...
```

### Production (Firebase Hosting)

```bash
# ตั้งค่าผ่าน Firebase Console
# หรือใช้ Firebase Functions config

firebase functions:config:set \
  stripe.secret="sk_live_..." \
  gemini.key="AIza..."
```

---

## 🆘 หาก Commit Secrets ไปแล้ว

### วิธีแก้ไขด่วน:

```bash
# 1. ลบไฟล์ออกจาก git (แต่เก็บไว้ local)
git rm --cached .env
git rm --cached service-account-key.json

# 2. เพิ่มใน .gitignore
echo ".env" >> .gitignore
echo "service-account-key.json" >> .gitignore

# 3. Commit การเปลี่ยนแปลง
git add .gitignore
git commit -m "chore: remove sensitive files from git"

# 4. Force push (ถ้าจำเป็น - ระวัง!)
git push --force

# 5. สำคัญ: เปลี่ยน API keys ทั้งหมดทันที!
```

### สำหรับการลบจาก history:

```bash
# ใช้ git filter-branch (advanced)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# หรือใช้ BFG Repo-Cleaner (recommended)
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**หลังจากนั้น:**
1. Revoke และสร้าง API keys ใหม่ทั้งหมด
2. เปลี่ยน Firebase service account
3. Update secrets ในทุกที่ที่ใช้
4. บันทึกในรายงาน security incident

---

## 📊 Current Status (29 Dec 2025)

### Git Status Summary:

```
Modified (M):     34 files  ✅ ควร commit
Deleted (D):      78 files  ✅ ควร commit (reorganization)
New/Untracked:    15+ files ⚠️  ตรวจสอบก่อน commit
```

### การจัดระเบียบที่ทำแล้ว:

- ✅ ย้ายเอกสาร 93 ไฟล์ → `docs-archive/`
- ✅ ย้ายสคริปต์ 32 ไฟล์ → `scripts/`
- ✅ ย้าย App.tsx → `src/`
- ✅ อัพเดต .gitignore
- ✅ สร้าง README ใหม่

### ไฟล์ใหม่ที่ควร commit:

```bash
✅ ORGANIZATION_REPORT.md    # รายงานการจัดระเบียบ
✅ scripts/powershell/       # สคริปต์ที่จัดระเบียบแล้ว
✅ scripts/python/           # สคริปต์ Python
✅ scripts/shell/            # Shell scripts
```

### ไฟล์ใหม่ที่ไม่ควร commit:

```bash
❌ comfy-backend/            # Duplicate folder
❌ comfyui-docker-cuda12/    # ตรวจสอบว่าใช้หรือไม่
```

---

## 🎯 Recommended Commit Strategy

### สำหรับการ commit ครั้งนี้:

```bash
# 1. Stage การจัดระเบียบ
git add .gitignore
git add README.md
git add ORGANIZATION_REPORT.md
git add scripts/

# 2. Stage การลบไฟล์เก่า (78 files)
git add -u

# 3. Stage การแก้ไขโค้ด
git add src/
git add package.json
git add comfyui-service/

# 4. Commit ทีละส่วน (recommended)
git commit -m "chore: reorganize project structure

- Move 93 documentation files to docs-archive/
- Move 32 scripts to scripts/ (powershell/python/shell)
- Move App.tsx to src/
- Update .gitignore for better security
- Create new comprehensive README.md"

# 5. Push
git push origin main
```

---

## 📱 Quick Reference

### ✅ Safe to Commit
- `src/`, `docs/`, `tests/`
- `package.json`, `tsconfig.json`
- `.env.example` (no real keys!)
- `README.md`, `CHANGELOG.md`
- `firebase.json`, `*.rules`

### ❌ Never Commit
- `.env`, `.env.local`, `.env.production`
- `service-account-key.json`
- `node_modules/`, `dist/`
- `*.log`, `logs/`
- Personal files (`.vscode/settings.json`)

### ⚠️ Check Before Commit
- Scripts with hardcoded paths
- Test files with real data
- Large binary files
- Archived documentation

---

## 🔗 Related Documentation

- [Security Best Practices](docs/SECURITY.md)
- [Deployment Guide](docs/deployment/FIREBASE_SETUP_GUIDE.md)
- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md)
- [.gitignore](./.gitignore)

---

## 📞 Help

หากมีคำถาม:
- ตรวจสอบ [.gitignore](./.gitignore)
- อ่าน [SECURITY.md](docs/SECURITY.md)
- เปิด Issue บน GitHub

---

**จำไว้:** ความปลอดภัยสำคัญที่สุด! เมื่อสงสัยว่าไฟล์ควร commit หรือไม่ → **อย่า commit ก่อน**

**อัพเดตล่าสุด:** 29 ธันวาคม 2025  
**Version:** 1.0
