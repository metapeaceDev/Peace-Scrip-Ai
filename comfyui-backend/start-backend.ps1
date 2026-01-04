# ===============================================================
# ComfyUI Backend API Startup Script (Windows)
# ===============================================================

Write-Host "`n===============================================================" -ForegroundColor Cyan
Write-Host "      ComfyUI Backend API - Peace Script AI" -ForegroundColor Green
Write-Host "===============================================================`n" -ForegroundColor Cyan

# Change to backend directory
$backendPath = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-backend"
Set-Location $backendPath

Write-Host "[*] Working Directory: $backendPath" -ForegroundColor Gray
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "[*] Loading environment variables from .env..." -ForegroundColor Yellow
    
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Set environment variable for current session
            Set-Item -Path "Env:$key" -Value $value
            
            Write-Host "   $key = $value" -ForegroundColor Gray
        }
    }
    
    Write-Host "[OK] Environment variables loaded" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[WARN] .env file not found - using defaults" -ForegroundColor Yellow
    Write-Host ""
}

# Display configuration
Write-Host "[*] Server Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $(if ($env:HOST) { $env:HOST } else { '0.0.0.0' })" -ForegroundColor Gray
Write-Host "   Port: $(if ($env:PORT) { $env:PORT } else { '8000' })" -ForegroundColor Gray
Write-Host "   ComfyUI Path: $(if ($env:COMFYUI_PATH) { $env:COMFYUI_PATH } else { 'C:/ComfyUI/ComfyUI_windows_portable/ComfyUI' })" -ForegroundColor Gray
Write-Host "   Max Jobs: $(if ($env:MAX_CONCURRENT_JOBS) { $env:MAX_CONCURRENT_JOBS } else { '2' })" -ForegroundColor Gray
Write-Host ""

# Verify ComfyUI installation
$comfyPath = if ($env:COMFYUI_PATH) { $env:COMFYUI_PATH } else { "C:/ComfyUI/ComfyUI_windows_portable/ComfyUI" }
$comfyPathWin = $comfyPath -replace '/', '\'

if (Test-Path $comfyPathWin) {
    Write-Host "[OK] ComfyUI found at: $comfyPathWin" -ForegroundColor Green
} else {
    Write-Host "[WARN] ComfyUI not found at: $comfyPathWin" -ForegroundColor Yellow
    Write-Host "   Video generation may not work properly" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[*] Starting FastAPI server..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "`n===============================================================`n" -ForegroundColor Cyan

# Start the server
python main.py

# If server exits, show message
Write-Host "`n===============================================================" -ForegroundColor Red
Write-Host "      Server Stopped" -ForegroundColor Yellow
Write-Host "===============================================================`n" -ForegroundColor Red

# Keep window open
Read-Host "Press Enter to exit"
