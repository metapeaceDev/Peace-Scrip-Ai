# RunPod Cloud Deployment Guide

## 📋 Overview

This guide covers deploying ComfyUI to RunPod cloud infrastructure for scalable video generation.

**Target Specs:**
- GPU: NVIDIA RTX 3090 (24GB VRAM)
- Cost Target: ~$0.02 per video
- Scaling: Auto-scale based on demand
- Fallback: Local → Cloud → Gemini

---

## 🚀 Phase 2.1: RunPod Setup & Configuration

### Step 1: RunPod Account Setup

1. **Create RunPod Account**
   - Visit: https://www.runpod.io/
   - Sign up with email
   - Add payment method
   - Get API key from: https://www.runpod.io/console/user/settings

2. **Save API Key**
   ```bash
   # Add to .env.local
   VITE_RUNPOD_API_KEY=your_api_key_here
   ```

### Step 2: Select GPU Pod

**Recommended Configuration:**
```
GPU: NVIDIA RTX 3090 (24GB VRAM)
RAM: 64GB
Storage: 100GB SSD
Price: ~$0.34/hour on-demand
      ~$0.24/hour spot pricing
```

**Cost Calculation:**
- Video generation time: ~30-45 seconds
- Cost per video: $0.34/3600 * 45 = ~$0.00425/video (on-demand)
- Cost per video: $0.24/3600 * 45 = ~$0.003/video (spot)
- Target: $0.02/video (with optimization)

### Step 3: Docker Image for RunPod

Create custom Docker image with ComfyUI:

```dockerfile
# runpod-comfyui.Dockerfile
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Clone ComfyUI
WORKDIR /app
RUN git clone https://github.com/comfyanonymous/ComfyUI.git
WORKDIR /app/ComfyUI

# Install Python dependencies
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 \
    xformers \
    opencv-python \
    pillow \
    safetensors \
    transformers \
    diffusers \
    accelerate

# Install ComfyUI requirements
RUN pip install -r requirements.txt

# Download models
WORKDIR /app/ComfyUI/models
RUN mkdir -p checkpoints vae controlnet upscale_models

# FLUX.1-schnell (Main model)
RUN wget -q --show-progress \
    https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors \
    -O checkpoints/flux1-schnell.safetensors

# VAE
RUN wget -q --show-progress \
    https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors \
    -O vae/flux_vae.safetensors

# Text encoders
RUN mkdir -p clip
RUN wget -q --show-progress \
    https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors \
    -O clip/clip_l.safetensors
RUN wget -q --show-progress \
    https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors \
    -O clip/t5xxl_fp8_e4m3fn.safetensors

# ControlNet for AnimateDiff
RUN wget -q --show-progress \
    https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth \
    -O controlnet/control_openpose.pth

# Expose port
EXPOSE 8188

# Start ComfyUI
WORKDIR /app/ComfyUI
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188"]
```

### Step 4: Build and Push Docker Image

```bash
# Build image
docker build -f runpod-comfyui.Dockerfile -t peace-comfyui:latest .

# Tag for Docker Hub (or your registry)
docker tag peace-comfyui:latest yourusername/peace-comfyui:latest

# Push to registry
docker push yourusername/peace-comfyui:latest
```

### Step 5: Deploy to RunPod

**Option A: Via RunPod Console**
1. Go to: https://www.runpod.io/console/pods
2. Click "Deploy"
3. Select "RTX 3090"
4. Under "Container Image" enter: `yourusername/peace-comfyui:latest`
5. Set port: 8188
6. Deploy

**Option B: Via RunPod API**

```typescript
// src/services/runpod.ts
const RUNPOD_API_ENDPOINT = 'https://api.runpod.io/graphql';

interface RunPodConfig {
  apiKey: string;
  gpuType: string;
  imageName: string;
  containerDiskInGb: number;
  volumeInGb: number;
}

async function deployPod(config: RunPodConfig) {
  const mutation = `
    mutation {
      podFindAndDeployOnDemand(
        input: {
          cloudType: SECURE
          gpuTypeId: "${config.gpuType}"
          containerDiskInGb: ${config.containerDiskInGb}
          volumeInGb: ${config.volumeInGb}
          dockerArgs: "${config.imageName}"
          ports: "8188/http"
        }
      ) {
        id
        desiredStatus
        imageName
        env
        machineId
        machine {
          podHostId
        }
      }
    }
  `;

  const response = await fetch(RUNPOD_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ query: mutation }),
  });

  const data = await response.json();
  return data.data.podFindAndDeployOnDemand;
}
```

### Step 6: Get Pod URL

