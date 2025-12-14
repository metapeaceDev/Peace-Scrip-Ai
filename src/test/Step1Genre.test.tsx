import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step1Genre from '../components/Step1Genre';

describe('Step1Genre', () => {
  const mockOnNext = vi.fn();
  const mockOnUpdate = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onUpdate: mockOnUpdate,
    scriptData: {
      title: '',
      genre: '',
      type: '',
      targetAudience: '',
      tone: '',
      themes: []
    }
  };

  it('renders genre selection', () => {
    render(<Step1Genre {...defaultProps} />);
    expect(screen.getByText(/เลือกแนวเรื่อง/)).toBeInTheDocument();
  });

  it('calls onUpdate when genre is selected', () => {
    render(<Step1Genre {...defaultProps} />);
    const dramaButton = screen.getByText('ดราม่า');
    fireEvent.click(dramaButton);
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('displays all genre options', () => {
    render(<Step1Genre {...defaultProps} />);
    expect(screen.getByText('ดราม่า')).toBeInTheDocument();
    expect(screen.getByText('ตลก')).toBeInTheDocument();
    expect(screen.getByText('แอ็คชั่น')).toBeInTheDocument();
  });
});
