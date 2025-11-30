import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders main application', () => {
    render(<App />);
    expect(screen.getByText(/Peace Script/i)).toBeInTheDocument();
  });

  it('starts at step 1 (Genre selection)', () => {
    render(<App />);
    expect(screen.getByText(/เลือกแนวเรื่อง/i)).toBeInTheDocument();
  });

  it('displays step indicator', () => {
    render(<App />);
    expect(screen.getByText(/1\/5/i)).toBeInTheDocument();
  });

  it('shows application header', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
