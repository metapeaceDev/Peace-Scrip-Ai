/**
 * ComfyUI Video Generation Routes
 * 
 * Purpose: Handle video generation requests for AnimateDiff and SVD
 * Features:
 * - AnimateDiff text-to-video generation
 * - SVD image-to-video generation  
 * - Queue-based processing for long-running jobs
 * - Real-time progress tracking via WebSocket
 * - MP4/WebM output support
 */

import express from 'express';
import { addVideoJob, getJobStatus, cancelVideoJob } from '../services/queueService.js';
import { getWorkerManager } from '../services/workerManager.js';
import { authenticateOptional } from '../middleware/auth.js';
import { 
  buildAnimateDiffWorkflow, 
  buildSVDWorkflow,
  buildWanWorkflow,
  VIDEO_MODELS 
} from '../utils/workflowBuilders.js';
import { 
  detectVideoModels, 
  verifyVideoRequirements 
} from '../services/comfyuiClient.js';

const router = express.Router();

/**
 * POST /api/video/generate/animatediff
 * Generate video using AnimateDiff (text-to-video)
 * 
 * Body:
 * - prompt: string (required)
 * - negativePrompt: string (optional)
 * - numFrames: number (default: 16, max: 128)
 * - fps: number (default: 8)
 * - motionScale: number (default: 1.0, range: 0.0-2.0)
 * - motionModel: string (default: 'mm_sd_v15_v2.ckpt')
 * - width: number (default: 512)
 * - height: number (default: 512)
 * - steps: number (default: 20)
 * - cfg: number (default: 8.0)
 * - seed: number (optional, random if not provided)
 * - lora: string (optional)
 * - loraStrength: number (default: 0.8)
 * - priority: number (1-10, default: 5)
 */
