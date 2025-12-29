# Start Frontend (Vite) Server
# This script ensures environment variables are loaded correctly

Write-Host "`n🚀 Starting Peace Script AI Frontend...`n" -ForegroundColor Cyan

# Change to project directory
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "📁 Working Directory: $projectPath" -ForegroundColor Gray

# Verify .env file
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    # Display important environment variables
    Write-Host "`n📋 Environment Configuration:" -ForegroundColor Yellow
    Get-Content .env | Select-String -Pattern "^VITE_" | Select-Object -First 10 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor White
    }
} else {
    Write-Host "❌ WARNING: .env file not found!" -ForegroundColor Red
}

Write-Host "`n🎬 Starting Vite dev server...`n" -ForegroundColor Green

# Start Vite
npm run dev
