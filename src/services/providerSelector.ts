import type {
  ImageProvider,
  VideoProvider,
  AutoSelectionCriteria,
  ProviderStatus,
} from '../../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const COMFYUI_API_URL = import.meta.env.VITE_COMFYUI_API_URL || 'http://localhost:8188';
const COMFYUI_ENABLED = import.meta.env.VITE_COMFYUI_ENABLED === 'true';

interface ProviderConfig {
  displayName: string;
  checkQuota: () => Promise<'available' | 'low' | 'exhausted' | undefined>;
  checkAvailability: () => Promise<boolean>;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'excellent' | 'good' | 'fair';
  estimatedTime: string;
}

// Provider configurations
// NEW ORDER: ComfyUI is now Tier 1 (best for Face ID, LoRA, unlimited)
const IMAGE_PROVIDERS: Record<Exclude<ImageProvider, 'auto'>, ProviderConfig> = {
  comfyui: {
    displayName: 'ComfyUI + LoRA (Recommended)',
    checkQuota: async () => undefined, // No quota for local
    checkAvailability: async () => {
      if (!COMFYUI_ENABLED) return false;
      try {
        const response = await fetch(`${COMFYUI_API_URL}/system_stats`, {
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    speed: 'medium', // Updated from 'slow' - modern GPUs are fast
    quality: 'excellent',
    estimatedTime: '15-30s', // Updated from 30-60s
  },
  'gemini-2.5': {
    displayName: 'Gemini 2.5 Flash Image',
    checkQuota: async () => {
      // Check Gemini quota (simplified - you may want to track actual usage)
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image?key=${GEMINI_API_KEY}`
        );
        return response.ok ? 'available' : 'exhausted';
      } catch {
        return 'exhausted';
      }
    },
    checkAvailability: async () => !!GEMINI_API_KEY,
    speed: 'fast',
    quality: 'excellent',
    estimatedTime: '5-10s',
  },
  'gemini-2.0': {
    displayName: 'Gemini 2.0 Flash Exp',
    checkQuota: async () => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation?key=${GEMINI_API_KEY}`
        );
        return response.ok ? 'available' : 'exhausted';
      } catch {
        return 'exhausted';
      }
    },
    checkAvailability: async () => !!GEMINI_API_KEY,
    speed: 'fast',
    quality: 'excellent',
    estimatedTime: '5-10s',
  },
  'stable-diffusion': {
    displayName: 'Stable Diffusion (Pollinations.ai)',
    checkQuota: async () => undefined, // No quota for free API
    checkAvailability: async () => {
      try {
        // Test with a simple request (ใช้ HEAD request)
        const response = await fetch(
          'https://image.pollinations.ai/prompt/test?width=64&height=64&nologo=true',
          {
            method: 'HEAD',
          }
        );
        return response.ok;
      } catch {
        return true; // Assume available if HEAD fails (CORS บล็อก HEAD แต่ GET ได้)
      }
    },
    speed: 'fast',
    quality: 'excellent',
    estimatedTime: '3-8s',
  },
};

const VIDEO_PROVIDERS: Record<Exclude<VideoProvider, 'auto'>, ProviderConfig> = {
  'gemini-veo': {
    displayName: 'Gemini Veo 3.1',
    checkQuota: async () => {
      // Veo doesn't have a simple quota check endpoint, skip it
      return undefined;
    },
    checkAvailability: async () => !!GEMINI_API_KEY,
    speed: 'medium',
    quality: 'excellent',
    estimatedTime: '60-120s',
  },
  'comfyui-svd': {
    displayName: 'ComfyUI + SVD + LoRA (Local)',
    checkQuota: async () => undefined,
    checkAvailability: async () => {
      if (!COMFYUI_ENABLED) return false;
      try {
        const response = await fetch(`${COMFYUI_API_URL}/system_stats`);
        return response.ok;
      } catch {
        return false;
      }
    },
    speed: 'slow',
    quality: 'excellent',
    estimatedTime: '120-300s',
  },
};

/**
 * Get the status of a specific provider
 */
export async function getProviderStatus(
  provider: ImageProvider | VideoProvider,
  type: 'image' | 'video'
): Promise<ProviderStatus> {
  if (provider === 'auto') {
    return {
      provider: 'auto',
      displayName: 'Auto Selection',
      available: true,
      lastChecked: new Date(),
    };
  }

  const config =
    type === 'image'
      ? IMAGE_PROVIDERS[provider as Exclude<ImageProvider, 'auto'>]
      : VIDEO_PROVIDERS[provider as Exclude<VideoProvider, 'auto'>];

  if (!config) {
    return {
      provider,
      displayName: provider,
      available: false,
      lastChecked: new Date(),
    };
  }

  const [quota, available] = await Promise.all([config.checkQuota(), config.checkAvailability()]);

  return {
    provider,
    displayName: config.displayName,
    available,
    quota,
    speed: config.speed,
    quality: config.quality,
    estimatedTime: config.estimatedTime,
    lastChecked: new Date(),
  };
}

/**
 * Get recommended provider based on criteria
 */
export function getRecommendedProvider(
  statuses: ProviderStatus[],
  criteria: AutoSelectionCriteria
): ProviderStatus | undefined {
  // Filter to only available providers with good quota
  const availableProviders = statuses.filter(
    s => s.available && (!s.quota || s.quota !== 'exhausted')
  );

  if (availableProviders.length === 0) {
    return statuses.find(s => s.available); // Fallback to any available
  }

  switch (criteria) {
    case 'speed':
      return availableProviders.sort((a, b) => {
        const speedOrder: Record<string, number> = { fast: 0, medium: 1, slow: 2 };
        const aSpeed = a.speed || 'medium';
        const bSpeed = b.speed || 'medium';
        const aOrder = speedOrder[aSpeed] ?? 1;
        const bOrder = speedOrder[bSpeed] ?? 1;
        return aOrder - bOrder;
      })[0];

    case 'quality':
      return availableProviders.sort((a, b) => {
        const qualityOrder: Record<string, number> = { excellent: 0, good: 1, fair: 2 };
        const aQuality = a.quality || 'good';
        const bQuality = b.quality || 'good';
        const aOrder = qualityOrder[aQuality] ?? 1;
        const bOrder = qualityOrder[bQuality] ?? 1;
        return aOrder - bOrder;
      })[0];

    case 'balanced':
      // Balanced: prefer available quota + good speed + good quality
      return availableProviders.sort((a, b) => {
        const scoreA = calculateBalancedScore(a);
        const scoreB = calculateBalancedScore(b);
        return scoreB - scoreA; // Higher score is better
      })[0];

    default:
      return availableProviders[0];
  }
}

function calculateBalancedScore(status: ProviderStatus): number {
  let score = 0;

  // Quota weight: 40%
  if (status.quota === 'available') score += 40;
  else if (status.quota === 'low') score += 20;

  // Speed weight: 30%
  if (status.speed === 'fast') score += 30;
  else if (status.speed === 'medium') score += 20;
  else if (status.speed === 'slow') score += 10;

  // Quality weight: 30%
  if (status.quality === 'excellent') score += 30;
  else if (status.quality === 'good') score += 20;
  else if (status.quality === 'fair') score += 10;

  return score;
}

/**
 * Select the best provider based on user settings
 * NEW: ComfyUI is prioritized for auto-selection
 */
export async function selectProvider(
  userPreference: ImageProvider | VideoProvider,
  type: 'image' | 'video',
  criteria: AutoSelectionCriteria
): Promise<{ provider: string; displayName: string }> {
  // If user selected specific provider (not auto), use it
  if (userPreference !== 'auto') {
    const status = await getProviderStatus(userPreference, type);
    return {
      provider: userPreference,
      displayName: status.displayName,
    };
  }

  // Auto-selection: get all statuses and recommend
  // NEW ORDER: ComfyUI first, then Gemini, then Pollinations
  const providers =
    type === 'image'
      ? (['comfyui', 'gemini-2.5', 'gemini-2.0', 'stable-diffusion'] as ImageProvider[])
      : (['comfyui-svd', 'gemini-veo'] as VideoProvider[]);

  const statuses = await Promise.all(providers.map(p => getProviderStatus(p, type)));

  const recommended = getRecommendedProvider(statuses, criteria);

  if (recommended) {
    return {
      provider: recommended.provider,
      displayName: recommended.displayName,
    };
  }

  // Fallback to first provider
  return {
    provider: providers[0],
    displayName: statuses[0]?.displayName || providers[0],
  };
}
