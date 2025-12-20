/**
 * Model Usage Tracking Service
 *
 * บันทึกการใช้งานโมเดล AI แต่ละครั้ง พร้อมคำนวณต้นทุน
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ModelUsage, GenerationDetails, UserOfflineActivity } from '../types/analytics';
import { API_PRICING } from '../types/analytics';

/**
 * Record a generation (text/image/video)
 */
export async function recordGeneration(params: {
  userId: string;
  type: 'text' | 'image' | 'video';
  modelId: string;
  modelName: string;
  provider: string;
  costInCredits: number;
  costInTHB: number;
  success: boolean;
  duration?: number;
  metadata?: {
    prompt?: string;
    resolution?: string;
    duration?: string;
    projectId?: string;
    sceneId?: string;
    tokens?: { input: number; output: number };
    characters?: number;
  };
}): Promise<void> {
  try {
    const generation: GenerationDetails = {
      id: '', // Will be auto-generated
      userId: params.userId,
      timestamp: new Date(),
      type: params.type,
      modelId: params.modelId,
      modelName: params.modelName,
      provider: params.provider,
      costInCredits: params.costInCredits,
      costInTHB: params.costInTHB,
      success: params.success,
      duration: params.duration,
      metadata: params.metadata,
    };

    // Save to Firestore
    await addDoc(collection(db, 'generations'), {
      ...generation,
      timestamp: Timestamp.fromDate(generation.timestamp),
    });

    // Update user's model usage summary
    await updateModelUsageSummary(
      params.userId,
      params.modelId,
      params.modelName,
      params.provider,
      params.type,
      params.costInTHB
    );

    // Check Global Daily Budget
    if (params.costInTHB > 0) {
      checkGlobalDailyBudget().catch(err => console.error('Budget check failed:', err));
    }

    // Success - no logging needed in production
  } catch (error) {
    // Error - log silently
    void error;
  }
}

const DAILY_BUDGET_LIMIT_THB = 500;

async function checkGlobalDailyBudget(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'generations'),
      where('timestamp', '>=', Timestamp.fromDate(today))
    );

    const snapshot = await getDocs(q);
    let totalCost = 0;
    snapshot.forEach(doc => {
      totalCost += doc.data().costInTHB || 0;
    });

    if (totalCost > DAILY_BUDGET_LIMIT_THB) {
      console.warn(
        `⚠️ DAILY BUDGET EXCEEDED: ฿${totalCost.toFixed(2)} / ฿${DAILY_BUDGET_LIMIT_THB}`
      );

      // Check if alert already sent today to avoid spam
      const alertQ = query(
        collection(db, 'system_alerts'),
        where('type', '==', 'budget_exceeded'),
        where('timestamp', '>=', Timestamp.fromDate(today))
      );
      const alertSnapshot = await getDocs(alertQ);

      if (alertSnapshot.empty) {
        await addDoc(collection(db, 'system_alerts'), {
          type: 'budget_exceeded',
          message: `Daily budget exceeded: ฿${totalCost.toFixed(2)} (Limit: ฿${DAILY_BUDGET_LIMIT_THB})`,
          threshold: DAILY_BUDGET_LIMIT_THB,
          currentCost: totalCost,
          timestamp: Timestamp.now(),
          read: false,
        });
      }
    }
  } catch (error) {
    console.error('Failed to check daily budget:', error);
  }
}

/**
 * Update model usage summary for a user
 */
async function updateModelUsageSummary(
  userId: string,
  modelId: string,
  modelName: string,
  provider: string,
  type: 'text' | 'image' | 'video',
  costInTHB: number
): Promise<void> {
  const summaryRef = doc(db, 'userModelUsage', `${userId}_${modelId}`);

  try {
    const summaryDoc = await getDoc(summaryRef);

    if (summaryDoc.exists()) {
      // Update existing
      await updateDoc(summaryRef, {
        count: increment(1),
        totalCost: increment(costInTHB),
        lastUsed: Timestamp.now(),
      });
    } else {
      // Create new
      const newSummary: ModelUsage & { userId: string } = {
        userId,
        modelId,
        modelName,
        provider: provider as 'gemini' | 'replicate' | 'comfyui' | 'pollinations' | 'openai',
        type,
        count: 1,
        totalCost: costInTHB,
        lastUsed: new Date(),
      };

      await setDoc(summaryRef, {
        ...newSummary,
        lastUsed: Timestamp.fromDate(newSummary.lastUsed),
      });
    }
  } catch (error) {
    console.error('❌ Failed to update model usage summary:', error);
  }
}

