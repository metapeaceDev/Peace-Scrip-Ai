# Download InstantID Models for ComfyUI
# Required models for InstantID face-preserving image generation

Write-Host "Installing InstantID Models..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$COMFYUI_ROOT = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI"
$CONTROLNET_DIR = Join-Path $COMFYUI_ROOT "models\controlnet"
$INSTANTID_DIR = Join-Path $COMFYUI_ROOT "models\instantid"

# Models to download
$models = @(
    @{
        name = "InstantID ControlNet"
        url = "https://huggingface.co/InstantX/InstantID/resolve/main/ControlNetModel/diffusion_pytorch_model.safetensors"
        output = Join-Path $CONTROLNET_DIR "instantid_controlnet.safetensors"
        size = "~500 MB"
        required = $true
    },
    @{
        name = "InstantID IP-Adapter"
        url = "https://huggingface.co/InstantX/InstantID/resolve/main/ip-adapter.bin"
        output = Join-Path $INSTANTID_DIR "ip-adapter.bin"
        size = "~1.6 GB"
        required = $true
    }
)

# Check if directories exist
if (!(Test-Path $COMFYUI_ROOT)) {
    Write-Host "ERROR: ComfyUI directory not found: $COMFYUI_ROOT" -ForegroundColor Red
    Write-Host "Please verify your ComfyUI installation path." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create directories if needed
if (!(Test-Path $CONTROLNET_DIR)) {
    Write-Host "Creating directory: $CONTROLNET_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $CONTROLNET_DIR -Force | Out-Null
}

if (!(Test-Path $INSTANTID_DIR)) {
    Write-Host "Creating directory: $INSTANTID_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $INSTANTID_DIR -Force | Out-Null
}

Write-Host "Installation directories ready" -ForegroundColor Green
Write-Host ""

# Download each model
$downloaded = 0
$skipped = 0
$failed = 0

foreach ($model in $models) {
    $filename = Split-Path $model.output -Leaf
    
    Write-Host "Downloading: $($model.name) ($($model.size))..." -ForegroundColor Cyan
    Write-Host "  URL: $($model.url)" -ForegroundColor Gray
    Write-Host "  Output: $($model.output)" -ForegroundColor Gray

    if (Test-Path $model.output) {
        $existingFile = Get-Item $model.output
        $existingSizeMB = [math]::Round($existingFile.Length / 1MB, 2)
        Write-Host "  Existing file: $existingSizeMB MB" -ForegroundColor Yellow
        
        # Check if file looks complete (not 0 bytes or too small)
        if ($existingFile.Length -lt 100MB) {
            Write-Host "  File appears incomplete or corrupted - will re-download" -ForegroundColor Red
            Remove-Item $model.output -Force
        } else {
            Write-Host "  File exists and appears complete - skipping" -ForegroundColor Gray
            $skipped++
            Write-Host ""
            continue
        }
    }

    try {
        # Download with progress
        $startTime = Get-Date
        Invoke-WebRequest -Uri $model.url -OutFile $model.output -UseBasicParsing -ErrorAction Stop
        
        if (Test-Path $model.output) {
            $downloadedFile = Get-Item $model.output
            $downloadedSizeMB = [math]::Round($downloadedFile.Length / 1MB, 2)
            $elapsedTime = ((Get-Date) - $startTime).TotalMinutes
            
            Write-Host "  Downloaded successfully: $downloadedSizeMB MB" -ForegroundColor Green
            Write-Host "  Time: $([math]::Round($elapsedTime, 1)) minutes" -ForegroundColor Gray
            $downloaded++
        } else {
            Write-Host "  Download failed (file not found after download)" -ForegroundColor Red
            $failed++
        }
    }
    catch {
        Write-Host "  Download failed: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

# Summary
Write-Host "============================================" -ForegroundColor Gray
Write-Host "Installation Summary:" -ForegroundColor Cyan
Write-Host "  Downloaded: $downloaded models" -ForegroundColor Green
Write-Host "  Skipped (already exist): $skipped models" -ForegroundColor Gray
if ($failed -gt 0) {
    Write-Host "  Failed: $failed models" -ForegroundColor Red
}
Write-Host ""

if ($failed -eq 0 -and ($downloaded + $skipped) -eq $models.Count) {
    Write-Host "SUCCESS: All InstantID models installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart ComfyUI (if running)" -ForegroundColor White
    Write-Host "  2. Restart backend service" -ForegroundColor White
    Write-Host "  3. Try Face ID generation again" -ForegroundColor White
    Write-Host ""
} elseif ($failed -gt 0) {
    Write-Host "WARNING: Some models failed to download." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative download methods:" -ForegroundColor Yellow
    Write-Host "1. Use browser to download manually" -ForegroundColor White
    Write-Host "2. Visit: https://huggingface.co/InstantX/InstantID" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "SUCCESS: Installation complete (all models already existed)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Write-Host "Model Locations:" -ForegroundColor Cyan
Write-Host "  ControlNet: $CONTROLNET_DIR" -ForegroundColor Gray
Write-Host "  IP-Adapter: $INSTANTID_DIR" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
