$logFile = "pytorch_sm120_log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
"[$timestamp] Checking..." | Out-File -Append $logFile
$result = python test_sm120.py 2>&1 | Out-String
if ($result -match 'SUPPORTED') {
    "SUCCESS! sm_120 supported" | Out-File -Append $logFile
    Write-Host "`n=== PYTORCH sm_120 SUPPORTED! ===" -ForegroundColor Green
    Write-Host "Your RTX 5090 is now ready to use!" -ForegroundColor Cyan
} else {
    "Not yet: $result" | Out-File -Append $logFile
}
