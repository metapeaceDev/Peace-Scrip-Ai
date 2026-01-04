#!/usr/bin/env pwsh
# =============================================================================
# Phase 2 Deployment Script - Hybrid System Setup
# =============================================================================
# This script helps you deploy ComfyUI + Gemini hybrid system
# 
# Usage: .\deploy-phase2.ps1
# =============================================================================

param(
    [string]$RunPodIP = "",
    [string]$RenderURL = "",
    [switch]$SkipBuild = $false,
    [switch]$Test = $false
)

$ErrorActionPreference = "Stop"

# Colors
$Green = @{ ForegroundColor = "Green" }
$Yellow = @{ ForegroundColor = "Yellow" }
$Red = @{ ForegroundColor = "Red" }
$Cyan = @{ ForegroundColor = "Cyan" }

Write-Host "`n🚀 Peace Script AI - Phase 2 Deployment" @Cyan
Write-Host "=" * 60 @Cyan
Write-Host ""

# =============================================================================
# Step 1: Verify Prerequisites
# =============================================================================
Write-Host "📋 Step 1: Verifying Prerequisites..." @Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" @Green
} catch {
    Write-Host "❌ Node.js not found! Please install from https://nodejs.org" @Red
    exit 1
}

# Check Firebase CLI
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI: $firebaseVersion" @Green
} catch {
    Write-Host "⚠️  Firebase CLI not found!" @Yellow
    Write-Host "   Install: npm install -g firebase-tools" @Yellow
}

# Check .env.production
if (-not (Test-Path ".env.production")) {
    Write-Host "⚠️  .env.production not found!" @Yellow
    Write-Host "   Creating from template..." @Yellow
    Copy-Item ".env.production.template" ".env.production"
}

Write-Host ""

# =============================================================================
# Step 2: Get Configuration
# =============================================================================
Write-Host "⚙️  Step 2: Configuration" @Yellow
Write-Host ""

if (-not $RunPodIP) {
    Write-Host "Enter your RunPod Public IP (e.g., 45.123.456.78):" @Cyan
    $RunPodIP = Read-Host "RunPod IP"
}

if (-not $RenderURL) {
    Write-Host "Enter your Render.com backend URL:" @Cyan
    Write-Host "(e.g., https://peace-script-backend.onrender.com)" @Cyan
    $RenderURL = Read-Host "Render URL"
}

if (-not $RenderURL.StartsWith("https://")) {
    $RenderURL = "https://$RenderURL"
}

Write-Host ""
Write-Host "Configuration:" @Cyan
Write-Host "  RunPod IP:    $RunPodIP" @Green
Write-Host "  Render URL:   $RenderURL" @Green
Write-Host ""

# =============================================================================
# Step 3: Test Connections
# =============================================================================
Write-Host "🧪 Step 3: Testing Connections..." @Yellow
Write-Host ""

