# Peace Script - File Organization Script
# Date: January 14, 2026
# Organize project files systematically

$ErrorActionPreference = "Stop"
$rootPath = $PSScriptRoot

Write-Host "Starting file organization..." -ForegroundColor Green
Write-Host ""

# ================================
# Phase 1: Create folder structure
# ================================
Write-Host "Phase 1: Creating folder structure..." -ForegroundColor Cyan

$folders = @(
    "docs/features"
    "docs/analysis"
    "docs/reports"
    "docs-archive/2025"
    "scripts/maintenance"
    "scripts/dev"
    "scripts/setup"
)

foreach ($folder in $folders) {
    $path = Join-Path $rootPath $folder
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  Created: $folder" -ForegroundColor Green
    } else {
        Write-Host "  Exists: $folder" -ForegroundColor Gray
    }
}

Write-Host ""

# ================================
# Phase 2: Move analysis documents
# ================================
Write-Host "Phase 2: Moving analysis and planning documents..." -ForegroundColor Cyan

$docMoves = @{
    "CETASIKA_52_ANALYSIS.md" = "docs/features/"
    "MOTION_EDITOR_IMPROVEMENT_PLAN.md" = "docs/features/"
    "COMPARISON_TWO_PROJECTS.md" = "docs/analysis/"
    "PROJECT_ORGANIZATION_2025.md" = "docs/reports/"
    "FILE_ORGANIZATION_PLAN.md" = "docs/reports/"
}

foreach ($file in $docMoves.Keys) {
    $sourcePath = Join-Path $rootPath $file
    $destFolder = Join-Path $rootPath $docMoves[$file]
    $destPath = Join-Path $destFolder $file
    
    if (Test-Path $sourcePath) {
        Move-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  Moved: $file -> $($docMoves[$file])" -ForegroundColor Green
    } else {
        Write-Host "  Not found: $file" -ForegroundColor Gray
    }
}

Write-Host ""

# ================================
# Phase 3: Move scripts
# ================================
Write-Host "Phase 3: Organizing scripts..." -ForegroundColor Cyan

$scriptMoves = @{
    "organize-project.ps1" = "scripts/maintenance/"
    "restart-services.cmd" = "scripts/dev/"
    "verify-setup.bat" = "scripts/setup/"
}

foreach ($script in $scriptMoves.Keys) {
    $sourcePath = Join-Path $rootPath $script
    $destFolder = Join-Path $rootPath $scriptMoves[$script]
    $destPath = Join-Path $destFolder $script
    
    if (Test-Path $sourcePath) {
        if ($sourcePath -eq $PSCommandPath) {
            Write-Host "  Skip: $script (currently running)" -ForegroundColor Yellow
            continue
        }
        
        Move-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  Moved: $script -> $($scriptMoves[$script])" -ForegroundColor Green
    } else {
        Write-Host "  Not found: $script" -ForegroundColor Gray
    }
}

Write-Host ""

# ================================
# Phase 4: Clean temporary files
# ================================
Write-Host "Phase 4: Cleaning temporary files..." -ForegroundColor Cyan

$tempPatterns = @(
    "*.tmp"
    "*.temp"
    "*.bak"
    "*.backup"
    "*~"
)

$cleanCount = 0
foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Path $rootPath -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($file.FullName -notmatch "(node_modules|\.git)") {
            Remove-Item $file.FullName -Force
            Write-Host "  Deleted: $($file.Name)" -ForegroundColor Red
            $cleanCount++
        }
    }
}

if ($cleanCount -eq 0) {
    Write-Host "  No temporary files to clean" -ForegroundColor Green
} else {
    Write-Host "  Deleted $cleanCount temporary files" -ForegroundColor Green
}

Write-Host ""

# ================================
# Phase 5: Update .gitignore
# ================================
Write-Host "Phase 5: Updating .gitignore..." -ForegroundColor Cyan

$gitignorePath = Join-Path $rootPath ".gitignore"
$gitignoreContent = Get-Content $gitignorePath -Raw

$newIgnoreRules = @"

# ================================
# Project-specific ignores
# Added by organize-files.ps1
# ================================

# Temporary folders
tmp/
temp/
*.tmp
*.temp

