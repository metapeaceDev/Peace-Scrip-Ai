# ✅ CLEANUP CHECKLIST - ตรวจสอบก่อนเริ่มงานใหม่

## 📋 ขั้นตอนที่ 1: ทำความสะอาด Documentation

- [ ] 1.1 รันสคริปต์ทำความสะอาด
  ```bash
  chmod +x cleanup-docs.sh
  ./cleanup-docs.sh
  ```

- [ ] 1.2 ตรวจสอบโครงสร้างใหม่
  ```bash
  tree docs/ -L 2
  ```

- [ ] 1.3 ตรวจสอบไฟล์ที่เหลือใน root
  ```bash
  ls *.md | wc -l  # ควรเหลือประมาณ 10-15 ไฟล์
  ```

**เป้าหมาย:**
- ✅ ไฟล์ใน root ลดเหลือ < 15 files
- ✅ สร้าง docs/ structure สมบูรณ์
- ✅ ไฟล์ซ้ำซ้อนย้ายไป archive แล้ว

---

## 📋 ขั้นตอนที่ 2: Git Commit แบบเป็นระเบียบ

### Group 1: Test Files (สำคัญที่สุด)
- [ ] 2.1 Stage test files
  ```bash
  git add src/components/*.test.tsx
  git add src/__tests__/
  ```

- [ ] 2.2 Review changes
  ```bash
  git diff --staged --stat
  ```

- [ ] 2.3 Commit
  ```bash
  git commit -m "test: add comprehensive component tests

  - Add tests for ErrorBoundary, ReferralDashboard, LoRASetup, RevenueManagementPanel
  - Total 115 new tests across 4 components
  - All tests passing (3,139/3,160 total)
  - Coverage improvement: ~45.2% → ~45.6%"
  ```

### Group 2: Service Updates
- [ ] 2.4 Stage services
  ```bash
  git add src/services/
  ```

- [ ] 2.5 Commit
  ```bash
  git commit -m "refactor: update services for test compatibility

  - Update comfyuiBackendClient, firestoreService, hybridTTSService
  - Improve error handling and type safety
  - Add test-friendly exports"
  ```

### Group 3: Configuration
- [ ] 2.6 Stage configs
  ```bash
  git add package.json package-lock.json
  git add vite.config.ts vitest.config.ts
  git add .env.example backend/.env.test
  ```

- [ ] 2.7 Commit
  ```bash
  git commit -m "chore: update test configuration and dependencies

  - Update vitest.config.ts for better test support
  - Update package.json with testing dependencies
  - Update .env.example with new variables"
  ```

### Group 4: Backend Tests
- [ ] 2.8 Stage backend tests
  ```bash
  git add backend/tests/
  ```

- [ ] 2.9 Commit
  ```bash
  git commit -m "test: update backend tests

  - Update auth.test.js and projects.test.js
  - Improve test coverage for backend routes"
  ```

### Group 5: Documentation
- [ ] 2.10 Stage documentation (หลังรัน cleanup-docs.sh)
  ```bash
  git add docs/
  git add README.md
  git add *.md  # ไฟล์ที่เหลือใน root
  ```

- [ ] 2.11 Commit
  ```bash
  git commit -m "docs: organize documentation structure

  - Create docs/ folder with categorized structure
  - Archive duplicate/outdated files
  - Keep only essential files in root
  - Add README.md indexes"
  ```

**เป้าหมาย:**
- ✅ แยก commit เป็น 5 กลุ่มชัดเจน
- ✅ Commit message มีรายละเอียด
- ✅ ง่ายต่อการ review และ rollback

---

## 📋 ขั้นตอนที่ 3: อัพเดท .gitignore

- [ ] 3.1 เพิ่ม rules สำหรับ temporary docs
  ```bash
  echo "# Temporary documentation" >> .gitignore
  echo "*.draft.md" >> .gitignore
  echo "*_TEMP.md" >> .gitignore
  echo "docs/archive/" >> .gitignore
  ```

- [ ] 3.2 เพิ่ม rules สำหรับ coverage reports
  ```bash
  echo "# Test coverage" >> .gitignore
  echo "/tmp/" >> .gitignore
  echo "coverage/" >> .gitignore
  echo ".nyc_output/" >> .gitignore
  ```

