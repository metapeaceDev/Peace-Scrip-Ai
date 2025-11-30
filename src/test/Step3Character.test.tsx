import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step3Character from '../components/Step3Character';

describe('Step3Character', () => {
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
      characters: []
    }
  };

  it('renders character creation section', () => {
    render(<Step3Character {...defaultProps} />);
    expect(screen.getByText(/ตัวละคร/i)).toBeInTheDocument();
  });

  it('displays generate character button', () => {
    render(<Step3Character {...defaultProps} />);
    const generateBtn = screen.getByText(/สร้างตัวละครด้วย AI/i);
    expect(generateBtn).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<Step3Character {...defaultProps} />);
    const backButton = screen.getByText(/ย้อนกลับ/i);
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows character list when characters exist', () => {
    const propsWithCharacters = {
      ...defaultProps,
      scriptData: {
        ...defaultProps.scriptData,
        characters: [
          { id: '1', name: 'Test Character', age: 30, role: 'protagonist' }
        ]
      }
    };
    render(<Step3Character {...propsWithCharacters} />);
    expect(screen.getByText('Test Character')).toBeInTheDocument();
  });
});
