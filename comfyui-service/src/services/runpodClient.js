/**
 * RunPod API Client
 * 
 * Handles communication with RunPod GraphQL API for:
 * - Serverless endpoint invocations
 * - On-demand pod deployment
 * - Pod management (start, stop, terminate)
 * - Status checking and monitoring
 */

import axios from 'axios';
import { EventEmitter } from 'events';

const RUNPOD_API_ENDPOINT = 'https://api.runpod.io/graphql';
const RUNPOD_API_VERSION = '2';

class RunPodClient extends EventEmitter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.RUNPOD_API_KEY;
    
    if (!this.apiKey) {
      console.log('ℹ️  RunPod API key not configured. Cloud workers will not be available.');
    }
  }

  /**
   * Execute GraphQL query/mutation
   */
  async executeGraphQL(query, variables = {}) {
    if (!this.apiKey) {
      throw new Error('RunPod API key not configured');
    }

    try {
      const response = await axios.post(
        RUNPOD_API_ENDPOINT,
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      if (response.data.errors) {
        const errorMessage = response.data.errors.map(e => e.message).join(', ');
        throw new Error(`RunPod API Error: ${errorMessage}`);
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`RunPod API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Deploy on-demand pod
   */
  async deployOnDemandPod(config = {}) {
    const defaultConfig = {
      cloudType: 'SECURE',
      gpuTypeId: 'NVIDIA RTX 3090',
      imageName: process.env.RUNPOD_DOCKER_IMAGE || 'runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel',
      containerDiskInGb: 50,
      volumeInGb: 100,
      ports: '8188/http',
      env: [
        { key: 'COMFYUI_PORT', value: '8188' },
        { key: 'COMFYUI_MODELS_PRELOAD', value: 'true' }
      ],
      ...config
    };

    const mutation = `
      mutation DeployPod($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
          id
          desiredStatus
          imageName
          machine {
            podHostId
          }
          runtime {
            ports {
              ip
              isIpPublic
              privatePort
              publicPort
              type
            }
          }
        }
      }
    `;

    const variables = {
      input: {
        cloudType: defaultConfig.cloudType,
        gpuTypeId: defaultConfig.gpuTypeId,
        containerDiskInGb: defaultConfig.containerDiskInGb,
        volumeInGb: defaultConfig.volumeInGb,
        dockerArgs: defaultConfig.imageName,
        ports: defaultConfig.ports,
        env: defaultConfig.env
      }
    };

    console.log('🚀 Deploying RunPod on-demand pod...');
    const data = await this.executeGraphQL(mutation, variables);
    const pod = data.podFindAndDeployOnDemand;

    console.log(`✅ Pod deployed: ${pod.id}`);
    
    // Emit event for monitoring
    this.emit('podDeployed', pod);

    return {
      id: pod.id,
      status: pod.desiredStatus,
      imageName: pod.imageName,
      url: null, // Will be set after pod is ready
      createdAt: Date.now(),
      costPerHour: this.getGPUCost(defaultConfig.gpuTypeId)
    };
  }

  /**
   * Get pod status
   */
  async getPodStatus(podId) {
    const query = `
      query GetPod($podId: String!) {
        pod(input: { podId: $podId }) {
          id
          desiredStatus
          imageName
          machine {
            podHostId
          }
          runtime {
            ports {
              ip
              isIpPublic
              privatePort
              publicPort
              type
            }
            uptimeInSeconds
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { podId });
    return data.pod;
  }

  /**
   * Wait for pod to be ready
   */
  async waitForPodReady(podId, maxWaitTime = 300000) {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    console.log(`⏳ Waiting for pod ${podId} to be ready...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const pod = await this.getPodStatus(podId);
        
        if (pod.desiredStatus === 'RUNNING' && pod.runtime?.ports) {
          // Find the ComfyUI port
          const comfyPort = pod.runtime.ports.find(p => p.privatePort === 8188);
          
          if (comfyPort && comfyPort.isIpPublic) {
            const url = `https://${pod.id}-8188.proxy.runpod.net`;
            
            // Verify ComfyUI is responding
            try {
              await axios.get(`${url}/system_stats`, { timeout: 5000 });
              console.log(`✅ Pod ${podId} is ready at ${url}`);
              
              this.emit('podReady', { podId, url });
              
              return {
                id: podId,
                url,
                status: 'ready',
                uptime: pod.runtime.uptimeInSeconds
              };
            } catch (error) {
              // ComfyUI not ready yet, continue waiting
              console.log(`   Pod running but ComfyUI not ready yet...`);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking pod status: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Pod ${podId} did not become ready within ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Terminate pod
   */
  async terminatePod(podId) {
    const mutation = `
      mutation TerminatePod($input: PodTerminateInput!) {
        podTerminate(input: $input)
      }
    `;

    console.log(`🛑 Terminating pod ${podId}...`);
    
    await this.executeGraphQL(mutation, { input: { podId } });
    
    console.log(`✅ Pod ${podId} terminated`);
    
    this.emit('podTerminated', { podId });
  }

  /**
   * Get my pods
   */
  async getMyPods() {
    const query = `
      query GetMyPods {
        myself {
          pods {
            id
            desiredStatus
            imageName
            costPerHr
            machine {
              gpuDisplayName
            }
            runtime {
              uptimeInSeconds
              ports {
                privatePort
                publicPort
                type
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query);
    return data.myself.pods;
  }

  /**
   * Invoke serverless endpoint
   */
  async invokeServerless(endpointId, input, timeout = 180000) {
    if (!endpointId) {
      throw new Error('Serverless endpoint ID not configured');
    }

    const url = `https://api.runpod.ai/v2/${endpointId}/run`;

    console.log('🚀 Invoking RunPod serverless endpoint...');

    try {
      const response = await axios.post(
        url,
        { input },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      const { id, status } = response.data;

      if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
        // Poll for result
        return await this.pollServerlessResult(endpointId, id, timeout);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`RunPod Serverless Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Poll serverless result
   */
  async pollServerlessResult(endpointId, requestId, timeout = 180000) {
    const url = `https://api.runpod.ai/v2/${endpointId}/status/${requestId}`;
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    console.log(`⏳ Polling for serverless result ${requestId}...`);

    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        });

        const { status, output, error } = response.data;

        if (status === 'COMPLETED') {
          console.log('✅ Serverless request completed');
          return output;
        }

        if (status === 'FAILED') {
          throw new Error(`Serverless request failed: ${error || 'Unknown error'}`);
        }

        // Still in progress, continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error.response?.status === 404) {
          // Request not found yet, continue polling
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Serverless request ${requestId} timed out after ${timeout / 1000} seconds`);
  }

  /**
   * Get GPU cost per hour
   */
  getGPUCost(gpuType) {
    const costs = {
      'NVIDIA RTX 3090': 0.34,
      'NVIDIA RTX 4090': 0.50,
      'NVIDIA A100': 1.10,
      'NVIDIA A40': 0.65,
      'NVIDIA L40': 0.85
    };

    return costs[gpuType] || 0.50; // Default to $0.50/hr
  }

  /**
   * Calculate cost for duration
   */
  calculateCost(durationMs, costPerHour) {
    const hours = durationMs / (1000 * 60 * 60);
    return hours * costPerHour;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.getMyPods();
      return true;
    } catch (error) {
      console.error('RunPod health check failed:', error.message);
      return false;
    }
  }
}

export default RunPodClient;
