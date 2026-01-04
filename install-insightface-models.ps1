# Install InsightFace antelopev2 models for InstantID Face Analysis
# These models are required for Face ID generation with InstantID

Write-Host "Installing InsightFace antelopev2 models..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$INSIGHTFACE_ROOT = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\insightface"
$ANTELOPE_DIR = Join-Path $INSIGHTFACE_ROOT "models\antelopev2"
$BASE_URL = "https://huggingface.co/MonsterMMORPG/tools/resolve/main"

# Models to download
$models = @(
    @{ name = "1k3d68.onnx"; size = "5.03 MB" },
    @{ name = "2d106det.onnx"; size = "5.03 MB" },
    @{ name = "genderage.onnx"; size = "1.32 MB" },
    @{ name = "glintr100.onnx"; size = "260 MB" },
    @{ name = "scrfd_10g_bnkps.onnx"; size = "16.9 MB" }
)

# Check if directory exists
if (!(Test-Path $INSIGHTFACE_ROOT)) {
    Write-Host "ERROR: ComfyUI insightface directory not found: $INSIGHTFACE_ROOT" -ForegroundColor Red
    Write-Host "Please verify your ComfyUI installation path." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create antelopev2 directory if needed
if (!(Test-Path $ANTELOPE_DIR)) {
    Write-Host "Creating directory: $ANTELOPE_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ANTELOPE_DIR -Force | Out-Null
}

Write-Host "Installation directory: $ANTELOPE_DIR" -ForegroundColor Green
Write-Host ""

# Download each model
$downloaded = 0
$skipped = 0
$failed = 0

foreach ($model in $models) {
    $filename = $model.name
    $filepath = Join-Path $ANTELOPE_DIR $filename
    $url = "$BASE_URL/$filename"

    Write-Host "Downloading: $filename ($($model.size))..." -ForegroundColor Cyan

    if (Test-Path $filepath) {
        Write-Host "  Already exists, skipping..." -ForegroundColor Gray
        $skipped++
        continue
    }

    try {
        # Download with progress
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri $url -OutFile $filepath -ErrorAction Stop
        $ProgressPreference = "Continue"
        
        if (Test-Path $filepath) {
            $fileSize = (Get-Item $filepath).Length / 1MB
            Write-Host "  Downloaded successfully ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
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
    Write-Host "SUCCESS: All InsightFace models installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart ComfyUI backend service" -ForegroundColor White
    Write-Host "  2. Try Face ID generation again" -ForegroundColor White
    Write-Host ""
} elseif ($failed -gt 0) {
    Write-Host "WARNING: Some models failed to download. Please:" -ForegroundColor Yellow
    Write-Host "  1. Check your internet connection" -ForegroundColor White
    Write-Host "  2. Run this script again" -ForegroundColor White
    Write-Host "  3. Or download manually from:" -ForegroundColor White
    Write-Host "     https://huggingface.co/MonsterMMORPG/tools/tree/main" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "SUCCESS: Installation complete (all models already existed)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
