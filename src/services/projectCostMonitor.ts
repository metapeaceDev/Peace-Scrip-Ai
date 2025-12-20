/**
 * Project Cost Monitoring Service
 *
 * ติดตาม และคำนวณต้นทุนโปรเจกต์ทั้งหมด
 */

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ProjectCostSummary, ApiCostBreakdown, ServiceCost } from '../types/analytics';
import { API_PRICING } from '../types/analytics';

/**
 * Get comprehensive project cost summary
 */
export async function getProjectCostSummary(): Promise<ProjectCostSummary> {
  try {
    // Get current month usage data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate API costs
    const apiCosts = await calculateApiCosts(startOfMonth, endOfMonth);

    // Calculate storage costs
    const storageCosts = await calculateStorageCosts();

    // Calculate compute costs
    const computeCosts = await calculateComputeCosts(startOfMonth, endOfMonth);

    // Calculate database costs
    const databaseCosts = await calculateDatabaseCosts(startOfMonth, endOfMonth);

    // Calculate bandwidth costs
    const bandwidthCosts = await calculateBandwidthCosts();

    // Calculate other costs
    const otherCosts = await calculateOtherCosts();

    // Get user metrics
    const userCosts = await calculateUserCosts(apiCosts.total);

    const totalMonthlyCost =
      apiCosts.total +
      storageCosts.total +
      computeCosts.total +
      databaseCosts.total +
      bandwidthCosts.total +
      otherCosts.total;

    return {
      totalMonthlyCost,
      breakdown: {
        apis: apiCosts,
        storage: storageCosts,
        compute: computeCosts,
        database: databaseCosts,
        bandwidth: bandwidthCosts,
        other: otherCosts,
      },
      userCosts,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('❌ Failed to get project cost summary:', error);
    throw error;
  }
}

/**
 * Calculate API costs (Gemini, Replicate, etc.)
 */
async function calculateApiCosts(
  startDate: Date,
  endDate: Date
): Promise<{ total: number; services: ApiCostBreakdown[] }> {
  try {
    // Query all generations in date range
    const generationsRef = collection(db, 'generations');
    const q = query(
      generationsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);

    // Group by provider AND model
    const usageStats: Record<string, { calls: number; cost: number }> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const provider = data.provider?.toLowerCase() || 'unknown';
      // Normalize model name for matching
      const model = (data.modelName || data.modelId || 'default').toLowerCase();
      const key = `${provider}:${model}`;

      if (!usageStats[key]) {
        usageStats[key] = { calls: 0, cost: 0 };
      }
      usageStats[key].calls++;
      usageStats[key].cost += data.costInTHB || 0;
    });

    const services: ApiCostBreakdown[] = [];
    let total = 0;

    // 1. Gemini Models
    // Mapping from modelId format to API_PRICING key format
    const geminiModelMap: Record<string, string> = {
      'gemini-2.5-flash': '2.5-flash',
      'gemini-2.0-flash-exp': '2.0-flash-exp',
      'gemini-2.0-flash': '2.0-flash-exp', // Alias
      'gemini-veo-3': 'veo-3',
      'gemini-1.5-flash': '1.5-flash',
      'gemini-1.5-pro': '1.5-pro',
      'gemini-2.5-pro': '1.5-pro', // Use 1.5-pro pricing as fallback
    };

    // Group Gemini models
    const geminiModels: Record<string, { calls: number; cost: number; displayName: string; pricingKey: string }> = {};

    Object.entries(usageStats).forEach(([key, stats]) => {
      const [p, m] = key.split(':');
      if (p !== 'gemini') return;

      // Find matching model ID
      let pricingKey = '';
      let displayName = m;

      for (const [modelId, priceKey] of Object.entries(geminiModelMap)) {
        if (m.includes(modelId)) {
          pricingKey = priceKey;
          // Extract display name from model name (e.g., "gemini 2.5 flash (character details)" -> "Character Details")
          const match = m.match(/\(([^)]+)\)/);
          if (match) {
            displayName = `Gemini ${priceKey} - ${match[1]}`;
          } else {
            displayName = `Gemini ${priceKey}`;
          }
          break;
        }
      }

      if (!pricingKey) {
        // Unknown Gemini model - use generic
        pricingKey = '1.5-flash'; // Fallback
        displayName = `Gemini (${m})`;
      }

      const groupKey = displayName;
      if (!geminiModels[groupKey]) {
        geminiModels[groupKey] = { calls: 0, cost: 0, displayName, pricingKey };
      }

      geminiModels[groupKey].calls += stats.calls;
      geminiModels[groupKey].cost += stats.cost;
      delete usageStats[key]; // Mark as handled
    });

    // Create service entries for each unique Gemini usage
    Object.values(geminiModels).forEach((model) => {
      const details = API_PRICING.GEMINI[model.pricingKey as keyof typeof API_PRICING.GEMINI];
      
      if (!details) {
        console.warn(`⚠️ No pricing found for ${model.pricingKey}`);
        return;
      }

      // Determine rate for display
      let rate = 0;
      let rateModel = 'per token';
      if ('input' in details && typeof details.input === 'number') {
        rate = details.input * 1000000; // Convert to per 1M tokens
        rateModel = 'per 1M tokens (input)';
      } else if ('image' in details && typeof details.image === 'number') {
        rate = details.image;
        rateModel = 'per image';
      } else if ('video5s' in details && typeof details.video5s === 'number') {
        rate = details.video5s;
        rateModel = 'per 5s video';
      }

      services.push({
        apiName: model.displayName,
        provider: 'Google',
        pricing: {
          model: rateModel,
          rate: rate,
          freeQuota: (details as any).freeQuota || 'None',
        },
        currentMonthUsage: { calls: model.calls, cost: model.cost },
        projectedMonthlyCost: model.cost,
      });
      total += model.cost;
    });

    // 2. Replicate Models
    const replicateModelMap: Record<string, string> = {
      'stable-video-diffusion': 'stable-video-diffusion',
      'svd': 'stable-video-diffusion',
      'animatediff': 'animatediff',
      'ltx': 'ltx-video',
      'ltx-video': 'ltx-video',
    };

    const replicateModels: Record<string, { calls: number; cost: number; pricingKey: string }> = {};

    Object.entries(usageStats).forEach(([key, stats]) => {
      const [p, m] = key.split(':');
      if (p !== 'replicate') return;

      let pricingKey = '';
      for (const [modelId, priceKey] of Object.entries(replicateModelMap)) {
        if (m.includes(modelId)) {
          pricingKey = priceKey;
          break;
        }
      }

      if (!pricingKey) {
        pricingKey = 'animatediff'; // Default fallback
      }

      if (!replicateModels[pricingKey]) {
        replicateModels[pricingKey] = { calls: 0, cost: 0, pricingKey };
      }

      replicateModels[pricingKey].calls += stats.calls;
      replicateModels[pricingKey].cost += stats.cost;
      delete usageStats[key];
    });

    Object.values(replicateModels).forEach((model) => {
      const details = API_PRICING.REPLICATE[model.pricingKey as keyof typeof API_PRICING.REPLICATE];
      
      if (!details) return;

      services.push({
        apiName: `Replicate ${model.pricingKey}`,
        provider: 'Replicate',
        pricing: {
          model: 'per run',
          rate: details.perRun,
          freeQuota: 'None',
        },
        currentMonthUsage: { calls: model.calls, cost: model.cost },
        projectedMonthlyCost: model.cost,
      });
      total += model.cost;
    });

    // 3. ComfyUI Models
    const comfyuiStats = { image: { calls: 0, cost: 0 }, video: { calls: 0, cost: 0 } };

    Object.entries(usageStats).forEach(([key, stats]) => {
      const [p, m] = key.split(':');
      if (p !== 'comfyui') return;

      if (m.includes('video') || m.includes('animatediff') || m.includes('svd')) {
        comfyuiStats.video.calls += stats.calls;
        comfyuiStats.video.cost += stats.cost;
      } else {
        comfyuiStats.image.calls += stats.calls;
        comfyuiStats.image.cost += stats.cost;
      }
      delete usageStats[key];
    });

    if (comfyuiStats.image.calls > 0) {
      services.push({
        apiName: 'ComfyUI Image Generation',
        provider: 'ComfyUI',
        pricing: {
          model: 'per image',
          rate: API_PRICING.COMFYUI.image,
          freeQuota: 'Self-hosted (GPU cost not included)',
        },
        currentMonthUsage: comfyuiStats.image,
        projectedMonthlyCost: comfyuiStats.image.cost,
      });
      total += comfyuiStats.image.cost;
    }

    if (comfyuiStats.video.calls > 0) {
      services.push({
        apiName: 'ComfyUI Video Generation',
        provider: 'ComfyUI',
        pricing: {
          model: 'per video',
          rate: API_PRICING.COMFYUI.video,
          freeQuota: 'Self-hosted (GPU cost not included)',
        },
        currentMonthUsage: comfyuiStats.video,
        projectedMonthlyCost: comfyuiStats.video.cost,
      });
      total += comfyuiStats.video.cost;
    }

    // 4. Pollinations (Free tier)
    const pollinationsStats = { calls: 0, cost: 0 };

    Object.entries(usageStats).forEach(([key, stats]) => {
      const [p] = key.split(':');
      if (p !== 'pollinations') return;

      pollinationsStats.calls += stats.calls;
      pollinationsStats.cost += stats.cost;
      delete usageStats[key];
    });

    if (pollinationsStats.calls > 0) {
      services.push({
        apiName: 'Pollinations.ai (Free)',
        provider: 'Pollinations',
        pricing: {
          model: 'free',
          rate: 0,
          freeQuota: 'Unlimited (Community supported)',
        },
        currentMonthUsage: pollinationsStats,
        projectedMonthlyCost: 0,
      });
    }

    // 5. Handle remaining usage (Other/Unknown)
    Object.entries(usageStats).forEach(([key, stats]) => {
      const [provider, model] = key.split(':');
      
      // Skip if no usage
      if (stats.calls === 0) return;

      // Capitalize provider name
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      // Clean up model name (remove provider prefix if duplicated)
      let cleanModel = model.replace(provider, '').trim();
      if (!cleanModel) cleanModel = 'Unknown Model';

      services.push({
        apiName: `${providerName} - ${cleanModel}`,
        provider: providerName,
        pricing: {
          model: 'tracked cost',
          rate: stats.cost / (stats.calls || 1),
          freeQuota: 'Unknown',
        },
        currentMonthUsage: {
          calls: stats.calls,
          cost: stats.cost,
        },
        projectedMonthlyCost: stats.cost,
      });
      total += stats.cost;
    });

    // Sort services by cost (highest first)
    services.sort((a, b) => b.currentMonthUsage.cost - a.currentMonthUsage.cost);

    return { total, services };
  } catch (error) {
    console.error('❌ Failed to calculate API costs:', error);
    return { total: 0, services: [] };
  }
}

