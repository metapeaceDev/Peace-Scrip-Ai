/**
 * Real-time Device Detection Hook
 *
 * Auto-detect GPU/CPU capabilities and recommend optimal backend
 */

import { useState, useEffect } from 'react';
import {
  detectSystemResources,
  type SystemResources,
  type DeviceType,
} from '../services/deviceManager';

export interface BackendRecommendation {
  name: string; // Display name
  type: 'local' | 'cloud-comfyui' | 'replicate' | 'gemini-veo' | 'huggingface';
  url?: string;
  cost: number; // USD per video
  speed: 'very-fast' | 'fast' | 'medium' | 'slow';
  quality: 'excellent' | 'high' | 'good' | 'moderate';
  reason: string;
  deviceUsed?: DeviceType;
}

export interface DeviceDetectionResult {
  resources: SystemResources | null;
  isDetecting: boolean;
  error: string | null;
  recommendedBackend: BackendRecommendation | null;
  allBackends: BackendRecommendation[];
}

/**
 * Hook for real-time device detection
 */
export function useDeviceDetection(): DeviceDetectionResult {
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function detect() {
      try {
        // 🔥 FORCE CLEANUP: Remove old Cloudflare URLs BEFORE detection
        const cachedUrl = localStorage.getItem('comfyui_url');
        if (cachedUrl && cachedUrl.includes('trycloudflare.com')) {
          console.warn(
            '🗑️ FORCE CLEANUP: Removing old Cloudflare URL from useDeviceDetection:',
            cachedUrl
          );
          localStorage.removeItem('comfyui_url');
        }

        console.log('🔍 Detecting system resources...');
        const detected = await detectSystemResources();

        if (mounted) {
          setResources(detected);
          setIsDetecting(false);
          console.log('✅ Device detection complete:', detected);

          // Save to localStorage for next session
          localStorage.setItem(
            'last_device_detection',
            JSON.stringify({
              timestamp: Date.now(),
              resources: detected,
            })
          );
        }
      } catch (err) {
        console.error('❌ Device detection failed:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsDetecting(false);

          // Try to load from localStorage
          const cached = localStorage.getItem('last_device_detection');
          if (cached) {
            const { resources: cachedResources } = JSON.parse(cached);
            setResources(cachedResources);
            console.log('ℹ️ Using cached device detection');
          }
        }
      }
    }

    detect();

    return () => {
      mounted = false;
    };
  }, []);

  // Calculate recommended backend based on detected resources
  const recommendedBackend = resources ? selectOptimalBackend(resources) : null;
  const allBackends = resources ? getAllBackendOptions(resources) : [];

  return {
    resources,
    isDetecting,
    error,
    recommendedBackend,
    allBackends,
  };
}

/**
 * Select optimal backend based on system resources
 */
