/**
 * Queue Service - Bull + Redis
 * 
 * Manages image generation jobs in a queue
 * Supports:
 * - Job prioritization
 * - Retry logic
 * - Progress tracking
 * - Concurrent processing
 */

import Queue from 'bull';
import { getWorkerManager } from './workerManager.js';
import { generateWithComfyUI } from './comfyuiClient.js';
import { saveJobToFirebase, updateJobStatus } from './firebaseService.js';

let imageQueue;

/**
 * Initialize queue
 */
export async function initializeQueue() {
  const redisConfig = process.env.REDIS_URL 
    ? process.env.REDIS_URL 
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          // Fallback to in-memory if Redis fails
          if (times > 3) {
            return null; // Stop retrying
          }
          return Math.min(times * 1000, 3000);
        }
      };

  try {
    imageQueue = new Queue('comfyui-images', redisConfig, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500      // Keep last 500 failed jobs
      }
    });

    // Test Redis connection
    await imageQueue.isReady();
    console.log('✅ Queue initialized: Redis');
  } catch (error) {
    // Fallback to in-memory queue (for development)
    imageQueue = new Queue('comfyui-images', undefined, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });
    console.log('✅ Queue initialized: In-memory');
  }

  // Process jobs
  imageQueue.process(parseInt(process.env.QUEUE_CONCURRENCY) || 3, async (job) => {
    return await processImageGeneration(job);
  });

  // Event listeners
  imageQueue.on('completed', async (job, result) => {
    console.log(`✅ Job ${job.id} completed in ${job.finishedOn - job.processedOn}ms`);
    
    // IMPORTANT: Save image to Firebase Storage (not Firestore)
    // Firestore has 1MB document limit, Storage can handle large files
    try {
      const { saveImageToStorage } = await import('./firebaseService.js');
      const userId = job.data.userId || 'anonymous';
      
      // Upload image to Firebase Storage and get URL
      const imageUrl = await saveImageToStorage(result.imageData, userId, job.id);
      console.log(`💾 Image uploaded to Storage: ${imageUrl}`);
      
      // Save only metadata + URL to Firestore (not base64 data)
      const firestoreResult = {
        imageUrl: imageUrl,
        workerId: result.workerId,
        processingTime: result.processingTime,
        filename: result.filename
      };
      
      await updateJobStatus(job.id, 'completed', { result: firestoreResult });
    } catch (storageError) {
      console.error(`❌ Failed to save to Storage:`, storageError);
      
      // Fallback: Keep base64 in job result (Bull Queue stores this in Redis)
      // Frontend can still retrieve it from job status
      await updateJobStatus(job.id, 'completed', { 
        result: { 
          imageData: result.imageData, // Keep in Redis for immediate access
          workerId: result.workerId,
          processingTime: result.processingTime,
          storageError: storageError.message
        } 
      });
    }
  });

  imageQueue.on('failed', async (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
    await updateJobStatus(job.id, 'failed', { error: err.message });
  });

  imageQueue.on('progress', async (job, progress) => {
    console.log(`📊 Job ${job.id}: ${progress}% complete`);
    await updateJobStatus(job.id, 'processing', { progress });
  });

  console.log(`✅ Queue initialized: ${redisConfig.host || 'In-memory'}`);
  
  return imageQueue;
}

/**
 * Add job to queue
 */
export async function addGenerationJob(jobData) {
  const job = await imageQueue.add(jobData, {
    priority: jobData.priority || 5,
    jobId: jobData.jobId || `job-${Date.now()}`
  });

  // Save to Firebase
  await saveJobToFirebase(job.id, {
    ...jobData,
    status: 'queued',
    createdAt: Date.now()
  });

  // Get position safely (may not be available in all queue types)
  let position = 0;
  try {
    if (typeof job.getPosition === 'function') {
      position = await job.getPosition();
    }
  } catch (error) {
    console.warn('⚠️ Could not get job position:', error.message);
  }

  return {
    jobId: job.id,
    position,
    status: 'queued'
  };
}

/**
 * Process image generation
 */
async function processImageGeneration(job) {
  const { prompt, workflow, referenceImage } = job.data;
  
  try {
    // Get available worker
    const workerManager = getWorkerManager();
    const worker = workerManager.getNextWorker();
    
    console.log(`🎨 Processing job ${job.id} on worker ${worker.id}`);
    
    // Update progress
    await job.progress(10);
    
    // Generate image using ComfyUI
    const result = await generateWithComfyUI({
      worker,
      prompt,
      workflow,
      referenceImage,
      onProgress: async (progress) => {
        await job.progress(10 + (progress * 0.9)); // 10% to 100%
      }
    });
    
    await job.progress(100);
    
    return {
      imageUrl: result.imageUrl,
      imageData: result.imageData,
      workerId: worker.id,
      processingTime: result.processingTime
    };
    
  } catch (error) {
    console.error(`❌ Job ${job.id} processing error:`, error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId) {
  const job = await imageQueue.getJob(jobId);
  
  if (!job) {
    return { found: false };
  }

  const state = await job.getState();
  const progress = job.progress();
  
  return {
    found: true,
    id: job.id,
    state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn
  };
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    imageQueue.getWaitingCount(),
    imageQueue.getActiveCount(),
    imageQueue.getCompletedCount(),
    imageQueue.getFailedCount(),
    imageQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}

/**
 * Clean old jobs
 */
export async function cleanQueue(olderThan = 24 * 3600 * 1000) {
  await imageQueue.clean(olderThan, 'completed');
  await imageQueue.clean(olderThan, 'failed');
  console.log(`🧹 Cleaned jobs older than ${olderThan / 3600000} hours`);
}

export { imageQueue };
