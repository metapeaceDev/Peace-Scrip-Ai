param(
  [string]$ContainerName = "comfyui-animatediff"
)

$ErrorActionPreference = "Stop"

Write-Host "=== RTX 5090 sm_120 Smoke Test (Docker) ===" -ForegroundColor Cyan
Write-Host "Container: $ContainerName" -ForegroundColor Gray

Write-Host "`n1) Checking container is running..." -ForegroundColor Yellow
$running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $ContainerName
if (-not $running) {
  Write-Host "ERROR: Container not running: $ContainerName" -ForegroundColor Red
  Write-Host "Tip: start it with:" -ForegroundColor Gray
  Write-Host "  cd comfyui-docker-cuda12" -ForegroundColor Gray
  Write-Host "  docker-compose -f docker-compose.cuda13.yml up -d --build" -ForegroundColor Gray
  exit 1
}
Write-Host "OK: Container is running" -ForegroundColor Green

Write-Host "`n2) Verifying PyTorch sees RTX 5090 + sm_120..." -ForegroundColor Yellow
$cmd = @'
import torch
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
if not torch.cuda.is_available():
  raise SystemExit(2)

print(f"GPU: {torch.cuda.get_device_name(0)}")
cap = torch.cuda.get_device_capability(0)
print(f"Compute capability: sm_{cap[0]}{cap[1]}")

x = torch.randn(1024, 1024, device='cuda')
y = torch.randn(1024, 1024, device='cuda')
z = x @ y
torch.cuda.synchronize()
print(f"OK: CUDA matmul ok: {tuple(z.shape)}")
'@

$cmdB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
$oneLiner = "import base64; exec(compile(base64.b64decode('$cmdB64').decode('utf-8'), '<smoke>', 'exec'))"
$prevErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$out = & docker exec $ContainerName python3 -c $oneLiner 2>&1 | Out-String
$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevErr

$out | Write-Output

if ($exitCode -ne 0) {
  Write-Host "ERROR: docker exec returned exit code $exitCode" -ForegroundColor Red
  exit $exitCode
}

if ($out -notmatch "Compute capability: sm_120") {
  Write-Host "`nERROR: Expected sm_120 but did not detect it." -ForegroundColor Red
  Write-Host "If you see 'no kernel image', you are not on a sm_120-capable PyTorch build." -ForegroundColor Gray
  exit 2
}

Write-Host "`nOK: Smoke test passed: sm_120 detected and CUDA works." -ForegroundColor Green
