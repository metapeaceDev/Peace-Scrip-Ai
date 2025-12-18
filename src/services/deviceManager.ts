/**
 * ComfyUI Device Manager
 *
 * จัดการการตรวจจับและเลือกใช้ทรัพยากร CPU/GPU สำหรับการ render
 */

import { getSavedComfyUIUrl } from './comfyuiInstaller';

export type DeviceType = 'cpu' | 'cuda' | 'mps' | 'directml' | 'auto';
export type ExecutionMode = 'local' | 'cloud' | 'hybrid';
export type CloudProvider = 'firebase' | 'colab' | 'runpod' | 'replicate' | 'auto';

export interface DeviceInfo {
  type: DeviceType;
  name: string;
  available: boolean;
  vram?: number; // MB
  utilization?: number; // %
  temperature?: number; // °C
  isRecommended?: boolean;
}

export interface SystemResources {
  devices: DeviceInfo[];
  cpu: {
    cores: number;
    usage: number; // %
  };
  memory: {
    total: number; // MB
    available: number; // MB
    used: number; // MB
  };
  platform: 'windows' | 'macos' | 'linux' | 'unknown';
}

export interface RenderSettings {
  device: DeviceType;
  executionMode: ExecutionMode;
  cloudProvider: CloudProvider; // NEW: เลือก cloud service
  useLowVRAM: boolean;
  batchSize: number;
  preview: boolean;
}

const COMFYUI_CLOUD_URL = import.meta.env.VITE_COMFYUI_CLOUD_URL;
const COLAB_TUNNEL_URL = import.meta.env.VITE_COLAB_TUNNEL_URL; // ngrok/cloudflare tunnel from Colab
const RUNPOD_URL = import.meta.env.VITE_RUNPOD_URL; // RunPod endpoint
const REPLICATE_URL = import.meta.env.VITE_REPLICATE_URL; // Replicate API

/**
 * ตรวจสอบทรัพยากรระบบจาก ComfyUI
 */
