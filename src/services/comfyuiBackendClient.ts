/**
 * ComfyUI Backend Client
 *
 * Client สำหรับเรียกใช้ ComfyUI Backend Service
 * แทนการเรียก localhost:8188 โดยตรง
 */

import { auth } from '../config/firebase';
import { recordGeneration } from './modelUsageTracker';
import { API_PRICING } from '../types/analytics';
import { buildWorkflow, buildFluxWorkflow } from './comfyuiWorkflowBuilder';

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';
const USE_BACKEND_SERVICE = import.meta.env.VITE_USE_COMFYUI_BACKEND === 'true';

// Flag to track if service is available (avoid repeated failed requests)
let serviceAvailable: boolean | null = null;
let lastCheck: number = 0;
const CHECK_INTERVAL = 30000; // Re-check every 30 seconds

/**
 * Check if backend service is available
 */
async function checkServiceHealth(): Promise<boolean> {
  const now = Date.now();

  // Return cached result if checked recently
  if (serviceAvailable !== null && now - lastCheck < CHECK_INTERVAL) {
    return serviceAvailable;
  }

  try {
    console.log(`🔍 Checking ComfyUI Backend Health at ${COMFYUI_SERVICE_URL}/health...`);
    // Use simple /health endpoint (returns 200 OK when service is up)
    const response = await fetch(`${COMFYUI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000), // Increased timeout to 5s
    });

    if (!response.ok) {
      console.warn(`⚠️ ComfyUI Backend Health Check Failed: ${response.status} ${response.statusText}`);
    }

    serviceAvailable = response.ok;
    lastCheck = now;
    return serviceAvailable;
  } catch (error) {
    console.error(`❌ ComfyUI Backend Health Check Error:`, error);
    // Service not available - fail silently
    serviceAvailable = false;
    lastCheck = now;
    return false;
  }
}

/**
 * Get Firebase ID token for authentication
 */
async function getIdToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

/**
 * Generate image using ComfyUI Backend Service
 */
export async function generateImageWithBackend(
  prompt: string,
  workflow: Record<string, unknown>,
  referenceImage: string | null = null,
  priority: number = 5,
  onProgress?: (progress: number) => void
): Promise<string> {
  const startTime = Date.now();
  // Check service health before attempting (avoid console errors)
  const isHealthy = await checkServiceHealth();
  if (!isHealthy) {
    throw new Error('ComfyUI backend service is not available');
  }

  try {
    const idToken = await getIdToken();

    // Submit job to queue with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout for submission

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/comfyui/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        prompt,
        workflow,
        referenceImage,
        priority,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to submit job');
    }

    const result = await response.json();

    console.log('📦 Backend response:', result);

    // Handle different response formats
    const jobData = result.data || result;
    const jobId = jobData.jobId || jobData.id;

    if (!jobId) {
      throw new Error('No job ID in response: ' + JSON.stringify(result));
    }

    console.log(`📤 Job submitted: ${jobId}`);

    // Poll for result
    const resultImage = await pollJobStatus(jobId, idToken, 300000, onProgress);

    // Track usage
    const userId = auth.currentUser?.uid;
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;
      recordGeneration({
        userId,
        type: 'image',
        modelId: 'comfyui-backend',
        modelName: 'ComfyUI Backend',
        provider: 'comfyui',
        costInCredits: 1,
        costInTHB: API_PRICING.COMFYUI?.image || 0.5,
        success: true,
        duration,
        metadata: { prompt },
      }).catch(err => console.error('Failed to track generation:', err));
    }

    return resultImage;
  } catch (error: unknown) {
    console.error('❌ Backend generation failed:', error);

    // Handle timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'ComfyUI Backend timeout - service may be down. Try again or check backend status.'
      );
    }

    // Handle connection errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to ComfyUI Backend Service. Please check if the service is running.'
      );
    }

    throw error;
  }
}

/**
 * Poll job status until complete
 */
async function pollJobStatus(
  jobId: string,
  idToken: string,
  maxWait: number = 4800000,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 80 minutes (Mac IP-Adapter needs more time)
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWait) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout per poll

      const response = await fetch(`${COMFYUI_SERVICE_URL}/api/comfyui/job/${jobId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const result = await response.json();

      // Handle different response formats
      const jobData = result.data || result;
      const state = jobData.state || jobData.status;
      const progress = jobData.progress || 0;
      const jobResult = jobData.result || jobData;
      const failedReason = jobData.failedReason || jobData.error || jobData.message;

      console.log(`📊 Job ${jobId}: ${state} (${progress}%)`);

      // Update progress callback - ALWAYS call even if progress is 0
      if (onProgress) {
        const progressValue = typeof progress === 'number' ? Math.round(progress * 10) / 10 : 0; // Round to 1 decimal
        console.log(`🔄 Calling onProgress with: ${progressValue}%`);
        onProgress(progressValue);
      }

      if (state === 'completed' || state === 'success') {
        console.log(`✅ Job ${jobId} completed`);

        // Set progress to 100% before returning
        if (onProgress) {
          console.log(`✅ Setting final progress: 100%`);
          onProgress(100);
        }

        // Return image from various possible locations
        // Priority: imageUrl (Firebase Storage) > imageData (Base64 fallback)
        const imageUrl = jobResult.imageUrl;
        const imageData = jobResult.imageData || jobResult.image || jobResult;

        if (imageUrl) {
          console.log(`🌐 Image available at Storage URL: ${imageUrl}`);

          // Download from Storage URL and convert to base64
          try {
            const base64Data = await downloadAndConvertToBase64(imageUrl);
            if (base64Data) {
              console.log('✅ Converted Storage URL to base64');
              return base64Data;
            }
          } catch (error) {
            console.warn('⚠️ Failed to convert Storage URL to base64:', error);
          }

          // Fallback to imageData or return URL
          return imageData || imageUrl;
        }

        return imageData;
      }

      if (state === 'failed' || state === 'error') {
        throw new Error(`Job failed: ${failedReason}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error: unknown) {
      // Handle timeout - retry
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ Poll timeout, retrying...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      // Handle connection error - retry a few times
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('⚠️ Connection error, retrying...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      console.error('❌ Polling error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to poll job status: ${errorMsg}`);
    }
  }

  throw new Error('Job timeout after 80 minutes. ComfyUI Backend may be overloaded or stuck.');
}

/**
 * Download image from Storage URL and convert to base64
 */
async function downloadAndConvertToBase64(storageUrl: string): Promise<string | null> {
  try {
    // Download image from Storage URL
    const response = await fetch(storageUrl, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    // Get image as blob
    const blob = await response.blob();

    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read blob'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting Storage URL to base64:', error);
    return null;
  }
}

/**
 * Check if backend service is available
 * @param silent - If true, suppresses console errors (for background polling)
 */
export async function checkBackendStatus(silent: boolean = false) {
  try {
    const response = await fetch(`${COMFYUI_SERVICE_URL}/health/detailed`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      return { running: false, error: 'Service unavailable' };
    }

    const data = await response.json();

    return {
      running: data.success,
      url: COMFYUI_SERVICE_URL,
      workers: data.workers?.totalWorkers || 0,
      healthyWorkers: data.workers?.healthyWorkers || 0,
      queue: data.queue,
    };
  } catch (error: unknown) {
    // Only log if not in silent mode and not a network error
    if (!silent && !(error instanceof TypeError)) {
      console.warn('Backend service check failed:', error);
    }

    return {
      running: false,
      error:
        error instanceof Error && error.name === 'AbortError'
          ? 'Backend service timeout (not responding)'
          : error instanceof Error
            ? error.message
            : 'Unknown error',
    };
  }
}

/**
 * Get worker statistics
 */
export async function getWorkerStats() {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/comfyui/workers`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get worker stats');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('❌ Failed to get worker stats:', error);
    return null;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/queue/stats`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get queue stats');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return null;
  }
}

/**
 * Generate video using ComfyUI Backend Service
 */
export async function generateVideo(params: {
  type: 'animatediff' | 'svd' | 'wan';
  prompt: string;
  numFrames?: number;
  fps?: number;
  steps?: number;
  referenceImage?: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  cfg?: number;
  // AnimateDiff
  motionScale?: number;
  motionModel?: string;
  lora?: string;
  loraStrength?: number;
  // SVD
  videoModel?: string;
  // WAN
  modelPath?: string;
  userId?: string;
  onProgress?: (progress: number, details?: any) => void;
}): Promise<{ jobId: string; queuePosition: number; status: string }> {
  const isHealthy = await checkServiceHealth();
  if (!isHealthy) {
    throw new Error('ComfyUI backend service is not available');
  }

  try {
    const idToken = await getIdToken();

    const endpoint =
      params.type === 'animatediff'
        ? `${COMFYUI_SERVICE_URL}/api/video/generate/animatediff`
        : params.type === 'svd'
          ? `${COMFYUI_SERVICE_URL}/api/video/generate/svd`
          : `${COMFYUI_SERVICE_URL}/api/video/generate/wan`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        numFrames: params.numFrames,
        fps: params.fps,
        steps: params.steps,
        referenceImage: params.referenceImage,
        negativePrompt: params.negativePrompt,
        seed: params.seed,
        width: params.width,
        height: params.height,
        cfg: params.cfg,
        motionScale: params.motionScale,
        motionModel: params.motionModel,
        lora: params.lora,
        loraStrength: params.loraStrength,
        videoModel: params.videoModel,
        modelPath: params.modelPath,
        userId: params.userId || auth.currentUser?.uid,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to submit video job');
    }

    const result = await response.json();
    console.log('🎬 Video job submitted:', result);

    // Return the data object which contains jobId
    if (result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('❌ Video generation failed:', error);
    throw error;
  }
}

/**
 * Get video job status
 */
/**
 * Get video job status from backend service
 * @param jobId - The unique job identifier
 * @returns Promise with job status details including progress (0-100)
 * @throws Error if request fails or job not found
 */
export async function getVideoJobStatus(jobId: string): Promise<{
  jobId: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  // Some backend versions use `state` instead of `status`
  state?: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  // Some backend versions may return URL at the top-level
  videoUrl?: string;
}> {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/video/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get video job status');
    }

    const result = await response.json();
    // API returns {success: true, data: {...}}, unwrap the data
    return result.data || result;
  } catch (error) {
    console.error('❌ Failed to get video job status:', error);
    throw error;
  }
}

