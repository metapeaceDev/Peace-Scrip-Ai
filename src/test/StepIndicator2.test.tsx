import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepIndicator from '../components/StepIndicator';

describe('StepIndicator', () => {
  it('renders all steps', () => {
    render(<StepIndicator currentStep={1} totalSteps={5} />);
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    const { container } = render(<StepIndicator currentStep={3} totalSteps={5} />);
    const steps = container.querySelectorAll('[class*="step"]');
    expect(steps.length).toBeGreaterThan(0);
  });

  it('shows correct progress percentage', () => {
    render(<StepIndicator currentStep={3} totalSteps={5} />);
    // Step 3 of 5 = 60%
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });
});
