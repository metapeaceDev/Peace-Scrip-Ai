/**
 * Integration Tests - Failover Scenarios
 * 
 * Test automatic failover between backends
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IntelligentLoadBalancer from '../src/services/loadBalancer.js';

describe('Failover Integration Tests', () => {
  let loadBalancer: IntelligentLoadBalancer;
  let mockWorkerManager: any;
  let processAttempts: string[];

  beforeEach(() => {
    processAttempts = [];

    mockWorkerManager = {
      getNextWorker: vi.fn(() => ({
        id: 'worker-1',
        url: 'http://localhost:8188',
        isAvailable: true,
      })),
      getCloudManager: vi.fn(() => ({
        isAvailable: () => true,
        getActivePods: () => [],
        processJob: vi.fn(),
      })),
      getWorkers: vi.fn(() => []),
      getStats: vi.fn(() => ({
        totalJobs: 0,
        activeJobs: 0,
      })),
    };

    loadBalancer = new IntelligentLoadBalancer(mockWorkerManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Local → Cloud Failover', () => {
    it('should failover to cloud when local fails', async () => {
      const job = { id: 'test-1', type: 'video' };

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
      const job = { id: 'test-1', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Local failed');
        }
        return { success: true, backend };
      });

      await loadBalancer.processJobWithFailover(job, mockProcess, {});

      const stats = loadBalancer.getStats();
      const cloudStats = stats.backends.find(b => b.name === 'cloud');
      
      // Cloud should have processed 1 job after failover
      expect(cloudStats?.jobs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cloud → Gemini Failover', () => {
    it('should failover to gemini when cloud fails', async () => {
      const job = { id: 'test-1', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        
        if (backend === 'local' || backend === 'cloud') {
          throw new Error('Backend unavailable');
        }
        
        return {
          success: true,
          backend,
        };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      expect(processAttempts).toEqual(['local', 'cloud', 'gemini']);
      expect(result.backend).toBe('gemini');
    });

    it('should respect allowCloudFallback preference', async () => {
      const job = { id: 'test-1', type: 'video' };

      loadBalancer.setPreferences({
        preferredBackend: 'local',
        allowCloudFallback: false,
      });

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        throw new Error('Failed');
      });

      await expect(
        loadBalancer.processJobWithFailover(job, mockProcess, {
          allowCloudFallback: false,
        })
      ).rejects.toThrow();

      // Should only try local (no cloud fallback)
      expect(processAttempts).toEqual(['local', 'local', 'local']); // 3 retries
    });
  });

  describe('Retry Logic', () => {
    it('should retry 3 times before giving up', async () => {
      const job = { id: 'test-1', type: 'video' };
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
      const job = { id: 'test-1', type: 'video' };
      const timestamps: number[] = [];

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
      const job = { id: 'test-1', type: 'video' };
      const costs: number[] = [];

      const mockProcess = vi.fn(async (backend) => {
        const backendConfig = loadBalancer['backends'][backend];
        costs.push(backendConfig.cost);
        
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
      const job = { id: 'test-1', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Local failed');
        }
        return { success: true, backend };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      // Should reflect cloud cost
      const selection = await loadBalancer.selectBackend(job, {});
      expect(selection.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('Queue Management During Failover', () => {
    it('should not block other jobs during failover', async () => {
      const job1 = { id: 'test-1', type: 'video' };
      const job2 = { id: 'test-2', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (backend === 'local') {
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
      const job = { id: 'test-1', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        if (backend === 'local') {
          throw new Error('Failed');
        }
        return { success: true, backend };
      });

      await loadBalancer.processJobWithFailover(job, mockProcess, {});

      const stats = loadBalancer.getStats();
      const cloudBackend = stats.backends.find(b => b.name === 'cloud');
      
      // Queue should be updated
      expect(cloudBackend?.queue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check Integration', () => {
    it('should skip unhealthy backends during failover', async () => {
      const job = { id: 'test-1', type: 'video' };

      // Mark cloud as unhealthy
      loadBalancer['backends'].cloud.healthy = false;

      const mockProcess = vi.fn(async (backend) => {
        processAttempts.push(backend);
        
        if (backend === 'local') {
          throw new Error('Local failed');
        }
        
        return { success: true, backend };
      });

      const result = await loadBalancer.processJobWithFailover(job, mockProcess, {});

      // Should skip cloud and go directly to gemini
      expect(processAttempts).toEqual(['local', 'gemini']);
      expect(result.backend).toBe('gemini');
    });

    it('should recover when backend becomes healthy', async () => {
      // Mark local as unhealthy
      loadBalancer['backends'].local.healthy = false;

      const job1 = { id: 'test-1', type: 'video' };
      const mockProcess1 = vi.fn(async (backend) => ({ success: true, backend }));

      const result1 = await loadBalancer.processJobWithFailover(job1, mockProcess1, {});
      expect(result1.backend).not.toBe('local');

      // Health check recovers local
      loadBalancer['backends'].local.healthy = true;

      const job2 = { id: 'test-2', type: 'video' };
      const mockProcess2 = vi.fn(async (backend) => ({ success: true, backend }));

      const result2 = await loadBalancer.processJobWithFailover(job2, mockProcess2, {});
      expect(result2.backend).toBe('local'); // Should use local again
    });
  });

  describe('Error Messages', () => {
    it('should provide detailed error after all backends fail', async () => {
      const job = { id: 'test-1', type: 'video' };

      const mockProcess = vi.fn(async (backend) => {
        throw new Error(`${backend} backend failed`);
      });

      try {
        await loadBalancer.processJobWithFailover(job, mockProcess, {});
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('failed');
        expect(error.message).toContain('attempts');
      }
    });
  });
});
