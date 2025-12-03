import { UserSubscription, SubscriptionTier } from '../../types';

// Mock User Data (Updated to match PRICING_STRATEGY.md)
const MOCK_USERS: Record<SubscriptionTier, UserSubscription> = {
  free: {
    tier: 'free',
    credits: 0, // Free tier doesn't use credits, just quota limits
    maxCredits: 0,
    features: {
      maxResolution: '1024x1024',
      allowedImageModels: ['pollinations', 'comfyui-sdxl', 'gemini-flash'],
      allowedVideoModels: ['comfyui-svd', 'pollinations-video'],
      videoDurationLimit: 3,
      storageLimit: 0.5, // 500 MB
      maxProjects: 1,
      maxCharacters: 3,
      maxScenes: 9,
      exportFormats: ['pdf-watermark']
    }
  },
  basic: {
    tier: 'basic',
    credits: 100,
    maxCredits: 100,
    features: {
      maxResolution: '2048x2048',
      allowedImageModels: ['pollinations', 'comfyui-sdxl', 'gemini-flash', 'gemini-pro'],
      allowedVideoModels: ['comfyui-svd', 'pollinations-video', 'gemini-veo'],
      videoDurationLimit: 4,
      storageLimit: 1, // 1 GB
      maxProjects: 5,
      maxCharacters: 10,
      maxScenes: -1, // Unlimited
      exportFormats: ['pdf', 'fdx', 'fountain']
    }
  },
  pro: {
    tier: 'pro',
    credits: 500,
    maxCredits: 500,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: ['pollinations', 'comfyui-sdxl', 'gemini-flash', 'gemini-pro', 'comfyui-flux', 'openai-dalle'],
      allowedVideoModels: ['comfyui-svd', 'pollinations-video', 'gemini-veo', 'luma-dream-machine', 'runway-gen3'],
      videoDurationLimit: 10,
      storageLimit: 10, // 10 GB
      maxProjects: -1, // Unlimited
      maxCharacters: -1, // Unlimited
      maxScenes: -1, // Unlimited
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package']
    }
  },
  enterprise: {
    tier: 'enterprise',
    credits: 9999,
    maxCredits: 9999,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: ['pollinations', 'comfyui-sdxl', 'gemini-flash', 'gemini-pro', 'comfyui-flux', 'openai-dalle'],
      allowedVideoModels: ['comfyui-svd', 'pollinations-video', 'gemini-veo', 'luma-dream-machine', 'runway-gen3'],
      videoDurationLimit: 60,
      storageLimit: 100, // 100 GB
      maxProjects: -1, // Unlimited
      maxCharacters: -1, // Unlimited
      maxScenes: -1, // Unlimited
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package', 'white-label']
    }
  }
};

// Current User State (Mock)
let currentUser: UserSubscription = MOCK_USERS.free; // Default to Free

export const getUserSubscription = (): UserSubscription => {
  return currentUser;
};

export const setUserTier = (tier: SubscriptionTier) => {
  if (MOCK_USERS[tier]) {
    currentUser = MOCK_USERS[tier];
    console.log(`User tier updated to: ${tier}`);
  }
};

export const deductCredits = (amount: number): boolean => {
  if (currentUser.tier === 'free') return true; // Free tier doesn't use credits
  
  if (currentUser.credits >= amount) {
    currentUser.credits -= amount;
    return true;
  }
  return false;
};

export const hasAccessToModel = (modelId: string, type: 'image' | 'video'): boolean => {
  if (type === 'image') {
    return currentUser.features.allowedImageModels.includes(modelId) || modelId === 'auto';
  } else {
    return currentUser.features.allowedVideoModels.includes(modelId) || modelId === 'auto';
  }
};
