# WAN POC - VRAM and Performance Monitor
# Run this in a separate PowerShell window while testing

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      WAN POC - Real-Time Performance Monitor          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Monitoring RTX 5090 Performance..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$iteration = 0
$maxVRAM = 0
$maxGPU = 0

while ($true) {
    $iteration++
    
    # Get GPU stats
    $stats = nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu,utilization.memory,temperature.gpu --format=csv,noheader,nounits
    
    if ($stats) {
        $parts = $stats -split ','
        $vramUsed = [int]$parts[0].Trim()
        $vramTotal = [int]$parts[1].Trim()
        $gpuUtil = [int]$parts[2].Trim()
        $memUtil = [int]$parts[3].Trim()
        $temp = [int]$parts[4].Trim()
        
        # Calculate percentages
        $vramPercent = [math]::Round(($vramUsed / $vramTotal) * 100, 1)
        $vramGB = [math]::Round($vramUsed / 1024, 2)
        
        # Track maximums
        if ($vramUsed -gt $maxVRAM) { $maxVRAM = $vramUsed }
        if ($gpuUtil -gt $maxGPU) { $maxGPU = $gpuUtil }
        
        # Color coding
        $vramColor = switch ($vramPercent) {
            {$_ -lt 40} { "Green" }
            {$_ -lt 70} { "Yellow" }
            default { "Red" }
        }
        
        $gpuColor = switch ($gpuUtil) {
            {$_ -lt 30} { "Gray" }
            {$_ -lt 80} { "Green" }
            default { "Cyan" }
        }
        
        $tempColor = switch ($temp) {
            {$_ -lt 70} { "Green" }
            {$_ -lt 80} { "Yellow" }
            default { "Red" }
        }
        
        # Display current stats
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
        Write-Host "VRAM: " -NoNewline
        Write-Host "$vramGB GB " -NoNewline -ForegroundColor $vramColor
        Write-Host "($vramPercent%) " -NoNewline -ForegroundColor $vramColor
        Write-Host "| GPU: " -NoNewline
        Write-Host "$gpuUtil% " -NoNewline -ForegroundColor $gpuColor
        Write-Host "| Temp: " -NoNewline
        Write-Host "${temp}°C " -NoNewline -ForegroundColor $tempColor
        Write-Host "| Peak VRAM: " -NoNewline
        Write-Host "$([math]::Round($maxVRAM/1024,2)) GB" -ForegroundColor Magenta
        
        # Warnings
        if ($vramPercent -gt 90) {
            Write-Host "  ⚠️  WARNING: VRAM usage critical!" -ForegroundColor Red
        }
        
        if ($temp -gt 85) {
            Write-Host "  ⚠️  WARNING: High temperature!" -ForegroundColor Red
        }
        
        # Summary every 30 iterations (~1 minute)
        if ($iteration % 30 -eq 0) {
            Write-Host "`n--- 1 Minute Summary ---" -ForegroundColor Cyan
            Write-Host "Max VRAM: $([math]::Round($maxVRAM/1024,2)) GB" -ForegroundColor Magenta
            Write-Host "Max GPU Util: $maxGPU%" -ForegroundColor Magenta
            Write-Host "Current Temp: ${temp}°C" -ForegroundColor $tempColor
            Write-Host "------------------------`n" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "[$((Get-Date -Format 'HH:mm:ss'))] Unable to read GPU stats" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}
