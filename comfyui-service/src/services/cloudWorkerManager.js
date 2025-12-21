/**
 * Cloud Worker Manager
 * 
 * Manages cloud-based ComfyUI workers (RunPod, etc.)
 * Features:
 * - On-demand pod spawning
 * - Auto-scaling based on queue length
 * - Cost tracking
 * - Auto-shutdown for idle pods
 * - Health monitoring
 */

import RunPodClient from './runpodClient.js';
import { EventEmitter } from 'events';

class CloudWorkerManager extends EventEmitter {
  constructor() {
    super();
    
    this.runpodClient = new RunPodClient(process.env.RUNPOD_API_KEY);
    this.serverlessEndpointId = process.env.RUNPOD_SERVERLESS_ENDPOINT_ID;
    
    this.activePods = new Map(); // podId -> pod info
    this.podLastActivity = new Map(); // podId -> timestamp
    this.totalCost = 0;
    this.costByPod = new Map(); // podId -> cost
    
    // Configuration
    this.config = {
      idleTimeout: parseInt(process.env.CLOUD_IDLE_TIMEOUT) || 5 * 60 * 1000, // 5 minutes
      maxPods: parseInt(process.env.CLOUD_MAX_PODS) || 5,
      autoScaleThreshold: parseInt(process.env.CLOUD_AUTOSCALE_THRESHOLD) || 5, // Queue length
      preferServerless: process.env.CLOUD_PREFER_SERVERLESS !== 'false',
      gpuType: process.env.RUNPOD_GPU_TYPE || 'NVIDIA RTX 3090'
    };

    // Start monitoring
    this.startMonitoring();

    console.log('☁️  Cloud Worker Manager initialized');
    console.log(`   Serverless: ${this.serverlessEndpointId ? 'Enabled' : 'Disabled'}`);
    console.log(`   On-Demand Pods: Max ${this.config.maxPods}`);
    console.log(`   Idle Timeout: ${this.config.idleTimeout / 1000}s`);
  }

