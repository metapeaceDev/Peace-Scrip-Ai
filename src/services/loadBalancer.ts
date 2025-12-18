/**
 * Load Balancer with Auto-scaling
 * Manages multiple RunPod instances and distributes load
 */

import { runPodService, PodInfo } from './runpod';
import { videoQueue, QueueMetrics } from './requestQueue';
import { EventEmitter } from 'events';

export interface LoadBalancerConfig {
  minPods: number; // Minimum pods to keep running
  maxPods: number; // Maximum pods to scale to
  targetQueueLength: number; // Target queue length before scaling
  scaleUpThreshold: number; // Queue length to trigger scale up
  scaleDownThreshold: number; // Queue length to trigger scale down
  scaleUpCooldown: number; // Cooldown period after scaling up (ms)
  scaleDownCooldown: number; // Cooldown period after scaling down (ms)
  podIdleTimeout: number; // Time before stopping idle pod (ms)
  healthCheckInterval: number; // Health check interval (ms)
}

export interface PodMetrics {
  podId: string;
  status: string;
  activeRequests: number;
  totalProcessed: number;
  uptime: number;
  lastUsed: Date;
  costAccumulated: number;
}

export interface LoadBalancerMetrics {
  activePods: number;
  totalPods: number;
  queueMetrics: QueueMetrics;
  podMetrics: PodMetrics[];
  totalCost: number;
  averageResponseTime: number;
  requestsPerMinute: number;
}

/**
 * Load Balancer with intelligent auto-scaling
 */