- [ ] 3.3 ตรวจสอบ .gitignore
  ```bash
  cat .gitignore | tail -10
  ```

**เป้าหมาย:**
- ✅ ไม่ commit ไฟล์ชั่วคราว
- ✅ ไม่ commit coverage reports
- ✅ ไม่ commit archived docs

---

## 📋 ขั้นตอนที่ 4: ตรวจสอบความถูกต้อง

- [ ] 4.1 รันทดสอบทั้งหมด
  ```bash
  npm test -- --run
  ```
  **Expected:** 3,139 passing tests

- [ ] 4.2 ตรวจสอบ build
  ```bash
  npm run build
  ```
  **Expected:** No errors

- [ ] 4.3 ตรวจสอบ git status
  ```bash
  git status
  ```
  **Expected:** Working tree clean หรือเหลือเฉพาะ untracked files ที่ไม่สำคัญ

- [ ] 4.4 ตรวจสอบจำนวนไฟล์ markdown
  ```bash
  ls *.md | wc -l
  ```
  **Expected:** < 15 files

**เป้าหมาย:**
- ✅ Tests ผ่านทั้งหมด
- ✅ Build สำเร็จ
- ✅ Git clean
- ✅ Docs เป็นระเบียบ

---

## 📋 ขั้นตอนที่ 5: สร้าง Coverage Report

- [ ] 5.1 รัน coverage
  ```bash
  npm run test:coverage
  ```

- [ ] 5.2 เซฟ report
  ```bash
  cp coverage/coverage-summary.json tmp/coverage-$(date +%Y-%m-%d).json
  ```

- [ ] 5.3 ตรวจสอบ coverage
  ```bash
  cat tmp/coverage-$(date +%Y-%m-%d).json | jq '.total.lines.pct'
  ```

**เป้าหมาย:**
- ✅ Coverage report ใหม่
- ✅ เก็บ baseline สำหรับเทียบ
- ✅ รู้ว่าต้องทำอะไรต่อ

---

## 📊 สรุปผลลัพธ์

### ก่อนทำความสะอาด:
- ❌ Documentation: 130+ files (duplicates, no structure)
- ❌ Git status: 120 changes (mixed, unorganized)
- ⚠️ Tests: 3,139 passing (good, but uncommitted)
- ⚠️ Coverage: ~45.2% (gap to 80% target)

### หลังทำความสะอาด:
- ✅ Documentation: < 15 files in root, organized in docs/
- ✅ Git status: Clean, all changes committed logically
- ✅ Tests: 3,139 passing, properly committed
- ✅ Coverage: Baseline saved for tracking

---

## 🎯 Next Steps (หลังทำความสะอาดเสร็จ)

### Option A: ต่อเนื่องพัฒนา Test Coverage
- [ ] เลือก 10 components ถัดไป (0-10% coverage)
- [ ] เขียน tests (เป้าหมาย 80% coverage)
- [ ] Commit เป็นกลุ่มๆ (ทุก 3-5 components)

### Option B: พัฒนา Non-functional Systems
- [ ] วิเคราะห์ระบบที่ยังใช้งานไม่ได้
- [ ] สร้าง task list
- [ ] ทำทีละ feature

### Option C: Code Review & Refactoring
- [ ] Review code quality
- [ ] Refactor duplicated code
- [ ] Improve type safety

**คำแนะนำ:** ✅ เริ่มจาก Option B (พัฒนาระบบที่ยังใช้งานไม่ได้) เพราะ:
1. Tests มีพอสมควรแล้ว (3,139 tests, ~45% coverage)
2. ระบบที่ใช้งานไม่ได้สำคัญกว่า
3. User experience ดีขึ้นทันที

---

## 📝 Notes

- ใช้เวลาทำความสะอาดประมาณ **2-3 ชั่วโมง**
- ได้ baseline สะอาดสำหรับทำงานต่อ
- ง่ายต่อการหาข้อมูลและ review code
- Git history เป็นระเบียบ

**Last Updated:** December 16, 2024
