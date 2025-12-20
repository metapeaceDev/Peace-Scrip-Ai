/**
 * Admin Analytics Service
 *
 * ดึงและวิเคราะห์ข้อมูล analytics สำหรับ admin dashboard
 * รวมถึง user statistics, revenue metrics, usage analytics
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  UserStats,
  RevenueMetrics,
  UsageAnalytics,
  UserListItem,
  UserDetails,
  SubscriptionTier,
  TierUsageBreakdown,
  QueueMetrics,
} from '../types';
import { API_PRICING, SUBSCRIPTION_PRICING } from '../types/analytics';
import { getUserSubscription } from './subscriptionManager';

// ===== Pricing Constants =====
const TIER_PRICES = {
  basic: 149.5, // Early Bird
  pro: 499.5, // Early Bird
  enterprise: 8000,
} as const;

/**
 * Get User Statistics
 */
export async function getUserStats(filters?: {
  tier?: SubscriptionTier;
  status?: 'active' | 'canceled' | 'past_due';
  dateRange?: { start: Date; end: Date };
}): Promise<UserStats> {
  try {
    console.log('📊 Fetching user statistics...');

    // Query subscriptions collection
    let q = query(collection(db, 'subscriptions'));

    // Apply filters if provided
    if (filters?.tier) {
      q = query(q, where('subscription.tier', '==', filters.tier));
    }

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate statistics
    const stats: UserStats = {
      total: users.length,
      byTier: {
        free: 0,
        basic: 0,
        pro: 0,
        enterprise: 0,
      },
      tierMetrics: {
        free: { count: 0, revenue: 0, cost: 0 },
        basic: { count: 0, revenue: 0, cost: 0 },
        pro: { count: 0, revenue: 0, cost: 0 },
        enterprise: { count: 0, revenue: 0, cost: 0 },
      },
      byStatus: {
        active: 0,
        canceled: 0,
        past_due: 0,
      },
      active: 0,
      online: 0,
      new: 0,
      churned: 0,
    };

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Map userId to Tier for cost calculation
    const userTierMap: Record<string, SubscriptionTier> = {};

    users.forEach((user: any) => {
      const tier = (user.subscription?.tier || 'free') as SubscriptionTier;
      userTierMap[user.id] = tier;

      stats.byTier[tier]++;

      if (stats.tierMetrics) {
        stats.tierMetrics[tier].count++;
        if (user.subscription?.status === 'active') {
          const price = TIER_PRICES[tier as keyof typeof TIER_PRICES] || 0;
          stats.tierMetrics[tier].revenue += price;
        }
      }

      // Count by status (default to active)
      const status = user.subscription?.status || 'active';
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      }

      // Count active users (used system in last 30 days)
      const lastUpdated =
        user.lastUpdated instanceof Timestamp
          ? user.lastUpdated.toDate()
          : new Date(user.lastUpdated);

      if (lastUpdated >= thirtyDaysAgo) {
        stats.active++;
      }

      // Count online users (active within last 5 minutes)
      if (lastUpdated >= fiveMinutesAgo) {
        stats.online++;
      }

      // Count new users (created in date range or last 30 days)
      if (filters?.dateRange) {
        const createdAt =
          user.createdAt instanceof Timestamp
            ? user.createdAt.toDate()
            : new Date(user.createdAt || user.lastUpdated);

        if (createdAt >= filters.dateRange.start && createdAt <= filters.dateRange.end) {
          stats.new++;
        }
      }

      // Count churned users (canceled in period)
      if (status === 'canceled' && user.subscription?.canceledAt) {
        const canceledAt =
          user.subscription.canceledAt instanceof Timestamp
            ? user.subscription.canceledAt.toDate()
            : new Date(user.subscription.canceledAt);

        if (filters?.dateRange) {
          if (canceledAt >= filters.dateRange.start && canceledAt <= filters.dateRange.end) {
            stats.churned++;
          }
        } else if (canceledAt >= thirtyDaysAgo) {
          stats.churned++;
        }
      }
    });

    // Calculate Costs from Generations (Current Month)
    try {
      const generationsRef = collection(db, 'generations');
      const genQuery = query(
        generationsRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth))
      );
      
      const genSnapshot = await getDocs(genQuery);
      
      genSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        const cost = data.costInTHB || 0;
        
        if (userId && userTierMap[userId] && stats.tierMetrics) {
          const tier = userTierMap[userId];
          stats.tierMetrics[tier].cost += cost;
        }
      });
    } catch (error) {
      console.error('Error calculating tier costs:', error);
    }

    console.log('✅ User statistics fetched:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Get Revenue Metrics
 */
export async function getRevenueMetrics(
  period: 'month' | 'year' = 'month'
): Promise<RevenueMetrics> {
  try {
    console.log(`📊 Calculating revenue metrics (${period})...`);

    const snapshot = await getDocs(collection(db, 'subscriptions'));
    const users = snapshot.docs.map(doc => doc.data());

    const metrics: RevenueMetrics = {
      mrr: 0,
      arr: 0,
      byTier: {
        basic: 0,
        pro: 0,
        enterprise: 0,
      },
      growth: {
        new: 0,
        expansion: 0,
        contraction: 0,
        churned: 0,
      },
      arpu: 0,
    };

    let totalPaidUsers = 0;

    users.forEach(user => {
      const tier = user.subscription?.tier;
      const status = user.subscription?.status || 'active';

      // Only count active subscriptions
      if (status !== 'active') return;
      if (!tier || tier === 'free') return;

      totalPaidUsers++;

      // Calculate MRR
      const price = TIER_PRICES[tier as keyof typeof TIER_PRICES] || 0;
      metrics.mrr += price;
      metrics.byTier[tier as keyof typeof metrics.byTier] += price;
    });

    // Calculate ARR (MRR × 12)
    metrics.arr = metrics.mrr * 12;

    // Calculate ARPU (Average Revenue Per User)
    metrics.arpu = totalPaidUsers > 0 ? metrics.mrr / totalPaidUsers : 0;

    console.log('✅ Revenue metrics calculated:', metrics);
    return metrics;
  } catch (error) {
    console.error('❌ Error calculating revenue metrics:', error);
    throw error;
  }
}

/**
 * Get Usage Analytics
 */
// Helper: คำนวณ cost จาก generation
function calculateGenerationCost(gen: any): number {
  const type = gen.type;
  const modelName = (gen.modelName || '').toLowerCase();
  const provider = (gen.provider || '').toLowerCase();

  // Text (Gemini)
  if (type === 'text') {
    const inputTokens = gen.inputTokens || 0;
    const outputTokens = gen.outputTokens || 0;
    
    if (modelName.includes('2.0-flash')) {
      return 0; // Free tier
    } else if (modelName.includes('2.5-flash') || modelName.includes('1.5-flash')) {
      return inputTokens * API_PRICING.GEMINI['2.5-flash'].input + 
             outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
    }
  }
  
  // Images
  if (type === 'image') {
    if (provider.includes('gemini')) {
      return API_PRICING.GEMINI['2.5-flash'].image || 0.0875;
    } else if (provider.includes('comfyui')) {
      return API_PRICING.COMFYUI.image || 0.5;
    }
  }
  
  // Videos
  if (type === 'video') {
    if (modelName.includes('veo')) {
      const duration = gen.duration || 10;
      return duration <= 5 ? API_PRICING.GEMINI['veo-3'].video5s : API_PRICING.GEMINI['veo-3'].video10s;
    } else if (provider.includes('replicate')) {
      if (modelName.includes('ltx')) return API_PRICING.REPLICATE['ltx-video'].perRun;
      if (modelName.includes('animatediff')) return API_PRICING.REPLICATE.animatediff.perRun;
      return API_PRICING.REPLICATE['stable-video-diffusion'].perRun;
    } else if (provider.includes('comfyui')) {
      return API_PRICING.COMFYUI.video || 2.0;
    }
  }
  
  // Audio (assume minimal cost)
  if (type === 'audio') {
    return 0.5; // ฿0.50 per audio generation
  }
  
  return 0;
}

export async function getUsageAnalytics(_dateRange?: {
  start: Date;
  end: Date;
}): Promise<UsageAnalytics> {
  try {
    console.log('📊 Fetching usage analytics...');

    // Get all subscriptions for user info
    const subscriptionsSnapshot = await getDocs(collection(db, 'subscriptions'));
    const users = subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Get generations data (NEW: from our tracking system)
    const generationsSnapshot = await getDocs(collection(db, 'generations'));
    const generations = generationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Initialize tier breakdown
    const tierBreakdown: Record<SubscriptionTier, TierUsageBreakdown> = {
      free: {
        text: { count: 0, cost: 0, revenue: 0, profit: 0 },
        images: { count: 0, cost: 0, revenue: 0, profit: 0 },
        videos: { count: 0, cost: 0, revenue: 0, profit: 0 },
        audio: { count: 0, cost: 0, revenue: 0, profit: 0 },
      },
      basic: {
        text: { count: 0, cost: 0, revenue: 0, profit: 0 },
        images: { count: 0, cost: 0, revenue: 0, profit: 0 },
        videos: { count: 0, cost: 0, revenue: 0, profit: 0 },
        audio: { count: 0, cost: 0, revenue: 0, profit: 0 },
      },
      pro: {
        text: { count: 0, cost: 0, revenue: 0, profit: 0 },
        images: { count: 0, cost: 0, revenue: 0, profit: 0 },
        videos: { count: 0, cost: 0, revenue: 0, profit: 0 },
        audio: { count: 0, cost: 0, revenue: 0, profit: 0 },
      },
      enterprise: {
        text: { count: 0, cost: 0, revenue: 0, profit: 0 },
        images: { count: 0, cost: 0, revenue: 0, profit: 0 },
        videos: { count: 0, cost: 0, revenue: 0, profit: 0 },
        audio: { count: 0, cost: 0, revenue: 0, profit: 0 },
      },
    };

    const analytics: UsageAnalytics = {
      credits: {
        total: 0,
        average: 0,
        byTier: {
          free: 0,
          basic: 0,
          pro: 0,
          enterprise: 0,
        },
      },
      veoVideos: {
        total: 0,
        byUser: [],
      },
      apiCalls: {
        scripts: 0,
        images: 0,
        videos: 0,
        audio: 0,
      },
      storage: {
        totalGB: 0,
        average: 0,
        limitGB: 0,
        remainingGB: 0,
      },
      tierBreakdown,
    };

    const tierCounts = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    // Count API calls from generations collection AND calculate tier breakdown
    const veoVideoCounts: Record<string, number> = {};
    
    generations.forEach((gen: any) => {
      const type = gen.type;
      const modelName = (gen.modelName || '').toLowerCase();
      const userId = gen.userId;
      
      // Find user's tier
      const user = users.find(u => u.id === userId);
      const tier = (user?.subscription?.tier || 'free') as SubscriptionTier;
      
      // Calculate cost for this generation
      const cost = calculateGenerationCost(gen);

      // Count by type
      if (type === 'text') {
        analytics.apiCalls.scripts++;
        tierBreakdown[tier].text.count++;
        tierBreakdown[tier].text.cost += cost;
      } else if (type === 'image') {
        analytics.apiCalls.images++;
        tierBreakdown[tier].images.count++;
        tierBreakdown[tier].images.cost += cost;
      } else if (type === 'video') {
        analytics.apiCalls.videos++;
        tierBreakdown[tier].videos.count++;
        tierBreakdown[tier].videos.cost += cost;
        
        // Check if it's Veo video
        if (modelName.includes('veo')) {
          veoVideoCounts[userId] = (veoVideoCounts[userId] || 0) + 1;
        }
      } else if (type === 'audio') {
        analytics.apiCalls.audio++;
        tierBreakdown[tier].audio.count++;
        tierBreakdown[tier].audio.cost += cost;
      }
    });

    // Calculate Veo videos by user
    Object.entries(veoVideoCounts).forEach(([userId, count]) => {
      const user = users.find(u => u.id === userId);
      analytics.veoVideos.total += count;
      analytics.veoVideos.byUser.push({
        userId,
        email: user?.email || 'unknown',
        count,
      });
    });

    // Process users for credits and storage
    const tierUserCounts: Record<SubscriptionTier, number> = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };
    
    users.forEach(user => {
      const tier = (user.subscription?.tier || 'free') as SubscriptionTier;
      const creditsUsed = user.monthlyUsage?.creditsUsed || 0;

      // Credits
      analytics.credits.total += creditsUsed;
      analytics.credits.byTier[tier] += creditsUsed;
      tierCounts[tier]++;
      tierUserCounts[tier]++;

      // Calculate revenue contribution
      const billingType = user.subscription?.billingCycle || 'monthly';
      const tierPricing = SUBSCRIPTION_PRICING[tier];
      const monthlyRevenue = billingType === 'yearly' 
        ? tierPricing.yearly / 12 
        : tierPricing.monthly;
      
      // Distribute revenue across all types proportionally
      // (เฉลี่ยไปที่ text, images, videos, audio ตามสัดส่วนการใช้งาน)
      const userGenerations = generations.filter((g: any) => g.userId === user.id);
      const userTextCount = userGenerations.filter((g: any) => g.type === 'text').length;
      const userImageCount = userGenerations.filter((g: any) => g.type === 'image').length;
      const userVideoCount = userGenerations.filter((g: any) => g.type === 'video').length;
      const userAudioCount = userGenerations.filter((g: any) => g.type === 'audio').length;
      const totalUserGens = userTextCount + userImageCount + userVideoCount + userAudioCount;
      
      if (totalUserGens > 0) {
        tierBreakdown[tier].text.revenue += (userTextCount / totalUserGens) * monthlyRevenue;
        tierBreakdown[tier].images.revenue += (userImageCount / totalUserGens) * monthlyRevenue;
        tierBreakdown[tier].videos.revenue += (userVideoCount / totalUserGens) * monthlyRevenue;
        tierBreakdown[tier].audio.revenue += (userAudioCount / totalUserGens) * monthlyRevenue;
      } else {
        // If no generations, split revenue equally
        tierBreakdown[tier].text.revenue += monthlyRevenue / 4;
        tierBreakdown[tier].images.revenue += monthlyRevenue / 4;
        tierBreakdown[tier].videos.revenue += monthlyRevenue / 4;
        tierBreakdown[tier].audio.revenue += monthlyRevenue / 4;
      }

      // Storage - Calculate with proper tier limits
      const storageUsed = (user.usage?.storageUsed || 0) / 1024 / 1024 / 1024; // Convert to GB
      analytics.storage.totalGB += storageUsed;

      // Get storage limit for this user's tier
      const tierStorageLimit = (() => {
        switch (tier) {
          case 'free':
            return 0.5; // 500 MB
          case 'basic':
            return 1; // 1 GB (from userStore)
          case 'pro':
            return 10; // 10 GB
          case 'enterprise':
            return 100; // 100 GB
          default:
            return 0.5;
        }
      })();
      analytics.storage.limitGB += tierStorageLimit;
    });

    // Calculate averages
    analytics.credits.average = users.length > 0 ? analytics.credits.total / users.length : 0;
    analytics.storage.average = users.length > 0 ? analytics.storage.totalGB / users.length : 0;
    analytics.storage.remainingGB = Math.max(
      0,
      analytics.storage.limitGB - analytics.storage.totalGB
    );

    // Sort Veo users by count (descending)
    analytics.veoVideos.byUser.sort((a, b) => b.count - a.count);

    // Calculate profit for each tier and type
    (['free', 'basic', 'pro', 'enterprise'] as SubscriptionTier[]).forEach(tier => {
      tierBreakdown[tier].text.profit = tierBreakdown[tier].text.revenue - tierBreakdown[tier].text.cost;
      tierBreakdown[tier].images.profit = tierBreakdown[tier].images.revenue - tierBreakdown[tier].images.cost;
      tierBreakdown[tier].videos.profit = tierBreakdown[tier].videos.revenue - tierBreakdown[tier].videos.cost;
      tierBreakdown[tier].audio.profit = tierBreakdown[tier].audio.revenue - tierBreakdown[tier].audio.cost;
    });

    console.log('✅ Usage analytics fetched:', analytics);
    return analytics;
  } catch (error) {
    console.error('❌ Error fetching usage analytics:', error);
    throw error;
  }
}

