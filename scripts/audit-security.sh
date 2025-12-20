#!/bin/bash

# Security Audit Script
# Scans codebase for potential API keys and secrets

echo "🔍 Security Audit - Scanning for potential secrets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FOUND_ISSUES=false

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check for Google API Keys
echo -e "${BLUE}[1/6]${NC} Checking for Google API keys..."
if grep -r "AIza[0-9A-Za-z_-]\{35\}" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude="*.md" --exclude="audit-security.sh" .; then
  echo -e "${RED}❌ FOUND: Google API keys detected!${NC}"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ No Google API keys found${NC}"
fi

# 2. Check for Firebase private keys
echo -e "${BLUE}[2/6]${NC} Checking for Firebase private keys..."
if grep -r "private_key" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . | grep -v "example"; then
  echo -e "${RED}❌ FOUND: Possible Firebase private keys!${NC}"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ No Firebase private keys found${NC}"
fi

# 3. Check for hard-coded passwords
echo -e "${BLUE}[3/6]${NC} Checking for hard-coded passwords..."
if grep -ri "password.*=.*['\"][^'\"]\{8,\}['\"]" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude="*.md" . | grep -v "your_password"; then
  echo -e "${YELLOW}⚠️  WARNING: Possible hard-coded passwords${NC}"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ No hard-coded passwords found${NC}"
fi

# 4. Check if .env files are tracked
echo -e "${BLUE}[4/6]${NC} Checking if .env files are tracked by Git..."
TRACKED_ENV=$(git ls-files | grep -E '\.env$|\.env\.local$|\.env\.production$')
if [ -n "$TRACKED_ENV" ]; then
  echo -e "${RED}❌ FOUND: .env files tracked by Git!${NC}"
  echo "$TRACKED_ENV"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ No .env files tracked${NC}"
fi

# 5. Check template files for real keys
echo -e "${BLUE}[5/6]${NC} Checking template files for real API keys..."
if grep -E "AIza[0-9A-Za-z_-]{35}" .env.template .env.example 2>/dev/null; then
  echo -e "${RED}❌ FOUND: Real API keys in template files!${NC}"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ Template files are clean${NC}"
fi

# 6. Check for AWS keys
echo -e "${BLUE}[6/6]${NC} Checking for AWS access keys..."
if grep -r "AKIA[0-9A-Z]\{16\}" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude="*.md" .; then
  echo -e "${RED}❌ FOUND: Possible AWS access keys!${NC}"
  FOUND_ISSUES=true
else
  echo -e "${GREEN}✅ No AWS keys found${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FOUND_ISSUES" = true ]; then
  echo -e "${RED}🚨 SECURITY ISSUES DETECTED!${NC}"
  echo ""
  echo "⚠️  Action required:"
  echo "  1. Review the findings above"
  echo "  2. Remove or move sensitive data to .env.local"
  echo "  3. If already committed, clean Git history"
  echo "  4. Rotate any exposed credentials"
  exit 1
else
  echo -e "${GREEN}✅ Security audit passed - No issues found!${NC}"
  exit 0
fi
