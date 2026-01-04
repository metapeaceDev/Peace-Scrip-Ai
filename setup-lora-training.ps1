# 🎨 LoRA Training Setup Script (Kohya SS)
# This script helps set up Kohya SS GUI for LoRA training

Write-Host "🎨 ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    LoRA Training Setup (Kohya SS)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check existing Kohya SS installation
$kohyaPath = "C:\Users\USER\Downloads\kohya_ss-25.2.1"
$kohyaExists = Test-Path $kohyaPath

if ($kohyaExists) {
    Write-Host "✅ Kohya SS found at $kohyaPath" -ForegroundColor Green
    Write-Host ""
    
    $choice = Read-Host "Do you want to (1) Launch GUI, (2) Re-setup, or (3) Download new? (1/2/3)"
    
    if ($choice -eq "1") {
        Write-Host "🚀 Launching Kohya SS GUI..." -ForegroundColor Cyan
        cd $kohyaPath
        Start-Process "cmd.exe" -ArgumentList "/c gui.bat"
        Write-Host "✅ Kohya SS GUI started! Check http://localhost:7860" -ForegroundColor Green
        exit 0
    }
    elseif ($choice -eq "2") {
        Write-Host "🔧 Running setup..." -ForegroundColor Yellow
        cd $kohyaPath
        .\setup.bat
        Write-Host "✅ Setup complete!" -ForegroundColor Green
        Write-Host "Run .\gui.bat to start" -ForegroundColor Cyan
        exit 0
    }
}

# Download Kohya SS
Write-Host "📦 Kohya SS not found. Setting up..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 You have two options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Download Kohya SS GUI (Recommended - Easiest)" -ForegroundColor Green
Write-Host "   - Pre-packaged with everything" -ForegroundColor Gray
Write-Host "   - Download: https://github.com/bmaltais/kohya_ss/releases" -ForegroundColor Gray
Write-Host "   - Size: ~3 GB" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Install from source (Advanced)" -ForegroundColor Yellow
Write-Host "   - Requires Python 3.10" -ForegroundColor Gray
Write-Host "   - Requires Git" -ForegroundColor Gray
Write-Host ""

$installChoice = Read-Host "Choose installation method (1/2)"

if ($installChoice -eq "1") {
    # Guide for manual download
    Write-Host ""
    Write-Host "📥 Manual Download Instructions:" -ForegroundColor Cyan
    Write-Host "1. Visit: https://github.com/bmaltais/kohya_ss/releases/latest" -ForegroundColor White
    Write-Host "2. Download: kohya_ss-windows.zip (~3 GB)" -ForegroundColor White
    Write-Host "3. Extract to: C:\kohya_ss\" -ForegroundColor White
    Write-Host "4. Run: C:\kohya_ss\gui.bat" -ForegroundColor White
    Write-Host ""
    
    $openBrowser = Read-Host "Open download page in browser? (Y/n)"
    if ($openBrowser -ne "n") {
        Start-Process "https://github.com/bmaltais/kohya_ss/releases/latest"
    }
}
elseif ($installChoice -eq "2") {
    # Source installation
    Write-Host ""
    Write-Host "🔧 Installing from source..." -ForegroundColor Yellow
    
    # Check Python
    try {
        $pythonVersion = python --version 2>&1
        Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Python not found!" -ForegroundColor Red
        Write-Host "Please install Python 3.10 first: https://www.python.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>&1
        Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Git not found!" -ForegroundColor Red
        Write-Host "Please install Git first: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
    
    # Clone repository
    Write-Host ""
    Write-Host "📥 Cloning Kohya SS repository..." -ForegroundColor Cyan
    cd C:\
    git clone https://github.com/bmaltais/kohya_ss.git
    
    if (!(Test-Path "C:\kohya_ss")) {
        Write-Host "❌ Clone failed!" -ForegroundColor Red
        exit 1
    }
    
    # Run setup
    Write-Host "🔧 Running setup script..." -ForegroundColor Cyan
    cd C:\kohya_ss
    .\setup.bat
    
    Write-Host ""
    Write-Host "✅ Kohya SS installed!" -ForegroundColor Green
    Write-Host "Run: C:\kohya_ss\gui.bat to start" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 ═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps for LoRA Training:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Prepare Training Images:" -ForegroundColor Cyan
Write-Host "   - Collect 10-20 photos of your face" -ForegroundColor White
Write-Host "   - Various angles: front, left, right, smile, neutral" -ForegroundColor White
Write-Host "   - Resolution: 512x512 or higher" -ForegroundColor White
Write-Host "   - Create folder: C:\lora-training\input\10_yourname\" -ForegroundColor White
Write-Host ""
Write-Host "2. Launch Kohya SS GUI:" -ForegroundColor Cyan
Write-Host "   cd C:\kohya_ss" -ForegroundColor White
Write-Host "   .\gui.bat" -ForegroundColor White
Write-Host ""
Write-Host "3. Train LoRA:" -ForegroundColor Cyan
Write-Host "   - Go to 'Dreambooth LoRA' tab" -ForegroundColor White
Write-Host "   - Select base model: sd_xl_base_1.0.safetensors" -ForegroundColor White
Write-Host "   - Set training images folder" -ForegroundColor White
Write-Host "   - Configure parameters:" -ForegroundColor White
Write-Host "     * Epochs: 10-15" -ForegroundColor Gray
Write-Host "     * Learning rate: 1e-4" -ForegroundColor Gray
Write-Host "     * Network Dimension: 32" -ForegroundColor Gray
Write-Host "     * Network Alpha: 16" -ForegroundColor Gray
Write-Host "   - Click 'Train'" -ForegroundColor White
Write-Host ""
Write-Host "4. Copy LoRA to ComfyUI:" -ForegroundColor Cyan
Write-Host "   Copy-Item 'C:\lora-training\output\yourname.safetensors' \" -ForegroundColor White
Write-Host "             'C:\Users\USER\ComfyUI\models\loras\'" -ForegroundColor White
Write-Host ""
Write-Host "5. Test in Peace Script AI:" -ForegroundColor Cyan
Write-Host "   - Restart frontend/backend" -ForegroundColor White
Write-Host "   - Go to Step 3 Character" -ForegroundColor White
Write-Host "   - Select 'Custom (LoRA)' mode" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - Kohya SS Guide: https://github.com/bmaltais/kohya_ss" -ForegroundColor Cyan
Write-Host "   - LoRA Training Tutorial: https://civitai.com/articles/2000" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Happy Training!" -ForegroundColor Green
