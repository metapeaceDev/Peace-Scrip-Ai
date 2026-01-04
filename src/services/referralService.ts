/**
 * Referral System Service
 *
 * Manages referral codes, tracks referrals, and awards credits
 */

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  totalReferrals: number;
  successfulReferrals: number;
  creditsEarned: number;
  isActive: boolean;
}

export interface ReferralReward {
  referrer: {
    userId: string;
    credits: number; // Credits awarded to referrer
  };
  referee: {
    userId: string;
    credits: number; // Bonus credits for new user
  };
}

export interface ReferralStats {
  totalReferrals: number;
  successfulConversions: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  topReferrers: Array<{
    userId: string;
    referralCount: number;
    creditsEarned: number;
  }>;
}

// Referral rewards configuration
const REFERRAL_REWARDS = {
  referrerCredits: 50, // Credits for the person who referred
  refereeCredits: 50, // Bonus credits for new user who signs up
  requiresPaidSubscription: false, // Set to true if referrer gets credits only after referee upgrades
};

// In-memory storage (in production, use Firebase/Database)
const referralCodes: Map<string, ReferralCode> = new Map();
const referralHistory: Array<{
  code: string;
  referrerId: string;
  refereeId: string;
  timestamp: Date;
  status: 'pending' | 'successful' | 'expired';
  creditsAwarded: number;
}> = [];

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: string, customCode?: string): ReferralCode {
  // Generate code: USER_XXXXX or custom code
  const code =
    customCode?.toUpperCase() ||
    `${userId.substring(0, 4).toUpperCase()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Check if code already exists
  if (referralCodes.has(code)) {
    throw new Error('รหัส referral นี้ถูกใช้แล้ว กรุณาเลือกรหัสอื่น');
  }

  const referralCode: ReferralCode = {
    code,
    userId,
    createdAt: new Date(),
    totalReferrals: 0,
    successfulReferrals: 0,
    creditsEarned: 0,
    isActive: true,
  };

  referralCodes.set(code, referralCode);

  console.log(`🎁 Referral code created: ${code} for user ${userId}`);

  return referralCode;
}

/**
 * Get user's referral code (create if doesn't exist)
 */
export function getUserReferralCode(userId: string): ReferralCode {
  // Find existing code
  for (const [, data] of referralCodes.entries()) {
    if (data.userId === userId && data.isActive) {
      return data;
    }
  }

  // Create new code if not found
  return generateReferralCode(userId);
}

/**
 * Validate referral code
 */
export function validateReferralCode(code: string): {
  valid: boolean;
  referralCode?: ReferralCode;
  reason?: string;
} {
  const upperCode = code.toUpperCase();
  const referralCode = referralCodes.get(upperCode);

  if (!referralCode) {
    return { valid: false, reason: 'รหัส referral ไม่ถูกต้อง' };
  }

  if (!referralCode.isActive) {
    return { valid: false, reason: 'รหัส referral นี้ถูกปิดใช้งานแล้ว' };
  }

  if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
    return { valid: false, reason: 'รหัส referral หมดอายุแล้ว' };
  }

  return { valid: true, referralCode };
}

/**
 * Apply referral code when new user signs up
 */
export function applyReferralCode(
  referralCode: string,
  newUserId: string
): {
  success: boolean;
  rewards?: ReferralReward;
  error?: string;
} {
  const validation = validateReferralCode(referralCode);

  if (!validation.valid || !validation.referralCode) {
    return { success: false, error: validation.reason };
  }

  const code = validation.referralCode;

  // Prevent self-referral
  if (code.userId === newUserId) {
    return { success: false, error: 'ไม่สามารถใช้รหัส referral ของตัวเองได้' };
  }

  // Check if user already used a referral code
  const existingReferral = referralHistory.find(r => r.refereeId === newUserId);
  if (existingReferral) {
    return { success: false, error: 'คุณใช้รหัส referral ไปแล้ว' };
  }

  // Create rewards
  const rewards: ReferralReward = {
    referrer: {
      userId: code.userId,
      credits: REFERRAL_REWARDS.referrerCredits,
    },
    referee: {
      userId: newUserId,
      credits: REFERRAL_REWARDS.refereeCredits,
    },
  };

  // Update referral code stats
  code.totalReferrals++;
  code.successfulReferrals++;
  code.creditsEarned += REFERRAL_REWARDS.referrerCredits;

  // Record in history
  referralHistory.push({
    code: code.code,
    referrerId: code.userId,
    refereeId: newUserId,
    timestamp: new Date(),
    status: 'successful',
    creditsAwarded: REFERRAL_REWARDS.referrerCredits + REFERRAL_REWARDS.refereeCredits,
  });

  console.log(
    `✅ Referral successful: ${code.code} - Referrer: +${rewards.referrer.credits}, Referee: +${rewards.referee.credits} credits`
  );

  // Award credits to both users
  awardReferralCredits(rewards).catch(error => {
    console.error('❌ Error awarding referral credits:', error);
  });

  return { success: true, rewards };
}

/**
 * Award referral credits to both referrer and referee
 */
async function awardReferralCredits(rewards: ReferralReward): Promise<void> {
  try {
    const { doc, updateDoc, increment, Timestamp } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');

    // Award credits to referrer
    const referrerRef = doc(db, 'users', rewards.referrer.userId);
    await updateDoc(referrerRef, {
      'credits.available': increment(rewards.referrer.credits),
      'credits.earned': increment(rewards.referrer.credits),
      'credits.lastUpdated': Timestamp.now(),
      'referral.totalEarned': increment(rewards.referrer.credits),
    });

    console.log(
      `💰 Awarded ${rewards.referrer.credits} credits to referrer ${rewards.referrer.userId}`
    );

    // Award bonus credits to referee (new user)
    const refereeRef = doc(db, 'users', rewards.referee.userId);
    await updateDoc(refereeRef, {
      'credits.available': increment(rewards.referee.credits),
      'credits.bonus': increment(rewards.referee.credits),
      'credits.lastUpdated': Timestamp.now(),
      'referral.usedCode': true,
      'referral.bonusReceived': rewards.referee.credits,
    });

    console.log(
      `🎁 Awarded ${rewards.referee.credits} bonus credits to referee ${rewards.referee.userId}`
    );
  } catch (error) {
    console.error('Error awarding credits in Firestore:', error);
    throw error;
  }
}

/**
 * Get referral statistics for a user
 */
export function getUserReferralStats(userId: string): {
  code: string;
  totalReferrals: number;
  successfulReferrals: number;
  creditsEarned: number;
  recentReferrals: Array<{
    userId: string;
    timestamp: Date;
    creditsAwarded: number;
  }>;
} {
  const userCode = getUserReferralCode(userId);

  const recentReferrals = referralHistory
    .filter(r => r.referrerId === userId && r.status === 'successful')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
    .map(r => ({
      userId: r.refereeId,
      timestamp: r.timestamp,
      creditsAwarded: REFERRAL_REWARDS.referrerCredits,
    }));

  return {
    code: userCode.code,
    totalReferrals: userCode.totalReferrals,
    successfulReferrals: userCode.successfulReferrals,
    creditsEarned: userCode.creditsEarned,
    recentReferrals,
  };
}

/**
 * Get global referral statistics (admin)
 */
export function getGlobalReferralStats(): ReferralStats {
  const totalReferrals = referralHistory.length;
  const successfulConversions = referralHistory.filter(r => r.status === 'successful').length;
  const pendingReferrals = referralHistory.filter(r => r.status === 'pending').length;
  const totalCreditsEarned = referralHistory.reduce((sum, r) => sum + r.creditsAwarded, 0);

  // Calculate top referrers
  const referrerMap = new Map<string, { count: number; credits: number }>();

  for (const record of referralHistory) {
    if (record.status === 'successful') {
      const current = referrerMap.get(record.referrerId) || { count: 0, credits: 0 };
      current.count++;
      current.credits += REFERRAL_REWARDS.referrerCredits;
      referrerMap.set(record.referrerId, current);
    }
  }

  const topReferrers = Array.from(referrerMap.entries())
    .map(([userId, data]) => ({
      userId,
      referralCount: data.count,
      creditsEarned: data.credits,
    }))
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 10);

  return {
    totalReferrals,
    successfulConversions,
    pendingReferrals,
    totalCreditsEarned,
    topReferrers,
  };
}

/**
 * Deactivate a referral code
 */
export function deactivateReferralCode(code: string): boolean {
  const upperCode = code.toUpperCase();
  const referralCode = referralCodes.get(upperCode);

  if (!referralCode) {
    return false;
  }

  referralCode.isActive = false;
  console.log(`🚫 Referral code deactivated: ${code}`);

  return true;
}

/**
 * Create a custom referral code (for VIP users)
 */
export function createCustomReferralCode(
  userId: string,
  customCode: string
): {
  success: boolean;
  code?: ReferralCode;
  error?: string;
} {
  try {
    // Validate custom code format (alphanumeric, 4-12 chars)
    if (!/^[A-Z0-9]{4,12}$/.test(customCode.toUpperCase())) {
      return {
        success: false,
        error: 'รหัสต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 4-12 ตัว',
      };
    }

    const code = generateReferralCode(userId, customCode);
    return { success: true, code };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ไม่สามารถสร้างรหัสได้',
    };
  }
}

/**
 * Share referral code via different channels
 */
export function generateReferralLink(code: string, channel?: 'copy' | 'social' | 'email'): string {
  // Use environment variable for production URL, fallback to localhost in dev
  const baseUrl =
    import.meta.env.VITE_APP_URL ||
    (import.meta.env.PROD ? 'https://peace-script-ai.web.app' : 'http://localhost:5173');

  const referralUrl = `${baseUrl}/signup?ref=${code.toUpperCase()}`;

  switch (channel) {
    case 'social': {
      const message = encodeURIComponent(
        `🎬 สร้างบทหนังด้วย AI ฟรี! ใช้รหัส ${code.toUpperCase()} รับ 50 credits ทันที → ${referralUrl}`
      );
      return `https://twitter.com/intent/tweet?text=${message}`;
    }

    case 'email': {
      const subject = encodeURIComponent('มาลองสร้างบทหนังด้วย AI กัน!');
      const body = encodeURIComponent(
        `สวัสดี!\n\nผมอยากชวนคุณมาลองใช้ Peace Script - เครื่องมือสร้างบทหนังด้วย AI\n\nใช้รหัสของผม: ${code.toUpperCase()} เพื่อรับ 50 credits ฟรี!\n\nลงทะเบียนที่: ${referralUrl}\n\nขอบคุณครับ!`
      );
      return `mailto:?subject=${subject}&body=${body}`;
    }

    case 'copy':
    default:
      return referralUrl;
  }
}

/**
 * Get referral leaderboard
 */
export function getReferralLeaderboard(limit: number = 10): Array<{
  rank: number;
  userId: string;
  code: string;
  referralCount: number;
  creditsEarned: number;
}> {
  const codes = Array.from(referralCodes.values())
    .filter(c => c.isActive && c.successfulReferrals > 0)
    .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
    .slice(0, limit);

  return codes.map((code, index) => ({
    rank: index + 1,
    userId: code.userId,
    code: code.code,
    referralCount: code.successfulReferrals,
    creditsEarned: code.creditsEarned,
  }));
}
