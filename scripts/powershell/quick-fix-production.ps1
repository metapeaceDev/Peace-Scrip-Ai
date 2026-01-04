# Quick Fix Script for Production
# วิธีใช้: .\scripts\powershell\quick-fix-production.ps1

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  ⚡ Quick Fix for Production Errors" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Yellow

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
if (-not (Test-CommandExists "node")) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green

# Check npm
if (-not (Test-CommandExists "npm")) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm: $(npm --version)" -ForegroundColor Green

# Check Firebase CLI
if (-not (Test-CommandExists "firebase")) {
    Write-Host "❌ Firebase CLI not found" -ForegroundColor Red
    Write-Host "📝 Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Firebase CLI installed" -ForegroundColor Green

# Check Firebase login
Write-Host "`n🔐 Checking Firebase authentication..." -ForegroundColor Cyan
$firebaseProjects = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Firebase" -ForegroundColor Red
    Write-Host "📝 Logging in to Firebase..." -ForegroundColor Yellow
    firebase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Firebase login failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Firebase authenticated" -ForegroundColor Green

# Create .env.production from template if not exists
if (-not (Test-Path ".env.production")) {
    Write-Host "`n📝 Creating .env.production from template..." -ForegroundColor Yellow
    
    if (Test-Path ".env.production.template") {
        Copy-Item ".env.production.template" ".env.production"
        Write-Host "✅ Created .env.production" -ForegroundColor Green
        Write-Host "`n⚠️  IMPORTANT: Edit .env.production and add your API keys!" -ForegroundColor Red
        Write-Host "   1. Open: .env.production" -ForegroundColor White
        Write-Host "   2. Add your Gemini API key (required)" -ForegroundColor White
        Write-Host "   3. Add your Firebase config (required)" -ForegroundColor White
        Write-Host "   4. Save and run this script again`n" -ForegroundColor White
        
        # Open file in default editor
        Write-Host "📝 Opening .env.production in editor..." -ForegroundColor Cyan
        Start-Process ".env.production"
        
        Write-Host "`n⏸️  Script paused. Press Enter after saving .env.production..." -ForegroundColor Yellow
        Read-Host
    } else {
        Write-Host "❌ .env.production.template not found" -ForegroundColor Red
        exit 1
    }
}

# Verify .env.production has content
$envContent = Get-Content ".env.production" -Raw
if ($envContent -notmatch 'VITE_GEMINI_API_KEY=\w+') {
    Write-Host "`n❌ VITE_GEMINI_API_KEY not set in .env.production" -ForegroundColor Red
    Write-Host "   Please edit .env.production and add your Gemini API key" -ForegroundColor White
    Write-Host "   Get your key from: https://aistudio.google.com/app/apikey`n" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n✅ .env.production configured" -ForegroundColor Green

# Ask if user wants to deploy now
Write-Host "`n🚀 Ready to deploy to production!" -ForegroundColor Green
Write-Host "   This will:" -ForegroundColor White
Write-Host "   1. Install dependencies" -ForegroundColor Gray
Write-Host "   2. Build the app" -ForegroundColor Gray
Write-Host "   3. Deploy to Firebase Hosting" -ForegroundColor Gray

$deploy = Read-Host "`nDeploy now? (y/N)"

if ($deploy -eq 'y' -or $deploy -eq 'Y') {
    # Install dependencies
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    
    # Build
    Write-Host "`n🏗️  Building for production..." -ForegroundColor Cyan
    $env:NODE_ENV = "production"
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build successful!" -ForegroundColor Green
        
        # Deploy
        Write-Host "`n🚀 Deploying to Firebase..." -ForegroundColor Cyan
        firebase deploy --only hosting
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║                                                   ║" -ForegroundColor Green
            Write-Host "║           ✅ DEPLOYMENT SUCCESSFUL! ✅            ║" -ForegroundColor Green
            Write-Host "║                                                   ║" -ForegroundColor Green
            Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host "`n🌐 Your app is live at:" -ForegroundColor Cyan
            Write-Host "   https://peace-script-ai.web.app`n" -ForegroundColor Blue
        } else {
            Write-Host "`n❌ Deployment failed" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Build failed" -ForegroundColor Red
    }
} else {
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "   Run deployment manually with:" -ForegroundColor White
    Write-Host "   .\scripts\powershell\deploy-production.ps1`n" -ForegroundColor Cyan
}
