/**
 * Intelligent Load Balancer for ComfyUI Backends
 * 
 * Smart routing system that selects the best backend based on:
 * - User preferences
 * - Backend availability
 * - Cost optimization
 * - Speed requirements
 * - Queue length
 * - Auto-failover
 * 
 * Priority: Local > Cloud > Gemini
 */

import { EventEmitter } from 'events';
import axios from 'axios';

class IntelligentLoadBalancer extends EventEmitter {
  constructor(workerManager) {
    super();

    if (!workerManager) {
      throw new Error('workerManager is required');
    }

    this.workerManager = workerManager;
    
    // Backend configurations
    this.backends = {
      local: {
        name: 'Local GPU',
        priority: 1,
        costPerJob: 0,
        avgSpeedSeconds: 10,
        maxConcurrent: 3,
        available: false,
        healthy: false
      },
      cloud: {
        name: 'Cloud (RunPod)',
        priority: 2,
        costPerJob: 0.007, // $0.007 per video (serverless)
        avgSpeedSeconds: 20,
        maxConcurrent: 5,
        available: false,
        healthy: false
      },
      gemini: {
        name: 'Gemini AI',
        priority: 3,
        costPerJob: 0.08, // $0.08 per video
        avgSpeedSeconds: 5,
        maxConcurrent: 10,
        available: true, // Always available
        healthy: true
      }
    };
    
    // User preferences
    this.userPreferences = {
      preferredBackend: 'auto', // 'auto', 'local', 'cloud', 'gemini'
      maxCostPerJob: 0.10, // Maximum cost willing to pay
      prioritizeSpeed: false, // Speed vs Cost
      allowCloudFallback: true
    };
    
    // Statistics
    this.stats = {
      totalJobs: 0,
      jobsByBackend: {
        local: 0,
        cloud: 0,
        gemini: 0
      },
      failoverCount: 0,
      totalCost: 0,
      avgProcessTime: {
        local: [],
        cloud: [],
        gemini: []
      }
    };
    
    // Start monitoring
    this.startHealthMonitoring();
    
    console.log('🧠 Intelligent Load Balancer initialized');
  }

  /**
   * Select best backend for a job
   */
  async selectBackend(job, options = {}) {
    const {
      preferredBackend = this.userPreferences.preferredBackend,
      maxCost = this.userPreferences.maxCostPerJob,
      requireFast = this.userPreferences.prioritizeSpeed,
      allowCloudFallback = this.userPreferences.allowCloudFallback
    } = options;

    // Determine if this is a video job
    const isVideoJob = job.data?.metadata?.videoType || 
                      job.data?.workflow?.includes('video') ||
                      job.name?.includes('video');

    // Update backend health status
    await this.updateBackendHealth();

    // If user specified a backend, try it first
    if (preferredBackend !== 'auto') {
      const backend = this.backends[preferredBackend];
      
      // Block Gemini for video jobs
      if (isVideoJob && preferredBackend === 'gemini') {
        console.log(`❌ Gemini does not support video generation, falling back...`);
      } else if (backend && backend.available && backend.healthy) {
        console.log(`🎯 Using user-preferred backend: ${backend.name}`);
        return {
          backend: preferredBackend,
          reason: 'user-preference',
          cost: backend.costPerJob,
          estimatedTime: backend.avgSpeedSeconds
        };
      } else {
        console.log(`⚠️  Preferred backend ${preferredBackend} unavailable, falling back...`);
      }
    }

    // Auto-selection logic
    const candidates = this.getCandidateBackends(maxCost, isVideoJob, allowCloudFallback);

    if (candidates.length === 0) {
      throw new Error(isVideoJob 
        ? 'No available backends support video generation (ComfyUI required)' 
        : 'No available backends meet the cost requirements');
    }

    // Score each candidate
    const scored = candidates.map(backend => {
      const score = this.calculateBackendScore(backend, {
        requireFast,
        maxCost,
        queueLength: this.getQueueLength(backend.id)
      });
      
      return { ...backend, score };
    });

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);

    const selected = scored[0];

    console.log(`🧠 Auto-selected backend: ${selected.name} (score: ${selected.score.toFixed(2)})${isVideoJob ? ' [VIDEO]' : ''}`);

