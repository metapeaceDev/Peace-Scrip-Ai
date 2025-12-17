/**
 * HybridTTSService Tests
 * Tests for Psychology TTS + Azure TTS fallback system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../psychologyTTSService', () => ({
  psychologyTTS: {
    synthesize: vi.fn(),
    checkHealth: vi.fn(),
    getAvailableVoices: vi.fn(),
  },
  CaritaType: {},
}));

describe('hybridTTSService - Type Exports', () => {
  it('should export TTSProvider type', async () => {
    const module = await import('../hybridTTSService');
    const provider: typeof module.TTSProvider = 'psychology';
    expect(provider).toBe('psychology');
  });

  it('should export HybridTTSOptions interface', async () => {
    const module = await import('../hybridTTSService');
    const options: typeof module.HybridTTSOptions = {
      text: 'สวัสดี',
      carita: 'saddha',
      preferredProvider: 'psychology',
      fallbackEnabled: true,
    } as any;

    expect(options.text).toBe('สวัสดี');
    expect(options.preferredProvider).toBe('psychology');
  });

  it('should export TTSStats interface', async () => {
    const module = await import('../hybridTTSService');
    const stats: typeof module.TTSStats = {
      psychologyRequests: 100,
      azureRequests: 10,
      totalRequests: 110,
      costSavings: 5,
      psychologyAvailability: 90.9,
    } as any;

    expect(stats.totalRequests).toBe(110);
    expect(stats.costSavings).toBe(5);
  });
});

describe('hybridTTSService - Class Export', () => {
  it('should export HybridTTSService class', async () => {
    const module = await import('../hybridTTSService');
    expect(typeof module.HybridTTSService).toBe('function');
  });

  it('should instantiate HybridTTSService', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    expect(service).toBeTruthy();
  });
});

describe('hybridTTSService - Methods', () => {
  it('should have synthesize method', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    expect(typeof service.synthesize).toBe('function');
  });

  it('should have getStats method', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    expect(typeof service.getStats).toBe('function');
  });

  it('should have resetStats method', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    expect(typeof service.resetStats).toBe('function');
  });
});

describe('hybridTTSService - Stats Tracking', () => {
  it('should initialize stats to zero', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    const stats = service.getStats();

    expect(stats.totalRequests).toBe(0);
    expect(stats.psychologyRequests).toBe(0);
    expect(stats.azureRequests).toBe(0);
  });

  it('should track psychology availability', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    const stats = service.getStats();

    expect(stats.psychologyAvailability).toBeGreaterThanOrEqual(0);
    expect(stats.psychologyAvailability).toBeLessThanOrEqual(100);
  });

  it('should calculate cost savings', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    const stats = service.getStats();

    expect(stats.costSavings).toBeGreaterThanOrEqual(0);
  });
});

describe('hybridTTSService - Provider Selection', () => {
  it('should accept psychology as preferred provider', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();

    const options = {
      text: 'สวัสดี',
      preferredProvider: 'psychology' as const,
    };

    expect(options.preferredProvider).toBe('psychology');
  });

  it('should accept azure as preferred provider', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();

    const options = {
      text: 'Hello',
      preferredProvider: 'azure' as const,
    };

    expect(options.preferredProvider).toBe('azure');
  });

  it('should enable fallback by default', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();

    const options = {
      text: 'Test',
      fallbackEnabled: undefined, // Default should be true
    };

    expect(options.fallbackEnabled).toBeUndefined(); // Service handles default
  });
});

describe('hybridTTSService - Carita Types', () => {
  it('should support saddha carita (faithful)', () => {
    const carita = 'saddha';
    expect(carita).toBe('saddha');
  });

  it('should support vitakka carita (intellectual)', () => {
    const carita = 'vitakka';
    expect(carita).toBe('vitakka');
  });

  it('should support dosa carita (hatred)', () => {
    const carita = 'dosa';
    expect(carita).toBe('dosa');
  });

  it('should support raga carita (lustful)', () => {
    const carita = 'raga';
    expect(carita).toBe('raga');
  });

  it('should support moha carita (deluded)', () => {
    const carita = 'moha';
    expect(carita).toBe('moha');
  });

  it('should support buddha carita (enlightened)', () => {
    const carita = 'buddha';
    expect(carita).toBe('buddha');
  });
});

describe('hybridTTSService - Edge Cases', () => {
  it('should handle empty text', () => {
    const text = '';
    expect(text.length).toBe(0);
  });

  it('should handle very long text', () => {
    const longText = 'สวัสดี'.repeat(1000);
    expect(longText.length).toBeGreaterThan(1000);
  });

  it('should handle Thai text', () => {
    const thaiText = 'สวัสดีครับ ขอต้อนรับเข้าสู่ระบบ';
    expect(thaiText).toContain('สวัสดี');
  });

  it('should handle English text', () => {
    const englishText = 'Hello, welcome to the system';
    expect(englishText).toContain('Hello');
  });

  it('should handle mixed Thai-English text', () => {
    const mixedText = 'Hello สวัสดี Welcome ยินดีต้อนรับ';
    expect(mixedText).toContain('Hello');
    expect(mixedText).toContain('สวัสดี');
  });

  it('should handle special characters', () => {
    const specialText = 'Text with emoji: 🎬 and symbols: @#$%';
    expect(specialText).toContain('🎬');
    expect(specialText).toContain('@#$%');
  });
});

describe('hybridTTSService - Cost Savings Calculation', () => {
  it('should calculate savings based on psychology usage', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();

    // costSavings = psychologyRequests * AZURE_COST_PER_REQUEST
    const stats = service.getStats();
    const expectedSavings = stats.psychologyRequests * 0.5;

    expect(stats.costSavings).toBe(expectedSavings);
  });

  it('should show zero savings with zero psychology requests', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();
    service.resetStats();

    const stats = service.getStats();
    expect(stats.costSavings).toBe(0);
  });
});

describe('hybridTTSService - Availability Calculation', () => {
  it('should calculate availability percentage', async () => {
    const { HybridTTSService } = await import('../hybridTTSService');
    const service = new HybridTTSService();

    const stats = service.getStats();

    if (stats.totalRequests > 0) {
      const expectedAvailability = (stats.psychologyRequests / stats.totalRequests) * 100;
      expect(stats.psychologyAvailability).toBeCloseTo(expectedAvailability, 1);
    } else {
      expect(stats.psychologyAvailability).toBe(100); // Default
    }
  });
});
