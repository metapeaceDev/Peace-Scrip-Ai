# Diagnose ComfyUI + comfyui-service video generation end-to-end
# Safe to run in a fresh PowerShell window.

$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeDir = Join-Path $root "comfyui-docker-cuda12"
$composeFile = Join-Path $composeDir "docker-compose.cuda13.yml"
$outputDir = Join-Path $composeDir "output"
$requestJson = Join-Path $root "test-video-request.json"

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  ComfyUI Video Diagnostics (AnimateDiff)" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

Write-Host "1) Docker container status" -ForegroundColor Yellow
try {
  docker ps -a --filter "name=comfyui-animatediff" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
} catch { Write-Host "Docker command failed" -ForegroundColor Red }

Write-Host "`n2) Backend health (port 8000)" -ForegroundColor Yellow
$healthOk = $false
try {
  $h = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
  $healthOk = $true
  Write-Host "OK: /health" -ForegroundColor Green
} catch {
  Write-Host "ERROR: Backend not reachable on http://localhost:8000/health" -ForegroundColor Red
}

Write-Host "`n3) ComfyUI health (port 8188)" -ForegroundColor Yellow
try {
  $stats = Invoke-RestMethod -Uri "http://localhost:8188/system_stats" -TimeoutSec 3
  Write-Host "OK: ComfyUI /system_stats" -ForegroundColor Green
} catch {
  Write-Host "ERROR: ComfyUI not reachable on http://localhost:8188/system_stats" -ForegroundColor Red
}

Write-Host "`n4) Output directory snapshot" -ForegroundColor Yellow
if (Test-Path $outputDir) {
  $files = Get-ChildItem $outputDir -File | Sort-Object LastWriteTime -Descending
  Write-Host "Files: $($files.Count)" -ForegroundColor Gray
  $files | Select-Object -First 10 | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host " - $($_.Name) ($sizeMB MB) $($_.LastWriteTime)" -ForegroundColor White
  }
} else {
  Write-Host "ERROR: Output dir not found: $outputDir" -ForegroundColor Red
}

if (-not $healthOk) {
  Write-Host "`nStop here: backend not running." -ForegroundColor Red
  exit 1
}

Write-Host "`n5) Submit AnimateDiff job" -ForegroundColor Yellow
if (-not (Test-Path $requestJson)) {
  Write-Host "ERROR: Missing request file: $requestJson" -ForegroundColor Red
  exit 1
}

$jobId = $null
try {
  $resp = Invoke-RestMethod -Uri "http://localhost:8000/api/video/generate/animatediff" -Method POST -ContentType "application/json" -InFile $requestJson -TimeoutSec 30
  if ($resp.success -and $resp.data.jobId) {
    $jobId = $resp.data.jobId
    Write-Host "OK: Job queued: $jobId" -ForegroundColor Green
  } else {
    Write-Host "ERROR: Unexpected response" -ForegroundColor Red
    $resp | ConvertTo-Json -Depth 6 | Write-Host
    exit 1
  }
} catch {
  Write-Host "ERROR: Failed to submit job: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host "`n6) Poll job status via /api/video/job/:jobId" -ForegroundColor Yellow
$maxSeconds = 240
$start = Get-Date
$status = "unknown"
$progress = 0

while (((Get-Date) - $start).TotalSeconds -lt $maxSeconds) {
  try {
    $s = Invoke-RestMethod -Uri "http://localhost:8000/api/video/job/$jobId" -TimeoutSec 10
    $status = $s.data.state
    $progress = $s.data.progress
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] state=$status progress=$progress%" -ForegroundColor Cyan

    if ($status -eq "completed") {
      Write-Host "OK: Completed" -ForegroundColor Green
      if ($s.data.videoUrl) {
        Write-Host "Video URL: $($s.data.videoUrl)" -ForegroundColor Yellow
      }
      break
    }
    if ($status -eq "failed") {
      Write-Host "ERROR: Failed: $($s.data.error)" -ForegroundColor Red
      break
    }
  } catch {
    Write-Host "WARN: Status poll failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  Start-Sleep -Seconds 5
}

Write-Host "`n7) Check for new video files (mp4/webm/gif)" -ForegroundColor Yellow
if (Test-Path $outputDir) {
  $vid = Get-ChildItem $outputDir -File | Where-Object { $_.Extension -in ".mp4", ".webm", ".gif" } | Sort-Object LastWriteTime -Descending
  if ($vid.Count -gt 0) {
    Write-Host "OK: Found video outputs:" -ForegroundColor Green
    $vid | Select-Object -First 5 | ForEach-Object {
      $sizeMB = [math]::Round($_.Length / 1MB, 2)
      Write-Host " - $($_.Name) ($sizeMB MB) $($_.LastWriteTime)" -ForegroundColor White
    }
  } else {
    Write-Host "ERROR: No video outputs found in $outputDir" -ForegroundColor Red
    Write-Host "Tip: MP4 export requires VideoHelperSuite (VHS_VideoCombine) + ffmpeg inside container." -ForegroundColor Gray
  }
}

Write-Host "\nDone." -ForegroundColor Cyan
