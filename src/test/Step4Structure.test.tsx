import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step4Structure from '../components/Step4Structure';

describe('Step4Structure', () => {
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
      acts: [],
      scenes: []
    }
  };

  it('renders structure section', () => {
    render(<Step4Structure {...defaultProps} />);
    expect(screen.getByText(/โครงสร้าง/i)).toBeInTheDocument();
  });

  it('displays act selection', () => {
    render(<Step4Structure {...defaultProps} />);
    expect(screen.getByText(/3 องก์/i)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<Step4Structure {...defaultProps} />);
    const backButton = screen.getByText(/ย้อนกลับ/i);
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows scene generation button', () => {
    render(<Step4Structure {...defaultProps} />);
    const generateBtn = screen.getByText(/สร้างฉากด้วย AI/i);
    expect(generateBtn).toBeInTheDocument();
  });
});
