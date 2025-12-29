# Firebase API Key Update Script
# ใช้สำหรับอัพเดท API key ใหม่

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Firebase API Key Update Utility" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for new API key
Write-Host "📋 กรุณาใส่ Firebase Web API Key ใหม่:" -ForegroundColor Yellow
Write-Host "   (รับได้จาก: https://console.firebase.google.com/project/peace-script-ai/settings/general)" -ForegroundColor Gray
Write-Host ""
$newApiKey = Read-Host "API Key"

if ([string]::IsNullOrWhiteSpace($newApiKey)) {
    Write-Host "❌ ไม่ได้ใส่ API Key" -ForegroundColor Red
    exit 1
}

# Validate API key format
if ($newApiKey -notmatch "^AIza[0-9A-Za-z_-]{35}$") {
    Write-Host "⚠️  Warning: API Key format ดูไม่ถูกต้อง (ควรเป็น AIza...)" -ForegroundColor Yellow
    $confirm = Read-Host "ต้องการดำเนินการต่อหรือไม่? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "ยกเลิกการอัพเดท" -ForegroundColor Gray
        exit 0
    }
}

Write-Host ""
Write-Host "🔄 กำลังอัพเดท API Key..." -ForegroundColor Cyan

# Backup current files
Write-Host "  - สร้าง backup..." -ForegroundColor Gray
Copy-Item ".env.local" ".env.local.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')" -ErrorAction SilentlyContinue
Copy-Item ".env.production" ".env.production.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')" -ErrorAction SilentlyContinue

# Update .env.local
if (Test-Path ".env.local") {
    $content = Get-Content ".env.local" -Raw
    $content = $content -replace "VITE_FIREBASE_API_KEY=.*", "VITE_FIREBASE_API_KEY=$newApiKey"
    Set-Content ".env.local" $content -NoNewline
    Write-Host "  ✓ อัพเดท .env.local" -ForegroundColor Green
}

# Update .env.production
if (Test-Path ".env.production") {
    $content = Get-Content ".env.production" -Raw
    $content = $content -replace "VITE_FIREBASE_API_KEY=.*", "VITE_FIREBASE_API_KEY=$newApiKey"
    Set-Content ".env.production" $content -NoNewline
    Write-Host "  ✓ อัพเดท .env.production" -ForegroundColor Green
}

# Update .env (if exists)
if (Test-Path ".env") {
    $content = Get-Content ".env" -Raw
    $content = $content -replace "VITE_FIREBASE_API_KEY=.*", "VITE_FIREBASE_API_KEY=$newApiKey"
    Set-Content ".env" $content -NoNewline
    Write-Host "  ✓ อัพเดท .env" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ อัพเดท API Key สำเร็จ!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 ขั้นตอนถัดไป:" -ForegroundColor Yellow
Write-Host "  1. npm run build" -ForegroundColor White
Write-Host "  2. firebase deploy --only hosting" -ForegroundColor White
Write-Host ""

# Ask to build and deploy
$buildNow = Read-Host "ต้องการ build และ deploy ทันทีหรือไม่? (y/n)"
if ($buildNow -eq "y") {
    Write-Host ""
    Write-Host "🔨 Building..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🚀 Deploying..." -ForegroundColor Cyan
        firebase deploy --only hosting
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Deploy สำเร็จ! เปิด https://peace-script-ai.web.app" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Deploy ล้มเหลว" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "❌ Build ล้มเหลว" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
