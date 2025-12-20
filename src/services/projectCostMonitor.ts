/**
 * Project Cost Monitoring Service
 * 
 * ติดตาม และคำนวณต้นทุนโปรเจกต์ทั้งหมด
 */

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  ProjectCostSummary,
  ApiCostBreakdown,
  ServiceCost,
} from '../types/analytics';
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

    // Group by provider
    const providerStats: Record<
      string,
      {
        calls: number;
        cost: number;
        models: Set<string>;
      }
    > = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const provider = data.provider;

      if (!providerStats[provider]) {
        providerStats[provider] = {
          calls: 0,
          cost: 0,
          models: new Set(),
        };
      }

      providerStats[provider].calls++;
      providerStats[provider].cost += data.costInTHB || 0;
      providerStats[provider].models.add(data.modelName);
    });

    // Build breakdown
    const services: ApiCostBreakdown[] = [];
    let total = 0;

    // Gemini API
    if (providerStats['gemini']) {
      const stats = providerStats['gemini'];
      services.push({
        apiName: 'Gemini API',
        provider: 'Google',
        pricing: {
          model: 'per request/character',
          rate: 0, // Varies by model
          freeQuota: '1,500 requests/day (2.0 Flash)',
        },
        currentMonthUsage: {
          calls: stats.calls,
          cost: stats.cost,
        },
        projectedMonthlyCost: stats.cost,
      });
      total += stats.cost;
    }

    // Replicate API
    if (providerStats['replicate']) {
      const stats = providerStats['replicate'];
      services.push({
        apiName: 'Replicate API',
        provider: 'Replicate',
        pricing: {
          model: 'per video generation',
          rate: 0.63, // ฿0.63 average (SVD)
          freeQuota: 'None',
        },
        currentMonthUsage: {
          calls: stats.calls,
          cost: stats.cost,
        },
        projectedMonthlyCost: stats.cost,
      });
      total += stats.cost;
    }

    // ComfyUI (Free)
    if (providerStats['comfyui']) {
      const stats = providerStats['comfyui'];
      services.push({
        apiName: 'ComfyUI (Local)',
        provider: 'Self-hosted',
        pricing: {
          model: 'free',
          rate: 0,
          freeQuota: 'Unlimited',
        },
        currentMonthUsage: {
          calls: stats.calls,
          cost: 0,
        },
        projectedMonthlyCost: 0,
      });
    }

    // Pollinations (Free)
    if (providerStats['pollinations']) {
      const stats = providerStats['pollinations'];
      services.push({
        apiName: 'Pollinations.ai',
        provider: 'Pollinations',
        pricing: {
          model: 'free',
          rate: 0,
          freeQuota: 'Unlimited',
        },
        currentMonthUsage: {
          calls: stats.calls,
          cost: 0,
        },
        projectedMonthlyCost: 0,
      });
    }

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
  const cloudRunRequests =
    totalRequests * API_PRICING.GOOGLE_CLOUD.cloudRun.requests;
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
async function calculateUserCosts(
  totalApiCost: number
): Promise<{
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

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalActiveUsers++;

      const tier = data.subscription?.tier || 'free';
      const price = tierPrices[tier as keyof typeof tierPrices] || 0;
      totalRevenue += price;
    });

    const averageCostPerUser =
      totalActiveUsers > 0 ? totalApiCost / totalActiveUsers : 0;
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
    const startOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    );

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
  summary.breakdown.apis.services.forEach((api) => {
    lines.push(
      `${api.apiName},${api.provider},${api.currentMonthUsage.calls},฿${api.currentMonthUsage.cost.toFixed(2)}`
    );
  });
  lines.push(`Total API Cost,,฿${summary.breakdown.apis.total.toFixed(2)}`);
  lines.push('');

  // Storage
  lines.push('Storage');
  lines.push(
    `Firebase Storage,฿${summary.breakdown.storage.firebase.toFixed(2)}`
  );
  lines.push(
    `Cloud Storage,฿${summary.breakdown.storage.cloudStorage.toFixed(2)}`
  );
  lines.push(`Total Storage,฿${summary.breakdown.storage.total.toFixed(2)}`);
  lines.push('');

  // Compute
  lines.push('Compute');
  lines.push(
    `Cloud Run (Voice Cloning),฿${summary.breakdown.compute.cloudRun.toFixed(2)}`
  );
  lines.push(
    `Cloud Functions,฿${summary.breakdown.compute.cloudFunctions.toFixed(2)}`
  );
  lines.push(`Total Compute,฿${summary.breakdown.compute.total.toFixed(2)}`);
  lines.push('');

  // User Economics
  lines.push('User Economics');
  lines.push(`Active Users,${summary.userCosts.totalActiveUsers}`);
  lines.push(
    `Revenue,฿${summary.userCosts.totalRevenue.toLocaleString('th-TH')}`
  );
  lines.push(
    `Average Cost per User,฿${summary.userCosts.averageCostPerUser.toFixed(2)}`
  );
  lines.push(`Profit,฿${summary.userCosts.profit.toFixed(2)}`);
  lines.push(`Profit Margin,${summary.userCosts.profitMargin.toFixed(1)}%`);

  return lines.join('\n');
}
