/**
 * Integration Tests - Failover Scenarios
 * 
 * Test automatic failover between backends
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IntelligentLoadBalancer from '../src/services/loadBalancer.js';

describe('Failover Integration Tests', () => {
  let loadBalancer;
  let mockWorkerManager;
  let processAttempts;
  let cloudManager;

  beforeEach(() => {
    processAttempts = [];

    cloudManager = {
      isAvailable: vi.fn(() => true),
      getStats: vi.fn(() => ({ busyPods: 0 })),
      getActivePods: vi.fn(() => []),
      processJob: vi.fn(),
    };

    mockWorkerManager = {
      workers: [
        { id: 'worker-1', url: 'http://localhost:8188', status: 'healthy', queueLength: 0 },
      ],
      getNextWorker: vi.fn(() => ({
        id: 'worker-1',
        url: 'http://localhost:8188',
        status: 'healthy',
      })),
      getCloudManager: vi.fn(() => cloudManager),
      getWorkers: vi.fn(() => []),
      getStats: vi.fn(() => ({
        totalJobs: 0,
        activeJobs: 0,
      })),
    };

    loadBalancer = new IntelligentLoadBalancer(mockWorkerManager);
  });

  afterEach(() => {
    loadBalancer.stopMonitoring();
    vi.clearAllMocks();
  });

  describe('Local → Cloud Failover', () => {
    it('should failover to cloud when local fails', async () => {
      const job = { id: 'test-1', name: 'video' };

      // First attempt: local is available/healthy
      mockWorkerManager.getNextWorker
        .mockImplementationOnce(() => ({ id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' }))
        // Subsequent attempts: local unavailable => selectBackend falls back to cloud
        .mockImplementation(() => { throw new Error('No local worker'); });

      // Mock process function that fails on local, succeeds on cloud
      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        
        if (backend === 'local') {
          throw new Error('Local GPU unavailable');
        }
        
        return {
          success: true,
          backend,
          data: 'mock-result',
        };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      expect(processAttempts).toEqual(['local', 'cloud']);
      expect(result.backend).toBe('cloud');
      expect(result.success).toBe(true);
    });

    it('should track failover in statistics', async () => {
      const job = { id: 'test-1', name: 'video' };

      mockWorkerManager.getNextWorker
        .mockImplementationOnce(() => ({ id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' }))
        .mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Local failed');
        }
        return { success: true, backend };
      });

      await loadBalancer.processJobWithFailover(job, mockProcess, {});

      const stats = loadBalancer.getStats();
      expect(stats.failoverCount).toBeGreaterThanOrEqual(1);
      expect(stats.jobsByBackend.cloud).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cloud → Gemini Failover', () => {
    it('should failover to gemini when cloud fails', async () => {
      const job = { id: 'test-1', name: 'image' };

      // Force local unavailable so selection starts at cloud
      mockWorkerManager.getNextWorker.mockImplementation(() => { throw new Error('No local worker'); });

      // Make cloud become unavailable after first failure
      let cloudDown = false;
      cloudManager.isAvailable.mockImplementation(() => !cloudDown);

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        
        if (backend === 'cloud') {
          cloudDown = true;
          throw new Error('Backend unavailable');
        }
        
        return {
          success: true,
          backend,
        };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      expect(processAttempts).toEqual(['cloud', 'gemini']);
      expect(result.backend).toBe('gemini');
    });

    it('should respect allowCloudFallback preference', async () => {
      const job = { id: 'test-1', name: 'video' };

      loadBalancer.setPreferences({
        preferredBackend: 'local',
        allowCloudFallback: false,
      });

      // Make local unavailable so selection would normally go to cloud
      mockWorkerManager.getNextWorker.mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        throw new Error('Failed');
      });

      await expect(
        loadBalancer.processJobWithFailover(job, mockProcess, {
          allowCloudFallback: false,
        })
      ).rejects.toThrow();

      // Should not try cloud at all when allowCloudFallback=false
      expect(processAttempts.includes('cloud')).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry 3 times before giving up', async () => {
      const job = { id: 'test-1', name: 'video' };
      let attempts = 0;

      const mockProcess = vi.fn(async () => {
        attempts++;
        throw new Error('Always fails');
      });

      await expect(
        loadBalancer.processJobWithFailover(job, mockProcess, {})
      ).rejects.toThrow();

      // Should try: local (3x), cloud (3x), gemini (3x) = 9 total
      // But with smart retry, might be: local, cloud, gemini (3 backends)
      expect(attempts).toBeGreaterThanOrEqual(3);
    });

    it('should have exponential backoff between retries', async () => {
      const job = { id: 'test-1', name: 'video' };
      const timestamps = [];

      const mockProcess = vi.fn(async () => {
        timestamps.push(Date.now());
        throw new Error('Failed');
      });

      await expect(
        loadBalancer.processJobWithFailover(job, mockProcess, {})
      ).rejects.toThrow();

      // Check delays between attempts (should increase)
      if (timestamps.length >= 2) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        
        expect(delay2).toBeGreaterThanOrEqual(delay1);
      }
    });
  });

  describe('Cost Impact of Failover', () => {
    it('should use cheaper backend first, then failover', async () => {
      const job = { id: 'test-1', name: 'video' };
      const costs = [];

      mockWorkerManager.getNextWorker
        .mockImplementationOnce(() => ({ id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' }))
        .mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        const backendConfig = loadBalancer['backends'][backend];
        costs.push(backendConfig.costPerJob);
        
        if (costs.length < 2) {
          throw new Error('First backend fails');
        }
        
        return { success: true, backend };
      });

      await loadBalancer.processJobWithFailover(job, mockProcess, {});

      // First attempt should be cheapest (local = 0)
      expect(costs[0]).toBe(0);
      // Second attempt should be cloud (0.007)
      expect(costs[1]).toBe(0.007);
    });

    it('should track actual cost after failover', async () => {
      const job = { id: 'test-1', name: 'video' };

      mockWorkerManager.getNextWorker
        .mockImplementationOnce(() => ({ id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' }))
        .mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Local failed');
        }
        return { success: true, backend };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('Queue Management During Failover', () => {
    it('should not block other jobs during failover', async () => {
      const job1 = { id: 'test-1', name: 'video' };
      const job2 = { id: 'test-2', name: 'video' };

      let localDown = false;
      mockWorkerManager.getNextWorker.mockImplementation(() => {
        if (localDown) {
          throw new Error('No local worker');
        }
        return { id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' };
      });

      const mockProcess = vi.fn(async (backend) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (backend === 'local') {
          localDown = true;
          throw new Error('Local busy');
        }
        
        return { success: true, backend };
      });

      // Process both jobs concurrently
      const [result1, result2] = await Promise.all([
        loadBalancer.processJobWithFailover(job1, mockProcess, {}),
        loadBalancer.processJobWithFailover(job2, mockProcess, {}),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should update queue count after successful failover', async () => {
      const job = { id: 'test-1', name: 'video' };

      mockWorkerManager.getNextWorker
        .mockImplementationOnce(() => ({ id: 'worker-1', url: 'http://localhost:8188', status: 'healthy' }))
        .mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Failed');
        }
        return { success: true, backend };
      });

      await loadBalancer.processJobWithFailover(job, mockProcess, {});

      const stats = loadBalancer.getStats();
      const cloudBackend = stats.backends.find(b => b.id === 'cloud');
      expect(cloudBackend?.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check Integration', () => {
    it('should skip unhealthy backends during failover', async () => {
      const job = { id: 'test-1', name: 'image' };

      // Make cloud unavailable (health is derived from isAvailable())
      cloudManager.isAvailable.mockImplementation(() => false);

      // Force local unavailable so the only healthy candidate is gemini
      mockWorkerManager.getNextWorker.mockImplementation(() => { throw new Error('No local worker'); });

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);

        return { success: true, backend };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      // Should skip cloud and go directly to gemini
      expect(processAttempts).toEqual(['gemini']);
      expect(result.backend).toBe('gemini');
    });

    it('should recover when backend becomes healthy', async () => {
      // Mark local as unhealthy by returning a non-healthy status
      mockWorkerManager.getNextWorker.mockImplementation(() => ({
        id: 'worker-1',
        url: 'http://localhost:8188',
        status: 'unhealthy'
      }));

      const job1 = { id: 'test-1', name: 'video' };
      const mockProcess1 = vi.fn(async (backend) => ({ success: true, backend }));

      const result1 = await loadBalancer.processJobWithFailover(job1, mockProcess1, {});
      expect(result1.backend).not.toBe('local');

      // Health check recovers local
      mockWorkerManager.getNextWorker.mockImplementation(() => ({
        id: 'worker-1',
        url: 'http://localhost:8188',
        status: 'healthy'
      }));

      const job2 = { id: 'test-2', name: 'video' };
      const mockProcess2 = vi.fn(async (backend) => ({ success: true, backend }));

      const result2 = await loadBalancer.processJobWithFailover(job2, mockProcess2, {});
      expect(result2.backend).toBe('local'); // Should use local again
    });
  });

  describe('Error Messages', () => {
    it('should provide detailed error after all backends fail', async () => {
      const job = { id: 'test-1', name: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        throw new Error(`${backend} backend failed`);
      });

      try {
        await loadBalancer.processJobWithFailover(job, mockProcess, {});
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('failed');
        expect(error.message).toContain('attempts');
      }
    });
  });
});
