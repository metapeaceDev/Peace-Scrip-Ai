import React, { useState, useEffect } from 'react';
import {
  checkComfyUIStatus,
  getInstallInstructions,
  saveComfyUIUrl,
  type ComfyUIStatus,
} from '../services/comfyuiInstaller';

interface ComfyUISetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const ComfyUISetup: React.FC<ComfyUISetupProps> = ({ onComplete, onSkip }) => {
  const [status, setStatus] = useState<ComfyUIStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [customUrl, setCustomUrl] = useState(
    import.meta.env.VITE_COMFYUI_URL || 'http://localhost:8188'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const instructions = getInstallInstructions();

  const checkStatus = async () => {
    setChecking(true);
    const result = await checkComfyUIStatus();
    setStatus(result);
    setChecking(false);

    if (result.running) {
      // Auto-save the working URL (but NEVER save Cloudflare URLs!)
      if (result.url && !result.url.includes('trycloudflare.com')) {
        saveComfyUIUrl(result.url);
      } else if (result.url?.includes('trycloudflare.com')) {
        console.warn('⚠️ ComfyUISetup: Skipping save of Cloudflare URL:', result.url);
      }
      // Auto-close after 2 seconds
      setTimeout(onComplete, 2000);
    }
  };

  useEffect(() => {
    checkStatus();
    // Check every 10 seconds (reduced frequency to avoid spam)
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    window.open(instructions.downloadUrl, '_blank');
  };

  const handleSkipToCloud = () => {
    // Guide user to use cloud ComfyUI (e.g., RunPod, Vast.ai)
    window.open('https://www.runpod.io/console/gpu-cloud', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-cyan-500/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-cyan-500/10 rounded-full mb-4">
            <svg
              className="w-16 h-16 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">ComfyUI Required</h2>
          <p className="text-gray-400">
            Peace Script AI uses ComfyUI for professional-quality Face ID generation with LoRA
            models
          </p>
        </div>

        {/* Status */}
        <div
          className={`mb-6 p-4 rounded-lg border ${
            status?.running
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                <span className="text-white">Checking ComfyUI status...</span>
              </>
            ) : status?.running ? (
              <>
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <div className="text-green-400 font-semibold">✅ ComfyUI is Running!</div>
                  <div className="text-green-300/70 text-sm">Connected to {status.url}</div>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <div className="text-amber-400 font-semibold">⚠️ ComfyUI Not Running</div>
                  <div className="text-amber-300/70 text-sm">
                    {status?.error || 'Please install and start ComfyUI'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {!status?.running && (
          <>
            {/* Installation Instructions */}
            <div className="mb-6 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                📦 Installation for{' '}
                {instructions.os === 'windows'
                  ? 'Windows'
                  : instructions.os === 'mac'
                    ? 'macOS'
                    : instructions.os === 'linux'
                      ? 'Linux'
                      : 'Your System'}
              </h3>
              <ol className="space-y-2 mb-4">
                {instructions.instructions.map((step, i) => (
                  <li key={i} className="text-gray-300 text-sm">
                    {step}
                  </li>
                ))}
              </ol>

              {/* Download Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download ComfyUI
                </button>
                <button
                  onClick={checkStatus}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🔄 Check Again
                </button>
              </div>
            </div>

            {/* Cloud Option */}
            <div className="mb-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">
                ☁️ Don&apos;t want to install locally?
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Use cloud ComfyUI on RunPod or Vast.ai (starts at $0.20/hour)
              </p>
              <button
                onClick={handleSkipToCloud}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Setup Cloud ComfyUI →
              </button>
            </div>

            {/* Advanced: Custom URL */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-gray-400 text-sm hover:text-white transition-colors mb-3"
            >
              ⚙️ Advanced: Custom ComfyUI URL {showAdvanced ? '▼' : '▶'}
            </button>

            {showAdvanced && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <label className="block text-gray-400 text-sm mb-2">ComfyUI API URL</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="http://localhost:8188"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm mb-3"
                />
                <button
                  onClick={() => {
                    // 🛡️ Prevent saving Cloudflare URLs
                    if (customUrl.includes('trycloudflare.com')) {
                      alert(
                        '⚠️ Cloudflare Tunnel URLs are temporary and should not be saved.\n\nPlease use localhost:8188 or a permanent URL.'
                      );
                      return;
                    }
                    saveComfyUIUrl(customUrl);
                    checkStatus();
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Test Connection
                </button>
              </div>
            )}
          </>
        )}

        {/* Success Message */}
        {status?.running && (
          <div className="text-center">
            <p className="text-green-400 font-semibold mb-2">Starting Peace Script AI...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent mx-auto"></div>
          </div>
        )}

        {/* Skip Button */}
        {!status?.running && onSkip && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-4 text-center">
              ⚠️ Want to use the app without Face ID features?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  localStorage.setItem('peace_comfyui_disabled', 'true');
                  onSkip();
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
              >
                ✓ Continue Without Face ID (Don&apos;t Ask Again)
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('peace_comfyui_skipped', 'true');
                  onSkip();
                }}
                className="w-full text-gray-400 hover:text-white text-sm underline transition-colors py-2"
              >
                Skip for Now (Ask Next Time)
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3 text-center">
              Note: You can enable Face ID later in Settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComfyUISetup;
