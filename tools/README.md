# Project Tools

Utility scripts and tools for development, diagnostics, and operations.

## Directory Structure

### 📊 diagnostics/ (9 scripts)
Diagnostic and monitoring scripts
- `check-*.cmd`, `check-*.ps1` - Health checks
- `diagnose-*.cmd`, `diagnose-*.ps1` - System diagnostics
- `check-status.html` - Status dashboard

### ⚙️ operations/ (5 scripts)
Operational scripts for running services
- `start-comfyui-service.ps1` - Start ComfyUI service
- `restart-services.cmd`, `quick-restart.cmd` - Restart services
- `manage-comfyui-queue.ps1` - Queue management
- `NEXT-STEP.cmd` - Next action guide

### 🛠️ setup/ (9 scripts)
Installation and setup scripts
- `install-*.ps1` - Package installations
- `download-*.ps1` - Model downloads
- `setup-*.ps1` - Configuration scripts
- `place-*.cmd`, `deploy-*.ps1` - Deployment helpers

## Usage

Most scripts are PowerShell (.ps1) for Windows or CMD (.cmd) batch files.

Run with appropriate permissions and check script documentation for requirements.

## Examples

```powershell
# Start ComfyUI service
.\operations\start-comfyui-service.ps1

# Check system status
.\diagnostics\check-status.html

# Install models
.\setup\install-insightface-models.ps1
```
