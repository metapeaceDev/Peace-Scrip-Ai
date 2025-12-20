# ComfyUI Video Generation Test Suite (PowerShell)
# Automated testing for AnimateDiff and SVD video generation

Write-Host "`n🧪 ComfyUI Video Generation Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8000"
$pass = 0
$fail = 0

# Test function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Body = $null
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $uri = "$baseUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing
        } else {
            $headers = @{
                "Content-Type" = "application/json"
            }
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body $Body -UseBasicParsing
        }
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $($response.StatusCode))"
            $script:pass++
            
            # Show response summary for some endpoints
            if ($Endpoint -match "/detect-models|/requirements") {
                $content = $response.Content
                if ($content.Length -gt 100) {
                    Write-Host "   Response: $($content.Substring(0, 100))..." -ForegroundColor Gray
                } else {
                    Write-Host "   Response: $content" -ForegroundColor Gray
                }
            }
            
            return $response.Content
        }
    } catch {
        Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
        return $null
    }
}

# Phase 1: Health Checks
Write-Host "`n📋 Phase 1: Health Checks" -ForegroundColor Yellow
Write-Host "------------------------`n"

Test-Endpoint -Name "Service Health" -Endpoint "/health"
Test-Endpoint -Name "Service Platform Info" -Endpoint "/health/platform"
Test-Endpoint -Name "Detailed Health Check" -Endpoint "/health/detailed"

# Phase 2: Video Model Detection
Write-Host "`n🎬 Phase 2: Video Model Detection" -ForegroundColor Yellow
Write-Host "--------------------------------`n"

Test-Endpoint -Name "Detect Video Models" -Endpoint "/api/video/detect-models"
Test-Endpoint -Name "Get Video Requirements" -Endpoint "/api/video/requirements?type=animatediff"
Test-Endpoint -Name "Get SVD Requirements" -Endpoint "/api/video/requirements?type=svd"

# Phase 3: Video Generation (requires authentication)
Write-Host "`n🎥 Phase 3: Video Generation Tests" -ForegroundColor Yellow
Write-Host "--------------------------------`n"

Write-Host "⚠️  Video generation tests require Firebase authentication" -ForegroundColor Yellow
Write-Host "   To test manually, use COMFYUI_VIDEO_QUICK_START.md guide`n" -ForegroundColor Gray

# Uncommment if you have a Firebase ID token
<#
$firebaseToken = "YOUR_FIREBASE_ID_TOKEN_HERE"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $firebaseToken"
}

$animateDiffBody = @{
    type = "animatediff"
    prompt = "A beautiful sunset over the ocean, cinematic"
    numFrames = 16
    fps = 8
    steps = 20
} | ConvertTo-Json

Write-Host "Testing AnimateDiff Generation... " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/video/generate" `
        -Method POST -Headers $headers -Body $animateDiffBody -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ PASS" -ForegroundColor Green
    Write-Host "   Job ID: $($result.jobId)" -ForegroundColor Gray
    Write-Host "   Queue Position: $($result.queuePosition)" -ForegroundColor Gray
    $script:pass++
    
    # Poll for progress
    $jobId = $result.jobId
    Write-Host "`n   Polling job status..." -ForegroundColor Gray
    
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        $statusResponse = Invoke-WebRequest -Uri "$baseUrl/api/video/status/$jobId" `
            -Method GET -Headers $headers -UseBasicParsing
        $status = $statusResponse.Content | ConvertFrom-Json
        
        Write-Host "   Progress: $($status.progress)% - $($status.status)" -ForegroundColor Cyan
        
        if ($status.status -eq "completed") {
            Write-Host "   ✅ Video generation completed!" -ForegroundColor Green
            Write-Host "   Video URL: $($status.videoUrl)" -ForegroundColor Gray
            break
        } elseif ($status.status -eq "failed") {
            Write-Host "   ❌ Video generation failed: $($status.error)" -ForegroundColor Red
            $script:fail++
            break
        }
    }
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
}
#>

# Phase 4: Queue Management
Write-Host "`n📊 Phase 4: Queue Management" -ForegroundColor Yellow
Write-Host "--------------------------`n"

Test-Endpoint -Name "Queue Statistics" -Endpoint "/api/queue/stats"
Test-Endpoint -Name "Active Jobs List" -Endpoint "/api/queue/jobs/active"
Test-Endpoint -Name "Waiting Jobs List" -Endpoint "/api/queue/jobs/waiting"

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Total Tests: $($pass + $fail)"
Write-Host "Passed: " -NoNewline
Write-Host "$pass" -ForegroundColor Green
Write-Host "Failed: " -NoNewline
Write-Host "$fail" -ForegroundColor Red

if ($fail -eq 0) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
    Write-Host "✅ ComfyUI service is healthy and ready`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed" -ForegroundColor Yellow
    Write-Host "📝 Check service logs for details`n" -ForegroundColor Yellow
    exit 1
}
