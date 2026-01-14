# 📂 แผนจัดระเบียบไฟล์ Peace Script Project

**วันที่**: 14 มกราคม 2026

---

## 🚨 CRITICAL: ไฟล์ที่ต้องลบทันที (มี Secrets!)

### ❌ ต้องลบจาก Git History
```bash
# service-account-key.json มี Firebase private keys!
service-account-key.json
```

**⚠️ WARNING**: ไฟล์นี้มี:
- Firebase Admin SDK private key
- Database credentials
- สามารถเข้าถึงข้อมูลทั้งหมดได้

**วิธีแก้**:
1. ✅ ไฟล์อยู่ใน .gitignore แล้ว
2. ❌ แต่มันอาจถูก commit ไปแล้วใน history
3. 🔒 ต้องตรวจสอบและลบออกจาก git history

---

## 📋 การจำแนกไฟล์

### 1️⃣ ไฟล์ที่ **ต้อง COMMIT** (Version Control)

#### Source Code
```
✅ src/**/*.{ts,tsx}              - TypeScript source files
✅ src/**/*.{css,scss}            - Stylesheets
✅ comfyui-service/src/**/*.js    - Backend Node.js
✅ comfyui-service/tests/**/*.js  - Backend tests
✅ src/test/**/*.test.tsx         - Frontend tests
```

#### Configuration Files
```
✅ package.json                   - Dependencies
✅ package-lock.json              - Exact versions (important!)
✅ tsconfig.json                  - TypeScript config
✅ tsconfig.node.json
✅ vite.config.ts                 - Build config
✅ vitest.config.ts               - Test config
✅ .eslintrc.json                 - Linting rules
✅ .prettierrc.json               - Code formatting
✅ firebase.json                  - Firebase config (NO SECRETS)
✅ firestore.rules                - Security rules
✅ firestore.indexes.json         - Database indexes
✅ storage.rules                  - Storage security
✅ netlify.toml                   - Deploy config
```

#### Documentation (เลือกเฉพาะสำคัญ)
```
✅ README.md                      - Project overview
✅ CHANGELOG.md                   - Version history
✅ docs/                          - Organized documentation
✅ CONTRIBUTING.md                - Contribution guide (if exists)
```

#### Infrastructure
```
✅ .github/                       - GitHub Actions
✅ .vscode/extensions.json        - Recommended extensions
✅ runpod-comfyui.Dockerfile      - Docker config
```

---

### 2️⃣ ไฟล์ที่ **ไม่ควร COMMIT** (แต่เก็บ Local)

#### Temporary Documentation (ย้ายไป docs-archive/)
```
📦 CETASIKA_52_ANALYSIS.md           → docs/features/
📦 MOTION_EDITOR_IMPROVEMENT_PLAN.md → docs/features/
📦 COMPARISON_TWO_PROJECTS.md        → docs/analysis/
📦 PROJECT_ORGANIZATION_2025.md      → docs/reports/
```

#### Scripts (เก็บใน scripts/)
```
📦 organize-project.ps1              → scripts/maintenance/
📦 restart-services.cmd              → scripts/dev/
📦 verify-setup.bat                  → scripts/setup/
```

#### Development Files
```
🚫 .env                              - Environment variables (SECRETS!)
🚫 .env.local                        - Local overrides
🚫 .env.backup                       - Backup (may have secrets)
🚫 service-account-key.json          - Firebase credentials
🚫 *.key, *.pem                      - Private keys
```

---

### 3️⃣ ไฟล์ที่ **ควร IGNORE** (เพิ่มใน .gitignore)

#### ควรเพิ่มใน .gitignore:
```gitignore
# Temporary folders
tmp/
temp/
*.tmp

# Analysis reports (auto-generated)
CETASIKA_52_ANALYSIS.md
MOTION_EDITOR_IMPROVEMENT_PLAN.md
COMPARISON_TWO_PROJECTS.md
PROJECT_ORGANIZATION_2025.md

# Logs
*.log
logs/
vite-dev.log

# Build artifacts
dist/
dist-ssr/
.vite/

# Test coverage
coverage/

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp
*.swo

# Backend specific
backend/uploads/
backend/outputs/
comfyui-service/uploads/
```

---

### 4️⃣ ไฟล์ที่ควร **DEPLOY**

#### Frontend (Netlify/Vercel)
```
✅ dist/                          - Built frontend (auto-generated)
✅ public/                         - Static assets
✅ firebase.json                   - Firebase config
✅ netlify.toml                    - Netlify config
```

#### Backend (Render/Railway/RunPod)
```
✅ comfyui-service/               - Node.js backend
✅ runpod-comfyui.Dockerfile      - Docker image
✅ package.json                    - Dependencies
```

#### Environment Variables (ตั้งใน Platform)
```
🔐 FIREBASE_API_KEY
🔐 FIREBASE_PROJECT_ID
🔐 COMFYUI_API_URL
🔐 GEMINI_API_KEY
🔐 ELEVENLABS_API_KEY
```

