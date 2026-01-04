import { describe, it, expect, vi } from 'vitest';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

describe('Step2StoryScope', () => {
  it('component can be imported', async () => {
    const module = await import('../components/Step2StoryScope');
    expect(module.default).toBeDefined();
  });

  it('is a valid React component', async () => {
    const { default: Step2StoryScope } = await import('../components/Step2StoryScope');
    expect(typeof Step2StoryScope).toBe('function');
  });
});
