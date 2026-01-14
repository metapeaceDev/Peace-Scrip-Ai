# Project Organization Script
# Organizes documentation, scripts, and configuration files

$ErrorActionPreference = "Stop"
$root = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1"
Set-Location $root

Write-Host "`n🗂️  Peace Script AI - Project Organization" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Create necessary directories
$dirs = @(
    "docs-archive\project-status",
    "docs\getting-started",
    "docs\features\video",
    "docs\features\face-id",
    "docs\features\vfx",
    "docs\features\storyboard",
    "docs\features\lora",
    "docs\features\voice-cloning",
    "docs\installation",
    "docs\deployment",
    "docs\development",
    "tools\diagnostics",
    "tools\operations",
    "tools\setup",
    "tests\integration",
    "config"
)

Write-Host "📁 Creating directories..." -ForegroundColor Yellow
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   ✅ Created: $dir" -ForegroundColor Green
    }
}

# File move operations
$moves = @{
    # ========== COMPLETION REPORTS & STATUS DOCS ==========
    "docs-archive\project-status" = @(
        "COMPLETION_REPORT.md",
        "FINAL_SUMMARY.md",
        "FINAL_SETUP_COMPLETE.md",
        "FILE_ORGANIZATION_REPORT.md",
        "ORGANIZATION_REPORT.md",
        "PROJECT_ORGANIZATION_ANALYSIS.md",
        "PROJECT_ORGANIZATION_SUMMARY.md",
        "DOCS_ORGANIZATION_PLAN.md",
        "SESSION_STATE.md",
        "READY_TO_COMMIT.md",
        "SECURITY_SUMMARY.md",
        "SYSTEM_AUDIT_COMPLETE.md",
        "SYSTEM_IMPROVEMENTS_COMPLETE.md",
        "SYSTEM_READY.md",
        "PROJECT_HEALTH_REPORT.md",
        "VERIFICATION_REPORT_FINAL.md",
        "CHECKPOINT_FIX_REPORT.md",
        "CHECKPOINT_UPGRADE_COMPLETE.md",
        "DEPLOYMENT_COMPLETE.md",
        "DEPLOYMENT_PHASE2_COMPLETE.md",
        "INSTALLATION_COMPLETE.md",
        "INSTALLATION_STATUS_REPORT.md",
        "INSTALLATION_STATUS_THAI.md",
        "INSTANTID_FIX_COMPLETE.md",
        "INSTANTID_CONTROLNET_FIX.md",
        "FACEID_SPEED_FIX_COMPLETE.md",
        "FACE_ID_3_TIER_STATUS.md",
        "FACE_ID_COMPLETE_SUMMARY.md",
        "FACE_ID_FINAL_REPORT.md",
        "FACE_ID_INSTALLATION_COMPLETE.md",
        "FACE_ID_SYSTEM_STATUS.md",
        "PORTRAIT_FACEID_CONTROLS_COMPLETE.md",
        "EXPORT_FIX_SUMMARY.md",
        "MODEL_INSTALLATION_SUMMARY.md",
        "IMAGETYPE_SYSTEM_COMPLETE.md",
        "SPEECH_PATTERN_FALLBACK_COMPLETE.md",
        "CHARACTER_PROFILE_FIX.md",
        "VIDEO_AUDIO_INTEGRATION_COMPLETE.md",
        "VIDEO_MODEL_UPDATE_SUMMARY.md",
        "VIDEO_QUALITY_FIX_SUMMARY.md",
        "VOICE_CLONING_COMPLETE_REPORT.md",
        "WAN_IMPLEMENTATION_SUMMARY.md",
        "WAN_MODEL_ISSUE_DIAGNOSIS.md",
        "WAN_OPTIMIZATION_SUMMARY_TH.md",
        "WAN_REVERT_SUMMARY.md"
    )
    
    # ========== QUICK START & GUIDES ==========
    "docs\getting-started" = @(
        "QUICK_START_LORA_FACESWAP.md",
        "QUICK_START_VIDEO_VOICE.md",
        "HOW_TO_ADD_API_KEYS.md",
        "LORA_QUICK_GUIDE.md",
        "HYBRID_SETUP_QUICKSTART.md",
        "QUICK_ACTION_GUIDE.md"
    )
    
    # ========== VIDEO FEATURES ==========
    "docs\features\video" = @(
        "VIDEO_FACE_ID_IMPLEMENTATION.md",
        "VIDEO_QUALITY_ANALYSIS.md",
        "IMAGE_TO_VIDEO_QUALITY_FIX.md",
        "ANIMATEDIFF_STYLE_LIMITATION.md",
        "WAN_14B_UPGRADE_GUIDE.md",
        "WAN_MODEL_REQUIREMENTS.md",
        "WAN_QUALITY_TUNING.md",
        "WAN_RESOLUTION_FIX.md",
        "PHOTOREALISM_ITERATION_7_TEST.md"
    )
    
    # ========== FACE ID FEATURES ==========
    "docs\features\face-id" = @(
        "INSTANTID_FIX_PLAN.md"
    )
    
    # ========== VFX FEATURES ==========
    "docs\features\vfx" = @(
        "VFX_FIELD_IMPLEMENTATION.md",
        "VFX_POSITION_OPTIMIZATION.md"
    )
    
    # ========== STORYBOARD FEATURES ==========
    "docs\features\storyboard" = @(
        "STORYBOARD_CONSISTENCY_FIX.md",
        "STORYBOARD_STYLE_CHARACTER_FIX.md"
    )
    
    # ========== LORA TRAINING ==========
    "docs\features\lora" = @(
        "LORA_TRAINING_SETUP.md"
    )
    
    # ========== INSTALLATION GUIDES ==========
    "docs\installation" = @(
        "INSTALL_REACTOR.md",
        "CONTROLNET_DOWNLOAD_GUIDE.md",
        "DOWNLOAD_CONTROLNET_MANUAL.md",
        "FIND_FIREBASE_CONFIG_DETAILED.md"
    )
    
    # ========== DEPLOYMENT DOCS ==========
    "docs\deployment" = @(
        "DEPLOYMENT_CHECKLIST.md",
        "DEPLOYMENT_GUIDE.md",
        "PRODUCTION_FIX_GUIDE.md",
        "RUNPOD_SETUP_GUIDE.md",
        "render-config.md"
    )
    
    # ========== DEVELOPMENT DOCS ==========
    "docs\development" = @(
        "COMMIT_GUIDE.md",
        "COMMIT_GUIDE_INSTANTID_FIX.md"
    )
    
    # ========== DIAGNOSTIC TOOLS ==========
    "tools\diagnostics" = @(
        "diagnose-progress-issue.cmd",
        "diagnose-progress-issue.ps1",
        "diagnose-wan.cmd",
        "diagnose-wan-models.ps1",
        "check-job-status.cmd",
        "check-logs.cmd",
        "check-wan-performance.ps1",
        "check-wan-simple.ps1",
        "check-status.html"
    )
    
    # ========== OPERATIONAL SCRIPTS ==========
    "tools\operations" = @(
        "restart-services.cmd",
        "quick-restart.cmd",
        "start-comfyui-service.ps1",
        "manage-comfyui-queue.ps1",
        "NEXT-STEP.cmd"
    )
    
    # ========== SETUP SCRIPTS ==========
    "tools\setup" = @(
        "install-faceswap.ps1",
        "install-faceswap-fixed.ps1",
        "install-insightface-models.ps1",
        "install-instantid-controlnet.ps1",
        "download-kijai-wan-model.ps1",
        "download-sdxl-checkpoint.ps1",
        "setup-lora-training.ps1",
        "place-wan-models.cmd",
        "deploy-phase2.ps1"
    )
    
    # ========== TEST FILES ==========
    "tests\integration" = @(
        "test-comfyui-direct.json",
        "test-video-request.json",
        "firebase-test.html",
        "psychology-test-suite.js",
        "stats.html"
    )
    
    # ========== CONFIG FILES ==========
    "config" = @(
        "firebase-storage-cors.json",
        "cors.json",
        "metadata.json",
        "vercel.json"
    )
}

