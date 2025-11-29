import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepIndicator from '../components/StepIndicator';

describe('StepIndicator', () => {
  it('renders all 5 steps', () => {
    render(<StepIndicator currentStep={1} />);
    
    expect(screen.getByText('แนว')).toBeInTheDocument();
    expect(screen.getByText('ขอบเขต')).toBeInTheDocument();
    expect(screen.getByText('ตัวละคร')).toBeInTheDocument();
    expect(screen.getByText('โครงสร้าง')).toBeInTheDocument();
    expect(screen.getByText('ผลลัพธ์')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    render(<StepIndicator currentStep={2} />);
    
    const step2 = screen.getByText('ขอบเขต').closest('button');
    expect(step2).toHaveClass('bg-indigo-600');
  });
});