function selectOptimalBackend(resources: SystemResources): BackendRecommendation {
  const hasGPU = resources.devices.some(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  const gpuDevice = resources.devices.find(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  // Priority 1: Local ComfyUI with GPU (FREE + FAST)
  if (hasGPU && isLocalComfyUIRunning()) {
    return {
      name: 'Local ComfyUI (FREE)',
      type: 'local',
      url: 'http://localhost:8188',
      cost: 0,
      speed: gpuDevice?.type === 'cuda' ? 'very-fast' : 'fast',
      quality: 'excellent',
      reason: `Your ${gpuDevice?.name || 'GPU'} detected - using local ComfyUI (FREE)`,
      deviceUsed: gpuDevice?.type,
    };
  }

  // Priority 2: Cloud ComfyUI (LOW COST + FAST)
  const cloudUrl = import.meta.env.VITE_COMFYUI_CLOUD_URL;
  if (cloudUrl && cloudUrl !== '') {
    return {
      name: 'Cloud ComfyUI',
      type: 'cloud-comfyui',
      url: cloudUrl,
      cost: 0.02,
      speed: 'fast',
      quality: 'excellent',
      reason: hasGPU
        ? 'Local ComfyUI not running - using cloud ComfyUI ($0.02/video)'
        : 'No local GPU - using cloud ComfyUI ($0.02/video)',
    };
  }

  // Priority 3: Replicate Hotshot-XL (MEDIUM COST + MEDIUM SPEED)
  const replicateKey = import.meta.env.VITE_REPLICATE_API_KEY;
  if (replicateKey && replicateKey !== '') {
    return {
      name: 'Replicate Hotshot-XL',
      type: 'replicate',
      cost: 0.018,
      speed: 'medium',
      quality: 'good',
      reason: 'Cloud ComfyUI unavailable - using Replicate Hotshot-XL ($0.018/video)',
    };
  }

  // Priority 4: Gemini Veo (HIGH COST + HIGH QUALITY)
  // Note: This will be used as fallback in geminiService.ts
  return {
    name: 'Gemini Veo 3.1',
    type: 'gemini-veo',
    cost: 0.5,
    speed: 'medium',
    quality: 'excellent',
    reason: 'Using Gemini Veo 3.1 (premium quality, $0.50/video)',
  };
}

/**
 * Get all available backend options sorted by preference
 */
function getAllBackendOptions(resources: SystemResources): BackendRecommendation[] {
  const options: BackendRecommendation[] = [];

  const hasGPU = resources.devices.some(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  const gpuDevice = resources.devices.find(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  // Option 1: Local ComfyUI
  if (hasGPU) {
    options.push({
      name: 'Local ComfyUI (FREE)',
      type: 'local',
      url: 'http://localhost:8188',
      cost: 0,
      speed: gpuDevice?.type === 'cuda' ? 'very-fast' : 'fast',
      quality: 'excellent',
      reason: `Use your ${gpuDevice?.name || 'GPU'} (FREE)`,
      deviceUsed: gpuDevice?.type,
    });
  }

  // Option 2: Cloud ComfyUI
  const cloudUrl = import.meta.env.VITE_COMFYUI_CLOUD_URL;
  if (cloudUrl && cloudUrl !== '') {
    options.push({
      name: 'Cloud ComfyUI',
      type: 'cloud-comfyui',
      url: cloudUrl,
      cost: 0.02,
      speed: 'fast',
      quality: 'excellent',
      reason: 'Cloud GPU (RTX 3090)',
    });
  }

  // Option 3: Replicate Hotshot-XL
  options.push({
    name: 'Replicate Hotshot-XL',
    type: 'replicate',
    cost: 0.018,
    speed: 'medium',
    quality: 'good',
    reason: 'Fast & cheap GIF animations',
  });

  // Option 4: HuggingFace (FREE but rate limited)
  options.push({
    name: 'HuggingFace Spaces',
    type: 'huggingface',
    cost: 0,
    speed: 'slow',
    quality: 'moderate',
    reason: 'FREE tier (rate limited)',
  });

  // Option 5: Gemini Veo (Premium)
  options.push({
    name: 'Gemini Veo 3.1',
    type: 'gemini-veo',
    cost: 0.5,
    speed: 'medium',
    quality: 'excellent',
    reason: 'Premium quality (720p, 30-120s)',
  });

  return options;
}

/**
 * Check if local ComfyUI is running
 */
function isLocalComfyUIRunning(): boolean {
  // Check localStorage cache first (faster)
  const cachedStatus = localStorage.getItem('comfyui_local_status');
  if (cachedStatus) {
    const { timestamp, running } = JSON.parse(cachedStatus);
    // Cache valid for 30 seconds
    if (Date.now() - timestamp < 30000) {
      return running;
    }
  }

  // Will be checked async by backend selection logic
  return false;
}

/**
 * Check if backend is healthy (async version)
 */
export async function checkBackendHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const healthy = response.ok;

    // Cache result
    if (url.includes('localhost:8188')) {
      localStorage.setItem(
        'comfyui_local_status',
        JSON.stringify({
          timestamp: Date.now(),
          running: healthy,
        })
      );
    }

    return healthy;
  } catch (error) {
    return false;
  }
}

/**
 * Format device info for display
 */
export function formatDeviceInfo(device: SystemResources['devices'][0]): string {
  const parts = [device.name];

  if (device.vram) {
    parts.push(`${Math.round(device.vram / 1024)} GB VRAM`);
  }

  if (device.utilization !== undefined) {
    parts.push(`${device.utilization}% used`);
  }

  if (device.temperature !== undefined) {
    parts.push(`${device.temperature}°C`);
  }

  return parts.join(' • ');
}

/**
 * Get device recommendation emoji
 */
export function getDeviceEmoji(type: DeviceType): string {
  switch (type) {
    case 'cuda':
      return '🎮'; // NVIDIA GPU
    case 'mps':
      return '🍎'; // Apple Silicon
    case 'directml':
      return '🪟'; // Windows AMD/Intel
    case 'cpu':
      return '💻'; // CPU fallback
    default:
      return '❓';
  }
}

/**
 * Get backend recommendation emoji
 */
export function getBackendEmoji(type: BackendRecommendation['type']): string {
  switch (type) {
    case 'local':
      return '💻'; // Local GPU
    case 'cloud-comfyui':
      return '☁️'; // Cloud GPU
    case 'replicate':
      return '🔄'; // Replicate API
    case 'gemini-veo':
      return '🌟'; // Premium
    case 'huggingface':
      return '🤗'; // HuggingFace
    default:
      return '🎬';
  }
}
