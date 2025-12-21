@echo off
echo ========================================
echo ComfyUI Infrastructure Verification
echo ========================================
echo.

echo Checking environment files...
if exist .env (
    echo [OK] Frontend .env exists
) else (
    echo [ERROR] Frontend .env missing - Create from .env.example
)

if exist comfyui-service\.env (
    echo [OK] Backend .env exists
) else (
    echo [ERROR] Backend .env missing - Create in comfyui-service/
)

echo.
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    node --version
    echo [OK] Node.js installed
) else (
    echo [ERROR] Node.js not installed
)

echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% == 0 (
    for /f %%i in ('npm --version') do set NPM_VER=%%i
    echo [OK] npm v%NPM_VER% installed
) else (
    echo [ERROR] npm not installed
)

echo.
echo Checking dependencies...
if exist node_modules (
    echo [OK] Frontend dependencies installed
) else (
    echo [WARN] Frontend dependencies missing - Run: npm install
)

if exist comfyui-service\node_modules (
    echo [OK] Backend dependencies installed
) else (
    echo [WARN] Backend dependencies missing - Run: cd comfyui-service ^&^& npm install
)

echo.
echo Checking services...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] ComfyUI service is running on port 8000
) else (
    echo [WARN] ComfyUI service not running - Start with: cd comfyui-service ^&^& npm start
)

echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Set up infrastructure (if not done):
echo    - See: NEXT_STEPS_INFRASTRUCTURE.md
echo.
echo 2. Install dependencies:
echo    npm install
echo    cd comfyui-service ^&^& npm install
echo.
echo 3. Start services:
echo    cd comfyui-service ^&^& npm start
echo    npm run dev
echo.
echo 4. Open browser:
echo    http://localhost:5173
echo.
pause
