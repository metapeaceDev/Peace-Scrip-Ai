#!/bin/bash
# Documentation Cleanup Script
# จัดระเบียบ markdown files และสร้างโครงสร้างใหม่

set -e  # Exit on error

echo "🧹 Starting Documentation Cleanup..."
echo ""

# สร้างโครงสร้าง docs ใหม่
echo "📁 Creating new documentation structure..."
mkdir -p docs/{getting-started,features,deployment,development,api,changelog,archive}

# ย้ายไฟล์สำคัญไป docs/
echo "📝 Moving essential documentation..."

# Getting Started
[ -f "GETTING_STARTED.md" ] && mv GETTING_STARTED.md docs/getting-started/
[ -f "QUICKSTART.md" ] && mv QUICKSTART.md docs/getting-started/
[ -f "QUICK_START.md" ] && mv QUICK_START.md docs/getting-started/
[ -f "INSTALLATION_GUIDE.md" ] && mv INSTALLATION_GUIDE.md docs/getting-started/
[ -f "START_HERE.md" ] && mv START_HERE.md docs/getting-started/

# Features
[ -f "PSYCHOLOGY_EVOLUTION.md" ] && mv PSYCHOLOGY_EVOLUTION.md docs/features/
[ -f "BUDDHIST_PSYCHOLOGY_INTEGRATION.md" ] && mv BUDDHIST_PSYCHOLOGY_INTEGRATION.md docs/features/
[ -f "VIDEO_GENERATION_COMPLETE.md" ] && mv VIDEO_GENERATION_COMPLETE.md docs/features/
[ -f "MOTION_EDITOR_DOCUMENTATION.md" ] && mv MOTION_EDITOR_DOCUMENTATION.md docs/features/
[ -f "MOTION_EDITOR_GUIDE_TH.md" ] && mv MOTION_EDITOR_GUIDE_TH.md docs/features/
[ -f "KEYFRAME_TIMELINE_GUIDE_TH.md" ] && mv KEYFRAME_TIMELINE_GUIDE_TH.md docs/features/

# Deployment
[ -f "DEPLOYMENT.md" ] && mv DEPLOYMENT.md docs/deployment/
[ -f "DEPLOYMENT_CHECKLIST.md" ] && mv DEPLOYMENT_CHECKLIST.md docs/deployment/
[ -f "FIREBASE_DEPLOY.md" ] && mv FIREBASE_DEPLOY.md docs/deployment/
[ -f "FIREBASE_SETUP_GUIDE.md" ] && mv FIREBASE_SETUP_GUIDE.md docs/deployment/
[ -f "COMFYUI_BACKEND_DEPLOYMENT.md" ] && mv COMFYUI_BACKEND_DEPLOYMENT.md docs/deployment/
[ -f "DEBUG_GUIDE.md" ] && mv DEBUG_GUIDE.md docs/deployment/troubleshooting.md

# Development
[ -f "DEVELOPMENT.md" ] && mv DEVELOPMENT.md docs/development/
[ -f "CONTRIBUTING.md" ] && cp CONTRIBUTING.md docs/development/  # Keep in root too
[ -f "TESTING.md" ] && mv TESTING.md docs/development/
[ -f "TESTING_GUIDE.md" ] && mv TESTING_GUIDE.md docs/development/
[ -f "INTEGRATION_TEST_GUIDE.md" ] && mv INTEGRATION_TEST_GUIDE.md docs/development/

# ย้ายไฟล์ซ้ำซ้อนไป archive
echo "📦 Archiving duplicate/outdated files..."