# Analysis/Planning docs (moved to docs/)
/CETASIKA_52_ANALYSIS.md
/MOTION_EDITOR_IMPROVEMENT_PLAN.md
/COMPARISON_TWO_PROJECTS.md
/PROJECT_ORGANIZATION_2025.md
/FILE_ORGANIZATION_PLAN.md

# Development scripts (moved to scripts/)
/organize-project.ps1
/organize-files.ps1
/restart-services.cmd
/verify-setup.bat

# Logs
vite-dev.log
*.log.old
*.log.backup

# OS temporary files
Thumbs.db
desktop.ini
.Spotlight-V100
.Trashes

# ================================
"@

if ($gitignoreContent -notmatch "organize-files.ps1") {
    Add-Content -Path $gitignorePath -Value $newIgnoreRules
    Write-Host "  Added new rules to .gitignore" -ForegroundColor Green
} else {
    Write-Host "  .gitignore already updated" -ForegroundColor Gray
}

Write-Host ""

# ================================
# Phase 6: Create folder READMEs
# ================================
Write-Host "Phase 6: Creating folder READMEs..." -ForegroundColor Cyan

$featuresReadme = @"
# Features Documentation

Documentation related to project features

## Files

- **CETASIKA_52_ANALYSIS.md** - Analysis of 52 Cetasikas integration
- **MOTION_EDITOR_IMPROVEMENT_PLAN.md** - Motion Editor improvement plan

## Notes

These are internal analysis documents, not meant for main repository
"@

$analysisReadme = @"
# Analysis Documents

Project analysis and comparisons

## Files

- **COMPARISON_TWO_PROJECTS.md** - Comparison between projects

## Notes

Temporary analysis documents
"@

$scriptsReadme = @"
# Development Scripts

Scripts for development and maintenance

## Structure

- **maintenance/** - Maintenance and organization scripts
- **dev/** - Development scripts (restart services, etc.)
- **setup/** - Setup and verification scripts

## Usage

Each script has usage comments at the top
"@

Set-Content -Path (Join-Path $rootPath "docs/features/README.md") -Value $featuresReadme
Write-Host "  Created: docs/features/README.md" -ForegroundColor Green

Set-Content -Path (Join-Path $rootPath "docs/analysis/README.md") -Value $analysisReadme
Write-Host "  Created: docs/analysis/README.md" -ForegroundColor Green

Set-Content -Path (Join-Path $rootPath "scripts/README.md") -Value $scriptsReadme
Write-Host "  Created: scripts/README.md" -ForegroundColor Green

Write-Host ""

# ================================
# Phase 7: Summary
# ================================
Write-Host "Phase 7: Summary" -ForegroundColor Cyan
Write-Host ""

$rootMdFiles = (Get-ChildItem -Path $rootPath -Filter "*.md" -File).Count
$docsFiles = (Get-ChildItem -Path (Join-Path $rootPath "docs") -Filter "*.md" -File -Recurse -ErrorAction SilentlyContinue).Count
$scriptsFiles = (Get-ChildItem -Path (Join-Path $rootPath "scripts") -File -Recurse -ErrorAction SilentlyContinue).Count

Write-Host "  Markdown files in root: $rootMdFiles" -ForegroundColor Yellow
Write-Host "  Documentation files: $docsFiles" -ForegroundColor Green
Write-Host "  Script files: $scriptsFiles" -ForegroundColor Green
Write-Host ""

# ================================
# Phase 8: Git Status
# ================================
Write-Host "Phase 8: Git Status" -ForegroundColor Cyan
Write-Host ""

Write-Host "  Current changes:" -ForegroundColor Yellow
git status --short | Select-Object -First 20 | ForEach-Object {
    Write-Host "    $_" -ForegroundColor Gray
}

Write-Host ""

# ================================
# Complete
# ================================
Write-Host "File organization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review changes: git status" -ForegroundColor White
Write-Host "  2. Review moved files: git diff" -ForegroundColor White
Write-Host "  3. Stage changes: git add ." -ForegroundColor White
Write-Host "  4. Commit: git commit -m 'chore: organize project files'" -ForegroundColor White
Write-Host "  5. Push: git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "WARNING: Check that no sensitive files are committed!" -ForegroundColor Yellow
Write-Host ""