/**
 * Calculate storage costs (Firebase Storage + Firestore)
 */
async function calculateStorageCosts(): Promise<{
  total: number;
  firebase: number;
  cloudStorage: number;
}> {
  // Note: In production, get actual usage from Firebase Console API
  // For now, estimate based on typical usage

  // Estimate: 100 MB per user (images/videos)
  const usersRef = collection(db, 'subscriptions');
  const usersSnapshot = await getDocs(usersRef);
  const userCount = usersSnapshot.size;

  const estimatedStorageGB = (userCount * 100) / 1024; // MB to GB
  const firebaseCost =
    estimatedStorageGB > 5
      ? (estimatedStorageGB - 5) * API_PRICING.FIREBASE.storage.paidStorage
      : 0;

  return {
    total: firebaseCost,
    firebase: firebaseCost,
    cloudStorage: 0, // Not using Cloud Storage directly
  };
}

/**
 * Calculate compute costs (Cloud Run, Cloud Functions)
 */
async function calculateComputeCosts(
  _startDate: Date,
  _endDate: Date
): Promise<{
  total: number;
  cloudRun: number;
  cloudFunctions: number;
}> {
  // Voice Cloning API (Cloud Run)
  // Estimate: 10 requests/day, 30s per request, 2 vCPU, 8Gi memory
  const avgRequestsPerDay = 10;
  const daysInMonth = 30;
  const avgDurationSeconds = 30;
  const totalRequests = avgRequestsPerDay * daysInMonth;

  const vcpuSeconds = totalRequests * avgDurationSeconds * 2; // 2 vCPU
  const memoryGibSeconds = totalRequests * avgDurationSeconds * 8; // 8 GiB

  const cloudRunCpu = vcpuSeconds * API_PRICING.GOOGLE_CLOUD.cloudRun.cpu;
  const cloudRunMemory = memoryGibSeconds * API_PRICING.GOOGLE_CLOUD.cloudRun.memory;
  const cloudRunRequests = totalRequests * API_PRICING.GOOGLE_CLOUD.cloudRun.requests;
  const cloudRunTotal = cloudRunCpu + cloudRunMemory + cloudRunRequests;

  // Cloud Functions (mostly free tier)
  const cloudFunctionsCost = 0; // Within free tier (2M invocations/month)

  return {
    total: cloudRunTotal + cloudFunctionsCost,
    cloudRun: cloudRunTotal,
    cloudFunctions: cloudFunctionsCost,
  };
}

