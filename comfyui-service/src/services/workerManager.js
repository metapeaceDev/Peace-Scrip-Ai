/**
 * ComfyUI Worker Manager
 * 
 * Manages multiple ComfyUI instances (GPU pool)
 * Handles load balancing and health checks
 */

import axios from 'axios';
import { EventEmitter } from 'events';

class WorkerManager extends EventEmitter {
  constructor() {
    super();
    this.workers = [];
    this.currentWorkerIndex = 0;
    this.healthCheckInterval = null;
  }

  /**
   * Initialize workers from environment config
   */
  async initialize() {
    const workerUrls = (process.env.COMFYUI_WORKERS || 'http://localhost:8188').split(',');
    
    console.log(`🔧 Initializing ${workerUrls.length} ComfyUI worker(s)...`);
    
    for (const url of workerUrls) {
      await this.addWorker(url.trim());
    }

    // Start health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => this.healthCheck(), 30000);
    
    console.log(`✅ ${this.workers.length} ComfyUI worker(s) ready`);
  }

  /**
   * Add a new worker
   */
  async addWorker(url) {
    try {
      // Test connection
      const response = await axios.get(`${url}/system_stats`, { timeout: 5000 });
      
      const worker = {
        id: `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        status: 'healthy',
        queueLength: 0,
        devices: response.data.devices || [],
        vram: response.data.vram || {},
        lastCheck: Date.now(),
        failCount: 0
      };

      this.workers.push(worker);
      console.log(`✅ Worker added: ${url}`);
      console.log(`   GPU: ${worker.devices.map(d => d.name).join(', ')}`);
      
      return worker;
    } catch (error) {
      console.error(`❌ Failed to add worker ${url}:`, error.message);
      
      // Add as unhealthy worker (might come online later)
      const worker = {
        id: `worker-${Date.now()}`,
        url,
        status: 'unhealthy',
        queueLength: 0,
        lastCheck: Date.now(),
        failCount: 1
      };
      this.workers.push(worker);
      
      return worker;
    }
  }

  /**
   * Get next available worker (round-robin + health check)
   */
  getNextWorker() {
    if (this.workers.length === 0) {
      throw new Error('No ComfyUI workers available');
    }

    // Filter healthy workers
    const healthyWorkers = this.workers.filter(w => w.status === 'healthy');
    
    if (healthyWorkers.length === 0) {
      throw new Error('No healthy ComfyUI workers available');
    }

    // Round-robin selection
    const worker = healthyWorkers[this.currentWorkerIndex % healthyWorkers.length];
    this.currentWorkerIndex++;
    
    return worker;
  }

  /**
   * Get worker by ID
   */
  getWorker(workerId) {
    return this.workers.find(w => w.id === workerId);
  }

  /**
   * Health check all workers
   */
  async healthCheck() {
    console.log(`🔍 Running health check on ${this.workers.length} worker(s)...`);
    
    const checks = this.workers.map(async (worker) => {
      try {
        const start = Date.now();
        const response = await axios.get(`${worker.url}/system_stats`, { timeout: 5000 });
        const latency = Date.now() - start;

        worker.status = 'healthy';
        worker.queueLength = response.data.exec_info?.queue_remaining || 0;
        worker.devices = response.data.devices || [];
        worker.vram = response.data.vram || {};
        worker.lastCheck = Date.now();
        worker.latency = latency;
        worker.failCount = 0;

        return { worker: worker.id, status: 'healthy', latency };
      } catch (error) {
        worker.failCount++;
        worker.lastCheck = Date.now();
        
        // Mark as unhealthy after 3 consecutive fails
        if (worker.failCount >= 3) {
          worker.status = 'unhealthy';
        }
        
        return { worker: worker.id, status: 'unhealthy', error: error.message };
      }
    });

    const results = await Promise.all(checks);
    
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    console.log(`✅ Health check complete: ${healthyCount}/${this.workers.length} healthy`);
    
    // Emit event for monitoring
    this.emit('healthCheck', { results, healthyCount, totalWorkers: this.workers.length });
    
    return results;
  }

  /**
   * Get worker stats
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      healthyWorkers: this.workers.filter(w => w.status === 'healthy').length,
      workers: this.workers.map(w => ({
        id: w.id,
        url: w.url,
        status: w.status,
        queueLength: w.queueLength,
        devices: w.devices,
        latency: w.latency,
        lastCheck: w.lastCheck,
        failCount: w.failCount
      }))
    };
  }

  /**
   * Get installed video models from ComfyUI workers
   * Checks for AnimateDiff motion modules and SVD checkpoints
   */
  async getInstalledVideoModels() {
    if (this.workers.length === 0) {
      return { animateDiff: [], svd: [] };
    }

    try {
      // Use first healthy worker to check models
      const worker = this.getNextWorker();
      
      // Query ComfyUI for available models
      const response = await axios.get(`${worker.url}/object_info`, { timeout: 10000 });
      const objectInfo = response.data;

      const animateDiffModels = [];
      const svdModels = [];

      // Check for AnimateDiff nodes and models
      if (objectInfo.AnimateDiffLoaderV1 || objectInfo.AnimateDiffModelLoader) {
        // Models are typically in ComfyUI/custom_nodes/ComfyUI-AnimateDiff/models/
        animateDiffModels.push('mm_sd_v15_v2.ckpt', 'mm_sd_v15_v3.ckpt');
      }

      // Check for SVD checkpoints
      if (objectInfo.SVD_img2vid_Conditioning || objectInfo.ImageOnlyCheckpointLoader) {
        svdModels.push('svd_xt_1_1.safetensors');
      }

      return {
        animateDiff: animateDiffModels,
        svd: svdModels,
        hasVideoSupport: animateDiffModels.length > 0 || svdModels.length > 0
      };
    } catch (error) {
      console.error('❌ Failed to check video models:', error.message);
      return { animateDiff: [], svd: [], hasVideoSupport: false };
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    console.log('👋 Worker manager shut down');
  }
}

// Singleton instance
const workerManager = new WorkerManager();

export async function startWorkerManager() {
  await workerManager.initialize();
  return workerManager;
}

export function getWorkerManager() {
  return workerManager;
}

export default workerManager;
