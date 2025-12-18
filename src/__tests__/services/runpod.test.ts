/**
 * RunPod Service Integration Tests
 * Tests RunPod API integration and pod management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RunPodService } from '../../services/runpod';

// Mock fetch globally
global.fetch = vi.fn();

describe('RunPod Service Integration', () => {
  let service: RunPodService;
  const mockApiKey = 'test_api_key_123';
  const mockPodId = 'test_pod_123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RunPodService(mockApiKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pod Deployment', () => {
    it('should deploy a new pod successfully', async () => {
      const mockResponse = {
        data: {
          podFindAndDeployOnDemand: {
            id: mockPodId,
            desiredStatus: 'PENDING',
            imageName: 'peace-comfyui:latest',
            machineId: 'machine_123',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.deployPod({
        gpuType: 'NVIDIA RTX 3090',
        imageName: 'peace-comfyui:latest',
      });

      expect(result.id).toBe(mockPodId);
      expect(result.status).toBe('PENDING');
      expect(result.url).toContain(mockPodId);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle deployment errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(service.deployPod()).rejects.toThrow('RunPod API error');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'Invalid GPU type' }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(service.deployPod()).rejects.toThrow('RunPod GraphQL error');
    });
  });

  describe('Pod Status', () => {
    it('should get pod status successfully', async () => {
      const mockResponse = {
        data: {
          pod: {
            id: mockPodId,
            desiredStatus: 'RUNNING',
            runtime: {
              uptimeInSeconds: 300,
              ports: [
                {
                  ip: '1.2.3.4',
                  isIpPublic: true,
                  privatePort: 8188,
                  publicPort: 8188,
                  type: 'http',
                },
              ],
              gpus: [
                {
                  id: 'gpu_1',
                  gpuUtilPercent: 75,
                  memoryUtilPercent: 60,
                },
              ],
            },
            machine: {
              gpuDisplayName: 'NVIDIA RTX 3090',
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getPodStatus(mockPodId);

      expect(result.id).toBe(mockPodId);
      expect(result.status).toBe('RUNNING');
      expect(result.uptime).toBe(300);
      expect(result.gpuType).toBe('NVIDIA RTX 3090');
    });

    it('should handle pod not found', async () => {
      const mockResponse = {
        data: {
          pod: null,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(service.getPodStatus(mockPodId)).rejects.toThrow();
    });
  });

  describe('Pod Management', () => {
    it('should stop a pod', async () => {
      const mockResponse = {
        data: {
          podStop: {
            id: mockPodId,
            desiredStatus: 'EXITED',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.stopPod(mockPodId);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it('should resume a pod', async () => {
      const mockResponse = {
        data: {
          podResume: {
            id: mockPodId,
            desiredStatus: 'RUNNING',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.resumePod(mockPodId);

      expect(result.id).toBe(mockPodId);
      expect(result.status).toBe('RUNNING');
    });

    it('should terminate a pod', async () => {
      const mockResponse = {
        data: {
          podTerminate: {
            id: mockPodId,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.terminatePod(mockPodId);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('GPU Utilization', () => {
    it('should get GPU utilization metrics', async () => {
      const mockStatusResponse = {
        data: {
          pod: {
            id: mockPodId,
            desiredStatus: 'RUNNING',
            runtime: {
              uptimeInSeconds: 300,
            },
            machine: {
              gpuDisplayName: 'NVIDIA RTX 3090',
            },
          },
        },
      };

      const mockUtilResponse = {
        data: {
          pod: {
            runtime: {
              gpus: [
                {
                  gpuUtilPercent: 85,
                  memoryUtilPercent: 70,
                },
              ],
            },
          },
        },
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUtilResponse,
        });

      const result = await service.getGpuUtilization(mockPodId);

      expect(result.gpuPercent).toBe(85);
      expect(result.memoryPercent).toBe(70);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for on-demand pricing', () => {
      const uptimeSeconds = 3600; // 1 hour
      const cost = service.calculateCost(uptimeSeconds, 0.34);

      expect(cost).toBe(0.34);
    });

    it('should calculate cost for spot pricing', () => {
      const uptimeSeconds = 1800; // 30 minutes
      const cost = service.calculateCost(uptimeSeconds, 0.24);

      expect(cost).toBeCloseTo(0.12);
    });

    it('should calculate cost for short video generation', () => {
      const uptimeSeconds = 45; // 45 seconds
      const cost = service.calculateCost(uptimeSeconds, 0.34);

      expect(cost).toBeLessThan(0.01); // Less than $0.01
      expect(cost).toBeCloseTo(0.00425, 5);
    });
  });

  describe('Health Checks', () => {
    it('should check ComfyUI health successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await service.checkComfyUIHealth(mockPodId);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/system_stats'),
        expect.any(Object)
      );
    });

    it('should handle unhealthy ComfyUI', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const result = await service.checkComfyUIHealth(mockPodId);

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkComfyUIHealth(mockPodId);

      expect(result).toBe(false);
    });
  });

  describe('List Pods', () => {
    it('should list all pods', async () => {
      const mockResponse = {
        data: {
          myself: {
            pods: [
              {
                id: 'pod_1',
                desiredStatus: 'RUNNING',
                runtime: {
                  uptimeInSeconds: 600,
                },
                machine: {
                  gpuDisplayName: 'NVIDIA RTX 3090',
                },
              },
              {
                id: 'pod_2',
                desiredStatus: 'EXITED',
                runtime: null,
                machine: {
                  gpuDisplayName: 'NVIDIA RTX 3080',
                },
              },
            ],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.listPods();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('RUNNING');
      expect(result[1].status).toBe('EXITED');
    });

    it('should handle empty pod list', async () => {
      const mockResponse = {
        data: {
          myself: {
            pods: [],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.listPods();

      expect(result).toHaveLength(0);
    });
  });
});