/**
 * Get Queue Metrics (for real-time job tracking)
 */
export async function getQueueMetrics(): Promise<QueueMetrics> {
  try {
    console.log('📊 Fetching queue metrics...');

    // Get all generations
    const generationsSnapshot = await getDocs(collection(db, 'generations'));
    const generations = generationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let completed = 0;
    let processing = 0;
    let queued = 0;

    generations.forEach((gen: any) => {
      const status = (gen.status || 'completed').toLowerCase();
      
      if (status === 'completed' || status === 'success') {
        completed++;
      } else if (status === 'processing' || status === 'running' || status === 'in_progress') {
        processing++;
      } else if (status === 'queued' || status === 'pending' || status === 'waiting') {
        queued++;
      } else {
        // ถ้าไม่มี status ถือว่าเสร็จแล้ว
        completed++;
      }
    });

    const total = completed + processing + queued;
    const completedPercentage = total > 0 ? (completed / total) * 100 : 0;
    const processingPercentage = total > 0 ? (processing / total) * 100 : 0;
    const queuedPercentage = total > 0 ? (queued / total) * 100 : 0;

    const metrics: QueueMetrics = {
      total,
      completed,
      processing,
      queued,
      completedPercentage,
      processingPercentage,
      queuedPercentage,
    };

    console.log('✅ Queue metrics fetched:', metrics);
    return metrics;
  } catch (error) {
    console.error('❌ Error fetching queue metrics:', error);
    throw error;
  }
}

