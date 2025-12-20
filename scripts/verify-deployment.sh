#!/bin/bash
# Pre-deployment verification script for Peace Script AI

set -e  # Exit on any error

echo "🚀 Peace Script AI - Pre-Deployment Verification"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}✗${NC} $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠${NC} $message"
        ((WARNINGS++))
    fi
}

echo "1. Checking Prerequisites..."
echo "----------------------------"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_status "PASS" "Node.js installed: $NODE_VERSION"
else
    print_status "FAIL" "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_status "PASS" "npm installed: $NPM_VERSION"
else
    print_status "FAIL" "npm not found"
fi

# Check Firebase CLI
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    print_status "PASS" "Firebase CLI installed: $FIREBASE_VERSION"
else
    print_status "WARN" "Firebase CLI not installed. Run: npm install -g firebase-tools"
fi

echo ""
echo "2. Checking Code Quality..."
echo "----------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "PASS" "Dependencies installed"
else
    print_status "FAIL" "Dependencies not installed. Run: npm install"
    exit 1
fi

# Run TypeScript compilation
echo "   Running TypeScript compilation..."
if npm run type-check &> /dev/null; then
    print_status "PASS" "TypeScript compilation successful"
else
    print_status "FAIL" "TypeScript errors found"
fi

# Run linting
echo "   Running ESLint..."
if npm run lint &> /dev/null; then
    print_status "PASS" "No linting errors"
else
    print_status "WARN" "Linting warnings found (non-blocking)"
fi

echo ""
echo "3. Running Tests..."
echo "----------------------------"

# Run tests
echo "   Running test suite..."
TEST_OUTPUT=$(npm test -- --run 2>&1)
if echo "$TEST_OUTPUT" | grep -q "Tests.*passed"; then
    TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -o '[0-9]* passed' | head -1)
    print_status "PASS" "Tests passing: $TEST_COUNT"
else
    print_status "FAIL" "Some tests failing"
fi

echo ""
echo "4. Building Production Bundle..."
echo "----------------------------"

# Clean previous build
if [ -d "dist" ]; then
    rm -rf dist
    print_status "PASS" "Cleaned previous build"
fi

# Build
echo "   Building..."
if npm run build > /dev/null 2>&1; then
    print_status "PASS" "Production build successful"
    
    # Check build output
    if [ -d "dist" ]; then
        BUNDLE_SIZE=$(du -sh dist | cut -f1)
        print_status "PASS" "Build output created: $BUNDLE_SIZE"
    else
        print_status "FAIL" "Build output directory not found"
    fi
else
    print_status "FAIL" "Build failed"
    exit 1
fi

echo ""
echo "5. Checking Firebase Configuration..."
echo "----------------------------"

# Check firebase.json
if [ -f "firebase.json" ]; then
    print_status "PASS" "firebase.json exists"
else
    print_status "FAIL" "firebase.json not found"
fi

# Check .firebaserc
if [ -f ".firebaserc" ]; then
    PROJECT_ID=$(cat .firebaserc | grep -o '"default": "[^"]*"' | cut -d'"' -f4)
    print_status "PASS" "Firebase project configured: $PROJECT_ID"
else
    print_status "FAIL" ".firebaserc not found"
fi

# Check Firestore rules
if [ -f "firestore.rules" ]; then
    print_status "PASS" "Firestore rules exist"
else
    print_status "WARN" "Firestore rules not found"
fi

# Check Firestore indexes
if [ -f "firestore.indexes.json" ]; then
    print_status "PASS" "Firestore indexes configured"
else
    print_status "WARN" "Firestore indexes not found"
fi

# Check Storage rules
if [ -f "storage.rules" ]; then
    print_status "PASS" "Storage rules exist"
else
    print_status "WARN" "Storage rules not found"
fi

echo ""
echo "6. Checking Environment Variables..."
echo "----------------------------"

# Check for .env.local or .env
if [ -f ".env.local" ] || [ -f ".env" ]; then
    print_status "PASS" "Environment file exists"
    
    # Check for required variables
    ENV_FILE=".env.local"
    [ ! -f "$ENV_FILE" ] && ENV_FILE=".env"
    
    REQUIRED_VARS=(
        "VITE_FIREBASE_API_KEY"
        "VITE_FIREBASE_AUTH_DOMAIN"
        "VITE_FIREBASE_PROJECT_ID"
        "VITE_GEMINI_API_KEY"
    )
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$VAR=" "$ENV_FILE"; then
            VALUE=$(grep "^$VAR=" "$ENV_FILE" | cut -d'=' -f2)
            if [ -n "$VALUE" ] && [ "$VALUE" != "your_*" ]; then
                print_status "PASS" "$VAR configured"
            else
                print_status "FAIL" "$VAR not configured (has placeholder)"
            fi
        else
            print_status "FAIL" "$VAR not found in environment"
        fi
    done
else
    print_status "FAIL" "No environment file found (.env.local or .env)"
fi

echo ""
echo "7. Checking Documentation..."
echo "----------------------------"

DOCS=(
    "README.md"
    "QUICK_START.md"
    "DEPLOYMENT_GUIDE.md"
    "DEVELOPMENT_GUIDE.md"
    "PROJECT_COMPLETION_REPORT.md"
)

for DOC in "${DOCS[@]}"; do
    if [ -f "$DOC" ]; then
        print_status "PASS" "$DOC exists"
    else
        print_status "WARN" "$DOC not found"
    fi
done

echo ""
echo "=================================================="
echo "Summary"
echo "=================================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

# Calculate readiness score
TOTAL=$((PASSED + WARNINGS + FAILED))
if [ $TOTAL -gt 0 ]; then
    SCORE=$((PASSED * 100 / TOTAL))
    echo "Production Readiness: $SCORE%"
else
    SCORE=0
fi

echo ""

if [ $FAILED -eq 0 ] && [ $SCORE -ge 80 ]; then
    echo -e "${GREEN}✓ READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Ensure Firebase project is configured"
    echo "2. Deploy security rules: firebase deploy --only firestore:rules,storage:rules"
    echo "3. Deploy application: firebase deploy --only hosting"
    echo "4. Verify deployment at: https://$PROJECT_ID.web.app"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ MOSTLY READY (with warnings)${NC}"
    echo ""
    echo "Review warnings above before deploying."
    echo "For full deployment guide, see: DEPLOYMENT_GUIDE.md"
    exit 0
else
    echo -e "${RED}✗ NOT READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Please fix the failed checks above before deploying."
    echo "For help, see: DEPLOYMENT_GUIDE.md or PRE_DEPLOYMENT_CHECKLIST.md"
    exit 1
fi
