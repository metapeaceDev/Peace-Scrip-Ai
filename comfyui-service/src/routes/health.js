/**
 * Health Routes
 */

import express from 'express';
import os from 'os';
import axios from 'axios';
import { getWorkerManager } from '../services/workerManager.js';
import { getQueueStats } from '../services/queueService.js';

const router = express.Router();

/**
 * Detect platform and GPU capabilities
 */
async function detectPlatform(workerManager) {
  const platform = os.platform(); // 'darwin' (Mac), 'win32' (Windows), 'linux'
  const arch = os.arch();

  // Prefer the *actual* worker-reported device list (more reliable than OS heuristics)
  const stats = (() => {
    try {
      return workerManager?.getStats?.();
    } catch {
      return null;
    }
  })();

  const localWorkers = stats?.local?.workers || [];
  const healthyLocal = localWorkers.find(w => w?.status === 'healthy') || localWorkers[0];

  const devices = Array.isArray(healthyLocal?.devices) ? healthyLocal.devices : [];
  const hasNvidiaGPU = devices.some(d => {
    const name = String(d?.name || '').toLowerCase();
    const type = String(d?.type || '').toLowerCase();
    return type === 'cuda' || name.includes('nvidia') || name.includes('geforce') || name.includes('rtx');
  });

  // Detect FaceID-related node availability from ComfyUI /object_info (best-effort)
  const nodeCaps = {
    hasIPAdapterUnifiedLoader: false,
    hasIPAdapter: false,
    hasInstantID: false,
    hasInsightFace: false,
    hasCLIPVisionLoader: false,
    clipVisionChoices: [],
    clipVisionFaceChoices: [],
    clipVisionAvailable: false,
    checked: false,
    error: null,
  };

  const workerUrl = healthyLocal?.url;
  if (workerUrl) {
    try {
      const response = await axios.get(`${workerUrl}/object_info`, { timeout: 10000 });
      const objectInfo = response?.data || {};
      const keys = Object.keys(objectInfo);

      nodeCaps.hasIPAdapterUnifiedLoader = keys.includes('IPAdapterUnifiedLoader');
      nodeCaps.hasIPAdapter = keys.includes('IPAdapter');
      nodeCaps.hasInstantID = keys.some(k => k.toLowerCase().includes('instantid'));
      nodeCaps.hasInsightFace = keys.some(k => k.toLowerCase().includes('insightface'));

      // CLIPVisionLoader presence is required for IP-Adapter Plus Face presets
      nodeCaps.hasCLIPVisionLoader = keys.includes('CLIPVisionLoader');

      // Fetch CLIP vision model choices (more reliable than generic /object_info)
      try {
        const clipRes = await axios.get(`${workerUrl}/object_info/CLIPVisionLoader`, { timeout: 10000 });
        const choices = clipRes.data?.CLIPVisionLoader?.input?.required?.clip_name?.[0];
        const allChoices = Array.isArray(choices) ? choices : [];
        // IP-Adapter FaceID typically needs a CLIP vision model (not the SVD image encoder).
        // If only SVD encoders are present, ComfyUI can still list them, but IP-Adapter Plus will fail.
        const faceChoices = allChoices.filter(name => !String(name || '').toLowerCase().includes('svd'));

        nodeCaps.clipVisionChoices = allChoices;
        nodeCaps.clipVisionFaceChoices = faceChoices;
        nodeCaps.clipVisionAvailable = faceChoices.length > 0;
      } catch {
        nodeCaps.clipVisionChoices = [];
        nodeCaps.clipVisionFaceChoices = [];
        nodeCaps.clipVisionAvailable = false;
      }

      nodeCaps.checked = true;
    } catch (err) {
      nodeCaps.checked = true;
      nodeCaps.error = err?.message || String(err);
    }
  }

  // FaceID is considered supported only if GPU + at least one supported FaceID path exists
  const supportsFaceID = Boolean(
    hasNvidiaGPU &&
      (
        nodeCaps.hasInstantID ||
        ((nodeCaps.hasIPAdapterUnifiedLoader || nodeCaps.hasIPAdapter) && nodeCaps.clipVisionAvailable)
      )
  );

  let recommendedFaceIdMethod = 'none';
  if (supportsFaceID) {
    recommendedFaceIdMethod = nodeCaps.hasInstantID
      ? 'instantid'
      : nodeCaps.hasIPAdapterUnifiedLoader || nodeCaps.hasIPAdapter
          ? 'ipadapter'
          : 'none';
  }

  const ipadapterNodesPresent = nodeCaps.hasIPAdapterUnifiedLoader || nodeCaps.hasIPAdapter;
  const reason = supportsFaceID
    ? `Face ID supported (${recommendedFaceIdMethod})`
    : hasNvidiaGPU
        ? ipadapterNodesPresent && !nodeCaps.clipVisionAvailable
        ? nodeCaps.clipVisionChoices.length > 0
          ? 'NVIDIA GPU detected and Face ID nodes present, but only SVD CLIP encoders were found. Install a CLIP Vision model suitable for IP-Adapter (e.g. clip_vision_g.safetensors) into ComfyUI/models/clip_vision and restart ComfyUI.'
          : 'NVIDIA GPU detected and Face ID nodes present, but no CLIP Vision model was found (install a .safetensors into ComfyUI/models/clip_vision and restart ComfyUI)'
            : 'NVIDIA GPU detected but Face ID nodes are missing (install InstantID/IP-Adapter custom nodes)'
        : 'No NVIDIA GPU detected - Face ID not supported on this worker';

  return {
    os: platform,
    arch,
    hasNvidiaGPU,
    supportsFaceID,
    recommendedFaceIdMethod,
    nodes: nodeCaps,
    recommendedWorkflow: supportsFaceID ? 'face-id' : 'normal-sdxl',
    reason,
  };
}

/**
 * GET /health
 * Basic health check with platform detection
 */
router.get('/', async (req, res) => {
  const workerManager = getWorkerManager();
  const platformInfo = await detectPlatform(workerManager);
  
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
  const workerManager = getWorkerManager();
  const platformInfo = await detectPlatform(workerManager);
  
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
    const platformInfo = await detectPlatform(workerManager);

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
      platform: platformInfo,
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

/**
 * GET /health/system_stats
 * Proxy ComfyUI worker /system_stats for browser clients.
 *
 * Why: ComfyUI often responds 403 when an Origin header is present, and does not set
 * CORS headers. Browsers therefore cannot call http://localhost:8188/system_stats directly.
 * This endpoint calls the local worker server-side and returns JSON with proper CORS via
 * the comfyui-service CORS middleware.
 */
router.get('/system_stats', async (req, res) => {
  try {
    const workerManager = getWorkerManager();
    const stats = (() => {
      try {
        return workerManager?.getStats?.();
      } catch {
        return null;
      }
    })();

    const localWorkers = stats?.local?.workers || [];
    const healthyLocal = localWorkers.find(w => w?.status === 'healthy') || localWorkers[0];
    const workerUrl = healthyLocal?.url;
    if (!workerUrl) {
      return res.status(503).json({
        success: false,
        message: 'No local ComfyUI worker available',
      });
    }

    const response = await axios.get(`${workerUrl}/system_stats`, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    res.status(502).json({
      success: false,
      message: 'Failed to fetch ComfyUI system_stats',
      error: error?.message || String(error),
    });
  }
});

export default router;
