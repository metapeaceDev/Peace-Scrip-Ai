import { describe, it, expect, vi } from 'vitest';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    generateScenes: vi.fn(() => Promise.resolve({ scenes: [] })),
  },
}));

describe('Step4Structure', () => {
  it('component can be imported', async () => {
    const module = await import('../components/Step4Structure');
    expect(module.default).toBeDefined();
  });

  it('is a valid React component', async () => {
    const { default: Step4Structure } = await import('../components/Step4Structure');
    expect(typeof Step4Structure).toBe('function');
  });
});

