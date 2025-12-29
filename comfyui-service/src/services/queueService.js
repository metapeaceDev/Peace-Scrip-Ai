/**
 * Queue Service - Bull + Redis
 * 
 * Manages image and video generation jobs in a queue
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
import { 
  processImageGenerationSmart, 
  processVideoGenerationSmart,
  setLoadBalancer 
} from './smartQueueProcessor.js';
import { v4 as uuidv4 } from 'uuid';

let imageQueue;
let videoQueue;
let useSmartRouting = false; // Flag to enable smart routing

// In-memory job tracking for local mode
const localJobs = new Map(); // jobId -> { status, result, error, progress }

/**
 * Helper: Update job status in both localJobs and Firestore
 */
async function updateJobProgress(jobId, status, additionalData = {}) {
  // Update in-memory first for immediate access
  if (localJobs.has(jobId)) {
    const existing = localJobs.get(jobId);
    localJobs.set(jobId, {
      ...existing,
      status,
      ...additionalData,
      updatedAt: Date.now()
    });
  } else {
    // Create new entry if doesn't exist
    localJobs.set(jobId, {
      status,
      ...additionalData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  // Update Firestore asynchronously
  await updateJobStatus(jobId, status, additionalData).catch(err => {
    console.error(`⚠️ Failed to update Firestore for ${jobId}:`, err.message);
  });
  
  console.log(`📊 Job ${jobId} progress updated: ${status} (${additionalData.progress || 0}%)`);
}

/**
 * Mock Queue for local development without Redis
 */
class MockQueue {
  constructor(name) {
    this.name = name;
    this.jobs = new Map();
    this.processors = [];
    this.eventListeners = {};
    console.log(`⚠️ Created MockQueue '${name}' (No Redis)`);
  }

  async getWaitingCount() { return 0; }
  async getActiveCount() { return 0; }
  async getCompletedCount() { return 0; }
  async getFailedCount() { return 0; }
  async getJob(jobId) { return this.jobs.get(jobId); }

  async add(data, options = {}) {
    const job = {
      id: uuidv4(),
      data,
      opts: options,
      progress: 0,
      timestamp: Date.now(),
      finishedOn: null,
      processedOn: null,
      finishedOn: null,
      returnvalue: null,
      failedReason: null,
      stacktrace: [],
      _progress: 0,
      
      update: async (newData) => {
        job.data = { ...job.data, ...newData };
      },
      
      progress: (value) => {
        if (value === undefined) return job._progress;
        job._progress = value;
        this.emit('progress', job, value);
        return Promise.resolve();
      },
      
      getState: async () => {
        if (job.finishedOn) {
          return job.failedReason ? 'failed' : 'completed';
        }
        if (job.processedOn) {
          return 'active';
        }
        return 'waiting';
      }
    };

    this.jobs.set(job.id, job);
    console.log(`[MockQueue] Job ${job.id} added to ${this.name}`);
    
    // Simulate async processing
    // Increased delay to 2000ms to ensure Firestore document is created before processing starts
    setTimeout(() => this.processJob(job), 2000);
    
    return job;
  }

  process(concurrency, handler) {
    if (typeof concurrency === 'function') {
      handler = concurrency;
      concurrency = 1;
    }
    this.processors.push(handler);
    console.log(`[MockQueue] Processor registered for ${this.name}`);
  }

  async processJob(job) {
    console.log(`🔄 [MockQueue] processJob called for ${this.name}, job: ${job.id}`);
    
    if (this.processors.length === 0) {
      console.warn(`[MockQueue] No processors for ${this.name}`);
      return;
    }

    console.log(`📋 [MockQueue] Found ${this.processors.length} processor(s), calling first one...`);
    const handler = this.processors[0]; // Simple FIFO
    job.processedOn = Date.now();

    try {
      console.log(`🏃 [MockQueue] Calling processor for job ${job.id}...`);
      const result = await handler(job);
      console.log(`✅ [MockQueue] Processor returned result:`, { hasVideoData: !!result?.videoData, keys: Object.keys(result || {}) });
      job.returnvalue = result;
      job.finishedOn = Date.now();
      
      // 🆕 Update localJobs with result for getJobStatus
      // Always update/create entry to ensure status is captured
      const existing = localJobs.get(job.id) || {};
      localJobs.set(job.id, {
        ...existing,
        status: 'completed',
        result: result,
        progress: 100,
        completedAt: Date.now()
      });
      console.log(`💾 [MockQueue] Updated localJobs for ${job.id} with result`);
      
      console.log(`🔔 [MockQueue] Emitting 'completed' event for job ${job.id}`);
      this.emit('completed', job, result);
      console.log(`✅ [MockQueue] Event emitted successfully`);
    } catch (error) {
      console.error(`❌ [MockQueue] Processor failed for job ${job.id}:`, error);
      job.failedReason = error.message;
      job.finishedOn = Date.now();
      console.log(`🔔 [MockQueue] Emitting 'failed' event for job ${job.id}`);
      this.emit('failed', job, error);
    }
  }

  on(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
    console.log(`🎧 [MockQueue] Event listener registered for '${event}' on ${this.name}, total: ${this.eventListeners[event].length}`);
    return this;
  }

  emit(event, ...args) {
    console.log(`📢 [MockQueue] Emitting '${event}' on ${this.name}, listeners: ${this.eventListeners[event]?.length || 0}`);
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((handler, index) => {
        try {
          console.log(`🔔 [MockQueue] Calling listener #${index + 1} for '${event}'`);
          handler(...args);
          console.log(`✅ [MockQueue] Listener #${index + 1} completed successfully`);
        } catch (error) {
          console.error(`❌ [MockQueue] Listener #${index + 1} failed:`, error);
        }
      });
    } else {
      console.log(`⚠️ [MockQueue] No listeners for '${event}'`);
    }
  }

  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  async isReady() {
    return true;
  }
}

/**
 * Build simple text-to-image workflow
 */
function buildImageWorkflow(prompt, workflowType = 'text-to-image', referenceImage = null) {
  // SD 1.5 workflow - much faster than SDXL
  const workflow = {
    '3': {
      inputs: {
        seed: Math.floor(Math.random() * 1000000000),
        steps: 8,  // Fast generation
        cfg: 7.0,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0]
      },
      class_type: 'KSampler'
    },
    '4': {
      inputs: {
        ckpt_name: 'v1-5-pruned-emaonly.safetensors'  // SD 1.5 instead of SDXL
      },
      class_type: 'CheckpointLoaderSimple'
    },
    '5': {
      inputs: {
        width: 512,   // SD 1.5 native resolution
        height: 512,
        batch_size: 1
      },
      class_type: 'EmptyLatentImage'
    },
    '6': {
      inputs: {
        text: prompt,
        clip: ['4', 1]
      },
      class_type: 'CLIPTextEncode'
    },
    '7': {
      inputs: {
        text: 'text, watermark, low quality, blurry',
        clip: ['4', 1]
      },
      class_type: 'CLIPTextEncode'
    },
    '8': {
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2]
      },
      class_type: 'VAEDecode'
    },
    '9': {
      inputs: {
        filename_prefix: 'ComfyUI',
        images: ['8', 0]
      },
      class_type: 'SaveImage'
    }
  };
  
  return workflow;
}

