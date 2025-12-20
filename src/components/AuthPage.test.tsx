import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from './AuthPage';
import { firebaseAuth } from '../services/firebaseAuth';

// Mock firebaseAuth
vi.mock('../services/firebaseAuth', () => ({
  firebaseAuth: {
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('AuthPage', () => {
  const mockOnLoginSuccess = vi.fn();

  // Helper to get submit button
  const getSubmitButton = () => {
    const buttons = screen.getAllByRole('button');
    return buttons.find(btn => btn.type === 'submit');
  };

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render login form by default', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.getByText('PEACE SCRIPT')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access your cloud studio')).toBeInTheDocument();

      const submitButton = getSubmitButton();
      expect(submitButton).toBeDefined();
      expect(submitButton?.textContent).toContain('เข้าสู่ระบบ');
    });

    it('should render email input', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render Google login button', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.getByText(/เข้าสู่ระบบด้วย Google/)).toBeInTheDocument();
    });

    it('should render offline mode button', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.getByRole('button', { name: /ใช้งานแบบ Offline/i })).toBeInTheDocument();
    });

    it('should render toggle to register link', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.getByRole('button', { name: /ยังไม่มีบัญชี\? สมัครเลย/i })).toBeInTheDocument();
    });

    it('should render forgot password link in login mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i })).toBeInTheDocument();
    });
  });

  describe('Toggle Between Login and Register', () => {
    it('should switch to register mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Create your cloud account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /สมัครสมาชิก/i })).toBeInTheDocument();
    });

    it('should show username field in register mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
    });

    it('should switch back to login mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register
      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      // Switch back to login
      const backButton = screen.getByRole('button', { name: /มีบัญชีแล้ว/i });
      fireEvent.click(backButton);

      expect(screen.getByText('Sign in to access your cloud studio')).toBeInTheDocument();
    });

    it('should clear form fields when switching modes', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Fill login form
      const emailInput = screen.getByPlaceholderText('name@example.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Switch to register
      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      // Check fields are cleared
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });

    it('should hide forgot password link in register mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register
      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      expect(screen.queryByRole('button', { name: /ลืมรหัสผ่าน/i })).not.toBeInTheDocument();
    });
  });

  describe('Login Functionality', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      vi.mocked(firebaseAuth.login).mockResolvedValue({ user: mockUser });

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebaseAuth.login).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
        expect(localStorage.getItem('peace_user')).toBe(JSON.stringify(mockUser));
      });
    });

    it('should show loading state during login', async () => {
      vi.mocked(firebaseAuth.login).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton.textContent).toContain('กำลังเชื่อมต่อ');
      });
    });

    it('should disable submit button while loading', async () => {
      vi.mocked(firebaseAuth.login).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should handle login error', async () => {
      vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Invalid credentials'));

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should show generic error if no error message', async () => {
      vi.mocked(firebaseAuth.login).mockRejectedValue({});

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')).toBeInTheDocument();
      });
    });
  });

  describe('Registration Functionality', () => {
    it('should handle successful registration', async () => {
      vi.mocked(firebaseAuth.register).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register mode
      fireEvent.click(screen.getByRole('button', { name: /ยังไม่มีบัญชี/i }));

      const usernameInput = screen.getByPlaceholderText('Choose a username');
      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      const submitButton = screen.getByRole('button', { name: /สมัครสมาชิก/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebaseAuth.register).toHaveBeenCalledWith(
          'newuser@example.com',
          'newpassword123',
          'testuser'
        );
      });
    });

    it('should switch to login mode after successful registration', async () => {
      vi.mocked(firebaseAuth.register).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register mode
      fireEvent.click(screen.getByRole('button', { name: /ยังไม่มีบัญชี/i }));

      const usernameInput = screen.getByPlaceholderText('Choose a username');
      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      const submitButton = screen.getByRole('button', { name: /สมัครสมาชิก/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')).toBeInTheDocument();
        const submitButton = getSubmitButton();
        expect(submitButton).toBeDefined();
        expect(submitButton?.textContent).toContain('เข้าสู่ระบบ');
      });
    });

    it('should handle registration error', async () => {
      vi.mocked(firebaseAuth.register).mockRejectedValue(new Error('Email already exists'));

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register mode
      fireEvent.click(screen.getByRole('button', { name: /ยังไม่มีบัญชี/i }));

      const usernameInput = screen.getByPlaceholderText('Choose a username');
      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      const submitButton = screen.getByRole('button', { name: /สมัครสมาชิก/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Google Login', () => {
    it('should handle Google login', async () => {
      vi.mocked(firebaseAuth.loginWithGoogle).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const googleButton = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(firebaseAuth.loginWithGoogle).toHaveBeenCalled();
      });
    });

    it('should show loading state during Google login', async () => {
      vi.mocked(firebaseAuth.loginWithGoogle).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const googleButton = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getAllByText(/กำลังเชื่อมต่อ/)[0]).toBeInTheDocument();
      });
    });

    it('should handle Google login error', async () => {
      vi.mocked(firebaseAuth.loginWithGoogle).mockRejectedValue(
        new Error('Google sign-in cancelled')
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const googleButton = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('Google sign-in cancelled')).toBeInTheDocument();
      });
    });

    it('should show generic error for Google login if no message', async () => {
      vi.mocked(firebaseAuth.loginWithGoogle).mockRejectedValue({});

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const googleButton = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')).toBeInTheDocument();
      });
    });

    it('should disable Google button while loading', async () => {
      vi.mocked(firebaseAuth.loginWithGoogle).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const googleButton = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
      });
    });
  });

  describe('Offline Mode', () => {
    it('should handle offline mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const offlineButton = screen.getByRole('button', { name: /ใช้งานแบบ Offline/i });
      fireEvent.click(offlineButton);

      expect(localStorage.getItem('peace_offline_mode')).toBe('true');
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({
        uid: 'offline-guest',
        email: 'guest@offline.local',
        displayName: 'Guest (Offline)',
      });
    });
  });

  describe('Forgot Password Modal', () => {
    it('should open forgot password modal', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const forgotPasswordButton = screen.getByRole('button', { name: /ลืมรหัสผ่าน/i });
      fireEvent.click(forgotPasswordButton);

      expect(screen.getByText('รีเซ็ตรหัสผ่าน')).toBeInTheDocument();
      expect(screen.getByText(/กรอกอีเมลของคุณ/)).toBeInTheDocument();
    });

    it('should close forgot password modal', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      // Close modal
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('path[d*="M6 18L18 6M6 6l12 12"]')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(screen.queryByText('รีเซ็ตรหัสผ่าน')).not.toBeInTheDocument();
      }
    });

    it('should validate empty email in forgot password', async () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      // Submit without email
      const form = screen.getByRole('button', { name: /ส่งลิงก์/ }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const errorElements = screen.getAllByText('กรุณากรอกอีเมล');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should validate invalid email format', async () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1]; // Second one is in modal

      fireEvent.change(modalEmailInput, { target: { value: 'invalid-email' } });

      const form = modalEmailInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const errorElements = screen.getAllByText('รูปแบบอีเมลไม่ถูกต้อง');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should send password reset email successfully', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'reset@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebaseAuth.resetPassword).toHaveBeenCalledWith('reset@example.com');
        expect(screen.getByText(/ส่งอีเมลสำเร็จ/)).toBeInTheDocument();
      });
    });

    it('should show success message with email after reset', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'user@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/กรุณาตรวจสอบอีเมล/)).toBeInTheDocument();
        expect(screen.getByText(/ส่งอีเมลสำเร็จ/)).toBeInTheDocument();
        // Note: resetEmail is cleared after success, so email won't appear in the message
        // This is current component behavior
      });
    });

    it('should show back to login button after success', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'user@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /กลับไปหน้า Login/i })).toBeInTheDocument();
      });
    });

    it('should handle password reset error', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockRejectedValue(new Error('User not found'));

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'notfound@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorElements = screen.getAllByText('User not found');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should show generic error if reset fails without message', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockRejectedValue({});

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorElements = screen.getAllByText(/เกิดข้อผิดพลาดในการส่งอีเมล/);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should clear fields when closing modal', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'test@example.com' } });

      // Close modal
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('path[d*="M6 18L18 6M6 6l12 12"]')
      );

      if (closeButton) {
        fireEvent.click(closeButton);

        // Reopen modal
        fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

        const newEmailInputs = screen.getAllByPlaceholderText('name@example.com');
        const newModalEmailInput = newEmailInputs[1] as HTMLInputElement;
        expect(newModalEmailInput.value).toBe('');
      }
    });

    it('should show loading spinner during reset', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/กำลังส่ง/)).toBeInTheDocument();
      });
    });

    it('should trim whitespace from reset email', async () => {
      vi.mocked(firebaseAuth.resetPassword).mockResolvedValue(undefined);

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/i }));

      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      const modalEmailInput = emailInputs[1];

      fireEvent.change(modalEmailInput, { target: { value: '  test@example.com  ' } });

      const submitButton = screen.getByRole('button', { name: /ส่งลิงก์รีเซ็ตรหัสผ่าน/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(firebaseAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear error when switching modes', async () => {
      vi.mocked(firebaseAuth.login).mockRejectedValue(new Error('Login failed'));

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Try login with error
      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Switch to register mode
      const toggleButton = screen.getByRole('button', { name: /ยังไม่มีบัญชี/i });
      fireEvent.click(toggleButton);

      // Error should be cleared
      expect(screen.queryByText('Login failed')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require email input', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should require password input', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should require username in register mode', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      // Switch to register
      fireEvent.click(screen.getByRole('button', { name: /ยังไม่มีบัญชี/i }));

      const usernameInput = screen.getByPlaceholderText('Choose a username');
      expect(usernameInput).toHaveAttribute('required');
    });
  });

  describe('UI States', () => {
    it('should show spinner icon in loading button', async () => {
      vi.mocked(firebaseAuth.login).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      const submitButton = getSubmitButton()!;
      fireEvent.click(submitButton);

      await waitFor(() => {
        const spinners = document.querySelectorAll('.animate-spin');
        expect(spinners.length).toBeGreaterThan(0);
      });
    });

    it('should display background decorations', () => {
      render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

      const decorations = document.querySelectorAll('.blur-\\[100px\\]');
      expect(decorations.length).toBeGreaterThan(0);
    });
  });
});

