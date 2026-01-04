/**
 * Redis Queue System with Bull
 *
 * Manages image and video generation jobs with priority queuing,
 * progress tracking, and automatic retry on failure.
 *
 * Benefits:
 * - Handles concurrent jobs efficiently
 * - Prevents server overload
 * - Tracks job progress in real-time
 * - Auto-retry failed jobs
 * - Priority queue support (FREE < BASIC < PRO < ENTERPRISE)
 */

import Queue, { Job, Queue as BullQueue } from 'bull';

// Job Types
export interface ImageGenerationJob {
  userId: string;
  projectId: string;
  prompt: string;
  model: string; // 'sdxl-turbo' | 'sdxl-base' | 'flux-schnell' | 'flux-dev'
  width: number;
  height: number;
  steps: number;
  seed?: number;
  userTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface VideoGenerationJob {
  userId: string;
  projectId: string;
  sceneDescription: string;
  duration: number; // seconds
  fps: number;
  style?: string;
  userTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface JobProgress {
  percent: number;
  stage: string;
  eta?: number; // seconds
  message?: string;
}

export interface JobResult {
  success: boolean;
  outputPath?: string;
  outputUrl?: string;
  generationTime: number;
  cost: number;
  error?: string;
}

/**
 * Priority levels based on user tier
 */
const PRIORITY_MAP = {
  free: 4, // Lowest priority
  basic: 3,
  pro: 2,
  enterprise: 1, // Highest priority
};

/**
 * Redis connection config
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

/**
 * Queue options
 */
const QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay, then 4s, 8s
    },
    removeOnComplete: false, // Keep completed jobs for 24h
    removeOnFail: false, // Keep failed jobs for debugging
  },
  limiter: {
    max: 5, // Max 5 jobs processed per second
    duration: 1000,
  },
};

// Initialize queues
let imageQueue: BullQueue<ImageGenerationJob>;
let videoQueue: BullQueue<VideoGenerationJob>;

/**
 * Initialize queue system
 */
