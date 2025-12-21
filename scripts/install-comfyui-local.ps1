<#
.SYNOPSIS
    One-Click ComfyUI Installer for Peace Script AI (Windows)
    
.DESCRIPTION
    Automatically installs ComfyUI with all required models and dependencies.
    Optimized for NVIDIA GPUs with CUDA support.
    
.FEATURES
    - GPU detection (NVIDIA/AMD/CPU)
    - ComfyUI portable download (~500MB)
    - Model auto-download (~20GB)
    - Python environment setup
    - Service registration (optional)
    - Automatic startup
    
.PARAMETER InstallPath
    Installation directory (default: $env:USERPROFILE\ComfyUI)
    
.PARAMETER SkipModels
    Skip model downloads (for testing)
    
.PARAMETER RegisterService
    Register as Windows Service (requires admin)
    
.PARAMETER MinimalModels
    Download minimal models only (~5GB)
    
.EXAMPLE
    .\install-comfyui-local.ps1
    
.EXAMPLE
    .\install-comfyui-local.ps1 -InstallPath "D:\AI\ComfyUI" -RegisterService
    
.EXAMPLE
    .\install-comfyui-local.ps1 -MinimalModels
#>

param(
    [string]$InstallPath = "$env:USERPROFILE\ComfyUI",
    [switch]$SkipModels = $false,
    [switch]$RegisterService = $false,
    [switch]$MinimalModels = $false
)

# Requires PowerShell 5.1+
#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue' # Faster downloads

# ============================================================================
# Configuration
# ============================================================================

$COMFYUI_VERSION = "latest"
$COMFYUI_PORTABLE_URL = "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z"
$REQUIRED_SPACE_GB = 25
$MIN_SPACE_GB = 10

# Model URLs
$MODELS = @{
    # AnimateDiff (~5GB)
    AnimateDiff = @{
        Url = "https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt"
        Path = "models\animatediff_models"
        Size = "5GB"
        Required = $true
    }
    
    # Stable Diffusion 1.5 (~4GB)
    SD15 = @{
        Url = "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors"
        Path = "models\checkpoints"
        Size = "4GB"
        Required = $true
    }
    
    # FLUX.1-schnell (~8GB)
    FLUX = @{
        Url = "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
        Path = "models\checkpoints"
        Size = "8GB"
        Required = $false # Optional for minimal install
    }
    
    # VAE (~350MB)
    VAE = @{
        Url = "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"
        Path = "models\vae"
        Size = "350MB"
        Required = $true
    }
    
    # LoRA: Character Consistency (~150MB)
    LoRA_Character = @{
        Url = "https://civitai.com/api/download/models/123456" # Placeholder - update with real URL
        Path = "models\loras"
        Size = "150MB"
        Required = $false
    }
}

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Text" -ForegroundColor Cyan -NoNewline
    $padding = 61 - $Text.Length
    Write-Host (" " * $padding) -NoNewline
    Write-Host "║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "`n▶ $Text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-GPUInfo {
    try {
        $gpu = Get-WmiObject Win32_VideoController | Select-Object -First 1
        
        $gpuType = "unknown"
        $gpuName = $gpu.Name
        
        if ($gpuName -match "NVIDIA") {
            $gpuType = "nvidia"
            
            # Try to get VRAM size
            try {
                $vram = [math]::Round($gpu.AdapterRAM / 1GB, 1)
                if ($vram -lt 1) {
                    # Try dedicated video memory
                    $vram = [math]::Round($gpu.AdapterRAM / 1MB / 1024, 1)
                }
            } catch {
                $vram = "Unknown"
            }
        } elseif ($gpuName -match "AMD") {
            $gpuType = "amd"
            $vram = "Unknown"
        } else {
            $gpuType = "cpu"
            $vram = "N/A"
        }
        
        return @{
            Type = $gpuType
            Name = $gpuName
            VRAM = $vram
        }
    } catch {
        return @{
            Type = "unknown"
            Name = "Unknown"
            VRAM = "Unknown"
        }
    }
}

function Get-AvailableSpace {
    param([string]$Path)
    
    $drive = Split-Path -Path $Path -Qualifier
    if (-not $drive) {
        $drive = (Get-Location).Drive.Name + ":"
    }
    
    $disk = Get-PSDrive -Name $drive.TrimEnd(':')
    return [math]::Round($disk.Free / 1GB, 2)
}

function Download-FileWithProgress {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$Description = "Downloading"
    )
    
    Write-Host "  📥 $Description..." -NoNewline
    
    try {
        # Use BITS transfer for resume capability
        Import-Module BitsTransfer -ErrorAction SilentlyContinue
        
        if (Get-Module BitsTransfer) {
            Start-BitsTransfer -Source $Url -Destination $OutputPath -Description $Description -ErrorAction Stop
        } else {
            # Fallback to WebClient
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($Url, $OutputPath)
        }
        
        Write-Host " ✅" -ForegroundColor Green
        return $true
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Error "Failed: $($_.Exception.Message)"
        return $false
    }
}

function Extract-7zip {
    param(
        [string]$ArchivePath,
        [string]$DestinationPath
    )
    
    Write-Host "  📂 Extracting archive..." -NoNewline
    
    # Check if 7-Zip is installed
    $7zipPaths = @(
        "$env:ProgramFiles\7-Zip\7z.exe",
        "$env:ProgramFiles(x86)\7-Zip\7z.exe",
        "$env:ProgramW6432\7-Zip\7z.exe"
    )
    
    $7zipExe = $null
    foreach ($path in $7zipPaths) {
        if (Test-Path $path) {
            $7zipExe = $path
            break
        }
    }
    
    if ($7zipExe) {
        & $7zipExe x $ArchivePath -o"$DestinationPath" -y | Out-Null
        Write-Host " ✅" -ForegroundColor Green
        return $true
    } else {
        Write-Host " ⚠️ 7-Zip not found" -ForegroundColor Yellow
        Write-Info "Installing 7-Zip via winget..."
        
        try {
            winget install --id 7zip.7zip --silent --accept-source-agreements --accept-package-agreements
            
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            # Try again
            $7zipExe = "$env:ProgramFiles\7-Zip\7z.exe"
            if (Test-Path $7zipExe) {
                & $7zipExe x $ArchivePath -o"$DestinationPath" -y | Out-Null
                Write-Success "7-Zip installed and archive extracted"
                return $true
            }
        } catch {
            Write-Error "Failed to install 7-Zip: $($_.Exception.Message)"
            Write-Info "Please install 7-Zip manually and run this script again"
            return $false
        }
    }
}

# ============================================================================
# Main Installation
# ============================================================================

Write-Header "🚀 Peace Script AI - ComfyUI Local Installer"

Write-Host "`nVersion: 1.0.0" -ForegroundColor Gray
Write-Host "Installation Path: $InstallPath" -ForegroundColor Gray

