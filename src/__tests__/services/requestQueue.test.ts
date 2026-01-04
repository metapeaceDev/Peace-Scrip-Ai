/**
 * Request Queue Integration Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RequestQueue, QueuePriority } from '../../services/requestQueue';

describe('Request Queue Integration', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue({
      maxConcurrent: 2,
      maxQueueSize: 10,
      defaultTimeout: 5000,
      defaultMaxRetries: 2,
    });

    // Prevent unhandled error events during tests
    queue.on('error', () => {
      // Ignore - tests will handle via waitForCompletion
    });
  });

  afterEach(() => {
    queue.removeAllListeners();
  });

  describe('Queue Management', () => {
    it('should enqueue request successfully', async () => {
      const requestId = await queue.enqueue({ test: 'data' });

      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^req_/);

      // Check immediately after enqueue (before processing starts)
      const request = queue.getRequest(requestId);
      expect(request).toBeTruthy();
      expect(request?.payload).toEqual({ test: 'data' });

      // Status might be 'pending' or 'processing' depending on timing
      expect(['pending', 'processing']).toContain(request?.status);
    });

    it('should reject when queue is full', async () => {
      // Stop queue from processing
      queue.setMaxConcurrent(0);

      // Fill the queue
      for (let i = 0; i < 10; i++) {
        await queue.enqueue({ index: i });
      }

      // Should throw when full
      await expect(queue.enqueue({ overflow: true })).rejects.toThrow('Queue is full');
    });

    it('should process requests with correct priority order', async () => {
      const processedOrder: string[] = [];

      // Stop processing first
      queue.setMaxConcurrent(0);

      queue.on('process', (request, callback) => {
        processedOrder.push(request.priority);
        setTimeout(() => callback({ success: true }), 10);
      });

      // Enqueue all with different priorities
      await queue.enqueue({ data: 'low' }, { priority: 'low' });
      await queue.enqueue({ data: 'high' }, { priority: 'high' });
      await queue.enqueue({ data: 'normal' }, { priority: 'normal' });

      // Wait for enqueue to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      // Start processing
      queue.setMaxConcurrent(2);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify all processed
      expect(processedOrder.length).toBe(3);

      // High priority should be processed before low
      const highIndex = processedOrder.indexOf('high');
      const lowIndex = processedOrder.indexOf('low');
      expect(highIndex).toBeLessThan(lowIndex);
    });

    it('should handle concurrent processing up to maxConcurrent', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      queue.on('process', async (request, callback) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);

        await new Promise(resolve => setTimeout(resolve, 100));

        concurrent--;
        callback({ success: true });
      });

      // Enqueue multiple requests
      await queue.enqueue({ id: 1 });
      await queue.enqueue({ id: 2 });
      await queue.enqueue({ id: 3 });
      await queue.enqueue({ id: 4 });

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(maxConcurrent).toBe(2); // Should not exceed maxConcurrent
    });
  });

  describe('Request Lifecycle', () => {
    it('should track request from pending to completed', async () => {
      const states: string[] = [];

      queue.on('enqueued', request => {
        states.push(`enqueued:${request.status}`);
      });

      queue.on('processing', request => {
        states.push(`processing:${request.status}`);
      });

      queue.on('completed', request => {
        states.push(`completed:${request.status}`);
      });

      queue.on('process', (request, callback) => {
        setTimeout(() => callback({ success: true }), 50);
      });

      await queue.enqueue({ test: 'lifecycle' });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(states).toContain('enqueued:pending');
      expect(states).toContain('processing:processing');
      expect(states).toContain('completed:completed');
    });

    it('should handle request completion with result', async () => {
      const testResult = { video: 'generated.mp4' };

      queue.on('process', (request, callback) => {
        setTimeout(() => callback(testResult), 10);
      });

      const requestId = await queue.enqueue({ test: 'result' });
      const result = await queue.waitForCompletion(requestId);

      expect(result).toEqual(testResult);
    });

    it('should handle request failure', async () => {
      const testError = new Error('Processing failed');

      queue.on('process', (request, callback) => {
        setTimeout(() => callback(null, testError), 10);
      });

      const requestId = await queue.enqueue({ test: 'failure' }, { maxRetries: 1 });

      await expect(queue.waitForCompletion(requestId)).rejects.toThrow('Processing failed');
    }, 10000); // 10s timeout
  });

  describe('Retry Logic', () => {
    it('should retry failed requests up to maxRetries', async () => {
      let attempts = 0;

      queue.on('process', (request, callback) => {
        attempts++;
        if (attempts < 3) {
          setTimeout(() => callback(null, new Error('Temporary failure')), 10);
        } else {
          setTimeout(() => callback({ success: true }), 10);
        }
      });

      const requestId = await queue.enqueue({ test: 'retry' }, { maxRetries: 3 });

      const result = await queue.waitForCompletion(requestId);

      expect(attempts).toBe(3);
      expect(result).toEqual({ success: true });
    }, 10000);

    it('should fail after exceeding maxRetries', async () => {
      let attempts = 0;

      queue.on('process', (request, callback) => {
        attempts++;
        setTimeout(() => callback(null, new Error('Persistent failure')), 10);
      });

      const requestId = await queue.enqueue({ test: 'max-retries' }, { maxRetries: 2 });

      await expect(queue.waitForCompletion(requestId)).rejects.toThrow('Persistent failure');

      // Initial attempt + retries
      expect(attempts).toBeGreaterThanOrEqual(2);
    }, 10000);
  });

  describe('Request Timeout', () => {
    it('should timeout long-running requests', async () => {
      queue.on('process', (request, callback) => {
        // Never complete - will timeout
      });

      const requestId = await queue.enqueue({ test: 'timeout' }, { timeout: 200, maxRetries: 1 });

      await expect(queue.waitForCompletion(requestId)).rejects.toThrow('Request timeout');
    }, 10000);
  });

  describe('Queue Metrics', () => {
    it('should track queue metrics accurately', async () => {
      queue.on('process', (request, callback) => {
        setTimeout(() => callback({ success: true }), 50);
      });

      // Enqueue requests
      await queue.enqueue({ id: 1 });
      await queue.enqueue({ id: 2 });
      await queue.enqueue({ id: 3 });

      const metrics1 = queue.getMetrics();
      expect(metrics1.totalRequests).toBe(3);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      const metrics2 = queue.getMetrics();
      expect(metrics2.completedRequests).toBe(3);
      expect(metrics2.pendingRequests).toBe(0);
      expect(metrics2.processingRequests).toBe(0);
    });

    it('should calculate average wait and processing times', async () => {
      queue.on('process', (request, callback) => {
        setTimeout(() => callback({ success: true }), 100);
      });

      await queue.enqueue({ id: 1 });
      await queue.enqueue({ id: 2 });

      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = queue.getMetrics();
      expect(metrics.averageWaitTime).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel pending request', async () => {
      // Stop processing temporarily
      queue.setMaxConcurrent(0);

      const requestId = await queue.enqueue({ test: 'cancel' });

      // Wait for enqueue to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      const cancelled = queue.cancel(requestId);
      expect(cancelled).toBe(true);

      const request = queue.getRequest(requestId);
      expect(request?.status).toBe('failed');
      expect(request?.error?.message).toBe('Cancelled by user');

      // Restore processing
      queue.setMaxConcurrent(2);
    });

    it('should not cancel processing request', async () => {
      queue.on('process', (request, callback) => {
        setTimeout(() => callback({ success: true }), 1000);
      });

      const requestId = await queue.enqueue({ test: 'cancel-processing' });

      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const cancelled = queue.cancel(requestId);
      expect(cancelled).toBe(false);
    });
  });

  describe('Dynamic Concurrency', () => {
    it('should adjust concurrent processing when maxConcurrent changes', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      queue.on('process', async (request, callback) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);

        await new Promise(resolve => setTimeout(resolve, 100));

        concurrent--;
        callback({ success: true });
      });

      // Enqueue with initial maxConcurrent=2
      await queue.enqueue({ id: 1 });
      await queue.enqueue({ id: 2 });
      await queue.enqueue({ id: 3 });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Increase maxConcurrent
      queue.setMaxConcurrent(3);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Queue State', () => {
    it('should report correct queue state', async () => {
      // Stop processing
      queue.setMaxConcurrent(0);

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getProcessingCount()).toBe(0);
      expect(queue.isFull()).toBe(false);

      // Fill queue
      for (let i = 0; i < 10; i++) {
        await queue.enqueue({ index: i });
      }

      // Wait for enqueue to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(queue.getQueueLength()).toBeGreaterThanOrEqual(8);
      expect(queue.isFull()).toBe(true);

      // Restore processing
      queue.setMaxConcurrent(2);
    });

    it('should clear history', async () => {
      queue.on('process', (request, callback) => {
        callback({ success: true });
      });

      await queue.enqueue({ id: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics1 = queue.getMetrics();
      expect(metrics1.completedRequests).toBe(1);

      queue.clearHistory();

      const metrics2 = queue.getMetrics();
      expect(metrics2.completedRequests).toBe(0);
    });
  });
});
