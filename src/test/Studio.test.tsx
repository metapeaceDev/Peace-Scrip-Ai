import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Studio from '../components/Studio';

describe('Studio', () => {
  const mockScriptData = {
    title: 'Test Script',
    genre: 'Drama',
    type: 'feature',
    scenes: []
  };

  it('renders studio component', () => {
    render(<Studio scriptData={mockScriptData} />);
    expect(screen.getByText(/สตูดิโอ/i)).toBeInTheDocument();
  });

  it('displays script title', () => {
    render(<Studio scriptData={mockScriptData} />);
    expect(screen.getByText('Test Script')).toBeInTheDocument();
  });

  it('shows storyboard generation button', () => {
    render(<Studio scriptData={mockScriptData} />);
    expect(screen.getByText(/สร้าง Storyboard/i)).toBeInTheDocument();
  });

  it('displays video preview section', () => {
    render(<Studio scriptData={mockScriptData} />);
    expect(screen.getByText(/ตัวอย่างวิดีโอ/i)).toBeInTheDocument();
  });
});
