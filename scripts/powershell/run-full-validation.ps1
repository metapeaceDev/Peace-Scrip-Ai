# Run full end-to-end validation in one command.
# PowerShell 5.1 compatible.

[CmdletBinding()]
param(
  # Use switches so calling via `powershell -File` is reliable.
  [switch]$NoUp,
  [switch]$Build,
  [switch]$SkipE2E,
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$title) {
  Write-Host "" 
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host (" " + $title) -ForegroundColor Cyan
  Write-Host "===============================================" -ForegroundColor Cyan
}

function Assert-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Wait-Port([string]$hostName, [int]$port, [int]$timeoutSeconds = 60) {
  $start = Get-Date
  while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
    try {
      if (Test-NetConnection -ComputerName $hostName -Port $port -InformationLevel Quiet) {
        return $true
      }
    } catch {
      # ignore
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeDir = Join-Path $root 'comfyui-docker-cuda12'
$composeFile = Join-Path $composeDir 'docker-compose.cuda13.yml'
$serviceDir = Join-Path $root 'comfyui-service'
$diagnoseScript = Join-Path $root 'diagnose-video.ps1'

Write-Section 'Full Validation Runner'
Write-Host ("Root: " + $root) -ForegroundColor Gray

Assert-Command 'docker'
Assert-Command 'docker-compose'

if (-not (Test-Path $composeFile)) {
  throw "Compose file not found: $composeFile"
}
if (-not (Test-Path $diagnoseScript)) {
  throw "Missing script: $diagnoseScript"
}

# 1) (Optional) Compose up
if (-not $NoUp) {
  Write-Section 'Docker Compose'
  Push-Location $composeDir
  try {
    if ($Build) {
      Write-Host "Running: docker-compose -f docker-compose.cuda13.yml build" -ForegroundColor Yellow
      docker-compose -f docker-compose.cuda13.yml build
    }

    Write-Host "Running: docker-compose -f docker-compose.cuda13.yml up -d" -ForegroundColor Yellow
    docker-compose -f docker-compose.cuda13.yml up -d
  } finally {
    Pop-Location
  }
}

# 2) Health checks
Write-Section 'Health Checks'
$ok8000 = Wait-Port 'localhost' 8000 90
$ok8188 = Wait-Port 'localhost' 8188 90
$c8000 = if ($ok8000) { 'Green' } else { 'Red' }
$c8188 = if ($ok8188) { 'Green' } else { 'Red' }
Write-Host ("backend :8000 reachable = " + $ok8000) -ForegroundColor $c8000
Write-Host ("comfyui  :8188 reachable = " + $ok8188) -ForegroundColor $c8188

if (-not $ok8000 -or -not $ok8188) {
  throw 'Services not reachable (8000/8188).'
}

# 3) E2E diagnose video
if (-not $SkipE2E) {
  Write-Section 'E2E Video Diagnostic'
  powershell -NoProfile -ExecutionPolicy Bypass -File $diagnoseScript
}

# 4) Backend tests
if (-not $SkipTests) {
  Write-Section 'Backend Tests (Vitest)'
  if (-not (Test-Path $serviceDir)) {
    throw "Service dir not found: $serviceDir"
  }
  Push-Location $serviceDir
  try {
    npm test
  } finally {
    Pop-Location
  }
}

# 5) Runtime snapshot
Write-Section 'Runtime Snapshot'
try {
  docker exec comfyui-animatediff python3 -c "import numpy as np; import torch; print('NumPy:', np.__version__); print('Torch:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None');"
} catch {
  Write-Host ("WARN: Could not read snapshot from container comfyui-animatediff: " + $_.Exception.Message) -ForegroundColor Yellow
}

Write-Section 'DONE'
Write-Host 'All requested checks completed.' -ForegroundColor Green