**⚠️ อย่า deploy ไฟล์ .env หรือ service-account-key.json!**

---

## 🎯 Action Plan

### Phase 1: ความปลอดภัย (URGENT!)
```powershell
# 1. ตรวจสอบว่า service-account-key.json อยู่ใน git history หรือไม่
git log --all --full-history -- "**/service-account-key.json"

# 2. ถ้าพบ → ต้องลบออกจาก history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch service-account-key.json" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (ถ้าจำเป็น - ระวัง!)
git push origin --force --all
```

### Phase 2: จัดระเบียบเอกสาร
```powershell
# สร้างโครงสร้างใหม่
New-Item -ItemType Directory -Path docs/features -Force
New-Item -ItemType Directory -Path docs/analysis -Force
New-Item -ItemType Directory -Path docs/reports -Force
New-Item -ItemType Directory -Path scripts/maintenance -Force
New-Item -ItemType Directory -Path scripts/dev -Force

# ย้ายไฟล์
Move-Item CETASIKA_52_ANALYSIS.md docs/features/
Move-Item MOTION_EDITOR_IMPROVEMENT_PLAN.md docs/features/
Move-Item COMPARISON_TWO_PROJECTS.md docs/analysis/
Move-Item PROJECT_ORGANIZATION_2025.md docs/reports/

Move-Item organize-project.ps1 scripts/maintenance/
Move-Item restart-services.cmd scripts/dev/
Move-Item verify-setup.bat scripts/setup/
```

### Phase 3: อัปเดต .gitignore
```powershell
# เพิ่มลงใน .gitignore
@"
# Temporary folders
tmp/
temp/

# Analysis/Planning docs (keep in docs/ instead)
/CETASIKA_52_ANALYSIS.md
/MOTION_EDITOR_IMPROVEMENT_PLAN.md
/COMPARISON_TWO_PROJECTS.md
/PROJECT_ORGANIZATION_2025.md

# Development scripts (keep in scripts/ instead)
/organize-project.ps1
/restart-services.cmd
/verify-setup.bat
"@ | Add-Content .gitignore
```

### Phase 4: Commit Changes
```bash
# 1. Stage important changes
git add src/
git add comfyui-service/
git add package.json
git add tsconfig.json
git add .gitignore

# 2. Review before committing
git status
git diff --staged

# 3. Commit
git commit -m "feat: improve video versioning and motion editor

- Add videoAlbum support for multiple video versions per shot
- Enhance Motion Editor with version selection
- Fix motion strength defaults (80→128)
- Add Motion Presets UI (Subtle/Normal/Dynamic/Extreme)
- Improve debug endpoint for camera block inspection
- Update video generation workflow
- All 26 tests passing"

# 4. Push
git push origin main
```

---

## 📊 สรุปการจัดระเบียบ

### ✅ ควร Commit (Version Control)
- [ ] Source code (`src/`, `comfyui-service/src/`)
- [ ] Tests (`src/test/`, `comfyui-service/tests/`)
- [ ] Config files (`package.json`, `tsconfig.json`, etc.)
- [ ] Documentation (`docs/`, `README.md`, `CHANGELOG.md`)
- [ ] Infrastructure (`.github/`, Dockerfile)

### 📦 เก็บ Local / Archive
- [ ] Analysis reports → `docs/features/`, `docs/analysis/`
- [ ] Planning docs → `docs/reports/`
- [ ] Scripts → `scripts/`
- [ ] Old docs → `docs-archive/`

### 🚫 ไม่ควร Commit (Ignore)
- [ ] `tmp/`, `temp/`
- [ ] `.env*` files
- [ ] `service-account-key.json` ⚠️
- [ ] `node_modules/`, `dist/`
- [ ] Log files

### 🚀 Deploy เฉพาะ
- [ ] Frontend: `dist/` (built output)
- [ ] Backend: `comfyui-service/`
- [ ] Config: `firebase.json`, `netlify.toml`
- [ ] Environment variables (ตั้งใน platform)

---

## 🔒 Security Checklist

- [ ] ตรวจสอบ `service-account-key.json` ใน git history
- [ ] ลบ secrets ออกจาก history (ถ้าพบ)
- [ ] ตรวจสอบ `.env` ไม่ถูก commit
- [ ] Rotate Firebase credentials (ถ้า leak)
- [ ] ตั้ง environment variables ใน deployment platform
- [ ] อัปเดต `.gitignore` ให้ครอบคลุม

---

## 🎬 Ready to Execute?

ต้องการให้:
1. **ตรวจสอบ security ก่อน** (service-account-key.json)?
2. **จัดระเบียบไฟล์เลย** (ย้ายไฟล์, อัปเดต .gitignore)?
3. **Commit changes** (stage and commit)?
4. **ทำทั้งหมด** (automated script)?

บอกมาได้เลยครับ! 🚀