/**
 * Cancel a video generation job
 * @param jobId - The unique job identifier to cancel
 * @returns Promise with cancellation result
 * @throws Error if cancellation fails
 */
export async function cancelVideoJob(jobId: string): Promise<{ success: boolean; message: string }> {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/video/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel video job');
    }

    const result = await response.json();
    // API returns {success: true, data: {...}}, unwrap the data
    return result.data || result;
  } catch (error) {
    console.error('❌ Failed to cancel video job:', error);
    throw error;
  }
}

/**
 * Get system requirements for video generation
 * @param videoType - Type of video generation ('animatediff' | 'svd')
 * @returns Promise with requirements check results
 * @throws Error if requirements check fails
 */
export async function getVideoRequirements(videoType: 'animatediff' | 'svd' | 'wan'): Promise<{
  ready: boolean;
  vramOk: boolean;
  modelsFound: boolean;
  missing?: string[];
}> {
  try {
    const response = await fetch(
      `${COMFYUI_SERVICE_URL}/api/video/requirements/${videoType}`
    );

    if (!response.ok) {
      throw new Error('Failed to get video requirements');
    }

    const result = await response.json();
    // API returns {success: true, data: {...}}, unwrap the data
    return result.data || result;
  } catch (error) {
    console.error('❌ Failed to get video requirements:', error);
    throw error;
  }
}

