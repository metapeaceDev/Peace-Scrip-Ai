#!/bin/bash

# Admin Dashboard System Check
# ตรวจสอบความพร้อมของระบบ Admin Dashboard

echo "🔍 Peace Script AI - Admin Dashboard System Check"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Function to check
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAIL++))
    fi
}

# 1. Check Node.js
echo "1. Checking Node.js..."
node --version > /dev/null 2>&1
check "Node.js installed"

# 2. Check npm
echo "2. Checking npm..."
npm --version > /dev/null 2>&1
check "npm installed"

# 3. Check Firebase CLI
echo "3. Checking Firebase CLI..."
firebase --version > /dev/null 2>&1
check "Firebase CLI installed"

# 4. Check if in project directory
echo "4. Checking project structure..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} package.json not found"
    ((FAIL++))
fi

# 5. Check if node_modules exists
echo "5. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
    ((PASS++))
else
    echo -e "${YELLOW}!${NC} node_modules not found - run: npm install"
    ((FAIL++))
fi

# 6. Check for firebase-admin
echo "6. Checking firebase-admin..."
if [ -d "node_modules/firebase-admin" ]; then
    echo -e "${GREEN}✓${NC} firebase-admin installed"
    ((PASS++))
else
    echo -e "${YELLOW}!${NC} firebase-admin not found - run: npm install firebase-admin"
    ((FAIL++))
fi

# 7. Check for recharts
echo "7. Checking recharts..."
if [ -d "node_modules/recharts" ]; then
    echo -e "${GREEN}✓${NC} recharts installed"
    ((PASS++))
else
    echo -e "${YELLOW}!${NC} recharts not found - run: npm install recharts"
    ((FAIL++))
fi

# 8. Check admin components
echo "8. Checking admin components..."
if [ -f "src/components/admin/AdminDashboard.tsx" ]; then
    echo -e "${GREEN}✓${NC} AdminDashboard.tsx exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} AdminDashboard.tsx missing"
    ((FAIL++))
fi

# 9. Check admin services
echo "9. Checking admin services..."
if [ -f "src/services/adminAuthService.ts" ]; then
    echo -e "${GREEN}✓${NC} adminAuthService.ts exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} adminAuthService.ts missing"
    ((FAIL++))
fi

# 10. Check scripts
echo "10. Checking admin scripts..."
if [ -f "scripts/set-admin-claims.js" ]; then
    echo -e "${GREEN}✓${NC} set-admin-claims.js exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} set-admin-claims.js missing"
    ((FAIL++))
fi

# 11. Check service account key
echo "11. Checking service account key..."
if [ -f "service-account-key.json" ]; then
    echo -e "${GREEN}✓${NC} service-account-key.json found"
    ((PASS++))
else
    echo -e "${YELLOW}!${NC} service-account-key.json not found"
    echo -e "   ${YELLOW}→${NC} Download from Firebase Console"
    echo -e "   ${YELLOW}→${NC} See: QUICK_START_ADMIN.md"
    ((FAIL++))
fi

# 12. Check .gitignore
echo "12. Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if grep -q "service-account-key.json" .gitignore; then
        echo -e "${GREEN}✓${NC} service-account-key.json in .gitignore"
        ((PASS++))
    else
        echo -e "${YELLOW}!${NC} Add service-account-key.json to .gitignore"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} .gitignore not found"
    ((FAIL++))
fi

# 13. Check dist folder (built)
echo "13. Checking build..."
if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist folder exists (project built)"
    ((PASS++))
else
    echo -e "${YELLOW}!${NC} dist folder not found - run: npm run build"
    ((FAIL++))
fi

# 14. Check Firebase config
echo "14. Checking Firebase configuration..."
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✓${NC} firebase.json exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} firebase.json missing"
    ((FAIL++))
fi

# 15. Check firestore rules
echo "15. Checking Firestore rules..."
if [ -f "firestore.rules" ]; then
    if grep -q "isAdmin()" firestore.rules; then
        echo -e "${GREEN}✓${NC} Admin rules configured"
        ((PASS++))
    else
        echo -e "${YELLOW}!${NC} Admin rules may be incomplete"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} firestore.rules missing"
    ((FAIL++))
fi

echo ""
echo "=================================================="
echo "📊 System Check Results:"
echo "   Passed: ${PASS}"
echo "   Failed: ${FAIL}"
echo "   Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "🚀 You're ready to use Admin Dashboard!"
    echo ""
    echo "Next steps:"
    echo "1. Make sure you've granted admin access to your user"
    echo "2. Visit: https://peace-script-ai.web.app"
    echo "3. Login and click the Admin button"
    echo ""
    echo "See QUICK_START_ADMIN.md for setup instructions."
    exit 0
else
    echo -e "${YELLOW}⚠️  Some checks failed${NC}"
    echo ""
    echo "Please fix the issues above before using Admin Dashboard."
    echo "See QUICK_START_ADMIN.md for setup instructions."
    exit 1
fi
