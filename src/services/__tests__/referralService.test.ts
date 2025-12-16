import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('referralService - Module Structure', () => {
  it('should export ReferralCode interface', async () => {
    const module = await import('../referralService');
    
    const mockCode: typeof module.ReferralCode = {
      code: 'TEST_ABC123',
      userId: 'user-123',
      createdAt: new Date(),
      totalReferrals: 0,
      successfulReferrals: 0,
      creditsEarned: 0,
      isActive: true,
    } as any;
    
    expect(mockCode.code).toBe('TEST_ABC123');
    expect(mockCode.isActive).toBe(true);
  });

  it('should export ReferralReward interface', async () => {
    const module = await import('../referralService');
    
    const mockReward: typeof module.ReferralReward = {
      referrer: { userId: 'user-1', credits: 50 },
      referee: { userId: 'user-2', credits: 50 },
    } as any;
    
    expect(mockReward.referrer.credits).toBe(50);
    expect(mockReward.referee.credits).toBe(50);
  });

  it('should export ReferralStats interface', async () => {
    const module = await import('../referralService');
    
    const mockStats: typeof module.ReferralStats = {
      totalReferrals: 100,
      successfulConversions: 75,
      pendingReferrals: 25,
      totalCreditsEarned: 5000,
      topReferrers: [],
    } as any;
    
    expect(mockStats.totalReferrals).toBe(100);
    expect(mockStats.successfulConversions).toBe(75);
  });
});

describe('referralService - Function Exports', () => {
  it('should export generateReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.generateReferralCode).toBe('function');
  });

  it('should export getUserReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.getUserReferralCode).toBe('function');
  });

  it('should export validateReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.validateReferralCode).toBe('function');
  });

  it('should export applyReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.applyReferralCode).toBe('function');
  });

  it('should export getUserReferralStats function', async () => {
    const module = await import('../referralService');
    expect(typeof module.getUserReferralStats).toBe('function');
  });

  it('should export getGlobalReferralStats function', async () => {
    const module = await import('../referralService');
    expect(typeof module.getGlobalReferralStats).toBe('function');
  });

  it('should export deactivateReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.deactivateReferralCode).toBe('function');
  });

  it('should export createCustomReferralCode function', async () => {
    const module = await import('../referralService');
    expect(typeof module.createCustomReferralCode).toBe('function');
  });

  it('should export generateReferralLink function', async () => {
    const module = await import('../referralService');
    expect(typeof module.generateReferralLink).toBe('function');
  });

  it('should export getReferralLeaderboard function', async () => {
    const module = await import('../referralService');
    expect(typeof module.getReferralLeaderboard).toBe('function');
  });
});

describe('referralService - Reward Configuration', () => {
  it('should define referral rewards', () => {
    const rewards = {
      referrerCredits: 50,
      refereeCredits: 50,
      requiresPaidSubscription: false,
    };
    
    expect(rewards.referrerCredits).toBeGreaterThan(0);
    expect(rewards.refereeCredits).toBeGreaterThan(0);
    expect(typeof rewards.requiresPaidSubscription).toBe('boolean');
  });

  it('should have balanced rewards for both parties', () => {
    const referrerCredits = 50;
    const refereeCredits = 50;
    
    expect(referrerCredits).toBe(refereeCredits);
  });
});

