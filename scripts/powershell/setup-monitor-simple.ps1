# Setup PyTorch sm_120 Weekly Monitor - Simple Version
$ErrorActionPreference = "Stop"

Write-Host "`nSetup PyTorch sm_120 Weekly Monitoring`n" -ForegroundColor Cyan

# Step 1: Create Python test script
Write-Host "[1/4] Creating Python test script..." -ForegroundColor Yellow
$pythonCode = "import torch`nif torch.cuda.is_available():`n    cap = torch.cuda.get_device_capability(0)`n    if cap[0] == 12:`n        try:`n            x = torch.randn(10, 10, device='cuda')`n            y = torch.matmul(x, x)`n            print('SUPPORTED')`n        except:`n            print('NOT_SUPPORTED')`n    else:`n        print('NO_RTX5090')`nelse:`n    print('NO_CUDA')"

$pythonCode | Out-File "test_sm120.py" -Encoding UTF8
Write-Host "  Created test_sm120.py" -ForegroundColor Green

# Step 2: Create monitor script
Write-Host "[2/4] Creating monitor script..." -ForegroundColor Yellow
$monitorCode = @"
`$logFile = "pytorch_sm120_log.txt"
`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
"`[`$timestamp`] Checking..." | Out-File -Append `$logFile
`$result = python test_sm120.py 2>&1 | Out-String
if (`$result -match 'SUPPORTED') {
    "SUCCESS! sm_120 supported" | Out-File -Append `$logFile
    [System.Windows.Forms.MessageBox]::Show("PyTorch supports RTX 5090!")
} else {
    "Not yet: `$result" | Out-File -Append `$logFile
}
"@

$monitorCode | Out-File "monitor-sm120.ps1" -Encoding UTF8
Write-Host "  Created monitor-sm120.ps1" -ForegroundColor Green

# Step 3: Create Scheduled Task
Write-Host "[3/4] Creating Scheduled Task..." -ForegroundColor Yellow
$fullPath = (Get-Location).Path + "\monitor-sm120.ps1"
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$fullPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:00AM

try {
    Unregister-ScheduledTask -TaskName "Check-PyTorch-sm120" -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName "Check-PyTorch-sm120" -Action $action -Trigger $trigger -Description "Check PyTorch sm_120 support weekly" | Out-Null
    Write-Host "  Scheduled Task created (runs every Monday 9AM)" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Could not create Scheduled Task" -ForegroundColor Yellow
}

# Step 4: First test run
Write-Host "[4/4] Running first check..." -ForegroundColor Yellow
$result = python test_sm120.py 2>&1
Write-Host "  Current status: " -NoNewline
if ($result -match 'SUPPORTED') {
    Write-Host "sm_120 SUPPORTED!" -ForegroundColor Green
} else {
    Write-Host "NOT YET (Expected for RTX 5090)" -ForegroundColor Yellow
}

# Summary
Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  - test_sm120.py (test script)" -ForegroundColor Gray
Write-Host "  - monitor-sm120.ps1 (monitor script)" -ForegroundColor Gray
Write-Host "  - pytorch_sm120_log.txt (log file - will be created on first run)" -ForegroundColor Gray
Write-Host "`nSchedule: Every Monday at 9:00 AM" -ForegroundColor Cyan
Write-Host "Manual check: .\monitor-sm120.ps1" -ForegroundColor Cyan
Write-Host "View log: Get-Content pytorch_sm120_log.txt`n" -ForegroundColor Cyan
