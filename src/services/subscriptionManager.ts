/**
 * Subscription Manager Service
 *
 * จัดการระบบ subscription, usage tracking และ quota validation
 * ตรวจสอบการใช้งานตามแผนที่ผู้ใช้เลือก
 */

import { UserSubscription, SubscriptionTier } from '../types';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

// ===== Subscription Plans Configuration =====

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, UserSubscription> = {
  free: {
    tier: 'free',
    credits: 50, // FREE tier - Pollinations only (Local GPU ไม่ตัดเครดิต)
    maxCredits: 50,
    features: {
      maxResolution: '1024x1024',
      allowedImageModels: ['pollinations'], // ✅ Pollinations only
      allowedVideoModels: ['pollinations-video'], // ✅ Pollinations Video only
      videoDurationLimit: 5, // 5 วินาที
      storageLimit: 0.5, // 500MB
      maxProjects: 3, // ✅ จำกัด 3 projects
      maxCharacters: 5, // ✅ จำกัด 5 characters
      maxScenes: 15,
      maxTeamMembers: 5, // ✅ เพิ่มทีมได้ 5 คน
      maxVeoVideosPerMonth: 0, // ❌ ไม่มีสิทธิ์ใช้ Veo
      exportFormats: ['pdf'],
      allowLocalGPU: true, // ✅ อนุญาตใช้ Local GPU (ไม่ตัดเครดิต)
    },
  },
  basic: {
    tier: 'basic',
    credits: 200, // BASIC tier - Replicate API (เราจ่าย, ตัดเครดิต)
    maxCredits: 200,
    features: {
      maxResolution: '2048x2048',
      allowedImageModels: ['pollinations', 'replicate-sdxl', 'gemini-2.0'], // ✅ Replicate + Gemini
      allowedVideoModels: [
        'pollinations-video',
        'replicate-animatediff',
        'replicate-svd',
        'replicate-ltx',
      ], // ✅ Replicate Video
      videoDurationLimit: 10, // 10 วินาที
      storageLimit: 2, // 2GB
      maxProjects: 7, // ✅ จำกัด 7 projects
      maxCharacters: 15,
      maxScenes: 70,
      maxTeamMembers: 15, // ✅ เพิ่มทีมได้ 15 คน
      maxVeoVideosPerMonth: 0, // ❌ ไม่มีสิทธิ์ใช้ Veo (ใช้ Replicate แทน)
      exportFormats: ['pdf', 'fdx', 'fountain'],
      allowLocalGPU: true, // ✅ อนุญาตใช้ Local GPU (ไม่ตัดเครดิต)
    },
  },
  pro: {
    tier: 'pro',
    credits: 800, // PRO tier - Replicate Pro ONLY (เราจ่าย, ตัดเครดิต)
    maxCredits: 800,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: [
        'pollinations',
        'replicate-sdxl',
        'replicate-flux',
        'gemini-2.0',
        'gemini-2.5',
        'stable-diffusion',
      ], // ✅ Pro Models
      allowedVideoModels: [
        'pollinations-video',
        'replicate-animatediff',
        'replicate-svd',
        'replicate-ltx',
      ], // ✅ Replicate ONLY (NO Veo)
      videoDurationLimit: 120, // 2 นาที
      storageLimit: 10, // 10GB
      maxProjects: 25, // ✅ จำกัด 25 projects
      maxCharacters: 50, // ✅ จำกัด 50 characters
      maxScenes: 200,
      maxTeamMembers: 50, // ✅ เพิ่มทีมได้ 50 คน
      maxVeoVideosPerMonth: 0, // ❌ ไม่มีสิทธิ์ใช้ Veo (กำไรสูง 60-70%!)
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package'],
      allowLocalGPU: true, // ✅ อนุญาตใช้ Local GPU (ไม่ตัดเครดิต)
    },
  },
  enterprise: {
    tier: 'enterprise',
    credits: -1, // Unlimited
    maxCredits: -1,
    features: {
      maxResolution: '4096x4096',
      allowedImageModels: [
        'pollinations',
        'replicate-sdxl',
        'replicate-flux',
        'gemini-2.0',
        'gemini-2.5',
        'stable-diffusion',
        'comfyui',
      ],
      allowedVideoModels: [
        'pollinations-video',
        'replicate-animatediff',
        'replicate-svd',
        'replicate-ltx',
        'gemini-veo',
        'comfyui-svd',
        'comfyui-animatediff',
      ],
      videoDurationLimit: -1, // Unlimited
      storageLimit: -1, // Unlimited
      maxProjects: -1, // ✅ Unlimited
      maxCharacters: -1, // ✅ Unlimited
      maxScenes: -1,
      maxTeamMembers: -1, // ✅ Unlimited team members
      maxVeoVideosPerMonth: 25, // ✅ จำกัด 25 คลิป Veo/เดือน (ควบคุมต้นทุน, มีกำไรดี!)
      exportFormats: ['pdf', 'fdx', 'fountain', 'production-package', 'white-label'],
      allowLocalGPU: true, // ✅ อนุญาตใช้ Local GPU
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
    veoVideosGenerated: number; // ⚠️ ติดตาม Veo usage ต่อเดือน
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
    '512x512': 2, // เพิ่มจาก 1 → 2 (ต้นทุน $0.02)
    '1024x1024': 5, // เพิ่มจาก 3 → 5 (ต้นทุน $0.04)
    '2048x2048': 12, // เพิ่มจาก 8 → 12 (ต้นทุน $0.12)
    '4096x4096': 30, // เพิ่มจาก 15 → 30 (ต้นทุน $0.30)
  },
  videoGeneration: {
    replicate: {
      perSecond: 4, // เพิ่มจาก 2 → 4 (ต้นทุน $0.025-0.15/sec)
      minimum: 20, // เพิ่มจาก 10 → 20 (5sec × 4cr/sec)
    },
    veo: {
      perSecond: 10, // เพิ่มจาก 5 → 10 (ต้นทุน $0.10/sec)
      minimum: 60, // เพิ่มจาก 25 → 60 (5sec × 12cr/sec)
    },
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
          veoVideosGenerated: 0, // 🆕 เพิ่ม Veo tracking
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
      case 'video': {
        const duration = action.details?.duration || 0;
        // ใช้ replicate เป็น default video model
        creditsNeeded = Math.max(
          CREDIT_COSTS.videoGeneration.replicate.minimum,
          duration * CREDIT_COSTS.videoGeneration.replicate.perSecond
        );
        break;
      }
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
        if (features.storageLimit !== -1 && newStorageTotal > features.storageLimit * 1024) {
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
 * 🆕 Check Veo video quota (เฉพาะ PRO และ ENTERPRISE)
 */
export async function checkVeoQuota(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
}> {
  try {
    const userRecord = await getUserSubscription(userId);
    const { subscription, monthlyUsage } = userRecord;

    const maxVeoVideos = subscription.features.maxVeoVideosPerMonth;

    // Check if tier allows Veo
    if (maxVeoVideos === 0) {
      return {
        allowed: false,
        reason: `แผน ${subscription.tier.toUpperCase()} ไม่รองรับ Veo - กรุณาใช้ Replicate หรือ upgrade เป็น PRO`,
        remaining: 0,
        limit: 0,
      };
    }

    // Unlimited for special cases
    if (maxVeoVideos === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
      };
    }

    // Check monthly usage
    const veoUsed = monthlyUsage.veoVideosGenerated || 0;
    const remaining = maxVeoVideos - veoUsed;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `ใช้ Veo ครบโควต้าแล้ว (${maxVeoVideos} คลิป/เดือน) - กรุณาใช้ Replicate หรือรอเดือนหน้า`,
        remaining: 0,
        limit: maxVeoVideos,
      };
    }

    // Warning when close to limit
    if (remaining <= 2 && maxVeoVideos >= 5) {
      console.warn(`⚠️ Veo quota ใกล้หมด: เหลือ ${remaining}/${maxVeoVideos} คลิป`);
    }

    return {
      allowed: true,
      remaining,
      limit: maxVeoVideos,
    };
  } catch (error) {
    console.error('Error checking Veo quota:', error);
    return {
      allowed: false,
      reason: 'ไม่สามารถตรวจสอบ Veo quota ได้',
    };
  }
}

/**
 * 🆕 Record Veo video usage
 */
export async function recordVeoUsage(userId: string, credits: number): Promise<void> {
  try {
    const docRef = doc(db, 'subscriptions', userId);

    await updateDoc(docRef, {
      'monthlyUsage.veoVideosGenerated': increment(1),
      'monthlyUsage.creditsUsed': increment(credits),
      'usage.videosGenerated': increment(1),
      lastUpdated: new Date(),
    });

    console.log(`✅ Recorded Veo usage for user ${userId}`);
  } catch (error) {
    console.error('Error recording Veo usage:', error);
    throw error;
  }
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
        '20 credits/เดือน', // อัพเดตจาก 30 → 20
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
      price: '฿299/เดือน', // อัพเดตจาก ฿399 → ฿299
      features: [
        '150 credits/เดือน', // ไม่เปลี่ยน (ยังเป็น 150)
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
        '600 credits/เดือน', // อัพเดตจาก 500 → 600
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

