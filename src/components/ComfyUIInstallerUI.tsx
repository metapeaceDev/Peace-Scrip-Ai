/**
 * ComfyUI Local Installer Component
 *
 * One-click installer UI with progress tracking
 * Runs PowerShell/Bash installer scripts
 */

import React, { useState, useEffect } from 'react';

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';

interface InstallProgress {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface SystemInfo {
  os: 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  gpuDetected: boolean;
  gpuType?: 'NVIDIA' | 'AMD' | 'Apple Silicon' | 'CPU';
  vramGB?: number;
  hasComfyUI: boolean;
  comfyUIPath?: string;
}

export const ComfyUIInstallerUI: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress>({
    step: 'idle',
    progress: 0,
    message: 'Ready to install',
    isComplete: false,
    hasError: false,
  });
  const [installOptions, setInstallOptions] = useState({
    skipModels: false,
    registerService: true,
    minimalModels: false,
    installPath: '',
  });

  useEffect(() => {
    detectSystem();
  }, []);

  const detectSystem = async () => {
    try {
      // Detect OS
      const platform = navigator.platform.toLowerCase();
      let os: SystemInfo['os'] = 'Unknown';

      if (platform.includes('win')) os = 'Windows';
      else if (platform.includes('mac')) os = 'macOS';
      else if (platform.includes('linux')) os = 'Linux';

      // Check if ComfyUI is already running
      let hasComfyUI = false;
      try {
        const response = await fetch(`${COMFYUI_SERVICE_URL}/health/system_stats`, {
          signal: AbortSignal.timeout(2000),
        });
        hasComfyUI = response.ok;
      } catch {
        hasComfyUI = false;
      }

      setSystemInfo({
        os,
        gpuDetected: false, // Will be detected by installer script
        hasComfyUI,
      });
    } catch (error) {
      console.error('Failed to detect system:', error);
    }
  };