export class LoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private pods: Map<string, PodMetrics> = new Map();
  private lastScaleUp: number = 0;
  private lastScaleDown: number = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private requestCount: number = 0;
  private requestTimes: number[] = [];
  private startTime: Date = new Date();

  constructor(config?: Partial<LoadBalancerConfig>) {
    super();
    this.config = {
      minPods: config?.minPods || 0,
      maxPods: config?.maxPods || 5,
      targetQueueLength: config?.targetQueueLength || 5,
      scaleUpThreshold: config?.scaleUpThreshold || 10,
      scaleDownThreshold: config?.scaleDownThreshold || 2,
      scaleUpCooldown: config?.scaleUpCooldown || 120000, // 2 minutes
      scaleDownCooldown: config?.scaleDownCooldown || 300000, // 5 minutes
      podIdleTimeout: config?.podIdleTimeout || 600000, // 10 minutes
      healthCheckInterval: config?.healthCheckInterval || 30000, // 30 seconds
    };

    this.startHealthCheck();
    this.setupQueueListeners();
  }

  /**
   * Setup queue event listeners
   */
  private setupQueueListeners(): void {
    videoQueue.on('enqueued', () => {
      this.checkScaling();
    });

    videoQueue.on('completed', () => {
      this.checkScaling();
    });

    videoQueue.on('process', async (request, callback) => {
      try {
        const result = await this.processRequest(request.payload);
        callback(result);
      } catch (error) {
        callback(null, error as Error);
      }
    });
  }

  /**
   * Process request with load balancing
   */
  private async processRequest(payload: any): Promise<any> {
    const startTime = Date.now();

    // Get best available pod
    const pod = await this.selectPod();
    if (!pod) {
      throw new Error('No pods available');
    }

    try {
      // Update metrics
      pod.activeRequests++;
      pod.lastUsed = new Date();

      // Process the request (placeholder - integrate with actual video generation)
      const result = await this.executeOnPod(pod.podId, payload);

      // Update metrics
      pod.totalProcessed++;
      pod.activeRequests--;

      const responseTime = Date.now() - startTime;
      this.requestTimes.push(responseTime);
      if (this.requestTimes.length > 100) {
        this.requestTimes.shift(); // Keep last 100
      }

      this.requestCount++;

      return result;
    } catch (error) {
      pod.activeRequests--;
      throw error;
    }
  }

  /**
   * Select best pod for request
   */
  private async selectPod(): Promise<PodMetrics | null> {
    // Filter active pods
    const activePods = Array.from(this.pods.values()).filter(
      (pod) => pod.status === 'RUNNING'
    );

    if (activePods.length === 0) {
      // No active pods, try to start one
      const podId = await this.scaleUp();
      if (podId) {
        return this.pods.get(podId) || null;
      }
      return null;
    }

    // Select pod with least active requests (load balancing)
    activePods.sort((a, b) => a.activeRequests - b.activeRequests);
    return activePods[0];
  }

  /**
   * Execute request on specific pod
   */
  private async executeOnPod(podId: string, payload: any): Promise<any> {
    // Placeholder for actual execution
    // This should integrate with ComfyUI API on the pod
    console.log(`Executing request on pod ${podId}`);

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true, podId, payload };
  }

  /**
   * Check if scaling is needed
   */
  private async checkScaling(): Promise<void> {
    const queueMetrics = videoQueue.getMetrics();
    const now = Date.now();

    // Scale up if queue is growing
    if (queueMetrics.currentQueueLength >= this.config.scaleUpThreshold) {
      if (
        this.pods.size < this.config.maxPods &&
        now - this.lastScaleUp > this.config.scaleUpCooldown
      ) {
        console.log(
          `Queue length ${queueMetrics.currentQueueLength} >= threshold ${this.config.scaleUpThreshold}, scaling up...`
        );
        await this.scaleUp();
      }
    }

    // Scale down if queue is empty
    if (
      queueMetrics.currentQueueLength <= this.config.scaleDownThreshold &&
      queueMetrics.processingRequests === 0
    ) {
      if (
        this.pods.size > this.config.minPods &&
        now - this.lastScaleDown > this.config.scaleDownCooldown
      ) {
        console.log(
          `Queue length ${queueMetrics.currentQueueLength} <= threshold ${this.config.scaleDownThreshold}, scaling down...`
        );
        await this.scaleDown();
      }
    }
  }

  /**
   * Scale up (add pod)
   */
  async scaleUp(): Promise<string | null> {
    if (this.pods.size >= this.config.maxPods) {
      console.log('Already at max pods');
      return null;
    }

    try {
      console.log(`Scaling up... (current: ${this.pods.size}/${this.config.maxPods})`);

      // Deploy new pod
      const podInfo = await runPodService.deployPod({
        gpuType: 'NVIDIA RTX 3090',
        imageName: process.env.VITE_RUNPOD_DOCKER_IMAGE || 'peace-script/comfyui:latest',
      });

      // Wait for pod to be ready
      await runPodService.waitForPodReady(podInfo.id, 300000); // 5 min timeout

      // Add to tracking
      const metrics: PodMetrics = {
        podId: podInfo.id,
        status: podInfo.status,
        activeRequests: 0,
        totalProcessed: 0,
        uptime: 0,
        lastUsed: new Date(),
        costAccumulated: 0,
      };

      this.pods.set(podInfo.id, metrics);
      this.lastScaleUp = Date.now();

      this.emit('scaled-up', { podId: podInfo.id, totalPods: this.pods.size });
      console.log(`✅ Scaled up to ${this.pods.size} pods`);

      return podInfo.id;
    } catch (error) {
      console.error('Failed to scale up:', error);
      this.emit('scale-error', { action: 'up', error });
      return null;
    }
  }

  /**
   * Scale down (remove pod)
   */
  async scaleDown(): Promise<boolean> {
    if (this.pods.size <= this.config.minPods) {
      console.log('Already at min pods');
      return false;
    }

    // Find idle pod to remove
    const idlePod = this.findIdlePod();
    if (!idlePod) {
      console.log('No idle pods to remove');
      return false;
    }

    try {
      console.log(`Scaling down pod ${idlePod.podId}...`);

      // Stop the pod
      await runPodService.stopPod(idlePod.podId);

      // Remove from tracking
      this.pods.delete(idlePod.podId);
      this.lastScaleDown = Date.now();

      this.emit('scaled-down', {
        podId: idlePod.podId,
        totalPods: this.pods.size,
      });
      console.log(`✅ Scaled down to ${this.pods.size} pods`);

      return true;
    } catch (error) {
      console.error('Failed to scale down:', error);
      this.emit('scale-error', { action: 'down', error });
      return false;
    }
  }

  /**
   * Find idle pod to remove
   */
  private findIdlePod(): PodMetrics | null {
    const now = Date.now();
    const idlePods = Array.from(this.pods.values()).filter(
      (pod) =>
        pod.activeRequests === 0 &&
        now - pod.lastUsed.getTime() > this.config.podIdleTimeout
    );

    if (idlePods.length === 0) return null;

    // Return least recently used
    idlePods.sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());
    return idlePods[0];
  }

  /**
   * Start health check loop
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all pods
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.pods.entries()).map(
      async ([podId, metrics]) => {
        try {
          const isHealthy = await runPodService.checkComfyUIHealth(podId);
          const podStatus = await runPodService.getPodStatus(podId);

          if (!isHealthy || podStatus.status !== 'RUNNING') {
            console.warn(`Pod ${podId} is unhealthy, removing from pool`);
            this.pods.delete(podId);
            this.emit('pod-unhealthy', { podId });
          } else {
            // Update metrics
            metrics.status = podStatus.status;
            metrics.uptime = podStatus.uptime || 0;
          }
        } catch (error) {
          console.error(`Health check failed for pod ${podId}:`, error);
          this.pods.delete(podId);
        }
      }
    );

    await Promise.all(healthPromises);
  }

  /**
   * Get load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    const activePods = Array.from(this.pods.values()).filter(
      (pod) => pod.status === 'RUNNING'
    ).length;

    const totalCost = Array.from(this.pods.values()).reduce(
      (sum, pod) => sum + pod.costAccumulated,
      0
    );

    const avgResponseTime =
      this.requestTimes.length > 0
        ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
        : 0;

    const uptime = Date.now() - this.startTime.getTime();
    const requestsPerMinute = (this.requestCount / uptime) * 60000;

    return {
      activePods,
      totalPods: this.pods.size,
      queueMetrics: videoQueue.getMetrics(),
      podMetrics: Array.from(this.pods.values()),
      totalCost,
      averageResponseTime: avgResponseTime,
      requestsPerMinute,
    };
  }

  /**
   * Stop all pods and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down load balancer...');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Stop all pods
    const stopPromises = Array.from(this.pods.keys()).map((podId) =>
      runPodService.stopPod(podId).catch((err) =>
        console.error(`Failed to stop pod ${podId}:`, err)
      )
    );

    await Promise.all(stopPromises);
    this.pods.clear();

    console.log('Load balancer shut down');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoadBalancerConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const loadBalancer = new LoadBalancer({
  minPods: 0,
  maxPods: 5,
  targetQueueLength: 5,
  scaleUpThreshold: 10,
  scaleDownThreshold: 2,
  scaleUpCooldown: 120000, // 2 minutes
  scaleDownCooldown: 300000, // 5 minutes
  podIdleTimeout: 600000, // 10 minutes
  healthCheckInterval: 30000, // 30 seconds
});
