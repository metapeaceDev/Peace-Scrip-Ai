/**
 * Smart Queue Processor
 * 
 * Integrates load balancer with queue processing
 * Routes jobs to optimal backend (local/cloud/gemini)
 */

import { getWorkerManager } from './workerManager.js';
import { generateWithComfyUI } from './comfyuiClient.js';

let loadBalancer = null;

/**
 * Set load balancer instance
 */
export function setLoadBalancer(lb) {
  loadBalancer = lb;
}

/**
 * Process image generation with intelligent routing
 */
export async function processImageGenerationSmart(job) {
  const { prompt, workflow, referenceImage, userId, userPreferences } = job.data;
  
  try {
    // Use load balancer to select backend
    const selection = await loadBalancer.selectBackend(
      job, 
      userPreferences || {}
    );
    
    console.log(`🎨 Job ${job.id} routed to ${selection.backend} (score: ${selection.score})`);
    
    // Update progress
    await job.progress(10);
    
    // Process with selected backend using failover
    const result = await loadBalancer.processJobWithFailover(
      job,
      async (backend) => {
        switch (backend) {
          case 'local':
            return await processWithLocal(job, prompt, workflow, referenceImage);
          
          case 'cloud':
            return await processWithCloud(job, prompt, workflow, referenceImage);
          
          case 'gemini':
            return await processWithGemini(job, prompt);
          
          default:
            throw new Error(`Unknown backend: ${backend}`);
        }
      },
      userPreferences || {}
    );
    
    await job.progress(100);
    
    return {
      ...result,
      backend: selection.backend,
      cost: selection.estimatedCost
    };
    
  } catch (error) {
    console.error(`❌ Job ${job.id} processing error:`, error);
    throw error;
  }
}

/**
 * Process video generation with intelligent routing
 */
export async function processVideoGenerationSmart(job) {
  const { prompt, workflow, referenceImage, metadata, userId, userPreferences } = job.data;
  
  try {
    // Use load balancer to select backend
    const selection = await loadBalancer.selectBackend(
      job, 
      userPreferences || {}
    );
    
    console.log(`🎬 Video job ${job.id} routed to ${selection.backend} (score: ${selection.score})`);
    
    await job.progress(5);
    
    // Process with selected backend using failover
    const result = await loadBalancer.processJobWithFailover(
      job,
      async (backend) => {
        switch (backend) {
          case 'local':
            return await processVideoWithLocal(job, prompt, workflow, referenceImage, metadata);
          
          case 'cloud':
            return await processVideoWithCloud(job, prompt, workflow, referenceImage, metadata);
          
          case 'gemini':
            throw new Error('Gemini does not support video generation');
          
          default:
            throw new Error(`Unknown backend: ${backend}`);
        }
      },
      userPreferences || {}
    );
    
    await job.progress(100);
    
    return {
      ...result,
      backend: selection.backend,
      cost: selection.estimatedCost
    };
    
  } catch (error) {
    console.error(`❌ Video job ${job.id} processing error:`, error);
    throw error;
  }
}

/**
 * Process with local ComfyUI worker
 */
async function processWithLocal(job, prompt, workflow, referenceImage) {
  const workerManager = getWorkerManager();
  const worker = workerManager.getNextWorker();
  
  const result = await generateWithComfyUI({
    worker,
    prompt,
    workflow,
    referenceImage,
    isVideo: false,
    metadata: {},
    onProgress: async (progress, details) => {
      await job.progress(10 + (progress * 0.9));
    }
  });
  
  return {
    imageUrl: result.imageUrl,
    imageData: result.imageData,
    workerId: worker.id,
    processingTime: result.processingTime
  };
}

/**
 * Process with cloud worker
 */
async function processWithCloud(job, prompt, workflow, referenceImage) {
  const workerManager = getWorkerManager();
  const cloudManager = workerManager.getCloudManager();
  
  // Use cloud manager's processing
  const result = await cloudManager.processJob({
    jobId: job.id,
    prompt,
    workflow,
    referenceImage,
    isVideo: false,
    metadata: {},
    onProgress: async (progress, details) => {
      await job.progress(10 + (progress * 0.9));
    }
  });
  
  return {
    imageUrl: result.imageUrl,
    imageData: result.imageData,
    workerId: result.workerId || 'cloud',
    processingTime: result.processingTime
  };
}

/**
 * Process with Gemini AI
 */
async function processWithGemini(job, prompt) {
  // Import Gemini service
  const { generateImageWithGemini } = await import('./geminiService.js');
  
  const result = await generateImageWithGemini(prompt, {
    onProgress: async (progress) => {
      await job.progress(10 + (progress * 0.9));
    }
  });
  
  return {
    imageUrl: result.imageUrl,
    imageData: result.imageData,
    workerId: 'gemini',
    processingTime: result.processingTime
  };
}

/**
 * Process video with local ComfyUI worker
 */
async function processVideoWithLocal(job, prompt, workflow, referenceImage, metadata) {
  const workerManager = getWorkerManager();
  const worker = workerManager.getNextWorker();
  
  const result = await generateWithComfyUI({
    worker,
    prompt,
    workflow,
    referenceImage,
    isVideo: true,
    metadata: metadata || {},
    onProgress: async (progress, details) => {
      await job.progress(5 + (progress * 0.95));
    }
  });
  
  return {
    videoUrl: result.videoUrl,
    videoData: result.videoData,
    workerId: worker.id,
    processingTime: result.processingTime,
    numFrames: result.numFrames,
    fps: result.fps,
    filename: result.filename
  };
}

/**
 * Process video with cloud worker
 */
async function processVideoWithCloud(job, prompt, workflow, referenceImage, metadata) {
  const workerManager = getWorkerManager();
  const cloudManager = workerManager.getCloudManager();
  
  const result = await cloudManager.processJob({
    jobId: job.id,
    prompt,
    workflow,
    referenceImage,
    isVideo: true,
    metadata: metadata || {},
    onProgress: async (progress, details) => {
      await job.progress(5 + (progress * 0.95));
    }
  });
  
  return {
    videoUrl: result.videoUrl,
    videoData: result.videoData,
    workerId: result.workerId || 'cloud',
    processingTime: result.processingTime,
    numFrames: result.numFrames,
    fps: result.fps,
    filename: result.filename
  };
}
