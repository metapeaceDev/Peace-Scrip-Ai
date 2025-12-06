/**
 * Subscription Manager Service
 * 
 * จัดการระบบ subscription, usage tracking และ quota validation
 * ตรวจสอบการใช้งานตามแผนที่ผู้ใช้เลือก
 */

import { UserSubscription, SubscriptionTier } from '../../types';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

// ===== Subscription Plans Configuration =====

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, UserSubscription> = {
  free: {
    tier: 'free',
    credits: 10,
    maxCredits: 10,
    features: {
      maxResolution: '1024x1024',
      allowedImageModels: ['gemini-2.0'],
      allowedVideoModels: [],
      videoDurationLimit: 0, // ไม่มีวิดีโอ
      storageLimit: 0.1, // 100MB
      maxProjects: 1,
      maxCharacters: 3,
      maxScenes: 10,
      exportFormats: ['pdf'],
    },
  },
  basic: {
    tier: 'basic',
    credits: 100,
    maxCredits: 100,
    features: {
      maxResolution: '2048x2048',
      allowedImageModels: ['gemini-2.0', 'gemini-2.5'],
      allowedVideoModels: ['gemini-veo'],
      videoDurationLimit: 30, // 30 วินาที
      storageLimit: 1, // 1GB
      maxProjects: 5,
      maxCharacters: 10,
      maxScenes: 50,
      exportFormats: ['pdf', 'fdx', 'fountain'],
    },
  },
  pro: {
    tier: 'pro',
    credits: 500,
    maxCredits: 500,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: ['gemini-2.0', 'gemini-2.5', 'stable-diffusion', 'comfyui'],
      allowedVideoModels: ['gemini-veo', 'comfyui-svd'],
      videoDurationLimit: 120, // 2 นาที
      storageLimit: 10, // 10GB
      maxProjects: 20,
      maxCharacters: 50,
      maxScenes: 200,
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package'],
    },
  },
  enterprise: {
    tier: 'enterprise',
    credits: -1, // Unlimited
    maxCredits: -1,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: ['gemini-2.0', 'gemini-2.5', 'stable-diffusion', 'comfyui'],
      allowedVideoModels: ['gemini-veo', 'comfyui-svd'],
      videoDurationLimit: -1, // Unlimited
      storageLimit: -1, // Unlimited
      maxProjects: -1, // Unlimited
      maxCharacters: -1, // Unlimited
      maxScenes: -1, // Unlimited
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package', 'white-label'],
    },
  },
};

// ===== Usage Tracking Types =====

interface UsageRecord {
  userId: string;
  subscription: UserSubscription;
  usage: {
    scriptsGenerated: number;
    imagesGenerated: number;
    videosGenerated: number;
    storageUsed: number; // MB
    projectsCreated: number;
    charactersCreated: number;
    scenesCreated: number;
  };
  monthlyUsage: {
    month: string; // YYYY-MM format
    creditsUsed: number;
    resetAt: Date;
  };
  lastUpdated: Date;
}

// ===== Credit Cost Configuration =====

const CREDIT_COSTS = {
  scriptGeneration: {
    scene: 1,
    character: 2,
    fullScript: 5,
  },
  imageGeneration: {
    '1024x1024': 2,
    '2048x2048': 5,
    '4096x4096': 10,
  },
  videoGeneration: {
    perSecond: 1, // 1 credit per second
    minimum: 10, // Minimum 10 credits
  },
  storage: {
    perMB: 0.1, // 0.1 credit per MB
  },
};

// ===== Core Functions =====

/**
 * Get user's current subscription and usage
 */
