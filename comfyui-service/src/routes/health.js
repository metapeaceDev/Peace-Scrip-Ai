/**
 * Health Routes
 */

import express from 'express';
import { getWorkerManager } from '../services/workerManager.js';
import { getQueueStats } from '../services/queueService.js';

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    success: true,
    service: 'comfyui-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/detailed
 * Detailed health check with worker and queue stats
 */
router.get('/detailed', async (req, res) => {
  try {
    const workerManager = getWorkerManager();
    const workerStats = workerManager.getStats();
    const queueStats = await getQueueStats();

    const isHealthy = workerStats.healthyWorkers > 0;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      service: 'comfyui-service',
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      workers: workerStats,
      queue: queueStats
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'comfyui-service',
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