/**
 * Get user's model usage breakdown
 */
export async function getUserModelUsage(userId: string): Promise<{
  byModel: ModelUsage[];
  totalGenerations: number;
  totalCostTHB: number;
  breakdown: {
    text: { count: number; cost: number; models: string[] };
    image: { count: number; cost: number; models: string[] };
    video: { count: number; cost: number; models: string[] };
  };
}> {
  try {
    // Get all model usage summaries for this user
    const q = query(collection(db, 'userModelUsage'), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const byModel: ModelUsage[] = [];
    let totalGenerations = 0;
    let totalCostTHB = 0;

    const breakdown = {
      text: { count: 0, cost: 0, models: [] as string[] },
      image: { count: 0, cost: 0, models: [] as string[] },
      video: { count: 0, cost: 0, models: [] as string[] },
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      const usage: ModelUsage = {
        modelId: data.modelId,
        modelName: data.modelName,
        provider: data.provider,
        type: data.type,
        count: data.count,
        totalCost: data.totalCost,
        lastUsed: data.lastUsed.toDate(),
      };

      byModel.push(usage);
      totalGenerations += usage.count;
      totalCostTHB += usage.totalCost;

      // Update breakdown
      const typeBreakdown = breakdown[usage.type];
      typeBreakdown.count += usage.count;
      typeBreakdown.cost += usage.totalCost;
      if (!typeBreakdown.models.includes(usage.modelName)) {
        typeBreakdown.models.push(usage.modelName);
      }
    });

    // Sort by most used
    byModel.sort((a, b) => b.count - a.count);

    return {
      byModel,
      totalGenerations,
      totalCostTHB,
      breakdown,
    };
  } catch (error) {
    console.error('❌ Failed to get user model usage:', error);
    return {
      byModel: [],
      totalGenerations: 0,
      totalCostTHB: 0,
      breakdown: {
        text: { count: 0, cost: 0, models: [] },
        image: { count: 0, cost: 0, models: [] },
        video: { count: 0, cost: 0, models: [] },
      },
    };
  }
}

/**
 * Get recent generation history
 */
