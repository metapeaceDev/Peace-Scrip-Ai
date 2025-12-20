/**
 * Request Queue System for Load Balancing
 * Handles concurrent video generation requests with priority levels
 */

import { EventEmitter } from 'events';

export type QueuePriority = 'high' | 'normal' | 'low';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueRequest<T = any> {
  id: string;
  priority: QueuePriority;
  status: QueueStatus;
  payload: T;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: Error;
  retries: number;
  maxRetries: number;
  timeout: number; // milliseconds
}

export interface QueueMetrics {
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  currentQueueLength: number;
}

export interface QueueOptions {
  maxConcurrent?: number;
  maxQueueSize?: number;
  defaultTimeout?: number;
  defaultMaxRetries?: number;
  priorityWeights?: {
    high: number;
    normal: number;
    low: number;
  };
}

/**
 * Priority-based request queue with load balancing
 */
export class RequestQueue<T = any> extends EventEmitter {
  private queue: QueueRequest<T>[] = [];
  private processing: Map<string, QueueRequest<T>> = new Map();
  private completed: Map<string, QueueRequest<T>> = new Map();
  private failed: Map<string, QueueRequest<T>> = new Map();

  private maxConcurrent: number;
  private maxQueueSize: number;
  private defaultTimeout: number;
  private defaultMaxRetries: number;
  private priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };

  private totalProcessed = 0;
  private totalWaitTime = 0;
  private totalProcessingTime = 0;

  constructor(options: QueueOptions = {}) {
    super();
    this.setMaxListeners(50); // Increase limit for multiple tests
    this.maxConcurrent = options.maxConcurrent || 3;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.defaultTimeout = options.defaultTimeout || 300000; // 5 minutes
    this.defaultMaxRetries = options.defaultMaxRetries || 3;
    this.priorityWeights = options.priorityWeights || {
      high: 3,
      normal: 2,
      low: 1,
    };
  }

  /**
   * Add request to queue
   */
  async enqueue(
    payload: T,
    options?: {
      priority?: QueuePriority;
      maxRetries?: number;
      timeout?: number;
    }
  ): Promise<string> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
    }

    const request: QueueRequest<T> = {
      id: this.generateId(),
      priority: options?.priority || 'normal',
      status: 'pending',
      payload,
      createdAt: new Date(),
      retries: 0,
      maxRetries: options?.maxRetries ?? this.defaultMaxRetries,
      timeout: options?.timeout ?? this.defaultTimeout,
    };

    this.queue.push(request);
    this.sortQueue();

    this.emit('enqueued', request);

    // Process next in next tick to allow tests to check state
    setImmediate(() => this.processNext());

    return request.id;
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return; // Already at max concurrent
    }

    if (this.queue.length === 0) {
      return; // No requests to process
    }

    const request = this.queue.shift()!;
    request.status = 'processing';
    request.startedAt = new Date();
    this.processing.set(request.id, request);

    // Calculate wait time
    const waitTime = request.startedAt.getTime() - request.createdAt.getTime();
    this.totalWaitTime += waitTime;

    this.emit('processing', request);

    // Set timeout
    const timeoutId = setTimeout(() => {
      this.handleTimeout(request.id);
    }, request.timeout);

    try {
      // Emit for external processing
      this.emit('process', request, (result: any, error?: Error) => {
        clearTimeout(timeoutId);
        if (error) {
          this.handleFailure(request.id, error);
        } else {
          this.handleSuccess(request.id, result);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleFailure(request.id, error as Error);
    }
  }

  /**
   * Handle successful completion
   */
  private handleSuccess(requestId: string, result: any): void {
    const request = this.processing.get(requestId);
    if (!request) return;

    request.status = 'completed';
    request.completedAt = new Date();
    request.result = result;

    // Calculate processing time
    const processingTime = request.completedAt.getTime() - request.startedAt!.getTime();
    this.totalProcessingTime += processingTime;
    this.totalProcessed++;

    this.processing.delete(requestId);
    this.completed.set(requestId, request);

    this.emit('completed', request);
    this.processNext(); // Process next in queue
  }

  /**
   * Handle failure (with retry logic)
   */
  private handleFailure(requestId: string, error: Error): void {
    const request = this.processing.get(requestId);
    if (!request) return;

    request.error = error;
    request.retries++;

    this.emit('error', { request, error });

    if (request.retries < request.maxRetries) {
      // Retry
      console.log(
        `Retrying request ${requestId} (attempt ${request.retries}/${request.maxRetries})`
      );
      request.status = 'pending';
      this.processing.delete(requestId);
      this.queue.unshift(request); // Add to front of queue
      this.processNext();
    } else {
      // Max retries reached
      request.status = 'failed';
      request.completedAt = new Date();
      this.processing.delete(requestId);
      this.failed.set(requestId, request);
      this.emit('failed', request);
      this.processNext();
    }
  }

  /**
   * Handle timeout
   */
  private handleTimeout(requestId: string): void {
    this.handleFailure(requestId, new Error('Request timeout'));
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const aPriority = this.priorityWeights[a.priority];
      const bPriority = this.priorityWeights[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Same priority, sort by creation time (FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get request status
   */
  getRequest(requestId: string): QueueRequest<T> | null {
    return (
      this.queue.find(r => r.id === requestId) ||
      this.processing.get(requestId) ||
      this.completed.get(requestId) ||
      this.failed.get(requestId) ||
      null
    );
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    const avgWaitTime = this.totalProcessed > 0 ? this.totalWaitTime / this.totalProcessed : 0;
    const avgProcessingTime =
      this.totalProcessed > 0 ? this.totalProcessingTime / this.totalProcessed : 0;

    return {
      totalRequests:
        this.queue.length + this.processing.size + this.completed.size + this.failed.size,
      pendingRequests: this.queue.length,
      processingRequests: this.processing.size,
      completedRequests: this.completed.size,
      failedRequests: this.failed.size,
      averageWaitTime: avgWaitTime,
      averageProcessingTime: avgProcessingTime,
      currentQueueLength: this.queue.length,
    };
  }

  /**
   * Cancel request
   */
  cancel(requestId: string): boolean {
    // Check if in queue
    const queueIndex = this.queue.findIndex(r => r.id === requestId);
    if (queueIndex !== -1) {
      const request = this.queue.splice(queueIndex, 1)[0];
      request.status = 'failed';
      request.error = new Error('Cancelled by user');
      this.failed.set(requestId, request);
      this.emit('cancelled', request);
      return true;
    }

    // Cannot cancel if already processing or completed
    return false;
  }

  /**
   * Clear completed and failed requests
   */
  clearHistory(): void {
    this.completed.clear();
    this.failed.clear();
    this.totalProcessed = 0;
    this.totalWaitTime = 0;
    this.totalProcessingTime = 0;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get processing count
   */
  getProcessingCount(): number {
    return this.processing.size;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.maxQueueSize;
  }

  /**
   * Check if at max concurrent
   */
  isAtMaxConcurrent(): boolean {
    return this.processing.size >= this.maxConcurrent;
  }

  /**
   * Update max concurrent
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    // Try to process more if we increased the limit
    while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
      this.processNext();
    }
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wait for request to complete
   */
  async waitForCompletion(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkRequest = () => {
        const request = this.getRequest(requestId);
        if (!request) {
          reject(new Error('Request not found'));
          return;
        }

        if (request.status === 'completed') {
          resolve(request.result);
        } else if (request.status === 'failed') {
          reject(request.error || new Error('Request failed'));
        }
      };

      // Check immediately
      checkRequest();

      // Listen for completion
      const completedHandler = (req: QueueRequest<T>) => {
        if (req.id === requestId) {
          cleanup();
          resolve(req.result);
        }
      };

      const failedHandler = (req: QueueRequest<T>) => {
        if (req.id === requestId) {
          cleanup();
          reject(req.error || new Error('Request failed'));
        }
      };

      const cleanup = () => {
        this.off('completed', completedHandler);
        this.off('failed', failedHandler);
      };

      this.on('completed', completedHandler);
      this.on('failed', failedHandler);
    });
  }
}

// Singleton instance for video generation queue
export const videoQueue = new RequestQueue({
  maxConcurrent: 3,
  maxQueueSize: 100,
  defaultTimeout: 300000, // 5 minutes
  defaultMaxRetries: 3,
  priorityWeights: {
    high: 3, // Premium users
    normal: 2, // Regular users
    low: 1, // Free tier users
  },
});