# Test RunPod
Write-Host "Testing RunPod ComfyUI..." @Cyan
try {
    $response = Invoke-WebRequest -Uri "http://${RunPodIP}:8188" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ RunPod ComfyUI: OK (Status: $($response.StatusCode))" @Green
} catch {
    Write-Host "❌ RunPod ComfyUI: Failed!" @Red
    Write-Host "   Error: $($_.Exception.Message)" @Red
    Write-Host "   Please check:" @Yellow
    Write-Host "   1. RunPod pod is running" @Yellow
    Write-Host "   2. ComfyUI is started" @Yellow
    Write-Host "   3. Port 8188 is exposed" @Yellow
    Write-Host "   4. IP address is correct" @Yellow
    
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Test Render Backend
Write-Host "Testing Render Backend..." @Cyan
try {
    $response = Invoke-WebRequest -Uri "$RenderURL/health" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host "✅ Render Backend: OK (Status: $($response.StatusCode))" @Green
} catch {
    Write-Host "❌ Render Backend: Failed!" @Red
    Write-Host "   Error: $($_.Exception.Message)" @Red
    Write-Host "   Please check:" @Yellow
    Write-Host "   1. Render service is deployed" @Yellow
    Write-Host "   2. URL is correct" @Yellow
    Write-Host "   3. Service is not sleeping" @Yellow
    
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""

# =============================================================================
# Step 4: Update Environment Variables
# =============================================================================
Write-Host "📝 Step 4: Updating Environment Variables..." @Yellow
Write-Host ""

$envFile = ".env.production"
$envContent = Get-Content $envFile -Raw

# Update COMFYUI settings
$envContent = $envContent -replace "VITE_COMFYUI_ENABLED=false", "VITE_COMFYUI_ENABLED=true"
$envContent = $envContent -replace "VITE_USE_COMFYUI_BACKEND=false", "VITE_USE_COMFYUI_BACKEND=true"
$envContent = $envContent -replace "VITE_COMFYUI_SERVICE_URL=.*", "VITE_COMFYUI_SERVICE_URL=$RenderURL"

# Enable feature flags
$envContent = $envContent -replace "VITE_ENABLE_FACE_ID=false", "VITE_ENABLE_FACE_ID=true"
$envContent = $envContent -replace "VITE_ENABLE_CUSTOM_LORA=false", "VITE_ENABLE_CUSTOM_LORA=true"
$envContent = $envContent -replace "VITE_ENABLE_ADVANCED_FEATURES=false", "VITE_ENABLE_ADVANCED_FEATURES=true"

# Save
Set-Content $envFile $envContent
Write-Host "✅ Environment variables updated" @Green
Write-Host ""

# =============================================================================
# Step 5: Build Production
# =============================================================================
if (-not $SkipBuild) {
    Write-Host "🏗️  Step 5: Building Production..." @Yellow
    Write-Host ""
    
    $env:NODE_ENV = "production"
    
    Write-Host "Running: npm run build" @Cyan
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" @Red
        exit 1
    }
    
    Write-Host "✅ Build successful" @Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping build (--SkipBuild flag)" @Yellow
    Write-Host ""
}

# =============================================================================
# Step 6: Deploy to Firebase
# =============================================================================
if (-not $Test) {
    Write-Host "🚀 Step 6: Deploying to Firebase..." @Yellow
    Write-Host ""
    
    $deploy = Read-Host "Deploy to Firebase now? (Y/n)"
    if ($deploy -ne "n") {
        Write-Host "Running: firebase deploy --only hosting" @Cyan
        firebase deploy --only hosting
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Deployment failed!" @Red
            exit 1
        }
        
        Write-Host "✅ Deployment successful" @Green
        Write-Host ""
    }
} else {
    Write-Host "⏭️  Skipping deployment (--Test flag)" @Yellow
    Write-Host ""
}

# =============================================================================
# Step 7: Verification
# =============================================================================
Write-Host "🔍 Step 7: Verification..." @Yellow
Write-Host ""

Write-Host "Testing production site..." @Cyan
try {
    $response = Invoke-WebRequest -Uri "https://peace-script-ai.web.app" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production Site: OK (Status: $($response.StatusCode))" @Green
} catch {
    Write-Host "⚠️  Production Site: Not accessible yet (might need a few minutes)" @Yellow
}

Write-Host ""

# =============================================================================
# Summary
# =============================================================================
Write-Host "=" * 60 @Cyan
Write-Host "🎉 Phase 2 Deployment Complete!" @Green
Write-Host "=" * 60 @Cyan
Write-Host ""

Write-Host "📊 Configuration Summary:" @Cyan
Write-Host "  ✅ ComfyUI:     Enabled" @Green
Write-Host "  ✅ Gemini:      Enabled (fallback)" @Green
Write-Host "  ✅ RunPod:      http://${RunPodIP}:8188" @Green
Write-Host "  ✅ Backend:     $RenderURL" @Green
Write-Host "  ✅ Frontend:    https://peace-script-ai.web.app" @Green
Write-Host ""

Write-Host "🎯 Next Steps:" @Cyan
Write-Host "  1. Test image generation with 'ComfyUI SDXL' model" @Yellow
Write-Host "  2. Verify fallback works (stop RunPod → should use Gemini)" @Yellow
Write-Host "  3. Monitor costs (RunPod Dashboard → Billing)" @Yellow
Write-Host "  4. Upload custom LoRA models to RunPod" @Yellow
Write-Host "  5. Configure Face ID (InstantID)" @Yellow
Write-Host ""

Write-Host "📚 Documentation:" @Cyan
Write-Host "  - Full Guide: RUNPOD_SETUP_GUIDE.md" @Yellow
Write-Host "  - Quick Start: HYBRID_SETUP_QUICKSTART.md" @Yellow
Write-Host "  - Deployment: DEPLOYMENT_GUIDE.md" @Yellow
Write-Host ""

Write-Host "💰 Cost Monitoring:" @Cyan
Write-Host "  - RunPod: https://www.runpod.io/console → Billing" @Yellow
Write-Host "  - Render: https://dashboard.render.com → Metrics" @Yellow
Write-Host "  - Firebase: https://console.firebase.google.com" @Yellow
Write-Host ""

Write-Host "🚀 Deployment completed successfully!" @Green
Write-Host ""
