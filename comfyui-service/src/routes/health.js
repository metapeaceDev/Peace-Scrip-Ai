/**
 * Health Routes
 */

import express from 'express';
import os from 'os';
import { getWorkerManager } from '../services/workerManager.js';
import { getQueueStats } from '../services/queueService.js';

const router = express.Router();

/**
 * Detect platform and GPU capabilities
 */
function detectPlatform() {
  const platform = os.platform(); // 'darwin' (Mac), 'win32' (Windows), 'linux'
  const arch = os.arch();
  
  // Check for NVIDIA GPU (simplified - in production, check actual GPU)
  // For Mac: always assume no NVIDIA (use MPS/CPU)
  // For Windows/Linux: assume NVIDIA available (can be enhanced with actual GPU detection)
  const hasNvidiaGPU = platform !== 'darwin'; // Mac = false, Windows/Linux = true
  
  const supportsFaceID = hasNvidiaGPU; // Face ID works well only with NVIDIA GPU
  
  return {
    os: platform,
    arch: arch,
    hasNvidiaGPU: hasNvidiaGPU,
    supportsFaceID: supportsFaceID,
    recommendedWorkflow: supportsFaceID ? 'face-id' : 'normal-sdxl',
    reason: supportsFaceID 
      ? 'NVIDIA GPU detected - Face ID will work efficiently'
      : 'Mac/CPU detected - Normal SDXL recommended (Face ID too slow)'
  };
}

/**
 * GET /health
 * Basic health check with platform detection
 */
router.get('/', async (req, res) => {
  const platformInfo = detectPlatform();
  
  res.json({
    success: true,
    service: 'comfyui-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    platform: platformInfo
  });
});

/**
 * GET /health/platform
 * Platform and GPU detection endpoint
 */
router.get('/platform', async (req, res) => {
  const platformInfo = detectPlatform();
  
  res.json({
    success: true,
    platform: platformInfo
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

    // workerStats structure can be either flat or grouped (local/cloud/combined)
    const healthyWorkers =
      (typeof workerStats?.healthyWorkers === 'number' && workerStats.healthyWorkers) ||
      (typeof workerStats?.combined?.healthyWorkers === 'number' && workerStats.combined.healthyWorkers) ||
      (typeof workerStats?.local?.healthyWorkers === 'number' ? workerStats.local.healthyWorkers : 0) +
        (typeof workerStats?.cloud?.healthyWorkers === 'number' ? workerStats.cloud.healthyWorkers : 0);

    const totalWorkers =
      (typeof workerStats?.totalWorkers === 'number' && workerStats.totalWorkers) ||
      (typeof workerStats?.combined?.totalWorkers === 'number' && workerStats.combined.totalWorkers) ||
      (typeof workerStats?.local?.totalWorkers === 'number' ? workerStats.local.totalWorkers : 0) +
        (typeof workerStats?.cloud?.totalWorkers === 'number' ? workerStats.cloud.totalWorkers : 0);

    const isHealthy = healthyWorkers > 0;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      service: 'comfyui-service',
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      workers: {
        ...workerStats,
        totalWorkers,
        healthyWorkers
      },
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