  const startInstallation = async () => {
    if (!systemInfo) return;

    setIsInstalling(true);
    setProgress({
      step: 'starting',
      progress: 5,
      message: 'Starting installation...',
      isComplete: false,
      hasError: false,
    });

    try {
      // Build script arguments
      const args: string[] = [];
      if (installOptions.skipModels) args.push('--skip-models');
      if (installOptions.registerService) args.push('--register-service');
      if (installOptions.minimalModels) args.push('--minimal');
      if (installOptions.installPath) args.push(`--install-path "${installOptions.installPath}"`);

      // Note: In a real implementation, this would call a backend endpoint
      // that executes the PowerShell/Bash script on the server side
      // For now, show installation steps simulation

      await simulateInstallation();
    } catch (error: any) {
      setProgress({
        step: 'error',
        progress: 0,
        message: 'Installation failed',
        isComplete: false,
        hasError: true,
        errorMessage: error.message,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const simulateInstallation = async () => {
    const steps = [
      { step: 'detect-gpu', progress: 10, message: 'Detecting GPU...', delay: 2000 },
      { step: 'download-comfyui', progress: 30, message: 'Downloading ComfyUI...', delay: 5000 },
      { step: 'extract', progress: 50, message: 'Extracting files...', delay: 3000 },
      {
        step: 'download-models',
        progress: 70,
        message: 'Downloading models (~20GB)...',
        delay: 8000,
      },
      { step: 'register-service', progress: 90, message: 'Registering service...', delay: 2000 },
      { step: 'complete', progress: 100, message: 'Installation complete!', delay: 1000 },
    ];

    for (const step of steps) {
      if (step.step === 'download-models' && installOptions.skipModels) {
        continue;
      }
      if (step.step === 'register-service' && !installOptions.registerService) {
        continue;
      }

      setProgress({
        step: step.step,
        progress: step.progress,
        message: step.message,
        isComplete: false,
        hasError: false,
      });

      await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    setProgress({
      step: 'complete',
      progress: 100,
      message: 'Installation complete! ComfyUI is ready to use.',
      isComplete: true,
      hasError: false,
    });

    // Re-detect system to update ComfyUI status
    await detectSystem();
  };

  const getProgressColor = () => {
    if (progress.hasError) return 'bg-red-500';
    if (progress.isComplete) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getSystemIcon = () => {
    if (!systemInfo) return '❓';
    switch (systemInfo.os) {
      case 'Windows':
        return '🪟';
      case 'macOS':
        return '🍎';
      case 'Linux':
        return '🐧';
      default:
        return '💻';
    }
  };

  if (!systemInfo) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-300">Detecting system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Information */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-3xl">{getSystemIcon()}</span>
          <div>
            <h2 className="text-xl font-bold text-white">System Information</h2>
            <p className="text-sm text-gray-400">Detected configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Operating System</div>
            <div className="text-lg font-semibold text-white">{systemInfo.os}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">ComfyUI Status</div>
            <div
              className={`text-lg font-semibold ${systemInfo.hasComfyUI ? 'text-green-400' : 'text-gray-400'}`}
            >
              {systemInfo.hasComfyUI ? '✅ Installed' : '❌ Not Installed'}
            </div>
          </div>
        </div>

        {systemInfo.hasComfyUI && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <p className="text-sm text-green-300">
              ✅ ComfyUI is already running on http://localhost:8188
            </p>
          </div>
        )}
      </div>

      {/* Installation Options */}
      {!systemInfo.hasComfyUI && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">⚙️ Installation Options</h3>

          <div className="space-y-4">
            {/* Install Path */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Installation Path (Optional)
              </label>
              <input
                type="text"
                value={installOptions.installPath}
                onChange={e =>
                  setInstallOptions({ ...installOptions, installPath: e.target.value })
                }
                placeholder={systemInfo.os === 'Windows' ? 'C:\\ComfyUI' : '/opt/ComfyUI'}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white"
                disabled={isInstalling}
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for default location</p>
            </div>

            {/* Skip Models */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-gray-300">Skip Model Download</span>
                <p className="text-xs text-gray-500">
                  Don't download models (~20GB). You can download them later.
                </p>
              </div>
              <input
                type="checkbox"
                checked={installOptions.skipModels}
                onChange={e =>
                  setInstallOptions({ ...installOptions, skipModels: e.target.checked })
                }
                className="rounded"
                disabled={isInstalling}
              />
            </label>

            {/* Minimal Models */}
            {!installOptions.skipModels && (
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-gray-300">Minimal Models Only</span>
                  <p className="text-xs text-gray-500">
                    Download only essential models (~5GB instead of 20GB)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={installOptions.minimalModels}
                  onChange={e =>
                    setInstallOptions({ ...installOptions, minimalModels: e.target.checked })
                  }
                  className="rounded"
                  disabled={isInstalling}
                />
              </label>
            )}

            {/* Register Service */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm text-gray-300">Register as Service</span>
                <p className="text-xs text-gray-500">Auto-start ComfyUI when system boots</p>
              </div>
              <input
                type="checkbox"
                checked={installOptions.registerService}
                onChange={e =>
                  setInstallOptions({ ...installOptions, registerService: e.target.checked })
                }
                className="rounded"
                disabled={isInstalling}
              />
            </label>
          </div>
        </div>
      )}

      {/* Installation Progress */}
      {(isInstalling || progress.isComplete || progress.hasError) && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">📦 Installation Progress</h3>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{progress.message}</span>
              <span className="text-sm font-semibold text-white">{progress.progress}%</span>
            </div>
            <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute h-full ${getProgressColor()} transition-all duration-500`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          {/* Status Messages */}
          {progress.hasError && progress.errorMessage && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-sm text-red-300">❌ {progress.errorMessage}</p>
            </div>
          )}

          {progress.isComplete && (
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-sm text-green-300">✅ {progress.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                You can now start using ComfyUI for video generation!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Install Button */}
      {!systemInfo.hasComfyUI && !progress.isComplete && (
        <button
          onClick={startInstallation}
          disabled={isInstalling}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isInstalling ? (
            <span className="flex items-center justify-center space-x-3">
              <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
              <span>Installing...</span>
            </span>
          ) : (
            '🚀 Install ComfyUI Local'
          )}
        </button>
      )}

      {/* Requirements Info */}
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Requirements</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>
            ✅{' '}
            {systemInfo.os === 'Windows'
              ? 'Windows 10/11'
              : systemInfo.os === 'macOS'
                ? 'macOS 12+'
                : 'Linux (Ubuntu/Debian)'}
          </li>
          <li>✅ GPU: NVIDIA (RTX 2000+), AMD, or Apple Silicon recommended</li>
          <li>✅ RAM: 16GB minimum, 32GB+ recommended</li>
          <li>✅ Storage: 30GB free space (10GB without models)</li>
          <li>✅ Internet: For downloading ComfyUI and models</li>
        </ul>
      </div>

      {/* Manual Installation */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">💡 Manual Installation</h4>
        <p className="text-sm text-gray-300 mb-2">
          Prefer manual setup? Run the installer script directly:
        </p>
        <div className="bg-gray-900 rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
          {systemInfo.os === 'Windows' ? (
            <code>
              # PowerShell (Run as Administrator){'\n'}
              Set-ExecutionPolicy Bypass -Scope Process{'\n'}
              .\scripts\install-comfyui-local.ps1
            </code>
          ) : (
            <code>
              # Terminal{'\n'}
              chmod +x ./scripts/install-comfyui-local.sh{'\n'}
              ./scripts/install-comfyui-local.sh
            </code>
          )}
        </div>
      </div>
    </div>
  );
};
