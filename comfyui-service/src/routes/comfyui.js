/**
 * ComfyUI Routes
 */

import express from 'express';
import { addGenerationJob, getJobStatus } from '../services/queueService.js';
import { getWorkerManager } from '../services/workerManager.js';
import { verifyLoRAModels } from '../services/comfyuiClient.js';
import { authenticateFirebase } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/comfyui/generate
 * Generate image with ComfyUI + LoRA
 */
router.post('/generate', authenticateFirebase, async (req, res, next) => {
  try {
    const { prompt, workflow, referenceImage, priority, userId } = req.body;

    // Validation
    if (!prompt || !workflow) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: prompt, workflow'
      });
    }

    // Add to queue
    const job = await addGenerationJob({
      prompt,
      workflow,
      referenceImage,
      priority: priority || 5,
      userId: userId || req.user.uid,
      createdBy: req.user.email
    });

    res.status(202).json({
      success: true,
      message: 'Job queued successfully',
      data: job
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comfyui/job/:jobId
 * Get job status
 */
router.get('/job/:jobId', authenticateFirebase, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status.found) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comfyui/workers
 * Get worker stats
 */
router.get('/workers', authenticateFirebase, async (req, res, next) => {
  try {
    const workerManager = getWorkerManager();
    const stats = workerManager.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/comfyui/verify-lora
 * Verify LoRA models are installed
 */
router.post('/verify-lora', async (req, res, next) => {
  try {
    const { workerUrl, requiredModels } = req.body;

    if (!workerUrl || !requiredModels) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workerUrl, requiredModels'
      });
    }

    const result = await verifyLoRAModels(workerUrl, requiredModels);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/comfyui/generate/sync
 * Synchronous generation (for testing, limited to 2 min timeout)
 */
router.post('/generate/sync', authenticateFirebase, async (req, res, next) => {
  try {
    const { prompt, workflow, referenceImage } = req.body;

    // Add to queue with high priority
    const job = await addGenerationJob({
      prompt,
      workflow,
      referenceImage,
      priority: 1,
      userId: req.user.uid
    });

    // Poll for result (max 2 minutes)
    const maxWait = 120000; // 2 minutes
    const pollInterval = 1000; // 1 second
    const startTime = Date.now();

    const pollResult = async () => {
      while (Date.now() - startTime < maxWait) {
        const status = await getJobStatus(job.jobId);
        
        if (status.state === 'completed') {
          return res.json({
            success: true,
            data: {
              jobId: job.jobId,
              result: status.result
            }
          });
        }
        
        if (status.state === 'failed') {
          return res.status(500).json({
            success: false,
            message: 'Generation failed',
            error: status.failedReason
          });
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // Timeout
      return res.status(408).json({
        success: false,
        message: 'Generation timeout',
        data: { jobId: job.jobId }
      });
    };

    await pollResult();

  } catch (error) {
    next(error);
  }
});

export default router;
