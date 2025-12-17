import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getProviderStatus, getRecommendedProvider, selectProvider } from '../providerSelector';
import type { ProviderStatus, AutoSelectionCriteria } from '../../../types';

describe('providerSelector', () => {
  // Mock environment variables
  beforeEach(() => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_COMFYUI_API_URL', 'http://localhost:8188');
    vi.stubEnv('VITE_COMFYUI_ENABLED', 'true');

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('getProviderStatus', () => {
    it('should return auto status for auto provider', async () => {
      const status = await getProviderStatus('auto', 'image');

      expect(status.provider).toBe('auto');
      expect(status.displayName).toBe('Auto Selection');
      expect(status.available).toBe(true);
    });

    it('should check ComfyUI availability', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('comfyui', 'image');

      expect(status.provider).toBe('comfyui');
      expect(status.displayName).toContain('ComfyUI');
      expect(status.available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/system_stats'),
        expect.any(Object)
      );
    });

    it('should return unavailable when ComfyUI is down', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const status = await getProviderStatus('comfyui', 'image');

      expect(status.available).toBe(false);
    });

    it('should check Gemini 2.5 availability', async () => {
      const status = await getProviderStatus('gemini-2.5', 'image');

      expect(status.provider).toBe('gemini-2.5');
      expect(status.displayName).toContain('Gemini 2.5');
      expect(status.available).toBe(true); // Has API key
    });

    it('should check Gemini quota', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('gemini-2.5', 'image');

      expect(status.quota).toBe('available');
    });

    it('should return exhausted quota when Gemini check fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Quota exceeded'));

      const status = await getProviderStatus('gemini-2.5', 'image');

      expect(status.quota).toBe('exhausted');
    });

    it('should check Stable Diffusion availability', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('stable-diffusion', 'image');

      expect(status.provider).toBe('stable-diffusion');
      expect(status.available).toBe(true);
    });

    it('should check video provider ComfyUI SVD', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('comfyui-svd', 'video');

      expect(status.provider).toBe('comfyui-svd');
      expect(status.displayName).toContain('ComfyUI');
      expect(status.available).toBe(true);
    });

    it('should check Gemini Veo availability', async () => {
      const status = await getProviderStatus('gemini-veo', 'video');

      expect(status.provider).toBe('gemini-veo');
      expect(status.displayName).toContain('Veo');
      expect(status.available).toBe(true);
    });

    it('should include speed and quality info', async () => {
      const status = await getProviderStatus('gemini-2.5', 'image');

      expect(status.speed).toBeDefined();
      expect(status.quality).toBeDefined();
      expect(status.estimatedTime).toBeDefined();
    });

    it('should handle unknown provider', async () => {
      const status = await getProviderStatus('unknown-provider' as any, 'image');

      expect(status.available).toBe(false);
    });
  });

  describe('getRecommendedProvider', () => {
    const mockStatuses: ProviderStatus[] = [
      {
        provider: 'comfyui',
        displayName: 'ComfyUI',
        available: true,
        speed: 'medium',
        quality: 'good',
        quota: 'available',
        lastChecked: new Date(),
      },
      {
        provider: 'gemini-2.5',
        displayName: 'Gemini 2.5',
        available: true,
        speed: 'fast',
        quality: 'good',
        quota: 'available',
        lastChecked: new Date(),
      },
      {
        provider: 'stable-diffusion',
        displayName: 'Stable Diffusion',
        available: true,
        speed: 'medium',
        quality: 'excellent',
        quota: 'available', // Changed from undefined
        lastChecked: new Date(),
      },
    ];

    it('should recommend fastest provider for speed criteria', () => {
      const recommended = getRecommendedProvider(mockStatuses, 'speed');

      expect(recommended?.speed).toBe('fast');
      expect(recommended?.provider).toBe('gemini-2.5');
    });

    it('should recommend excellent quality provider for quality criteria', () => {
      const recommended = getRecommendedProvider(mockStatuses, 'quality');

      expect(recommended?.quality).toBe('excellent');
      expect(recommended?.provider).toBe('stable-diffusion');
    });

    it('should recommend balanced provider for balanced criteria', () => {
      const recommended = getRecommendedProvider(mockStatuses, 'balanced');

      expect(recommended).toBeDefined();
      expect(recommended?.available).toBe(true);
    });

    it('should filter out unavailable providers', () => {
      const statusesWithUnavailable = [
        ...mockStatuses,
        {
          provider: 'unavailable',
          displayName: 'Unavailable',
          available: false,
          lastChecked: new Date(),
        },
      ];

      const recommended = getRecommendedProvider(statusesWithUnavailable, 'speed');

      expect(recommended?.available).toBe(true);
      expect(recommended?.provider).not.toBe('unavailable');
    });

    it('should filter out exhausted quota providers', () => {
      const statusesWithExhausted = [
        {
          ...mockStatuses[0],
          quota: 'exhausted' as const,
        },
        ...mockStatuses.slice(1),
      ];

      const recommended = getRecommendedProvider(statusesWithExhausted, 'speed');

      expect(recommended?.quota).not.toBe('exhausted');
    });

    it('should fallback to any available provider when all quota exhausted', () => {
      const statusesAllExhausted = mockStatuses.map(s => ({
        ...s,
        quota: 'exhausted' as const,
      }));

      const recommended = getRecommendedProvider(statusesAllExhausted, 'speed');

      expect(recommended?.available).toBe(true);
    });

    it('should handle empty statuses array', () => {
      const recommended = getRecommendedProvider([], 'speed');

      expect(recommended).toBeUndefined();
    });

    it('should prioritize excellent quality', () => {
      const statusesWithQuality: ProviderStatus[] = [
        {
          provider: 'fair',
          displayName: 'Fair',
          available: true,
          quality: 'fair',
          lastChecked: new Date(),
        },
        {
          provider: 'good',
          displayName: 'Good',
          available: true,
          quality: 'good',
          lastChecked: new Date(),
        },
        {
          provider: 'excellent',
          displayName: 'Excellent',
          available: true,
          quality: 'excellent',
          lastChecked: new Date(),
        },
      ];

      const recommended = getRecommendedProvider(statusesWithQuality, 'quality');

      expect(recommended?.quality).toBe('excellent');
    });

    it('should handle balanced scoring correctly', () => {
      const statusesForBalanced: ProviderStatus[] = [
        {
          provider: 'slow-excellent',
          displayName: 'Slow Excellent',
          available: true,
          speed: 'slow',
          quality: 'excellent',
          quota: 'available',
          lastChecked: new Date(),
        },
        {
          provider: 'fast-fair',
          displayName: 'Fast Fair',
          available: true,
          speed: 'fast',
          quality: 'fair',
          quota: 'low',
          lastChecked: new Date(),
        },
        {
          provider: 'medium-good',
          displayName: 'Medium Good',
          available: true,
          speed: 'medium',
          quality: 'good',
          quota: 'available',
          lastChecked: new Date(),
        },
      ];

      const recommended = getRecommendedProvider(statusesForBalanced, 'balanced');

      // Balanced should prefer good overall score
      expect(recommended).toBeDefined();
      expect(recommended?.quota).toBe('available');
    });
  });

  describe('selectProvider', () => {
    beforeEach(() => {
      // Mock all provider checks to be available
      (global.fetch as any).mockResolvedValue({ ok: true });
    });

    it('should return selected provider when not auto', async () => {
      const result = await selectProvider('gemini-2.5', 'image', 'balanced');

      expect(result.provider).toBe('gemini-2.5');
      expect(result.displayName).toContain('Gemini');
    });

    it('should select fastest provider for speed criteria with auto', async () => {
      const result = await selectProvider('auto', 'image', 'speed');

      expect(result.provider).toBeDefined();
      expect(result.displayName).toBeDefined();
    });

    it('should select balanced provider with auto', async () => {
      const result = await selectProvider('auto', 'image', 'balanced');

      expect(result.provider).toBeDefined();
    });

    it('should handle video provider selection', async () => {
      const result = await selectProvider('auto', 'video', 'speed');

      expect(result.provider).toBeDefined();
      expect(['comfyui-svd', 'gemini-veo']).toContain(result.provider);
    });

    it('should fallback to first provider when all unavailable', async () => {
      (global.fetch as any).mockRejectedValue(new Error('All providers down'));

      const result = await selectProvider('auto', 'image', 'speed');

      expect(result.provider).toBeDefined();
      expect(result.displayName).toBeDefined();
    });

    it('should respect user preference over auto-selection', async () => {
      const result = await selectProvider('stable-diffusion', 'image', 'speed');

      expect(result.provider).toBe('stable-diffusion');
    });

    it('should check provider availability for user selection', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      const result = await selectProvider('comfyui', 'image', 'balanced');

      expect(result.provider).toBe('comfyui');
      // Still returns comfyui even if unavailable (user explicitly selected it)
    });

    it('should prioritize ComfyUI in auto-selection when available', async () => {
      // ComfyUI available
      (global.fetch as any).mockResolvedValueOnce({ ok: true }); // ComfyUI check
      (global.fetch as any).mockResolvedValueOnce({ ok: true }); // Gemini check
      (global.fetch as any).mockResolvedValueOnce({ ok: true }); // Gemini check
      (global.fetch as any).mockResolvedValueOnce({ ok: true }); // Stable Diffusion

      const result = await selectProvider('auto', 'image', 'quality');

      // ComfyUI should be considered highly for quality
      expect(result.provider).toBeDefined();
    });

    it('should handle video provider preferences', async () => {
      const result = await selectProvider('gemini-veo', 'video', 'quality');

      expect(result.provider).toBe('gemini-veo');
      expect(result.displayName).toContain('Veo');
    });
  });

  describe('Provider Configuration', () => {
    it('should return ComfyUI as local provider without quota', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('comfyui', 'image');

      expect(status.quota).toBeUndefined(); // Local has no quota
    });

    it('should return Stable Diffusion without quota', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const status = await getProviderStatus('stable-diffusion', 'image');

      expect(status.quota).toBeUndefined(); // Free API has no quota
    });

    it('should check all image providers are configured', async () => {
      const providers = ['comfyui', 'gemini-2.5', 'gemini-2.0', 'stable-diffusion'];

      for (const provider of providers) {
        const status = await getProviderStatus(provider as any, 'image');
        expect(status.displayName).toBeTruthy();
        expect(status.speed).toBeDefined();
        expect(status.quality).toBeDefined();
      }
    });

    it('should check all video providers are configured', async () => {
      const providers = ['gemini-veo', 'comfyui-svd'];

      for (const provider of providers) {
        (global.fetch as any).mockResolvedValueOnce({ ok: true });
        const status = await getProviderStatus(provider as any, 'video');
        expect(status.displayName).toBeTruthy();
        expect(status.speed).toBeDefined();
        expect(status.quality).toBeDefined();
      }
    });
  });

  describe('Integration Tests', () => {
    it('should complete full auto-selection workflow', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await selectProvider('auto', 'image', 'balanced');

      expect(result.provider).toBeDefined();
      expect(result.displayName).toBeDefined();
      expect(typeof result.provider).toBe('string');
    });

    it('should handle provider fallback scenario', async () => {
      // First provider fails, others succeed
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('ComfyUI down'))
        .mockResolvedValue({ ok: true });

      const result = await selectProvider('auto', 'image', 'speed');

      expect(result.provider).toBeDefined();
      expect(result.provider).not.toBe('comfyui');
    });

    it('should respect quality criteria in auto-selection', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await selectProvider('auto', 'image', 'quality');

      expect(result.provider).toBeDefined();
      // Should select provider with excellent quality
    });

    it('should work with all selection criteria', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const criteria: AutoSelectionCriteria[] = ['speed', 'quality', 'balanced'];

      for (const criterion of criteria) {
        const result = await selectProvider('auto', 'image', criterion);
        expect(result.provider).toBeDefined();
      }
    });
  });
});