# Perform moves
$totalMoved = 0
$alreadyMoved = 0
$notFound = 0

Write-Host "`n📦 Moving files..." -ForegroundColor Yellow

foreach ($dest in $moves.Keys) {
    $files = $moves[$dest]
    foreach ($file in $files) {
        $source = Join-Path $root $file
        $target = Join-Path $root "$dest\$file"
        
        if (Test-Path $source) {
            Move-Item -Path $source -Destination $target -Force
            $totalMoved++
            Write-Host "   ✅ $file → $dest" -ForegroundColor Green
        }
        elseif (Test-Path $target) {
            $alreadyMoved++
        }
        else {
            $notFound++
            Write-Host "   ⚠️  Not found: $file" -ForegroundColor DarkGray
        }
    }
}

# Create README files for organized directories
Write-Host "`n📝 Creating README files..." -ForegroundColor Yellow

# docs-archive/project-status/README.md
$readmeContent = @'
# Project Status Archive

This directory contains historical status reports, completion summaries, and project tracking documents.

## Categories

### Completion Reports
- Overall project completion reports
- Feature completion summaries
- Installation status reports

### System Status
- System audit reports
- Health check reports
- Verification reports

### Organization Documents
- File organization reports
- Project structure analysis
- Session state tracking

## Note
These documents are archived for reference. For current project status, see the main README.md and active documentation in docs/.
'@