# Check administrator rights for service registration
if ($RegisterService -and -not (Test-Administrator)) {
    Write-Error "Service registration requires administrator privileges"
    Write-Info "Please run this script as Administrator or remove -RegisterService flag"
    exit 1
}

# Step 1: System Check
Write-Step "Step 1/7: System Requirements Check"

# Check GPU
$gpu = Get-GPUInfo
Write-Host "  GPU Type: " -NoNewline
switch ($gpu.Type) {
    "nvidia" { 
        Write-Host "$($gpu.Name) " -ForegroundColor Green -NoNewline
        Write-Host "($($gpu.VRAM) GB VRAM)" -ForegroundColor Gray
        Write-Success "NVIDIA GPU detected - CUDA support available"
    }
    "amd" { 
        Write-Host "$($gpu.Name)" -ForegroundColor Yellow
        Write-Host "  ⚠️  AMD GPU detected - May have limited support" -ForegroundColor Yellow
    }
    default { 
        Write-Host "$($gpu.Name)" -ForegroundColor Yellow
        Write-Host "  ⚠️  No dedicated GPU detected - Will use CPU mode (slower)" -ForegroundColor Yellow
    }
}

# Check disk space
$availableSpace = Get-AvailableSpace -Path $InstallPath
Write-Host "  Available Space: $availableSpace GB"

if ($availableSpace -lt $MIN_SPACE_GB) {
    Write-Error "Insufficient disk space. Need at least $MIN_SPACE_GB GB"
    exit 1
}

if ($availableSpace -lt $REQUIRED_SPACE_GB) {
    Write-Host "  ⚠️  Recommended space: $REQUIRED_SPACE_GB GB" -ForegroundColor Yellow
    Write-Host "  ⚠️  Some models may need to be downloaded later" -ForegroundColor Yellow
}

Write-Success "System requirements check passed"

# Step 2: Download ComfyUI
Write-Step "Step 2/7: Download ComfyUI Portable"

$tempDir = Join-Path $env:TEMP "ComfyUI-Installer"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

$downloadPath = Join-Path $tempDir "ComfyUI.7z"

if (Test-Path $downloadPath) {
    Write-Info "ComfyUI archive already downloaded, skipping..."
} else {
    Write-Info "Downloading ComfyUI portable (~500MB)..."
    Write-Host "  This may take 5-15 minutes depending on your internet speed"
    
    $downloaded = Download-FileWithProgress -Url $COMFYUI_PORTABLE_URL -OutputPath $downloadPath -Description "ComfyUI Portable"
    
    if (-not $downloaded) {
        Write-Error "Failed to download ComfyUI"
        exit 1
    }
}