export async function getUserSubscription(userId: string): Promise<UsageRecord> {
  try {
    const docRef = doc(db, 'subscriptions', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UsageRecord;
      
      // Check if monthly reset is needed
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      if (data.monthlyUsage.month !== currentMonth) {
        // Reset credits for new month
        await resetMonthlyCredits(userId, data.subscription.tier);
        return getUserSubscription(userId); // Get updated data
      }
      
      return data;
    } else {
      // Create new free subscription for new user
      const newUser: UsageRecord = {
        userId,
        subscription: SUBSCRIPTION_PLANS.free,
        usage: {
          scriptsGenerated: 0,
          imagesGenerated: 0,
          videosGenerated: 0,
          storageUsed: 0,
          projectsCreated: 0,
          charactersCreated: 0,
          scenesCreated: 0,
        },
        monthlyUsage: {
          month: new Date().toISOString().slice(0, 7),
          creditsUsed: 0,
          resetAt: getNextMonthDate(),
        },
        lastUpdated: new Date(),
      };

      await setDoc(docRef, newUser);
      return newUser;
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw new Error('ไม่สามารถโหลดข้อมูล subscription ได้');
  }
}

/**
 * Check if user can perform an action
 */
export async function checkQuota(
  userId: string,
  action: {
    type: 'script' | 'image' | 'video' | 'storage' | 'project' | 'character' | 'scene';
    details?: {
      resolution?: '1024x1024' | '2048x2048' | '4096x4096';
      duration?: number; // seconds for video
      size?: number; // MB for storage
      scriptType?: 'scene' | 'character' | 'fullScript';
    };
  }
): Promise<{
  allowed: boolean;
  reason?: string;
  creditsNeeded?: number;
  creditsRemaining?: number;
  upgradeRequired?: SubscriptionTier;
}> {
  try {
    const userRecord = await getUserSubscription(userId);
    const { subscription, usage, monthlyUsage } = userRecord;

    // Calculate credits needed
    let creditsNeeded = 0;
    switch (action.type) {
      case 'script':
        creditsNeeded = CREDIT_COSTS.scriptGeneration[action.details?.scriptType || 'scene'];
        break;
      case 'image':
        creditsNeeded = CREDIT_COSTS.imageGeneration[action.details?.resolution || '1024x1024'];
        break;
      case 'video':
        const duration = action.details?.duration || 0;
        creditsNeeded = Math.max(
          CREDIT_COSTS.videoGeneration.minimum,
          duration * CREDIT_COSTS.videoGeneration.perSecond
        );
        break;
      case 'storage':
        creditsNeeded = (action.details?.size || 0) * CREDIT_COSTS.storage.perMB;
        break;
    }

    // Check if unlimited plan
    if (subscription.tier === 'enterprise') {
      return { allowed: true, creditsRemaining: -1 };
    }

    // Check credits
    const creditsRemaining = subscription.credits - monthlyUsage.creditsUsed;
    if (creditsNeeded > creditsRemaining) {
      return {
        allowed: false,
        reason: `ไม่มี credits เพียงพอ ต้องการ ${creditsNeeded} credits แต่เหลือเพียง ${creditsRemaining}`,
        creditsNeeded,
        creditsRemaining,
        upgradeRequired: suggestUpgrade(subscription.tier),
      };
    }

    // Check feature-specific limits
    const { features } = subscription;

    switch (action.type) {
      case 'image': {
        // Check resolution limit
        const resOrder = ['1024x1024', '2048x2048', '4096x4096'];
        const maxResIndex = resOrder.indexOf(features.maxResolution);
        const requestedResIndex = resOrder.indexOf(action.details?.resolution || '1024x1024');
        if (requestedResIndex > maxResIndex) {
          return {
            allowed: false,
            reason: `แผน ${subscription.tier} รองรับความละเอียดสูงสุด ${features.maxResolution}`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }

      case 'video': {
        if (features.videoDurationLimit === 0) {
          return {
            allowed: false,
            reason: `แผน ${subscription.tier} ไม่รองรับการสร้างวิดีโอ`,
            upgradeRequired: 'basic',
          };
        }
        if (
          features.videoDurationLimit !== -1 &&
          (action.details?.duration || 0) > features.videoDurationLimit
        ) {
          return {
            allowed: false,
            reason: `แผน ${subscription.tier} รองรับวิดีโอสูงสุด ${features.videoDurationLimit} วินาที`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }

      case 'storage': {
        const newStorageTotal = usage.storageUsed + (action.details?.size || 0);
        if (
          features.storageLimit !== -1 &&
          newStorageTotal > features.storageLimit * 1024
        ) {
          return {
            allowed: false,
            reason: `พื้นที่เก็บข้อมูลเต็ม (ใช้ ${(newStorageTotal / 1024).toFixed(2)}GB จาก ${features.storageLimit}GB)`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }

      case 'project': {
        if (features.maxProjects !== -1 && usage.projectsCreated >= features.maxProjects) {
          return {
            allowed: false,
            reason: `สร้างโปรเจกต์ครบจำนวนสูงสุดแล้ว (${features.maxProjects} โปรเจกต์)`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }

      case 'character': {
        if (features.maxCharacters !== -1 && usage.charactersCreated >= features.maxCharacters) {
          return {
            allowed: false,
            reason: `สร้างตัวละครครบจำนวนสูงสุดแล้ว (${features.maxCharacters} ตัว)`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }

      case 'scene': {
        if (features.maxScenes !== -1 && usage.scenesCreated >= features.maxScenes) {
          return {
            allowed: false,
            reason: `สร้างซีนครบจำนวนสูงสุดแล้ว (${features.maxScenes} ซีน)`,
            upgradeRequired: suggestUpgrade(subscription.tier),
          };
        }
        break;
      }
    }

    return {
      allowed: true,
      creditsNeeded,
      creditsRemaining,
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    throw new Error('ไม่สามารถตรวจสอบ quota ได้');
  }
}

/**
 * Record usage after successful action
 */
export async function recordUsage(
  userId: string,
  action: {
    type: 'script' | 'image' | 'video' | 'storage' | 'project' | 'character' | 'scene';
    credits: number;
    details?: {
      size?: number; // MB
    };
  }
): Promise<void> {
  try {
    const docRef = doc(db, 'subscriptions', userId);

    const updates: Record<string, unknown> = {
      'monthlyUsage.creditsUsed': increment(action.credits),
      lastUpdated: new Date(),
    };

    // Update specific counters
    switch (action.type) {
      case 'script':
        updates['usage.scriptsGenerated'] = increment(1);
        break;
      case 'image':
        updates['usage.imagesGenerated'] = increment(1);
        break;
      case 'video':
        updates['usage.videosGenerated'] = increment(1);
        break;
      case 'storage':
        updates['usage.storageUsed'] = increment(action.details?.size || 0);
        break;
      case 'project':
        updates['usage.projectsCreated'] = increment(1);
        break;
      case 'character':
        updates['usage.charactersCreated'] = increment(1);
        break;
      case 'scene':
        updates['usage.scenesCreated'] = increment(1);
        break;
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error recording usage:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Upgrade user subscription
 */
export async function upgradeSubscription(
  userId: string,
  newTier: SubscriptionTier
): Promise<void> {
  try {
    const docRef = doc(db, 'subscriptions', userId);
    const newPlan = SUBSCRIPTION_PLANS[newTier];

    await updateDoc(docRef, {
      subscription: newPlan,
      'monthlyUsage.creditsUsed': 0, // Reset credits on upgrade
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw new Error('ไม่สามารถอัพเกรดแผนได้');
  }
}

/**
 * Reset monthly credits (called automatically when month changes)
 */
async function resetMonthlyCredits(userId: string, tier: SubscriptionTier): Promise<void> {
  try {
    const docRef = doc(db, 'subscriptions', userId);
    const plan = SUBSCRIPTION_PLANS[tier];

    await updateDoc(docRef, {
      'subscription.credits': plan.maxCredits,
      'monthlyUsage.month': new Date().toISOString().slice(0, 7),
      'monthlyUsage.creditsUsed': 0,
      'monthlyUsage.resetAt': getNextMonthDate(),
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Error resetting monthly credits:', error);
  }
}

// ===== Helper Functions =====

function getNextMonthDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function suggestUpgrade(currentTier: SubscriptionTier): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);
  return tiers[Math.min(currentIndex + 1, tiers.length - 1)];
}

/**
 * Get plan comparison for upgrade UI
 */
export function getPlansComparison(): Array<{
  tier: SubscriptionTier;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}> {
  return [
    {
      tier: 'free',
      name: 'Free',
      price: '฿0/เดือน',
      features: [
        '10 credits/เดือน',
        '1 โปรเจกต์',
        '3 ตัวละคร',
        '10 ซีน',
        'ความละเอียด 1024x1024',
        'Export PDF',
      ],
    },
    {
      tier: 'basic',
      name: 'Basic',
      price: '฿299/เดือน',
      features: [
        '100 credits/เดือน',
        '5 โปรเจกต์',
        '10 ตัวละคร',
        '50 ซีน',
        'ความละเอียด 2048x2048',
        'วิดีโอ 30 วินาที',
        'Export PDF, FDX, Fountain',
      ],
      recommended: true,
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: '฿999/เดือน',
      features: [
        '500 credits/เดือน',
        '20 โปรเจกต์',
        '50 ตัวละคร',
        '200 ซีน',
        'ความละเอียด 4096x4096',
        'วิดีโอ 2 นาที',
        'ComfyUI & Stable Diffusion',
        'Production Package',
      ],
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price: 'ติดต่อเรา',
      features: [
        'Unlimited credits',
        'Unlimited โปรเจกต์',
        'Unlimited ตัวละคร & ซีน',
        'ความละเอียดสูงสุด',
        'วิดีโอไม่จำกัดความยาว',
        'White-label Export',
        'Priority Support',
        'Custom Integration',
      ],
    },
  ];
}