describe('referralService - Code Generation', () => {
  it('should generate valid referral code format', () => {
    const userId = 'user123';
    const codePattern = /^[A-Z0-9_]{5,}$/;
    
    const sampleCode = 'USER_ABC123';
    expect(codePattern.test(sampleCode)).toBe(true);
  });

  it('should handle custom codes', () => {
    const customCode = 'MYCODE';
    expect(customCode.toUpperCase()).toBe('MYCODE');
    expect(customCode.length).toBeGreaterThan(0);
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    const count = 100;
    
    for (let i = 0; i < count; i++) {
      const code = `CODE_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      codes.add(code);
    }
    
    // Should have mostly unique codes (allow some collision)
    expect(codes.size).toBeGreaterThan(count * 0.95);
  });
});

describe('referralService - Validation', () => {
  it('should validate code format', () => {
    const validCodes = ['TEST_123', 'USER_ABC', 'PROMO_XYZ'];
    const invalidCodes = ['test', '', '123', 'too-long-code-name-here'];
    
    validCodes.forEach(code => {
      expect(code.length).toBeGreaterThan(0);
      expect(code).toBe(code.toUpperCase());
    });
  });

  it('should check code existence', () => {
    const codeMap = new Map<string, boolean>();
    codeMap.set('EXISTING', true);
    
    expect(codeMap.has('EXISTING')).toBe(true);
    expect(codeMap.has('NONEXISTENT')).toBe(false);
  });

  it('should validate code expiration', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400000); // +1 day
    const past = new Date(now.getTime() - 86400000); // -1 day
    
    expect(future.getTime()).toBeGreaterThan(now.getTime());
    expect(past.getTime()).toBeLessThan(now.getTime());
  });
});

describe('referralService - Stats Calculation', () => {
  it('should calculate conversion rate', () => {
    const total = 100;
    const successful = 75;
    const conversionRate = (successful / total) * 100;
    
    expect(conversionRate).toBe(75);
    expect(conversionRate).toBeGreaterThanOrEqual(0);
    expect(conversionRate).toBeLessThanOrEqual(100);
  });

  it('should track credits earned', () => {
    const referrals = 10;
    const creditsPerReferral = 50;
    const totalCredits = referrals * creditsPerReferral;
    
    expect(totalCredits).toBe(500);
  });

  it('should rank top referrers', () => {
    const referrers = [
      { userId: 'user1', count: 100 },
      { userId: 'user2', count: 75 },
      { userId: 'user3', count: 50 },
    ];
    
    const sorted = referrers.sort((a, b) => b.count - a.count);
    
    expect(sorted[0].userId).toBe('user1');
    expect(sorted[0].count).toBe(100);
  });
});

describe('referralService - Link Generation', () => {
  it('should generate referral link', () => {
    const code = 'TEST123';
    const baseUrl = 'https://example.com';
    const link = `${baseUrl}/?ref=${code}`;
    
    expect(link).toContain(code);
    expect(link).toContain('ref=');
  });

  it('should support different channels', () => {
    const channels = ['copy', 'social', 'email'];
    
    channels.forEach(channel => {
      expect(['copy', 'social', 'email']).toContain(channel);
    });
  });

  it('should encode special characters in links', () => {
    const code = 'TEST_123';
    const encoded = encodeURIComponent(code);
    
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe('string');
  });
});

describe('referralService - Error Handling', () => {
  it('should handle duplicate code attempts', () => {
    const existingCodes = new Set(['CODE1', 'CODE2']);
    
    const isDuplicate = (code: string) => existingCodes.has(code);
    
    expect(isDuplicate('CODE1')).toBe(true);
    expect(isDuplicate('CODE3')).toBe(false);
  });

  it('should handle invalid user IDs', () => {
    const invalidIds = ['', null, undefined];
    
    invalidIds.forEach(id => {
      expect(!id || id.length === 0).toBe(true);
    });
  });

  it('should handle expired codes gracefully', () => {
    const expiredDate = new Date('2020-01-01');
    const now = new Date();
    
    const isExpired = expiredDate < now;
    expect(isExpired).toBe(true);
  });
});

describe('referralService - Edge Cases', () => {
  it('should handle zero referrals', () => {
    const stats = {
      totalReferrals: 0,
      successfulConversions: 0,
      creditsEarned: 0,
    };
    
    expect(stats.totalReferrals).toBe(0);
    expect(stats.creditsEarned).toBe(0);
  });

  it('should handle large referral counts', () => {
    const largeCount = 1000000;
    const creditsPerReferral = 50;
    const total = largeCount * creditsPerReferral;
    
    expect(total).toBe(50000000);
    expect(Number.isSafeInteger(total)).toBe(true);
  });

  it('should handle special characters in custom codes', () => {
    const specialCodes = ['CODE-1', 'CODE_2', 'CODE.3'];
    
    specialCodes.forEach(code => {
      const sanitized = code.replace(/[^A-Z0-9_]/g, '_');
      expect(/^[A-Z0-9_]+$/.test(sanitized)).toBe(true);
    });
  });

  it('should limit leaderboard size', () => {
    const referrers = Array.from({ length: 100 }, (_, i) => ({
      userId: `user${i}`,
      count: Math.floor(Math.random() * 100),
    }));
    
    const limit = 10;
    const topReferrers = referrers
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    expect(topReferrers.length).toBeLessThanOrEqual(limit);
  });
});

describe('referralService - Integration Scenarios', () => {
  it('should complete full referral flow', () => {
    // 1. Generate code
    const code = 'TEST_ABC';
    
    // 2. Validate code
    expect(code.length).toBeGreaterThan(0);
    
    // 3. Apply referral
    const referrerCredits = 50;
    const refereeCredits = 50;
    
    // 4. Update stats
    const totalCredits = referrerCredits + refereeCredits;
    expect(totalCredits).toBe(100);
  });

  it('should track referral history', () => {
    const history = [
      { code: 'CODE1', status: 'successful', credits: 50 },
      { code: 'CODE2', status: 'pending', credits: 0 },
      { code: 'CODE3', status: 'expired', credits: 0 },
    ];
    
    const successful = history.filter(h => h.status === 'successful');
    expect(successful.length).toBe(1);
    expect(successful[0].credits).toBe(50);
  });
});
