/**
 * ComfyUI Device Manager
 *
 * จัดการการตรวจจับและเลือกใช้ทรัพยากร CPU/GPU สำหรับการ render
 */

import { parseError, retryWithBackoff, logError } from './errorHandler';
import { requestCache, CacheKeys, CacheTTL } from './requestCache';

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
const COMFYUI_SERVICE_URL = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';

/**
 * Parse ComfyUI stats response into SystemResources
 */
function parseComfyUIStats(stats: any): SystemResources {
  const toMB = (value: unknown): number | undefined => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num) || num <= 0) return undefined;
    // Heuristic: treat very large numbers as bytes
    if (num > 1024 * 1024 * 8) return Math.round(num / 1024 / 1024);
    // Otherwise assume already MB
    return Math.round(num);
  };

  // แปลงข้อมูลจาก ComfyUI
  const devices: DeviceInfo[] = [];
  const system = stats.system || {};
  const rawDevices = stats.devices;
  const deviceInfo = rawDevices && !Array.isArray(rawDevices) ? rawDevices : {};

  const deviceArray: any[] = Array.isArray(rawDevices) ? rawDevices : [];
  const cudaFromArray = deviceArray.find(d => {
    const type = String(d?.type || '').toLowerCase();
    const name = String(d?.name || '').toLowerCase();
    return (
      type === 'cuda' || name.includes('nvidia') || name.includes('geforce') || name.includes('rtx')
    );
  });
  const directmlFromArray = deviceArray.find(
    d => String(d?.type || '').toLowerCase() === 'directml'
  );

  // ตรวจสอบ CUDA (NVIDIA)
  if (cudaFromArray || deviceInfo.cuda || system.cuda_version) {
    devices.push({
      type: 'cuda',
      name: cudaFromArray?.name || deviceInfo.cuda?.name || 'NVIDIA GPU',
      available: true,
      vram: toMB(
        cudaFromArray?.vram_total ?? cudaFromArray?.vramTotal ?? deviceInfo.cuda?.vram_total
      ),
      utilization:
        cudaFromArray?.gpu_utilization ??
        cudaFromArray?.utilization ??
        deviceInfo.cuda?.gpu_utilization,
      temperature: cudaFromArray?.temperature ?? deviceInfo.cuda?.temperature,
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
  const osString = String(system.os || '');
  const osLower = osString.toLowerCase();
  const isWindows =
    osLower.includes('windows') || osLower.includes('win32') || osLower.startsWith('win');

  if (
    directmlFromArray ||
    deviceInfo.directml ||
    (isWindows && !deviceInfo.cuda && !cudaFromArray)
  ) {
    devices.push({
      type: 'directml',
      name: 'DirectML GPU',
      available: true,
      isRecommended: !deviceInfo.cuda && !cudaFromArray, // ใช้ DirectML ถ้าไม่มี CUDA
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
    total: toMB(system.ram?.total) ?? 8192,
    available: toMB(system.ram?.free) ?? 4096,
    used: toMB(system.ram?.used) ?? 4096,
  };

  // ตรวจสอบ Platform
  let platform: 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown';
  if (isWindows) platform = 'windows';
  else if (osLower.includes('darwin') || osLower.includes('mac')) platform = 'macos';
  else if (osLower.includes('linux')) platform = 'linux';

  return {
    devices,
    cpu: cpuInfo,
    memory: memoryInfo,
    platform,
  };
}

/**
 * ตรวจสอบทรัพยากรระบบจาก ComfyUI (with caching)
 */
export async function detectSystemResources(): Promise<SystemResources> {
  // Try cache first (30 second TTL for quick re-checks)
  return requestCache.cached(
    CacheKeys.systemResources(),
    async () => {
      try {
        // 🔥 FORCE CLEANUP: Remove old Cloudflare URLs BEFORE fetching
        const cachedUrl = localStorage.getItem('comfyui_url');
        if (cachedUrl && cachedUrl.includes('trycloudflare.com')) {
          console.warn(
            '🗑️ FORCE CLEANUP in detectSystemResources: Removing old Cloudflare URL:',
            cachedUrl
          );
          localStorage.removeItem('comfyui_url');
        }

        // Prefer proxy via comfyui-service to avoid ComfyUI CORS/403 (Origin header blocked)
        // This still gives us the same /system_stats payload shape.
        const response = await retryWithBackoff(
          () =>
            fetch(`${COMFYUI_SERVICE_URL}/health/system_stats`, {
              signal: AbortSignal.timeout(5000),
            }),
          {
            maxRetries: 2,
            retryDelay: 1000,
            logToConsole: true,
          }
        );

        if (!response.ok) {
          throw new Error(`ComfyUI backend proxy returned status ${response.status}`);
        }

        const stats = await response.json();
        console.log('🖥️ ComfyUI System Stats:', stats);

        return parseComfyUIStats(stats);
      } catch (error) {
        // Parse error and provide user-friendly message
        const comfyError = parseError(error, 'local-comfyui');

        // Log for debugging
        logError(comfyError, {
          operation: 'detectSystemResources',
          url: `${COMFYUI_SERVICE_URL}/health/system_stats`,
        });

        // Show suggestion if available
        if (comfyError.suggestion) {
          console.warn(`💡 Suggestion: ${comfyError.suggestion}`);
        }

        // Fallback: ให้ข้อมูลพื้นฐานจาก browser
        console.info('🔄 Using fallback browser-based detection...');
        return getFallbackResources();
      }
    },
    CacheTTL.short // 30 seconds cache
  );
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

  // Helper function to silently fetch without console errors
  const silentFetch = async (url: string, timeout: number): Promise<Response | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      // Silently ignore network errors
      return null;
    }
  };

  // ตรวจสอบ Local ComfyUI (ใช้ getSavedComfyUIUrl() เพื่อ auto-cleanup URL เก่า)
  try {
    // Browser clients should NOT call ComfyUI directly (CORS/Origin 403). Use the backend proxy.
    const localResponse = await silentFetch(`${COMFYUI_SERVICE_URL}/health/system_stats`, 3000);

    if (localResponse?.ok) {
      localAvailable = true;
      resources = await detectSystemResources();
    }
  } catch (error) {
    // Silent - no need to log
  }

  // ตรวจสอบ Cloud ComfyUI
  if (COMFYUI_CLOUD_URL) {
    try {
      const cloudResponse = await silentFetch(`${COMFYUI_CLOUD_URL}/system_stats`, 5000);

      if (cloudResponse?.ok) {
        cloudAvailable = true;
      }
    } catch (error) {
      // Silent - no need to log
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
