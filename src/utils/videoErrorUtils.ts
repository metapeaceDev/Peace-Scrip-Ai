/**
 * Video Generation Error Utilities
 *
 * Helper functions สำหรับการจัดการและ categorize errors จาก video generation
 */

import type { VideoError, VideoErrorType } from '../components/VideoGenerationError';

/**
 * Parse error from ComfyUI response and categorize it
 */
export function parseVideoError(error: any, videoType?: 'animatediff' | 'svd'): VideoError {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
  const errorDetails = typeof error === 'object' ? error : {};

  // Model not found errors
  if (
    errorMessage.includes('model not found') ||
    errorMessage.includes('checkpoint not found') ||
    errorMessage.includes('motion module') ||
    errorMessage.includes('svd_xt') ||
    errorMessage.includes('missing model') ||
    errorMessage.includes('no such file')
  ) {
    return {
      type: 'model_not_found',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // VRAM / OOM errors
  if (
    errorMessage.toLowerCase().includes('out of memory') ||
    errorMessage.toLowerCase().includes('cuda out of memory') ||
    errorMessage.toLowerCase().includes('vram') ||
    errorMessage.toLowerCase().includes('oom')
  ) {
    return {
      type: 'insufficient_vram',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('took too long')
  ) {
    return {
      type: 'timeout',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('WebSocket')
  ) {
    return {
      type: 'network_error',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // Worker unavailable
  if (
    errorMessage.includes('no workers available') ||
    errorMessage.includes('worker unavailable') ||
    errorMessage.includes('no healthy workers') ||
    errorMessage.includes('worker not found')
  ) {
    return {
      type: 'worker_unavailable',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // Invalid parameters
  if (
    errorMessage.includes('invalid parameter') ||
    errorMessage.includes('invalid input') ||
    errorMessage.includes('out of range') ||
    errorMessage.includes('validation error')
  ) {
    return {
      type: 'invalid_params',
      message: errorMessage,
      videoType,
      details: errorDetails,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: errorMessage,
    videoType,
    details: errorDetails,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(errorType: VideoErrorType): boolean {
  const retryableErrors: VideoErrorType[] = [
    'timeout',
    'network_error',
    'worker_unavailable',
  ];
  return retryableErrors.includes(errorType);
}

/**
 * Check if error can be resolved with fallback
 */
export function hasFallbackOption(errorType: VideoErrorType): boolean {
  const fallbackErrors: VideoErrorType[] = [
    'model_not_found',
    'insufficient_vram',
    'worker_unavailable',
    'timeout',
  ];
  return fallbackErrors.includes(errorType);
}

/**
 * Get suggested fallback method based on error
 */
export function getSuggestedFallback(errorType: VideoErrorType, videoType?: string): string {
  switch (errorType) {
    case 'model_not_found':
    case 'worker_unavailable':
      return 'gemini-veo'; // Fallback to Gemini Veo 2
    
    case 'insufficient_vram':
      if (videoType === 'svd') {
        return 'animatediff'; // SVD → AnimateDiff (lower VRAM)
      }
      return 'gemini-veo'; // AnimateDiff → Gemini Veo
    
    case 'timeout':
      return 'reduce-frames'; // Suggest reducing frame count
    
    default:
      return 'gemini-veo';
  }
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: VideoError): string {
  return `[${error.type}] ${error.message}${error.videoType ? ` (${error.videoType})` : ''}`;
}

/**
 * Get recovery suggestions based on error type
 */
export function getRecoverySuggestions(errorType: VideoErrorType): string[] {
  const suggestions: Record<VideoErrorType, string[]> = {
    model_not_found: [
      'Download required models using the setup guide',
      'Verify models are in correct ComfyUI directories',
      'Check model filenames match expected names',
      'Use alternative generation method (Gemini Veo)',
    ],
    insufficient_vram: [
      'Reduce number of frames (try 16 instead of 128)',
      'Close other GPU-intensive applications',
      'Use AnimateDiff instead of SVD (lower VRAM)',
      'Try Gemini Veo 2 (cloud-based, no VRAM needed)',
    ],
    timeout: [
      'Reduce frame count (16-32 frames)',
      'Check if ComfyUI worker is responding',
      'Retry during off-peak hours',
      'Use cloud-based alternative (Gemini Veo)',
    ],
    network_error: [
      'Check if ComfyUI service is running',
      'Verify firewall settings',
      'Restart ComfyUI service',
      'Check network connectivity',
    ],
    worker_unavailable: [
      'Start ComfyUI service: ./start-comfyui.sh',
      'Check ComfyUI worker status',
      'Restart ComfyUI if unresponsive',
      'Use alternative generation method',
    ],
    invalid_params: [
      'Check frame count is in valid range (16-128)',
      'Verify FPS is between 6-24',
      'Ensure steps are between 20-50',
      'Review parameter constraints',
    ],
    unknown: [
      'Check ComfyUI logs for details',
      'Retry the operation',
      'Contact support if issue persists',
      'Try alternative generation method',
    ],
  };

  return suggestions[errorType] || suggestions.unknown;
}

/**
 * Track error for analytics (without PII)
 */
export function trackVideoError(error: VideoError, context?: Record<string, any>): void {
  // Log error for debugging (remove in production or send to analytics service)
  console.error('[Video Generation Error]', {
    type: error.type,
    videoType: error.videoType,
    hasDetails: !!error.details,
    context,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to analytics service (e.g., Google Analytics, Sentry)
  // Example:
  // analytics.track('video_generation_error', {
  //   error_type: error.type,
  //   video_type: error.videoType,
  //   context,
  // });
}