# Completion/Summary files (เก็บไฟล์ล่าสุด)
[ -f "FINAL_SUMMARY.md" ] && mv FINAL_SUMMARY.md docs/archive/
[ -f "COMPLETION_SUMMARY.md" ] && mv COMPLETION_SUMMARY.md docs/archive/
[ -f "FINAL_COMPLETION_REPORT.md" ] && mv FINAL_COMPLETION_REPORT.md docs/archive/
[ -f "FINAL_REPORT.md" ] && mv FINAL_REPORT.md docs/archive/
[ -f "FINAL_INTEGRATION_SUMMARY.md" ] && mv FINAL_INTEGRATION_SUMMARY.md docs/archive/
[ -f "FINAL_IMPLEMENTATION_REPORT.md" ] && mv FINAL_IMPLEMENTATION_REPORT.md docs/archive/

# Deployment Success files (รวมเป็นหนึ่งเดียว)
[ -f "DEPLOYMENT_SUCCESS.md" ] && mv DEPLOYMENT_SUCCESS.md docs/archive/
[ -f "DEPLOYMENT_SUCCESS_2024-12-14.md" ] && mv DEPLOYMENT_SUCCESS_2024-12-14.md docs/archive/
[ -f "DEPLOYMENT_SUCCESS_REPORT.md" ] && mv DEPLOYMENT_SUCCESS_REPORT.md docs/archive/

# Audit Reports
[ -f "COMPREHENSIVE_AUDIT_REPORT.md" ] && mv COMPREHENSIVE_AUDIT_REPORT.md docs/archive/
[ -f "COMPREHENSIVE_AUDIT_REPORT_2024-12-14.md" ] && mv COMPREHENSIVE_AUDIT_REPORT_2024-12-14.md docs/archive/
[ -f "COMPREHENSIVE_SYSTEM_AUDIT.md" ] && mv COMPREHENSIVE_SYSTEM_AUDIT.md docs/archive/
[ -f "COMPREHENSIVE_PROJECT_EVALUATION.md" ] && mv COMPREHENSIVE_PROJECT_EVALUATION.md docs/archive/
[ -f "MOTION_EDITOR_SYSTEM_AUDIT.md" ] && mv MOTION_EDITOR_SYSTEM_AUDIT.md docs/archive/
[ -f "VIDEO_EXTENSION_PSYCHOLOGY_AUDIT.md" ] && mv VIDEO_EXTENSION_PSYCHOLOGY_AUDIT.md docs/archive/
[ -f "REALTIME_COLLABORATION_AUDIT.md" ] && mv REALTIME_COLLABORATION_AUDIT.md docs/archive/

# Implementation Progress files
[ -f "IMPLEMENTATION_PROGRESS.md" ] && mv IMPLEMENTATION_PROGRESS.md docs/archive/
[ -f "IMPLEMENTATION_PROGRESS_2024-12-15.md" ] && mv IMPLEMENTATION_PROGRESS_2024-12-15.md docs/archive/
[ -f "IMPLEMENTATION_REPORT_2024-12-14.md" ] && mv IMPLEMENTATION_REPORT_2024-12-14.md docs/archive/
[ -f "IMPLEMENTATION_COMPLETE.md" ] && mv IMPLEMENTATION_COMPLETE.md docs/archive/
[ -f "IMPLEMENTATION_SUMMARY.md" ] && mv IMPLEMENTATION_SUMMARY.md docs/archive/

# Session reports
[ -f "SESSION_28_COMPLETE.md" ] && mv SESSION_28_COMPLETE.md docs/archive/
[ -f "SESSION_ANIMATEDIFF_COMPLETE.md" ] && mv SESSION_ANIMATEDIFF_COMPLETE.md docs/archive/
[ -f "SESSION_MOTION_EDITOR_COMPLETE.md" ] && mv SESSION_MOTION_EDITOR_COMPLETE.md docs/archive/

