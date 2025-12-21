# Test ComfyUI Video Generation API
# Tests the AnimateDiff endpoint with simple prompt

Write-Host "`n🎬 Testing Video Generation API..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

# Test AnimateDiff endpoint
$apiUrl = "http://localhost:8000/api/video/generate/animatediff"
$body = @{
    prompt = "A peaceful ocean wave, smooth motion, cinematic"
    negativePrompt = "blurry, distorted, low quality"
    numFrames = 16
    fps = 8
    width = 512
    height = 512
    seed = -1
} | ConvertTo-Json

Write-Host "📤 Request:" -ForegroundColor Yellow
Write-Host "   URL: $apiUrl"
Write-Host "   Prompt: $($body | ConvertFrom-Json | Select-Object -ExpandProperty prompt)"
Write-Host "   Frames: $($body | ConvertFrom-Json | Select-Object -ExpandProperty numFrames)"
Write-Host "`n⏳ Generating video (this may take 30-60 seconds)...`n" -ForegroundColor Cyan

$response = $null
try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
    
    Write-Host "`n✅ Video Generated Successfully!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
    
    Write-Host "📊 Response:" -ForegroundColor Yellow
    Write-Host "   Job ID: $($response.jobId)"
    Write-Host "   Status: $($response.status)"
    
    if ($response.videoUrl) {
        Write-Host "   Video URL: $($response.videoUrl)" -ForegroundColor Green
    }
    
    if ($response.storageUrl) {
        Write-Host "   Storage URL: $($response.storageUrl)" -ForegroundColor Green
    }
    
    Write-Host "`n✅ Full Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "`n❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.ErrorDetails) {
        Write-Host "`nDetails:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Test completed`n" -ForegroundColor Cyan
