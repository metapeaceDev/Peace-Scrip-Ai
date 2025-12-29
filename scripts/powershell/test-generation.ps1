# Test ComfyUI Generation API
Write-Host "Testing ComfyUI Generation API..." -ForegroundColor Cyan

$body = @{
    prompt = "beautiful landscape, mountains, sunset, 4k"
    workflow = "text-to-image"
    type = "image"
    model = "sdxl"
} | ConvertTo-Json

Write-Host "Sending request to http://localhost:8000/api/comfyui/generate" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/comfyui/generate" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 60 `
        -ErrorAction Stop
    
    Write-Host "`n✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`n❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code:" $_.Exception.Response.StatusCode -ForegroundColor Red
    }
}
