import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Step3Character from '../components/Step3Character';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    generateCharacter: vi.fn(() => Promise.resolve({ character: {} })),
  },
}));

describe('Step3Character', () => {
  it('renders without crashing', () => {
    const mockProps: any = {
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      scriptData: { characters: [] },
      setScriptData: vi.fn(),
    };

    const { container } = render(<Step3Character {...mockProps} />);
    expect(container).toBeTruthy();
  });
});
