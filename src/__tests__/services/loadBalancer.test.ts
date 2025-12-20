/**
 * Load Balancer Integration Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoadBalancer } from '../../services/loadBalancer';
import * as runpodModule from '../../services/runpod';

// Mock RunPod service
vi.mock('../../services/runpod', () => ({
  runPodService: {
    deployPod: vi.fn(),
    getPodStatus: vi.fn(),
    stopPod: vi.fn(),
    resumePod: vi.fn(),
    checkComfyUIHealth: vi.fn(),
    waitForPodReady: vi.fn(),
  },
}));

describe('Load Balancer Integration', () => {
  let balancer: LoadBalancer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.spyOn(runpodModule.runPodService, 'deployPod').mockResolvedValue('pod-123');
    vi.spyOn(runpodModule.runPodService, 'waitForPodReady').mockResolvedValue(true);
    vi.spyOn(runpodModule.runPodService, 'getPodStatus').mockResolvedValue({
      id: 'pod-123',
      status: 'RUNNING',
      uptimeSeconds: 100,
    } as any);
    vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);
    vi.spyOn(runpodModule.runPodService, 'stopPod').mockResolvedValue(undefined);

    balancer = new LoadBalancer({
      minPods: 0,
      maxPods: 3,
      scaleUpThreshold: 5,
      scaleDownThreshold: 1,
      scaleUpCooldown: 100,
      scaleDownCooldown: 100,
      podIdleTimeout: 1000,
      healthCheckInterval: 60000, // Long interval for tests
    });
  });

  afterEach(async () => {
    await balancer.shutdown();
    balancer.removeAllListeners();
    vi.restoreAllMocks();
  });

  describe('Auto-scaling Up', () => {
    it('should scale up when threshold is exceeded', async () => {
      const scaledUpPromise = new Promise((resolve) => {
        balancer.once('scaled-up', resolve);
      });

      // Trigger scale up
      const podId = await balancer.scaleUp();

      expect(podId).toBe('pod-123');
      expect(runpodModule.runPodService.deployPod).toHaveBeenCalled();
      expect(runpodModule.runPodService.waitForPodReady).toHaveBeenCalledWith(
        'pod-123',
        300000
      );

      await scaledUpPromise;

      const metrics = balancer.getMetrics();
      expect(metrics.totalPods).toBe(1);
      expect(metrics.activePods).toBe(1);
    });

    it('should not scale beyond maxPods', async () => {
      // Mock different pod IDs for each deployment
      vi.spyOn(runpodModule.runPodService, 'deployPod')
        .mockResolvedValueOnce('pod-1')
        .mockResolvedValueOnce('pod-2')
        .mockResolvedValueOnce('pod-3');

      // Scale to max
      await balancer.scaleUp(); // pod 1
      await balancer.scaleUp(); // pod 2
      await balancer.scaleUp(); // pod 3

      const metrics1 = balancer.getMetrics();
      expect(metrics1.totalPods).toBe(3);

      // Try to scale one more
      const result = await balancer.scaleUp();
      expect(result).toBeNull();

      const metrics2 = balancer.getMetrics();
      expect(metrics2.totalPods).toBe(3); // Still 3
    });

    it('should respect scale up cooldown', async () => {
      vi.useFakeTimers();

      await balancer.scaleUp();
      const podId2 = await balancer.scaleUp(); // Should be rejected due to cooldown

      // Cooldown is 100ms, but since we just scaled, should return null
      // (unless we advance timers)

      vi.advanceTimersByTime(150); // Advance past cooldown

      const podId3 = await balancer.scaleUp();
      expect(podId3).toBeTruthy();

      vi.useRealTimers();
    });
  });

  describe('Auto-scaling Down', () => {
    it('should scale down idle pods', async () => {
      vi.useFakeTimers();

      // Scale up first
      const podId = await balancer.scaleUp();
      expect(podId).toBeTruthy();

      // Advance time to make pod idle
      vi.advanceTimersByTime(2000); // Beyond podIdleTimeout

      const scaledDownPromise = new Promise((resolve) => {
        balancer.once('scaled-down', resolve);
      });

      // Scale down
      const result = await balancer.scaleDown();

      expect(result).toBe(true);
      expect(runpodModule.runPodService.stopPod).toHaveBeenCalled();

      await scaledDownPromise;

      const metrics = balancer.getMetrics();
      expect(metrics.totalPods).toBe(0);

      vi.useRealTimers();
    });

    it('should not scale below minPods', async () => {
      const balancerWithMin = new LoadBalancer({
        minPods: 1,
        maxPods: 3,
      });

      await balancerWithMin.scaleUp();

      const result = await balancerWithMin.scaleDown();
      expect(result).toBe(false);

      const metrics = balancerWithMin.getMetrics();
      expect(metrics.totalPods).toBe(1);

      await balancerWithMin.shutdown();
    });

    it('should not scale down active pods', async () => {
      await balancer.scaleUp();

      // Pod is recently used (not idle)
      const result = await balancer.scaleDown();
      expect(result).toBe(false);
    });
  });

  describe('Health Checks', () => {
    it('should remove unhealthy pods', async () => {
      await balancer.scaleUp();

      // Make pod unhealthy
      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(
        false
      );

      // Trigger health check manually (since we have long interval)
      await (balancer as any).performHealthChecks();

      const metrics = balancer.getMetrics();
      expect(metrics.totalPods).toBe(0); // Pod removed
    });

    it('should emit event when pod becomes unhealthy', async () => {
      const unhealthyPromise = new Promise((resolve) => {
        balancer.once('pod-unhealthy', resolve);
      });

      await balancer.scaleUp();

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(
        false
      );

      await (balancer as any).performHealthChecks();

      const event = await unhealthyPromise;
      expect(event).toHaveProperty('podId');
    });
  });

  describe('Load Distribution', () => {
    it('should select pod with least active requests', async () => {
      // Deploy multiple pods
      vi.spyOn(runpodModule.runPodService, 'deployPod')
        .mockResolvedValueOnce('pod-1')
        .mockResolvedValueOnce('pod-2');

      await balancer.scaleUp();
      await balancer.scaleUp();

      // Simulate different request loads
      const metrics = balancer.getMetrics();
      const pod1 = metrics.podMetrics.find((p) => p.podId === 'pod-1');
      const pod2 = metrics.podMetrics.find((p) => p.podId === 'pod-2');

      if (pod1) pod1.activeRequests = 5;
      if (pod2) pod2.activeRequests = 2;

      // selectPod should choose pod-2 (less active)
      const selectedPod = await (balancer as any).selectPod();
      expect(selectedPod?.podId).toBe('pod-2');
    });
  });

  describe('Metrics Tracking', () => {
    it('should track pod metrics correctly', async () => {
      await balancer.scaleUp();

      const metrics = balancer.getMetrics();

      expect(metrics.totalPods).toBe(1);
      expect(metrics.activePods).toBe(1);
      expect(metrics.podMetrics).toHaveLength(1);
      expect(metrics.podMetrics[0]).toMatchObject({
        podId: 'pod-123',
        status: 'RUNNING',
        activeRequests: 0,
        totalProcessed: 0,
      });
    });

    it('should calculate total cost', async () => {
      await balancer.scaleUp();

      // Simulate cost accumulation
      const metrics1 = balancer.getMetrics();
      const pod = metrics1.podMetrics[0];
      pod.costAccumulated = 1.5;

      const metrics2 = balancer.getMetrics();
      expect(metrics2.totalCost).toBe(1.5);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxPods: 10,
        scaleUpThreshold: 20,
      };

      balancer.updateConfig(newConfig);

      const config = balancer.getConfig();
      expect(config.maxPods).toBe(10);
      expect(config.scaleUpThreshold).toBe(20);
    });

    it('should emit config-updated event', async () => {
      const configUpdatedPromise = new Promise((resolve) => {
        balancer.once('config-updated', resolve);
      });

      balancer.updateConfig({ maxPods: 10 });

      const config = await configUpdatedPromise;
      expect(config).toHaveProperty('maxPods', 10);
    });
  });

  describe('Shutdown', () => {
    it('should stop all pods on shutdown', async () => {
      vi.spyOn(runpodModule.runPodService, 'deployPod')
        .mockResolvedValueOnce('pod-1')
        .mockResolvedValueOnce('pod-2');

      await balancer.scaleUp();
      await balancer.scaleUp();

      await balancer.shutdown();

      expect(runpodModule.runPodService.stopPod).toHaveBeenCalledTimes(2);

      const metrics = balancer.getMetrics();
      expect(metrics.totalPods).toBe(0);
    });

    it('should clear health check timer on shutdown', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await balancer.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle deployment failures', async () => {
      vi.spyOn(runpodModule.runPodService, 'deployPod').mockRejectedValue(
        new Error('Deployment failed')
      );

      const errorPromise = new Promise((resolve) => {
        balancer.once('scale-error', resolve);
      });

      const podId = await balancer.scaleUp();

      expect(podId).toBeNull();

      const error = await errorPromise;
      expect(error).toMatchObject({
        action: 'up',
        error: expect.any(Error),
      });
    });

    it('should handle scale down failures', async () => {
      vi.useFakeTimers();

      await balancer.scaleUp();

      vi.spyOn(runpodModule.runPodService, 'stopPod').mockRejectedValue(
        new Error('Stop failed')
      );

      vi.advanceTimersByTime(2000);

      const errorPromise = new Promise((resolve) => {
        balancer.once('scale-error', resolve);
      });

      const result = await balancer.scaleDown();

      expect(result).toBe(false);

      const error = await errorPromise;
      expect(error).toMatchObject({
        action: 'down',
        error: expect.any(Error),
      });

      vi.useRealTimers();
    });
  });
});
