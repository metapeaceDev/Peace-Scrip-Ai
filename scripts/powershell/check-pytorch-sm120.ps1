# PowerShell Script to Check PyTorch sm_120 Support
# สคริปต์ตรวจสอบว่า PyTorch รองรับ RTX 5090 (sm_120) แล้วหรือยัง

param(
    [switch]$CheckNightly,
    [switch]$Verbose,
    [switch]$AutoCheck
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== PyTorch sm_120 Support Checker ===" -ForegroundColor Magenta
Write-Host "For RTX 5090 Blackwell Architecture`n" -ForegroundColor Cyan

# Function to check PyTorch version and sm support
function Test-PyTorchSM120Support {
    param(
        [string]$PyTorchVersion
    )
    
    Write-Host "Testing PyTorch $PyTorchVersion..." -ForegroundColor Cyan
    
    $testScript = @"
import torch
import sys

# Get version
print(f"PyTorch: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    # Get GPU info
    try:
        gpu_name = torch.cuda.get_device_name(0)
        print(f"GPU Detected: {gpu_name}")
        
        # Get compute capability
        capability = torch.cuda.get_device_capability(0)
        sm_version = f"sm_{capability[0]}{capability[1]}"
        print(f"GPU Compute Capability: {sm_version}")
        
        # Test CUDA operations
        try:
            x = torch.randn(100, 100, device='cuda')
            y = torch.matmul(x, x)
            print("CUDA Operations: SUCCESS")
            print("SM_120_SUPPORT: YES")
        except RuntimeError as e:
            if "sm_120" in str(e) or "no kernel image" in str(e):
                print(f"CUDA Operations: FAILED")
                print(f"Error: {str(e)[:100]}")
                print("SM_120_SUPPORT: NO")
            else:
                print(f"CUDA Operations: ERROR - {str(e)[:100]}")
                print("SM_120_SUPPORT: UNKNOWN")
    except Exception as e:
        print(f"GPU Detection Error: {e}")
        print("SM_120_SUPPORT: UNKNOWN")
else:
    print("CUDA not available")
    print("SM_120_SUPPORT: N/A")
"@
    
    $result = python -c $testScript 2>&1
    return $result
}

# Check current PyTorch installation
Write-Host "[1/3] Checking Current PyTorch Installation..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────`n" -ForegroundColor Gray

try {
    $currentResult = Test-PyTorchSM120Support -PyTorchVersion "Current"
    $currentResult | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    
    # Parse result
    $sm120Supported = $currentResult | Select-String "SM_120_SUPPORT: YES"
    
    if ($sm120Supported) {
        Write-Host "`n✅ SUCCESS: PyTorch supports sm_120!" -ForegroundColor Green
        Write-Host "Your RTX 5090 is now compatible with PyTorch!" -ForegroundColor Green
        Write-Host "`nNext Steps:" -ForegroundColor Cyan
        Write-Host "  1. Re-enable WAN wrapper if disabled" -ForegroundColor White
        Write-Host "  2. Start ComfyUI" -ForegroundColor White
        Write-Host "  3. Begin WAN POC testing" -ForegroundColor White
        exit 0
    } else {
        Write-Host "`n⚠️  Current PyTorch does NOT support sm_120" -ForegroundColor Yellow
        Write-Host "RTX 5090 is not yet compatible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ Error checking current PyTorch: $_" -ForegroundColor Red
    exit 1
}

# Check nightly version if requested
if ($CheckNightly) {
    Write-Host "`n[2/3] Checking Latest PyTorch Nightly..." -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────`n" -ForegroundColor Gray
    
    Write-Host "Querying PyTorch nightly index..." -ForegroundColor Cyan
    
    try {
        # Get latest nightly version info
        $nightlyIndex = Invoke-WebRequest -Uri "https://download.pytorch.org/whl/nightly/torch/" -UseBasicParsing
        $latestNightly = $nightlyIndex.Content | Select-String -Pattern "torch-(\d+\.\d+\.\d+\.dev\d+)\+cu\d+" -AllMatches | 
            ForEach-Object { $_.Matches } | 
            Select-Object -First 1 -ExpandProperty Value
        
        if ($latestNightly) {
            Write-Host "  Latest Nightly: $latestNightly" -ForegroundColor White
            Write-Host "`n  To test, run:" -ForegroundColor Cyan
            Write-Host "    python -m pip install --pre torch --index-url https://download.pytorch.org/whl/nightly/cu124" -ForegroundColor Gray
            Write-Host "`n  ⚠️  Warning: This will replace your current PyTorch installation" -ForegroundColor Yellow
        } else {
            Write-Host "  Could not determine latest nightly version" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Error querying nightly builds: $_" -ForegroundColor Red
    }
}

# Recommendations
Write-Host "`n[3/3] Recommendations:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────`n" -ForegroundColor Gray

Write-Host "Since sm_120 is not yet supported, you have these options:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Wait for Official Support (Recommended)" -ForegroundColor Cyan
Write-Host "  Timeline: 1-3 months" -ForegroundColor Gray
Write-Host "  Action: Run this script weekly to check for updates" -ForegroundColor Gray
Write-Host "  Command: .\check-pytorch-sm120.ps1 -CheckNightly" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Use Cloud GPU (Immediate)" -ForegroundColor Cyan
Write-Host "  Platform: RunPod" -ForegroundColor Gray
Write-Host "  GPU: RTX 4090 (sm_89 supported)" -ForegroundColor Gray
Write-Host "  Cost: ~$2-3 for complete POC" -ForegroundColor Gray
Write-Host "  Guide: See RUNPOD_QUICK_START.md" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: Monitor PyTorch Development" -ForegroundColor Cyan
Write-Host "  GitHub: https://github.com/pytorch/pytorch/issues" -ForegroundColor Gray
Write-Host "  Search: 'sm_120' or 'Blackwell' or 'RTX 5090'" -ForegroundColor Gray
Write-Host "  Subscribe: Watch releases and discussions" -ForegroundColor Gray
Write-Host ""

# Auto-check setup
if ($AutoCheck) {
    Write-Host "Setting up weekly auto-check..." -ForegroundColor Cyan
    
    # Create scheduled task
    $taskName = "Check_PyTorch_SM120_Support"
    $scriptPath = $PSCommandPath
    
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -CheckNightly"
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    try {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
        Write-Host "✅ Weekly check scheduled (Mondays at 9 AM)" -ForegroundColor Green
        Write-Host "  Task Name: $taskName" -ForegroundColor Gray
        Write-Host "  View: Task Scheduler > Task Scheduler Library" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Could not create scheduled task: $_" -ForegroundColor Red
        Write-Host "  You may need to run as Administrator" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Magenta
Write-Host "Status: PyTorch sm_120 support NOT available yet" -ForegroundColor Yellow
Write-Host "RTX 5090: Cannot be used with PyTorch currently" -ForegroundColor Yellow
Write-Host "`nCheck again:" -ForegroundColor Cyan
Write-Host "  Weekly: .\check-pytorch-sm120.ps1 -CheckNightly" -ForegroundColor White
Write-Host "  Or use: .\check-pytorch-sm120.ps1 -AutoCheck (sets up weekly task)" -ForegroundColor White
Write-Host ""

# Save check date
$checkDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logFile = "pytorch_sm120_check_log.txt"
Add-Content -Path $logFile -Value "$checkDate - sm_120 NOT supported"
Write-Host "Check logged to: $logFile" -ForegroundColor Gray

Write-Host "`n🔗 Related Documentation:" -ForegroundColor Cyan
Write-Host "  - RTX5090_INCOMPATIBILITY_REPORT.md" -ForegroundColor White
Write-Host "  - CLOUD_GPU_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  - RUNPOD_QUICK_START.md" -ForegroundColor White
Write-Host ""