/**
 * Calculate database costs (Firestore)
 */
async function calculateDatabaseCosts(
  _startDate: Date,
  _endDate: Date
): Promise<{
  total: number;
  firestore: number;
}> {
  // Estimate Firestore operations
  // Most operations are within free tier (50K reads, 20K writes/day)

  // For paid usage (if exceeding free tier):
  // Reads: ฿0.36 per 100K
  // Writes: ฿1.08 per 100K

  // Assume we're within free tier for now
  const firestoreCost = 0;

  return {
    total: firestoreCost,
    firestore: firestoreCost,
  };
}

/**
 * Calculate bandwidth costs
 */
async function calculateBandwidthCosts(): Promise<{
  total: number;
  hosting: number;
  cdn: number;
}> {
  // Firebase Hosting: Free tier (360 MB/day = 10.8 GB/month)
  // Assume within free tier
  const hostingCost = 0;

  return {
    total: hostingCost,
    hosting: hostingCost,
    cdn: 0,
  };
}

/**
 * Calculate other miscellaneous costs
 */
async function calculateOtherCosts(): Promise<{
  total: number;
  services: ServiceCost[];
}> {
  const services: ServiceCost[] = [
    {
      service: 'Firebase Authentication',
      category: 'other',
      provider: 'Firebase',
      monthlyCost: 0,
      usage: 'Unlimited MAU',
      description: 'User authentication (Free)',
      lastUpdated: new Date(),
    },
    {
      service: 'Domain & DNS',
      category: 'other',
      provider: 'Varies',
      monthlyCost: 0,
      usage: 'Firebase subdomain',
      description: 'Using peace-script-ai.web.app (Free)',
      lastUpdated: new Date(),
    },
  ];

  const total = services.reduce((sum, s) => sum + s.monthlyCost, 0);

  return { total, services };
}