export async function detectSystemResources(): Promise<SystemResources> {
  try {
    // ตรวจสอบ ComfyUI local (ใช้ getSavedComfyUIUrl() เพื่อ auto-cleanup URL เก่า)
    const COMFYUI_URL = getSavedComfyUIUrl();
    const response = await fetch(`${COMFYUI_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error('ComfyUI not responding');
    }

    const stats = await response.json();
    console.log('🖥️ ComfyUI System Stats:', stats);

    // แปลงข้อมูลจาก ComfyUI
    const devices: DeviceInfo[] = [];
    const system = stats.system || {};
    const deviceInfo = stats.devices || {};

    // ตรวจสอบ CUDA (NVIDIA)
    if (deviceInfo.cuda || system.cuda_version) {
      devices.push({
        type: 'cuda',
        name: deviceInfo.cuda?.name || 'NVIDIA GPU',
        available: true,
        vram: deviceInfo.cuda?.vram_total
          ? Math.round(deviceInfo.cuda.vram_total / 1024 / 1024)
          : undefined,
        utilization: deviceInfo.cuda?.gpu_utilization,
        temperature: deviceInfo.cuda?.temperature,
        isRecommended: true, // CUDA เป็นตัวเลือกแรกสำหรับ NVIDIA
      });
    }

    // ตรวจสอบ MPS (Apple Silicon)
    if (deviceInfo.mps || system.os?.includes('Darwin')) {
      const isMac = system.os?.includes('Darwin') || navigator.platform.includes('Mac');
      devices.push({
        type: 'mps',
        name: 'Apple Silicon GPU',
        available: isMac,
        isRecommended: isMac, // MPS เป็นตัวเลือกแรกสำหรับ Mac
      });
    }

    // ตรวจสอบ DirectML (Windows AMD/Intel)
    if (deviceInfo.directml || (system.os?.includes('Windows') && !deviceInfo.cuda)) {
      devices.push({
        type: 'directml',
        name: 'DirectML GPU',
        available: true,
        isRecommended: !deviceInfo.cuda, // ใช้ DirectML ถ้าไม่มี CUDA
      });
    }

    // CPU เป็นตัวเลือกสำรอง
    devices.push({
      type: 'cpu',
      name: 'CPU',
      available: true,
      isRecommended: devices.length === 0, // ถ้าไม่มี GPU ให้แนะนำ CPU
    });

    // ข้อมูล CPU
    const cpuInfo = {
      cores: system.cpu_count || navigator.hardwareConcurrency || 4,
      usage: deviceInfo.cpu?.usage || 0,
    };

    // ข้อมูล Memory
    const memoryInfo = {
      total: system.ram?.total ? Math.round(system.ram.total / 1024 / 1024) : 8192,
      available: system.ram?.free ? Math.round(system.ram.free / 1024 / 1024) : 4096,
      used: system.ram?.used ? Math.round(system.ram.used / 1024 / 1024) : 4096,
    };

    // ตรวจสอบ Platform
    let platform: 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown';
    if (system.os?.includes('Windows')) platform = 'windows';
    else if (system.os?.includes('Darwin')) platform = 'macos';
    else if (system.os?.includes('Linux')) platform = 'linux';

    return {
      devices,
      cpu: cpuInfo,
      memory: memoryInfo,
      platform,
    };
  } catch (error) {
    console.warn('⚠️ ไม่สามารถตรวจสอบทรัพยากรจาก ComfyUI:', error);

    // Fallback: ให้ข้อมูลพื้นฐานจาก browser
    return getFallbackResources();
  }
}

/**
 * ข้อมูลทรัพยากรพื้นฐานเมื่อไม่สามารถเชื่อมต่อ ComfyUI
 */
function getFallbackResources(): SystemResources {
  const platform = navigator.platform.toLowerCase();
  let detectedPlatform: 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown';

  if (platform.includes('win')) detectedPlatform = 'windows';
  else if (platform.includes('mac')) detectedPlatform = 'macos';
  else if (platform.includes('linux')) detectedPlatform = 'linux';

  const devices: DeviceInfo[] = [
    {
      type: 'cpu',
      name: 'CPU (Fallback)',
      available: true,
      isRecommended: true,
    },
  ];

  // เดาว่ามี GPU หรือไม่จากระบบปฏิบัติการ
  if (detectedPlatform === 'macos') {
    devices.unshift({
      type: 'mps',
      name: 'Apple Silicon GPU (Not Verified)',
      available: false,
      isRecommended: false,
    });
  }

  return {
    devices,
    cpu: {
      cores: navigator.hardwareConcurrency || 4,
      usage: 0,
    },
    memory: {
      total: 8192, // Assume 8GB
      available: 4096,
      used: 4096,
    },
    platform: detectedPlatform,
  };
}

/**
 * แนะนำการตั้งค่าที่เหมาะสมตามทรัพยากรที่มี
 */
export function getRecommendedSettings(resources: SystemResources): RenderSettings {
  const recommendedDevice = resources.devices.find(d => d.isRecommended && d.available);
  const hasGPU = resources.devices.some(d => d.type !== 'cpu' && d.available);

  return {
    device: recommendedDevice?.type || 'cpu',
    executionMode: hasGPU ? 'local' : 'cloud',
    cloudProvider: 'auto', // Default: auto-select best cloud
    useLowVRAM: resources.memory.available < 6144, // < 6GB RAM
    batchSize: hasGPU ? 1 : 1,
    preview: hasGPU,
  };
}

/**
 * ตรวจสอบว่า ComfyUI ทำงานปกติหรือไม่
 */
export async function checkComfyUIHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  local: boolean;
  cloud: boolean;
  message: string;
  resources?: SystemResources;
}> {
  let localAvailable = false;
  let cloudAvailable = false;
  let resources: SystemResources | undefined;

  // ตรวจสอบ Local ComfyUI (ใช้ getSavedComfyUIUrl() เพื่อ auto-cleanup URL เก่า)
  try {
    const COMFYUI_URL = getSavedComfyUIUrl();
    const localResponse = await fetch(`${COMFYUI_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });

    if (localResponse.ok) {
      localAvailable = true;
      resources = await detectSystemResources();
    }
  } catch (error) {
    console.log('ℹ️ Local ComfyUI not available');
  }

  // ตรวจสอบ Cloud ComfyUI
  if (COMFYUI_CLOUD_URL) {
    try {
      const cloudResponse = await fetch(`${COMFYUI_CLOUD_URL}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });

      if (cloudResponse.ok) {
        cloudAvailable = true;
      }
    } catch (error) {
      console.log('ℹ️ Cloud ComfyUI not available');
    }
  }

  // ประเมินสถานะ
  if (localAvailable && cloudAvailable) {
    return {
      status: 'healthy',
      local: true,
      cloud: true,
      message: '✅ ComfyUI ทำงานปกติทั้ง Local และ Cloud',
      resources,
    };
  } else if (localAvailable) {
    return {
      status: 'healthy',
      local: true,
      cloud: false,
      message: '✅ ComfyUI ทำงานปกติ (Local only)',
      resources,
    };
  } else if (cloudAvailable) {
    return {
      status: 'degraded',
      local: false,
      cloud: true,
      message: '⚠️ ComfyUI Cloud เท่านั้น (Local ไม่พร้อมใช้งาน)',
      resources: getFallbackResources(),
    };
  } else {
    return {
      status: 'down',
      local: false,
      cloud: false,
      message: '❌ ComfyUI ไม่พร้อมใช้งาน',
      resources: getFallbackResources(),
    };
  }
}

/**
 * บันทึกการตั้งค่า render
 */
export function saveRenderSettings(settings: RenderSettings): void {
  localStorage.setItem('peace_render_settings', JSON.stringify(settings));
}

/**
 * โหลดการตั้งค่า render
 */
export function loadRenderSettings(): RenderSettings | null {
  const saved = localStorage.getItem('peace_render_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * แปลง device type เป็นชื่อที่อ่านง่าย
 */
export function getDeviceDisplayName(device: DeviceType): string {
  const names: Record<DeviceType, string> = {
    cpu: 'CPU',
    cuda: 'NVIDIA GPU (CUDA)',
    mps: 'Apple Silicon GPU (MPS)',
    directml: 'DirectML GPU',
    auto: 'อัตโนมัติ (แนะนำ)',
  };
  return names[device] || device;
}

/**
 * ประมาณเวลาในการ render ตาม device
 */
export function estimateRenderTime(device: DeviceType, imageCount: number = 1): string {
  const baseTime = {
    cuda: 15, // seconds per image
    mps: 30,
    directml: 45,
    cpu: 120,
    auto: 30,
  };

  const totalSeconds = (baseTime[device] || 60) * imageCount;

  if (totalSeconds < 60) {
    return `~${totalSeconds} วินาที`;
  } else if (totalSeconds < 3600) {
    return `~${Math.round(totalSeconds / 60)} นาที`;
  } else {
    return `~${Math.round(totalSeconds / 3600)} ชั่วโมง`;
  }
}

/**
 * Cloud Provider Information
 */
export interface CloudProviderInfo {
  id: CloudProvider;
  name: string;
  description: string;
  speed: string;
  cost: string;
  gpu: string;
  setupRequired: boolean;
  available: boolean;
}

/**
 * รายการ Cloud Providers ที่รองรับ
 */
export function getCloudProviders(): CloudProviderInfo[] {
  return [
    {
      id: 'firebase',
      name: 'Firebase Functions',
      description: 'ComfyUI บน Cloud Functions (เซิร์ฟเวอร์ของเรา)',
      speed: '⚡⚡ เร็ว (30-60 วินาที)',
      cost: '💰 ฟรีสำหรับผู้ใช้ Pro+',
      gpu: 'T4 GPU',
      setupRequired: false,
      available: !!COMFYUI_CLOUD_URL,
    },
    {
      id: 'colab',
      name: 'Google Colab Pro+',
      description: 'ใช้ Colab Pro+ ของคุณ (คุ้มที่สุด!)',
      speed: '⚡⚡⚡ เร็วมาก (15-30 วินาที)',
      cost: '💰 ฟรี (ใช้ subscription ของคุณ)',
      gpu: 'A100/V100 GPU',
      setupRequired: true,
      available: !!COLAB_TUNNEL_URL,
    },
    {
      id: 'runpod',
      name: 'RunPod Serverless',
      description: 'GPU Cloud แบบจ่ายตามใช้',
      speed: '⚡⚡⚡ เร็วมาก (10-20 วินาที)',
      cost: '💵 ~$0.0004/วินาที (~$0.01/รูป)',
      gpu: 'RTX 4090/A40',
      setupRequired: true,
      available: !!RUNPOD_URL,
    },
    {
      id: 'replicate',
      name: 'Replicate API',
      description: 'API สำเร็จรูป ใช้ง่าย',
      speed: '⚡⚡ เร็ว (20-40 วินาที)',
      cost: '💵 ~$0.023/รูป',
      gpu: 'T4 GPU',
      setupRequired: true,
      available: !!REPLICATE_URL,
    },
  ];
}

/**
 * ตรวจสอบว่า Cloud Provider พร้อมใช้งานหรือไม่
 */
export async function checkCloudProvider(provider: CloudProvider): Promise<{
  available: boolean;
  message: string;
  latency?: number; // milliseconds
}> {
  const startTime = Date.now();

  try {
    let url: string | undefined;

    switch (provider) {
      case 'firebase':
        url = COMFYUI_CLOUD_URL;
        break;
      case 'colab':
        url = COLAB_TUNNEL_URL;
        break;
      case 'runpod':
        url = RUNPOD_URL;
        break;
      case 'replicate':
        url = REPLICATE_URL;
        break;
      case 'auto': {
        // ลองทุก provider
        const providers = getCloudProviders().filter(p => p.available);
        if (providers.length === 0) {
          return { available: false, message: 'ไม่มี Cloud Provider ที่ตั้งค่าไว้' };
        }
        return { available: true, message: `พบ ${providers.length} provider(s)` };
      }
    }

    if (!url) {
      return {
        available: false,
        message: 'ยังไม่ได้ตั้งค่า URL (เพิ่มใน .env)',
      };
    }

    // Health check
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        available: true,
        message: '✅ พร้อมใช้งาน',
        latency,
      };
    } else {
      return {
        available: false,
        message: `❌ ตอบกลับ HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      available: false,
      message: '❌ ไม่สามารถเชื่อมต่อได้',
    };
  }
}

/**
 * แนะนำ Cloud Provider ที่ดีที่สุด
 */
export async function getRecommendedCloudProvider(): Promise<CloudProvider> {
  const providers = getCloudProviders().filter(p => p.available);

  if (providers.length === 0) {
    return 'auto';
  }

  // ลำดับความสำคัญ: Colab Pro+ > Firebase > RunPod > Replicate
  // เพราะ Colab คุณจ่ายแล้ว ใช้ให้คุ้ม!
  for (const provider of ['colab', 'firebase', 'runpod', 'replicate'] as CloudProvider[]) {
    const info = providers.find(p => p.id === provider);
    if (info?.available) {
      // ตรวจสอบว่าพร้อมใช้งานจริงหรือไม่
      const status = await checkCloudProvider(provider);
      if (status.available) {
        return provider;
      }
    }
  }

  return 'auto';
}
