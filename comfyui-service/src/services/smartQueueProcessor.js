/**
 * Smart Queue Processor
 * 
 * Integrates load balancer with queue processing
 * Routes jobs to optimal backend (local/cloud/gemini)
 */

import { getWorkerManager } from './workerManager.js';
import { generateWithComfyUI } from './comfyuiClient.js';
import axios from 'axios';

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
            return await processVideoWithLocal(job, prompt, workflow, referenceImage, metadata, userId);
          
          case 'cloud':
            return await processVideoWithCloud(job, prompt, workflow, referenceImage, metadata, userId);
          
          case 'gemini':
            throw new Error('Gemini does not support video generation');
          
          default:
            throw new Error(`Unknown backend: ${backend}`);
        }
      },
      userPreferences || {}
    );
    
    await job.progress(95);
    
    // 🆕 Extract actual result from loadBalancer wrapper
    // loadBalancer.processJobWithFailover returns { success, result, backend, cost }
    // We need result.result which contains the actual video data
    
    // 🔍 SUPER DEBUG: Log EVERYTHING
    console.log('=' .repeat(80));
    console.log('🔍 DEBUG processVideoGenerationSmart - RAW RESULT FROM LOAD BALANCER:');
    console.log('  typeof result:', typeof result);
    console.log('  result keys:', result ? Object.keys(result).join(', ') : 'NULL');
    console.log('  result.success:', result?.success);
    console.log('  result.backend:', result?.backend);
    console.log('  result.cost:', result?.cost);
    console.log('  typeof result.result:', typeof result?.result);
    console.log('  result.result keys:', result?.result ? Object.keys(result.result).join(', ') : 'NULL');
    
    const actualResult = result.result || result;
    
    console.log('\n🔍 AFTER UNWRAP - actualResult:');
    console.log('  typeof actualResult:', typeof actualResult);
    console.log('  actualResult keys:', actualResult ? Object.keys(actualResult).join(', ') : 'NULL');
    console.log('  hasVideoData:', !!actualResult.videoData);
    console.log('  videoData type:', typeof actualResult.videoData);
    console.log('  videoData isBuffer:', Buffer.isBuffer(actualResult.videoData));
    console.log('  videoData length:', actualResult.videoData?.length);
    console.log('  videoData first 20 bytes:', actualResult.videoData ? Buffer.from(actualResult.videoData).slice(0, 20).toString('hex') : 'N/A');
    console.log('=' .repeat(80));
    
    let videoUrl = actualResult.videoUrl || null;
    let uploadError = null;

    const resolveComfyUiDownloadUrl = () => {
      if (typeof actualResult.videoUrl === 'string' && actualResult.videoUrl.startsWith('http')) {
        return actualResult.videoUrl;
      }

      // If ComfyUI returned a filename, construct the /view URL.
      const filename = actualResult.filename;
      if (!filename) return null;

      const workerManager = getWorkerManager();
      const worker = actualResult.workerId ? workerManager.getWorker(actualResult.workerId) : workerManager.getNextWorker();
      if (!worker?.url) return null;

      return `${worker.url}/view?filename=${encodeURIComponent(filename)}&subfolder=&type=output`;
    };

    const fetchVideoBytes = async () => {
      if (actualResult.videoData) {
        return actualResult.videoData;
      }

      const downloadUrl = resolveComfyUiDownloadUrl();
      if (!downloadUrl) return null;

      console.log(`⬇️ Downloading video bytes from ComfyUI: ${downloadUrl}`);
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      return Buffer.from(response.data);
    };

    try {
      const { saveVideoToStorage } = await import('./firebaseService.js');
      const userIdForStorage = userId || 'anonymous';

      const bytes = await fetchVideoBytes();
      if (bytes) {
        console.log(`⬆️ Uploading video to Firebase Storage for user: ${userIdForStorage}`);
        videoUrl = await saveVideoToStorage(bytes, userIdForStorage, job.id);
        console.log(`✅ Video uploaded successfully: ${videoUrl}`);
      } else {
        console.log('ℹ️  No video bytes available for Firebase upload; returning local videoUrl only');
      }

      await job.progress(100);
    } catch (storageError) {
      console.error(`❌ Failed to upload video to Firebase Storage:`, storageError);
      uploadError = storageError.message;
      await job.progress(100);
    }
    
    return {
      ...actualResult,
      videoUrl,
      backend: selection.backend,
      cost: selection.estimatedCost,
      ...(uploadError && { storageError: uploadError })
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
async function processVideoWithLocal(job, prompt, workflow, referenceImage, metadata, userId) {
  const workerManager = getWorkerManager();
  const worker = workerManager.getNextWorker();
  
  console.log(`🎬 Processing video with local worker ${worker.id} for job ${job.id}`);
  
  const result = await generateWithComfyUI({
    worker,
    prompt,
    workflow,
    referenceImage,
    isVideo: true,
    metadata: metadata || {},
    onProgress: async (progress, details) => {
      const overallProgress = 5 + (progress * 0.90);
      await job.progress(overallProgress);
      console.log(`📊 Video progress: ${Math.round(overallProgress)}%`);
    }
  });
  
  console.log('🔍 DEBUG Local video result:', {
    hasVideoData: !!result.videoData,
    videoDataType: typeof result.videoData,
    isBuffer: Buffer.isBuffer(result.videoData),
    videoDataLength: result.videoData?.length
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
async function processVideoWithCloud(job, prompt, workflow, referenceImage, metadata, userId) {
  const workerManager = getWorkerManager();
  const cloudManager = workerManager.getCloudManager();
  
  console.log(`☁️ Processing video with cloud worker for job ${job.id}`);
  
  const result = await cloudManager.processJob({
    jobId: job.id,
    prompt,
    workflow,
    referenceImage,
    isVideo: true,
    metadata: metadata || {},
    onProgress: async (progress, details) => {
      const overallProgress = 5 + (progress * 0.90);
      await job.progress(overallProgress);
      console.log(`📊 Video progress: ${Math.round(overallProgress)}%`);
    }
  });
  
  console.log('🔍 DEBUG Cloud video result:', {
    hasVideoData: !!result.videoData,
    videoDataType: typeof result.videoData,
    isBuffer: Buffer.isBuffer(result.videoData),
    videoDataLength: result.videoData?.length
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