/**
 * Calculate per-user costs and profitability
 */
async function calculateUserCosts(totalApiCost: number): Promise<{
  averageCostPerUser: number;
  totalActiveUsers: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
}> {
  try {
    // Get active subscriptions
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef);
    const snapshot = await getDocs(q);

    let totalActiveUsers = 0;
    let totalRevenue = 0;

    const tierPrices = {
      basic: 149.5,
      pro: 499.5,
      enterprise: 8000,
      free: 0,
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      totalActiveUsers++;

      const tier = data.subscription?.tier || 'free';
      const price = tierPrices[tier as keyof typeof tierPrices] || 0;
      totalRevenue += price;
    });

    const averageCostPerUser = totalActiveUsers > 0 ? totalApiCost / totalActiveUsers : 0;
    const profit = totalRevenue - totalApiCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      averageCostPerUser,
      totalActiveUsers,
      totalRevenue,
      profit,
      profitMargin,
    };
  } catch (error) {
    console.error('❌ Failed to calculate user costs:', error);
    return {
      averageCostPerUser: 0,
      totalActiveUsers: 0,
      totalRevenue: 0,
      profit: 0,
      profitMargin: 0,
    };
  }
}

/**
 * Get cost trends (last 6 months)
 */
export async function getCostTrends(months: number = 6): Promise<
  Array<{
    month: string;
    totalCost: number;
    apiCost: number;
    computeCost: number;
    storageCost: number;
  }>
