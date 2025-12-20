import { describe, it, expect, vi } from 'vitest';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

vi.mock('../services/firestoreService', () => ({
  firestoreService: {
    createProject: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('Step5Output', () => {
  it('component can be imported', async () => {
    const module = await import('../components/Step5Output');
    expect(module.default).toBeDefined();
  });

  it('is a valid React component', async () => {
    const { default: Step5Output } = await import('../components/Step5Output');
    expect(typeof Step5Output).toBe('function');
  });
});

