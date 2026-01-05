@echo off
echo ===================================================
echo  Checking Backend Logs
echo ===================================================
echo.

cd comfyui-service

if not exist backend_debug.log (
    echo [ERROR] Log file not found!
    echo Backend may not be running.
    echo Run restart-services.cmd first.
    pause
    exit
)

echo [SEARCHING FOR GENERATE REQUESTS]
echo.
findstr /C:"[MATCH]" /C:"[REQUEST]" /C:"[IMAGE]" /C:"[MODEL]" /C:"hasReferenceImage" backend_debug.log

if errorlevel 1 (
    echo.
    echo [NO RESULTS FOUND]
    echo.
    echo This means:
    echo   - No /generate requests have been made yet
    echo   - OR Backend is running old code
    echo.
    echo Please test by clicking "Generate Outfit (Face ID)" at:
    echo   http://localhost:5173/
    echo.
    echo Then run this script again.
) else (
    echo.
    echo [RESULTS ABOVE]
    echo.
    echo Look for:
    echo   - hasReferenceImage: true/false
    echo   - exists: true/false
    echo.
)

echo.
echo ===================================================
pause
