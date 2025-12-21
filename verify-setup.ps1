# Infrastructure Setup Verification Script
# Run this to verify all services are configured correctly

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ComfyUI Hybrid System - Infrastructure Verification       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()
$success = @()

# Check if .env files exist
Write-Host "Checking environment files..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $success += "[OK] Frontend .env file exists"
} else {
    $errors += "[ERROR] Frontend .env file missing"
}

if (Test-Path "comfyui-service\.env") {
    $success += "[OK] Backend .env file exists"
} else {
    $errors += "[ERROR] Backend .env file missing"
}

# Load backend .env
$envFile = "comfyui-service\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Write-Host ""
Write-Host "Checking required services..." -ForegroundColor Yellow

# Check Redis
Write-Host "  Redis..." -NoNewline
try {
    $redisUrl = $env:REDIS_URL
    if ($redisUrl) {
        # Try to parse Redis URL
        if ($redisUrl -match "redis://") {
            $success += "✓ Redis URL configured"
            Write-Host " ✓" -ForegroundColor Green
        } else {
            $errors += "✗ Invalid Redis URL format"
            Write-Host " ✗" -ForegroundColor Red
        }
    } else {
        $errors += "✗ REDIS_URL not set in .env"
        Write-Host " ✗" -ForegroundColor Red
    }
} catch {
    $errors += "✗ Redis check failed: $_"
    Write-Host " ✗" -ForegroundColor Red
}

# Check Firebase
Write-Host "  Firebase..." -NoNewline
$firebaseProjectId = $env:FIREBASE_PROJECT_ID
if ($firebaseProjectId -and $firebaseProjectId -ne "your-project-id") {
    $success += "✓ Firebase Project ID configured"
    Write-Host " ✓" -ForegroundColor Green
} else {
    $errors += "✗ FIREBASE_PROJECT_ID not set or using placeholder"
    Write-Host " ✗" -ForegroundColor Red
}

# Check Gemini API
Write-Host "  Gemini API..." -NoNewline
$geminiKey = $env:GEMINI_API_KEY
if ($geminiKey -and $geminiKey -ne "your-gemini-api-key") {
    $success += "✓ Gemini API key configured"
    Write-Host " ✓" -ForegroundColor Green
} else {
    $warnings += "⚠ GEMINI_API_KEY not set (required for video generation)"
    Write-Host " ⚠" -ForegroundColor Yellow
}

# Check RunPod (optional)
Write-Host "  RunPod API..." -NoNewline
$runpodKey = $env:RUNPOD_API_KEY
if ($runpodKey -and $runpodKey -ne "your-key") {
    $success += "✓ RunPod API key configured (optional)"
    Write-Host " ✓" -ForegroundColor Green
} else {
    $warnings += "⚠ RUNPOD_API_KEY not set (optional - for cloud scaling)"
    Write-Host " ⚠" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking service dependencies..." -ForegroundColor Yellow

# Check Node.js
Write-Host "  Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    $success += "✓ Node.js installed: $nodeVersion"
    Write-Host " ✓ $nodeVersion" -ForegroundColor Green
} catch {
    $errors += "✗ Node.js not installed"
    Write-Host " ✗" -ForegroundColor Red
}

# Check npm
Write-Host "  npm..." -NoNewline
try {
    $npmVersion = npm --version
    $success += "✓ npm installed: v$npmVersion"
    Write-Host " ✓ v$npmVersion" -ForegroundColor Green
} catch {
    $errors += "✗ npm not installed"
    Write-Host " ✗" -ForegroundColor Red
}

# Check if node_modules exist
Write-Host "  Backend dependencies..." -NoNewline
if (Test-Path "comfyui-service\node_modules") {
    $success += "✓ Backend dependencies installed"
    Write-Host " ✓" -ForegroundColor Green
} else {
    $warnings += "⚠ Backend dependencies not installed (run: cd comfyui-service; npm install)"
    Write-Host " ⚠" -ForegroundColor Yellow
}

Write-Host "  Frontend dependencies..." -NoNewline
if (Test-Path "node_modules") {
    $success += "✓ Frontend dependencies installed"
    Write-Host " ✓" -ForegroundColor Green
} else {
    $warnings += "⚠ Frontend dependencies not installed (run: npm install)"
    Write-Host " ⚠" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing service connectivity..." -ForegroundColor Yellow

# Test Redis connection (if redis-cli available)
Write-Host "  Redis connection..." -NoNewline
try {
    if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
        $redisTest = redis-cli ping 2>&1
        if ($redisTest -match "PONG") {
            $success += "✓ Redis server responding"
            Write-Host " ✓ PONG" -ForegroundColor Green
        } else {
            $warnings += "⚠ Redis server not responding (is it running?)"
            Write-Host " ⚠" -ForegroundColor Yellow
        }
    } else {
        $warnings += "⚠ redis-cli not available (install Redis to test connection)"
        Write-Host " ⚠ (redis-cli not installed)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "⚠ Could not test Redis connection"
    Write-Host " ⚠" -ForegroundColor Yellow
}

# Test ComfyUI service (if running)
Write-Host "  ComfyUI service..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $success += "✓ ComfyUI service is running"
        Write-Host " ✓ Running on port 8000" -ForegroundColor Green
    }
} catch {
    $warnings += "⚠ ComfyUI service not running (start with: cd comfyui-service; npm start)"
    Write-Host " ⚠ Not running" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         SUMMARY                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($success.Count -gt 0) {
    Write-Host "✓ SUCCESS ($($success.Count))" -ForegroundColor Green
    $success | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠ WARNINGS ($($warnings.Count))" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "✗ ERRORS ($($errors.Count))" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host ""
}

# Overall status
Write-Host "Overall Status: " -NoNewline
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "READY FOR TESTING ✓" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start Redis: redis-server" -ForegroundColor White
    Write-Host "  2. Start backend: cd comfyui-service; npm start" -ForegroundColor White
    Write-Host "  3. Start frontend: npm run dev" -ForegroundColor White
    Write-Host "  4. Open: http://localhost:5173" -ForegroundColor White
} elseif ($errors.Count -eq 0) {
    Write-Host "MOSTLY READY (some warnings) ⚠" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Review warnings above and fix if needed." -ForegroundColor Yellow
} else {
    Write-Host "NOT READY (errors found) ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix errors above before proceeding." -ForegroundColor Red
    Write-Host "See: NEXT_STEPS_INFRASTRUCTURE.md for setup instructions" -ForegroundColor Yellow
}

Write-Host ""
