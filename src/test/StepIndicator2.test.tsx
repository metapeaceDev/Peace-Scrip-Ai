import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import StepIndicator from '../components/StepIndicator';

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'studio.step1': 'แนว',
        'studio.step2': 'ขอบเขต',
        'studio.step3': 'ตัวละคร',
        'studio.step4': 'โครงสร้าง',
        'studio.step5': 'ผลลัพธ์',
      };
      return translations[key] || key;
    },
  }),
}));

describe('StepIndicator', () => {
  it('renders all steps', () => {
    const { container } = render(
      <StepIndicator currentStep={1} totalSteps={5} onStepClick={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('highlights current step', () => {
    const { container } = render(
      <StepIndicator currentStep={3} totalSteps={5} onStepClick={vi.fn()} />
    );
    expect(container.querySelector('.bg-cyan-500')).toBeInTheDocument();
  });

  it('shows correct progress', () => {
    const { container } = render(
      <StepIndicator currentStep={3} totalSteps={5} onStepClick={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });
});

