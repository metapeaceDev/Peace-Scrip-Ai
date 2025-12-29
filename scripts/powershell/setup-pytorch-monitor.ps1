# Setup PyTorch sm_120 Weekly Monitor
# ตั้งค่าการตรวจสอบ PyTorch sm_120 support อัตโนมัติทุกสัปดาห์

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Setup PyTorch sm_120 Weekly Monitoring                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Create Python test script
$pythonScript = @"
import torch
if torch.cuda.is_available():
    cap = torch.cuda.get_device_capability(0)
    if cap[0] == 12 and cap[1] == 0:
        try:
            x = torch.randn(10, 10, device='cuda')
            y = x @ x
            print('SM_120_SUPPORTED')
        except:
            print('SM_120_NOT_SUPPORTED')
    else:
        print('NO_RTX5090')
else:
    print('NO_CUDA')
"@

$pythonScriptPath = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\test_sm120.py"
$pythonScript | Out-File -FilePath $pythonScriptPath -Encoding UTF8

# Create monitoring script
$monitorScript = @"
# Quick PyTorch sm_120 Check
`$logFile = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\pytorch_sm120_check_log.txt"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[`$timestamp] Checking PyTorch sm_120 support..." | Out-File -Append `$logFile

try {
    `$result = python "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\test_sm120.py"
    "Result: `$result" | Out-File -Append `$logFile
    
    if (`$result -eq 'SM_120_SUPPORTED') {
        "SUCCESS! PyTorch now supports sm_120!" | Out-File -Append `$logFile
        # Show notification
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "PyTorch supports RTX 5090 (sm_120) now!``n``nYou can use RTX 5090 with ComfyUI!",
            "PyTorch sm_120 Support Available!",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    }
} catch {
    "Error: `$_" | Out-File -Append `$logFile
}
"@

# Save monitoring script
$scriptPath = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\monitor-pytorch-sm120.ps1"
$monitorScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "✅ Monitoring script created:" -ForegroundColor Green
Write-Host "   $scriptPath`n" -ForegroundColor Gray

# Create Scheduled Task
$taskName = "PyTorch-sm120-Monitor"
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:00AM

Write-Host "Creating Windows Scheduled Task..." -ForegroundColor Yellow
try {
    # Delete existing task if exists
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create new task
    Register-ScheduledTask -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Description "Check PyTorch sm_120 support for RTX 5090 every Monday" `
        -Force | Out-Null
    
    Write-Host "✅ Scheduled Task created successfully!" -ForegroundColor Green
    Write-Host "`n📅 Schedule: Every Monday at 9:00 AM" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create Scheduled Task: $_" -ForegroundColor Red
    Write-Host "`nYou can run manually instead:" -ForegroundColor Yellow
    Write-Host "   .\monitor-pytorch-sm120.ps1`n" -ForegroundColor Gray
    exit 1
}

# Create log file
$logFile = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\pytorch_sm120_check_log.txt"
"PyTorch sm_120 Monitoring Log`n" | Out-File -FilePath $logFile -Encoding UTF8
Write-Host "✅ Log file created:" -ForegroundColor Green
Write-Host "   $logFile`n" -ForegroundColor Gray

# Test run
Write-Host "Running first check..." -ForegroundColor Yellow
& $scriptPath
Start-Sleep -Seconds 2

# Show log
Write-Host "`n=== First Check Result ===" -ForegroundColor Cyan
Get-Content $logFile
Write-Host "========================`n" -ForegroundColor Cyan

# Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    Setup Complete!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📋 What was set up:" -ForegroundColor Cyan
Write-Host "   ✅ Monitoring script: monitor-pytorch-sm120.ps1" -ForegroundColor White
Write-Host "   ✅ Scheduled Task: Runs every Monday at 9:00 AM" -ForegroundColor White
Write-Host "   ✅ Log file: pytorch_sm120_check_log.txt" -ForegroundColor White
Write-Host "   ✅ Notification: Will alert when sm_120 is supported`n" -ForegroundColor White

Write-Host "📊 To view logs:" -ForegroundColor Yellow
Write-Host "   Get-Content pytorch_sm120_check_log.txt`n" -ForegroundColor Gray

Write-Host "🔄 To check manually now:" -ForegroundColor Yellow
Write-Host "   .\monitor-pytorch-sm120.ps1`n" -ForegroundColor Gray

Write-Host "⚙️  To manage task:" -ForegroundColor Yellow
Write-Host "   Get-ScheduledTask -TaskName 'PyTorch-sm120-Monitor'" -ForegroundColor Gray
Write-Host "   Unregister-ScheduledTask -TaskName 'PyTorch-sm120-Monitor'`n" -ForegroundColor Gray

Write-Host "✅ You're all set! Will monitor weekly for PyTorch sm_120 support." -ForegroundColor Green
Write-Host "💡 Estimated timeline: Q1 2025 (January-March)`n" -ForegroundColor Cyan
