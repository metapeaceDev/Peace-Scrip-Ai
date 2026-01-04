# Production Deployment Script
# วิธีใช้: .\scripts\powershell\deploy-production.ps1

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Peace Script AI - Production Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ ERROR: .env.production not found!" -ForegroundColor Red
    Write-Host "`n📝 Please create .env.production first:" -ForegroundColor Yellow
    Write-Host "   1. Copy template:" -ForegroundColor White
    Write-Host "      Copy-Item '.env.production.template' '.env.production'" -ForegroundColor Gray
    Write-Host "   2. Edit .env.production and add your API keys" -ForegroundColor White
    Write-Host "   3. Run this script again`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ Found .env.production" -ForegroundColor Green

# Check if required environment variables are set
Write-Host "`n🔍 Checking required environment variables..." -ForegroundColor Yellow
$envContent = Get-Content ".env.production" -Raw
$missingVars = @()

if ($envContent -notmatch 'VITE_GEMINI_API_KEY=.+') {
    $missingVars += "VITE_GEMINI_API_KEY"
}
if ($envContent -notmatch 'VITE_FIREBASE_API_KEY=.+') {
    $missingVars += "VITE_FIREBASE_API_KEY"
}
if ($envContent -notmatch 'VITE_FIREBASE_PROJECT_ID=.+') {
    $missingVars += "VITE_FIREBASE_PROJECT_ID"
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor White
    }
    Write-Host "`n📝 Please edit .env.production and add these values`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All required environment variables are set" -ForegroundColor Green

# Confirm deployment
Write-Host "`n⚠️  You are about to deploy to PRODUCTION" -ForegroundColor Yellow
Write-Host "   Target: https://peace-script-ai.web.app" -ForegroundColor White
$confirm = Read-Host "`nContinue? (y/N)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "`n❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

# Run type check
Write-Host "`n🔍 Running type check..." -ForegroundColor Cyan
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Type check failed, but continuing..." -ForegroundColor Yellow
}

# Build for production
Write-Host "`n🏗️  Building for production..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Check build size
$distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📊 Build size: $([math]::Round($distSize, 2)) MB" -ForegroundColor White

# Deploy to Firebase
Write-Host "`n🚀 Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                   ║" -ForegroundColor Green
    Write-Host "║       ✅ DEPLOYMENT SUCCESSFUL! ✅                ║" -ForegroundColor Green
    Write-Host "║                                                   ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`n🌐 Your app is live at:" -ForegroundColor Cyan
    Write-Host "   https://peace-script-ai.web.app" -ForegroundColor Blue
    Write-Host "`n📊 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Open the app in your browser" -ForegroundColor White
    Write-Host "   2. Open Developer Console (F12)" -ForegroundColor White
    Write-Host "   3. Check for any errors" -ForegroundColor White
    Write-Host "   4. Test image generation`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Deployment failed" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor White
    Write-Host "   Common issues:" -ForegroundColor Yellow
    Write-Host "   - Firebase CLI not logged in (run: firebase login)" -ForegroundColor White
    Write-Host "   - Incorrect project ID in .firebaserc" -ForegroundColor White
    Write-Host "   - Missing Firebase permissions`n" -ForegroundColor White
    exit 1
}
