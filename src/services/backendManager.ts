/**
 * Backend Manager
 * Manages backend selection with automatic fallback
 * Priority: Local ComfyUI → Cloud RunPod → Gemini API
 * With integrated load balancing and request queue
 */

import { runPodService } from './runpod';
import { videoQueue } from './requestQueue';
import { loadBalancer } from './loadBalancer';

export type BackendType = 'local' | 'cloud' | 'gemini';

export interface BackendConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  costPerVideo: number;
  provider?: string;
}

export interface BackendStatus {
  type: BackendType;
  available: boolean;
  healthy: boolean;
  responseTime?: number;
  lastChecked: number;
}

export const BACKEND_CONFIG: Record<BackendType, BackendConfig> = {
  local: {
    url: import.meta.env.VITE_COMFYUI_LOCAL_URL || 'http://localhost:8188',
    timeout: 120000, // 2 minutes
    maxRetries: 2,
    costPerVideo: 0, // Free (local GPU)
  },
  cloud: {
    url: import.meta.env.VITE_COMFYUI_CLOUD_URL || '',
    timeout: 180000, // 3 minutes
    maxRetries: 3,
    costPerVideo: 0.02, // $0.02 target
    provider: 'runpod',
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    timeout: 60000, // 1 minute
    maxRetries: 2,
    costPerVideo: 0.5, // $0.50 per video
    provider: 'google',
  },
};

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';

export class BackendManager {
  private statusCache: Map<BackendType, BackendStatus> = new Map();
  private preferredBackend: BackendType | null = null;
  private lastBackendUsed: BackendType | null = null;

  /**
   * Get backend priority order from env or default
   */
  getBackendPriority(): BackendType[] {
    const envPriority = import.meta.env.VITE_BACKEND_PRIORITY;
    if (envPriority) {
      return envPriority.split(',').map((b: string) => b.trim() as BackendType);
    }
    return ['local', 'cloud', 'gemini'];
  }

