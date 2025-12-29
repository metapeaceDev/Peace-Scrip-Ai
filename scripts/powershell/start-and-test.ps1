# Start backend and test generation

# Kill existing processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Change to backend directory
Set-Location "c:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service"

# Start backend as background job
Write-Host "Starting backend service..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    Set-Location "c:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1\comfyui-service"
    node src/server.js 2>&1 | ForEach-Object { Write-Output $_ }
}

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check if backend is running
$listening = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($listening) {
    Write-Host "✅ Backend is running on port 8000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend failed to start" -ForegroundColor Red
    Receive-Job -Job $job
    Remove-Job -Job $job -Force
    exit 1
}

# Show recent job output
Write-Host "`n==== Backend Output ====" -ForegroundColor Cyan
Receive-Job -Job $job

# Test generation
Write-Host "`n==== Testing Generation API ====" -ForegroundColor Cyan
$body = @{
    prompt = "beautiful landscape, mountains, sunset, 4k"
    workflow = "text-to-image"
    type = "image"
    model = "sdxl"
} | ConvertTo-Json

try {
    Write-Host "Sending request..." -ForegroundColor Yellow
    $response = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/comfyui/generate" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 120 `
        -ErrorAction Stop
    
    Write-Host "`n✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`n❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Show more backend output
    Write-Host "`n==== Recent Backend Output ====" -ForegroundColor Cyan
    Receive-Job -Job $job
}

# Cleanup
Write-Host "`nPress any key to stop backend and exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Job -Job $job -ErrorAction SilentlyContinue
Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
