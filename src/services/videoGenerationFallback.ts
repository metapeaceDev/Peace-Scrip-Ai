/**
 * Video Generation Fallback Handler
 *
 * จัดการ fallback chain สำหรับการสร้างวิดีโอ:
 * 1. ComfyUI (local GPU) - preferred
 * 2. Gemini Veo 2 (Google Cloud)
 * 3. Replicate (cloud backup)
 */

import { generateVideoWithGemini } from './geminiService';
import type { VideoError } from '../components/VideoGenerationError';

export interface VideoGenerationRequest {
  prompt: string;
  videoType: 'animatediff' | 'svd';
  numFrames?: number;
  fps?: number;
  steps?: number;
  referenceImage?: string;
  userId?: string;
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  videoData?: string;
  method: 'comfyui' | 'gemini-veo' | 'replicate';
  processingTime: number;
  error?: VideoError;
  fallbackUsed?: boolean;
}

/**
 * Generate video with automatic fallback
 */
export async function generateVideoWithFallback(
  request: VideoGenerationRequest,
  preferredMethod: 'comfyui' | 'gemini-veo' | 'replicate' = 'comfyui',
  onProgress?: (progress: number, status: string) => void
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  // Define fallback chain
  const fallbackChain: Array<'comfyui' | 'gemini-veo' | 'replicate'> =
    preferredMethod === 'comfyui'
      ? ['comfyui', 'gemini-veo', 'replicate']
      : preferredMethod === 'gemini-veo'
        ? ['gemini-veo', 'replicate']
        : ['replicate'];

  let lastError: VideoError | undefined;
  let fallbackUsed = false;

  // Try each method in the fallback chain
  for (const method of fallbackChain) {
    try {
      if (onProgress) {
        onProgress(5, `Trying ${method}...`);
      }

      let result: VideoGenerationResult;

      switch (method) {
        case 'comfyui':
          result = await generateWithComfyUI(request, onProgress);
          break;

        case 'gemini-veo':
          result = await generateWithGeminiVeo(request, onProgress);
          break;

        case 'replicate':
          result = await generateWithReplicate(request, onProgress);
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      // Success! Return result
      return {
        ...result,
        fallbackUsed: fallbackUsed || method !== preferredMethod,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ ${method} failed:`, error);

      // Store error for potential return
      lastError = parseVideoError(error, request.videoType);

      // If this was not the preferred method, mark fallback as used
      if (method !== preferredMethod) {
        fallbackUsed = true;
      }

      // Continue to next method in chain
      if (onProgress) {
        const nextMethod = fallbackChain[fallbackChain.indexOf(method) + 1];
        if (nextMethod) {
          onProgress(5, `Falling back to ${nextMethod}...`);
        }
      }
    }
  }

  // All methods failed
  return {
    success: false,
    method: preferredMethod,
    processingTime: Date.now() - startTime,
    error: lastError || {
      type: 'unknown',
      message: 'All generation methods failed',
      videoType: request.videoType,
    },
    fallbackUsed,
  };
}

/**
 * Generate video using ComfyUI
 */
async function generateWithComfyUI(
  request: VideoGenerationRequest,
  onProgress?: (progress: number, status: string) => void
): Promise<VideoGenerationResult> {
  const comfyuiBackendClient = await import('./comfyuiBackendClient');

  // Check if backend is available
  const status = await comfyuiBackendClient.checkBackendStatus(true);
  if (!status.running) {
    throw new Error('ComfyUI backend is not running');
  }

  // Submit job
  const job = await comfyuiBackendClient.generateVideo({
    type: request.videoType,
    prompt: request.prompt,
    numFrames: request.numFrames,
    fps: request.fps,
    steps: request.steps,
    referenceImage: request.referenceImage,
    userId: request.userId,
  });

  // Poll for completion
  let progress = 0;
  let lastStatus = 'queued';

  while (progress < 100) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s

    const jobStatus = await comfyuiBackendClient.getVideoJobStatus(job.jobId);
    const status = jobStatus.status ?? jobStatus.state ?? 'processing';

    if (status === 'completed' && jobStatus.result) {
      if (onProgress) onProgress(100, 'Completed');
      return {
        success: true,
        videoUrl: jobStatus.result.videoUrl,
        videoData: jobStatus.result.videoData,
        method: 'comfyui',
        processingTime: jobStatus.result.processingTime || 0,
      };
    }

    if (status === 'failed') {
      throw new Error(jobStatus.error || 'ComfyUI job failed');
    }

    progress = jobStatus.progress || 0;

    // Update progress callback if status changed
    if (status !== lastStatus || progress > 0) {
      lastStatus = status;
      if (onProgress) {
        const statusText =
          status === 'queued'
            ? 'Queued'
            : status === 'processing'
              ? `Processing (${Math.round(progress)}%)`
              : 'Processing';
        onProgress(progress, statusText);
      }
    }
  }

  throw new Error('ComfyUI job did not complete');
}

/**
 * Generate video using Gemini Veo 2
 */
async function generateWithGeminiVeo(
  request: VideoGenerationRequest,
  onProgress?: (progress: number, status: string) => void
): Promise<VideoGenerationResult> {
  if (onProgress) onProgress(10, 'Preparing Gemini Veo request...');

  // Use existing geminiService
  const result = await generateVideoWithGemini({
    prompt: request.prompt,
    referenceImage: request.referenceImage,
    numFrames: request.numFrames || 25,
    fps: request.fps || 24,
  });

  if (onProgress) onProgress(100, 'Completed with Gemini Veo');

  return {
    success: true,
    videoUrl: result.videoUrl,
    videoData: result.videoData,
    method: 'gemini-veo',
    processingTime: result.processingTime || 0,
  };
}

/**
 * Generate video using Replicate
 */
async function generateWithReplicate(
  _request: VideoGenerationRequest,
  _onProgress?: (progress: number, status: string) => void
): Promise<VideoGenerationResult> {
  // TODO: Implement Replicate integration
  // This would use Replicate's API for AnimateDiff or SVD
  // For now, throw error to indicate not implemented

  throw new Error('Replicate fallback not yet implemented');
}

/**
 * Helper to parse errors (import from videoErrorUtils)
 */
function parseVideoError(error: any, videoType?: 'animatediff' | 'svd'): VideoError {
  // Simple implementation - use full version from videoErrorUtils
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';

  return {
    type: 'unknown',
    message: errorMessage,
    videoType,
    details: typeof error === 'object' ? error : {},
  };
}
