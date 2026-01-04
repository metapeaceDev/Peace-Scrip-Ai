/**
 * Debug Routes (local/dev helper)
 *
 * Note: These endpoints are intentionally unauthenticated and intended for local debugging.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJobStatus, getQueueStats } from '../services/queueService.js';
import { getWorkerManager } from '../services/workerManager.js';

const router = express.Router();

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
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

async function getComfyQueueSnapshot() {
  const result = {
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
    result.url = workerUrl;

    const data = await fetchJsonWithTimeout(`${workerUrl}/queue`, 5000);
    const running = Array.isArray(data?.queue_running) ? data.queue_running.length : 0;
    const pending = Array.isArray(data?.queue_pending) ? data.queue_pending.length : 0;

    result.ok = true;
    result.running = running;
    result.pending = pending;
    result.raw = data;
    return result;
  } catch (error) {
    result.error = error?.message || String(error);
    return result;
  }
}

function normalizeJobState(status) {
  const errorMessage = status?.error || status?.failedReason;
  let state = status?.state;

  if (state === 'active') state = 'processing';
  if (state === 'waiting' || state === 'delayed') state = 'queued';
  if (errorMessage) state = 'failed';
  if (state === 'completed') state = 'completed';

  return { state: state || 'unknown', errorMessage: errorMessage || null };
}

router.get('/status', async (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, '..', 'debug', 'status.html');
  res.sendFile(filePath);
});

/**
 * GET /debug/queue
 * Same-origin status endpoint for browsers (avoids CORS/origin problems).
 */
router.get('/queue', async (req, res) => {
  const queueStats = await getQueueStats();
  const comfyui = await getComfyQueueSnapshot();

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
 * GET /debug/job/:jobId
 * Returns job status + a derived interpretation of “95% stuck” cases.
 */
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const status = await getJobStatus(jobId);

  if (!status?.found) {
    return res.status(404).json({
      success: false,
      message: 'Video job not found'
    });
  }

  const comfyui = await getComfyQueueSnapshot();
  const { state, errorMessage } = normalizeJobState(status);
  const progress = typeof status.progress === 'number' ? status.progress : (status?.data?.progress ?? 0);
  const likelyFinalizing =
    state === 'processing' &&
    Number(progress) >= 95 &&
    comfyui.ok === true &&
    Number(comfyui.running ?? 0) === 0;

  const analysis = {
    likelyFinalizing,
    note: likelyFinalizing
      ? 'ComfyUI queue is IDLE while progress is >=95%. Generation is likely finished; backend may be downloading/uploading the video.'
      : 'No special condition detected.'
  };

  return res.json({
    success: true,
    data: {
      job: {
        jobId,
        state,
        progress,
        createdAt: status.createdAt,
        startedAt: status.startedAt || status.processedAt,
        completedAt: status.completedAt || status.finishedAt,
        result: status.result || {},
        error: errorMessage
      },
      comfyui,
      analysis,
      now: new Date().toISOString()
    }
  });
});

export default router;