Write-Success "ComfyUI downloaded successfully"

# Step 3: Extract ComfyUI
Write-Step "Step 3/7: Extract ComfyUI"

if (Test-Path $InstallPath) {
    Write-Info "Installation directory already exists"
    $overwrite = Read-Host "Overwrite existing installation? (y/N)"
    if ($overwrite -ne 'y') {
        Write-Info "Installation cancelled"
        exit 0
    }
    Remove-Item -Path $InstallPath -Recurse -Force
}

New-Item -ItemType Directory -Path $InstallPath | Out-Null

$extracted = Extract-7zip -ArchivePath $downloadPath -DestinationPath $InstallPath

if (-not $extracted) {
    Write-Error "Failed to extract ComfyUI"
    exit 1
}

Write-Success "ComfyUI extracted to $InstallPath"

# Step 4: Download Models
Write-Step "Step 4/7: Download AI Models"

if ($SkipModels) {
    Write-Info "Skipping model downloads (--SkipModels flag)"
} else {
    $totalSize = 0
    $modelList = @()
    
    # Determine which models to download
    foreach ($modelName in $MODELS.Keys) {
        $model = $MODELS[$modelName]
        $shouldDownload = $model.Required -or (-not $MinimalModels)
        
        if ($shouldDownload) {
            $modelList += $modelName
            $sizeGB = [regex]::Match($model.Size, '\d+').Value
            $totalSize += [int]$sizeGB
        }
    }
    
    Write-Info "Total download size: ~$totalSize GB"
    Write-Info "Models to download: $($modelList -join ', ')"
    Write-Host ""
    
    $modelDir = Join-Path $InstallPath "ComfyUI"
    
    foreach ($modelName in $modelList) {
        $model = $MODELS[$modelName]
        $modelPath = Join-Path $modelDir $model.Path
        
        if (-not (Test-Path $modelPath)) {
            New-Item -ItemType Directory -Path $modelPath -Force | Out-Null
        }
        
        $fileName = Split-Path -Leaf $model.Url
        $outputPath = Join-Path $modelPath $fileName
        
        if (Test-Path $outputPath) {
            Write-Info "  ✓ $modelName already downloaded"
            continue
        }
        
        Write-Host "  📦 Downloading $modelName ($($model.Size))..."
        
        try {
            # Use aria2c for faster downloads if available
            $aria2c = Get-Command aria2c -ErrorAction SilentlyContinue
            
            if ($aria2c) {
                & aria2c -x 16 -s 16 -k 1M --file-allocation=none --summary-interval=0 `
                    -d (Split-Path $outputPath) -o (Split-Path -Leaf $outputPath) $model.Url 2>&1 | Out-Null
            } else {
                $downloaded = Download-FileWithProgress -Url $model.Url -OutputPath $outputPath -Description $modelName
                if (-not $downloaded) {
                    Write-Host "    ⚠️  Skipping $modelName - download failed" -ForegroundColor Yellow
                    continue
                }
            }
            
            Write-Success "  $modelName downloaded"
        } catch {
            Write-Host "    ⚠️  Error downloading $modelName : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Success "Model downloads complete"
}

# Step 5: Configure ComfyUI
Write-Step "Step 5/7: Configure ComfyUI"

$comfyUIPath = Join-Path $InstallPath "ComfyUI"

# Create config file
$configPath = Join-Path $comfyUIPath "extra_model_paths.yaml"
$configContent = @"
# Peace Script AI - ComfyUI Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

peace_script:
    base_path: $comfyUIPath\
    checkpoints: models\checkpoints\
    vae: models\vae\
    loras: models\loras\
    animatediff: models\animatediff_models\
"@

Set-Content -Path $configPath -Value $configContent -Encoding UTF8
Write-Success "Configuration file created"

# Step 6: Create Startup Scripts
Write-Step "Step 6/7: Create Startup Scripts"

# Create run script based on GPU type
$runScriptContent = @"
@echo off
cd /d "$comfyUIPath"
echo 🚀 Starting ComfyUI for Peace Script AI...
echo.

"@

if ($gpu.Type -eq "nvidia") {
    $runScriptContent += @"
echo ✅ NVIDIA GPU detected
echo Starting with CUDA acceleration...
python_embeded\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --port 8188
"@
} elseif ($gpu.Type -eq "amd") {
    $runScriptContent += @"
echo ✅ AMD GPU detected
echo Starting with DirectML...
python_embeded\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --port 8188 --directml
"@
} else {
    $runScriptContent += @"
echo ⚠️  No GPU detected, using CPU mode
echo Note: CPU mode is significantly slower
python_embeded\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --port 8188 --cpu
"@
}

$runScriptContent += @"

pause
"@

$runScriptPath = Join-Path $InstallPath "Start-ComfyUI.bat"
Set-Content -Path $runScriptPath -Value $runScriptContent -Encoding ASCII

Write-Success "Startup script created: Start-ComfyUI.bat"

# Create desktop shortcut
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcutPath = Join-Path $env:USERPROFILE "Desktop\ComfyUI - Peace Script AI.lnk"
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $runScriptPath
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.IconLocation = "powershell.exe"
    $Shortcut.Description = "Start ComfyUI for Peace Script AI"
    $Shortcut.Save()
    
    Write-Success "Desktop shortcut created"
} catch {
    Write-Host "  ⚠️  Could not create desktop shortcut: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 7: Service Registration (Optional)
if ($RegisterService) {
    Write-Step "Step 7/7: Register Windows Service"
    
    # Check for NSSM (Non-Sucking Service Manager)
    $nssmPath = "$env:ProgramFiles\nssm\nssm.exe"
    
    if (-not (Test-Path $nssmPath)) {
        Write-Info "Installing NSSM (Service Manager)..."
        
        try {
            winget install --id NSSM.NSSM --silent --accept-source-agreements --accept-package-agreements
            $nssmPath = "$env:ProgramFiles\nssm\win64\nssm.exe"
        } catch {
            Write-Host "  ⚠️  Could not install NSSM automatically" -ForegroundColor Yellow
            Write-Info "You can install it manually from: https://nssm.cc/download"
        }
    }
    
    if (Test-Path $nssmPath) {
        $serviceName = "ComfyUI-PeaceScript"
        
        # Remove existing service if it exists
        $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($existingService) {
            Write-Info "Removing existing service..."
            & $nssmPath stop $serviceName
            & $nssmPath remove $serviceName confirm
        }
        
        Write-Info "Registering service..."
        
        # Install service
        & $nssmPath install $serviceName $runScriptPath
        & $nssmPath set $serviceName AppDirectory $comfyUIPath
        & $nssmPath set $serviceName DisplayName "ComfyUI - Peace Script AI"
        & $nssmPath set $serviceName Description "ComfyUI image generation service for Peace Script AI"
        & $nssmPath set $serviceName Start SERVICE_AUTO_START
        & $nssmPath set $serviceName AppStdout (Join-Path $InstallPath "logs\service.log")
        & $nssmPath set $serviceName AppStderr (Join-Path $InstallPath "logs\service-error.log")
        
        # Create logs directory
        $logsDir = Join-Path $InstallPath "logs"
        if (-not (Test-Path $logsDir)) {
            New-Item -ItemType Directory -Path $logsDir | Out-Null
        }
        
        # Start service
        Start-Service -Name $serviceName
        
        Write-Success "Service registered and started"
        Write-Info "Service name: $serviceName"
        Write-Info "ComfyUI will start automatically on system boot"
    }
} else {
    Write-Step "Step 7/7: Service Registration (Skipped)"
    Write-Info "To register as a Windows Service, run with -RegisterService flag"
}

# Final Steps
Write-Step "Installation Complete!"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    ✅ Installation Successful!                ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📦 Installation Summary:" -ForegroundColor Cyan
Write-Host "   Location: $InstallPath"
Write-Host "   GPU: $($gpu.Name)"
Write-Host "   Models: $(if ($SkipModels) { 'Skipped' } else { 'Downloaded' })"
Write-Host ""

Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Start ComfyUI:"
Write-Host "      → Double-click 'ComfyUI - Peace Script AI' on your Desktop"
Write-Host "      → Or run: $runScriptPath"
Write-Host ""
Write-Host "   2. Wait for ComfyUI to start (~30 seconds)"
Write-Host ""
Write-Host "   3. ComfyUI will be available at:"
Write-Host "      → http://localhost:8188" -ForegroundColor Cyan
Write-Host ""
Write-Host "   4. Return to Peace Script AI and start generating!" -ForegroundColor Green
Write-Host ""

if ($RegisterService) {
    Write-Host "   ℹ️  ComfyUI service is running and will start automatically on boot" -ForegroundColor Cyan
} else {
    Write-Host "   💡 Tip: Run with -RegisterService to start ComfyUI automatically on boot" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Gray
Write-Host "   → COMFYUI_HYBRID_ARCHITECTURE.md"
Write-Host "   → COMFYUI_CLOUD_IMPLEMENTATION.md"
Write-Host ""

# Clean up
Write-Info "Cleaning up temporary files..."
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "🎉 All done! Enjoy using Peace Script AI with local ComfyUI!" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start ComfyUI now
if (-not $RegisterService) {
    $startNow = Read-Host "Start ComfyUI now? (Y/n)"
    if ($startNow -eq '' -or $startNow -eq 'y' -or $startNow -eq 'Y') {
        Write-Info "Starting ComfyUI..."
        Start-Process -FilePath $runScriptPath
    }
}