export function initializeQueues(): void {
  imageQueue = new Queue<ImageGenerationJob>('image-generation', {
    redis: REDIS_CONFIG,
    ...QUEUE_OPTIONS,
  });
  videoQueue = new Queue<VideoGenerationJob>('video-generation', {
    redis: REDIS_CONFIG,
    ...QUEUE_OPTIONS,
  });

  console.log('✅ Queue system initialized');
  console.log(`📍 Redis: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
}

/**
 * Add image generation job to queue
 */
export async function queueImageGeneration(
  jobData: ImageGenerationJob
): Promise<Job<ImageGenerationJob>> {
  const priority = PRIORITY_MAP[jobData.userTier];

  const job = await imageQueue.add(jobData, {
    priority,
    jobId: `img-${jobData.projectId}-${Date.now()}`,
  });

  console.log(`🖼️ Queued image job: ${job.id} (priority: ${priority})`);
  return job;
}

/**
 * Add video generation job to queue
 */
export async function queueVideoGeneration(
  jobData: VideoGenerationJob
): Promise<Job<VideoGenerationJob>> {
  const priority = PRIORITY_MAP[jobData.userTier];

  const job = await videoQueue.add(jobData, {
    priority,
    jobId: `vid-${jobData.projectId}-${Date.now()}`,
  });

  console.log(`🎬 Queued video job: ${job.id} (priority: ${priority})`);
  return job;
}

/**
 * Process image generation jobs
 */
export function processImageJobs(
  handler: (job: Job<ImageGenerationJob>) => Promise<JobResult>
): void {
  imageQueue.process(async (job: Job<ImageGenerationJob>) => {
    console.log(`🚀 Processing image job: ${job.id}`);

    try {
      // Update progress: Starting
      await job.progress({
        percent: 0,
        stage: 'initializing',
        message: 'Loading model...',
      } as JobProgress);

      // Execute generation
      const result = await handler(job);

      // Update progress: Complete
      await job.progress({
        percent: 100,
        stage: 'complete',
        message: 'Image generated successfully',
      } as JobProgress);

      return result;
    } catch (error) {
      console.error(`❌ Image job ${job.id} failed:`, error);
      throw error;
    }
  });

  console.log('✅ Image job processor started');
}

/**
 * Process video generation jobs
 */
export function processVideoJobs(
  handler: (job: Job<VideoGenerationJob>) => Promise<JobResult>
): void {
  videoQueue.process(async (job: Job<VideoGenerationJob>) => {
    console.log(`🚀 Processing video job: ${job.id}`);

    try {
      // Update progress: Starting
      await job.progress({
        percent: 0,
        stage: 'initializing',
        message: 'Preparing video generation...',
      } as JobProgress);

      // Execute generation
      const result = await handler(job);

      // Update progress: Complete
      await job.progress({
        percent: 100,
        stage: 'complete',
        message: 'Video generated successfully',
      } as JobProgress);

      return result;
    } catch (error) {
      console.error(`❌ Video job ${job.id} failed:`, error);
      throw error;
    }
  });

  console.log('✅ Video job processor started');
}

/**
 * Get job status by ID
 */
export async function getJobStatus(
  jobId: string,
  type: 'image' | 'video'
): Promise<{
  state: string;
  progress: JobProgress;
  result?: JobResult;
  failedReason?: string;
}> {
  const queue = type === 'image' ? imageQueue : videoQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = (await job.progress()) as JobProgress;
  const result = job.returnvalue as JobResult | undefined;
  const failedReason = job.failedReason;

  return { state, progress, result, failedReason };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string, type: 'image' | 'video'): Promise<void> {
  const queue = type === 'image' ? imageQueue : videoQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.remove();
  console.log(`🗑️ Cancelled job: ${jobId}`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(type: 'image' | 'video'): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = type === 'image' ? imageQueue : videoQueue;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Clean old completed/failed jobs
 */
export async function cleanOldJobs(olderThan: number = 86400000): Promise<void> {
  // Clean jobs older than 24h by default
  await imageQueue.clean(olderThan, 'completed');
  await imageQueue.clean(olderThan, 'failed');
  await videoQueue.clean(olderThan, 'completed');
  await videoQueue.clean(olderThan, 'failed');

  console.log(`🧹 Cleaned jobs older than ${olderThan / 3600000}h`);
}

/**
 * Get estimated wait time for new job
 */
export async function getEstimatedWaitTime(
  userTier: 'free' | 'basic' | 'pro' | 'enterprise',
  type: 'image' | 'video'
): Promise<number> {
  const queue = type === 'image' ? imageQueue : videoQueue;
  const userPriority = PRIORITY_MAP[userTier];

  // Get jobs with higher or equal priority
  const jobs = await queue.getJobs(['waiting', 'active']);
  const higherPriorityJobs = jobs.filter(job => {
    const jobPriority = job.opts.priority || 10;
    return jobPriority <= userPriority;
  });

  // Estimate: ~30s per image job, ~120s per video job
  const avgJobTime = type === 'image' ? 30 : 120;
  const estimatedWait = higherPriorityJobs.length * avgJobTime;

  return estimatedWait;
}

/**
 * Pause queue (for maintenance)
 */
export async function pauseQueue(type: 'image' | 'video'): Promise<void> {
  const queue = type === 'image' ? imageQueue : videoQueue;
  await queue.pause();
  console.log(`⏸️ Paused ${type} queue`);
}

/**
 * Resume queue
 */
export async function resumeQueue(type: 'image' | 'video'): Promise<void> {
  const queue = type === 'image' ? imageQueue : videoQueue;
  await queue.resume();
  console.log(`▶️ Resumed ${type} queue`);
}

/**
 * Close queue connections (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  await imageQueue.close();
  await videoQueue.close();
  console.log('👋 Queue connections closed');
}

/**
 * Setup queue event listeners
 */
export function setupQueueListeners(): void {
  // Image queue events
  imageQueue.on('completed', (job: Job<ImageGenerationJob>, result: JobResult) => {
    console.log(`✅ Image job ${job.id} completed in ${result.generationTime}s`);
  });

  imageQueue.on('failed', (job: Job<ImageGenerationJob>, err: Error) => {
    console.error(`❌ Image job ${job?.id} failed:`, err.message);
  });

  imageQueue.on('progress', (job: Job<ImageGenerationJob>, progress: JobProgress) => {
    console.log(`📊 Image job ${job.id}: ${progress.percent}% (${progress.stage})`);
  });

  // Video queue events
  videoQueue.on('completed', (job: Job<VideoGenerationJob>, result: JobResult) => {
    console.log(`✅ Video job ${job.id} completed in ${result.generationTime}s`);
  });

  videoQueue.on('failed', (job: Job<VideoGenerationJob>, err: Error) => {
    console.error(`❌ Video job ${job?.id} failed:`, err.message);
  });

  videoQueue.on('progress', (job: Job<VideoGenerationJob>, progress: JobProgress) => {
    console.log(`📊 Video job ${job.id}: ${progress.percent}% (${progress.stage})`);
  });

  console.log('✅ Queue event listeners setup');
}
