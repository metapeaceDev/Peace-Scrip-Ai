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
    const response = await fetch(`${COMFYUI_SERVICE_URL}/health/detailed`, {
      signal: AbortSignal.timeout(2000),
    });

    serviceAvailable = response.ok;
    lastCheck = now;
    return serviceAvailable;
  } catch {
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
  type: 'animatediff' | 'svd';
  prompt: string;
  numFrames?: number;
  fps?: number;
  steps?: number;
  referenceImage?: string;
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
        : `${COMFYUI_SERVICE_URL}/api/video/generate/svd`;

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
        userId: params.userId || auth.currentUser?.uid,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to submit video job');
    }

    const result = await response.json();
    console.log('🎬 Video job submitted:', result);

    return result;
  } catch (error) {
    console.error('❌ Video generation failed:', error);
    throw error;
  }
}

/**
 * Get video job status
 */
export async function getVideoJobStatus(jobId: string): Promise<{
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
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
    return result;
  } catch (error) {
    console.error('❌ Failed to get video job status:', error);
    throw error;
  }
}

/**
 * Cancel video job
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
    return result;
  } catch (error) {
    console.error('❌ Failed to cancel video job:', error);
    throw error;
  }
}

/**
 * Get video requirements
 */
export async function getVideoRequirements(videoType: 'animatediff' | 'svd'): Promise<{
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
    return result;
  } catch (error) {
    console.error('❌ Failed to get video requirements:', error);
    throw error;
  }
}

/**
 * Detect available video models
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
    return result;
  } catch (error) {
    console.error('❌ Failed to detect video models:', error);
    throw error;
  }
}

/**
 * Main export: ใช้ backend service หรือ localhost ComfyUI
 */
export async function generateWithComfyUI(
  prompt: string,
  options: Record<string, unknown> = {},
  referenceImage: string | null = null
): Promise<string> {
  if (USE_BACKEND_SERVICE) {
    console.log('🌐 Using ComfyUI Backend Service');
    console.log('📋 Options:', options);

    // เลือกใช้ FLUX หรือ SDXL workflow
    const useFlux = options.useFlux || false;

    // Extract typed values from options
    const optionsRefImage =
      typeof options.referenceImage === 'string' ? options.referenceImage : null;
    const onProgressCallback =
      typeof options.onProgress === 'function'
        ? (options.onProgress as (progress: number) => void)
        : undefined;

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

    return await generateImageWithBackend(
      prompt,
      workflow,
      referenceImage || optionsRefImage || undefined,
      5, // Default priority
      onProgressCallback // Pass progress callback
    );
  } else {
    console.log('💻 Using local ComfyUI');
    // Fallback to existing local ComfyUI logic
    throw new Error('Local ComfyUI not implemented. Please enable backend service.');
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

