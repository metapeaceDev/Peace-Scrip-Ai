/**
 * ComfyUI Model Selector Service
 *
 * Automatically selects the optimal AI model based on:
 * - User preference (speed/balanced/quality/best)
 * - Available VRAM
 * - Hardware capabilities
 *
 * Part of Cost Optimization initiative
 */

export interface ModelProfile {
  checkpoint: string;
  steps: number;
  cfg: number;
  resolution: string;
  estimatedTime: string;
  quality: string;
  vramRequired: number; // in GB
  cost: number; // ฿ per generation
  description: string;
}

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  SPEED: {
    checkpoint: 'sd_xl_turbo_1.0.safetensors',
    steps: 4,
    cfg: 1.0,
    resolution: '1024x1024',
    estimatedTime: '5s',
    quality: '⭐⭐⭐',
    vramRequired: 6,
    cost: 0,
    description: 'Ultra-fast generation for quick previews and iteration',
  },

  BALANCED: {
    checkpoint: 'sd_xl_base_1.0.safetensors',
    steps: 20,
    cfg: 7.0,
    resolution: '1024x1024',
    estimatedTime: '15s',
    quality: '⭐⭐⭐⭐',
    vramRequired: 8,
    cost: 0,
    description: 'Good balance between speed and quality',
  },

  QUALITY: {
    checkpoint: 'flux1-schnell.safetensors',
    steps: 8,
    cfg: 3.5,
    resolution: '1024x1024',
    estimatedTime: '20s',
    quality: '⭐⭐⭐⭐⭐',
    vramRequired: 12,
    cost: 0,
    description: 'Excellent quality with reasonable speed (FLUX schnell)',
  },

  BEST: {
    checkpoint: 'flux1-dev.safetensors',
    steps: 28,
    cfg: 3.5,
    resolution: '2048x2048',
    estimatedTime: '45s',
    quality: '⭐⭐⭐⭐⭐',
    vramRequired: 16,
    cost: 0,
    description: 'Maximum quality, slower generation (FLUX dev)',
  },
};

export type ModelPreference = 'speed' | 'balanced' | 'quality' | 'best';

/**
 * Detect available VRAM via backend API or browser heuristics
 */