  /**
   * Check if a backend is available and healthy
   */
  async checkBackendHealth(type: BackendType): Promise<BackendStatus> {
    const startTime = Date.now();
    // const config = BACKEND_CONFIG[type]; // For future use

    try {
      let healthy = false;

      if (type === 'local') {
        // Check local ComfyUI via comfyui-service proxy (browser-safe)
        const response = await fetch(`${COMFYUI_SERVICE_URL}/health/system_stats`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        healthy = response.ok;
      } else if (type === 'cloud') {
        // Check cloud RunPod
        const podId = import.meta.env.VITE_RUNPOD_POD_ID;
        if (podId) {
          healthy = await runPodService.checkComfyUIHealth(podId);
        } else {
          healthy = false;
        }
      } else if (type === 'gemini') {
        // Gemini is always available if API key is set
        healthy = !!import.meta.env.VITE_GEMINI_API_KEY;
      }

      const responseTime = Date.now() - startTime;

      const status: BackendStatus = {
        type,
        available: true,
        healthy,
        responseTime,
        lastChecked: Date.now(),
      };

      this.statusCache.set(type, status);
      return status;
    } catch (error) {
      const status: BackendStatus = {
        type,
        available: false,
        healthy: false,
        lastChecked: Date.now(),
      };

      this.statusCache.set(type, status);
      return status;
    }
  }

  /**
   * Get cached backend status
   */
  getCachedStatus(type: BackendType): BackendStatus | null {
    return this.statusCache.get(type) || null;
  }

  /**
   * Select the best available backend
   */
  async selectBackend(forceBackend?: BackendType): Promise<BackendType> {
    // If a specific backend is forced, use it
    if (forceBackend) {
      this.preferredBackend = forceBackend;
      return forceBackend;
    }

    // If preferred backend is set, try it first
    if (this.preferredBackend) {
      const status = await this.checkBackendHealth(this.preferredBackend);
      if (status.healthy) {
        this.lastBackendUsed = this.preferredBackend;
        return this.preferredBackend;
      }
    }

    // Try backends in priority order
    const priority = this.getBackendPriority();
    for (const backend of priority) {
      const status = await this.checkBackendHealth(backend);
      if (status.healthy) {
        this.lastBackendUsed = backend;
        return backend;
      }
    }

    // Fallback to Gemini as last resort
    console.warn('All backends unavailable, falling back to Gemini');
    this.lastBackendUsed = 'gemini';
    return 'gemini';
  }

  /**
   * Execute a request with automatic backend fallback
   */
  async executeWithFallback<T>(
    operation: (backend: BackendType, config: BackendConfig) => Promise<T>,
    preferredBackend?: BackendType
  ): Promise<{ result: T; backend: BackendType; cost: number }> {
    const priority = preferredBackend
      ? [preferredBackend, ...this.getBackendPriority().filter(b => b !== preferredBackend)]
      : this.getBackendPriority();

    const errors: Array<{ backend: BackendType; error: any }> = [];

    for (const backend of priority) {
      try {
        const config = BACKEND_CONFIG[backend];
        const status = await this.checkBackendHealth(backend);

        if (!status.healthy) {
          continue;
        }

        console.log(`Attempting operation with ${backend} backend...`);
        const result = await operation(backend, config);

        this.lastBackendUsed = backend;

        return {
          result,
          backend,
          cost: config.costPerVideo,
        };
      } catch (error) {
        console.error(`Backend ${backend} failed:`, error);
        errors.push({ backend, error });
      }
    }

    // All backends failed
    throw new Error(
      `All backends failed:\n${errors.map(e => `${e.backend}: ${e.error.message}`).join('\n')}`
    );
  }

  /**
   * Set preferred backend
   */
  setPreferredBackend(backend: BackendType | null) {
    this.preferredBackend = backend;
  }

  /**
   * Get last backend used
   */
  getLastBackendUsed(): BackendType | null {
    return this.lastBackendUsed;
  }

  /**
   * Get all backend statuses
   */
  async getAllBackendStatuses(): Promise<BackendStatus[]> {
    const backends: BackendType[] = ['local', 'cloud', 'gemini'];
    const statuses = await Promise.all(backends.map(backend => this.checkBackendHealth(backend)));
    return statuses;
  }

  /**
   * Auto-start cloud backend if needed
   */
  async ensureCloudBackendRunning(): Promise<boolean> {
    const podId = import.meta.env.VITE_RUNPOD_POD_ID;

    if (!podId) {
      console.warn('No RunPod pod ID configured');
      return false;
    }

    try {
      const status = await runPodService.getPodStatus(podId);

      if (status.status === 'RUNNING') {
        const healthy = await runPodService.checkComfyUIHealth(podId);
        return healthy;
      }

      if (status.status === 'EXITED' || status.status === 'STOPPED') {
        console.log('Resuming stopped pod...');
        await runPodService.resumePod(podId);

        // Wait for pod to be ready
        const ready = await runPodService.waitForPodReady(podId);
        return ready;
      }

      return false;
    } catch (error) {
      console.error('Failed to ensure cloud backend running:', error);
      return false;
    }
  }

  /**
   * Execute with queue and load balancing (recommended for production)
   */
  async executeWithQueue<T>(
    operation: (backend: BackendType, config: BackendConfig) => Promise<T>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      preferredBackend?: BackendType;
      maxRetries?: number;
      timeout?: number;
    }
  ): Promise<{ result: T; backend: BackendType; cost: number; requestId: string }> {
    // Enqueue the request
    const requestId = await videoQueue.enqueue(
      { operation, preferredBackend: options?.preferredBackend },
      {
        priority: options?.priority,
        maxRetries: options?.maxRetries,
        timeout: options?.timeout,
      }
    );

    // Wait for completion
    const result = await videoQueue.waitForCompletion(requestId);

    return {
      ...result,
      requestId,
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return videoQueue.getMetrics();
  }

  /**
   * Get load balancer metrics
   */
  getLoadBalancerMetrics() {
    return loadBalancer.getMetrics();
  }

  /**
   * Cancel queued request
   */
  cancelRequest(requestId: string): boolean {
    return videoQueue.cancel(requestId);
  }

  /**
   * Get cost estimate for video generation
   */
  getCostEstimate(backend: BackendType): number {
    return BACKEND_CONFIG[backend].costPerVideo;
  }

  /**
   * Get backend configuration
   */
  getBackendConfig(backend: BackendType): BackendConfig {
    return BACKEND_CONFIG[backend];
  }
}

// Singleton instance
export const backendManager = new BackendManager();
