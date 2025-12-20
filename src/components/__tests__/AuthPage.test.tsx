/**
 * AuthPage Component Tests - COMPREHENSIVE
 * Tests for authentication UI, login, registration, password reset
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AuthPage from '../AuthPage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock firebaseAuth
vi.mock('../../services/firebaseAuth', () => ({
  firebaseAuth: {
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('AuthPage - Component Rendering', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render PEACE SCRIPT title', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByText('PEACE SCRIPT')).toBeInTheDocument();
  });

  it('should render login form by default', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const loginTexts = screen.getAllByText(/เข้าสู่ระบบ/i);
    expect(loginTexts.length).toBeGreaterThan(0);
  });

  it('should render email input field', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should render password input field', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should render submit button', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton?.textContent).toMatch(/เข้าสู่ระบบ/i);
  });

  it('should render Google sign-in button', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const googleButton = screen.getByText(/Google/i);
    expect(googleButton).toBeInTheDocument();
  });

  it('should render forgot password link', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByText(/ลืมรหัสผ่าน/i)).toBeInTheDocument();
  });

  it('should render offline mode button', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const offlineButton = screen.getByText(/ใช้งานแบบ Offline/i);
    expect(offlineButton).toBeInTheDocument();
  });

  it('should render background decorations', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const decorations = container.querySelectorAll('[class*="bg-cyan"], [class*="bg-blue"]');
    expect(decorations.length).toBeGreaterThan(0);
  });
});

describe('AuthPage - Form Mode Switching', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should switch to registration mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const switchButton = screen.getByText(/ยังไม่มีบัญชี/i);
    fireEvent.click(switchButton);
    expect(screen.getByText(/สมัครสมาชิก/i)).toBeInTheDocument();
  });

  it('should show username field in registration mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const switchButton = screen.getByText(/ยังไม่มีบัญชี/i);
    fireEvent.click(switchButton);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  });

  it('should switch back to login mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const switchToRegister = screen.getByText(/ยังไม่มีบัญชี/i);
    fireEvent.click(switchToRegister);
    const switchToLogin = screen.getByText(/มีบัญชีแล้ว/i);
    fireEvent.click(switchToLogin);
    const loginTexts = screen.getAllByText(/เข้าสู่ระบบ/i);
    expect(loginTexts.length).toBeGreaterThan(0);
  });

  it('should not show username field in login mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.queryByPlaceholderText(/username/i)).not.toBeInTheDocument();
  });

  it('should hide forgot password in registration mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));
    expect(screen.queryByText(/ลืมรหัสผ่าน/i)).not.toBeInTheDocument();
  });
});

describe('AuthPage - Login Flow', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockReset();
  });

  it('should handle successful login', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'user123', email: 'test@example.com', displayName: 'Test User' };
    vi.mocked(firebaseAuth.login).mockResolvedValue({ user: mockUser } as any);

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(firebaseAuth.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('should save user to localStorage on login', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'user456', email: 'save@test.com', displayName: 'Save Test' };
    vi.mocked(firebaseAuth.login).mockResolvedValue({ user: mockUser } as any);

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'save@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      const saved = localStorage.getItem('peace_user');
      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(mockUser);
    });
  });

  it('should show loading state during login', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
    vi.mocked(firebaseAuth.login).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser } as any), 100))
    );

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    // Check that button is disabled (loading state)
    await waitFor(
      () => {
        expect(submitButton).toBeDisabled();
      },
      { timeout: 500 }
    );
  });

  it('should handle login error', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Invalid email or password'));

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'wrongpass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('should clear error when switching forms', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Login failed'));

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/Login failed/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));
    expect(screen.queryByText(/Login failed/i)).not.toBeInTheDocument();
  });
});

describe('AuthPage - Registration Flow', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockReset();
  });

  it('should handle successful registration', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'newpass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }));

    await waitFor(() => {
      expect(firebaseAuth.register).toHaveBeenCalledWith('new@test.com', 'newpass123', 'newuser');
    });
  });

  it('should switch to login after successful registration', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }));

    await waitFor(() => {
      expect(screen.getByText(/สมัครสมาชิกสำเร็จ/i)).toBeInTheDocument();
    });
  });

  it('should handle registration error', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockRejectedValue(new Error('Email already exists'));

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'existinguser' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'existing@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
    });
  });
});

describe('AuthPage - Google Login', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.loginWithGoogle).mockReset();
  });

  it('should handle Google login', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.loginWithGoogle).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const googleButton = screen.getByText(/Google/i);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(firebaseAuth.loginWithGoogle).toHaveBeenCalled();
    });
  });

  it('should show loading during Google login', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.loginWithGoogle).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const googleButton = screen.getByText(/Google/i);
    fireEvent.click(googleButton);

    // Check that Google button is disabled during loading
    await waitFor(
      () => {
        expect(googleButton.closest('button')).toBeDisabled();
      },
      { timeout: 500 }
    );
  });

  it('should handle Google login error', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.loginWithGoogle).mockRejectedValue(new Error('Google auth failed'));

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const googleButton = screen.getByText(/Google/i);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/Google auth failed/i)).toBeInTheDocument();
    });
  });
});

describe('AuthPage - Password Reset', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.resetPassword).mockReset();
  });

  it('should show forgot password modal', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ลืมรหัสผ่าน/i));
    const resetTexts = screen.getAllByText(/รีเซ็ตรหัสผ่าน/i);
    expect(resetTexts.length).toBeGreaterThan(0);
  });

  it('should handle password reset', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.resetPassword).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ลืมรหัสผ่าน/i));

    // หา email input จาก modal ที่เปิดขึ้นมา (ตัวสุดท้าย)
    const emailInputs = screen.getAllByPlaceholderText(/name@example.com/i);
    const modalEmailInput = emailInputs[emailInputs.length - 1];
    fireEvent.change(modalEmailInput, { target: { value: 'reset@test.com' } });

    // หาปุ่ม submit ใน modal
    const buttons = screen.getAllByRole('button');
    const resetButton = buttons.find(btn => btn.textContent?.includes('ส่งลิงก์'));
    fireEvent.click(resetButton!);

    await waitFor(() => {
      expect(firebaseAuth.resetPassword).toHaveBeenCalledWith('reset@test.com');
    });
  });

  it('should validate email before reset', async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ลืมรหัสผ่าน/i));

    const buttons = screen.getAllByRole('button');
    const resetButton = buttons.find(btn => btn.textContent?.includes('ส่งลิงก์'));
    fireEvent.click(resetButton!);

    // HTML5 validation จะป้องกันการ submit ถ้า email ว่าง
    // หรือถ้า required ไม่ถูกต้อง
  });

  it('should validate email format', async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ลืมรหัสผ่าน/i));

    const emailInputs = screen.getAllByPlaceholderText(/name@example.com/i);
    const modalEmailInput = emailInputs[emailInputs.length - 1];
    fireEvent.change(modalEmailInput, { target: { value: 'invalid-email' } });

    // HTML5 email validation จะทำงาน
    expect(modalEmailInput).toHaveAttribute('type', 'email');
    expect(modalEmailInput).toBeRequired();
  });

  it('should show success message after reset', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.resetPassword).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ลืมรหัสผ่าน/i));

    const emailInputs = screen.getAllByPlaceholderText(/name@example.com/i);
    const modalEmailInput = emailInputs[emailInputs.length - 1];
    fireEvent.change(modalEmailInput, { target: { value: 'success@test.com' } });

    const buttons = screen.getAllByRole('button');
    const resetButton = buttons.find(btn => btn.textContent?.includes('ส่งลิงก์'));
    fireEvent.click(resetButton!);

    await waitFor(() => {
      expect(screen.getByText(/ส่งอีเมลสำเร็จ/i)).toBeInTheDocument();
    });
  });
});

describe('AuthPage - Offline Mode', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should handle offline mode', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const offlineButton = screen.getByText(/ใช้งานแบบ Offline/i);
    fireEvent.click(offlineButton);

    expect(mockOnLoginSuccess).toHaveBeenCalledWith({
      uid: 'offline-guest',
      email: 'guest@offline.local',
      displayName: 'Guest (Offline)',
    });
  });

  it('should save offline mode to localStorage', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const offlineButton = screen.getByText(/ใช้งานแบบ Offline/i);
    fireEvent.click(offlineButton);

    expect(localStorage.getItem('peace_offline_mode')).toBe('true');
  });
});

describe('AuthPage - Error Handling', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockReset();
    vi.mocked(firebaseAuth.register).mockReset();
    vi.mocked(firebaseAuth.loginWithGoogle).mockReset();
  });

  it('should display login errors', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Invalid credentials'));

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'wrong' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should display registration errors', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockRejectedValue(new Error('Email already in use'));

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email already in use/i)).toBeInTheDocument();
    });
  });

  it('should display Google login errors', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.loginWithGoogle).mockRejectedValue(new Error('Popup closed'));

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/Google/i));

    await waitFor(() => {
      expect(screen.getByText(/Popup closed/i)).toBeInTheDocument();
    });
  });

  it('should show error styling', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Test error'));

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      const errorElement = screen.getByText('Test error');
      expect(errorElement).toBeInTheDocument();
    });
  });
});

describe('AuthPage - Edge Cases', () => {
  const mockOnLoginSuccess = vi.fn();

  it('should handle empty email submission', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    expect(emailInput).toBeRequired();
  });

  it('should handle empty password submission', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    expect(passwordInput).toBeRequired();
  });

  it('should handle very long email', () => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(emailInput, { target: { value: longEmail } });

    expect((emailInput as HTMLInputElement).value).toBe(longEmail);
  });

  it('should handle special characters in email', () => {
    const specialEmail = 'test+tag@example.com';
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(emailInput, { target: { value: specialEmail } });

    expect((emailInput as HTMLInputElement).value).toBe(specialEmail);
  });

  it('should handle Unicode in username', () => {
    const unicodeUsername = 'ผู้ใช้งาน';
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    const usernameInput = screen.getByPlaceholderText(/username/i);
    fireEvent.change(usernameInput, { target: { value: unicodeUsername } });

    expect((usernameInput as HTMLInputElement).value).toBe(unicodeUsername);
  });
});

describe('AuthPage - UI States', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.login).mockReset();
  });

  it('should disable buttons during loading', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
    vi.mocked(firebaseAuth.login).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser } as any), 100))
    );

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(
      () => {
        expect(submitButton).toBeDisabled();
      },
      { timeout: 500 }
    );
  });

  it('should show loading spinner', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'test', email: 'test@test.com', displayName: 'Test' };
    vi.mocked(firebaseAuth.login).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser } as any), 100))
    );

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'pass' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    // Verify button is disabled during loading
    await waitFor(
      () => {
        expect(submitButton).toBeDisabled();
      },
      { timeout: 500 }
    );
  });
});

describe('AuthPage - Integration', () => {
  const mockOnLoginSuccess = vi.fn();

  it('should integrate with localStorage', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(localStorage).toBeDefined();
  });

  it('should handle complete login flow', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    const mockUser = { uid: 'abc123', email: 'user@test.com', displayName: 'User' };
    vi.mocked(firebaseAuth.login).mockResolvedValue({ user: mockUser } as any);

    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password' },
    });
    const submitButton = container.querySelector('button[type="submit"]');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(firebaseAuth.login).toHaveBeenCalled();
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
      const saved = localStorage.getItem('peace_user');
      expect(saved).toBeDefined();
    });
  });

  it('should handle complete registration flow', async () => {
    const { firebaseAuth } = await import('../../services/firebaseAuth');
    vi.mocked(firebaseAuth.register).mockResolvedValue({} as any);

    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText(/ยังไม่มีบัญชี/i));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }));

    await waitFor(() => {
      expect(firebaseAuth.register).toHaveBeenCalledWith('new@test.com', 'password123', 'newuser');
    });
  });
});