# Video Extension files
[ -f "VIDEO_EXTENSION_ANALYSIS.md" ] && mv VIDEO_EXTENSION_ANALYSIS.md docs/archive/
[ -f "VIDEO_EXTENSION_IMPLEMENTATION.md" ] && mv VIDEO_EXTENSION_IMPLEMENTATION.md docs/archive/
[ -f "VIDEO_EXTENSION_FINAL_SUMMARY.md" ] && mv VIDEO_EXTENSION_FINAL_SUMMARY.md docs/archive/
[ -f "VIDEO_PSYCHOLOGY_INTEGRATION_PLAN.md" ] && mv VIDEO_PSYCHOLOGY_INTEGRATION_PLAN.md docs/archive/
[ -f "VIDEO_PSYCHOLOGY_INTEGRATION_COMPLETE.md" ] && mv VIDEO_PSYCHOLOGY_INTEGRATION_COMPLETE.md docs/archive/

# System Status files (outdated)
[ -f "SYSTEM_STATUS.md" ] && mv SYSTEM_STATUS.md docs/archive/
[ -f "SYSTEM_COMPLETE.md" ] && mv SYSTEM_COMPLETE.md docs/archive/
[ -f "CURRENT_STATUS.md" ] && mv CURRENT_STATUS.md docs/archive/
[ -f "PROJECT_STATUS.md" ] && mv PROJECT_STATUS.md docs/archive/
[ -f "HEALTH_REPORT_SUMMARY.md" ] && mv HEALTH_REPORT_SUMMARY.md docs/archive/
[ -f "PROJECT_HEALTH_REPORT.md" ] && mv PROJECT_HEALTH_REPORT.md docs/archive/

# สร้าง README.md สำหรับ docs
echo "📄 Creating docs/README.md..."
cat > docs/README.md << 'EOF'
# Peace Script AI - Documentation

Welcome to Peace Script AI documentation!

## 📚 Documentation Structure

### Getting Started
- [Installation Guide](getting-started/INSTALLATION_GUIDE.md)
- [Quick Start](getting-started/QUICKSTART.md)
- [Your First Project](getting-started/START_HERE.md)

### Features
- [Psychology Evolution System](features/PSYCHOLOGY_EVOLUTION.md)
- [Buddhist Psychology Integration](features/BUDDHIST_PSYCHOLOGY_INTEGRATION.md)
- [Video Generation](features/VIDEO_GENERATION_COMPLETE.md)
- [Motion Editor](features/MOTION_EDITOR_DOCUMENTATION.md)
- [Keyframe Timeline](features/KEYFRAME_TIMELINE_GUIDE_TH.md)

### Deployment
- [Deployment Guide](deployment/DEPLOYMENT.md)
- [Firebase Setup](deployment/FIREBASE_SETUP_GUIDE.md)
- [ComfyUI Backend](deployment/COMFYUI_BACKEND_DEPLOYMENT.md)
- [Troubleshooting](deployment/troubleshooting.md)

### Development
- [Development Guide](development/DEVELOPMENT.md)
- [Testing Guide](development/TESTING_GUIDE.md)
- [Contributing](development/CONTRIBUTING.md)

### Archive
Historical documents and old reports can be found in the [archive](archive/) folder.

---

**Last Updated:** December 16, 2024  
**Version:** 1.0
EOF

# สร้าง index สำหรับ archive
echo "📦 Creating archive index..."
cat > docs/archive/README.md << 'EOF'
# Archived Documentation

This folder contains historical documents, old reports, and deprecated documentation.

## Categories

### Implementation Reports
- Implementation progress reports from various dates
- Session completion reports
- Feature implementation summaries

### System Audits
- Comprehensive system audits
- Component-specific audits
- Integration audits

### Deployment Reports
- Deployment success reports
- Deployment summaries from various dates

### Project Evaluations
- Comprehensive project evaluations
- Health reports
- Status reports

---

**Note:** These documents are kept for historical reference only.  
For current documentation, please refer to the main [docs](../) folder.
EOF

echo ""
echo "✅ Documentation cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Created new docs/ structure"
echo "  - Moved essential files to appropriate folders"
echo "  - Archived duplicate/outdated files"
echo "  - Created README.md indexes"
echo ""
echo "📝 Next steps:"
echo "  1. Review docs/ structure"
echo "  2. Update root README.md to point to docs/"
echo "  3. Commit changes"
echo ""
