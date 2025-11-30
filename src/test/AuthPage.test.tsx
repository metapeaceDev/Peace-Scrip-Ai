import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPage from '../components/AuthPage';

describe('AuthPage', () => {
  const mockOnAuth = vi.fn();

  it('renders login form by default', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    const registerLink = screen.getByText(/สมัครสมาชิก/i);
    fireEvent.click(registerLink);
    expect(screen.getByText(/สร้างบัญชี/i)).toBeInTheDocument();
  });

  it('validates email format', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    const emailInput = screen.getByPlaceholderText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText(/รูปแบบอีเมลไม่ถูกต้อง/i)).toBeInTheDocument();
  });

  it('calls onAuth with credentials', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const loginBtn = screen.getByText(/เข้าสู่ระบบ/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginBtn);

    expect(mockOnAuth).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