> {
  const trends = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const apiCosts = await calculateApiCosts(startOfMonth, endOfMonth);
    const computeCosts = await calculateComputeCosts(startOfMonth, endOfMonth);
    const storageCosts = await calculateStorageCosts();

    trends.push({
      month: monthDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      }),
      totalCost: apiCosts.total + computeCosts.total + storageCosts.total,
      apiCost: apiCosts.total,
      computeCost: computeCosts.total,
      storageCost: storageCosts.total,
    });
  }

  return trends;
}

/**
 * Export cost data to CSV
 */
export function exportCostDataToCSV(summary: ProjectCostSummary): string {
  const lines = [];

  // Header
  lines.push('Peace Script AI - Project Cost Summary');
  lines.push(`Generated: ${summary.lastUpdated.toLocaleString('th-TH')}`);
  lines.push('');

  // Total
  lines.push(`Total Monthly Cost,฿${summary.totalMonthlyCost.toFixed(2)}`);
  lines.push('');

  // API Costs
  lines.push('API Services');
  lines.push('Service,Provider,Calls,Cost (THB)');
  summary.breakdown.apis.services.forEach(api => {
    lines.push(
      `${api.apiName},${api.provider},${api.currentMonthUsage.calls},฿${api.currentMonthUsage.cost.toFixed(2)}`
    );
  });
  lines.push(`Total API Cost,,฿${summary.breakdown.apis.total.toFixed(2)}`);
  lines.push('');

  // Storage
  lines.push('Storage');
  lines.push(`Firebase Storage,฿${summary.breakdown.storage.firebase.toFixed(2)}`);
  lines.push(`Cloud Storage,฿${summary.breakdown.storage.cloudStorage.toFixed(2)}`);
  lines.push(`Total Storage,฿${summary.breakdown.storage.total.toFixed(2)}`);
  lines.push('');

  // Compute
  lines.push('Compute');
  lines.push(`Cloud Run (Voice Cloning),฿${summary.breakdown.compute.cloudRun.toFixed(2)}`);
  lines.push(`Cloud Functions,฿${summary.breakdown.compute.cloudFunctions.toFixed(2)}`);
  lines.push(`Total Compute,฿${summary.breakdown.compute.total.toFixed(2)}`);
  lines.push('');

  // User Economics
  lines.push('User Economics');
  lines.push(`Active Users,${summary.userCosts.totalActiveUsers}`);
  lines.push(`Revenue,฿${summary.userCosts.totalRevenue.toLocaleString('th-TH')}`);
  lines.push(`Average Cost per User,฿${summary.userCosts.averageCostPerUser.toFixed(2)}`);
  lines.push(`Profit,฿${summary.userCosts.profit.toFixed(2)}`);
  lines.push(`Profit Margin,${summary.userCosts.profitMargin.toFixed(1)}%`);

  return lines.join('\n');
}

