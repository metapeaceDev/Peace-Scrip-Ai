#!/bin/bash

# ============================================
# Security Check Script
# ตรวจสอบไฟล์ sensitive ก่อน commit
# ============================================

echo "🔒 Checking for sensitive files..."

# ไฟล์ที่ห้าม commit
SENSITIVE_FILES=(
  "service-account-key.json"
  "service-account.json"
  "serviceAccountKey.json"
  ".env.local"
  "firebase-adminsdk-*.json"
)

FOUND_SENSITIVE=false

for pattern in "${SENSITIVE_FILES[@]}"; do
  # เช็คว่าไฟล์อยู่ใน staging area หรือไม่ (ยกเว้น .example และ README)
  if git diff --cached --name-only | grep -q "$pattern" && \
     ! git diff --cached --name-only | grep "$pattern" | grep -q -E "\.(example|README)"; then
    echo "❌ DANGER: พบไฟล์ sensitive ใน staging: $pattern"
    FOUND_SENSITIVE=true
  fi
done

if [ "$FOUND_SENSITIVE" = true ]; then
  echo ""
  echo "⛔️ COMMIT BLOCKED!"
  echo "พบไฟล์ sensitive ที่กำลังจะ commit"
  echo ""
  echo "วิธีแก้:"
  echo "  git reset HEAD service-account-key.json"
  echo "  git reset HEAD .env.local"
  echo ""
  exit 1
fi

# เช็คว่ามี private key ในไฟล์ที่จะ commit หรือไม่ (ยกเว้นไฟล์เอกสารและ security-check.sh)
CACHED_FILES=$(git diff --cached --name-only | grep -v -E "\.(md|txt|example|README)$" | grep -v "security-check.sh")
if [ -n "$CACHED_FILES" ]; then
  for file in $CACHED_FILES; do
    if git diff --cached "$file" | grep -q "BEGIN PRIVATE KEY"; then
      echo "❌ DANGER: พบ private key ในไฟล์ที่กำลังจะ commit: $file"
      echo "⛔️ COMMIT BLOCKED!"
      exit 1
    fi
  done
fi

# เช็ค private_key_id (ยกเว้นไฟล์เอกสารและ security scripts)
CACHED_FILES_2=$(git diff --cached --name-only | grep -v -E "\.(md|txt|example|README)$" | grep -v "security-check.sh")
if [ -n "$CACHED_FILES_2" ]; then
  for file in $CACHED_FILES_2; do
    if git diff --cached "$file" | grep -q "private_key_id"; then
      echo "❌ DANGER: พบ Firebase service account key ในไฟล์ที่กำลังจะ commit: $file"
      echo "⛔️ COMMIT BLOCKED!"
      exit 1
    fi
  done
fi

echo "✅ No sensitive files detected"
echo "✅ Safe to commit"
exit 0