/**
 * Get User List (with pagination)
 */
export async function getUserList(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    tier?: SubscriptionTier;
    status?: string;
    sortBy?: 'createdAt' | 'lastActive' | 'creditsUsed';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  users: UserListItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    const {
      page = 1,
      limit: pageLimit = 50,
      search,
      tier,
      status,
      sortBy = 'lastActive',
      sortOrder = 'desc',
    } = options;

    console.log('📊 Fetching user list...', options);

    // Query subscriptions
    let q = query(collection(db, 'subscriptions'));

    // Apply filters
    if (tier) {
      q = query(q, where('subscription.tier', '==', tier));
    }

    const snapshot = await getDocs(q);

    // Fetch all users from Firebase Auth to get email and displayName
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const usersMap = new Map();

    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      usersMap.set(userDoc.id, {
        email: userData.email || 'unknown@example.com',
        displayName: userData.displayName || userData.name || 'User',
        photoURL: userData.photoURL || userData.avatar,
      });
    });

    let users = snapshot.docs.map(doc => {
      const data = doc.data();
      const userInfo = usersMap.get(doc.id) || {
        email: data.email || 'unknown@example.com',
        displayName: data.displayName || 'User',
        photoURL: data.photoURL,
      };

      return {
        userId: doc.id,
        email: userInfo.email,
        displayName: userInfo.displayName,
        photoURL: userInfo.photoURL,
        tier: (data.subscription?.tier || 'free') as SubscriptionTier,
        status: (data.subscription?.status || 'active') as UserListItem['status'],
        credits: {
          used: data.monthlyUsage?.creditsUsed || 0,
          max: data.subscription?.maxCredits || 50,
          remaining: (data.subscription?.credits || 50) - (data.monthlyUsage?.creditsUsed || 0),
        },
        veoVideos: {
          used: data.monthlyUsage?.veoVideosGenerated || 0,
          max: data.subscription?.features?.maxVeoVideosPerMonth || 0,
        },
        lastActive:
          data.lastUpdated instanceof Timestamp
            ? data.lastUpdated.toDate()
            : new Date(data.lastUpdated || Date.now()),
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || data.lastUpdated || Date.now()),
      } as UserListItem;
    });

    // Filter by status
    if (status && status !== 'all') {
      users = users.filter(u => u.status === status);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        u =>
          u.email.toLowerCase().includes(searchLower) ||
          u.displayName.toLowerCase().includes(searchLower) ||
          u.userId.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    users.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'lastActive':
          aValue = a.lastActive?.getTime() || 0;
          bValue = b.lastActive?.getTime() || 0;
          break;
        case 'creditsUsed':
          aValue = a.credits.used;
          bValue = b.credits.used;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    const total = users.length;
    const totalPages = Math.ceil(total / pageLimit);
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    console.log(`✅ User list fetched: ${paginatedUsers.length}/${total} users`);

    return {
      users: paginatedUsers,
      total,
      page,
      totalPages,
    };
  } catch (error) {
    console.error('❌ Error fetching user list:', error);
    throw error;
  }
}

