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
} from '../../types';
import { getUserSubscription } from './subscriptionManager';
import { firestoreService } from './firestoreService';

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
    const users = snapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const stats: UserStats = {
      total: users.length,
      byTier: {
        free: 0,
        basic: 0,
        pro: 0,
        enterprise: 0,
      },
      byStatus: {
        active: 0,
        canceled: 0,
        past_due: 0,
      },
      active: 0,
      new: 0,
      churned: 0,
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    users.forEach(user => {
      const tier = user.subscription?.tier || 'free';
      stats.byTier[tier as SubscriptionTier]++;

      // Count by status (default to active)
      const status = user.subscription?.status || 'active';
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      }

      // Count active users (used system in last 30 days)
      const lastUpdated = user.lastUpdated instanceof Timestamp 
        ? user.lastUpdated.toDate() 
        : new Date(user.lastUpdated);
      
      if (lastUpdated >= thirtyDaysAgo) {
        stats.active++;
      }

      // Count new users (created in date range or last 30 days)
      if (filters?.dateRange) {
        const createdAt = user.createdAt instanceof Timestamp
          ? user.createdAt.toDate()
          : new Date(user.createdAt || user.lastUpdated);
        
        if (createdAt >= filters.dateRange.start && createdAt <= filters.dateRange.end) {
          stats.new++;
        }
      }

      // Count churned users (canceled in period)
      if (status === 'canceled' && user.subscription?.canceledAt) {
        const canceledAt = user.subscription.canceledAt instanceof Timestamp
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
export async function getUsageAnalytics(
  _dateRange?: { start: Date; end: Date }
): Promise<UsageAnalytics> {
  try {
    console.log('📊 Fetching usage analytics...');

    const snapshot = await getDocs(collection(db, 'subscriptions'));
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

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
    };

    const tierCounts = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    users.forEach(user => {
      const tier = (user.subscription?.tier || 'free') as SubscriptionTier;
      const creditsUsed = user.monthlyUsage?.creditsUsed || 0;
      const veoVideos = user.monthlyUsage?.veoVideosGenerated || 0;

      // Credits
      analytics.credits.total += creditsUsed;
      analytics.credits.byTier[tier] += creditsUsed;
      tierCounts[tier]++;

      // Veo Videos
      if (veoVideos > 0) {
        analytics.veoVideos.total += veoVideos;
        analytics.veoVideos.byUser.push({
          userId: user.id,
          email: user.email || 'unknown',
          count: veoVideos,
        });
      }

      // API Calls
      if (user.usage) {
        analytics.apiCalls.scripts += user.usage.scriptsGenerated || 0;
        analytics.apiCalls.images += user.usage.imagesGenerated || 0;
        analytics.apiCalls.videos += user.usage.videosGenerated || 0;
        analytics.apiCalls.audio += user.usage.audioGenerated || 0;
      }

      // Storage - Calculate with proper tier limits
      const storageUsed = (user.usage?.storageUsed || 0) / 1024 / 1024 / 1024; // Convert to GB
      analytics.storage.totalGB += storageUsed;
      
      // Get storage limit for this user's tier
      const tierStorageLimit = (() => {
        switch (tier) {
          case 'free': return 0.5; // 500 MB
          case 'basic': return 1; // 1 GB (from userStore)
          case 'pro': return 10; // 10 GB
          case 'enterprise': return 100; // 100 GB
          default: return 0.5;
        }
      })();
      analytics.storage.limitGB += tierStorageLimit;
    });

    // Calculate averages
    analytics.credits.average = users.length > 0 ? analytics.credits.total / users.length : 0;
    analytics.storage.average = users.length > 0 ? analytics.storage.totalGB / users.length : 0;
    analytics.storage.remainingGB = Math.max(0, analytics.storage.limitGB - analytics.storage.totalGB);

    // Sort Veo users by count (descending)
    analytics.veoVideos.byUser.sort((a, b) => b.count - a.count);

    console.log('✅ Usage analytics fetched:', analytics);
    return analytics;
  } catch (error) {
    console.error('❌ Error fetching usage analytics:', error);
    throw error;
  }
}

/**
 * Get User List (with pagination)
 */
export async function getUserList(options: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: SubscriptionTier;
  status?: string;
  sortBy?: 'createdAt' | 'lastActive' | 'creditsUsed';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{
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
        lastActive: data.lastUpdated instanceof Timestamp 
          ? data.lastUpdated.toDate() 
          : new Date(data.lastUpdated || Date.now()),
        createdAt: data.createdAt instanceof Timestamp
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
      users = users.filter(u => 
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
    
    // Get user projects
    const projectsResult = await firestoreService.getUserProjects(userId);
    const projects = projectsResult.projects.map(p => ({
      id: p.id,
      title: p.title,
      type: p.type || 'Movie',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    // Build user details
    const details: UserDetails = {
      profile: {
        email: userRecord.userId, // We store userId, need to get email from auth or users collection
        displayName: 'User', // TODO: Get from users collection
        createdAt: new Date(), // TODO: Get from users collection
      },
      subscription: {
        tier: userRecord.subscription.tier,
        status: 'active', // TODO: Get from billing data
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
        projects: userRecord.usage.projectsCreated,
        characters: userRecord.usage.charactersCreated,
        scenes: userRecord.usage.scenesCreated,
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

    console.log('✅ User details fetched');
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
  callback: (data: {
    stats: UserStats;
    revenue: RevenueMetrics;
    usage: UsageAnalytics;
  }) => void
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
    (error) => {
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
