import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../../config/firebase', () => ({
  storage: {},
}));

vi.mock('../geminiService', () => ({
  generateStoryboardVideo: vi.fn(() => Promise.resolve('mock-video-url')),
  VIDEO_MODELS_CONFIG: {
    veo: { name: 'Veo', available: true },
  },
}));

describe('videoGenerationService', () => {
  it('can import service functions', async () => {
    const service = await import('../videoGenerationService');
    expect(service.generateShotVideo).toBeDefined();
    expect(service.generateSceneVideos).toBeDefined();
  });

  it('has video generation capabilities', async () => {
    const { generateShotVideo } = await import('../videoGenerationService');
    expect(typeof generateShotVideo).toBe('function');
  });
});
