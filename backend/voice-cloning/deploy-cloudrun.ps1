# Voice Cloning - Cloud Run Deployment Script
# Run this after Docker image builds successfully

Write-Host "🚀 Deploying Voice Cloning to Google Cloud Run..." -ForegroundColor Cyan

# Add gcloud to PATH
$env:Path += ";$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"

# Deploy to Cloud Run
Write-Host "`n📦 Deploying service..." -ForegroundColor Yellow
gcloud run deploy voice-cloning `
  --image gcr.io/peace-script-ai/voice-cloning `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --memory 4Gi `
  --cpu 2 `
  --timeout 300 `
  --max-instances 3 `
  --min-instances 0 `
  --port 8001

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    
    # Get service URL
    Write-Host "`n🔗 Getting service URL..." -ForegroundColor Yellow
    $serviceUrl = gcloud run services describe voice-cloning --region us-central1 --format="value(status.url)"
    
    Write-Host "`n📋 Service URL: $serviceUrl" -ForegroundColor Cyan
    
    # Test health endpoint
    Write-Host "`n🏥 Testing health endpoint..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$serviceUrl/health" -ErrorAction SilentlyContinue
    
    if ($response) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor White
    } else {
        Write-Host "⚠️ Health check failed - service may still be starting" -ForegroundColor Yellow
    }
    
    # Show next steps
    Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Update .env.production with:" -ForegroundColor White
    Write-Host "   VITE_VOICE_CLONING_ENDPOINT=$serviceUrl" -ForegroundColor Yellow
    Write-Host "`n2. Rebuild frontend:" -ForegroundColor White
    Write-Host "   npm run build" -ForegroundColor Yellow
    Write-Host "`n3. Deploy to Firebase:" -ForegroundColor White
    Write-Host "   firebase deploy --only hosting" -ForegroundColor Yellow
    
    # Save URL to file
    $serviceUrl | Out-File -FilePath "voice-cloning-url.txt" -Encoding UTF8
    Write-Host "`n✅ Service URL saved to voice-cloning-url.txt" -ForegroundColor Green
    
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check logs at: https://console.cloud.google.com/run" -ForegroundColor Yellow
}
