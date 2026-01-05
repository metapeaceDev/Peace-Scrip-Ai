<#
Download Kijai's converted WAN models for ComfyUI-WanVideoWrapper.

Notes:
- This script avoids emoji/unicode output because PowerShell 5.1 + PSReadLine may crash
    when it tries to write those characters to history on some systems.
- It downloads directly into ComfyUI's models folder.
#>

Write-Host "WAN Model Downloader for ComfyUI-WanVideoWrapper"
Write-Host "------------------------------------------------"

$MODELS_DIR = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\diffusion_models"

# Additional folders some WanVideoWrapper builds may scan
$CHECKPOINTS_DIR = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\checkpoints"
$WAN_SUBDIR = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\diffusion_models\wan-video-comfy"

# Create diffusion_models directory if it doesn't exist
if (!(Test-Path -LiteralPath $MODELS_DIR)) {
        Write-Host "Creating diffusion_models directory..."
        New-Item -ItemType Directory -Force -Path $MODELS_DIR | Out-Null
        Write-Host "Created: $MODELS_DIR"
}

foreach ($d in @($CHECKPOINTS_DIR, $WAN_SUBDIR)) {
    if (!(Test-Path -LiteralPath $d)) {
        try {
            New-Item -ItemType Directory -Force -Path $d | Out-Null
        } catch {
            # ignore
        }
    }
}

function New-WanModelLinks {
    param(
        [Parameter(Mandatory=$true)][string]$SourcePath,
        [Parameter(Mandatory=$true)][string[]]$TargetDirs
    )

    foreach ($targetDir in $TargetDirs) {
        try {
            if (!(Test-Path -LiteralPath $targetDir)) {
                New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
            }

            $dest = Join-Path $targetDir (Split-Path $SourcePath -Leaf)
            if (Test-Path -LiteralPath $dest) {
                continue
            }

            # Try hardlink (no admin required on NTFS)
            try {
                New-Item -ItemType HardLink -Path $dest -Target $SourcePath | Out-Null
            } catch {
                Copy-Item -LiteralPath $SourcePath -Destination $dest -Force
            }
        } catch {
            # ignore
        }
    }
}

Write-Host ""
Write-Host "Available WAN Models (Kijai/WanVideo_comfy):"
Write-Host "  1. Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors  (I2V FP8)"
Write-Host "  2. Wan2_1-T2V-14B_fp8_e4m3fn.safetensors        (T2V FP8)"
Write-Host "  3. Wan2_1-T2V-14B_fp16.safetensors              (T2V FP16, very large)"
Write-Host "  4. Phantom-Wan-14B_fp16.safetensors             (Phantom FP16, very large)"
Write-Host "  5. Wan2_1-FLF2V-14B-720P_fp16.safetensors        (FLF2V 720p FP16, very large)"

$choice = Read-Host "Enter choice (1-5) or Q to quit"

$modelUrl = ""
$modelName = ""

switch ($choice) {
    "1" {
        $modelUrl = "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors"
        $modelName = "Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors"
    }
    "2" {
        $modelUrl = "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-T2V-14B_fp8_e4m3fn.safetensors"
        $modelName = "Wan2_1-T2V-14B_fp8_e4m3fn.safetensors"
    }
    "3" {
        $modelUrl = "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-T2V-14B_fp16.safetensors"
        $modelName = "Wan2_1-T2V-14B_fp16.safetensors"
    }
    "4" {
        $modelUrl = "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Phantom-Wan-14B_fp16.safetensors"
        $modelName = "Phantom-Wan-14B_fp16.safetensors"
    }
    "5" {
        $modelUrl = "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-FLF2V-14B-720P_fp16.safetensors"
        $modelName = "Wan2_1-FLF2V-14B-720P_fp16.safetensors"
    }
    default {
        Write-Host "Cancelled or invalid choice"
        exit
    }
}

$outputPath = Join-Path $MODELS_DIR $modelName

Write-Host ""
Write-Host "Downloading: $modelName"
Write-Host "From: $modelUrl"
Write-Host "To: $outputPath"
Write-Host "This may take a while (large file)."

# Resolve python path (prefer a local venv if present)
$pythonCandidates = @(
    (Join-Path $PSScriptRoot ".venv\Scripts\python.exe"),
    (Join-Path (Split-Path $PSScriptRoot -Parent) ".venv\Scripts\python.exe"),
    "python"
)

$pythonPath = $null
foreach ($candidate in $pythonCandidates) {
    if ($candidate -eq "python") {
        $pythonPath = $candidate
        break
    }
    if (Test-Path -LiteralPath $candidate) {
        $pythonPath = $candidate
        break
    }
}

# Check if huggingface_hub is available
$hfCliAvailable = $false
try {
    & $pythonPath -c "import huggingface_hub" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $hfCliAvailable = $true
    }
} catch {
    $hfCliAvailable = $false
}

if ($hfCliAvailable) {
    Write-Host ""
    Write-Host "Using huggingface-cli (supports resume)"
    
    # Extract repo and filename from URL
    $repo = "Kijai/WanVideo_comfy"
    
    & $pythonPath -m huggingface_hub.commands.huggingface_cli download $repo $modelName `
        --local-dir $MODELS_DIR `
        --local-dir-use-symlinks False
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Download complete."
        Write-Host "Model saved to: $outputPath"

        New-WanModelLinks -SourcePath $outputPath -TargetDirs @($CHECKPOINTS_DIR, $WAN_SUBDIR)
    } else {
        Write-Host ""
        Write-Host "Download failed."
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "huggingface_hub not available via Python; using PowerShell download (slower, no resume)."
    Write-Host "Tip: install huggingface_hub with: pip install huggingface_hub[cli]"
    
    try {
        Invoke-WebRequest -Uri $modelUrl -OutFile $outputPath -UseBasicParsing
        Write-Host ""
        Write-Host "Download complete."
        Write-Host "Model saved to: $outputPath"

        New-WanModelLinks -SourcePath $outputPath -TargetDirs @($CHECKPOINTS_DIR, $WAN_SUBDIR)
    } catch {
        Write-Host ""
        Write-Host "Download failed: $_"
        exit 1
    }
}

Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host "  1) Restart ComfyUI to load the new model"
Write-Host "  2) Verify WanVideoModelLoader choices in ComfyUI (http://127.0.0.1:8188/object_info)"
Write-Host "  3) If WAN still fails with value_not_in_list, run: place-wan-models.cmd (from this repo)"
Write-Host "     Recommended (CMD, avoids PSReadLine):"
$placeCmd = Join-Path $PSScriptRoot 'place-wan-models.cmd'
Write-Host "       cmd /c \"$placeCmd\""
Write-Host "  4) Use this model name in code (no extension): $($modelName -replace '\.safetensors','')"
Write-Host "  5) Test video generation"
