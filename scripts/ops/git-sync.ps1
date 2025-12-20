$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Git Sync Process..." -ForegroundColor Cyan

# 1. Check for Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Git is not installed or not in your PATH. Please install Git and try again."
    exit 1
}

# 2. Check Status
Write-Host "🔍 Checking git status..." -ForegroundColor Yellow
git status

# 3. Add Files
Write-Host "📦 Adding files to staging..." -ForegroundColor Yellow
git add .

# 4. Commit
$commitMsg = "refactor: organize project structure, cleanup imports, and update deployment config"
Write-Host "wm Committing changes: $commitMsg" -ForegroundColor Yellow
try {
    git commit -m "$commitMsg"
} catch {
    Write-Host "⚠️  Nothing to commit or commit failed (check output above)." -ForegroundColor DarkGray
}

# 5. Push
Write-Host "wm Pushing to remote (main)..." -ForegroundColor Yellow
try {
    git push origin main
} catch {
    Write-Error "❌ Failed to push. Please check your internet connection and git credentials."
    exit 1
}

Write-Host "✅ Git Sync Complete!" -ForegroundColor Green