/**
 * Detect available video generation models on the system
 * @returns Promise with model availability status for AnimateDiff and SVD
 * @throws Error if model detection fails
 */
export async function detectVideoModels(): Promise<{
  animatediff: { available: boolean; models: any };
  svd: { available: boolean; models: any };
}> {
  try {
    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/video/detect-models`);

    if (!response.ok) {
      throw new Error('Failed to detect video models');
    }

    const result = await response.json();
    // API returns {success: true, data: {...}}, unwrap the data
    return result.data || result;
  } catch (error) {
    console.error('❌ Failed to detect video models:', error);
    throw error;
  }
}

/**
 * Poll video job status until complete
 */
async function pollVideoJob(
  jobId: string,
  onProgress?: (progress: number, details?: any, jobId?: string) => void
): Promise<string> {
  const startTime = Date.now();
  const maxWait = 2400000; // 🆕 40 minutes for video (increased from 20)
  const pollInterval = 3000; // 3 seconds

  // Ensure UI starts from 0% and never goes backwards.
  let lastProgress = 0;
  if (onProgress) {
    onProgress(0, { status: 'queued' }, jobId);
  }

  while (Date.now() - startTime < maxWait) {
    try {
      const status = await getVideoJobStatus(jobId);

      // 🆕 Support both 'status' and 'state' properties for compatibility
      const currentStatus = status.status || status.state;

      if (currentStatus === 'completed') {
        console.warn('🎉 Video Completed! Checking result...');
        console.warn('📦 Full Status:', JSON.stringify(status, null, 2));
        
        // Check for debug error from backend (in dev mode)
        if (status.result?._debug_error) {
          console.error('❌ Backend Debug Error:', status.result._debug_error);
          throw new Error(`Backend Error: ${status.result._debug_error}`);
        }

        if (onProgress) onProgress(100, status.result, jobId);

        // Determine the best available URL first
        const resolvedUrl =
          status.result?.videoUrl ||
          status.videoUrl ||
          (typeof status.result?.output?.video === 'string' ? status.result.output.video : null);

        // If Storage upload failed but we still have a usable local URL, treat it as a warning.
        // This is common in local/dev when FIREBASE_STORAGE_BUCKET is not configured.
        if (status.result?.storageError) {
          if (resolvedUrl) {
            console.warn('⚠️ Storage upload failed, using local video URL instead:', status.result.storageError);
          } else {
            console.error('❌ Storage Error:', status.result.storageError);
            throw new Error(`Storage upload failed: ${status.result.storageError}`);
          }
        }

        if (resolvedUrl) {
          console.warn('✅ Resolved video URL:', resolvedUrl);
          return resolvedUrl;
        }
        
        console.error('❌ No URL found! Result:', status.result);
        throw new Error('Video completed but no URL found in result');
      }

      if (currentStatus === 'failed') {
        throw new Error(status.error || 'Video generation failed');
      }

      if (onProgress) {
        const rawProgress = typeof status.progress === 'number' ? status.progress : 0;
        const bounded = Math.max(0, Math.min(100, rawProgress));
        const currentProgress = Math.max(lastProgress, bounded);
        lastProgress = currentProgress;

        console.log(`🔄 Video Progress: ${Math.round(currentProgress)}% | Status: ${currentStatus}`);

        // 🔍 DEBUG: If progress is 100 but not completed, dump status
        if (currentProgress >= 100) {
          console.warn('⚠️ Progress 100% but not completed! Full Status:', JSON.stringify(status, null, 2));

          // 🆕 Auto-fix: If progress is 100 and we have a videoUrl, treat as completed
          if (status.videoUrl || status.result?.videoUrl) {
            console.warn('💡 Auto-detecting completion based on videoUrl presence');
            status.status = 'completed';
            continue; // Restart loop iteration to hit the completion block
          }
        }

        onProgress(currentProgress, status.result, jobId); // 🆕 Pass jobId
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.warn('Polling error:', error);
      // Continue polling unless it's a fatal error?
      // For now, rethrow if it's not a network glitch
      if (error instanceof Error && error.message.includes('failed')) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Video generation timed out');
}

/**
 * Main export: ใช้ backend service หรือ localhost ComfyUI
 */
export async function generateWithComfyUI(
  prompt: string,
  options: Record<string, unknown> = {},
  referenceImage: string | null = null
): Promise<string> {
  // Extract typed values from options
  const optionsRefImage =
    typeof options.referenceImage === 'string' ? options.referenceImage : null;
  const onProgressCallback =
    typeof options.onProgress === 'function'
      ? (options.onProgress as (progress: number, details?: any) => void)
      : undefined;
      
  // 🎬 VIDEO GENERATION ROUTING
  // If AnimateDiff / SVD / WAN is requested, route to dedicated Video API
  const useAnimateDiff = !!options.useAnimateDiff;
  const useSVD = !!options.useSVD;
  const useWan = !!(options.useWan || options.useWAN);
  const explicitVideoType = typeof options.videoType === 'string' ? options.videoType : null;

  if (useAnimateDiff || useSVD || useWan || explicitVideoType === 'wan') {
    console.log('🎬 Routing to Video Generation API...');

    const videoType = ((): 'animatediff' | 'svd' | 'wan' => {
      if (explicitVideoType === 'wan') return 'wan';
      if (useWan) return 'wan';
      if (useSVD) return 'svd';
      return 'animatediff';
    })();

    const finalRefImage = (referenceImage || optionsRefImage) ?? undefined;
    
    // For SVD, we need a reference image
    if (videoType === 'svd' && !finalRefImage) {
      throw new Error('SVD video generation requires a reference image');
    }

    const rawFrameCount =
      (typeof options.numFrames === 'number' ? (options.numFrames as number) : undefined) ??
      (typeof (options as any).frameCount === 'number' ? ((options as any).frameCount as number) : undefined);

    const rawMotionStrength =
      typeof options.motionStrength === 'number' ? (options.motionStrength as number) : undefined;

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const getSvdMotionBucket = (motionStrength: number) => {
      // Map 0..1 motion strength into a safer SVD motion_bucket_id range.
      // Lower values generally reduce warping/unrealistic motion.
      const base = Math.round(20 + clamp01(motionStrength) * 120); // ~20..140

      const shotData = (options as any)?.shotData;
      const movement = typeof shotData?.movement === 'string' ? shotData.movement.toLowerCase() : '';
      const transitionType = typeof (options as any)?.transitionType === 'string' ? ((options as any).transitionType as string).toLowerCase() : '';

      const isStatic = movement.includes('static') || movement.includes('still');
      const isSeamless = transitionType === 'seamless';

      if (isStatic) return Math.min(base, 70);
      if (isSeamless) return Math.min(base, 90);
      return Math.max(1, Math.min(255, base));
    };

    const motionScale =
      videoType === 'svd' && typeof rawMotionStrength === 'number'
        ? getSvdMotionBucket(rawMotionStrength)
        : rawMotionStrength;

    // Ensure UI progress starts at 0 immediately on submit.
    if (onProgressCallback) {
      onProgressCallback(0, { status: 'submitting', videoType });
    }

    const videoJob = await generateVideo({
      type: videoType,
      prompt: prompt,
      numFrames: rawFrameCount,
      fps: (options.fps as number) || undefined,
      steps: (options.steps as number) || undefined,
      referenceImage: finalRefImage,
      negativePrompt: typeof options.negativePrompt === 'string' ? (options.negativePrompt as string) : undefined,
      seed: typeof options.seed === 'number' ? (options.seed as number) : undefined,
      width: typeof options.width === 'number' ? (options.width as number) : undefined,
      height: typeof options.height === 'number' ? (options.height as number) : undefined,
      cfg: typeof options.cfg === 'number' ? (options.cfg as number) : undefined,
      motionScale: typeof motionScale === 'number' ? motionScale : undefined,
      motionModel: typeof (options as any).motionModel === 'string' ? ((options as any).motionModel as string) : undefined,
      lora: typeof options.lora === 'string' ? (options.lora as string) : undefined,
      loraStrength: typeof (options as any).loraStrength === 'number' ? ((options as any).loraStrength as number) : undefined,
      videoModel: typeof (options as any).videoModel === 'string' ? ((options as any).videoModel as string) : undefined,
      modelPath: typeof (options as any).modelPath === 'string' ? ((options as any).modelPath as string) : undefined,
      onProgress: onProgressCallback
    });

    console.log(`⏳ Polling video job ${videoJob.jobId}...`);
    return await pollVideoJob(videoJob.jobId, onProgressCallback);
  }

  if (USE_BACKEND_SERVICE) {
    console.log('🌐 Using ComfyUI Backend Service');
    console.log('📋 Options:', options);

    // เลือกใช้ FLUX หรือ SDXL workflow
    const useFlux = options.useFlux || false;

    const getErrMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

    const extractAllowedCkptNames = (msg: string): string[] => {
      // Common ComfyUI error detail includes: ckpt_name: 'flux_dev.safetensors' not in ['a','b',...]
      const listMatch = msg.match(/ckpt_name:[^\n\r\]]*not in \[([^\]]+)\]/i);
      const rawList = listMatch?.[1];
      if (!rawList) return [];
      return Array.from(rawList.matchAll(/'([^']+)'/g))
        .map((m) => m[1])
        .filter(Boolean);
    };

    const pickBestFallbackCheckpoint = (allowed: string[]): string | undefined => {
      if (!allowed.length) return undefined;
      const preferred = ['sd_xl_base_1.0.safetensors', 'v1-5-pruned-emaonly.safetensors'];
      for (const name of preferred) {
        if (allowed.includes(name)) return name;
      }
      return allowed[0];
    };

    const shouldFallbackFromFlux = (err: unknown) => {
      const msg = getErrMsg(err);
      // ComfyUI returns a 400 with a node error like:
      // value_not_in_list ... ckpt_name: 'flux_dev.safetensors' not in [...]
      // Don't rely on exact phrasing like "status code 400".
      const lower = msg.toLowerCase();
      return lower.includes('value_not_in_list') && lower.includes('ckpt_name') && lower.includes('flux');
    };

    const runWithWorkflow = async (workflow: Record<string, unknown>) =>
      await generateImageWithBackend(
        prompt,
        workflow,
        referenceImage || optionsRefImage || undefined,
        5, // Default priority
        onProgressCallback // Pass progress callback
      );

    try {
      let workflow;
      if (useFlux) {
        console.log(`🚀 Using FLUX.1 workflow (${options.ckpt_name || 'flux_dev.safetensors'})`);
        workflow = buildFluxWorkflow(prompt, {
          ...options,
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });
      } else {
        const checkpointName = (options.ckpt_name as string) || 'sd_xl_base_1.0.safetensors';
        console.log(`🎨 Using SDXL workflow (${checkpointName})`);
        workflow = buildWorkflow(prompt, {
          ...options,
          ckpt_name: checkpointName, // Ensure checkpoint name is set
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });
      }

      console.log('🔧 Built workflow with nodes:', Object.keys(workflow).length);
      return await runWithWorkflow(workflow);
    } catch (err) {
      if (useFlux && shouldFallbackFromFlux(err)) {
        const msg = getErrMsg(err);
        const allowed = extractAllowedCkptNames(msg);
        const fallbackCheckpoint =
          pickBestFallbackCheckpoint(allowed) || 'sd_xl_base_1.0.safetensors';
        console.warn(
          `⚠️ FLUX checkpoint not available on this ComfyUI install. Falling back to SDXL (${fallbackCheckpoint}).`
        );

        const workflow = buildWorkflow(prompt, {
          ...options,
          ckpt_name: fallbackCheckpoint,
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });

        console.log('🔧 Built fallback workflow with nodes:', Object.keys(workflow).length);
        return await runWithWorkflow(workflow);
      }
      throw err;
    }
  } else {
    // Use local ComfyUI through backend service on port 8000
    console.log('💻 Using local ComfyUI through backend proxy (port 8000)');
    console.log('📋 Options:', options);

    // Build workflow same as backend mode
    const useFlux = options.useFlux || false;
    // Note: Video logic is now handled above, so we only handle Image workflows here

    const getErrMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

    const extractAllowedCkptNames = (msg: string): string[] => {
      const listMatch = msg.match(/ckpt_name:[^\n\r\]]*not in \[([^\]]+)\]/i);
      const rawList = listMatch?.[1];
      if (!rawList) return [];
      return Array.from(rawList.matchAll(/'([^']+)'/g))
        .map((m) => m[1])
        .filter(Boolean);
    };

    const pickBestFallbackCheckpoint = (allowed: string[]): string | undefined => {
      if (!allowed.length) return undefined;
      const preferred = ['sd_xl_base_1.0.safetensors', 'v1-5-pruned-emaonly.safetensors'];
      for (const name of preferred) {
        if (allowed.includes(name)) return name;
      }
      return allowed[0];
    };

    const shouldFallbackFromFlux = (err: unknown) => {
      const msg = getErrMsg(err);
      const lower = msg.toLowerCase();
      return lower.includes('value_not_in_list') && lower.includes('ckpt_name') && lower.includes('flux');
    };

    const runWithWorkflow = async (workflow: Record<string, unknown>) =>
      await generateImageWithBackend(
        prompt,
        workflow,
        referenceImage || optionsRefImage || undefined,
        5,
        onProgressCallback
      );

    try {
      let workflow;

      if (useFlux) {
        console.log(`🚀 Using FLUX.1 workflow (${options.ckpt_name || 'flux_dev.safetensors'})`);
        workflow = buildFluxWorkflow(prompt, {
          ...options,
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });
      } else {
        const checkpointName = (options.ckpt_name as string) || 'sd_xl_base_1.0.safetensors';
        console.log(`🎨 Using SDXL workflow (${checkpointName})`);
        workflow = buildWorkflow(prompt, {
          ...options,
          ckpt_name: checkpointName,
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });
      }

      console.log('🔧 Built workflow with nodes:', Object.keys(workflow).length);
      return await runWithWorkflow(workflow);
    } catch (err) {
      if (useFlux && shouldFallbackFromFlux(err)) {
        const msg = getErrMsg(err);
        const allowed = extractAllowedCkptNames(msg);
        const fallbackCheckpoint =
          pickBestFallbackCheckpoint(allowed) || 'sd_xl_base_1.0.safetensors';
        console.warn(
          `⚠️ FLUX checkpoint not available on this ComfyUI install. Falling back to SDXL (${fallbackCheckpoint}).`
        );

        const workflow = buildWorkflow(prompt, {
          ...options,
          ckpt_name: fallbackCheckpoint,
          referenceImage: (referenceImage || optionsRefImage) ?? undefined,
        });

        console.log('🔧 Built fallback workflow with nodes:', Object.keys(workflow).length);
        return await runWithWorkflow(workflow);
      }
      throw err;
    }
  }
}

export default {
  generateWithComfyUI,
  checkBackendStatus,
  getWorkerStats,
  getQueueStats,
  generateVideo,
  getVideoJobStatus,
  cancelVideoJob,
  getVideoRequirements,
  detectVideoModels,
};