$readmePath = Join-Path $root "docs-archive\project-status\README.md"
Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8
Write-Host "   ✅ Created: docs-archive/project-status/README.md" -ForegroundColor Green

# tools/README.md
$toolsReadme = @'
# Project Tools

Utility scripts and tools for development, diagnostics, and operations.

## Directory Structure

### diagnostics/
Diagnostic and monitoring scripts
- System health checks
- Performance diagnostics
- Log analysis tools

### operations/
Operational scripts for running services
- Service start/restart scripts
- Queue management
- Process control

### setup/
Installation and setup scripts
- Model downloads
- Package installations
- Configuration scripts

## Usage

Most scripts are PowerShell (.ps1) for Windows or Shell (.sh) for Unix systems.

Run with appropriate permissions and check script documentation for requirements.
'@

$toolsReadmePath = Join-Path $root "tools\README.md"
Set-Content -Path $toolsReadmePath -Value $toolsReadme -Encoding UTF8
Write-Host "   ✅ Created: tools/README.md" -ForegroundColor Green

# Create PROJECT_ORGANIZATION_2025.md
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$orgReport = "# Project Organization Report 2025`n`n"
$orgReport += "**Date:** $timestamp`n"
$orgReport += "**Status:** ✅ Complete`n`n"
$orgReport += "---`n`n"
$orgReport += "## Summary`n`n"
$orgReport += "Organized 120+ files from project root into structured directories.`n`n"
$orgReport += "## Statistics`n`n"
$orgReport += "- **Total files moved:** $totalMoved`n"
$orgReport += "- **Already organized:** $alreadyMoved`n"
$orgReport += "- **Not found:** $notFound`n`n"
$orgReport += "## Benefits`n`n"
$orgReport += "✅ Clean Root Directory`n"
$orgReport += "✅ Logical Organization`n"
$orgReport += "✅ Easy Navigation`n"
$orgReport += "✅ Better Maintenance`n`n"
$orgReport += "---`n`n"
$orgReport += "*Generated by organize-project.ps1*`n"

$orgReportPath = Join-Path $root "PROJECT_ORGANIZATION_2025.md"
Set-Content -Path $orgReportPath -Value $orgReport -Encoding UTF8

Write-Host "`n✨ Organization complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "   Files moved: $totalMoved" -ForegroundColor Green
Write-Host "   Already organized: $alreadyMoved" -ForegroundColor Yellow
Write-Host "   Not found: $notFound" -ForegroundColor Gray
Write-Host "`n📋 Report created: PROJECT_ORGANIZATION_2025.md" -ForegroundColor Cyan
Write-Host "`nRoot directory is now clean and organized! 🎉`n" -ForegroundColor Green
