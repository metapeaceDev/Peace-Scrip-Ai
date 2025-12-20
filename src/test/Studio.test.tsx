import { describe, it, expect, vi } from 'vitest';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

vi.mock('../services/firestoreService', () => ({
  firestoreService: {
    getUserProjects: vi.fn(() => Promise.resolve([])),
    deleteProject: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('Studio', () => {
  it('component can be imported', async () => {
    const module = await import('../components/Studio');
    expect(module.default).toBeDefined();
  });

  it('is a valid React component', async () => {
    const { default: Studio } = await import('../components/Studio');
    expect(typeof Studio).toBe('function');
  });
});

