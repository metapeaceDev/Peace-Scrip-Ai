@echo off
echo ===================================================
echo  Restarting Peace Script Services
echo ===================================================
echo.

echo [1/5] Killing existing Node.js processes...
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$root = (Resolve-Path '.').Path; $procs = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -and ($_.CommandLine -like ('*' + $root.Replace('\\','\\\\') + '*')) }; if (-not $procs) { Write-Output 'INFO: No project node processes running'; exit 0 }; foreach($p in $procs){ try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Output ('stopped PID ' + $p.ProcessId) } catch { Write-Output ('could not stop PID ' + $p.ProcessId + ': ' + $_.Exception.Message) } }" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/5] Clearing old logs...
del /Q comfyui-service\backend_debug.log >nul 2>&1

echo [3/5] Starting Backend (port 8000)...
cd comfyui-service
start "Backend Server" cmd /k "node src/server.js > backend_debug.log 2>&1"
cd ..
timeout /t 3 /nobreak >nul

echo [4/5] Starting Frontend (port 5173)...
start "Frontend Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo [5/5] Opening browser...
start http://localhost:5173/

echo.
echo ===================================================
echo  Services Started Successfully!
echo ===================================================
echo  Backend: http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
echo  Check logs in comfyui-service\backend_debug.log
echo ===================================================
pause
