@echo off
setlocal
echo === GPU SNAPSHOT (nvidia-smi) ===
echo.
where nvidia-smi >nul 2>&1
if errorlevel 1 (
  echo [ERROR] nvidia-smi not found in PATH.
  echo Install NVIDIA drivers / CUDA, or run from a shell where nvidia-smi exists.
  exit /b 1
)
echo -- GPU summary --
nvidia-smi --query-gpu=name,driver_version,pstate,temperature.gpu,utilization.gpu,utilization.memory,memory.used,memory.total,power.draw,clocks.sm,clocks.mem --format=csv,noheader,nounits
echo.
echo -- Compute apps using VRAM --
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader,nounits
echo.
echo Tip: If memory.used is near memory.total but util.gpu is low,
echo      another process may be holding VRAM, or the workload is waiting on CPU/I-O.
endlocal
