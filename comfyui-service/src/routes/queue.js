/**
 * Queue Routes
 */

import express from 'express';
import { getQueueStats, cleanQueue } from '../services/queueService.js';
import { authenticateFirebase } from '../middleware/auth.js';
import { getWorkerManager } from '../services/workerManager.js';

const router = express.Router();

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/queue/status
 * Lightweight status endpoint (no auth) for local debugging.
 * Includes both backend queue stats and a ComfyUI /queue snapshot (server-side fetch).
 */
router.get('/status', async (req, res) => {
  const queueStats = await getQueueStats();

  let comfyui = {
    ok: false,
    url: null,
    running: null,
    pending: null,
    raw: null,
    error: null
  };

  try {
    const workerManager = getWorkerManager();
    const stats = workerManager.getStats();
    const workerUrl = stats?.local?.workers?.[0]?.url || 'http://localhost:8188';
    comfyui.url = workerUrl;

    const data = await fetchJsonWithTimeout(`${workerUrl}/queue`, 5000);
    const running = Array.isArray(data?.queue_running) ? data.queue_running.length : 0;
    const pending = Array.isArray(data?.queue_pending) ? data.queue_pending.length : 0;

    comfyui = {
      ok: true,
      url: workerUrl,
      running,
      pending,
      raw: data,
      error: null
    };
  } catch (error) {
    comfyui.error = error?.message || String(error);
  }

  res.json({
    success: true,
    data: {
      queue: queueStats,
      comfyui,
      now: new Date().toISOString()
    }
  });
});

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', authenticateFirebase, async (req, res, next) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/clean
 * Clean old jobs (admin only)
 */
router.post('/clean', authenticateFirebase, async (req, res, next) => {
  try {
    // TODO: Add admin check
    const { olderThan } = req.body;
    await cleanQueue(olderThan);

    res.json({
      success: true,
      message: 'Queue cleaned successfully'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
