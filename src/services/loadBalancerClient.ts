/**
 * Load Balancer API Client
 *
 * Client for intelligent backend routing with cost optimization
 * Connects to ComfyUI Service Load Balancer API
 */

const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';

export type BackendType = 'local' | 'cloud' | 'gemini';

export interface BackendInfo {
  type: BackendType;
  name: string;
  available: boolean;
  healthy: boolean;
  cost: number;
  speed: number;
  avgSpeed: number;
  queue: number;
  jobs: number;
  totalCost: number;
  avgProcessingTime: number;
}

export interface LoadBalancerStatus {
  backends: BackendInfo[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  preferredBackend: 'auto' | BackendType;
  maxCostPerJob: number | null;
  prioritizeSpeed: boolean;
  allowCloudFallback: boolean;
}

export interface BackendSelection {
  backend: BackendType;
  reason: string;
  score: number;
  estimatedCost: number;
  estimatedTime: number;
  queue: number;
}

export interface BackendRecommendation {
  backend: BackendType;
  jobCount: number;
  cost: number;
  time: number;
  reason: string;
}

export interface CostEstimate {
  backend: BackendType;
  jobCount: number;
  totalCost: number;
  avgCostPerJob: number;
  estimatedTime: number;
  breakdown: Record<string, { jobs: number; cost: number }>;
}

/**
 * Load Balancer API Client
 */
export class LoadBalancerClient {
  private baseUrl: string;

  constructor(baseUrl: string = COMFYUI_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get load balancer status and statistics
   */
  async getStatus(): Promise<LoadBalancerStatus> {
    const response = await fetch(`${this.baseUrl}/api/loadbalancer/status`);

    if (!response.ok) {
      throw new Error(`Failed to get load balancer status: ${response.statusText}`);
    }

    const data = await response.json();
    return data as LoadBalancerStatus;
  }

  /**
   * Get backend recommendation for a job (preview only)
   */
  async selectBackend(
    jobType: 'image' | 'video',
    options: Partial<UserPreferences> = {}
  ): Promise<BackendSelection> {
    const response = await fetch(`${this.baseUrl}/api/loadbalancer/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobType, options }),
    });

    if (!response.ok) {
      throw new Error(`Failed to select backend: ${response.statusText}`);
    }

    const data = await response.json();
    return data.selection as BackendSelection;
  }

  /**
   * Get recommendations based on workload
   */
  async getRecommendations(
    params: {
      jobCount?: number;
      maxBudget?: number | null;
      needsFast?: boolean;
    } = {}
  ): Promise<{
    recommendations: BackendRecommendation[];
    totalCost: number;
    totalTime: number;
    avgCostPerJob: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params.jobCount) queryParams.set('jobCount', params.jobCount.toString());
    if (params.maxBudget) queryParams.set('maxBudget', params.maxBudget.toString());
    if (params.needsFast !== undefined) queryParams.set('needsFast', params.needsFast.toString());

    const response = await fetch(
      `${this.baseUrl}/api/loadbalancer/recommendations?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.recommendations;
  }

  /**
   * Calculate cost estimate for jobs
   */
  async estimateCost(
    jobCount: number,
    backend: BackendType | 'auto' = 'auto'
  ): Promise<CostEstimate> {
    const response = await fetch(`${this.baseUrl}/api/loadbalancer/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobCount, backend: backend === 'auto' ? null : backend }),
    });

    if (!response.ok) {
      throw new Error(`Failed to estimate cost: ${response.statusText}`);
    }

    const data = await response.json();
    return data.estimate as CostEstimate;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await fetch(`${this.baseUrl}/api/loadbalancer/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`Failed to update preferences: ${response.statusText}`);
    }

    const data = await response.json();
    return data.preferences as UserPreferences;
  }

  /**
   * Get all backend information
   */
  async getBackends(): Promise<BackendInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/loadbalancer/backends`);

    if (!response.ok) {
      throw new Error(`Failed to get backends: ${response.statusText}`);
    }

    const data = await response.json();
    return data.backends as BackendInfo[];
  }

  /**
   * Get backend display name
   */
  getBackendDisplayName(backend: BackendType): string {
    const names: Record<BackendType, string> = {
      local: 'Local GPU (ComfyUI)',
      cloud: 'Cloud (RunPod)',
      gemini: 'Gemini AI',
    };
    return names[backend];
  }

  /**
   * Get backend description
   */
  getBackendDescription(backend: BackendType): string {
    const descriptions: Record<BackendType, string> = {
      local: 'Your local GPU - Free, fast, and private',
      cloud: 'Auto-scaling cloud GPUs - $0.007 per video',
      gemini: 'Google Gemini AI - $0.08 per video',
    };
    return descriptions[backend];
  }

  /**
   * Get backend icon/emoji
   */
  getBackendIcon(backend: BackendType): string {
    const icons: Record<BackendType, string> = {
      local: '🖥️',
      cloud: '☁️',
      gemini: '🤖',
    };
    return icons[backend];
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Format time for display
   */
  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// Export singleton instance
export const loadBalancerClient = new LoadBalancerClient();