    return {
      backend: selected.id,
      reason: 'auto-selection',
      cost: selected.costPerJob,
      estimatedTime: selected.avgSpeedSeconds,
      score: selected.score
    };
  }

  /**
   * Get candidate backends that meet requirements
   */
  getCandidateBackends(maxCost, isVideoJob = false, allowCloudFallback = true) {
    const candidates = [];

    for (const [id, backend] of Object.entries(this.backends)) {
      // Skip Gemini for video jobs
      if (isVideoJob && id === 'gemini') {
        console.log(`⏭️  Skipping ${backend.name} - does not support video generation`);
        continue;
      }

      // Optional policy: disallow cloud fallback entirely
      if (!allowCloudFallback && id === 'cloud') {
        continue;
      }

      if (backend.available && backend.healthy && backend.costPerJob <= maxCost) {
        candidates.push({ id, ...backend });
      }
    }

    return candidates;
  }

  /**
   * Calculate backend score (0-100)
   */
  calculateBackendScore(backend, options) {
    const {
      requireFast = false,
      maxCost = this.userPreferences.maxCostPerJob || 0.1,
      queueLength = 0
    } = options || {};

    let score = 0;

    // Priority score (40 points)
    // Lower priority number = higher score
    const priorityScore = (4 - backend.priority) * 13.33;
    score += priorityScore;

    // Cost score (30 points)
    // Free = 30 points, expensive = 0 points
    const costScore = Math.max(0, 30 * (1 - (backend.costPerJob / maxCost)));
    score += costScore;

    // Speed score (20 points)
    if (requireFast) {
      // Faster = more points (inverse relationship)
      const speedScore = Math.max(0, 20 * (1 - (backend.avgSpeedSeconds / 60)));
      score += speedScore;
    } else {
      score += 10; // Default speed score when speed not prioritized
    }

    // Queue score (10 points)
    // Less queue = more points
    const queueScore = Math.max(0, 10 * (1 - (queueLength / 10)));
    score += queueScore;

    return score;
  }

  /**
   * Get current queue length for a backend
   */
  getQueueLength(backendId) {
    switch (backendId) {
      case 'local': {
        const localWorkers = Array.isArray(this.workerManager.workers) ? this.workerManager.workers : [];
        return localWorkers.reduce((sum, w) => sum + (w.queueLength || 0), 0);
      }
      case 'cloud': {
        try {
          const cloudStats = this.workerManager.getCloudManager().getStats();
          return Number(cloudStats?.busyPods || 0);
        } catch {
          return 0;
        }
      }
      case 'gemini':
        return 0; // Gemini has no queue
      default:
        return 0;
    }
  }

  /**
   * Update backend health status
   */
  async updateBackendHealth() {
    // Check local workers
    try {
      const localWorker = this.workerManager.getNextWorker();
      this.backends.local.available = true;
      this.backends.local.healthy = localWorker.status === 'healthy';
    } catch (error) {
      this.backends.local.available = false;
      this.backends.local.healthy = false;
    }

    // Check cloud workers
    const cloudManager = this.workerManager.getCloudManager();
    this.backends.cloud.available = cloudManager.isAvailable();
    this.backends.cloud.healthy = this.backends.cloud.available;

    // Gemini is always available
    this.backends.gemini.available = true;
    this.backends.gemini.healthy = true;
  }

  /**
   * Process job with auto-failover
   */
  async processJobWithFailover(job, processorOrOptions, options = {}) {
    // Handle optional processor argument
    let processor = null;
    if (typeof processorOrOptions === 'function') {
      processor = processorOrOptions;
    } else {
      options = processorOrOptions || {};
    }

    const maxRetries = 3;
    const startTime = Date.now();

    const isFatalCudaKernelIncompatibility = (message) => {
      const m = String(message || '').toLowerCase();

      // Explicit marker from comfyuiClient when we know it's deterministic.
      if (m.includes('fatal_cuda_kernel_incompatibility')) return true;

      // Common PyTorch/CUDA error on RTX 5090 when torch build lacks sm_120 kernels.
      if (m.includes('no kernel image is available for execution on the device')) return true;
      if (m.includes('cuda error: no kernel image')) return true;

      // More lenient fallback for variant formatting / escaped JSON.
      return m.includes('no kernel image') && m.includes('cuda');
    };

    const sm120Hint =
      'Your ComfyUI Python/Torch build does not include CUDA kernels for RTX 5090 (sm_120). ' +
      'Fix: run ComfyUI via the CUDA13 + PyTorch nightly container (docker-compose.cuda13.yml) ' +
      'or install a PyTorch nightly wheel that supports sm_120 (e.g. cu130/nightly).';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Select backend
        const selection = await this.selectBackend(job, options);
        const backendId = selection.backend;

        console.log(`📊 Processing job ${job.id} with ${this.backends[backendId].name} (attempt ${attempt}/${maxRetries})`);

        // Process with selected backend
        let result;
        if (processor) {
          result = await processor(backendId);
        } else {
          result = await this.processWithBackend(backendId, job);
        }

        // Record success
        const duration = Date.now() - startTime;
        this.recordJobSuccess(backendId, duration, selection.cost);

        return {
          success: true,
          result,
          backend: backendId,
          cost: selection.cost,
          duration
        };

      } catch (error) {
        const errorMessage = String(error?.message || error);
        console.error(`❌ Job failed on attempt ${attempt}: ${errorMessage}`);

        // Deterministic failure: retrying will not help.
        if (isFatalCudaKernelIncompatibility(errorMessage)) {
          throw new Error(`Job failed (no retries): ${errorMessage} | ${sm120Hint}`);
        }

        // Record failover
        this.stats.failoverCount++;
        this.emit('failover', {
          jobId: job.id,
          attempt,
          error: error.message
        });

        // If this was the last attempt, throw error
        if (attempt === maxRetries) {
          throw new Error(`Job failed after ${maxRetries} attempts: ${errorMessage}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Process job with specific backend
   */
  async processWithBackend(backendId, job) {
    switch (backendId) {
      case 'local': {
        const worker = this.workerManager.getNextWorker();
        // Process with local worker
        return await this.processWithLocalWorker(worker, job);
      }

      case 'cloud': {
        const cloudManager = this.workerManager.getCloudManager();
        return await cloudManager.processJob(job);
      }

      case 'gemini': {
        // Process with Gemini API
        return await this.processWithGemini(job);
      }

      default:
        throw new Error(`Unknown backend: ${backendId}`);
    }
  }

  /**
   * Process with local worker
   */
  async processWithLocalWorker(worker, job) {
    // Use imported axios
    
    const response = await axios.post(
      `${worker.url}/prompt`,
      job.data,
      { timeout: 300000 }
    );

    return response.data;
  }

  /**
   * Process with Gemini
   */
  async processWithGemini(job) {
    // Import Gemini service dynamically
    const { generateVideoWithGemini } = await import('./geminiService.js');
    
    return await generateVideoWithGemini(job.data);
  }

  /**
   * Record successful job
   */
  recordJobSuccess(backendId, duration, cost) {
    this.stats.totalJobs++;
    this.stats.jobsByBackend[backendId]++;
    this.stats.totalCost += cost;
    
    // Update average processing time
    const durationSeconds = duration / 1000;
    this.stats.avgProcessTime[backendId].push(durationSeconds);
    
    // Keep only last 100 measurements
    if (this.stats.avgProcessTime[backendId].length > 100) {
      this.stats.avgProcessTime[backendId].shift();
    }
    
    // Update backend average speed
    const avgTime = this.stats.avgProcessTime[backendId].reduce((a, b) => a + b, 0) / 
                    this.stats.avgProcessTime[backendId].length;
    this.backends[backendId].avgSpeedSeconds = Math.round(avgTime);

    this.emit('jobCompleted', {
      backend: backendId,
      duration: durationSeconds,
      cost
    });
  }

  /**
   * Get backend recommendations
   */
  getRecommendations(requirements = {}) {
    const {
      jobCount = 1,
      maxBudget = null,
      needsFast = false
    } = requirements;

    const recommendations = [];

    for (const [id, backend] of Object.entries(this.backends)) {
      if (!backend.available || !backend.healthy) continue;

      const totalCost = backend.costPerJob * jobCount;
      const totalTime = backend.avgSpeedSeconds * jobCount;

      if (maxBudget && totalCost > maxBudget) continue;

      recommendations.push({
        backend: id,
        name: backend.name,
        costPerJob: backend.costPerJob,
        totalCost,
        avgSpeed: backend.avgSpeedSeconds,
        totalTime,
        recommended: id === 'local' // Local is always recommended if available
      });
    }

    // Sort by cost (lowest first)
    if (!needsFast) {
      recommendations.sort((a, b) => a.totalCost - b.totalCost);
    } else {
      // Sort by speed (fastest first)
      recommendations.sort((a, b) => a.avgSpeed - b.avgSpeed);
    }

    return recommendations;
  }

  /**
   * Update user preferences
   */
  setPreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    
    console.log('⚙️  Load balancer preferences updated:', this.userPreferences);
    
    this.emit('preferencesUpdated', this.userPreferences);
  }

  /**
   * Get statistics
   */
  getStats() {
    const avgCostPerJob = this.stats.totalJobs > 0 
      ? this.stats.totalCost / this.stats.totalJobs 
      : 0;

    return {
      totalJobs: this.stats.totalJobs,
      jobsByBackend: this.stats.jobsByBackend,
      totalCost: this.stats.totalCost,
      avgCostPerJob,
      failoverCount: this.stats.failoverCount,
      backends: Object.entries(this.backends).map(([id, backend]) => ({
        id,
        name: backend.name,
        available: backend.available,
        healthy: backend.healthy,
        costPerJob: backend.costPerJob,
        avgSpeedSeconds: backend.avgSpeedSeconds,
        queueLength: this.getQueueLength(id)
      })),
      userPreferences: this.userPreferences
    };
  }

  /**
   * Calculate cost estimate
   */
  estimateCost(jobCount, backendId = null) {
    if (!Number.isFinite(jobCount) || jobCount <= 0) {
      throw new Error('jobCount must be a positive number');
    }

    if (backendId) {
      const backend = this.backends[backendId];
      if (!backend) {
        throw new Error(`Unknown backend: ${backendId}`);
      }
      return {
        backend: backendId,
        jobCount,
        costPerJob: backend.costPerJob,
        totalCost: backend.costPerJob * jobCount,
        avgTime: backend.avgSpeedSeconds * jobCount
      };
    }

    // Estimate for all backends
    return Object.entries(this.backends)
      .filter(([_, backend]) => backend.available)
      .map(([id, backend]) => ({
        backend: id,
        name: backend.name,
        jobCount,
        costPerJob: backend.costPerJob,
        totalCost: backend.costPerJob * jobCount,
        avgTime: backend.avgSpeedSeconds * jobCount
      }));
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Monitor health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.updateBackendHealth();
    }, 30000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export default IntelligentLoadBalancer;