router.post('/generate/animatediff', authenticateOptional, async (req, res, next) => {
  try {
    const {
      prompt,
      negativePrompt = 'low quality, blurry, distorted, watermark, text',
      numFrames = VIDEO_MODELS.animateDiff.defaultFrames,
      fps = VIDEO_MODELS.animateDiff.fps,
      motionScale = 1.0,
      motionModel = VIDEO_MODELS.animateDiff.motionModels.v2,
      width = 512,
      height = 512,
      steps = 20,
      cfg = 8.0,
      seed,
      lora,
      loraStrength = 0.8,
      priority = 5,
      userId
    } = req.body;

    // Validation
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: prompt'
      });
    }

    // Validate frame count
    if (numFrames > VIDEO_MODELS.animateDiff.maxFrames) {
      return res.status(400).json({
        success: false,
        message: `Frame count exceeds maximum of ${VIDEO_MODELS.animateDiff.maxFrames}`
      });
    }

    // Build workflow
    const workflow = buildAnimateDiffWorkflow(prompt, {
      negativePrompt,
      numFrames,
      fps,
      motionScale,
      motionModel,
      width,
      height,
      steps,
      cfg,
      seed,
      lora,
      loraStrength
    });

    // Add to video queue
    const job = await addVideoJob({
      type: 'animatediff',
      prompt,
      workflow,
      priority,
      userId: userId || req.user?.uid || 'anonymous',
      createdBy: req.user?.email || 'anonymous',
      metadata: {
        videoType: 'animatediff', // 🆕 Flag for Load Balancer to skip Gemini
        videoNodeId: '8',
        filenamePrefix: 'peace-script-animatediff',
        numFrames,
        fps,
        motionScale,
        width,
        height
      }
    });

    res.status(202).json({
      success: true,
      message: 'AnimateDiff video job queued successfully',
      data: {
        jobId: job.jobId,
        type: 'animatediff',
        estimatedTime: Math.ceil(numFrames * 2), // Rough estimate: 2 seconds per frame
        queuePosition: job.queuePosition
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/video/generate/svd
 * Generate video using Stable Video Diffusion (image-to-video)
 * 
 * Body:
 * - referenceImage: string (required, base64 or URL)
 * - numFrames: number (default: 25, max: 25 for SVD)
 * - fps: number (default: 6)
 * - motionScale: number (default: 127, range: 1-255, motion bucket ID)
 * - videoModel: string (default: 'svd_xt_1_1.safetensors')
 * - width: number (default: 1024)
 * - height: number (default: 576)
 * - steps: number (default: 20)
 * - cfg: number (default: 2.5)
 * - seed: number (optional)
 * - priority: number (1-10, default: 5)
 */
router.post('/generate/svd', authenticateOptional, async (req, res, next) => {
  try {
    const {
      referenceImage,
      numFrames = VIDEO_MODELS.svd.defaultFrames,
      fps = VIDEO_MODELS.svd.fps,
      motionScale = 127,
      videoModel = VIDEO_MODELS.svd.checkpoints.xt,
      width = 1024,
      height = 576,
      steps = 20,
      cfg = 2.5,
      seed,
      priority = 5,
      userId
    } = req.body;

    // Validation
    if (!referenceImage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: referenceImage'
      });
    }

    // SVD has a fixed max frame limit (typically 25 in ComfyUI SVD workflows).
    // Instead of rejecting (>25) with 400, auto-clamp to keep the pipeline resilient.
    const requestedNumFrames = Number(numFrames);
    const requestedFps = Number(fps);
    let effectiveNumFrames = Number.isFinite(requestedNumFrames) && requestedNumFrames > 0
      ? requestedNumFrames
      : VIDEO_MODELS.svd.defaultFrames;
    let effectiveFps = Number.isFinite(requestedFps) && requestedFps > 0
      ? requestedFps
      : VIDEO_MODELS.svd.fps;

    if (effectiveNumFrames > VIDEO_MODELS.svd.maxFrames) {
      const maxFrames = VIDEO_MODELS.svd.maxFrames;
      const durationSec = effectiveFps > 0 ? (effectiveNumFrames / effectiveFps) : 0;
      effectiveNumFrames = maxFrames;

      // Try to preserve the requested duration by lowering fps.
      if (durationSec > 0) {
        const targetFps = Math.max(1, Math.floor(effectiveNumFrames / durationSec));
        effectiveFps = Math.max(1, Math.min(effectiveFps, targetFps));
      }

      console.warn(
        `⚠️ SVD frame request clamped: requested=${requestedNumFrames} @ ${requestedFps}fps → ` +
        `effective=${effectiveNumFrames} @ ${effectiveFps}fps (max=${maxFrames})`
      );
    }

    // Validate motion scale (1-255 for SVD motion bucket)
    if (motionScale < 1 || motionScale > 255) {
      return res.status(400).json({
        success: false,
        message: 'Motion scale must be between 1 and 255'
      });
    }

    // Build workflow
    const workflow = buildSVDWorkflow(referenceImage, {
      numFrames: effectiveNumFrames,
      fps: effectiveFps,
      motionScale,
      videoModel,
      width,
      height,
      steps,
      cfg,
      seed
    });

    // Add to video queue
    const job = await addVideoJob({
      type: 'svd',
      referenceImage,
      workflow,
      priority,
      userId: userId || req.user?.uid || 'anonymous',
      createdBy: req.user?.email || 'anonymous',
      metadata: {
        videoType: 'svd', // 🆕 Flag for Load Balancer to skip Gemini
        videoNodeId: '6',
        filenamePrefix: 'peace-script-svd',
        numFrames: effectiveNumFrames,
        fps: effectiveFps,
        requestedNumFrames,
        requestedFps,
        motionScale,
        width,
        height
      }
    });

    res.status(202).json({
      success: true,
      message: 'SVD video job queued successfully',
      data: {
        jobId: job.jobId,
        type: 'svd',
        estimatedTime: Math.ceil(effectiveNumFrames * 3), // SVD is slower: ~3 seconds per frame
        queuePosition: job.queuePosition
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/video/generate/wan
 * Generate video using WAN (WanVideoWrapper) text-to-video
 *
 * Body:
 * - prompt: string (required)
 * - negativePrompt: string (optional)
 * - numFrames: number (default: 16, max: 128)
 * - fps: number (default: 8)
 * - width: number (default: 512)
 * - height: number (default: 512)
 * - modelPath: string (optional, default from VIDEO_MODELS.wan)
 * - seed: number (optional)
 * - priority: number (1-10, default: 5)
 */
router.post('/generate/wan', authenticateOptional, async (req, res, next) => {
  try {
    const {
      prompt,
      negativePrompt = 'blurry, low quality, watermark, text',
      numFrames = VIDEO_MODELS.wan.defaultFrames,
      fps = VIDEO_MODELS.wan.fps,
      width = VIDEO_MODELS.wan.width,
      height = VIDEO_MODELS.wan.height,
      modelPath = VIDEO_MODELS.wan.defaultModelPath,
      seed,
      priority = 5,
      userId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: prompt'
      });
    }

    if (numFrames > VIDEO_MODELS.wan.maxFrames) {
      return res.status(400).json({
        success: false,
        message: `Frame count exceeds maximum of ${VIDEO_MODELS.wan.maxFrames}`
      });
    }

    const workflow = buildWanWorkflow(prompt, {
      negativePrompt,
      numFrames,
      fps,
      width,
      height,
      modelPath,
      seed
    });

    const job = await addVideoJob({
      type: 'wan',
      prompt,
      workflow,
      priority,
      userId: userId || req.user?.uid || 'anonymous',
      createdBy: req.user?.email || 'anonymous',
      metadata: {
        videoType: 'wan',
        videoNodeId: '8',
        filenamePrefix: 'peace-script-wan',
        numFrames,
        fps,
        width,
        height,
        modelPath
      }
    });

    res.status(202).json({
      success: true,
      message: 'WAN video job queued successfully',
      data: {
        jobId: job.jobId,
        type: 'wan',
        estimatedTime: Math.ceil(numFrames * 3),
        queuePosition: job.queuePosition
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/job/:jobId
 * Get video generation job status with progress
 * 
 * Returns:
 * - state: queued | processing | completed | failed
 * - progress: 0-100
 * - currentFrame: number (if processing)
 * - totalFrames: number
 * - videoUrl: string (if completed)
 * - error: string (if failed)
 */
router.get('/job/:jobId', authenticateOptional, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status.found) {
      return res.status(404).json({
        success: false,
        message: 'Video job not found'
      });
    }

    // Get progress from multiple sources (fallback chain)
    let progressValue = 0;

    if (typeof status.progress === 'number') {
      progressValue = status.progress;
    } else if (status.data && typeof status.data.progress === 'number') {
      progressValue = status.data.progress;
    } else if (status.state === 'completed') {
      progressValue = 100;
    } else if (status.state === 'processing' || status.state === 'active') {
      progressValue = status.data?.progress || 0;
    }

    // Normalize queue states to API contract (queued|processing|completed|failed)
    const errorMessage = status.error || status.failedReason;
    let normalizedState = status.state;
    if (normalizedState === 'active') normalizedState = 'processing';
    if (normalizedState === 'waiting' || normalizedState === 'delayed') normalizedState = 'queued';
    if (errorMessage) normalizedState = 'failed';

    // 🆕 Return both flat videoUrl (for backward compatibility) AND result object (for frontend)
    const response = {
      success: true,
      data: {
        jobId,
        state: normalizedState,
        progress: progressValue,
        currentFrame: status.currentFrame,
        totalFrames: status.totalFrames,
        videoUrl: status.result?.result?.videoUrl || status.result?.videoUrl || status.videoUrl,
        error: errorMessage,
        createdAt: status.createdAt,
        startedAt: status.startedAt || status.processedAt,
        completedAt: status.completedAt || status.finishedAt
      }
    };
    
    // 🆕 Add result object if it exists (frontend needs this!)
    if (status.result && Object.keys(status.result).length > 0) {
      response.data.result = status.result;
    }
    
    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/models
 * List available video models and their requirements
 * 
 * Returns information about:
 * - AnimateDiff motion modules
 * - SVD checkpoints
 * - VRAM requirements
 * - Recommended settings
 */
router.get('/models', async (req, res, next) => {
  try {
    const workerManager = getWorkerManager();
    const installedModels = await workerManager.getInstalledVideoModels();

    res.json({
      success: true,
      data: {
        animateDiff: {
          motionModels: VIDEO_MODELS.animateDiff.motionModels,
          baseModels: VIDEO_MODELS.animateDiff.baseModels,
          defaultFrames: VIDEO_MODELS.animateDiff.defaultFrames,
          maxFrames: VIDEO_MODELS.animateDiff.maxFrames,
          fps: VIDEO_MODELS.animateDiff.fps,
          vramRequired: '8GB+',
          installed: installedModels.animateDiff || []
        },
        svd: {
          checkpoints: VIDEO_MODELS.svd.checkpoints,
          defaultFrames: VIDEO_MODELS.svd.defaultFrames,
          maxFrames: VIDEO_MODELS.svd.maxFrames,
          fps: VIDEO_MODELS.svd.fps,
          vramRequired: '12GB+',
          installed: installedModels.svd || []
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/video/cancel/:jobId
 * Cancel a video generation job
 */
router.post('/cancel/:jobId', authenticateOptional, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status.found) {
      return res.status(404).json({
        success: false,
        message: 'Video job not found'
      });
    }

    if (status.state === 'completed' || status.state === 'failed') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel job in ${status.state} state`
      });
    }

    // Cancel the job (implementation in queueService)
    await cancelVideoJob(jobId);

    res.json({
      success: true,
      message: 'Video job cancelled successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/requirements/:videoType
 * Check if system meets requirements for video generation
 * 
 * Params:
 * - videoType: 'animatediff' | 'svd'
 * 
 * Returns:
 * - ready: boolean (all requirements met)
 * - models: detected models and extensions
 * - vram: VRAM info and requirements
 * - issues: critical problems (must fix)
 * - warnings: non-critical issues (recommended to fix)
 */
router.get('/requirements/:videoType', async (req, res, next) => {
  try {
    const { videoType } = req.params;

    if (!['animatediff', 'svd', 'wan'].includes(videoType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video type. Must be: animatediff, svd, or wan'
      });
    }

    const workerManager = getWorkerManager();
    const worker = workerManager.getNextWorker();

    const requirements = await verifyVideoRequirements(worker.url, videoType);

    res.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/detect-models
 * Detect all installed video models and extensions
 */
router.get('/detect-models', async (req, res, next) => {
  try {
    const workerManager = getWorkerManager();
    const worker = workerManager.getNextWorker();

    const models = await detectVideoModels(worker.url);

    res.json({
      success: true,
      data: models
    });

  } catch (error) {
    next(error);
  }
});

export default router;
