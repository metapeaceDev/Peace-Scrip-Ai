/**
 * Load Balancer Routes
 * 
 * API endpoints for intelligent backend routing and recommendations
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/loadbalancer/status
 * Get load balancer status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    
    if (!loadBalancer) {
      return res.status(500).json({ error: 'Load balancer not initialized' });
    }

    const stats = loadBalancer.getStats();

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error getting load balancer status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/loadbalancer/select
 * Get backend recommendation for a job
 */
router.post('/select', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    const { jobType, options = {} } = req.body;

    const selection = await loadBalancer.selectBackend(
      { id: 'preview', type: jobType },
      options
    );

    res.json({
      success: true,
      selection
    });
  } catch (error) {
    console.error('Error selecting backend:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loadbalancer/recommendations
 * Get backend recommendations based on requirements
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    const {
      jobCount = 1,
      maxBudget = null,
      needsFast = false
    } = req.query;

    const recommendations = loadBalancer.getRecommendations({
      jobCount: parseInt(jobCount),
      maxBudget: maxBudget ? parseFloat(maxBudget) : null,
      needsFast: needsFast === 'true'
    });

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/loadbalancer/estimate
 * Calculate cost estimate for jobs
 */
router.post('/estimate', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    const { jobCount, backend = null } = req.body;

    const estimate = loadBalancer.estimateCost(jobCount, backend);

    res.json({
      success: true,
      estimate
    });
  } catch (error) {
    console.error('Error calculating estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/loadbalancer/preferences
 * Update user preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    const preferences = req.body;

    loadBalancer.setPreferences(preferences);

    res.json({
      success: true,
      preferences: loadBalancer.userPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loadbalancer/backends
 * Get all backend information
 */
router.get('/backends', async (req, res) => {
  try {
    const { loadBalancer } = req.app.locals;
    
    const stats = loadBalancer.getStats();

    res.json({
      success: true,
      backends: stats.backends
    });
  } catch (error) {
    console.error('Error getting backends:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
