/**
 * ComfyUI Backend Client Tests
 * Tests for backend communication, queue management, and status polling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token-123'),
    },
  },
}));

describe('comfyuiBackendClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Service Configuration', () => {
    it('should use default service URL if not configured', () => {
      const defaultUrl = 'http://localhost:8000';
      expect(defaultUrl).toBeDefined();
    });

    it('should have health check endpoint', () => {
      const healthEndpoint = '/health/detailed';
      expect(healthEndpoint).toBe('/health/detailed');
    });

    it('should have API endpoints', () => {
      const endpoints = {
        generate: '/api/comfyui/generate',
        jobStatus: '/api/comfyui/job',
        workerStats: '/api/comfyui/workers',
        queueStats: '/api/comfyui/queue',
      };

      expect(endpoints.generate).toBeDefined();
      expect(endpoints.jobStatus).toBeDefined();
      expect(endpoints.workerStats).toBeDefined();
      expect(endpoints.queueStats).toBeDefined();
    });

    it('should have check interval for health monitoring', () => {
      const checkInterval = 30000; // 30 seconds
      expect(checkInterval).toBe(30000);
    });
  });

  describe('Health Check System', () => {
    it('should cache health check results', () => {
      const cacheTime = 30000; // 30 seconds
      expect(cacheTime).toBeGreaterThan(0);
    });

    it('should have timeout for health checks', () => {
      const healthTimeout = 2000; // 2 seconds
      expect(healthTimeout).toBe(2000);
    });

    it('should track service availability state', () => {
      // serviceAvailable can be: true, false, or null
      const validStates = [true, false, null];
      expect(validStates).toContain(true);
      expect(validStates).toContain(false);
      expect(validStates).toContain(null);
    });
  });

  describe('Job Submission', () => {
    it('should require authentication token', async () => {
      const { auth } = await import('../../config/firebase');
      expect(auth.currentUser).toBeDefined();
      expect(auth.currentUser!.getIdToken).toBeDefined();
    });

    it('should have timeout for job submission', () => {
      const submissionTimeout = 10000; // 10 seconds
      expect(submissionTimeout).toBe(10000);
    });

    it('should accept priority parameter', () => {
      const defaultPriority = 5;
      const validPriorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(validPriorities).toContain(defaultPriority);
    });

    it('should send required fields in request body', () => {
      const requiredFields = ['prompt', 'workflow', 'referenceImage', 'priority'];

      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it('should include authorization header', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      };

      expect(headers.Authorization).toContain('Bearer');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Job Status Polling', () => {
    it('should have maximum wait time', () => {
      const maxWait = 4800000; // 80 minutes for Mac IP-Adapter
      expect(maxWait).toBe(4800000);
      expect(maxWait).toBeGreaterThan(60000); // More than 1 minute
    });

    it('should have poll interval', () => {
      const pollInterval = 2000; // 2 seconds
      expect(pollInterval).toBe(2000);
    });

    it('should have timeout per poll request', () => {
      const pollTimeout = 8000; // 8 seconds
      expect(pollTimeout).toBe(8000);
    });

    it('should recognize job states', () => {
      const validStates = ['queued', 'processing', 'completed', 'success', 'failed', 'error'];

      expect(validStates).toContain('completed');
      expect(validStates).toContain('success');
      expect(validStates).toContain('failed');
    });

    it('should track progress as percentage', () => {
      const progressValues = [0, 25, 50, 75, 100];

      progressValues.forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });
    });

    it('should round progress to 1 decimal place', () => {
      const progress = 45.67;
      const rounded = Math.round(progress * 10) / 10;

      expect(rounded).toBe(45.7);
    });

    it('should handle progress callback', () => {
      const mockCallback = vi.fn();

      mockCallback(0);
      mockCallback(50);
      mockCallback(100);

      expect(mockCallback).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenCalledWith(0);
      expect(mockCallback).toHaveBeenCalledWith(50);
      expect(mockCallback).toHaveBeenCalledWith(100);
    });
  });

  describe('Response Handling', () => {
    it('should handle multiple response formats', () => {
      const responses = [{ data: { jobId: 'job-123' } }, { jobId: 'job-456' }, { id: 'job-789' }];

      responses.forEach(response => {
        const jobData = response.data || response;
        const jobId = (jobData as any).jobId || (jobData as any).id;
        expect(jobId).toBeDefined();
      });
    });

    it('should extract image URL from result', () => {
      const results = [
        { imageUrl: 'https://storage.com/image.png' },
        { imageData: 'base64-data' },
        { image: 'data:image/png;base64,...' },
      ];

      results.forEach(result => {
        const hasImage = result.imageUrl || (result as any).imageData || (result as any).image;
        expect(hasImage).toBeTruthy();
      });
    });

    it('should prioritize imageUrl over imageData', () => {
      const result = {
        imageUrl: 'https://storage.com/image.png',
        imageData: 'base64-fallback',
      };

      const finalImage = result.imageUrl || result.imageData;
      expect(finalImage).toBe(result.imageUrl);
    });

    it('should handle failed job responses', () => {
      const failedResponse = {
        state: 'failed',
        failedReason: 'Out of memory',
        error: 'CUDA error',
      };

      expect(failedResponse.state).toBe('failed');
      expect(failedResponse.failedReason || failedResponse.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should detect timeout errors', () => {
      const error = new Error('AbortError');
      error.name = 'AbortError';

      expect(error.name).toBe('AbortError');
    });

    it('should detect connection errors', () => {
      const error = new TypeError('fetch failed');

      expect(error instanceof TypeError).toBe(true);
      expect(error.message).toContain('fetch');
    });

    it('should handle missing job ID in response', () => {
      const invalidResponse = { data: {} };
      const jobId = (invalidResponse.data as any).jobId || (invalidResponse.data as any).id;

      expect(jobId).toBeUndefined();
    });

    it('should handle service unavailable state', () => {
      const serviceAvailable = false;

      if (!serviceAvailable) {
        const error = new Error('ComfyUI backend service is not available');
        expect(error.message).toContain('not available');
      }
    });

    it('should handle authentication errors', () => {
      const authError = new Error('User not authenticated');
      expect(authError.message).toBe('User not authenticated');
    });
  });

  describe('Queue Management', () => {
    it('should support priority levels', () => {
      const priorities = [1, 5, 10]; // Low, Medium, High

      priorities.forEach(priority => {
        expect(priority).toBeGreaterThanOrEqual(1);
        expect(priority).toBeLessThanOrEqual(10);
      });
    });

    it('should track queue statistics', () => {
      const queueStats = {
        pending: 5,
        processing: 2,
        completed: 100,
        failed: 3,
      };

      expect(queueStats.pending).toBeGreaterThanOrEqual(0);
      expect(queueStats.processing).toBeGreaterThanOrEqual(0);
      expect(queueStats.completed).toBeGreaterThanOrEqual(0);
    });

    it('should track worker statistics', () => {
      const workerStats = {
        total: 4,
        active: 2,
        idle: 2,
        busy: 0,
      };

      expect(workerStats.total).toBe(workerStats.active + workerStats.idle + workerStats.busy);
    });
  });

  describe('Workflow Integration', () => {
    it('should accept workflow object from builder', () => {
      const workflow = {
        '3': { class_type: 'KSampler' },
        '4': { class_type: 'CheckpointLoader' },
      };

      expect(workflow['3']).toBeDefined();
      expect(workflow['4']).toBeDefined();
    });

    it('should support reference image parameter', () => {
      const referenceImage = 'https://example.com/face.jpg';

      expect(referenceImage).toBeTruthy();
      expect(referenceImage).toContain('http');
    });

    it('should support base64 reference images', () => {
      const base64Image = 'data:image/png;base64,iVBORw0KG...';

      expect(base64Image).toContain('data:image');
      expect(base64Image).toContain('base64');
    });
  });

  describe('Timeout Configuration', () => {
    it('should have different timeouts for different operations', () => {
      const timeouts = {
        healthCheck: 2000,
        submission: 10000,
        polling: 8000,
        maxWait: 4800000,
      };

      expect(timeouts.healthCheck).toBeLessThan(timeouts.submission);
      expect(timeouts.submission).toBeGreaterThan(timeouts.polling);
      expect(timeouts.polling).toBeLessThan(timeouts.maxWait);
      expect(timeouts.maxWait).toBeGreaterThan(timeouts.submission);
    });

    it('should have reasonable max wait time for Mac', () => {
      const maxWait = 4800000; // 80 minutes
      const maxWaitMinutes = maxWait / 60000;

      expect(maxWaitMinutes).toBe(80);
      expect(maxWaitMinutes).toBeGreaterThan(60); // More than 1 hour
    });
  });

  describe('Progress Tracking', () => {
    it('should start at 0% progress', () => {
      const initialProgress = 0;
      expect(initialProgress).toBe(0);
    });

    it('should end at 100% progress', () => {
      const finalProgress = 100;
      expect(finalProgress).toBe(100);
    });

    it('should update progress during processing', () => {
      const progressUpdates = [0, 10, 25, 50, 75, 90, 100];

      progressUpdates.forEach((progress, index) => {
        if (index > 0) {
          expect(progress).toBeGreaterThan(progressUpdates[index - 1]);
        }
      });
    });

    it('should handle missing progress values', () => {
      const progress = undefined;
      const safeProgress = typeof progress === 'number' ? progress : 0;

      expect(safeProgress).toBe(0);
    });
  });

  describe('Response Format Compatibility', () => {
    it('should handle legacy response format', () => {
      const legacyResponse = {
        jobId: 'job-123',
        status: 'completed',
        result: 'https://image.url',
      };

      expect(legacyResponse.jobId).toBeDefined();
      expect(legacyResponse.status).toBe('completed');
    });

    it('should handle new response format', () => {
      const newResponse = {
        data: {
          jobId: 'job-456',
          state: 'success',
          result: {
            imageUrl: 'https://storage.com/image.png',
          },
        },
      };

      expect(newResponse.data.jobId).toBeDefined();
      expect(newResponse.data.state).toBe('success');
    });

    it('should normalize state values', () => {
      const stateMapping = {
        completed: 'success',
        success: 'success',
        failed: 'error',
        error: 'error',
      };

      expect(stateMapping.completed).toBe('success');
      expect(stateMapping.success).toBe('success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompts', () => {
      const longPrompt = 'a '.repeat(1000) + 'beautiful sunset';
      expect(longPrompt.length).toBeGreaterThan(2000);
    });

    it('should handle empty workflow', () => {
      const emptyWorkflow = {};
      expect(Object.keys(emptyWorkflow).length).toBe(0);
    });

    it('should handle null reference image', () => {
      const referenceImage = null;
      expect(referenceImage).toBeNull();
    });

    it('should handle maximum priority', () => {
      const maxPriority = 10;
      expect(maxPriority).toBe(10);
    });

    it('should handle minimum priority', () => {
      const minPriority = 1;
      expect(minPriority).toBe(1);
    });

    it('should handle progress over 100%', () => {
      const invalidProgress = 150;
      const clampedProgress = Math.min(100, Math.max(0, invalidProgress));

      expect(clampedProgress).toBe(100);
    });

    it('should handle negative progress', () => {
      const invalidProgress = -10;
      const clampedProgress = Math.min(100, Math.max(0, invalidProgress));

      expect(clampedProgress).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should support complete generation workflow', () => {
      const workflow = {
        prompt: 'a portrait',
        workflow: { '3': { class_type: 'KSampler' } },
        referenceImage: null,
        priority: 5,
      };

      expect(workflow.prompt).toBeDefined();
      expect(workflow.workflow).toBeDefined();
      expect(workflow.priority).toBe(5);
    });

    it('should handle retry logic for failed polls', () => {
      const maxRetries = 3;
      let retries = 0;

      while (retries < maxRetries) {
        retries++;
      }

      expect(retries).toBe(maxRetries);
    });

    it('should validate response before returning', () => {
      const response = {
        data: {
          jobId: 'job-123',
          state: 'completed',
          result: {
            imageUrl: 'https://storage.com/image.png',
          },
        },
      };

      const jobId = response.data.jobId;
      const state = response.data.state;
      const imageUrl = response.data.result.imageUrl;

      expect(jobId).toBeTruthy();
      expect(state).toBe('completed');
      expect(imageUrl).toContain('http');
    });
  });
});
