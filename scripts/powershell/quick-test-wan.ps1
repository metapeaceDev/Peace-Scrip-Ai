# Quick WAN Environment Test
# Verifies everything is ready before full POC testing

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  WAN POC Quick Environment Test           ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$allPassed = $true
$testResults = @()

# Test 1: Python
Write-Host "[1/8] Python Installation..." -NoNewline
$pythonTest = python --version 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "Python"; Status = "PASS"; Details = $pythonTest.Trim() }
} else {
    Write-Host " ✗" -ForegroundColor Red
    $testResults += @{ Test = "Python"; Status = "FAIL"; Details = "Not found" }
    $allPassed = $false
}

# Test 2: ComfyUI Directory
Write-Host "[2/8] ComfyUI Directory..." -NoNewline
$comfyPath = "C:\Users\USER\ComfyUI"
if (Test-Path "$comfyPath\main.py") {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "ComfyUI Dir"; Status = "PASS"; Details = $comfyPath }
} else {
    Write-Host " ✗" -ForegroundColor Red
    $testResults += @{ Test = "ComfyUI Dir"; Status = "FAIL"; Details = "main.py not found" }
    $allPassed = $false
}

# Test 3: WAN Models Directory
Write-Host "[3/8] WAN Models Directory..." -NoNewline
$modelsPath = "$comfyPath\models\diffusion_models\wan-video-comfy"
if (Test-Path $modelsPath) {
    $fileCount = (Get-ChildItem $modelsPath -File -Recurse | Measure-Object).Count
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "WAN Models Dir"; Status = "PASS"; Details = "$fileCount files" }
} else {
    Write-Host " ✗" -ForegroundColor Red
    $testResults += @{ Test = "WAN Models Dir"; Status = "FAIL"; Details = "Directory not found" }
    $allPassed = $false
}

# Test 4: Core Models
Write-Host "[4/8] Core Models (T5, CLIP, VAE)..." -NoNewline
$coreModels = @(
    "umt5-xxl-enc-bf16.safetensors",
    "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors",
    "Wan2_1_VAE_bf16.safetensors"
)
$coreFound = 0
foreach ($model in $coreModels) {
    if (Test-Path "$modelsPath\$model") {
        $coreFound++
    }
}
if ($coreFound -eq 3) {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "Core Models"; Status = "PASS"; Details = "3/3 found" }
} else {
    Write-Host " ✗" -ForegroundColor Red
    $testResults += @{ Test = "Core Models"; Status = "FAIL"; Details = "$coreFound/3 found" }
    $allPassed = $false
}

# Test 5: T2V Models
Write-Host "[5/8] T2V Models (1.3B and 14B)..." -NoNewline
$t2vModels = @(
    "Wan2_1-T2V-1_3B_fp8_e4m3fn.safetensors",
    "Wan2_1-T2V-14B_fp8_e4m3fn.safetensors"
)
$t2vFound = 0
foreach ($model in $t2vModels) {
    if (Test-Path "$modelsPath\$model") {
        $t2vFound++
    }
}
if ($t2vFound -ge 1) {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "T2V Models"; Status = "PASS"; Details = "$t2vFound/2 found" }
} else {
    Write-Host " ✗" -ForegroundColor Red
    $testResults += @{ Test = "T2V Models"; Status = "FAIL"; Details = "None found" }
    $allPassed = $false
}

# Test 6: V2V Module
Write-Host "[6/8] V2V Module (Video-as-Prompt)..." -NoNewline
$v2vPath = "$modelsPath\Video-as-prompt\Wan2_1-I2V-14B-VAP_module_bf16.safetensors"
if (Test-Path $v2vPath) {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "V2V Module"; Status = "PASS"; Details = "VAP found" }
} else {
    Write-Host " ⚠" -ForegroundColor Yellow
    $testResults += @{ Test = "V2V Module"; Status = "WARN"; Details = "Not found (optional)" }
}

# Test 7: VACE Module
Write-Host "[7/8] VACE Module (Speed/Camera)..." -NoNewline
$vacePath = "$modelsPath\Wan2_1-VACE_module_14B_bf16.safetensors"
if (Test-Path $vacePath) {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "VACE Module"; Status = "PASS"; Details = "VACE found" }
} else {
    Write-Host " ⚠" -ForegroundColor Yellow
    $testResults += @{ Test = "VACE Module"; Status = "WARN"; Details = "Not found (optional)" }
}

# Test 8: WAN Wrapper
Write-Host "[8/8] WAN Wrapper Installation..." -NoNewline
$wrapperPath = "$comfyPath\custom_nodes\ComfyUI-WanVideoWrapper"
if (Test-Path "$wrapperPath\__init__.py") {
    Write-Host " ✓" -ForegroundColor Green
    $testResults += @{ Test = "WAN Wrapper"; Status = "PASS"; Details = "Installed" }
} else {
    Write-Host " ⚠" -ForegroundColor Yellow
    $testResults += @{ Test = "WAN Wrapper"; Status = "WARN"; Details = "Not found" }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor White
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan

foreach ($result in $testResults) {
    $status = $result.Status
    $color = switch ($status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        default { "White" }
    }
    
    Write-Host ("{0,-20}" -f $result.Test) -NoNewline
    Write-Host ("[{0}]" -f $status) -ForegroundColor $color -NoNewline
    Write-Host " {0}" -f $result.Details -ForegroundColor Gray
}

Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

# Final Verdict
if ($allPassed) {
    Write-Host "✓ ALL CRITICAL TESTS PASSED" -ForegroundColor Green
    Write-Host "`nYou are ready to start WAN POC testing!`n" -ForegroundColor Cyan
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: .\start-comfyui-wan.ps1" -ForegroundColor White
    Write-Host "  2. Open: http://127.0.0.1:8189" -ForegroundColor White
    Write-Host "  3. Follow: WAN_POC_DAY2_TESTING_GUIDE.md`n" -ForegroundColor White
    exit 0
} else {
    Write-Host "✗ CRITICAL TESTS FAILED" -ForegroundColor Red
    Write-Host "`nPlease resolve the issues above before testing.`n" -ForegroundColor Yellow
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Missing models: Run download_wan_curated_v2.py" -ForegroundColor White
    Write-Host "  - Missing Python: Install Python 3.10+" -ForegroundColor White
    Write-Host "  - Missing ComfyUI: Check installation path`n" -ForegroundColor White
    exit 1
}
