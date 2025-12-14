import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step5Output from '../components/Step5Output';

describe('Step5Output', () => {
  const mockOnBack = vi.fn();
  const mockOnExport = vi.fn();

  const defaultProps = {
    onBack: mockOnBack,
    onExport: mockOnExport,
    scriptData: {
      title: 'Test Script',
      genre: 'Drama',
      type: 'feature',
      scenes: [
        { id: '1', number: 1, title: 'Opening', description: 'Test scene' }
      ]
    }
  };

  it('renders output section', () => {
    render(<Step5Output {...defaultProps} />);
    expect(screen.getByText(/ผลลัพธ์/i)).toBeInTheDocument();
  });

  it('displays export options', () => {
    render(<Step5Output {...defaultProps} />);
    expect(screen.getByText(/TXT/i)).toBeInTheDocument();
    expect(screen.getByText(/HTML/i)).toBeInTheDocument();
    expect(screen.getByText(/JSON/i)).toBeInTheDocument();
  });

  it('calls onExport when export button is clicked', () => {
    render(<Step5Output {...defaultProps} />);
    const exportBtn = screen.getByText(/ส่งออก TXT/i);
    fireEvent.click(exportBtn);
    expect(mockOnExport).toHaveBeenCalledWith('txt');
  });

  it('shows script preview', () => {
    render(<Step5Output {...defaultProps} />);
    expect(screen.getByText('Test Script')).toBeInTheDocument();
  });
});
