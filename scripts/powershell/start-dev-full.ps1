# Start Peace Script AI - Full Development Environment
# This script starts all required services for local GPU video generation

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🚀 Peace Script AI - Development Startup             ║
║                                                              ║
║  Local GPU Video Generation with ComfyUI + AnimateDiff      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`n📋 Starting services...`n" -ForegroundColor Yellow

# 1. Start ComfyUI Server
Write-Host "1️⃣ Starting ComfyUI Server (port 8188)..." -ForegroundColor Cyan
$comfyRunning = $false
try {
    $test = Invoke-WebRequest "http://localhost:8188" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    $comfyRunning = $true
    Write-Host "   ✅ ComfyUI already running" -ForegroundColor Green
} catch {
    Write-Host "   ⏳ Starting ComfyUI in new window..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\ComfyUI\ComfyUI_windows_portable'; Write-Host '🎨 ComfyUI Server' -ForegroundColor Cyan; .\run_nvidia_gpu.bat"
    Write-Host "   ⏳ Waiting 20 seconds for initialization..." -ForegroundColor Gray
    Start-Sleep -Seconds 20
    Write-Host "   ✅ ComfyUI started" -ForegroundColor Green
}

# 2. Start ComfyUI Service
Write-Host "`n2️⃣ Starting ComfyUI Service (port 8000)..." -ForegroundColor Cyan
$serviceRunning = $false
try {
    $test = Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    $serviceRunning = $true
    Write-Host "   ✅ ComfyUI Service already running" -ForegroundColor Green
} catch {
    Write-Host "   ⏳ Starting service in new window..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service'; Write-Host '🔧 ComfyUI Service' -ForegroundColor Cyan; npm run dev"
    Write-Host "   ⏳ Waiting 12 seconds for initialization..." -ForegroundColor Gray
    Start-Sleep -Seconds 12
    Write-Host "   ✅ Service started" -ForegroundColor Green
}

# 3. Start Frontend Dev Server
Write-Host "`n3️⃣ Starting Frontend Dev Server (port 5173)..." -ForegroundColor Cyan
$frontendRunning = $false
try {
    $test = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    $frontendRunning = $true
    Write-Host "   ✅ Frontend already running" -ForegroundColor Green
} catch {
    Write-Host "   ⏳ Starting Vite dev server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1'; Write-Host '⚡ Vite Dev Server' -ForegroundColor Cyan; npm run dev"
    Write-Host "   ⏳ Waiting 10 seconds for initialization..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    Write-Host "   ✅ Frontend started" -ForegroundColor Green
}

# Verify all services
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "`n🔍 Verifying services...`n" -ForegroundColor Yellow

$allGood = $true

# Check ComfyUI
try {
    Invoke-WebRequest "http://localhost:8188" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "✅ ComfyUI Server:  http://localhost:8188" -ForegroundColor Green
} catch {
    Write-Host "❌ ComfyUI Server:  NOT RESPONDING" -ForegroundColor Red
    $allGood = $false
}

# Check Service
try {
    $health = Invoke-RestMethod "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "✅ ComfyUI Service: http://localhost:8000 (Queue: $($health.platform.recommendedWorkflow))" -ForegroundColor Green
} catch {
    Write-Host "❌ ComfyUI Service: NOT RESPONDING" -ForegroundColor Red
    $allGood = $false
}

# Check Frontend
try {
    Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "✅ Frontend Dev:    http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Dev:    NOT RESPONDING" -ForegroundColor Red
    $allGood = $false
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

if ($allGood) {
    Write-Host "`n🎉 All services running successfully!" -ForegroundColor Green
    Write-Host "`n📱 Open your browser to: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "   Then go to Project → Generate Video → Select 'Local GPU'" -ForegroundColor Gray
    Write-Host "`n💡 Tip: Video generation takes ~60-120 seconds on RTX 5090" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Some services failed to start" -ForegroundColor Yellow
    Write-Host "   Check the terminal windows for errors" -ForegroundColor Gray
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

# Keep window open
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