```typescript
async function getPodStatus(podId: string, apiKey: string) {
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
        }
      }
    }
  `;

  const response = await fetch(RUNPOD_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  const pod = data.data.pod;
  
  // Get public URL
  const httpPort = pod.runtime.ports.find((p: any) => p.privatePort === 8188);
  const publicUrl = `https://${podId}-8188.proxy.runpod.net`;
  
  return {
    id: pod.id,
    status: pod.desiredStatus,
    url: publicUrl,
    uptime: pod.runtime.uptimeInSeconds,
  };
}
```

---

## 🔧 Configuration

### Environment Variables

Add to `.env.local`:

```bash
# RunPod Configuration
VITE_RUNPOD_API_KEY=your_api_key_here
VITE_RUNPOD_POD_ID=your_pod_id_here

# ComfyUI Cloud URL (auto-generated after pod deployment)
VITE_COMFYUI_CLOUD_URL=https://your-pod-id-8188.proxy.runpod.net

# Backend Priority
VITE_BACKEND_PRIORITY=local,cloud,gemini
```

### Backend Configuration

Update `src/config/backends.ts`:

```typescript
export const BACKEND_CONFIG = {
  local: {
    url: import.meta.env.VITE_COMFYUI_LOCAL_URL || 'http://localhost:8188',
    timeout: 120000, // 2 minutes
    maxRetries: 2,
    costPerVideo: 0, // Free (local)
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
    timeout: 60000,
    maxRetries: 2,
    costPerVideo: 0.50, // $0.50 per video
  },
};
```

---

## 📊 Cost Optimization

### 1. Use Spot Instances
- Save ~30% compared to on-demand
- Risk: Can be interrupted (rare for short jobs)

### 2. Auto-shutdown
```typescript
// Shutdown pod after 5 minutes of inactivity
async function autoShutdownPod(podId: string, apiKey: string, idleMinutes: number = 5) {
  const lastActivity = getLastActivityTime();
  const idleTime = Date.now() - lastActivity;
  
  if (idleTime > idleMinutes * 60 * 1000) {
    await stopPod(podId, apiKey);
  }
}
```

### 3. Batch Processing
- Queue multiple videos
- Start pod once
- Process batch
- Shutdown

### 4. Model Optimization
- Use FLUX.1-schnell (fastest)
- Reduce inference steps (4-8 steps)
- Lower resolution when acceptable
- Cache models in volume

---

## 🔍 Health Checks

### Pod Health Monitor

```typescript
// src/services/cloudHealthMonitor.ts
export class CloudHealthMonitor {
  private podId: string;
  private apiKey: string;
  private checkInterval: number = 30000; // 30 seconds
  
  async checkHealth(): Promise<boolean> {
    try {
      const status = await getPodStatus(this.podId, this.apiKey);
      
      // Check if pod is running
      if (status.status !== 'RUNNING') {
        return false;
      }
      
      // Check ComfyUI API
      const response = await fetch(`${status.url}/system_stats`, {
        timeout: 5000,
      });
      
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  async startMonitoring(onHealthChange: (healthy: boolean) => void) {
    setInterval(async () => {
      const healthy = await this.checkHealth();
      onHealthChange(healthy);
    }, this.checkInterval);
  }
}
```

---

## 🚦 Next Steps

### Phase 2.2: Hybrid Backend Implementation
- [ ] Create backend selection logic
- [ ] Implement fallback mechanism
- [ ] Add backend status monitoring
- [ ] Create UI for backend switching

### Phase 2.3: Load Balancing & Auto-scaling
- [ ] Implement request queuing
- [ ] Auto-scale based on queue length
- [ ] Load balancer for multiple pods
- [ ] Cost tracking per backend

### Phase 2.4: Cloud Integration Testing
- [ ] Test video generation on cloud
- [ ] Verify fallback logic
- [ ] Performance benchmarks
- [ ] Cost validation

---

## 📝 Deployment Checklist

- [ ] RunPod account created
- [ ] API key obtained and stored
- [ ] Docker image built and pushed
- [ ] Pod deployed with RTX 3090
- [ ] Pod URL configured in .env.local
- [ ] ComfyUI accessible via cloud URL
- [ ] Models downloaded and working
- [ ] Health checks passing
- [ ] Cost tracking enabled
- [ ] Auto-shutdown configured

---

## 🔗 Resources

- [RunPod Documentation](https://docs.runpod.io/)
- [RunPod GraphQL API](https://graphql-spec.runpod.io/)
- [ComfyUI Docker Setup](https://github.com/comfyanonymous/ComfyUI#docker)
- [FLUX Model Guide](https://github.com/black-forest-labs/flux)

---

**Status:** 🚧 In Progress  
**Next:** Implement hybrid backend selection logic  
**Target:** Deploy and test cloud backend by end of Phase 2