export async function getRecentGenerations(
  userId: string,
  limitCount: number = 20
): Promise<GenerationDetails[]> {
  try {
    const q = query(
      collection(db, 'generations'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const generations: GenerationDetails[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      generations.push({
        id: doc.id,
        userId: data.userId,
        timestamp: data.timestamp.toDate(),
        type: data.type,
        modelId: data.modelId,
        modelName: data.modelName,
        provider: data.provider,
        costInCredits: data.costInCredits,
        costInTHB: data.costInTHB,
        success: data.success,
        duration: data.duration,
        metadata: data.metadata,
      });
    });

    return generations;
  } catch (error) {
    console.error('❌ Failed to get recent generations:', error);
    return [];
  }
}

/**
 * Record user offline activity (session tracking)
 */
export async function recordUserActivity(params: {
  userId: string;
  sessionDuration: number; // minutes
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  locationData?: {
    country: string;
    region: string;
    timezone: string;
  };
}): Promise<void> {
  try {
    const activityRef = doc(db, 'userActivity', params.userId);
    const activityDoc = await getDoc(activityRef);

    if (activityDoc.exists()) {
      // Update existing
      const current = activityDoc.data();
      await updateDoc(activityRef, {
        lastOnline: Timestamp.now(),
        sessionCount: increment(1),
        totalTimeSpent: increment(params.sessionDuration),
        avgSessionDuration:
          (current.totalTimeSpent + params.sessionDuration) / (current.sessionCount + 1),
        deviceInfo: params.deviceInfo,
        locationData: params.locationData || current.locationData,
      });
    } else {
      // Create new
      const newActivity: UserOfflineActivity & { userId: string } = {
        userId: params.userId,
        lastOnline: new Date(),
        sessionCount: 1,
        avgSessionDuration: params.sessionDuration,
        totalTimeSpent: params.sessionDuration,
        deviceInfo: params.deviceInfo,
        locationData: params.locationData,
      };

      await setDoc(activityRef, {
        ...newActivity,
        lastOnline: Timestamp.fromDate(newActivity.lastOnline),
      });
    }

    // Success - no logging needed in production
  } catch (error) {
    // Error - log silently
    void error;
  }
}

/**
 * Get user offline activity
 */
export async function getUserOfflineActivity(userId: string): Promise<UserOfflineActivity | null> {
  try {
    const activityRef = doc(db, 'userActivity', userId);
    const activityDoc = await getDoc(activityRef);

    if (!activityDoc.exists()) {
      return null;
    }

    const data = activityDoc.data();
    return {
      userId,
      lastOnline: data.lastOnline.toDate(),
      sessionCount: data.sessionCount,
      avgSessionDuration: data.avgSessionDuration,
      totalTimeSpent: data.totalTimeSpent,
      deviceInfo: data.deviceInfo,
      locationData: data.locationData,
    };
  } catch (error) {
    console.error('❌ Failed to get user offline activity:', error);
    return null;
  }
}

/**
 * Calculate cost from model usage
 */
export function calculateModelCost(
  modelId: string,
  type: 'text' | 'image' | 'video',
  metadata?: {
    tokens?: number;
    characters?: number;
    resolution?: string;
    duration?: string;
  }
): { credits: number; thb: number } {
  // Default costs (fallback)
  let thb = 0;
  let credits = 0;

  // Calculate based on model
  if (modelId.includes('gemini-2.0-flash') || modelId.includes('gemini-flash')) {
    // FREE with quota
    thb = 0;
    credits = 0;
  } else if (modelId.includes('gemini-2.5-flash') || modelId.includes('gemini-pro')) {
    if (type === 'image') {
      thb = API_PRICING.GEMINI['2.5-flash'].image;
      credits = 5; // 5 credits per image
    } else if (type === 'text' && metadata?.characters) {
      const inputCost = metadata.characters * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = metadata.characters * API_PRICING.GEMINI['2.5-flash'].output;
      thb = inputCost + outputCost;
      credits = Math.ceil(thb / 0.1); // 1 credit ≈ ฿0.1
    }
  } else if (modelId.includes('veo')) {
    // Veo video costs
    const duration = metadata?.duration || '5s';
    if (duration.includes('5')) {
      thb = API_PRICING.GEMINI['veo-3'].video5s;
      credits = 15;
    } else {
      thb = API_PRICING.GEMINI['veo-3'].video10s;
      credits = 50;
    }
  } else if (modelId.includes('replicate-svd')) {
    thb = API_PRICING.REPLICATE['stable-video-diffusion'].perRun;
    credits = 2;
  } else if (modelId.includes('replicate-animatediff')) {
    thb = API_PRICING.REPLICATE.animatediff.perRun;
    credits = 3;
  } else if (modelId.includes('replicate-ltx')) {
    thb = API_PRICING.REPLICATE['ltx-video'].perRun;
    credits = 8;
  } else if (modelId.includes('comfyui') || modelId.includes('pollinations')) {
    // Free models
    thb = 0;
    credits = 0;
  }

  return { credits, thb };
}

/**
 * Helper: Track generation automatically
 * Use this wrapper in your generation functions
 */
export async function trackGeneration<T>(
  userId: string,
  type: 'text' | 'image' | 'video',
  modelId: string,
  modelName: string,
  provider: string,
  generationFn: () => Promise<T>,
  metadata?: {
    prompt?: string;
    resolution?: string;
    duration?: string;
    projectId?: string;
    sceneId?: string;
  }
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let result: T;

  try {
    result = await generationFn();
    success = true;
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000; // seconds
    const { credits, thb } = calculateModelCost(modelId, type, metadata);

    // Record in background (don't block)
    recordGeneration({
      userId,
      type,
      modelId,
      modelName,
      provider,
      costInCredits: credits,
      costInTHB: thb,
      success,
      duration,
      metadata,
    }).catch(err => console.error('Failed to track generation:', err));
  }
}

