import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step2Boundary from '../components/Step2Boundary';

describe('Step2Boundary', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnUpdate = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onBack: mockOnBack,
    onUpdate: mockOnUpdate,
    scriptData: {
      title: 'Test Script',
      genre: 'Drama',
      type: 'feature',
      targetAudience: '',
      tone: '',
      themes: [],
      setting: '',
      timeframe: ''
    }
  };

  it('renders boundary settings', () => {
    render(<Step2Boundary {...defaultProps} />);
    expect(screen.getByText(/ขอบเขตเรื่อง/i)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<Step2Boundary {...defaultProps} />);
    const backButton = screen.getByText(/ย้อนกลับ/i);
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('updates scriptData when input changes', () => {
    render(<Step2Boundary {...defaultProps} />);
    const settingInput = screen.getByPlaceholderText(/สถานที่/i);
    fireEvent.change(settingInput, { target: { value: 'กรุงเทพฯ' } });
    expect(mockOnUpdate).toHaveBeenCalled();
  });
});
