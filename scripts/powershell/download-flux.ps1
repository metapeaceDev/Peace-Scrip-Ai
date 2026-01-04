# ============================================================================
# FLUX.1-dev Model Downloader for ComfyUI
# ============================================================================
# Downloads FLUX.1-dev model automatically from Hugging Face
# Target: C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\checkpoints\
# Model Size: ~23GB
# ============================================================================

param(
    [string]$ComfyUIPath = "C:\ComfyUI\ComfyUI_windows_portable",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$ModelName = "flux_dev.safetensors"
$ModelURL = "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors"
$ModelSize = 23.8 # GB (approximate)
$CheckpointsDir = Join-Path $ComfyUIPath "ComfyUI\models\checkpoints"
$TargetPath = Join-Path $CheckpointsDir $ModelName

# Alternative mirrors (in case primary is slow)
$MirrorURLs = @(
    "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors",
    "https://hf-mirror.com/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors"
)

# ============================================================================
# Functions
# ============================================================================

function Write-Banner {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "     FLUX.1-dev Model Downloader for ComfyUI" -ForegroundColor Cyan
    Write-Host "================================================================`n" -ForegroundColor Cyan
}

function Test-Prerequisites {
    Write-Host "[*] Checking prerequisites..." -ForegroundColor Yellow
    
    # Check if ComfyUI directory exists
    if (-not (Test-Path $ComfyUIPath)) {
        Write-Host "[ERROR] ComfyUI not found at: $ComfyUIPath" -ForegroundColor Red
        Write-Host "        Please install ComfyUI first or specify correct path with -ComfyUIPath parameter" -ForegroundColor Yellow
        return $false
    }
    
    # Check if checkpoints directory exists, create if not
    if (-not (Test-Path $CheckpointsDir)) {
        Write-Host "[*] Creating checkpoints directory..." -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $CheckpointsDir -Force | Out-Null
    }
    
    # Check GPU
    Write-Host "[*] Checking GPU..." -ForegroundColor Cyan
    try {
        $gpuInfo = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
        if ($gpuInfo) {
            Write-Host "    [OK] GPU: $gpuInfo" -ForegroundColor Green
            
            # Check VRAM
            $vramMB = [int]($gpuInfo -split ',')[1].Trim() -replace ' MiB', ''
            $vramGB = [math]::Round($vramMB / 1024, 1)
            
            if ($vramGB -lt 12) {
                Write-Host "    [WARN] FLUX requires 12GB+ VRAM, you have ${vramGB}GB" -ForegroundColor Yellow
                Write-Host "           Consider using with --lowvram flag in ComfyUI" -ForegroundColor Yellow
            } else {
                Write-Host "    [OK] VRAM: ${vramGB}GB (Sufficient for FLUX)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "    [WARN] Could not detect GPU" -ForegroundColor Yellow
    }
    
    # Check available disk space
    $drive = Split-Path $CheckpointsDir -Qualifier
    $disk = Get-PSDrive $drive.TrimEnd(':')
    $freeSpaceGB = [math]::Round($disk.Free / 1GB, 2)
    
    Write-Host "[*] Free disk space on ${drive}: ${freeSpaceGB}GB" -ForegroundColor Cyan
    
    if ($freeSpaceGB -lt ($ModelSize + 5)) {
        Write-Host "    [ERROR] Insufficient disk space. Need at least $([math]::Ceiling($ModelSize + 5))GB free" -ForegroundColor Red
        return $false
    }
    
    Write-Host "    [OK] Sufficient disk space available" -ForegroundColor Green
    
    return $true
}

function Test-ExistingModel {
    if (Test-Path $TargetPath) {
        $fileSize = (Get-Item $TargetPath).Length / 1GB
        Write-Host "`n[OK] FLUX model already exists!" -ForegroundColor Green
        Write-Host "     Location: $TargetPath" -ForegroundColor White
        Write-Host "     Size: $([math]::Round($fileSize, 2))GB" -ForegroundColor White
        
        if (-not $Force) {
            Write-Host "`n[INFO] Model already exists. Use -Force to re-download" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "`n[WARN] -Force specified, will re-download..." -ForegroundColor Yellow
            return $false
        }
    }
    return $false
}

function Download-WithProgress {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    Write-Host "`n[*] Downloading FLUX.1-dev model..." -ForegroundColor Cyan
    Write-Host "    Source: $Url" -ForegroundColor Gray
    Write-Host "    Target: $OutputPath" -ForegroundColor Gray
    Write-Host "    Size: ~${ModelSize}GB (this will take 10-30 minutes)`n" -ForegroundColor Gray
    
    try {
        # Try using aria2c if available (much faster)
        $aria2c = Get-Command aria2c -ErrorAction SilentlyContinue
        if ($aria2c) {
            Write-Host "[*] Using aria2c for faster download..." -ForegroundColor Green
            $aria2cArgs = @(
                "--continue=true",
                "--max-connection-per-server=16",
                "--split=16",
                "--min-split-size=1M",
                "--file-allocation=none",
                "--summary-interval=5",
                "-d", (Split-Path $OutputPath -Parent),
                "-o", (Split-Path $OutputPath -Leaf),
                $Url
            )
            & aria2c @aria2cArgs
            
            if ($LASTEXITCODE -ne 0) {
                throw "aria2c download failed"
            }
        } else {
            # Fallback to PowerShell download with progress
            Write-Host "[*] Using PowerShell download (slower)..." -ForegroundColor Yellow
            Write-Host "    Tip: Install aria2c for 5-10x faster downloads" -ForegroundColor Gray
            Write-Host "    choco install aria2 or scoop install aria2`n" -ForegroundColor Gray
            
            # Simple download with basic progress
            $ProgressPreference = 'Continue'
            Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        }
        
        Write-Host "`n[OK] Download completed!" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "`n[ERROR] Download failed: $_" -ForegroundColor Red
        return $false
    }
}

function Verify-Download {
    param([string]$FilePath)
    
    Write-Host "`n[*] Verifying downloaded file..." -ForegroundColor Cyan
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "    [ERROR] File not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    $fileSize = (Get-Item $FilePath).Length / 1GB
    Write-Host "    [*] File size: $([math]::Round($fileSize, 2))GB" -ForegroundColor White
    
    # Check if file size is reasonable (should be around 23GB)
    if ($fileSize -lt 20 -or $fileSize -gt 30) {
        Write-Host "    [WARN] File size seems unusual (expected ~23GB)" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "    [OK] File size looks correct" -ForegroundColor Green
    return $true
}

function Show-NextSteps {
    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "           [OK] INSTALLATION COMPLETE" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    
    Write-Host "`n[*] Next Steps:" -ForegroundColor Cyan
    Write-Host "    1. Restart ComfyUI Server (if running)" -ForegroundColor White
    Write-Host "    2. The system will automatically use FLUX for image generation" -ForegroundColor White
    Write-Host "    3. FLUX provides highest quality character portraits" -ForegroundColor White
    
    Write-Host "`n[*] Model Location:" -ForegroundColor Cyan
    Write-Host "    $TargetPath" -ForegroundColor Gray
    
    Write-Host "`n[*] Model Info:" -ForegroundColor Cyan
    Write-Host "    * Name: FLUX.1-dev" -ForegroundColor White
    Write-Host "    * Quality: Highest (photorealistic)" -ForegroundColor White
    Write-Host "    * Best for: Character portraits, faces" -ForegroundColor White
    Write-Host "    * VRAM: 12GB+ recommended" -ForegroundColor White
    
    Write-Host "`n[*] Tips:" -ForegroundColor Yellow
    Write-Host "    * If you get VRAM errors, add --lowvram to ComfyUI launch" -ForegroundColor Gray
    Write-Host "    * First generation will be slower (model loading)" -ForegroundColor Gray
    Write-Host "    * Subsequent generations will be faster" -ForegroundColor Gray
    
    Write-Host ""
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Banner

# Check prerequisites
if (-not (Test-Prerequisites)) {
    Write-Host "`n[ERROR] Prerequisites check failed. Exiting..." -ForegroundColor Red
    exit 1
}

# Check if model already exists
if (Test-ExistingModel) {
    exit 0
}

# Confirm download
Write-Host "`n[*] Ready to download FLUX.1-dev model" -ForegroundColor Cyan
Write-Host "    Size: ~${ModelSize}GB" -ForegroundColor White
Write-Host "    Time: 10-30 minutes (depending on internet speed)" -ForegroundColor White
Write-Host "    Target: $TargetPath`n" -ForegroundColor White

$confirmation = Read-Host "Continue with download? (Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "`n[INFO] Download cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Try downloading from primary URL
$downloadSuccess = $false
$urlIndex = 0

foreach ($url in $MirrorURLs) {
    $urlIndex++
    Write-Host "`n[*] Attempt $urlIndex of $($MirrorURLs.Count)" -ForegroundColor Cyan
    
    $downloadSuccess = Download-WithProgress -Url $url -OutputPath $TargetPath
    
    if ($downloadSuccess) {
        break
    } else {
        Write-Host "[WARN] Mirror $urlIndex failed, trying next..." -ForegroundColor Yellow
        
        # Clean up partial download
        if (Test-Path $TargetPath) {
            Remove-Item $TargetPath -Force
        }
    }
}

if (-not $downloadSuccess) {
    Write-Host "`n[ERROR] All download mirrors failed" -ForegroundColor Red
    Write-Host "        Please try again later or download manually from:" -ForegroundColor Yellow
    Write-Host "        https://huggingface.co/black-forest-labs/FLUX.1-dev" -ForegroundColor Gray
    exit 1
}

# Verify download
if (-not (Verify-Download -FilePath $TargetPath)) {
    Write-Host "`n[WARN] Download verification failed" -ForegroundColor Yellow
    Write-Host "       File exists but may be corrupted" -ForegroundColor Yellow
    Write-Host "       You can try re-downloading with -Force parameter" -ForegroundColor Yellow
}

# Show completion message
Show-NextSteps

Write-Host "[OK] Done!`n" -ForegroundColor Green
