/**
 * Queue Routes
 */

import express from 'express';
import { getQueueStats, cleanQueue } from '../services/queueService.js';
import { authenticateFirebase } from '../middleware/auth.js';

const router = express.Router();

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
