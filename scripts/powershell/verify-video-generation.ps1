
# Simple Video Generation Test

$baseUrl = "http://localhost:8000"

Write-Host "Testing Service Health..."
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "Health Check: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting Video Generation (AnimateDiff)..."
$body = @{
    prompt = "A beautiful sunset over the ocean, cinematic"
    numFrames = 16
    fps = 8
    steps = 20
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/video/generate/animatediff" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    
    if ($result.success -eq $true) {
        $jobId = $result.data.jobId
        Write-Host "Job Started! ID: $jobId" -ForegroundColor Green
        
        # Poll for status
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 2
            $statusResponse = Invoke-WebRequest -Uri "$baseUrl/api/video/job/$jobId" -UseBasicParsing
            $status = $statusResponse.Content | ConvertFrom-Json
            
            $state = $status.data.state
            $progress = $status.data.progress
            
            Write-Host "Status: $state - Progress: $progress%"
            
            if ($state -eq "completed") {
                Write-Host "Video Generation Completed!" -ForegroundColor Green
                Write-Host "Video URL: $($status.data.videoUrl)"
                exit 0
            }
            if ($state -eq "failed") {
                Write-Host "Video Generation Failed: $($status.data.error)" -ForegroundColor Red
                Write-Host "Reason: $($status.data.failedReason)" -ForegroundColor Red
                exit 1
            }
        }
        Write-Host "Timeout waiting for video generation." -ForegroundColor Yellow
    } else {
        Write-Host "Failed to start job: $($result.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Request Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}
