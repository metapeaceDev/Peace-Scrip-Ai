/**
 * RunPod Cloud Service
 * Manages RunPod pod lifecycle and API interactions
 */

const RUNPOD_API_ENDPOINT = 'https://api.runpod.io/graphql';

export interface RunPodConfig {
  apiKey: string;
  gpuType: string;
  imageName: string;
  containerDiskInGb: number;
  volumeInGb: number;
}

export interface PodInfo {
  id: string;
  status: string;
  url: string;
  uptime: number;
  gpuType: string;
}

export interface PodPort {
  ip: string;
  isIpPublic: boolean;
  privatePort: number;
  publicPort: number;
  type: string;
}

export class RunPodService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_RUNPOD_API_KEY || '';
  }

  /**
   * Deploy a new pod on RunPod
   */
  async deployPod(config: Partial<RunPodConfig> = {}): Promise<PodInfo> {
    const defaultConfig: RunPodConfig = {
      apiKey: this.apiKey,
      gpuType: 'NVIDIA RTX 3090',
      imageName: 'peace-comfyui:latest',
      containerDiskInGb: 50,
      volumeInGb: 100,
      ...config,
    };

    const mutation = `
      mutation {
        podFindAndDeployOnDemand(
          input: {
            cloudType: SECURE
            gpuTypeId: "${defaultConfig.gpuType}"
            containerDiskInGb: ${defaultConfig.containerDiskInGb}
            volumeInGb: ${defaultConfig.volumeInGb}
            dockerArgs: "${defaultConfig.imageName}"
            ports: "8188/http"
          }
        ) {
          id
          desiredStatus
          imageName
          machineId
        }
      }
    `;

    const response = await this.makeRequest(mutation);
    const pod = response.data.podFindAndDeployOnDemand;

    return {
      id: pod.id,
      status: pod.desiredStatus,
      url: this.getPodUrl(pod.id),
      uptime: 0,
      gpuType: defaultConfig.gpuType,
    };
  }

  /**
   * Get pod status and information
   */
  async getPodStatus(podId: string): Promise<PodInfo> {
    const query = `
      query {
        pod(input: { podId: "${podId}" }) {
          id
          desiredStatus
          runtime {
            uptimeInSeconds
            ports {
              ip
              isIpPublic
              privatePort
              publicPort
              type
            }
            gpus {
              id
              gpuUtilPercent
              memoryUtilPercent
            }
          }
          machine {
            gpuDisplayName
          }
        }
      }
    `;

    const response = await this.makeRequest(query);
    const pod = response.data.pod;

    return {
      id: pod.id,
      status: pod.desiredStatus,
      url: this.getPodUrl(pod.id),
      uptime: pod.runtime?.uptimeInSeconds || 0,
      gpuType: pod.machine?.gpuDisplayName || 'Unknown',
    };
  }

  /**
   * Stop a running pod
   */
  async stopPod(podId: string): Promise<void> {
    const mutation = `
      mutation {
        podStop(input: { podId: "${podId}" }) {
          id
          desiredStatus
        }
      }
    `;

    await this.makeRequest(mutation);
  }

  /**
   * Terminate a pod (cannot be restarted)
   */
  async terminatePod(podId: string): Promise<void> {
    const mutation = `
      mutation {
        podTerminate(input: { podId: "${podId}" }) {
          id
        }
      }
    `;

    await this.makeRequest(mutation);
  }

  /**
   * Resume a stopped pod
   */
  async resumePod(podId: string): Promise<PodInfo> {
    const mutation = `
      mutation {
        podResume(input: { podId: "${podId}" }) {
          id
          desiredStatus
        }
      }
    `;

    const response = await this.makeRequest(mutation);
    const pod = response.data.podResume;

    return {
      id: pod.id,
      status: pod.desiredStatus,
      url: this.getPodUrl(pod.id),
      uptime: 0,
      gpuType: 'Unknown',
    };
  }

  /**
   * List all pods
   */
  async listPods(): Promise<PodInfo[]> {
    const query = `
      query {
        myself {
          pods {
            id
            desiredStatus
            runtime {
              uptimeInSeconds
            }
            machine {
              gpuDisplayName
            }
          }
        }
      }
    `;

    const response = await this.makeRequest(query);
    const pods = response.data.myself.pods;

    return pods.map((pod: any) => ({
      id: pod.id,
      status: pod.desiredStatus,
      url: this.getPodUrl(pod.id),
      uptime: pod.runtime?.uptimeInSeconds || 0,
      gpuType: pod.machine?.gpuDisplayName || 'Unknown',
    }));
  }

  /**
   * Get pod GPU utilization
   */
  async getGpuUtilization(podId: string): Promise<{
    gpuPercent: number;
    memoryPercent: number;
  }> {
    // const status = await this.getPodStatus(podId);
    const response = await this.makeRequest(`
      query {
        pod(input: { podId: "${podId}" }) {
          runtime {
            gpus {
              gpuUtilPercent
              memoryUtilPercent
            }
          }
        }
      }
    `);

    const gpu = response.data.pod.runtime?.gpus?.[0];
    return {
      gpuPercent: gpu?.gpuUtilPercent || 0,
      memoryPercent: gpu?.memoryUtilPercent || 0,
    };
  }

  /**
   * Check if ComfyUI is ready on the pod
   */
  async checkComfyUIHealth(podId: string): Promise<boolean> {
    try {
      const url = this.getPodUrl(podId);
      const response = await fetch(`${url}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for pod to be ready
   */
  async waitForPodReady(podId: string, timeoutMs: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getPodStatus(podId);

      if (status.status === 'RUNNING') {
        // Check if ComfyUI is accessible
        const healthy = await this.checkComfyUIHealth(podId);
        if (healthy) {
          return true;
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return false;
  }

  /**
   * Get estimated cost for pod usage
   */
  calculateCost(uptimeSeconds: number, pricePerHour: number = 0.34): number {
    const hours = uptimeSeconds / 3600;
    return hours * pricePerHour;
  }

  /**
   * Private helper: Make GraphQL request
   */
  private async makeRequest(query: string): Promise<any> {
    const response = await fetch(RUNPOD_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`RunPod GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data;
  }

  /**
   * Private helper: Generate pod URL
   */
  private getPodUrl(podId: string): string {
    return `https://${podId}-8188.proxy.runpod.net`;
  }
}

// Singleton instance
export const runPodService = new RunPodService();