/**
 * Get User Details
 */
export async function getUserDetails(userId: string): Promise<UserDetails | null> {
  try {
    console.log(`📊 Fetching user details for: ${userId}`);

    // Get subscription data
    const userRecord = await getUserSubscription(userId);

    // Get user data from users collection for real-time info
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : null;

    // Get user projects from projects collection (real count)
    const projectsQuery = query(
      collection(db, 'projects'),
      where('userId', '==', userId)
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    const projectsCount = projectsSnapshot.size;
    
    const projects = projectsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Project',
        type: data.type || 'Movie',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Count characters and scenes from user's projects
    let charactersCount = 0;
    let scenesCount = 0;
    projectsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.characters && Array.isArray(data.characters)) {
        charactersCount += data.characters.length;
      }
      if (data.scenes && Array.isArray(data.scenes)) {
        scenesCount += data.scenes.length;
      }
    });

    // Build user details with real-time data
    const details: UserDetails = {
      profile: {
        email: userData?.email || userRecord.userId,
        displayName: userData?.displayName || 'User',
        createdAt: userData?.createdAt || new Date(),
        lastActive: userData?.lastActive || new Date(),
      },
      subscription: {
        tier: userRecord.subscription.tier,
        status: 'active', // Always active if subscription exists
        startDate: userData?.subscriptionStartDate,
        canceledAt: userData?.subscriptionCanceledAt,
      },
      usage: {
        credits: {
          used: userRecord.monthlyUsage.creditsUsed,
          max: userRecord.subscription.maxCredits,
          remaining: userRecord.subscription.credits,
        },
        veoVideos: {
          used: userRecord.monthlyUsage.veoVideosGenerated,
          max: userRecord.subscription.features.maxVeoVideosPerMonth,
        },
        projects: projectsCount,
        characters: charactersCount,
        scenes: scenesCount,
        storageUsed: userRecord.usage.storageUsed,
      },
      projects,
      usageHistory: [
        {
          month: userRecord.monthlyUsage.month,
          creditsUsed: userRecord.monthlyUsage.creditsUsed,
          veoVideos: userRecord.monthlyUsage.veoVideosGenerated,
          apiCalls: {
            scripts: userRecord.usage.scriptsGenerated,
            images: userRecord.usage.imagesGenerated,
            videos: userRecord.usage.videosGenerated,
          },
        },
      ],
    };

    console.log('✅ User details fetched with real-time data:', {
      projects: projectsCount,
      characters: charactersCount,
      scenes: scenesCount
    });
    return details;
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    return null;
  }
}

