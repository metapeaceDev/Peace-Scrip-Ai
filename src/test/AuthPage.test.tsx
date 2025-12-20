import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPage from '../components/AuthPage';

// Mock Firebase Auth
vi.mock('../services/firebaseAuth', () => ({
  firebaseAuth: {
    login: vi.fn(() =>
      Promise.resolve({
        user: { uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' },
      })
    ),
    register: vi.fn(() =>
      Promise.resolve({
        user: { uid: 'new-uid', email: 'new@example.com', displayName: 'New User' },
      })
    ),
    loginWithGoogle: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
  },
}));

describe('AuthPage', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access your cloud studio')).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const registerLink = screen.getByText(/ยังไม่มีบัญชี/i);
    fireEvent.click(registerLink);
    expect(screen.getByText('Create your cloud account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
  });

  it('has email and password inputs', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('displays login button', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByText('เข้าสู่ระบบ')).toBeInTheDocument();
  });
});

