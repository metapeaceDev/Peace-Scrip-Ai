/**
 * Video Generation Error Handler Component
 *
 * แสดงข้อความ error สำหรับการสร้างวิดีโอพร้อมคำแนะนำในการแก้ไข
 * รองรับ error types:
 * - Model not found
 * - Out of memory (VRAM)
 * - Timeout
 * - Network errors
 * - Worker unavailable
 */

import React from 'react';

export type VideoErrorType = 
  | 'model_not_found'
  | 'insufficient_vram'
  | 'timeout'
  | 'network_error'
  | 'worker_unavailable'
  | 'invalid_params'
  | 'unknown';

export interface VideoError {
  type: VideoErrorType;
  message: string;
  videoType?: 'animatediff' | 'svd';
  details?: Record<string, any>;
}

interface VideoGenerationErrorProps {
  error: VideoError;
  onRetry?: () => void;
  onFallback?: () => void;
  showSetupGuide?: boolean;
}

const VideoGenerationError: React.FC<VideoGenerationErrorProps> = ({
  error,
  onRetry,
  onFallback,
  showSetupGuide = true,
}) => {
  // Error icon mapping
  const errorIcons = {
    model_not_found: '📦',
    insufficient_vram: '💾',
    timeout: '⏱️',
    network_error: '🌐',
    worker_unavailable: '⚙️',
    invalid_params: '⚠️',
    unknown: '❌',
  };

  // Error titles
  const errorTitles = {
    model_not_found: 'Required Models Not Found',
    insufficient_vram: 'Insufficient VRAM',
    timeout: 'Generation Timeout',
    network_error: 'Network Error',
    worker_unavailable: 'ComfyUI Worker Unavailable',
    invalid_params: 'Invalid Parameters',
    unknown: 'Unknown Error',
  };

  // Get detailed explanation based on error type
  const getErrorExplanation = (): React.ReactNode => {
    switch (error.type) {
      case 'model_not_found':
        return (
          <>
            <p className="text-gray-300 mb-2">
              The required models for {error.videoType === 'animatediff' ? 'AnimateDiff' : 'SVD'} video generation are not installed.
            </p>
            {error.videoType === 'animatediff' && (
              <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
                <div className="font-semibold text-white mb-1">Required Models:</div>
                <div className="text-gray-400">• Motion Module: mm_sd_v15_v2.ckpt</div>
                <div className="text-gray-400">• Checkpoint: Any SD 1.5 checkpoint</div>
                <div className="text-gray-400">• VAE: vae-ft-mse-840000-ema-pruned</div>
              </div>
            )}
            {error.videoType === 'svd' && (
              <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
                <div className="font-semibold text-white mb-1">Required Models:</div>
                <div className="text-gray-400">• SVD Model: svd_xt.safetensors (12GB)</div>
                <div className="text-gray-400">• VRAM: 12GB+ recommended</div>
              </div>
            )}
          </>
        );

      case 'insufficient_vram':
        return (
          <>
            <p className="text-gray-300 mb-2">
              Your GPU does not have enough VRAM for this operation.
            </p>
            <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
              <div className="font-semibold text-white mb-1">VRAM Requirements:</div>
              <div className="text-gray-400">• AnimateDiff: 6-8GB VRAM</div>
              <div className="text-gray-400">• SVD: 12GB+ VRAM</div>
              <div className="text-yellow-400 mt-2">
                💡 Tip: Try reducing frame count or using AnimateDiff instead of SVD
              </div>
            </div>
          </>
        );

      case 'timeout':
        return (
          <>
            <p className="text-gray-300 mb-2">
              Video generation took longer than expected and timed out.
            </p>
            <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
              <div className="font-semibold text-white mb-1">Possible Causes:</div>
              <div className="text-gray-400">• Too many frames requested</div>
              <div className="text-gray-400">• Worker is busy with other tasks</div>
              <div className="text-gray-400">• Insufficient GPU resources</div>
              <div className="text-yellow-400 mt-2">
                💡 Tip: Try with fewer frames (16-32) or retry later
              </div>
            </div>
          </>
        );

      case 'network_error':
        return (
          <>
            <p className="text-gray-300 mb-2">
              Unable to communicate with the ComfyUI service.
            </p>
            <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
              <div className="font-semibold text-white mb-1">Troubleshooting:</div>
              <div className="text-gray-400">• Check if ComfyUI service is running</div>
              <div className="text-gray-400">• Verify network connection</div>
              <div className="text-gray-400">• Check firewall settings</div>
            </div>
          </>
        );

      case 'worker_unavailable':
        return (
          <>
            <p className="text-gray-300 mb-2">
              No ComfyUI workers are currently available or healthy.
            </p>
            <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
              <div className="font-semibold text-white mb-1">Quick Fixes:</div>
              <div className="text-gray-400">1. Start ComfyUI service: <code className="bg-gray-800 px-2 py-1 rounded">./start-comfyui.sh</code></div>
              <div className="text-gray-400">2. Check worker health in ComfyUI Status</div>
              <div className="text-gray-400">3. Restart ComfyUI if needed</div>
            </div>
          </>
        );

      case 'invalid_params':
        return (
          <>
            <p className="text-gray-300 mb-2">
              The provided parameters are invalid or out of range.
            </p>
            <div className="bg-gray-900 rounded p-3 text-sm space-y-1">
              <div className="font-semibold text-white mb-1">Valid Ranges:</div>
              <div className="text-gray-400">• Frames: 16-128 (AnimateDiff), 25 (SVD)</div>
              <div className="text-gray-400">• FPS: 6-24</div>
              <div className="text-gray-400">• Steps: 20-50</div>
            </div>
          </>
        );

      default:
        return (
          <p className="text-gray-300">
            {error.message || 'An unexpected error occurred during video generation.'}
          </p>
        );
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{errorIcons[error.type]}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg mb-1">
            {errorTitles[error.type]}
          </h3>
          {getErrorExplanation()}
        </div>
      </div>

      {/* Error Details (if available) */}
      {error.details && Object.keys(error.details).length > 0 && (
        <details className="bg-gray-900 rounded p-3 text-sm">
          <summary className="cursor-pointer text-gray-400 hover:text-white">
            Show Technical Details
          </summary>
          <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(error.details, null, 2)}
          </pre>
        </details>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Retry Generation</span>
          </button>
        )}

        {onFallback && (
          <button
            onClick={onFallback}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🔀</span>
            <span>Try Alternative Method</span>
          </button>
        )}

        {showSetupGuide && (error.type === 'model_not_found' || error.type === 'worker_unavailable') && (
          <a
            href="/docs/COMFYUI_VIDEO_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📖</span>
            <span>Setup Guide</span>
          </a>
        )}

        {error.type === 'insufficient_vram' && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Navigate to model management page
              alert('Model management page coming soon');
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Optimize Settings</span>
          </a>
        )}
      </div>

      {/* Help Text */}
      <div className="pt-2 border-t border-red-800 text-sm text-gray-400">
        💬 Need help? Check the <a href="/docs/COMFYUI_VIDEO_TESTING.md" className="text-blue-400 hover:underline">testing guide</a> or <a href="/docs/README.md" className="text-blue-400 hover:underline">documentation</a>.
      </div>
    </div>
  );
};

export default VideoGenerationError;
