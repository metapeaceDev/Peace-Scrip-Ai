# Quick WAN Environment Test
# Verifies everything is ready for WAN POC testing

Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " WAN POC Environment Verification" -ForegroundColor White
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

$passed = 0
$failed = 0
$warnings = 0

# Test 1: Python
Write-Host "[1/8] Python Installation..." -NoNewline
$pythonVer = python --version 2>&1 | Out-String
if ($pythonVer -match "Python 3") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Test 2: ComfyUI Directory
Write-Host "[2/8] ComfyUI Directory..." -NoNewline
if (Test-Path "C:\Users\USER\ComfyUI\main.py") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Test 3: WAN Models Directory
Write-Host "[3/8] WAN Models Directory..." -NoNewline
$modelsPath = "C:\Users\USER\ComfyUI\models\diffusion_models\wan-video-comfy"
if (Test-Path $modelsPath) {
    $fileCount = (Get-ChildItem $modelsPath -File -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host " PASS ($fileCount files)" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Test 4: Core Models
Write-Host "[4/8] Core Models (T5, CLIP, VAE)..." -NoNewline
$core1 = Test-Path "$modelsPath\umt5-xxl-enc-bf16.safetensors"
$core2 = Test-Path "$modelsPath\open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"
$core3 = Test-Path "$modelsPath\Wan2_1_VAE_bf16.safetensors"
$coreCount = ($core1, $core2, $core3 | Where-Object {$_}).Count
if ($coreCount -eq 3) {
    Write-Host " PASS (3/3)" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL ($coreCount/3)" -ForegroundColor Red
    $failed++
}

# Test 5: T2V Models
Write-Host "[5/8] T2V Models (1.3B + 14B)..." -NoNewline
$t2v1 = Test-Path "$modelsPath\Wan2_1-T2V-1_3B_fp8_e4m3fn.safetensors"
$t2v2 = Test-Path "$modelsPath\Wan2_1-T2V-14B_fp8_e4m3fn.safetensors"
$t2vCount = ($t2v1, $t2v2 | Where-Object {$_}).Count
if ($t2vCount -ge 1) {
    Write-Host " PASS ($t2vCount/2)" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Test 6: V2V Module
Write-Host "[6/8] V2V Module (Video-as-Prompt)..." -NoNewline
if (Test-Path "$modelsPath\Video-as-prompt\Wan2_1-I2V-14B-VAP_module_bf16.safetensors") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " WARN" -ForegroundColor Yellow
    $warnings++
}

# Test 7: VACE Module
Write-Host "[7/8] VACE Module (Speed/Camera)..." -NoNewline
if (Test-Path "$modelsPath\Wan2_1-VACE_module_14B_bf16.safetensors") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " WARN" -ForegroundColor Yellow
    $warnings++
}

# Test 8: WAN Wrapper
Write-Host "[8/8] WAN Wrapper..." -NoNewline
if (Test-Path "C:\Users\USER\ComfyUI\custom_nodes\ComfyUI-WanVideoWrapper\__init__.py") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " WARN" -ForegroundColor Yellow
    $warnings++
}

# Summary
Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Results: $passed PASS | $failed FAIL | $warnings WARN" -ForegroundColor White
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "SUCCESS - READY FOR TESTING" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Step: .\start-comfyui-wan.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 0
} else {
    Write-Host "ISSUES FOUND - Fix before testing" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "- Missing models: Run download_wan_curated_v2.py" -ForegroundColor White
    Write-Host "- Missing ComfyUI: Check installation" -ForegroundColor White
    Write-Host ""
    exit 1
}