  /**
   * Process job with cloud worker
   */
  async processJob(job) {
    const startTime = Date.now();

    try {
      // Try serverless first if configured and preferred
      if (this.serverlessEndpointId && this.config.preferServerless) {
        try {
          console.log(`☁️  Processing job ${job.id} with serverless...`);
          const result = await this.runpodClient.invokeServerless(
            this.serverlessEndpointId,
            job.data
          );

          const duration = Date.now() - startTime;
          const cost = this.calculateServerlessCost(duration);
          
          this.trackCost(cost, 'serverless');
          
          this.emit('jobCompleted', {
            jobId: job.id,
            backend: 'serverless',
            duration,
            cost
          });

          return result;
        } catch (error) {
          console.warn('Serverless failed, falling back to on-demand pod:', error.message);
          // Fall through to on-demand pod
        }
      }

      // Use on-demand pod
      const pod = await this.getAvailablePod(job);
      
      console.log(`☁️  Processing job ${job.id} with pod ${pod.id}...`);
      
      // Process job with pod
      const result = await this.processWithPod(pod, job);
      
      const duration = Date.now() - startTime;
      const cost = this.runpodClient.calculateCost(duration, pod.costPerHour);
      
      this.trackCost(cost, pod.id);
      this.updatePodActivity(pod.id);
      
      this.emit('jobCompleted', {
        jobId: job.id,
        backend: 'cloud-pod',
        podId: pod.id,
        duration,
        cost
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.emit('jobFailed', {
        jobId: job.id,
        backend: 'cloud',
        duration,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get available pod (or spawn new one)
   */
  async getAvailablePod(job) {
    // Check existing healthy pods
    const availablePods = Array.from(this.activePods.values())
      .filter(pod => pod.status === 'ready' && !pod.busy);

    if (availablePods.length > 0) {
      const pod = availablePods[0];
      pod.busy = true;
      return pod;
    }

    // Spawn new pod if under limit
    if (this.activePods.size < this.config.maxPods) {
      return await this.spawnPod();
    }

    // Wait for existing pod to become available
    console.log('⏳ All pods busy, waiting for available pod...');
    return await this.waitForAvailablePod();
  }

  /**
   * Spawn new on-demand pod
   */
  async spawnPod() {
    console.log('🚀 Spawning new cloud pod...');

    const pod = await this.runpodClient.deployOnDemandPod({
      gpuTypeId: this.config.gpuType,
      imageName: process.env.RUNPOD_DOCKER_IMAGE
    });

    // Wait for pod to be ready
    const readyPod = await this.runpodClient.waitForPodReady(pod.id);

    const podInfo = {
      ...pod,
      ...readyPod,
      busy: false,
      jobsProcessed: 0,
      totalProcessingTime: 0
    };

    this.activePods.set(pod.id, podInfo);
    this.updatePodActivity(pod.id);

    console.log(`✅ Pod ${pod.id} spawned and ready`);

    this.emit('podSpawned', podInfo);

    return podInfo;
  }

  /**
   * Wait for available pod
   */
  async waitForAvailablePod(timeout = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const availablePods = Array.from(this.activePods.values())
        .filter(pod => pod.status === 'ready' && !pod.busy);

      if (availablePods.length > 0) {
        const pod = availablePods[0];
        pod.busy = true;
        return pod;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('No pods became available within timeout');
  }

  /**
   * Process job with specific pod
   */
  async processWithPod(pod, job) {
    const axios = require('axios');

    try {
      // Send job to ComfyUI on the pod
      const response = await axios.post(
        `${pod.url}/prompt`,
        job.data,
        { timeout: 300000 } // 5 minutes
      );

      pod.jobsProcessed++;
      
      return response.data;
    } finally {
      pod.busy = false;
    }
  }

  /**
   * Update pod activity timestamp
   */
  updatePodActivity(podId) {
    this.podLastActivity.set(podId, Date.now());
  }

  /**
   * Auto-scaling: Check if we need more or fewer pods
   */
  async checkAutoScaling(queueLength) {
    const activePodCount = this.activePods.size;

    // Scale up if queue is long
    if (queueLength >= this.config.autoScaleThreshold && activePodCount < this.config.maxPods) {
      const podsNeeded = Math.min(
        Math.ceil(queueLength / 3), // 1 pod per 3 jobs
        this.config.maxPods - activePodCount
      );

      console.log(`📈 Auto-scaling: Queue length ${queueLength}, spawning ${podsNeeded} pod(s)`);

      for (let i = 0; i < podsNeeded; i++) {
        try {
          await this.spawnPod();
        } catch (error) {
          console.error(`Failed to spawn pod: ${error.message}`);
          break;
        }
      }
    }
  }

  /**
   * Monitor and shutdown idle pods
   */
  async monitorIdlePods() {
    const now = Date.now();

    for (const [podId, pod] of this.activePods.entries()) {
      const lastActivity = this.podLastActivity.get(podId) || pod.createdAt;
      const idleTime = now - lastActivity;

      // Shutdown if idle for too long
      if (idleTime > this.config.idleTimeout && !pod.busy) {
        console.log(`💰 Pod ${podId} idle for ${Math.round(idleTime / 1000)}s, terminating...`);
        
        try {
          await this.terminatePod(podId);
        } catch (error) {
          console.error(`Failed to terminate pod ${podId}:`, error.message);
        }
      }
    }
  }

  /**
   * Terminate pod
   */
  async terminatePod(podId) {
    const pod = this.activePods.get(podId);
    
    if (!pod) {
      console.warn(`Pod ${podId} not found in active pods`);
      return;
    }

    // Calculate final cost
    const lifetime = Date.now() - pod.createdAt;
    const finalCost = this.runpodClient.calculateCost(lifetime, pod.costPerHour);
    
    this.trackCost(finalCost, podId);

    // Terminate via RunPod API
    await this.runpodClient.terminatePod(podId);

    // Remove from active pods
    this.activePods.delete(podId);
    this.podLastActivity.delete(podId);

    console.log(`✅ Pod ${podId} terminated. Lifetime: ${Math.round(lifetime / 1000)}s, Cost: $${finalCost.toFixed(4)}`);

    this.emit('podTerminated', {
      podId,
      lifetime,
      cost: finalCost,
      jobsProcessed: pod.jobsProcessed
    });
  }

  /**
   * Track cost
   */
  trackCost(cost, source) {
    this.totalCost += cost;
    
    if (source !== 'serverless') {
      const currentCost = this.costByPod.get(source) || 0;
      this.costByPod.set(source, currentCost + cost);
    }

    this.emit('costUpdated', {
      totalCost: this.totalCost,
      recentCost: cost,
      source
    });
  }

  /**
   * Calculate serverless cost
   */
  calculateServerlessCost(durationMs) {
    // RunPod serverless pricing: ~$0.00034 per second
    const seconds = durationMs / 1000;
    const costPerSecond = 0.00034;
    return seconds * costPerSecond;
  }

  /**
   * Get statistics
   */
  getStats() {
    const pods = Array.from(this.activePods.values());
    
    return {
      activePods: pods.length,
      busyPods: pods.filter(p => p.busy).length,
      totalJobsProcessed: pods.reduce((sum, p) => sum + p.jobsProcessed, 0),
      totalCost: this.totalCost,
      costByPod: Object.fromEntries(this.costByPod),
      pods: pods.map(p => ({
        id: p.id,
        status: p.status,
        busy: p.busy,
        jobsProcessed: p.jobsProcessed,
        costPerHour: p.costPerHour,
        uptime: Date.now() - p.createdAt,
        idleTime: Date.now() - (this.podLastActivity.get(p.id) || p.createdAt)
      }))
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Check for idle pods every minute
    this.monitoringInterval = setInterval(
      () => this.monitorIdlePods(),
      60000
    );

    console.log('✅ Cloud worker monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Shutdown all pods (cleanup)
   */
  async shutdown() {
    console.log('🛑 Shutting down all cloud pods...');
    
    this.stopMonitoring();

    const terminatePromises = Array.from(this.activePods.keys()).map(
      podId => this.terminatePod(podId).catch(err => console.error(err))
    );

    await Promise.all(terminatePromises);

    console.log('✅ All cloud pods terminated');
  }

  /**
   * Check if cloud workers are available
   */
  isAvailable() {
    return !!(this.serverlessEndpointId || this.runpodClient.apiKey);
  }
}

export default CloudWorkerManager;
