# Download SD XL Base 1.0 Checkpoint
# This script downloads the complete SDXL checkpoint model

Write-Host "Downloading SD XL Base 1.0 Checkpoint..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$CHECKPOINT_DIR = "C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\checkpoints"
$CHECKPOINT_FILE = "sd_xl_base_1.0.safetensors"
$CHECKPOINT_PATH = Join-Path $CHECKPOINT_DIR $CHECKPOINT_FILE
$DOWNLOAD_URL = "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
$EXPECTED_SIZE_GB = 6.5

# Check if directory exists
if (!(Test-Path $CHECKPOINT_DIR)) {
    Write-Host "ERROR: ComfyUI checkpoints directory not found: $CHECKPOINT_DIR" -ForegroundColor Red
    Write-Host "Please verify your ComfyUI installation path." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if file exists and its size
if (Test-Path $CHECKPOINT_PATH) {
    $existingFile = Get-Item $CHECKPOINT_PATH
    $existingSizeGB = [math]::Round($existingFile.Length / 1GB, 2)
    
    Write-Host "Found existing file:" -ForegroundColor Yellow
    Write-Host "  Size: $existingSizeGB GB" -ForegroundColor Yellow
    Write-Host "  Expected: $EXPECTED_SIZE_GB GB" -ForegroundColor Yellow
    Write-Host ""
    
    if ($existingSizeGB -lt ($EXPECTED_SIZE_GB - 0.5)) {
        Write-Host "WARNING: File appears incomplete or corrupted!" -ForegroundColor Red
        Write-Host "Will delete and re-download..." -ForegroundColor Yellow
        Write-Host ""
        Remove-Item $CHECKPOINT_PATH -Force
    } else {
        Write-Host "File appears complete. Do you want to re-download? (y/N)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Keeping existing file. Exiting..." -ForegroundColor Gray
            Read-Host "Press Enter to exit"
            exit 0
        }
        Write-Host "Deleting existing file..." -ForegroundColor Yellow
        Remove-Item $CHECKPOINT_PATH -Force
    }
}

Write-Host "Starting download..." -ForegroundColor Cyan
Write-Host "URL: $DOWNLOAD_URL" -ForegroundColor Gray
Write-Host "Destination: $CHECKPOINT_PATH" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTE: This is a large file (~6.5 GB). Download may take 10-30 minutes." -ForegroundColor Yellow
Write-Host ""

try {
    # Download with progress
    $startTime = Get-Date
    
    # Use WebRequest with progress tracking
    $webClient = New-Object System.Net.WebClient
    
    # Progress event handler
    $webClient.DownloadProgressChanged += {
        param($sender, $e)
        $percent = $e.ProgressPercentage
        $downloadedMB = [math]::Round($e.BytesReceived / 1MB, 2)
        $totalMB = [math]::Round($e.TotalBytesToReceive / 1MB, 2)
        
        Write-Progress -Activity "Downloading SDXL Checkpoint" `
            -Status "$downloadedMB MB / $totalMB MB ($percent%)" `
            -PercentComplete $percent
    }
    
    # Download completed event handler
    $webClient.DownloadFileCompleted += {
        param($sender, $e)
        if ($e.Error) {
            Write-Host ""
            Write-Host "Download failed: $($e.Error.Message)" -ForegroundColor Red
        } else {
            Write-Host ""
            Write-Host "Download completed!" -ForegroundColor Green
        }
    }
    
    # Start download
    $webClient.DownloadFileAsync([System.Uri]::new($DOWNLOAD_URL), $CHECKPOINT_PATH)
    
    # Wait for download to complete
    while ($webClient.IsBusy) {
        Start-Sleep -Milliseconds 100
    }
    
    $webClient.Dispose()
    
    # Verify download
    if (Test-Path $CHECKPOINT_PATH) {
        $downloadedFile = Get-Item $CHECKPOINT_PATH
        $downloadedSizeGB = [math]::Round($downloadedFile.Length / 1GB, 2)
        $elapsedTime = ((Get-Date) - $startTime).TotalMinutes
        
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Gray
        Write-Host "Download Summary:" -ForegroundColor Cyan
        Write-Host "  File: $CHECKPOINT_FILE" -ForegroundColor Green
        Write-Host "  Size: $downloadedSizeGB GB" -ForegroundColor Green
        Write-Host "  Time: $([math]::Round($elapsedTime, 1)) minutes" -ForegroundColor Green
        Write-Host ""
        
        if ($downloadedSizeGB -ge ($EXPECTED_SIZE_GB - 0.5)) {
            Write-Host "SUCCESS: Checkpoint downloaded successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "  1. Restart ComfyUI (if running)" -ForegroundColor White
            Write-Host "  2. Try Face ID generation again" -ForegroundColor White
        } else {
            Write-Host "WARNING: Downloaded file size ($downloadedSizeGB GB) is smaller than expected ($EXPECTED_SIZE_GB GB)" -ForegroundColor Yellow
            Write-Host "The download may be incomplete. You may want to try again." -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: Downloaded file not found!" -ForegroundColor Red
    }
}
catch {
    Write-Host ""
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative download methods:" -ForegroundColor Yellow
    Write-Host "1. Use browser: $DOWNLOAD_URL" -ForegroundColor White
    Write-Host "2. Use wget: wget $DOWNLOAD_URL -O `"$CHECKPOINT_PATH`"" -ForegroundColor White
    Write-Host "3. Use aria2c (faster): aria2c -x 16 -s 16 `"$DOWNLOAD_URL`" -d `"$CHECKPOINT_DIR`"" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
