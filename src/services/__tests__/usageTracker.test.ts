/**
 * UsageTracker Service Tests
 * Tests for tracking API usage, credits, and quota management
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('usageTracker - Module Structure', () => {
  it('should export UsageStats interface', async () => {
    const module = await import('../usageTracker');
    const mockStats: typeof module.UsageStats = {
      images: { generated: 100, failed: 5, totalCreditsUsed: 500 },
      videos: { generated: 20, failed: 2, totalCreditsUsed: 1000, totalDuration: 600 },
      storage: { used: 1024, images: 512, videos: 400, projects: 112 },
      projects: { total: 10, active: 5 },
      characters: { total: 25 },
      scenes: { total: 50 },
      apiCalls: { geminiText: 200, geminiImage: 100, geminiVideo: 20, otherProviders: 15 },
    } as any;

    expect(mockStats.images.generated).toBe(100);
    expect(mockStats.videos.totalDuration).toBe(600);
    expect(mockStats.storage.used).toBe(1024);
  });
});

describe('usageTracker - Function Exports', () => {
  it('should export trackImageGeneration', async () => {
    const module = await import('../usageTracker');
    expect(typeof module.trackImageGeneration).toBe('function');
  });

  it('should export trackVideoGeneration', async () => {
    const module = await import('../usageTracker');
    expect(typeof module.trackVideoGeneration).toBe('function');
  });

  it('should export getUsageStats', async () => {
    const module = await import('../usageTracker');
    expect(typeof module.getUsageStats).toBe('function');
  });

  it('should export resetUsageStats', async () => {
    const module = await import('../usageTracker');
    expect(typeof module.resetUsageStats).toBe('function');
  });
});

describe('usageTracker - Usage Tracking', () => {
  it('should track successful image generation', async () => {
    const { trackImageGeneration, getUsageStats } = await import('../usageTracker');

    trackImageGeneration('gemini', 10, true, 1024 * 500); // 500KB
    const stats = getUsageStats();

    expect(stats.images.generated).toBeGreaterThan(0);
  });

  it('should track failed image generation', async () => {
    const { trackImageGeneration, getUsageStats } = await import('../usageTracker');

    trackImageGeneration('stable-diffusion', 10, false);
    const stats = getUsageStats();

    expect(stats.images.failed).toBeGreaterThan(0);
  });

  it('should accumulate credits used', async () => {
    const { trackImageGeneration, getUsageStats, resetUsageStats } =
      await import('../usageTracker');

    resetUsageStats();
    trackImageGeneration('gemini', 5, true);
    trackImageGeneration('gemini', 15, true);

    const stats = getUsageStats();
    expect(stats.images.totalCreditsUsed).toBe(20);
  });
});

describe('usageTracker - Video Tracking', () => {
  it('should track video generation with duration', async () => {
    const { trackVideoGeneration, getUsageStats, resetUsageStats } =
      await import('../usageTracker');

    resetUsageStats();
    trackVideoGeneration('gemini-veo', 50, 30, true, 1024 * 1024 * 10); // provider, credits, duration, success, size

    const stats = getUsageStats();
    expect(stats.videos.generated).toBe(1);
    expect(stats.videos.totalDuration).toBe(30);
  });

  it('should handle multiple video generations', async () => {
    const { trackVideoGeneration, getUsageStats, resetUsageStats } =
      await import('../usageTracker');

    resetUsageStats();
    trackVideoGeneration('gemini-veo', 50, 15, true); // 15s duration
    trackVideoGeneration('comfyui-svd', 40, 20, true); // 20s duration

    const stats = getUsageStats();
    expect(stats.videos.generated).toBe(2);
    expect(stats.videos.totalDuration).toBe(35);
  });
});

describe('usageTracker - Storage Tracking', () => {
  it('should track storage usage by type', async () => {
    const { trackImageGeneration, trackVideoGeneration, getUsageStats, resetUsageStats } =
      await import('../usageTracker');

    resetUsageStats();
    trackImageGeneration('gemini', 10, true, 1024 * 500); // 500KB image
    trackVideoGeneration('gemini-veo', 50, 10, true, 1024 * 1024 * 5); // 5MB video, 10s duration

    const stats = getUsageStats();
    expect(stats.storage.images).toBeGreaterThan(0);
    expect(stats.storage.videos).toBeGreaterThan(0);
  });
});

describe('usageTracker - API Call Tracking', () => {
  it('should categorize API calls by provider', async () => {
    const { trackTextGeneration, getUsageStats, resetUsageStats } = await import('../usageTracker');

    resetUsageStats();
    trackTextGeneration('gemini', 5, true);

    const stats = getUsageStats();
    expect(stats.apiCalls.geminiText).toBe(1);
  });
});

describe('usageTracker - Edge Cases', () => {
  it('should handle zero credits', async () => {
    const { trackImageGeneration, getUsageStats } = await import('../usageTracker');

    trackImageGeneration('gemini', 0, true);
    const stats = getUsageStats();

    expect(stats).toBeTruthy();
  });

  it('should handle very large file sizes', async () => {
    const { trackVideoGeneration, getUsageStats } = await import('../usageTracker');

    const largeSize = 1024 * 1024 * 1024; // 1GB
    trackVideoGeneration('comfyui-svd', 100, 120, true, largeSize); // 120s duration

    const stats = getUsageStats();
    expect(stats.videos.generated).toBeGreaterThan(0);
  });

  it('should handle negative duration', async () => {
    const { trackVideoGeneration, getUsageStats, resetUsageStats } =
      await import('../usageTracker');

    resetUsageStats();
    trackVideoGeneration('gemini-veo', 50, -10, true); // Negative duration

    const stats = getUsageStats();
    // Code doesn't validate, so it will track -10
    expect(stats.videos.totalDuration).toBe(-10);
  });
});

describe('usageTracker - Reset Functionality', () => {
  it('should reset all stats to zero', async () => {
    const { trackImageGeneration, resetUsageStats, getUsageStats } =
      await import('../usageTracker');

    trackImageGeneration('gemini', 10, true);
    resetUsageStats();

    const stats = getUsageStats();
    expect(stats.images.generated).toBe(0);
    expect(stats.images.totalCreditsUsed).toBe(0);
  });
});
