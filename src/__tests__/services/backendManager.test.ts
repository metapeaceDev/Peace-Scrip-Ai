/**
 * Backend Manager Integration Tests
 * Tests hybrid backend selection and fallback logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BackendManager } from '../../services/backendManager';
import * as runpodModule from '../../services/runpod';

// Mock fetch globally
global.fetch = vi.fn();

// Mock runpod service
vi.mock('../../services/runpod', () => ({
  runPodService: {
    checkComfyUIHealth: vi.fn(),
    getPodStatus: vi.fn(),
    resumePod: vi.fn(),
    waitForPodReady: vi.fn(),
  },
}));

describe('Backend Manager Integration', () => {
  let manager: BackendManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new BackendManager();

    // Mock environment variables
    import.meta.env.VITE_COMFYUI_LOCAL_URL = 'http://localhost:8188';
    import.meta.env.VITE_COMFYUI_CLOUD_URL = 'https://cloud.example.com';
    import.meta.env.VITE_GEMINI_API_KEY = 'test_gemini_key';
    import.meta.env.VITE_RUNPOD_POD_ID = 'test_pod_123';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Backend Health Checks', () => {
    it('should check local backend health', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const status = await manager.checkBackendHealth('local');

      expect(status.type).toBe('local');
      expect(status.healthy).toBe(true);
      expect(status.available).toBe(true);
      expect(status.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should check cloud backend health', async () => {
      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      const status = await manager.checkBackendHealth('cloud');

      expect(status.type).toBe('cloud');
      expect(status.healthy).toBe(true);
      expect(runpodModule.runPodService.checkComfyUIHealth).toHaveBeenCalled();
    });

    it('should check gemini backend health', async () => {
      const status = await manager.checkBackendHealth('gemini');

      expect(status.type).toBe('gemini');
      expect(status.healthy).toBe(true); // Always healthy if API key exists
    });

    it('should handle unhealthy local backend', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const status = await manager.checkBackendHealth('local');

      expect(status.healthy).toBe(false);
      expect(status.available).toBe(true);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const status = await manager.checkBackendHealth('local');

      expect(status.healthy).toBe(false);
      expect(status.available).toBe(false);
    });
  });

  describe('Backend Selection', () => {
    it('should select local backend when healthy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const backend = await manager.selectBackend();

      expect(backend).toBe('local');
    });

    it('should fallback to cloud when local fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false, // Local unhealthy
      });

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      const backend = await manager.selectBackend();

      expect(backend).toBe('cloud');
    });

    it('should fallback to gemini when all backends fail', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false, // Local unhealthy
      });

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(false);

      const backend = await manager.selectBackend();

      expect(backend).toBe('gemini');
    });

    it('should respect forced backend selection', async () => {
      const backend = await manager.selectBackend('gemini');

      expect(backend).toBe('gemini');
    });

    it('should use preferred backend if set and healthy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      manager.setPreferredBackend('local');
      const backend = await manager.selectBackend();

      expect(backend).toBe('local');
    });
  });

  describe('Execute with Fallback', () => {
    it('should execute operation with local backend', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const operation = vi.fn().mockResolvedValue('success');

      const result = await manager.executeWithFallback(operation);

      expect(result.result).toBe('success');
      expect(result.backend).toBe('local');
      expect(result.cost).toBe(0); // Local is free
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fallback to cloud when local fails', async () => {
      // Mock health checks to all pass (health check happens before operation)
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true }) // Local health check passes
        .mockResolvedValueOnce({ ok: true }) // Cloud health check passes
        .mockResolvedValueOnce({ ok: true }); // Gemini health check passes

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      // Operation fails on local but succeeds on cloud
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Local failed'))
        .mockResolvedValueOnce('success on cloud');

      const result = await manager.executeWithFallback(operation);

      expect(result.result).toBe('success on cloud');
      expect(result.backend).toBe('cloud');
      expect(result.cost).toBe(0.02);
    });

    it('should fallback to gemini when local and cloud fail', async () => {
      // Mock all health checks to pass (health check happens before operation)
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true }) // Local health check passes
        .mockResolvedValueOnce({ ok: true }) // Cloud health check passes
        .mockResolvedValueOnce({ ok: true }); // Gemini health check passes

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      // Operations fail on local and cloud but succeed on gemini
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Local failed'))
        .mockRejectedValueOnce(new Error('Cloud failed'))
        .mockResolvedValueOnce('success on gemini');

      const result = await manager.executeWithFallback(operation);

      expect(result.result).toBe('success on gemini');
      expect(result.backend).toBe('gemini');
      expect(result.cost).toBe(0.5);
    });

    it('should throw error when all backends fail', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(false);

      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(manager.executeWithFallback(operation)).rejects.toThrow('All backends failed');
    });
  });

  describe('Cloud Backend Auto-start', () => {
    it('should return true when cloud is already running', async () => {
      vi.spyOn(runpodModule.runPodService, 'getPodStatus').mockResolvedValue({
        id: 'test_pod_123',
        status: 'RUNNING',
        url: 'https://test.example.com',
        uptime: 300,
        gpuType: 'RTX 3090',
      });

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      const result = await manager.ensureCloudBackendRunning();

      expect(result).toBe(true);
    });

    it('should resume stopped pod', async () => {
      vi.spyOn(runpodModule.runPodService, 'getPodStatus').mockResolvedValue({
        id: 'test_pod_123',
        status: 'EXITED',
        url: 'https://test.example.com',
        uptime: 0,
        gpuType: 'RTX 3090',
      });

      vi.spyOn(runpodModule.runPodService, 'resumePod').mockResolvedValue({
        id: 'test_pod_123',
        status: 'RUNNING',
        url: 'https://test.example.com',
        uptime: 0,
        gpuType: 'RTX 3090',
      });

      vi.spyOn(runpodModule.runPodService, 'waitForPodReady').mockResolvedValue(true);

      const result = await manager.ensureCloudBackendRunning();

      expect(result).toBe(true);
      expect(runpodModule.runPodService.resumePod).toHaveBeenCalled();
    });

    it('should return false when pod ID not configured', async () => {
      import.meta.env.VITE_RUNPOD_POD_ID = '';

      const result = await manager.ensureCloudBackendRunning();

      expect(result).toBe(false);
    });
  });

  describe('Cost Estimation', () => {
    it('should return correct cost for local backend', () => {
      const cost = manager.getCostEstimate('local');
      expect(cost).toBe(0);
    });

    it('should return correct cost for cloud backend', () => {
      const cost = manager.getCostEstimate('cloud');
      expect(cost).toBe(0.02);
    });

    it('should return correct cost for gemini backend', () => {
      const cost = manager.getCostEstimate('gemini');
      expect(cost).toBe(0.5);
    });
  });

  describe('Backend Priority', () => {
    it('should use default priority order', () => {
      const priority = manager.getBackendPriority();
      expect(priority).toEqual(['local', 'cloud', 'gemini']);
    });

    it('should use custom priority from env', () => {
      import.meta.env.VITE_BACKEND_PRIORITY = 'cloud,local,gemini';

      const manager2 = new BackendManager();
      const priority = manager2.getBackendPriority();

      expect(priority).toEqual(['cloud', 'local', 'gemini']);
    });
  });

  describe('All Backend Statuses', () => {
    it('should get statuses for all backends', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      vi.spyOn(runpodModule.runPodService, 'checkComfyUIHealth').mockResolvedValue(true);

      const statuses = await manager.getAllBackendStatuses();

      expect(statuses).toHaveLength(3);
      expect(statuses[0].type).toBe('local');
      expect(statuses[1].type).toBe('cloud');
      expect(statuses[2].type).toBe('gemini');
    });
  });
});

