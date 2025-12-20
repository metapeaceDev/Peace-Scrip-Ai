import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepIndicator from '../components/StepIndicator';

// Mock translation
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
  it('renders all 5 steps', () => {
    render(<StepIndicator currentStep={1} totalSteps={5} onStepClick={() => {}} />);

    expect(screen.getByText('แนว')).toBeInTheDocument();
    expect(screen.getByText('ขอบเขต')).toBeInTheDocument();
    expect(screen.getByText('ตัวละคร')).toBeInTheDocument();
    expect(screen.getByText('โครงสร้าง')).toBeInTheDocument();
    expect(screen.getByText('ผลลัพธ์')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    render(<StepIndicator currentStep={3} totalSteps={5} onStepClick={() => {}} />);

    const step3 = screen.getByText('ตัวละคร').closest('li');
    expect(step3?.querySelector('.bg-cyan-500')).toBeInTheDocument();
  });
});

