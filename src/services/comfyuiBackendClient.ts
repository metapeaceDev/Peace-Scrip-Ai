/**
 * ComfyUI Backend Client
 *
 * Client สำหรับเรียกใช้ ComfyUI Backend Service
 * แทนการเรียก localhost:8188 โดยตรง
 */

import { auth } from '../config/firebase';
import app from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { recordGeneration } from './modelUsageTracker';
import { API_PRICING } from '../types/analytics';
import { buildWorkflow, buildFluxWorkflow } from './comfyuiWorkflowBuilder';

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';
const USE_BACKEND_SERVICE = import.meta.env.VITE_USE_COMFYUI_BACKEND === 'true';
const FACEID_SDXL_CHECKPOINT = (
  import.meta.env.VITE_FACEID_SDXL_CHECKPOINT as string | undefined
)?.trim();

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
      console.warn(
        `⚠️ ComfyUI Backend Health Check Failed: ${response.status} ${response.statusText}`
      );
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
  maxWait: number = 600000,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Default: 10 minutes for image jobs. Callers can override for exceptionally long workflows.
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  // Detect stalls (e.g. ComfyUI crash / worker stuck). Avoid waiting for the full timeout.
  const stallAfterMs = 3 * 60 * 1000; // 3 minutes with no progress change
  let lastProgressValue = -1;
  let lastProgressAt = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout per poll (increased for large image downloads)

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

        // Stall detection: if we're "processing" but progress never changes for a while,
        // it's usually a stuck worker or a crashed ComfyUI container.
        if (progressValue !== lastProgressValue) {
          lastProgressValue = progressValue;
          lastProgressAt = Date.now();
        } else if (
          (state === 'processing' || state === 'running') &&
          progressValue > 0 &&
          Date.now() - lastProgressAt > stallAfterMs
        ) {
          throw new Error(
            `⚠️ Generation stuck (no progress for ${Math.round(stallAfterMs / 60000)} min)\n\n` +
              '**Possible Causes:**\n' +
              '• InstantID face analysis running on CPU (very slow)\n' +
              '• ComfyUI worker crashed\n' +
              '• GPU out of memory\n\n' +
              '**Troubleshooting:**\n' +
              '1. Check ComfyUI logs: docker logs comfyui-animatediff\n' +
              '2. Verify GPU available: nvidia-smi\n' +
              '3. Restart container if needed: docker restart comfyui-animatediff'
          );
        }
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

          // Convert ComfyUI direct URL to backend proxy URL to avoid CORS
          let proxiedUrl = imageUrl;
          if (imageUrl.includes('localhost:8188/view')) {
            // Extract filename from ComfyUI URL
            const urlObj = new URL(imageUrl);
            const filename = urlObj.searchParams.get('filename');
            const subfolder = urlObj.searchParams.get('subfolder') || '';
            const type = urlObj.searchParams.get('type') || 'output';

            // Use backend proxy endpoint
            proxiedUrl = `http://localhost:8000/image?filename=${filename}&subfolder=${subfolder}&type=${type}`;
            console.log(`🔄 Proxying through backend: ${proxiedUrl}`);
          }

          // Download from proxied URL and convert to base64
          try {
            const base64Data = await downloadAndConvertToBase64(proxiedUrl);
            if (base64Data) {
              console.log('✅ Converted Storage URL to base64');
              return base64Data;
            }
          } catch (error) {
            console.warn('⚠️ Failed to convert Storage URL to base64:', error);
          }

          // Fallback to imageData or return URL
          return imageData || proxiedUrl;
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

  const minutes = Math.round(maxWait / 60000);
  throw new Error(
    `⏱️ Generation timeout after ${minutes} minutes\n\n` +
      '**Possible Causes:**\n' +
      '• ComfyUI backend overloaded\n' +
      '• Worker stuck or crashed\n' +
      '• GPU not being used (running on CPU)\n\n' +
      '**Troubleshooting:**\n' +
      '1. Check backend status: curl http://localhost:8000/health\n' +
      '2. Check ComfyUI logs: docker logs comfyui-animatediff\n' +
      '3. Verify GPU: docker exec comfyui-animatediff nvidia-smi\n' +
      '4. Check ONNXRuntime: docker exec comfyui-animatediff python3 -c "import onnxruntime as ort; print(ort.get_available_providers())"'
  );
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
      platform: data.platform,
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
  characterImages?: string[];
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
        characterImages: params.characterImages,
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
export async function cancelVideoJob(
  jobId: string
): Promise<{ success: boolean; message: string }> {
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
    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/video/requirements/${videoType}`);

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
 * Refresh expired Firebase Storage URLs (signed URLs) into non-expiring token URLs.
 */
export async function refreshVideoUrls(
  videoUrls: string[]
): Promise<
  Array<{
    oldUrl: string;
    newUrl: string | null;
    status: 'success' | 'failed';
    error?: string;
  }>
> {
  const configuredBackendUrl = String(import.meta.env.VITE_COMFYUI_SERVICE_URL || '').trim();
  const isLocalBackend =
    configuredBackendUrl.includes('localhost') || configuredBackendUrl.includes('127.0.0.1');
  const canUseBackend = configuredBackendUrl.length > 0 && !(import.meta.env.PROD && isLocalBackend);

  // 1) Prefer ComfyUI backend when configured (local/dev or deployed backend).
  if (canUseBackend) {
    const isHealthy = await checkServiceHealth();
    if (!isHealthy) {
      throw new Error('ComfyUI backend service is not available');
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Backend allows anonymous refresh; use auth when available.
    try {
      const idToken = await getIdToken();
      headers = { ...headers, Authorization: `Bearer ${idToken}` };
    } catch {
      // ignore
    }

    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/video/refresh-urls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ videoUrls }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to refresh video URLs');
    }

    const result = await response.json();
    return result?.data?.refreshedUrls || [];
  }

  // 2) Production fallback: use Firebase Functions callable.
  const functions = getFunctions(app);
  const callable = httpsCallable<
    { videoUrls: string[] },
    {
      refreshedUrls: Array<{
        oldUrl: string;
        newUrl: string | null;
        status: 'success' | 'failed';
        error?: string;
      }>;
      summary: { total: number; success: number; failed: number };
    }
  >(functions, 'refreshVideoUrls');

  const resp = await callable({ videoUrls });
  return resp?.data?.refreshedUrls || [];
}

/**
 * Poll video job status until complete
 */
async function pollVideoJob(
  jobId: string,
  onProgress?: (progress: number, details?: any, jobId?: string) => void,
  progressRamp?: {
    startPct: number;
    endPct: number;
    durationMs: number;
  }
): Promise<string> {
  const startTime = Date.now();
  // Base cap for typical video models.
  // WAN 14B (and heavy workflows) can legitimately exceed 40 minutes, especially with more frames/steps.
  // Use the caller's estimate (progressRamp.durationMs) to scale maxWait upward while keeping a hard ceiling.
  const baseMaxWait = 2400000; // 40 minutes
  const hardMaxWait = 3 * 60 * 60 * 1000; // 3 hours
  const estimatedMs =
    typeof progressRamp?.durationMs === 'number' && Number.isFinite(progressRamp.durationMs)
      ? Math.max(0, progressRamp.durationMs)
      : 0;

  // Example: if estimated duration is 25min, allow ~72.5min total before timing out.
  // If estimate is small/zero, fall back to baseMaxWait.
  const scaledMaxWait = estimatedMs > 0 ? Math.round(estimatedMs * 2.5 + 10 * 60 * 1000) : baseMaxWait;
  const maxWait = Math.max(baseMaxWait, Math.min(hardMaxWait, scaledMaxWait));
  const pollInterval = 3000; // 3 seconds

  // Ensure progress starts from 0% and never goes backwards.
  let lastUiProgress = 0;
  let lastBackendDisplayProgress = 0;
  let processingStartTime: number | null = null;

  // Time-based progress ramp:
  // - Helps prevent perceived stalls when the backend reports progress in coarse chunks.
  // - Never exceeds 99% unless the job is actually completed.
  const computeRampPct = (elapsedMs: number) => {
    if (!progressRamp) return null;
    const dur = Math.max(1, progressRamp.durationMs);
    const t = Math.max(0, Math.min(1, elapsedMs / dur));
    const start = Math.max(0, Math.min(99, progressRamp.startPct));
    const end = Math.max(start, Math.min(99, progressRamp.endPct));
    return start + (end - start) * t;
  };

  // Requested mapping:
  // - Backend (display) 0..95  -> UI 0..35
  // - Backend (display) 95..99 -> UI 35..98
  // - UI hits 100 only when job is completed
  const mapBackendToUiPct = (backendDisplayPct: number, status: string | undefined) => {
    if (status !== 'processing') return 0;
    const pct = Math.max(0, Math.min(99, backendDisplayPct));

    if (pct <= 95) {
      const mapped = Math.floor((pct / 95) * 35);
      // Once backend has started, ensure UI shows at least 1%.
      return pct > 0 ? Math.max(1, mapped) : 0;
    }

    // 95..99 -> 35..98 (span=4 points -> 63 UI points)
    const t = Math.max(0, Math.min(1, (pct - 95) / 4));
    return Math.min(98, 35 + Math.floor(t * 63));
  };
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
            console.warn(
              '⚠️ Storage upload failed, using local video URL instead:',
              status.result.storageError
            );
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
        const boundedRaw = Math.max(0, Math.min(100, rawProgress));
        if (currentStatus === 'processing' && processingStartTime === null) {
          processingStartTime = Date.now();
        }

        const elapsedSinceProcessingMs =
          currentStatus === 'processing' && typeof processingStartTime === 'number'
            ? Date.now() - processingStartTime
            : 0;

        const rampPct =
          currentStatus === 'processing' ? computeRampPct(elapsedSinceProcessingMs) : null;

        // Smooth backend display progress ("เปอร์เซ็นของจริง" ที่โชว์ใน log):
        // - anchored to raw backend progress
        // - keeps moving via time ramp when raw is coarse/stalled
        // - capped at 99 until completed
        const backendEffectiveGoal = Math.max(
          boundedRaw,
          typeof rampPct === 'number' ? rampPct : 0
        );
        const backendCappedGoal =
          currentStatus === 'processing' ? Math.min(99, backendEffectiveGoal) : 0;
        const backendDisplayProgress = Math.max(lastBackendDisplayProgress, backendCappedGoal);
        lastBackendDisplayProgress = backendDisplayProgress;

        // Map backend display progress into UI progress per the requested 2-phase curve.
        const uiGoal = mapBackendToUiPct(backendDisplayProgress, currentStatus);
        let uiProgress = Math.max(lastUiProgress, uiGoal);

        // Smooth UI jumps (avoid big leaps between polls).
        if (currentStatus === 'processing') {
          const jump = uiGoal - lastUiProgress;
          if (jump > 5) {
            const stepUp = jump >= 60 ? 15 : jump >= 30 ? 10 : jump >= 15 ? 6 : 3;
            uiProgress = Math.min(uiGoal, lastUiProgress + stepUp);
          }
        }

        lastUiProgress = uiProgress;

        console.log(
          `🔄 Video Progress: ui=${Math.round(uiProgress)}% (backend=${Math.round(backendDisplayProgress)}%, raw=${Math.round(boundedRaw)}%) | Status: ${currentStatus}`
        );

        // 🔍 DEBUG: If UI hits 100 but not completed, dump status
        if (uiProgress >= 100) {
          console.warn(
            '⚠️ Progress 100% but not completed! Full Status:',
            JSON.stringify(status, null, 2)
          );

          // 🆕 Auto-fix: If progress is 100 and we have a videoUrl, treat as completed
          if (status.videoUrl || status.result?.videoUrl) {
            console.warn('💡 Auto-detecting completion based on videoUrl presence');
            status.status = 'completed';
            continue; // Restart loop iteration to hit the completion block
          }
        }

        const details = (() => {
          const base = status.result;
          const meta = {
            _progress: {
              ui: Math.round(uiProgress),
              backend: Math.round(backendDisplayProgress),
              raw: Math.round(boundedRaw),
            },
          };

          if (base && typeof base === 'object' && !Array.isArray(base)) {
            return { ...(base as Record<string, unknown>), ...meta };
          }

          return { result: base, ...meta };
        })();

        onProgress(uiProgress, details, jobId); // 🆕 Pass jobId
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

  const waitedSec = Math.round((Date.now() - startTime) / 1000);
  throw new Error(
    `Video generation timed out after ${waitedSec}s (jobId=${jobId}). The ComfyUI job may still be running on http://localhost:8188.`
  );
}

