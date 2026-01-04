@echo off
setlocal
where nvidia-smi >nul 2>&1
if errorlevel 1 (
  echo [ERROR] nvidia-smi not found in PATH.
  exit /b 1
)
echo === GPU WATCH (updates every 1s) ===
echo Press Ctrl+C to stop.
echo.
:loop
for /f "usebackq tokens=*" %%L in (`nvidia-smi --query-gpu=pstate,utilization.gpu,utilization.memory,memory.used,memory.total,power.draw,temperature.gpu --format=csv,noheader,nounits`) do (
  echo %date% %time%  %%L
)
ping 127.0.0.1 -n 2 >nul
goto loop