/**
 * Initialize queue
 */
export async function initializeQueue() {
  // Skip Redis entirely if REDIS_URL not set - use in-memory
  if (!process.env.REDIS_URL) {
    console.log('📝 No REDIS_URL found - using in-memory queue');
    imageQueue = new MockQueue('comfyui-images');
    console.log('✅ Image queue created (Mock)');
    
    // Set up process handler immediately
    imageQueue.process(3, async (job) => {
      console.log(`🔧 Processing job ${job.id}...`);
      return useSmartRouting 
        ? await processImageGenerationSmart(job)
        : await processImageGeneration(job);
    });
    console.log('✅ Image queue processor installed');
    
    // Initialize video queue
    videoQueue = new MockQueue('comfyui-videos');
    console.log('✅ Video queue created (Mock)');
    
    videoQueue.process(1, async (job) => {
      console.log(`🔧 Processing video job ${job.id}...`);
      return useSmartRouting
        ? await processVideoGenerationSmart(job)
        : await processVideoGeneration(job);
    });
    console.log('✅ Video queue processor installed');
    
    console.log('✅ All queues initialized: In-memory mode');
    
    // Attach event listeners for MockQueues
    attachEventListeners(imageQueue, videoQueue);
    return;
  }

  // Use Redis if REDIS_URL is set
  const redisConfig = process.env.REDIS_URL;

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
    console.log('⚠️ Redis connection failed, falling back to in-memory');
    imageQueue = new MockQueue('comfyui-images');
    console.log('✅ Queue initialized: In-memory (Mock)');
  }

  // Process jobs
  imageQueue.process(parseInt(process.env.QUEUE_CONCURRENCY) || 3, async (job) => {
    // Use smart routing if enabled, otherwise fallback to legacy processing
    return useSmartRouting 
      ? await processImageGenerationSmart(job)
      : await processImageGeneration(job);
  });

  // Initialize video queue (same logic: use in-memory if no Redis)
  if (!process.env.REDIS_URL) {
    // This block is technically unreachable due to the top check, but kept for safety
    console.log('📝 No REDIS_URL found - using in-memory video queue');
    videoQueue = new MockQueue('comfyui-videos');
    console.log('✅ Video queue initialized: In-memory (Mock)');
  } else {
    // Use Redis if REDIS_URL is set
    const redisConfig = process.env.REDIS_URL;
    try {
      videoQueue = new Queue('comfyui-videos', redisConfig, {
        defaultJobOptions: {
          attempts: 2, // Video generation is expensive, fewer retries
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: 50,
          removeOnFail: 200,
          timeout: 600000 // 10 minutes timeout for video generation
        }
      });

      await videoQueue.isReady();
      console.log('✅ Video queue initialized: Redis');
    } catch (error) {
      console.log('⚠️ Redis connection failed for video queue, falling back to in-memory');
      videoQueue = new MockQueue('comfyui-videos');
      console.log('✅ Video queue initialized: In-memory (Mock)');
    }
  }

  // Process video jobs (lower concurrency due to resource intensity)
  videoQueue.process(parseInt(process.env.VIDEO_QUEUE_CONCURRENCY) || 1, async (job) => {
    // Use smart routing if enabled, otherwise fallback to legacy processing
    return useSmartRouting
      ? await processVideoGenerationSmart(job)
      : await processVideoGeneration(job);
  });

  // Attach event listeners
  attachEventListeners(imageQueue, videoQueue);
}