/**
 * Main export: ใช้ backend service หรือ localhost ComfyUI
 */
export async function generateWithComfyUI(
  prompt: string,
  options: Record<string, unknown> = {},
  referenceImage: string | null = null
): Promise<string> {
  const stripImageDataUrlPrefix = (value: string): string => {
    // Only strip for data URLs; keep normal URLs intact.
    if (value.startsWith('data:image/')) {
      return value.replace(/^data:image\/\w+;base64,/, '');
    }
    return value;
  };

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

    let videoType = ((): 'animatediff' | 'svd' | 'wan' => {
      if (explicitVideoType === 'wan') return 'wan';
      if (useWan) return 'wan';
      if (useSVD) return 'svd';
      return 'animatediff';
    })();

    const rawCharacterImages = Array.isArray((options as any)?.characterImages)
      ? ((options as any).characterImages as unknown[])
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .map(stripImageDataUrlPrefix)
      : [];

    // Prefer storyboard/init image when present; otherwise fall back to first character face ref.
    const normalizedReferenceImage =
      typeof referenceImage === 'string' && referenceImage.length > 0
        ? stripImageDataUrlPrefix(referenceImage)
        : null;
    const normalizedOptionsRefImage =
      typeof optionsRefImage === 'string' && optionsRefImage.length > 0
        ? stripImageDataUrlPrefix(optionsRefImage)
        : null;

    let finalRefImage = (normalizedReferenceImage || normalizedOptionsRefImage) ?? undefined;
    if (!finalRefImage && rawCharacterImages.length > 0) {
      finalRefImage = rawCharacterImages[0];
    }

    // Heuristic:
    // - WAN (text-to-video) is prompt-only in this project; referenceImage won't reliably influence the result.
    // - We only auto-switch to an image-conditioned backend for close-up identity-critical shots.
    //   (Auto-switching to AnimateDiff for continuity proved too unstable on some setups and can produce abstract output.)
    const shotData = (options as any)?.shotData;
    const movement = typeof shotData?.movement === 'string' ? shotData.movement.toLowerCase() : '';
    const shotSizeRaw =
      typeof shotData?.shotSize === 'string' ? shotData.shotSize.toLowerCase() : '';

    const isCloseUp = ['ecu', 'cu', 'mcu'].includes(shotSizeRaw);

    const rawCast = (shotData as any)?.cast;
    const hasCast =
      (typeof rawCast === 'string' && rawCast.trim().length > 0) ||
      (Array.isArray(rawCast) && rawCast.some(v => typeof v === 'string' && v.trim().length > 0));

    const hasCharacterContext =
      !!(options as any)?.character || hasCast || rawCharacterImages.length > 0;

    const hasReferenceForConditioning = !!finalRefImage;

    if (hasReferenceForConditioning) {
      console.log(
        `🎨 Reference image detected for video generation (${shotSizeRaw} shot with ${rawCast ? 'cast' : 'no cast'})`
      );
    }

    if (videoType === 'wan' && hasReferenceForConditioning && isCloseUp && hasCharacterContext) {
      // Important: auto-switching models mid-project causes noticeable motion/style discontinuity.
      // Keep WAN selected and let the backend attempt safe image-conditioning (I2V injection) when available.
      console.warn(
        '🎯 Identity hint: Close-up with reference image detected. Staying on WAN to preserve motion/style continuity.'
      );
    }

    // For SVD, we need a reference image
    if (videoType === 'svd' && !finalRefImage) {
      throw new Error('SVD video generation requires a reference image');
    }

    const rawFrameCount =
      (typeof options.numFrames === 'number' ? (options.numFrames as number) : undefined) ??
      (typeof (options as any).frameCount === 'number'
        ? ((options as any).frameCount as number)
        : undefined);

    const clampInt = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.round(n)));

    const getEffectiveFrameCount = (
      videoType: 'animatediff' | 'svd' | 'wan',
      requested?: number
    ) => {
      if (typeof requested !== 'number' || !Number.isFinite(requested)) return undefined;
      // Conservative caps aligned with backend/model expectations.
      if (videoType === 'svd') return 25;
      if (videoType === 'animatediff') return clampInt(requested, 8, 128);
      
      // WAN maxFrames in this project defaults to 201.
      // WAN (WanVideoWrapper) frame constraint is stricter than typical VAE stride in some builds.
      // To avoid rare but fatal RuntimeError from torch.arange(...) inside split_cross_attn_ffn,
      // we snap to: num_frames = 16k + 1 (17, 33, 49, 65, 81, 97, ...).
      const clamped = clampInt(requested, 17, 201);

      const stride = 16;
      const base = Math.max(0, clamped - 1);
      const down = Math.floor(base / stride) * stride + 1;
      const up = Math.ceil(base / stride) * stride + 1;
      const boundedDown = clampInt(down, 17, 201);
      const boundedUp = clampInt(up, 17, 201);

      // Prefer the nearest value; tie-break upward to preserve duration.
      return Math.abs(boundedUp - clamped) <= Math.abs(clamped - boundedDown)
        ? boundedUp
        : boundedDown;
    };

    const rawMotionStrength =
      typeof options.motionStrength === 'number' ? (options.motionStrength as number) : undefined;

    const isStaticShot = movement.includes('static') || movement.includes('still');

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

    const getWanShift = (motionStrength: number) => {
      // WanVideoWrapper uses `shift` (passed as motionScale in this app).
      // Original clean mapping: UI slider (1-255) → WAN shift (1.5-7.0)
      if (!Number.isFinite(motionStrength)) return 5.0;

      const clampShift = (s: number) => Math.max(1.5, Math.min(7.0, s));

      // Simple linear mapping without adjustments
      if (motionStrength <= 1) {
        // 0..1 style
        const shift = 1.5 + clamp01(motionStrength) * 5.5; // ~1.5..7.0
        return clampShift(shift);
      }

      // 1..255 style (UI slider)
      const bounded = Math.max(0, Math.min(255, motionStrength));
      const shift = 1.5 + (bounded / 255) * 5.5; // ~1.5..7.0
      return clampShift(shift);
    };
    const getSvdMotionBucket = (motionStrength: number) => {
      // Map 0..1 motion strength into a balanced SVD motion_bucket_id range.
      // Sweet spot: 100-160 for natural character animation without instability.
      const normalized = (() => {
        if (!Number.isFinite(motionStrength)) return 0.5;
        // Support both 0..1 (legacy) and 1..255 (UI slider).
        if (motionStrength <= 1) return clamp01(motionStrength);
        const bounded = Math.max(0, Math.min(255, motionStrength));
        return bounded / 255;
      })();

      // BALANCED: ~100-160 range provides character motion without warping/instability.
      // Below 80: mostly camera motion. Above 180: unstable/warping.
      const base = Math.round(80 + normalized * 100); // ~80..180

      const movement =
        typeof shotData?.movement === 'string' ? shotData.movement.toLowerCase() : '';
      const transitionType =
        typeof (options as any)?.transitionType === 'string'
          ? ((options as any).transitionType as string).toLowerCase()
          : '';

      const isStatic = movement.includes('static') || movement.includes('still');
      const isSeamless = transitionType === 'seamless';

      // Balanced guardrails: stable motion with character animation.
      const clamped = Math.max(1, Math.min(255, base));
      if (isStatic) {
        // Static: subtle breathing/micro-expressions (avoid full freeze).
        return Math.min(Math.max(clamped, isCloseUp ? 110 : 95), 140);
      }
      if (isSeamless) {
        // Seamless continuity: smooth motion without jarring jumps.
        return Math.min(Math.max(clamped, isCloseUp ? 120 : 105), 160);
      }

      // Close-ups: ensure facial animation (blinks, subtle expressions).
      if (isCloseUp) return Math.max(clamped, 120);

      return clamped;
    };

    const motionScale =
      videoType === 'svd' && typeof rawMotionStrength === 'number'
        ? getSvdMotionBucket(rawMotionStrength)
        : videoType === 'wan' && typeof rawMotionStrength === 'number'
          ? getWanShift(rawMotionStrength)
          : rawMotionStrength;

    if (videoType === 'wan' && typeof rawMotionStrength === 'number') {
      console.log(
        `🧭 WAN shift mapping: motionStrength=${rawMotionStrength} → shift=${typeof motionScale === 'number' ? motionScale.toFixed(2) : 'n/a'}`
      );
    }

    if (videoType === 'svd' && typeof motionScale === 'number') {
      console.log(
        `🎯 SVD motion bucket: ${motionScale} | Shot: ${shotSizeRaw} | Static: ${isStaticShot} | Close-up: ${isCloseUp}`
      );
    }

    // Ensure UI progress starts at 0 immediately on submit.
    if (onProgressCallback) {
      onProgressCallback(0, { status: 'submitting', videoType });
    }

    const effectiveNumFrames = getEffectiveFrameCount(videoType, rawFrameCount);

    // Use original resolution without modifications
    let effectiveWidth = typeof options.width === 'number' ? (options.width as number) : undefined;
    let effectiveHeight =
      typeof options.height === 'number' ? (options.height as number) : undefined;

    let finalPrompt = prompt;
    let finalNegativePrompt =
      typeof options.negativePrompt === 'string' ? (options.negativePrompt as string) : undefined;

    // 🕒 WAN FPS NORMALIZATION
    // Wan models/workflows often behave best around lower FPS, but clamping too aggressively can
    // make motion feel unnaturally slow. We only normalize clearly out-of-range values, and when
    // we do, we (when possible) recompute frames to preserve the intended duration.
    const requestedFps =
      typeof options.fps === 'number' && Number.isFinite(options.fps as number)
        ? (options.fps as number)
        : undefined;

    // WAN-safe FPS range: keep common cinematic values (e.g. 24) intact.
    // Only clamp extremes that tend to cause odd tempo perception.
    const clampWanFps = (fps: number) => {
      const rounded = Math.round(fps);
      return Math.max(6, Math.min(24, rounded));
    };

    let effectiveFps = requestedFps;
    
    // 🔧 WAN: Always validate frame count through WAN formula
    let effectiveWanFrames =
      videoType === 'wan' && typeof effectiveNumFrames === 'number'
        ? getEffectiveFrameCount('wan', effectiveNumFrames)
        : effectiveNumFrames;

    if (videoType === 'wan' && typeof requestedFps === 'number') {
      const safeFps = clampWanFps(requestedFps);
      if (safeFps !== requestedFps) {
        // Preserve duration if we know frames.
        if (typeof effectiveNumFrames === 'number' && effectiveNumFrames > 0) {
          const approxDurationSec = effectiveNumFrames / requestedFps;
          effectiveWanFrames = getEffectiveFrameCount('wan', approxDurationSec * safeFps);
        }

        console.warn(
          `⏱️ WAN FPS normalized: fps=${requestedFps} → ${safeFps}` +
            (typeof effectiveWanFrames === 'number'
              ? `, frames=${effectiveNumFrames ?? 'n/a'} → ${effectiveWanFrames}`
              : '')
        );
      }
      effectiveFps = safeFps;
    }

    // 🛡️ WAN 2.1 SAFETY: Cap steps and cfg to prevent crashes
    let safeSteps = typeof options.steps === 'number' ? (options.steps as number) : 30;
    let safeCfg = typeof options.cfg === 'number' ? (options.cfg as number) : 6.0;

    if (videoType === 'wan') {
      const originalSteps = safeSteps;
      const originalCfg = safeCfg;

      // Wan 2.1's UniPC scheduler has a hard limit around 30-35 steps
      safeSteps = Math.min(safeSteps, 30);
      // Wan 2.1 works best with CFG around 5-7
      safeCfg = Math.max(5.0, Math.min(safeCfg, 7.0));

      if (originalSteps !== safeSteps || originalCfg !== safeCfg) {
        console.warn(
          `⚠️ WAN Safety: Adjusted params from steps=${originalSteps}→${safeSteps}, cfg=${originalCfg}→${safeCfg}`
        );
      }
      console.log(`🛡️ WAN defaults: steps=${safeSteps}, cfg=${safeCfg}`);
    }

    const videoJob = await generateVideo({
      type: videoType,
      prompt: finalPrompt,
      numFrames: videoType === 'wan' ? effectiveWanFrames : effectiveNumFrames,
      fps: videoType === 'wan' ? effectiveFps : (options.fps as number) || undefined,
      steps: safeSteps,
      referenceImage: finalRefImage,
      characterImages: rawCharacterImages.length > 0 ? rawCharacterImages : undefined,
      negativePrompt: finalNegativePrompt,
      seed: typeof options.seed === 'number' ? (options.seed as number) : undefined,
      width: typeof effectiveWidth === 'number' ? effectiveWidth : undefined,
      height: typeof effectiveHeight === 'number' ? effectiveHeight : undefined,
      cfg: safeCfg,
      motionScale: typeof motionScale === 'number' ? motionScale : undefined,
      motionModel:
        typeof (options as any).motionModel === 'string'
          ? ((options as any).motionModel as string)
          : undefined,
      lora: typeof options.lora === 'string' ? (options.lora as string) : undefined,
      loraStrength:
        typeof (options as any).loraStrength === 'number'
          ? ((options as any).loraStrength as number)
          : undefined,
      videoModel:
        typeof (options as any).videoModel === 'string'
          ? ((options as any).videoModel as string)
          : undefined,
      modelPath:
        typeof (options as any).modelPath === 'string'
          ? ((options as any).modelPath as string)
          : undefined,
      onProgress: onProgressCallback,
    });

    console.log(`⏳ Polling video job ${videoJob.jobId}...`);

    // 🕒 Progress ramp (0→99) based on frames×steps so users see smooth motion during GPU-heavy work.
    const estimateVideoMs = (
      type: 'animatediff' | 'svd' | 'wan',
      frames?: number,
      steps?: number
    ) => {
      const frameCount = typeof frames === 'number' && Number.isFinite(frames) ? frames : 25;
      const stepCount = typeof steps === 'number' && Number.isFinite(steps) ? steps : 30;

      const baseMs = type === 'wan' ? 90_000 : type === 'animatediff' ? 60_000 : 45_000;
      const perStepPerFrameMs = type === 'wan' ? 130 : type === 'animatediff' ? 90 : 60;

      return baseMs + frameCount * stepCount * perStepPerFrameMs;
    };

    const submittedFrames = (videoType === 'wan' ? effectiveWanFrames : effectiveNumFrames) ?? 25;
    const estimatedTotalMs = estimateVideoMs(videoType, submittedFrames, safeSteps);
    // Ramp earlier (40→98): use a larger fraction of the total estimate to avoid hitting 98% too early.
    const rampDurationMs = Math.max(
      120_000,
      Math.min(25 * 60_000, Math.round(estimatedTotalMs * 0.92))
    );

    return await pollVideoJob(videoJob.jobId, onProgressCallback, {
      startPct: 0,
      endPct: 99,
      durationMs: rampDurationMs,
    });
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
        .map(m => m[1])
        .filter(Boolean);
    };

    const pickBestFallbackCheckpoint = (allowed: string[]): string | undefined => {
      if (!allowed.length) return undefined;
      // 🛡️ Prioritize v1-5 over SDXL to avoid incomplete downloads
      const preferred = ['v1-5-pruned-emaonly.safetensors', 'sd_xl_base_1.0.safetensors'];
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
      return (
        lower.includes('value_not_in_list') && lower.includes('ckpt_name') && lower.includes('flux')
      );
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
        let checkpointName = (options.ckpt_name as string) || 'sd_xl_base_1.0.safetensors';

        // FaceID-only: prefer a photoreal SDXL checkpoint if configured.
        // Don't fetch /models/checkpoints here (browser CORS varies by ComfyUI config).
        // If it's missing, ComfyUI will throw value_not_in_list and we will fallback.
        const hasFaceIdRef = !!(referenceImage || optionsRefImage);
        if (hasFaceIdRef && FACEID_SDXL_CHECKPOINT) {
          checkpointName = FACEID_SDXL_CHECKPOINT;
        }
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

      // FaceID checkpoint fallback (SDXL): if configured checkpoint isn't installed on ComfyUI.
      {
        const msg = getErrMsg(err);
        const lower = msg.toLowerCase();
        // const faceIdLower = (FACEID_SDXL_CHECKPOINT || '').toLowerCase();
        const hasFaceIdRef = !!(referenceImage || optionsRefImage);
        const looksLikeMissingCkpt =
          lower.includes('value_not_in_list') && lower.includes('ckpt_name');
        const isInsightFaceError =
          lower.includes('insightface') ||
          lower.includes('antelopev2') ||
          (lower.includes('assertionerror') && lower.includes('detection'));

        // Case 1: Checkpoint not found - try fallback
        if (!useFlux && looksLikeMissingCkpt) {
          const allowed = extractAllowedCkptNames(msg);
          const fallbackCheckpoint =
            pickBestFallbackCheckpoint(allowed) || 'sd_xl_base_1.0.safetensors';
          console.warn(
            `⚠️ Checkpoint not available on this ComfyUI install. Falling back to ${fallbackCheckpoint}.`
          );
          console.warn(`   Requested: ${FACEID_SDXL_CHECKPOINT || options.ckpt_name || 'unknown'}`);
          console.warn(`   Available: ${allowed.join(', ') || 'sd_xl_base_1.0.safetensors'}`);

          const workflow = buildWorkflow(prompt, {
            ...options,
            ckpt_name: fallbackCheckpoint,
            referenceImage: (referenceImage || optionsRefImage) ?? undefined,
          });

          console.log('🔧 Built fallback workflow with nodes:', Object.keys(workflow).length);
          return await runWithWorkflow(workflow);
        }

        // Case 2: InsightFace models missing - provide helpful error
        if (isInsightFaceError && hasFaceIdRef) {
          console.error('❌ InstantID requires InsightFace models to be installed');
          throw new Error(
            'InstantID Error: InsightFace models (antelopev2) are not properly installed on ComfyUI. ' +
              'Please install them or use "Standard (No Face ID)" mode instead. ' +
              'See docs/features/face-id/INSTALLATION.md for setup instructions.'
          );
        }
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
        .map(m => m[1])
        .filter(Boolean);
    };

    const pickBestFallbackCheckpoint = (allowed: string[]): string | undefined => {
      if (!allowed.length) return undefined;
      // 🛡️ Prioritize v1-5 over SDXL to avoid incomplete downloads
      const preferred = ['v1-5-pruned-emaonly.safetensors', 'sd_xl_base_1.0.safetensors'];
      for (const name of preferred) {
        if (allowed.includes(name)) return name;
      }
      return allowed[0];
    };

    const shouldFallbackFromFlux = (err: unknown) => {
      const msg = getErrMsg(err);
      const lower = msg.toLowerCase();
      return (
        lower.includes('value_not_in_list') && lower.includes('ckpt_name') && lower.includes('flux')
      );
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
