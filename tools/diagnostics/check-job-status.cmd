@echo off
REM Quick job status check - ASCII only
echo.
echo === JOB STATUS CHECK ===
echo.

echo Querying backend for job: ed56c0c8-894a-4a85-81a3-0ddd4547e466
curl -s "http://localhost:8000/api/video/job/ed56c0c8-894a-4a85-81a3-0ddd4547e466"
echo.
echo.

echo === QUEUE STATUS ===
curl -s "http://localhost:8000/api/queue/status"
echo.
echo.

echo === COMFYUI QUEUE (if running on 8188) ===
curl -s "http://localhost:8188/queue" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ComfyUI not responding on port 8188
)
echo.

echo.
echo === ANALYSIS ===
echo If job status shows "completed" - the video is done but UI didnt update
echo If job status shows "processing" at 95 percent - stuck in old code upload phase
echo If ComfyUI queue is empty - generation is complete, backend is uploading
echo.
echo NEXT STEPS:
echo 1. If job is completed: Refresh browser to see result
echo 2. If job is stuck: Start a NEW video generation to test the fix
echo 3. New jobs will use updated code with smooth 95-99-100 progress
echo.
