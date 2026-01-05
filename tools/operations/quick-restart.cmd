@echo off
echo ===================================================
echo  Quick Restart - Killing Node and Restarting
echo ===================================================
echo.

echo [1/3] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: All Node processes killed
) else (
    echo INFO: No Node processes running
)
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Clearing old log...
del /Q comfyui-service\backend_debug.log >nul 2>&1

echo.
echo [3/3] Restarting with restart-services.cmd...
call restart-services.cmd

echo.
echo DONE!
