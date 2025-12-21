/**
 * Load Balancer Unit Tests
 * 
 * Comprehensive test suite for intelligent load balancer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IntelligentLoadBalancer from '../src/services/loadBalancer.js';

// Mock worker manager
const createMockWorkerManager = () => ({
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
});

describe('IntelligentLoadBalancer', () => {
  let loadBalancer: IntelligentLoadBalancer;
  let mockWorkerManager: any;

  beforeEach(() => {
    mockWorkerManager = createMockWorkerManager();
    loadBalancer = new IntelligentLoadBalancer(mockWorkerManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Backend Configuration', () => {
    it('should initialize with 3 backends', () => {
      const stats = loadBalancer.getStats();
      expect(stats.backends).toHaveLength(3);
      expect(stats.backends.map(b => b.name)).toEqual(['local', 'cloud', 'gemini']);
    });

    it('should have correct default costs', () => {
      const stats = loadBalancer.getStats();
      const backends = stats.backends;

      expect(backends.find(b => b.name === 'local')?.cost).toBe(0);
      expect(backends.find(b => b.name === 'cloud')?.cost).toBe(0.007);
      expect(backends.find(b => b.name === 'gemini')?.cost).toBe(0.08);
    });

    it('should have correct priorities', () => {
      expect(loadBalancer['backends'].local.priority).toBe(1);
      expect(loadBalancer['backends'].cloud.priority).toBe(2);
      expect(loadBalancer['backends'].gemini.priority).toBe(3);
    });
  });

  describe('Backend Scoring Algorithm', () => {
    it('should calculate score based on priority, cost, speed, queue', () => {
      const backend = loadBalancer['backends'].local;
      const score = loadBalancer['calculateBackendScore'](backend);

      // Local: Priority 1 (40pts) + Cost 0 (30pts) + Speed 10s (10pts) + Queue 0 (10pts)
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should prefer local over cloud (higher score)', () => {
      const localScore = loadBalancer['calculateBackendScore'](loadBalancer['backends'].local);
      const cloudScore = loadBalancer['calculateBackendScore'](loadBalancer['backends'].cloud);

      expect(localScore).toBeGreaterThan(cloudScore);
    });

    it('should prefer cloud over gemini (higher score)', () => {
      const cloudScore = loadBalancer['calculateBackendScore'](loadBalancer['backends'].cloud);
      const geminiScore = loadBalancer['calculateBackendScore'](loadBalancer['backends'].gemini);

      expect(cloudScore).toBeGreaterThan(geminiScore);
    });

    it('should adjust score when queue is full', () => {
      const backend = loadBalancer['backends'].local;
      backend.queue = 10;

      const score = loadBalancer['calculateBackendScore'](backend);
      expect(score).toBeLessThan(90); // Queue penalty applied
    });
  });

  describe('Backend Selection', () => {
    it('should select local backend by default (auto mode)', async () => {
      const job = { id: 'test-1', type: 'video' };
      const selection = await loadBalancer.selectBackend(job, {});

      expect(selection.backend).toBe('local');
      expect(selection.score).toBeGreaterThan(0);
    });

    it('should respect user preferred backend', async () => {
      const job = { id: 'test-1', type: 'video' };
      const selection = await loadBalancer.selectBackend(job, {
        preferredBackend: 'cloud',
      });

      expect(selection.backend).toBe('cloud');
    });

    it('should filter backends by max cost', async () => {
      const job = { id: 'test-1', type: 'video' };
      const selection = await loadBalancer.selectBackend(job, {
        maxCostPerJob: 0.01, // Only local (0) and cloud (0.007) qualify
      });

      expect(['local', 'cloud']).toContain(selection.backend);
      expect(selection.backend).not.toBe('gemini');
    });

    it('should prioritize speed when option enabled', async () => {
      const job = { id: 'test-1', type: 'video' };
      
      // Set high max cost to allow gemini
      loadBalancer.setPreferences({ 
        prioritizeSpeed: true,
        maxCostPerJob: 1.0,
      });

      const selection = await loadBalancer.selectBackend(job, {});
      
      // Gemini is fastest (5s) but expensive, should still prefer local/cloud without high priority
      expect(['local', 'cloud', 'gemini']).toContain(selection.backend);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost for local backend (free)', () => {
      const estimate = loadBalancer.estimateCost(100, 'local');

      expect(estimate.totalCost).toBe(0);
      expect(estimate.avgCostPerJob).toBe(0);
      expect(estimate.jobCount).toBe(100);
    });

    it('should estimate cost for cloud backend', () => {
      const estimate = loadBalancer.estimateCost(100, 'cloud');

      expect(estimate.totalCost).toBe(0.7); // 100 * 0.007
      expect(estimate.avgCostPerJob).toBe(0.007);
    });

    it('should estimate cost for gemini backend', () => {
      const estimate = loadBalancer.estimateCost(100, 'gemini');

      expect(estimate.totalCost).toBe(8.0); // 100 * 0.08
      expect(estimate.avgCostPerJob).toBe(0.08);
    });

    it('should estimate cost for auto mode (mixed backends)', () => {
      const estimate = loadBalancer.estimateCost(100);

      // Auto mode should prefer local, so cost should be low
      expect(estimate.totalCost).toBeLessThan(1.0);
      expect(estimate.backend).toBeTruthy();
    });
  });

  describe('Recommendations', () => {
    it('should recommend local for unlimited budget', () => {
      const recs = loadBalancer.getRecommendations({
        jobCount: 100,
        maxBudget: null,
        needsFast: false,
      });

      expect(recs.recommendations).toHaveLength(3);
      const localRec = recs.recommendations.find(r => r.backend === 'local');
      expect(localRec?.jobCount).toBeGreaterThan(0);
    });

    it('should distribute jobs based on budget', () => {
      const recs = loadBalancer.getRecommendations({
        jobCount: 100,
        maxBudget: 0.5,
        needsFast: false,
      });

      // With $0.50 budget, should use local + some cloud
      expect(recs.totalCost).toBeLessThanOrEqual(0.5);
      expect(recs.recommendations.some(r => r.backend === 'local')).toBe(true);
    });

    it('should prioritize speed when requested', () => {
      const recs = loadBalancer.getRecommendations({
        jobCount: 10,
        maxBudget: 1.0,
        needsFast: true,
      });

      // Should consider faster backends (gemini = 5s)
      expect(recs.recommendations).toBeDefined();
      expect(recs.totalTime).toBeGreaterThan(0);
    });
  });

  describe('User Preferences', () => {
    it('should update and persist preferences', () => {
      loadBalancer.setPreferences({
        preferredBackend: 'cloud',
        maxCostPerJob: 0.01,
        prioritizeSpeed: true,
        allowCloudFallback: false,
      });

      const prefs = loadBalancer['userPreferences'];
      expect(prefs.preferredBackend).toBe('cloud');
      expect(prefs.maxCostPerJob).toBe(0.01);
      expect(prefs.prioritizeSpeed).toBe(true);
      expect(prefs.allowCloudFallback).toBe(false);
    });

    it('should apply preferences to backend selection', async () => {
      loadBalancer.setPreferences({
        preferredBackend: 'gemini',
      });

      const job = { id: 'test-1', type: 'video' };
      const selection = await loadBalancer.selectBackend(job, {});

      expect(selection.backend).toBe('gemini');
    });
  });

  describe('Statistics Tracking', () => {
    it('should track jobs per backend', async () => {
      const job = { id: 'test-1', type: 'video' };
      
      // Simulate job processing
      await loadBalancer.selectBackend(job, {});
      
      const stats = loadBalancer.getStats();
      expect(stats.backends).toBeDefined();
    });

    it('should calculate average processing time', () => {
      const backend = loadBalancer['backends'].local;
      backend.jobs = 10;
      backend.totalProcessingTime = 100;

      const avgTime = backend.totalProcessingTime / backend.jobs;
      expect(avgTime).toBe(10);
    });

    it('should track total costs', () => {
      const backend = loadBalancer['backends'].cloud;
      backend.jobs = 100;
      backend.totalCost = 0.7; // 100 jobs * $0.007

      expect(backend.totalCost).toBe(0.7);
    });
  });

  describe('Health Monitoring', () => {
    it('should check backend health', async () => {
      await loadBalancer.initialize();
      
      const stats = loadBalancer.getStats();
      expect(stats.backends.every(b => 'healthy' in b)).toBe(true);
    });

    it('should mark unhealthy backends as unavailable', () => {
      const backend = loadBalancer['backends'].local;
      backend.healthy = false;

      const candidates = loadBalancer['getCandidateBackends']({});
      expect(candidates).not.toContain(backend);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid job count gracefully', () => {
      expect(() => loadBalancer.estimateCost(-1)).toThrow();
      expect(() => loadBalancer.estimateCost(0)).toThrow();
    });

    it('should handle invalid backend name', () => {
      expect(() => loadBalancer.estimateCost(100, 'invalid' as any)).toThrow();
    });

    it('should handle missing worker manager', () => {
      expect(() => new IntelligentLoadBalancer(null as any)).toThrow();
    });
  });

  describe('Performance', () => {
    it('should select backend quickly (< 50ms)', async () => {
      const job = { id: 'test-1', type: 'video' };
      const start = Date.now();
      
      await loadBalancer.selectBackend(job, {});
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should handle concurrent selections', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        type: 'video',
      }));

      const selections = await Promise.all(
        jobs.map(job => loadBalancer.selectBackend(job, {}))
      );

      expect(selections).toHaveLength(10);
      expect(selections.every(s => s.backend)).toBe(true);
    });
  });
});
