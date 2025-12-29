# Video Generation Test Report Script
# Run this after video generation completes

param(
    [Parameter(Mandatory=$true)]
    [string]$JobId
)

Write-Host "=== 📊 VIDEO GENERATION TEST REPORT ===" -ForegroundColor Magenta
Write-Host "Job ID: $JobId`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/video/job/$JobId" -Method Get -ErrorAction Stop
    
    Write-Host "✅ Job Status Retrieved`n" -ForegroundColor Green
    
    # Basic Info
    Write-Host "📋 Basic Information:" -ForegroundColor Cyan
    Write-Host "  State: $($response.data.state)" -ForegroundColor White
    Write-Host "  Progress: $($response.data.progress)%" -ForegroundColor White
    Write-Host "  Created: $([DateTimeOffset]::FromUnixTimeMilliseconds($response.data.createdAt).LocalDateTime)" -ForegroundColor White
    
    # Check for result
    if ($response.data.result) {
        Write-Host "`n📦 Result Object:" -ForegroundColor Cyan
        $resultKeys = $response.data.result.PSObject.Properties.Name
        Write-Host "  Keys: $($resultKeys -join ', ')" -ForegroundColor White
        
        # Check video URL
        if ($response.data.result.videoUrl) {
            Write-Host "`n✅ VIDEO URL EXISTS!" -ForegroundColor Green
            Write-Host "  URL: $($response.data.result.videoUrl)" -ForegroundColor White
            
            # Try to get file size
            try {
                $headResponse = Invoke-WebRequest -Uri $response.data.result.videoUrl -Method Head -ErrorAction Stop
                $sizeBytes = [long]$headResponse.Headers.'Content-Length'
                $sizeMB = [math]::Round($sizeBytes / 1MB, 2)
                Write-Host "  Size: $sizeMB MB ($sizeBytes bytes)" -ForegroundColor White
                Write-Host "  Content-Type: $($headResponse.Headers.'Content-Type')" -ForegroundColor White
            } catch {
                Write-Host "  ⚠️ Could not verify file (might need auth)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "`n❌ NO VIDEO URL!" -ForegroundColor Red
        }
        
        # Check for errors
        if ($response.data.result.storageError) {
            Write-Host "`n❌ STORAGE ERROR FOUND:" -ForegroundColor Red
            Write-Host "  Error: $($response.data.result.storageError)" -ForegroundColor White
        }
        
        # Additional metadata
        if ($response.data.result.workerId) {
            Write-Host "`n🔧 Processing Details:" -ForegroundColor Cyan
            Write-Host "  Worker: $($response.data.result.workerId)" -ForegroundColor White
            if ($response.data.result.processingTime) {
                $timeSeconds = [math]::Round($response.data.result.processingTime / 1000, 1)
                Write-Host "  Processing Time: $timeSeconds seconds" -ForegroundColor White
            }
            if ($response.data.result.numFrames) {
                Write-Host "  Frames: $($response.data.result.numFrames)" -ForegroundColor White
            }
            if ($response.data.result.fps) {
                Write-Host "  FPS: $($response.data.result.fps)" -ForegroundColor White
            }
        }
        
        # Full result JSON
        Write-Host "`n📄 Full Result (JSON):" -ForegroundColor Cyan
        $response.data.result | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
        
    } else {
        Write-Host "`n❌ NO RESULT OBJECT!" -ForegroundColor Red
        Write-Host "  This means the job completed but result was not saved" -ForegroundColor Yellow
        Write-Host "  Check if MockQueue updated localJobs correctly" -ForegroundColor Yellow
    }
    
    # Test verdict
    Write-Host "`n" + ("="*80) -ForegroundColor Gray
    Write-Host "🎯 TEST VERDICT:" -ForegroundColor Magenta
    
    if ($response.data.state -eq 'completed' -and 
        $response.data.result -and 
        $response.data.result.videoUrl -and 
        !$response.data.result.storageError) {
        Write-Host "✅ TEST PASSED - Video generation successful!" -ForegroundColor Green
        Write-Host "   - Job completed" -ForegroundColor Green
        Write-Host "   - Result object exists" -ForegroundColor Green
        Write-Host "   - Video URL present" -ForegroundColor Green
        Write-Host "   - No storage errors" -ForegroundColor Green
    } else {
        Write-Host "❌ TEST FAILED - Issues detected:" -ForegroundColor Red
        if ($response.data.state -ne 'completed') {
            Write-Host "   - Job not completed (state: $($response.data.state))" -ForegroundColor Red
        }
        if (!$response.data.result) {
            Write-Host "   - No result object" -ForegroundColor Red
        }
        if ($response.data.result -and !$response.data.result.videoUrl) {
            Write-Host "   - No video URL" -ForegroundColor Red
        }
        if ($response.data.result -and $response.data.result.storageError) {
            Write-Host "   - Storage error: $($response.data.result.storageError)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ ERROR: $_" -ForegroundColor Red
    Write-Host "   Job may not exist or backend is down" -ForegroundColor Yellow
}

Write-Host "`n" + ("="*80) -ForegroundColor Gray
