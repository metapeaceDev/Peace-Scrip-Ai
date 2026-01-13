# Check whether the local ComfyUI Python environment supports RTX 5090 (sm_120)
# This script is read-only: it prints versions and runs a tiny CUDA op.

$ErrorActionPreference = 'Continue'

Write-Host "=== ComfyUI sm_120 Torch Check ==="

$comfyRootCandidates = @(
  'C:\Users\USER\ComfyUI',
  'C:\ComfyUI\ComfyUI_windows_portable\ComfyUI'
)

$comfyRoot = $comfyRootCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $comfyRoot) {
  Write-Host "WARN: Could not find ComfyUI folder at common paths." -ForegroundColor Yellow
  Write-Host "Set `$comfyRootCandidates in this script to your real path and re-run." -ForegroundColor Yellow
}

$pythonCandidates = @(
  (Join-Path $comfyRoot 'python_embeded\python.exe'),
  (Join-Path $comfyRoot '.venv\Scripts\python.exe'),
  (Join-Path $comfyRoot 'venv\Scripts\python.exe'),
  'python'
) | Where-Object { $_ -and $_.Length -gt 0 }

$python = $null
foreach ($p in $pythonCandidates) {
  if ($p -eq 'python') {
    $python = $p
    break
  }
  if (Test-Path -LiteralPath $p) {
    $python = $p
    break
  }
}

if (-not $python) {
  Write-Host "ERROR: No Python interpreter found." -ForegroundColor Red
  exit 1
}

Write-Host ("Python: {0}" -f $python)

$code = @'
import sys
try:
    import torch
    print('torch.__version__:', torch.__version__)
    print('torch.version.cuda:', getattr(torch.version, 'cuda', None))
    print('cuda.is_available:', torch.cuda.is_available())
    if torch.cuda.is_available():
        print('device:', torch.cuda.get_device_name(0))
        print('capability:', torch.cuda.get_device_capability(0))
        # tiny op that will fail fast if kernels aren't available
        x = torch.randn(128, 128, device='cuda')
        y = x @ x
        print('matmul_ok:', True)
    else:
        print('matmul_ok:', False)
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
    raise
'@

& $python -c $code
$exit = $LASTEXITCODE

if ($exit -eq 0) {
  Write-Host "OK: CUDA kernels executed." -ForegroundColor Green
  exit 0
}

Write-Host "FAIL: CUDA kernels could not execute. If you see 'no kernel image', install PyTorch nightly with sm_120 support or use the CUDA13 container." -ForegroundColor Red
exit $exit
