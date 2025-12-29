# ComfyUI Startup Script for WAN POC Testing
# Robust startup with error handling and verification

param(
    [int]$Port = 8189,
    [string]$Listen = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  ComfyUI WAN POC Startup Script" -ForegroundColor White
Write-Host "===============================================`n" -ForegroundColor Cyan

# Step 1: Check Python
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Check ComfyUI directory
Write-Host "`n[2/6] Checking ComfyUI directory..." -ForegroundColor Yellow
$comfyPath = "C:\Users\USER\ComfyUI"
if (Test-Path $comfyPath) {
    Write-Host "  ✓ ComfyUI found at: $comfyPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ ComfyUI not found at: $comfyPath" -ForegroundColor Red
    exit 1
}

# Step 3: Check WAN models
Write-Host "`n[3/6] Checking WAN models..." -ForegroundColor Yellow
$modelsPath = "$comfyPath\models\diffusion_models\wan-video-comfy"
if (Test-Path $modelsPath) {
    $fileCount = (Get-ChildItem $modelsPath -File -Recurse | Measure-Object).Count
    $dirCount = (Get-ChildItem $modelsPath -Directory | Measure-Object).Count
    Write-Host "  ✓ WAN models found: $fileCount files in $dirCount directories" -ForegroundColor Green
} else {
    Write-Host "  ✗ WAN models not found at: $modelsPath" -ForegroundColor Red
    Write-Host "  Run download_wan_curated_v2.py first!" -ForegroundColor Yellow
    exit 1
}

# Step 4: Check if port is in use
Write-Host "`n[4/6] Checking port $Port..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "  ⚠ Port $Port is in use. Stopping process..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "    Stopping PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 3
    Write-Host "  ✓ Port $Port cleared" -ForegroundColor Green
} else {
    Write-Host "  ✓ Port $Port available" -ForegroundColor Green
}

# Step 5: Check WAN wrapper
Write-Host "`n[5/6] Checking WAN wrapper..." -ForegroundColor Yellow
$wanWrapperPath = "$comfyPath\custom_nodes\ComfyUI-WanVideoWrapper"
$wanWrapperDisabledPath = "$comfyPath\custom_nodes\ComfyUI-WanVideoWrapper.disabled"

if (-not (Test-Path $wanWrapperPath) -and (Test-Path $wanWrapperDisabledPath)) {
    Write-Host "  ⚠ WAN wrapper is disabled. Enabling now..." -ForegroundColor Yellow
    try {
        Rename-Item -Path $wanWrapperDisabledPath -NewName "ComfyUI-WanVideoWrapper" -ErrorAction Stop
        Write-Host "  ✓ WAN wrapper enabled" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to enable WAN wrapper: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "    You can try manually: Rename-Item '$wanWrapperDisabledPath' 'ComfyUI-WanVideoWrapper'" -ForegroundColor Gray
    }
}

if (Test-Path $wanWrapperPath) {
    Write-Host "  ✓ WAN wrapper installed" -ForegroundColor Green
} elseif (Test-Path $wanWrapperDisabledPath) {
    Write-Host "  ⚠ WAN wrapper still disabled at: $wanWrapperDisabledPath" -ForegroundColor Yellow
} else {
    Write-Host "  ⚠ WAN wrapper not found (may need manual install)" -ForegroundColor Yellow
}

# Step 6: Start ComfyUI
Write-Host "`n[6/6] Starting ComfyUI..." -ForegroundColor Yellow
Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host "  Listen: $Listen" -ForegroundColor White
Write-Host "  URL: http://${Listen}:${Port}" -ForegroundColor White
Write-Host "`nStartup Tips:" -ForegroundColor Cyan
Write-Host "  - First load may take 30-60 seconds (model compilation)" -ForegroundColor Gray
Write-Host "  - Watch for 'WAN' or 'Wanx' in node list after startup" -ForegroundColor Gray
Write-Host "  - sm_120 warning is EXPECTED (RTX 5090) and OK" -ForegroundColor Gray
Write-Host "  - Press Ctrl+C to stop ComfyUI" -ForegroundColor Gray
Write-Host "`nStarting in 3 seconds...`n" -ForegroundColor Yellow

Start-Sleep -Seconds 3

Set-Location $comfyPath

Write-Host "===============================================" -ForegroundColor Green
Write-Host "  ComfyUI Starting - Monitor Output Below" -ForegroundColor White
Write-Host "===============================================`n" -ForegroundColor Green

# Start ComfyUI with environment variable for CUDA
$env:PYTORCH_CUDA_ALLOC_CONF = 'max_split_size_mb:512'
python main.py --port $Port --listen $Listen

# This will only run if ComfyUI exits
Write-Host "`n`nComfyUI stopped." -ForegroundColor Yellow
Write-Host "To restart, run: .\start-comfyui-wan.ps1" -ForegroundColor Cyan
