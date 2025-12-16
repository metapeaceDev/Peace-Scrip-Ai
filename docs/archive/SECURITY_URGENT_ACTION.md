# 🚨 SECURITY URGENT ACTION REQUIRED

## ⚠️ API Keys Leaked in Git History

**พบ API Keys ที่ถูก commit ลง Git history:**

```
Commit: 9f1f4edead9a5be202d3c86afd707a6c097546e4
Date: Sun Nov 30 10:17:11 2025
File: .env.template

Leaked Keys:
1. AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48
2. AIzaSyALCWflX-gooPrxQQOv_tef1uSwlcEdOsA (403 Forbidden - already blocked by Google)
```

---

## ✅ สิ่งที่แก้ไขแล้ว (Local Only)

1. ✅ ลบ API Keys ออกจาก `.env`, `.env.local`, `.env.template`
2. ✅ เพิ่ม `.env.*` และ `.env.template` ใน `.gitignore`
3. ✅ แทนที่ด้วย placeholder: `your_gemini_api_key_here`

---

## 🔴 ACTION REQUIRED: ทำตามลำดับทันที

### 1️⃣ **สร้าง Gemini API Key ใหม่** (5 นาที)

```bash
# เปิด browser ไปที่
https://aistudio.google.com/apikey
```

**ขั้นตอน:**

1. คลิก **"Create API Key"**
2. เลือก **"Create API key in new project"** (หรือ existing project)
3. คัดลอก API Key ที่ได้
4. **ตั้งค่า Restrictions ทันที:**
   - Application restrictions: **HTTP referrers**
     - `peace-script-ai.web.app/*`
     - `localhost:5173/*`
     - `127.0.0.1:5173/*`
   - API restrictions: **Restrict key**
     - เลือก **"Generative Language API"** เท่านั้น

### 2️⃣ **อัพเดท Local Environment** (1 นาที)

```bash
# แก้ไข .env และ .env.local
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "

# เปิดไฟล์และใส่ API Key ใหม่
nano .env
# แก้บรรทัด: VITE_GEMINI_API_KEY=<YOUR_NEW_KEY_HERE>

nano .env.local
# แก้บรรทัด: VITE_GEMINI_API_KEY=<YOUR_NEW_KEY_HERE>
```

### 3️⃣ **ลบ API Keys เก่าออกจาก Git History** (10 นาที)

⚠️ **CRITICAL**: แม้ว่าจะลบออกจาก working directory แล้ว แต่ยังอยู่ใน Git history!

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "

# ใช้ BFG Repo-Cleaner (วิธีที่ปลอดภัยที่สุด)
# ติดตั้ง BFG (ถ้ายังไม่มี)
brew install bfg

# สร้าง backup ก่อน
cp -r "/Users/surasak.peace/Desktop/peace-script-basic-v1 " "/Users/surasak.peace/Desktop/peace-script-backup"

# ใช้ BFG ลบ API Keys ออกจาก Git history
bfg --replace-text <(echo "AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48==>REMOVED_SECRET_KEY") .git
bfg --replace-text <(echo "AIzaSyALCWflX-gooPrxQQOv_tef1uSwlcEdOsA==>REMOVED_SECRET_KEY") .git

# Clean up Git history
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**หรือใช้วิธี `git filter-repo` (ถ้ามี):**

```bash
# ติดตั้ง git-filter-repo
brew install git-filter-repo

# ลบ sensitive files ออกจาก history
git filter-repo --path .env.template --invert-paths --force
git filter-repo --path .env --invert-paths --force
git filter-repo --path .env.local --invert-paths --force
```

### 4️⃣ **Force Push (ถ้า push ไป remote แล้ว)** (2 นาที)

⚠️ **WARNING**: สิ่งนี้จะเขียน Git history ใหม่ ห้ามทำถ้ามีคนอื่นใช้งาน repo ร่วม!

```bash
# ตรวจสอบว่ามี remote repo หรือไม่
git remote -v

# ถ้ามี remote (เช่น GitHub, GitLab)
git push --force --all
git push --force --tags
```

### 5️⃣ **ลบ Keys เก่าออกจาก Google Cloud Console** (3 นาที)

```bash
# เปิด browser ไปที่
https://console.cloud.google.com/apis/credentials
```

**ขั้นตอน:**

1. หา API Keys ที่ leak:
   - `AIzaSyC-Y-j2mQny-YqukGPT4QIDvKOkGewNO48`
   - `AIzaSyALCWflX-gooPrxQQOv_tef1uSwlcEdOsA`
2. คลิก **"Delete"** ทั้ง 2 keys

### 6️⃣ **Commit การแก้ไข** (1 นาที)

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "

git add .gitignore .env.template
git commit -m "🔒 Security: Remove leaked API keys and update .gitignore

- Removed API keys from .env.template
- Added .env.* and .env.template to .gitignore
- Replaced with placeholder values
- See SECURITY_URGENT_ACTION.md for details"

# ถ้ามี remote
git push
```

---

## 🛡️ **ป้องกันไม่ให้เกิดซ้ำ**

### ติดตั้ง pre-commit hook (Optional แต่แนะนำ)

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "

# สร้าง pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Check for potential API keys in staged files
if git diff --cached --name-only | xargs grep -E "AIza[0-9A-Za-z_-]{35}" 2>/dev/null; then
    echo "❌ ERROR: Found potential API key in staged files!"
    echo "Please remove API keys before committing."
    exit 1
fi
exit 0
EOF

chmod +x .git/hooks/pre-commit
echo "✅ Pre-commit hook installed"
```

---

## 📊 **Timeline Summary**

| Time           | Task                              | Status   |
| -------------- | --------------------------------- | -------- |
| ✅ Now         | ลบ API Keys จาก working directory | DONE     |
| ✅ Now         | อัพเดท .gitignore                 | DONE     |
| ⏳ **URGENT**  | สร้าง API Key ใหม่                | **TODO** |
| ⏳ **URGENT**  | ลบ API Keys เก่าออกจาก Google     | **TODO** |
| ⏳ Critical    | ลบ Keys ออกจาก Git history        | **TODO** |
| ⏳ Critical    | Force push (ถ้ามี remote)         | **TODO** |
| ⏰ Recommended | ติดตั้ง pre-commit hook           | **TODO** |

---

## 🔗 **Quick Links**

- สร้าง API Key: https://aistudio.google.com/apikey
- Google Cloud Console: https://console.cloud.google.com/apis/credentials
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

---

## ❓ **ถ้าเกิดปัญหา**

```bash
# ถ้า BFG ไม่ทำงาน ให้ใช้ git filter-branch (legacy method)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env .env.local .env.template" \
  --prune-empty --tag-name-filter cat -- --all
```

---

**หมายเหตุ**: ถ้า API Keys ถูก push ไป **public GitHub repository** แล้ว:

1. GitHub จะส่ง email แจ้งเตือนให้ revoke keys ทันที
2. Google อาจ block keys อัตโนมัติ (เหมือนที่เกิดกับ `AIzaSyAL...`)
3. ต้องสร้าง keys ใหม่และตั้งค่า restrictions อย่างเคร่งครัด