function attachEventListeners(imageQueue, videoQueue) {
  // Video queue event listeners
  videoQueue.on('completed', async (job, result) => {
    console.log(`✅ Video job ${job.id} completed in ${job.finishedOn - job.processedOn}ms`);
    
    // 🆕 IMPORTANT: Smart Routing already handles Firebase upload!
    // processVideoGenerationSmart() uploads video and returns videoUrl
    // We just need to save the result to Firestore (no duplicate upload)
    
    console.log('🔍 DEBUG Video completion handler:', {
      jobId: job.id,
      resultKeys: Object.keys(result || {}),
      hasVideoUrl: !!result.videoUrl,
      hasStorageError: !!result.storageError
    });
    
    try {
      // Result already contains videoUrl from Smart Routing
      // Just save metadata to Firestore (updateJobProgress will save to localJobs)
      const firestoreResult = {
        videoUrl: result.videoUrl,  // Already uploaded by Smart Routing
        workerId: result.workerId,
        processingTime: result.processingTime,
        filename: result.filename,
        numFrames: result.numFrames,
        fps: result.fps,
        backend: result.backend,
        cost: result.cost,
        ...(result.storageError && { storageError: result.storageError })
      };
      
      console.log(`💾 Saving video metadata to Firestore for job ${job.id}`);
      await updateJobProgress(job.id, 'completed', { result: firestoreResult, progress: 100 });
      console.log(`✅ Video metadata saved successfully`);
    } catch (error) {
      console.error(`❌ Failed to save video metadata:`, error);
      // Try to save minimal result even if Firestore fails
      await updateJobProgress(job.id, 'completed', { 
        result: { 
          videoUrl: result.videoUrl,
          storageError: error.message
        },
        progress: 100
      });
    }
  });

  videoQueue.on('failed', async (job, err) => {
    console.error(`❌ Video job ${job.id} failed:`, err.message);
    await updateJobProgress(job.id, 'failed', { error: err.message });
  });

  videoQueue.on('progress', async (job, progress) => {
    console.log(`📊 Video job ${job.id}: ${progress}% complete`);
    await updateJobProgress(job.id, 'processing', { progress });
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
      
      await updateJobProgress(job.id, 'completed', { result: firestoreResult, progress: 100 });
    } catch (storageError) {
      console.error(`❌ Failed to save to Storage:`, storageError);
      
      // Fallback: Keep base64 in job result (Bull Queue stores this in Redis)
      // Frontend can still retrieve it from job status
      await updateJobProgress(job.id, 'completed', { 
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
    await updateJobProgress(job.id, 'failed', { error: err.message });
  });

  imageQueue.on('progress', async (job, progress) => {
    console.log(`📊 Job ${job.id}: ${progress}% complete`);
    await updateJobProgress(job.id, 'processing', { progress });
  });

  console.log(`✅ Queue initialized: ${process.env.REDIS_URL ? 'Redis' : 'In-memory'}`);
  
  return imageQueue;
}

/**
 * Add job to queue
 */
export async function addGenerationJob(jobData) {
  const jobId = jobData.jobId || `job-${Date.now()}`;
  
  // LOCAL MODE: Process asynchronously without queue
  if (!process.env.REDIS_URL) {
    console.log('🔧 LOCAL MODE: Starting async processing (no queue)');
    console.log('📋 Job data:', { prompt: jobData.prompt?.substring(0, 50), workflow: typeof jobData.workflow });
    
    // Initialize job status
    localJobs.set(jobId, { 
      status: 'processing', 
      progress: 0,
      createdAt: Date.now()
    });
    
    // Process asynchronously with timeout (don't await)
    (async () => {
      try {
        console.log(`🚀 Starting background processing for ${jobId}`);
        const result = await processImageGeneration({ id: jobId, data: jobData });
        console.log(`✅ Job ${jobId} completed successfully`);
        localJobs.set(jobId, { 
          status: 'completed', 
          result,
          progress: 100,
          completedAt: Date.now()
        });
      } catch (error) {
        console.error(`❌ Job ${jobId} failed:`, error.message);
        console.error('Error stack:', error.stack);
        localJobs.set(jobId, { 
          status: 'failed', 
          error: error.message,
          stack: error.stack,
          progress: 0,
          failedAt: Date.now()
        });
      }
    })();
    
    // Return immediately with job ID
    return {
      jobId,
      position: 0,
      status: 'processing',
      message: 'Job started (local mode)'
    };
  }
  
  // PRODUCTION MODE: Use queue
  console.log('DEBUG: Adding job to queue...');
  const job = await imageQueue.add(jobData, {
    priority: jobData.priority || 5,
    jobId
  });
  console.log('DEBUG: Job added to queue, ID:', job.id);

  // Save to Firebase
  try {
    await saveJobToFirebase(job.id, {
      ...jobData,
      status: 'queued',
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('ERROR saving to Firebase:', error.message);
  }

  // Get position safely
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
 * Works with both queue jobs and direct calls
 */
async function processImageGeneration(job) {
  const startTime = Date.now();
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 processImageGeneration START');
  
  const jobData = job.data || job;
  const { prompt, referenceImage } = jobData;
  let { workflow } = jobData;
  const jobId = job.id || 'direct-call';
  
  console.log('📋 Job Info:', {
    jobId,
    prompt: prompt?.substring(0, 60) + '...',
    workflowType: typeof workflow,
    hasReference: !!referenceImage
  });
  
  try {
    // If workflow is a string (template name), build the workflow object
    if (typeof workflow === 'string') {
      console.log(`📝 Building workflow from template: ${workflow}`);
      workflow = buildImageWorkflow(prompt, workflow, referenceImage);
      console.log(`✅ Workflow built with ${Object.keys(workflow).length} nodes`);
    } else if (!workflow || typeof workflow !== 'object') {
      throw new Error(`Invalid workflow: ${typeof workflow}`);
    }
    
    // Get available worker
    console.log('🔍 Getting ComfyUI worker...');
    const workerManager = getWorkerManager();
    if (!workerManager) {
      throw new Error('Worker manager not initialized');
    }
    
    const worker = workerManager.getNextWorker();
    if (!worker) {
      throw new Error('No available workers');
    }
    console.log(`✅ Using worker: ${worker.id} (${worker.url})`);
    
    // Update progress (only if job has progress method)
    if (typeof job.progress === 'function') {
      await job.progress(10);
    }
    
    // Generate image using ComfyUI
    console.log('🎨 Submitting to ComfyUI...');
    const result = await generateWithComfyUI({
      worker,
      prompt,
      workflow,
      referenceImage,
      isVideo: false,
      metadata: {},
      onProgress: async (progress, details) => {
        // Update progress only if job has progress method
        if (typeof job.progress === 'function') {
          await job.progress(10 + (progress * 0.9)); // 10% to 100%
        }
        
        // Broadcast detailed progress if needed
        if (details && jobId) {
          await updateJobProgress(jobId, 'processing', {
            progress: 10 + (progress * 0.9),
            details
          });
        }
      }
    });
    const processingTime = Date.now() - startTime;
    console.log(`✅ Generation completed in ${processingTime}ms`);
    console.log('📊 Result:', {
      hasImageUrl: !!result.imageUrl,
      hasImageData: !!result.imageData,
      workerId: worker.id
    });
    
    // Update final progress only if job has progress method
    if (typeof job.progress === 'function') {
      await job.progress(100);
    }
    
    console.log('🏁 processImageGeneration END');
    console.log('═══════════════════════════════════════\n');
    
    return {
      imageUrl: result.imageUrl,
      imageData: result.imageData,
      workerId: worker.id,
      processingTime: result.processingTime || processingTime
    };
    
  } catch (error) {
    console.error('\n❌ ERROR in processImageGeneration:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Job ID:', jobId);
    console.error('═══════════════════════════════════════\n');
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId) {
  const redisEnabled = !!process.env.REDIS_URL;

  // In Redis/Bull mode, prefer the queue's truth over localJobs (localJobs can become stale).
  if (redisEnabled) {
    let job = await imageQueue.getJob(jobId);
    if (!job && videoQueue) {
      job = await videoQueue.getJob(jobId);
    }

    if (job) {
      const state = await job.getState();
      let progress = 0;

      if (typeof job.progress === 'function') {
        const jobProgress = job.progress();
        if (typeof jobProgress === 'number') {
          progress = jobProgress;
        }
      }

      // If Bull progress isn't available, fall back to localJobs progress (but not state).
      if (progress === 0 && localJobs.has(jobId)) {
        const jobInfo = localJobs.get(jobId);
        progress = jobInfo.progress || 0;
        console.log(`📊 Using localJobs progress for ${jobId}: ${progress}%`);
      }

      // Merge in localJobs error/result if Bull doesn't have them (helps local mode + extra metadata).
      const localInfo = localJobs.get(jobId);

      return {
        found: true,
        id: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue || localInfo?.result,
        error: localInfo?.error,
        failedReason: job.failedReason,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn
      };
    }
  }

  // Non-Redis mode (or job not found in Bull): use localJobs.
  if (localJobs.has(jobId)) {
    const jobInfo = localJobs.get(jobId);
    console.log(`📋 LocalJobs entry for ${jobId}:`, JSON.stringify(jobInfo, null, 2)); // 🆕 DEBUG
    return {
      found: true,
      id: jobId,
      state: jobInfo.status,
      progress: jobInfo.progress || 0,
      result: jobInfo.result || {}, // 🆕 Ensure result object exists
      error: jobInfo.error,
      createdAt: jobInfo.createdAt,
      completedAt: jobInfo.completedAt,
      failedAt: jobInfo.failedAt
    };
  }

  return { found: false };
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  try {
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
  } catch (error) {
    // Return default stats if queue operations fail (e.g., in-memory mode issues)
    console.warn('⚠️ Failed to get queue stats:', error.message);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0
    };
  }
}

/**
 * Clean old jobs
 */
export async function cleanQueue(olderThan = 24 * 3600 * 1000) {
  await imageQueue.clean(olderThan, 'completed');
  await imageQueue.clean(olderThan, 'failed');
  await videoQueue.clean(olderThan, 'completed');
  await videoQueue.clean(olderThan, 'failed');
  console.log(`🧹 Cleaned jobs older than ${olderThan / 3600000} hours`);
}

/**
 * Add video generation job to queue
 */
export async function addVideoJob(jobData) {
  const job = await videoQueue.add(jobData, {
    priority: jobData.priority || 5,
    jobId: jobData.jobId || `video-${Date.now()}`
  });

  // 🆕 Initialize localJobs entry for reliable status tracking
  localJobs.set(job.id, { 
    status: 'queued', 
    progress: 0,
    createdAt: Date.now(),
    type: 'video'
  });

  // Save to Firebase
  await saveJobToFirebase(job.id, {
    ...jobData,
    status: 'queued',
    createdAt: Date.now(),
    type: 'video'
  });

  let position = 0;
  try {
    if (typeof job.getPosition === 'function') {
      position = await job.getPosition();
    }
  } catch (error) {
    console.warn('⚠️ Could not get video job position:', error.message);
  }

  return {
    jobId: job.id,
    queuePosition: position,
    status: 'queued'
  };
}

/**
 * Process video generation
 */
async function processVideoGeneration(job) {
  const { type, prompt, workflow, referenceImage, metadata, userId } = job.data;
  
  try {
    // Get available worker
    const workerManager = getWorkerManager();
    const worker = workerManager.getNextWorker();
    
    console.log(`🎬 Processing video job ${job.id} (${type}) on worker ${worker.id}`);
    
    await job.progress(5);
    
    // Generate video using ComfyUI
    const result = await generateWithComfyUI({
      worker,
      prompt,
      workflow,
      referenceImage,
      isVideo: true,
      metadata,
      onProgress: async (progress, details) => {
        const overallProgress = 5 + (progress * 0.90); // 5% to 95%
        console.log(`📊 Video Generation Progress: ${Math.round(overallProgress)}%`, details ? `(${details.currentNode || 'processing'})` : '');
        await job.progress(overallProgress);
        
        // Broadcast detailed progress with video-specific metadata
        if (details) {
          await updateJobProgress(job.id, 'processing', {
            progress: overallProgress,
            details: {
              ...details,
              videoType: type,
              estimatedFrames: metadata.numFrames || 'unknown'
            }
          });
        }
      }
    });
    
    await job.progress(95);
    
    // 🆕 UPLOAD TO FIREBASE STORAGE IMMEDIATELY IN PROCESSOR
    console.log('🔍 DEBUG processVideoGeneration result:', {
      hasVideoData: !!result.videoData,
      videoDataType: typeof result.videoData,
      isBuffer: Buffer.isBuffer(result.videoData),
      videoDataLength: result.videoData?.length
    });
    
    let videoUrl = null;
    let uploadError = null;
    
    try {
      const { saveVideoToStorage } = await import('./firebaseService.js');
      const userIdForStorage = userId || 'anonymous';
      
      console.log(`⬆️ Uploading video to Firebase Storage for user: ${userIdForStorage}`);
      videoUrl = await saveVideoToStorage(result.videoData, userIdForStorage, job.id);
      console.log(`✅ Video uploaded successfully: ${videoUrl}`);
      
      await job.progress(100);
      
    } catch (storageError) {
      console.error(`❌ Failed to upload video to Firebase Storage:`, storageError);
      uploadError = storageError.message;
      await job.progress(100);
    }
    
    // Update job with final result
    const finalResult = {
      videoUrl: videoUrl, // Firebase Storage URL (if uploaded successfully)
      workerId: worker.id,
      processingTime: result.processingTime,
      numFrames: metadata?.numFrames,
      fps: metadata?.fps,
      filename: result.filename
    };
    
    // Add error if upload failed
    if (uploadError) {
      finalResult.storageError = uploadError;
    }
    
    // Update Firebase job status
    await updateJobProgress(job.id, 'completed', { 
      result: finalResult, 
      progress: 100 
    });
    
    return finalResult;
    
  } catch (error) {
    console.error(`❌ Video job ${job.id} processing error:`, error);
    throw error;
  }
}

/**
 * Cancel video job
 */
export async function cancelVideoJob(jobId) {
  const job = await videoQueue.getJob(jobId);
  
  if (!job) {
    throw new Error('Video job not found');
  }

  const state = await job.getState();
  
  if (state === 'active') {
    // Job is currently processing, attempt to stop it
    await job.moveToFailed(new Error('Job cancelled by user'), true);
  } else if (state === 'waiting' || state === 'delayed') {
    // Job is queued, remove it
    await job.remove();
  }

  await updateJobProgress(jobId, 'cancelled', { cancelledAt: Date.now() });
  
  return { success: true, message: 'Video job cancelled' };
}

/**
 * Enable smart routing with load balancer
 */
export function enableSmartRouting(loadBalancer) {
  setLoadBalancer(loadBalancer);
  useSmartRouting = true;
  console.log('✅ Smart routing enabled with load balancer');
}

/**
 * Disable smart routing (use legacy processing)
 */
export function disableSmartRouting() {
  useSmartRouting = false;
  console.log('⚠️ Smart routing disabled, using legacy processing');
}

export { imageQueue, videoQueue };
