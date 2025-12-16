import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Step1Genre from '../components/Step1Genre';

// Mock translation
vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th' as const,
  }),
}));

describe('Step1Genre', () => {
  it('renders without crashing', () => {
    const mockProps: any = {
      onNext: vi.fn(),
      onUpdate: vi.fn(),
      scriptData: { 
        genre: '', 
        type: '', 
        title: '',
        secondaryGenres: ['', ''],
        targetAudience: '',
        tone: '',
        themes: []
      },
    };
    
    const { container } = render(<Step1Genre {...mockProps} />);
    expect(container).toBeTruthy();
  });
});
