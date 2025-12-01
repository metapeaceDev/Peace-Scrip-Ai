/**
 * ComfyUI Backend Client
 * 
 * Client สำหรับเรียกใช้ ComfyUI Backend Service
 * แทนการเรียก localhost:8188 โดยตรง
 */

import { auth } from '../config/firebase';

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';
const USE_BACKEND_SERVICE = import.meta.env.VITE_USE_COMFYUI_BACKEND === 'true';

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
  workflow: any,
  referenceImage: string | null = null,
  priority: number = 5
): Promise<string> {
  try {
    const idToken = await getIdToken();

    // Submit job to queue
    const response = await fetch(`${COMFYUI_SERVICE_URL}/api/comfyui/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        prompt,
        workflow,
        referenceImage,
        priority
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit job');
    }

    const result = await response.json();
    const { jobId } = result.data;

    console.log(`📤 Job submitted: ${jobId}`);

    // Poll for result
    return await pollJobStatus(jobId, idToken);

  } catch (error) {
    console.error('❌ Backend generation failed:', error);
    throw error;
  }
}

/**
 * Poll job status until complete
 */
async function pollJobStatus(jobId: string, idToken: string, maxWait: number = 300000): Promise<string> { // 5 minutes
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(`${COMFYUI_SERVICE_URL}/api/comfyui/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const result = await response.json();
      const { state, progress, result: jobResult, failedReason } = result.data;

      console.log(`📊 Job ${jobId}: ${state} (${progress}%)`);

      if (state === 'completed') {
        console.log(`✅ Job ${jobId} completed`);
        return jobResult.imageData; // Return base64 image
      }

      if (state === 'failed') {
        throw new Error(`Job failed: ${failedReason}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error('❌ Polling error:', error);
      throw error;
    }
  }

  throw new Error('Job timeout after 5 minutes');
}

/**
 * Check if backend service is available
 */
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${COMFYUI_SERVICE_URL}/health/detailed`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
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
      queue: data.queue
    };

  } catch (error) {
    return {
      running: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
        'Authorization': `Bearer ${idToken}`
      }
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
        'Authorization': `Bearer ${idToken}`
      }
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
 * Main export: ใช้ backend service หรือ localhost ComfyUI
 */
export async function generateWithComfyUI(
  prompt: string,
  workflow: any,
  referenceImage: string | null = null
): Promise<string> {
  if (USE_BACKEND_SERVICE) {
    console.log('🌐 Using ComfyUI Backend Service');
    return await generateImageWithBackend(prompt, workflow, referenceImage);
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
  getQueueStats
};