/**
 * Subscribe to real-time analytics updates
 */
export function subscribeToAnalytics(
  callback: (data: { stats: UserStats; revenue: RevenueMetrics; usage: UsageAnalytics }) => void
): Unsubscribe {
  console.log('📊 Setting up real-time analytics listener...');

  const unsubscribe = onSnapshot(
    collection(db, 'subscriptions'),
    async () => {
      try {
        // Fetch all analytics data
        const [stats, revenue, usage] = await Promise.all([
          getUserStats(),
          getRevenueMetrics(),
          getUsageAnalytics(),
        ]);

        callback({ stats, revenue, usage });
      } catch (error) {
        console.error('❌ Error in analytics listener:', error);
      }
    },
    error => {
      console.error('❌ Analytics listener error:', error);
    }
  );

  return unsubscribe;
}

/**
 * Export analytics data (CSV format)
 */
export async function exportAnalyticsCSV(): Promise<string> {
  try {
    console.log('📊 Exporting analytics to CSV...');

    const { users } = await getUserList({ limit: 10000 });

    // CSV Header
    let csv = 'Email,Tier,Status,Credits Used,Credits Max,Veo Videos,Last Active,Created At\n';

    // CSV Rows
    users.forEach(user => {
      csv += `${user.email},`;
      csv += `${user.tier},`;
      csv += `${user.status},`;
      csv += `${user.credits.used},`;
      csv += `${user.credits.max},`;
      csv += `${user.veoVideos.used},`;
      csv += `${user.lastActive?.toISOString() || ''},`;
      csv += `${user.createdAt.toISOString()}\n`;
    });

    console.log('✅ CSV export complete');
    return csv;
  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    throw error;
  }
}

/**
 * Get analytics summary (for quick overview)
 */
export async function getAnalyticsSummary(): Promise<{
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  totalCreditsUsed: number;
  totalVeoVideos: number;
}> {
  try {
    const [stats, revenue, usage] = await Promise.all([
      getUserStats(),
      getRevenueMetrics(),
      getUsageAnalytics(),
    ]);

    return {
      totalUsers: stats.total,
      activeUsers: stats.active,
      mrr: revenue.mrr,
      totalCreditsUsed: usage.credits.total,
      totalVeoVideos: usage.veoVideos.total,
    };
  } catch (error) {
    console.error('❌ Error fetching analytics summary:', error);
    throw error;
  }
}

