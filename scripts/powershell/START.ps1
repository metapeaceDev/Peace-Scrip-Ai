# Peace Script AI - Quick Start Script
# สคริปต์เริ่มต้นระบบอัตโนมัติ

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🚀 Peace Script AI - Quick Start                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

try {
    # Navigate to project directory
    Set-Location "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1"
    
    Write-Host "`n📋 Starting services...`n" -ForegroundColor Yellow
    
    # 1. Check/Start Backend (Port 8000)
    Write-Host "1️⃣ Checking Backend Service (port 8000)..." -ForegroundColor Cyan
    $backendRunning = $false
    try {
        $test = Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $backendRunning = $true
        Write-Host "   ✅ Backend already running" -ForegroundColor Green
    } catch {
        Write-Host "   ⏳ Starting Backend in new window..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service'; Write-Host '🔧 ComfyUI Backend Service' -ForegroundColor Cyan; npm run dev"
        Write-Host "   ⏳ Waiting 15 seconds for initialization..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
        Write-Host "   ✅ Backend started" -ForegroundColor Green
    }
    
    # 2. Start Frontend (Port 5173)
    Write-Host "`n2️⃣ Starting Frontend Dev Server (port 5173)..." -ForegroundColor Cyan
    Write-Host "   ⏳ Starting in new window..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1'; Write-Host '🎨 Frontend Development Server' -ForegroundColor Cyan; npm run dev"
    Write-Host "   ⏳ Waiting 8 seconds for initialization..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    
    # 3. Verify services
    Write-Host "`n3️⃣ Verifying services..." -ForegroundColor Cyan
    
    $backendOk = $false
    $frontendOk = $false
    
    try {
        $test = Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 3
        $backendOk = $true
        Write-Host "   ✅ Backend is healthy" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Backend health check failed" -ForegroundColor Yellow
    }
    
    try {
        $test = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
        $frontendOk = $true
        Write-Host "   ✅ Frontend is accessible" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Frontend not yet accessible (may still be starting)" -ForegroundColor Yellow
    }
    
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                    ✅ STARTUP COMPLETE                       ║
╚══════════════════════════════════════════════════════════════╝

📡 Services:
   → Backend:  http://localhost:8000/health
   → Frontend: http://localhost:5173/

🌐 Open in your browser:
   → http://localhost:5173/

💡 Tips:
   - If frontend doesn't load, wait 10-15 seconds and refresh
   - Press Ctrl+C in the service windows to stop them
   - Run this script again if services crash

"@ -ForegroundColor Green

    # Optional: Open browser
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173"

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
