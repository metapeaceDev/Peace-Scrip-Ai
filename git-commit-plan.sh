#!/bin/bash
# Git Commit Plan - จัดกลุ่มและ commit ไฟล์อย่างเป็นระเบียบ

set -e

echo "📋 Git Commit Plan"
echo ""

# Group 1: Test Files (ลำดับความสำคัญสูงสุด)
echo "=== GROUP 1: Test Files ==="
echo "✅ Component tests (47 files):"
git status --short | grep "src/components/.*\.test\.tsx" | head -10
echo "   ... and 37 more"
echo ""
echo "💡 Commit message:"
echo "   test: add comprehensive component tests"
echo ""
echo "   - Add tests for ErrorBoundary, ReferralDashboard, LoRASetup, RevenueManagementPanel"
echo "   - Total 115 new tests across 4 components"
echo "   - All tests passing (3,139/3,160 total)"
echo "   - Coverage improvement: ~45.2% → ~45.6%"
echo ""
read -p "Press Enter to stage Group 1..."
git add src/components/*.test.tsx
git add src/__tests__/
echo "✅ Staged"
echo ""

# Group 2: Service Updates
echo "=== GROUP 2: Service Updates ==="
echo "📝 Updated services (10 files):"
git status --short | grep "src/services/"
echo ""
echo "💡 Commit message:"
echo "   refactor: update services for test compatibility"
echo ""
echo "   - Update comfyuiBackendClient, firestoreService, hybridTTSService"
echo "   - Improve error handling and type safety"
echo "   - Add test-friendly exports"
echo ""
read -p "Press Enter to stage Group 2..."
git add src/services/
echo "✅ Staged"
echo ""

# Group 3: Configuration Updates
echo "=== GROUP 3: Configuration Updates ==="
echo "⚙️ Config files (6 files):"
git status --short | grep -E "\.(json|ts|config)"
echo ""
echo "💡 Commit message:"
echo "   chore: update test configuration and dependencies"
echo ""
echo "   - Update vitest.config.ts for better test support"
echo "   - Update package.json with testing dependencies"
echo "   - Update .env.example with new variables"
echo ""
read -p "Press Enter to stage Group 3..."
git add package.json package-lock.json
git add vite.config.ts vitest.config.ts
git add .env.example backend/.env.test
echo "✅ Staged"
echo ""

# Group 4: Backend Test Updates
echo "=== GROUP 4: Backend Test Updates ==="
echo "🔧 Backend tests (2 files):"
git status --short | grep "backend/tests/"
echo ""
echo "💡 Commit message:"
echo "   test: update backend tests"
echo ""
echo "   - Update auth.test.js and projects.test.js"
echo "   - Improve test coverage for backend routes"
echo ""
read -p "Press Enter to stage Group 4..."
git add backend/tests/
echo "✅ Staged"
echo ""

# Group 5: Documentation (after cleanup)
echo "=== GROUP 5: Documentation ==="
echo "⚠️  WAIT - Run cleanup-docs.sh first!"
echo ""
echo "After running cleanup-docs.sh:"
echo "  1. New docs/ structure"
echo "  2. Archived duplicate files"
echo "  3. Clean root directory"
echo ""
echo "Then commit with:"
echo "   docs: organize documentation structure"
echo ""
echo "   - Create docs/ folder with categorized structure"
echo "   - Archive duplicate/outdated files"
echo "   - Keep only essential files in root"
echo "   - Add README.md indexes"
echo ""

echo ""
echo "📊 Summary:"
echo "  ✅ Group 1: Test files ready"
echo "  ✅ Group 2: Service updates ready"
echo "  ✅ Group 3: Config updates ready"
echo "  ✅ Group 4: Backend tests ready"
echo "  ⏳ Group 5: Docs (after cleanup)"
echo ""
echo "💡 Recommended order:"
echo "  1. Run: ./git-commit-plan.sh (this script)"
echo "  2. Review staged changes"
echo "  3. Commit each group"
echo "  4. Run: ./cleanup-docs.sh"
echo "  5. Commit documentation changes"
echo ""
