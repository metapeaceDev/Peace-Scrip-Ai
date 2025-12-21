/**
 * Cloud Worker Routes
 * 
 * API endpoints for managing cloud workers (RunPod)
 * - Get cloud worker status
 * - Get cost statistics
 * - Manually spawn/terminate pods
 * - Configure cloud settings
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/cloud/status
 * Get cloud worker status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    if (!cloudManager.isAvailable()) {
      return res.json({
        available: false,
        message: 'Cloud workers not configured. Set RUNPOD_API_KEY in .env'
      });
    }

    const stats = cloudManager.getStats();

    res.json({
      available: true,
      ...stats,
      config: {
        maxPods: cloudManager.config.maxPods,
        idleTimeout: cloudManager.config.idleTimeout,
        autoScaleThreshold: cloudManager.config.autoScaleThreshold,
        preferServerless: cloudManager.config.preferServerless,
        gpuType: cloudManager.config.gpuType
      }
    });
  } catch (error) {
    console.error('Error getting cloud status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cloud/cost
 * Get cost statistics
 */
router.get('/cost', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    if (!cloudManager.isAvailable()) {
      return res.json({
        available: false,
        totalCost: 0,
        costByPod: {}
      });
    }

    const stats = cloudManager.getStats();

    res.json({
      available: true,
      totalCost: stats.totalCost,
      costByPod: stats.costByPod,
      activePods: stats.activePods,
      totalJobsProcessed: stats.totalJobsProcessed,
      avgCostPerJob: stats.totalJobsProcessed > 0 
        ? stats.totalCost / stats.totalJobsProcessed 
        : 0
    });
  } catch (error) {
    console.error('Error getting cloud cost:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cloud/spawn
 * Manually spawn a cloud pod
 */
router.post('/spawn', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    if (!cloudManager.isAvailable()) {
      return res.status(400).json({
        error: 'Cloud workers not configured'
      });
    }

    const { gpuType } = req.body;

    console.log('🚀 Manual pod spawn requested');
    
    const pod = await cloudManager.spawnPod(gpuType ? { gpuTypeId: gpuType } : undefined);

    res.json({
      success: true,
      pod: {
        id: pod.id,
        url: pod.url,
        status: pod.status,
        costPerHour: pod.costPerHour
      }
    });
  } catch (error) {
    console.error('Error spawning pod:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cloud/terminate/:podId
 * Manually terminate a cloud pod
 */
router.post('/terminate/:podId', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();
    const { podId } = req.params;

    if (!cloudManager.isAvailable()) {
      return res.status(400).json({
        error: 'Cloud workers not configured'
      });
    }

    console.log(`🛑 Manual pod termination requested: ${podId}`);
    
    await cloudManager.terminatePod(podId);

    res.json({
      success: true,
      message: `Pod ${podId} terminated`
    });
  } catch (error) {
    console.error('Error terminating pod:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cloud/shutdown-all
 * Shutdown all cloud pods (emergency stop)
 */
router.post('/shutdown-all', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    if (!cloudManager.isAvailable()) {
      return res.json({
        success: true,
        message: 'No cloud workers to shutdown'
      });
    }

    console.log('🚨 Emergency shutdown requested - terminating all pods');
    
    await cloudManager.shutdown();

    res.json({
      success: true,
      message: 'All cloud pods terminated'
    });
  } catch (error) {
    console.error('Error shutting down pods:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cloud/pods
 * List all active cloud pods
 */
router.get('/pods', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    if (!cloudManager.isAvailable()) {
      return res.json({
        available: false,
        pods: []
      });
    }

    const stats = cloudManager.getStats();

    res.json({
      available: true,
      pods: stats.pods
    });
  } catch (error) {
    console.error('Error listing pods:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/cloud/config
 * Update cloud configuration
 */
router.put('/config', async (req, res) => {
  try {
    const { workerManager } = req.app.locals;
    const cloudManager = workerManager.getCloudManager();

    const { maxPods, idleTimeout, autoScaleThreshold, preferServerless } = req.body;

    if (maxPods !== undefined) {
      cloudManager.config.maxPods = parseInt(maxPods);
    }

    if (idleTimeout !== undefined) {
      cloudManager.config.idleTimeout = parseInt(idleTimeout);
    }

    if (autoScaleThreshold !== undefined) {
      cloudManager.config.autoScaleThreshold = parseInt(autoScaleThreshold);
    }

    if (preferServerless !== undefined) {
      cloudManager.config.preferServerless = preferServerless === 'true' || preferServerless === true;
    }

    console.log('⚙️  Cloud configuration updated:', cloudManager.config);

    res.json({
      success: true,
      config: cloudManager.config
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