export async function detectAvailableVRAM(): Promise<number> {
  // Try to get actual VRAM from backend API
  try {
    const backendUrl = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/system/gpu-info`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      const vramGB = data.vram_total_gb || data.vram_gb || data.memory_gb;

      if (typeof vramGB === 'number' && vramGB > 0) {
        console.log(`🎮 Detected GPU VRAM: ${vramGB}GB`);
        return vramGB;
      }
    }
  } catch (error) {
    // Backend not available or doesn't support GPU info
    console.log('ℹ️ Could not detect VRAM from backend, using heuristics');
  }

  // Fallback: Try WebGPU API (if available)
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const info = await adapter.requestAdapterInfo();
        // WebGPU doesn't directly expose VRAM, but we can make educated guesses
        console.log('🎮 WebGPU adapter detected:', info);
      }
    } catch (error) {
      // WebGPU not supported or failed
    }
  }

  // Fallback: Heuristic based on platform
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('mac')) {
    // Mac typically has 8-16GB unified memory
    // M1/M2/M3 Macs: 8GB (base), 16GB (common), 24GB+ (high-end)
    return 16;
  }

  // Default to 8GB (most modern GPUs have at least this)
  return 8;
}

/**
 * Select optimal model based on user preference and hardware
 */
export function selectOptimalModel(
  userPreference: ModelPreference,
  availableVRAM?: number
): ModelProfile {
  const vram = availableVRAM || 8; // Default 8GB
  const preferredProfile = MODEL_PROFILES[userPreference.toUpperCase()];

  // If enough VRAM, return preferred model
  if (preferredProfile.vramRequired <= vram) {
    return preferredProfile;
  }

  // Downgrade to model that fits in VRAM
  if (vram >= 12) return MODEL_PROFILES.QUALITY;
  if (vram >= 8) return MODEL_PROFILES.BALANCED;
  return MODEL_PROFILES.SPEED;
}

/**
 * Get all available models that fit in VRAM
 */
export function getAvailableModels(availableVRAM: number): ModelProfile[] {
  return Object.values(MODEL_PROFILES).filter(profile => profile.vramRequired <= availableVRAM);
}

/**
 * Calculate cost savings vs Cloud APIs
 */
export function calculateCostSavings(
  generationsCount: number,
  modelProfile: ModelProfile
): {
  opensourceCost: number;
  cloudCost: number;
  savings: number;
  savingsPercent: number;
} {
  const opensourceCost = generationsCount * modelProfile.cost; // ฿0
  const cloudCost = generationsCount * 1.4; // Gemini Imagen ฿1.40 per image
  const savings = cloudCost - opensourceCost;
  const savingsPercent = (savings / cloudCost) * 100;

  return {
    opensourceCost,
    cloudCost,
    savings,
    savingsPercent,
  };
}

/**
 * Get recommended model for use case
 */
export function getRecommendedModel(useCase: string): ModelProfile {
  const useCaseLower = useCase.toLowerCase();

  if (
    useCaseLower.includes('quick') ||
    useCaseLower.includes('preview') ||
    useCaseLower.includes('sketch')
  ) {
    return MODEL_PROFILES.SPEED;
  }

  if (
    useCaseLower.includes('final') ||
    useCaseLower.includes('production') ||
    useCaseLower.includes('client')
  ) {
    return MODEL_PROFILES.BEST;
  }

  if (useCaseLower.includes('storyboard') || useCaseLower.includes('scene')) {
    return MODEL_PROFILES.QUALITY;
  }

  // Default to balanced
  return MODEL_PROFILES.BALANCED;
}

/**
 * Format model info for display
 */
export function formatModelInfo(profile: ModelProfile): string {
  return `${profile.checkpoint}
Speed: ${profile.estimatedTime}
Quality: ${profile.quality}
Steps: ${profile.steps}
VRAM: ${profile.vramRequired}GB
Cost: ฿${profile.cost}/generation`;
}

/**
 * Check if model file exists on backend
 */
export async function checkModelAvailability(checkpoint: string): Promise<boolean> {
  try {
    const backendUrl = import.meta.env.VITE_COMFYUI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/models/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ checkpoint }),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      const isAvailable = data.available || data.exists || false;

      if (!isAvailable) {
        console.log(`⚠️ Model not found: ${checkpoint}`);
      }

      return isAvailable;
    }
  } catch (error) {
    // Backend not available or doesn't support model check
    console.log(`ℹ️ Could not verify model availability for: ${checkpoint}`);
  }

  // Fallback: Assume models in MODEL_PROFILES are available
  // This prevents blocking the UI when backend is offline
  const isInProfiles = Object.values(MODEL_PROFILES).some(
    profile => profile.checkpoint === checkpoint
  );

  return isInProfiles;
}

/**
 * Get model download instructions
 */
export function getDownloadInstructions(checkpoint: string): string {
  const instructions: Record<string, string> = {
    'sd_xl_turbo_1.0.safetensors': `
Download SDXL Turbo:
  bash scripts/download-sdxl-turbo.sh

Or manually:
  https://huggingface.co/stabilityai/sdxl-turbo
    `,

    'flux1-schnell.safetensors': `
Download FLUX.1-schnell:
  bash scripts/download-flux-schnell.sh

Or manually:
  https://huggingface.co/black-forest-labs/FLUX.1-schnell
    `,

    'flux1-dev.safetensors': `
Download FLUX.1-dev:
  https://huggingface.co/black-forest-labs/FLUX.1-dev
  Save to: ComfyUI/models/checkpoints/
    `,

    'sd_xl_base_1.0.safetensors': `
Download SDXL Base:
  https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
  Save to: ComfyUI/models/checkpoints/
    `,
  };

  return instructions[checkpoint] || 'Model download instructions not found';
}

// Export default for convenience
export default {
  MODEL_PROFILES,
  selectOptimalModel,
  detectAvailableVRAM,
  getAvailableModels,
  calculateCostSavings,
  getRecommendedModel,
  formatModelInfo,
  checkModelAvailability,
  getDownloadInstructions,
};
