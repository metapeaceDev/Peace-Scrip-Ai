/**
 * Usage Tracking Service
 *
 * Tracks user resource consumption (images, videos, storage, API calls)
 * Enforces tier-based limits and provides usage analytics
 */

import { SubscriptionTier } from '../../types';
import { getUserSubscription } from './userStore';

export interface UsageStats {
  images: {
    generated: number;
    failed: number;
    totalCreditsUsed: number;
  };
  videos: {
    generated: number;
    failed: number;
    totalCreditsUsed: number;
    totalDuration: number; // seconds
  };
  storage: {
    used: number; // MB
    images: number; // MB
    videos: number; // MB
    projects: number; // MB
  };
  projects: {
    total: number;
    active: number;
  };
  characters: {
    total: number;
  };
  scenes: {
    total: number;
  };
  apiCalls: {
    geminiText: number;
    geminiImage: number;
    geminiVideo: number;
    otherProviders: number;
  };
}

interface UsageEntry {
  timestamp: Date;
  type: 'image' | 'video' | 'text' | 'storage';
  credits?: number;
  size?: number; // bytes
  provider?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// In-memory storage (in production, use Firebase/Database)
const usageHistory: UsageEntry[] = [];
let currentStats: UsageStats = {
  images: { generated: 0, failed: 0, totalCreditsUsed: 0 },
  videos: { generated: 0, failed: 0, totalCreditsUsed: 0, totalDuration: 0 },
  storage: { used: 0, images: 0, videos: 0, projects: 0 },
  projects: { total: 0, active: 0 },
  characters: { total: 0 },
  scenes: { total: 0 },
  apiCalls: { geminiText: 0, geminiImage: 0, geminiVideo: 0, otherProviders: 0 },
};

/**
 * Record image generation
 */
export function trackImageGeneration(
  provider: string,
  credits: number,
  success: boolean,
  sizeBytes?: number
): void {
  const entry: UsageEntry = {
    timestamp: new Date(),
    type: 'image',
    credits,
    size: sizeBytes,
    provider,
    success,
  };

  usageHistory.push(entry);

  if (success) {
    currentStats.images.generated++;
    currentStats.images.totalCreditsUsed += credits;
    if (sizeBytes) {
      const sizeMB = sizeBytes / (1024 * 1024);
      currentStats.storage.used += sizeMB;
      currentStats.storage.images += sizeMB;
    }

    // Track API calls
    if (provider.includes('gemini')) {
      currentStats.apiCalls.geminiImage++;
    } else {
      currentStats.apiCalls.otherProviders++;
    }
  } else {
    currentStats.images.failed++;
  }

  console.log(
    `📸 Image tracked: ${provider} (${success ? 'success' : 'failed'}) - ${credits} credits`
  );
}

/**
 * Record video generation
 */
export function trackVideoGeneration(
  provider: string,
  credits: number,
  duration: number,
  success: boolean,
  sizeBytes?: number
): void {
  const entry: UsageEntry = {
    timestamp: new Date(),
    type: 'video',
    credits,
    size: sizeBytes,
    provider,
    success,
    metadata: { duration },
  };

  usageHistory.push(entry);

  if (success) {
    currentStats.videos.generated++;
    currentStats.videos.totalCreditsUsed += credits;
    currentStats.videos.totalDuration += duration;
    if (sizeBytes) {
      const sizeMB = sizeBytes / (1024 * 1024);
      currentStats.storage.used += sizeMB;
      currentStats.storage.videos += sizeMB;
    }

    // Track API calls
    if (provider.includes('gemini') || provider.includes('veo')) {
      currentStats.apiCalls.geminiVideo++;
    } else {
      currentStats.apiCalls.otherProviders++;
    }
  } else {
    currentStats.videos.failed++;
  }

  console.log(
    `🎬 Video tracked: ${provider} (${success ? 'success' : 'failed'}) - ${credits} credits, ${duration}s`
  );
}

/**
 * Record text generation (for characters, scenes, etc.)
 */
export function trackTextGeneration(provider: string, success: boolean, tokens?: number): void {
  const entry: UsageEntry = {
    timestamp: new Date(),
    type: 'text',
    provider,
    success,
    metadata: { tokens },
  };

  usageHistory.push(entry);

  if (success && provider.includes('gemini')) {
    currentStats.apiCalls.geminiText++;
  }

  console.log(
    `📝 Text tracked: ${provider} (${success ? 'success' : 'failed'})${tokens ? ` - ${tokens} tokens` : ''}`
  );
}

/**
 * Track project creation
 */
export function trackProject(action: 'create' | 'delete' | 'activate' | 'archive'): void {
  switch (action) {
    case 'create':
      currentStats.projects.total++;
      currentStats.projects.active++;
      break;
    case 'delete':
      currentStats.projects.total--;
      currentStats.projects.active--;
      break;
    case 'archive':
      currentStats.projects.active--;
      break;
    case 'activate':
      currentStats.projects.active++;
      break;
  }
  console.log(
    `📁 Project ${action}: Total=${currentStats.projects.total}, Active=${currentStats.projects.active}`
  );
}

/**
 * Track character creation
 */
export function trackCharacter(action: 'create' | 'delete'): void {
  if (action === 'create') {
    currentStats.characters.total++;
  } else {
    currentStats.characters.total--;
  }
  console.log(`👤 Character ${action}: Total=${currentStats.characters.total}`);
}

/**
 * Track scene creation
 */
export function trackScene(action: 'create' | 'delete'): void {
  if (action === 'create') {
    currentStats.scenes.total++;
  } else {
    currentStats.scenes.total--;
  }
  console.log(`🎬 Scene ${action}: Total=${currentStats.scenes.total}`);
}

/**
 * Get current usage stats
 */
export function getUsageStats(): UsageStats {
  return { ...currentStats };
}

/**
 * Check if user can perform an action based on their tier limits
 */
export function checkLimit(
  action: 'project' | 'character' | 'scene' | 'image' | 'video' | 'storage',
  additionalAmount: number = 1
): { allowed: boolean; reason?: string; current: number; limit: number } {
  const subscription = getUserSubscription();
  const { features } = subscription;

  switch (action) {
    case 'project': {
      const maxProjects = features.maxProjects;
      const currentProjects = currentStats.projects.total;
      return {
        allowed: maxProjects === -1 || currentProjects + additionalAmount <= maxProjects,
        reason: maxProjects !== -1 ? `Project limit: ${currentProjects}/${maxProjects}` : undefined,
        current: currentProjects,
        limit: maxProjects,
      };
    }

    case 'character': {
      const maxCharacters = features.maxCharacters;
      const currentCharacters = currentStats.characters.total;
      return {
        allowed: maxCharacters === -1 || currentCharacters + additionalAmount <= maxCharacters,
        reason:
          maxCharacters !== -1
            ? `Character limit: ${currentCharacters}/${maxCharacters}`
            : undefined,
        current: currentCharacters,
        limit: maxCharacters,
      };
    }

    case 'scene': {
      const maxScenes = features.maxScenes;
      const currentScenes = currentStats.scenes.total;
      return {
        allowed: maxScenes === -1 || currentScenes + additionalAmount <= maxScenes,
        reason: maxScenes !== -1 ? `Scene limit: ${currentScenes}/${maxScenes}` : undefined,
        current: currentScenes,
        limit: maxScenes,
      };
    }

    case 'storage': {
      const maxStorage = features.storageLimit * 1024; // Convert GB to MB
      const currentStorage = currentStats.storage.used;
      return {
        allowed: currentStorage + additionalAmount <= maxStorage,
        reason: `Storage limit: ${currentStorage.toFixed(2)}MB/${maxStorage}MB`,
        current: parseFloat(currentStorage.toFixed(2)),
        limit: maxStorage,
      };
    }

    case 'image':
    case 'video':
      // Check credits
      if (subscription.tier === 'free') {
        return { allowed: true, reason: 'Free tier (no credit check)', current: 0, limit: -1 };
      }
      return {
        allowed: subscription.credits >= additionalAmount,
        reason: `Credits: ${subscription.credits}/${subscription.maxCredits}`,
        current: subscription.credits,
        limit: subscription.maxCredits,
      };

    default:
      return { allowed: true, current: 0, limit: -1 };
  }
}

/**
 * Get usage history for a specific period
 */
export function getUsageHistory(
  fromDate?: Date,
  toDate?: Date,
  type?: 'image' | 'video' | 'text' | 'storage'
): UsageEntry[] {
  let filtered = [...usageHistory];

  if (fromDate) {
    filtered = filtered.filter(e => e.timestamp >= fromDate);
  }
  if (toDate) {
    filtered = filtered.filter(e => e.timestamp <= toDate);
  }
  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  return filtered;
}

/**
 * Calculate cost savings from using free/fallback providers
 */
export function calculateCostSavings(): {
  totalSaved: number;
  breakdown: { provider: string; timesSaved: number; estimatedCost: number }[];
} {
  const freeProviders = ['pollinations', 'comfyui', 'sdxl'];
  const providerCosts = {
    'gemini-image': 0.04,
    'gemini-video': 0.1,
    'gemini-text': 0.0001,
    dalle: 0.08,
    runway: 0.5,
    luma: 0.1,
  };

  const breakdown: { provider: string; timesSaved: number; estimatedCost: number }[] = [];
  let totalSaved = 0;

  usageHistory
    .filter(e => e.success)
    .forEach(entry => {
      const providerLower = (entry.provider || '').toLowerCase();
      const isFree = freeProviders.some(fp => providerLower.includes(fp));

      if (isFree) {
        // Estimate what it would have cost with paid provider
        let estimatedCost = 0;
        if (entry.type === 'image') {
          estimatedCost = providerCosts['gemini-image'];
        } else if (entry.type === 'video') {
          const duration =
            typeof entry.metadata?.duration === 'number' ? entry.metadata.duration : 3;
          estimatedCost = providerCosts['gemini-video'] * duration;
        }

        const existing = breakdown.find(b => b.provider === entry.provider);
        if (existing) {
          existing.timesSaved++;
          existing.estimatedCost += estimatedCost;
        } else {
          breakdown.push({
            provider: entry.provider || 'unknown',
            timesSaved: 1,
            estimatedCost,
          });
        }
        totalSaved += estimatedCost;
      }
    });

  return { totalSaved, breakdown };
}

/**
 * Reset usage stats (for testing or new billing period)
 */
export function resetUsageStats(): void {
  currentStats = {
    images: { generated: 0, failed: 0, totalCreditsUsed: 0 },
    videos: { generated: 0, failed: 0, totalCreditsUsed: 0, totalDuration: 0 },
    storage: { used: 0, images: 0, videos: 0, projects: 0 },
    projects: { total: 0, active: 0 },
    characters: { total: 0 },
    scenes: { total: 0 },
    apiCalls: { geminiText: 0, geminiImage: 0, geminiVideo: 0, otherProviders: 0 },
  };
  usageHistory.length = 0;
  console.log('🔄 Usage stats reset');
}

/**
 * Export usage data for analytics/billing
 */
export function exportUsageData(): {
  stats: UsageStats;
  history: UsageEntry[];
  period: { start: Date; end: Date };
  tier: SubscriptionTier;
} {
  const subscription = getUserSubscription();
  const history = [...usageHistory];
  const start = history.length > 0 ? history[0].timestamp : new Date();
  const end = history.length > 0 ? history[history.length - 1].timestamp : new Date();

  return {
    stats: { ...currentStats },
    history,
    period: { start, end },
    tier: subscription.tier,
  };
}
