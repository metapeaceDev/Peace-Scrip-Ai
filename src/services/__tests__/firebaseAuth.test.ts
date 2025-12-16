import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';

// Mock Firebase modules
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithRedirect = vi.fn();
const mockGetRedirectResult = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithRedirect: mockSignInWithRedirect,
  getRedirectResult: mockGetRedirectResult,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  updateProfile: mockUpdateProfile,
}));

const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
}));

vi.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
  db: {},
}));

describe('firebaseAuth - Comprehensive Tests', () => {
  let firebaseAuth: any;
  let mockUser: Partial<User>;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    };

    // Reset mocks with default success behavior
    mockDoc.mockReturnValue({ id: 'test-doc' });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    mockSetDoc.mockResolvedValue(undefined);
    mockSignInWithRedirect.mockResolvedValue(undefined); // Default success

    // Re-import to get fresh instance
    const module = await import('../firebaseAuth');
    firebaseAuth = module.firebaseAuth;
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });
      mockUpdateProfile.mockResolvedValue(undefined);

      const result = await firebaseAuth.register(
        'new@example.com',
        'password123',
        'New User'
      );

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'password123'
      );
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should handle email-already-in-use error', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
      });

      await expect(
        firebaseAuth.register('existing@example.com', 'password123', 'User')
      ).rejects.toThrow('อีเมลนี้ถูกใช้งานแล้ว');
    });

    it('should handle invalid-email error', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-email',
      });

      await expect(
        firebaseAuth.register('invalid-email', 'password123', 'User')
      ).rejects.toThrow('รูปแบบอีเมลไม่ถูกต้อง');
    });

    it('should handle weak-password error', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/weak-password',
      });

      await expect(
        firebaseAuth.register('test@example.com', '123', 'User')
      ).rejects.toThrow('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    });

    it('should create user profile in Firestore', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      await firebaseAuth.register('test@example.com', 'password123', 'Test User');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const result = await firebaseAuth.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.uid).toBe('test-uid-123');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });

    it('should update last login timestamp', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      await firebaseAuth.login('test@example.com', 'password123');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastLogin: expect.any(Date),
        }),
        { merge: true }
      );
    });

    it('should handle wrong-password error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
      });

      await expect(
        firebaseAuth.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('รหัสผ่านไม่ถูกต้อง');
    });

    it('should handle user-not-found error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
      });

      await expect(
        firebaseAuth.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('ไม่พบอีเมลนี้ในระบบ');
    });

    it('should handle invalid-credential error', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
      });

      await expect(
        firebaseAuth.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    });
  });

  describe.skip('loginWithGoogle', () => {
    it('should initiate Google login redirect', async () => {
      mockSignInWithRedirect.mockResolvedValue(undefined);

      await firebaseAuth.loginWithGoogle();

      expect(mockSignInWithRedirect).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle Google login errors', async () => {
      mockSignInWithRedirect.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      });

      await expect(firebaseAuth.loginWithGoogle()).rejects.toThrow();
    });
  });

  describe('handleRedirectResult', () => {
    it('should handle successful redirect result', async () => {
      mockGetRedirectResult.mockResolvedValue({
        user: mockUser,
      });
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await firebaseAuth.handleRedirectResult();

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.user.uid).toBe('test-uid-123');
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should update existing user profile', async () => {
      mockGetRedirectResult.mockResolvedValue({
        user: mockUser,
      });
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ uid: 'test-uid-123' }),
      });

      await firebaseAuth.handleRedirectResult();

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastLogin: expect.any(Date),
        }),
        { merge: true }
      );
    });

    it('should return null when no redirect result', async () => {
      mockGetRedirectResult.mockResolvedValue(null);

      const result = await firebaseAuth.handleRedirectResult();

      expect(result).toBeNull();
    });

    it('should handle redirect errors', async () => {
      mockGetRedirectResult.mockRejectedValue(new Error('Redirect error'));

      await expect(firebaseAuth.handleRedirectResult()).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const result = await firebaseAuth.logout();

      expect(result.success).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));

      await expect(firebaseAuth.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should be a function', () => {
      expect(typeof firebaseAuth.getCurrentUser).toBe('function');
    });
  });

  describe('onAuthStateChange', () => {
    it('should setup auth state listener', () => {
      const callback = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(() => {});

      firebaseAuth.onAuthStateChange(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
        expect.anything(),
        callback
      );
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const result = firebaseAuth.onAuthStateChange(vi.fn());

      expect(result).toBe(unsubscribe);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await firebaseAuth.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        expect.objectContaining({
          url: expect.stringContaining('/login'),
        })
      );
    });

    it('should validate email format', async () => {
      await expect(firebaseAuth.resetPassword('')).rejects.toThrow('กรุณากรอกอีเมล');
      await expect(firebaseAuth.resetPassword('   ')).rejects.toThrow('กรุณากรอกอีเมล');
      await expect(firebaseAuth.resetPassword('invalid-email')).rejects.toThrow(
        'รูปแบบอีเมลไม่ถูกต้อง'
      );
    });

    it('should handle user-not-found error', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/user-not-found',
      });

      await expect(
        firebaseAuth.resetPassword('nonexistent@example.com')
      ).rejects.toThrow('ไม่พบอีเมลนี้ในระบบ');
    });

    it('should handle network errors', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/network-request-failed',
      });

      await expect(
        firebaseAuth.resetPassword('test@example.com')
      ).rejects.toThrow('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing displayName in user object', async () => {
      const userWithoutName = { ...mockUser, displayName: null };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: userWithoutName,
      });

      await firebaseAuth.register('test@example.com', 'password123', 'Fallback Name');

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should handle missing photoURL in user object', async () => {
      const userWithoutPhoto = { ...mockUser, photoURL: null };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: userWithoutPhoto,
      });

      await firebaseAuth.register('test@example.com', 'password123', 'Test');

      const setDocCall = mockSetDoc.mock.calls[0][1];
      expect(setDocCall.photoURL).toBeUndefined();
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: { ...mockUser, email: longEmail },
      });

      const result = await firebaseAuth.login(longEmail, 'password123');

      expect(result.success).toBe(true);
    });

    it('should handle special characters in displayName', async () => {
      const specialName = 'Test™️ User 🎬 <script>';
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { ...mockUser, displayName: specialName },
      });

      await firebaseAuth.register('test@example.com', 'password123', specialName);

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          displayName: specialName,
        })
      );
    });
  });

  describe('Error Message Translation', () => {
    const errorCases = [
      ['auth/email-already-in-use', 'อีเมลนี้ถูกใช้งานแล้ว'],
      ['auth/invalid-email', 'รูปแบบอีเมลไม่ถูกต้อง'],
      ['auth/weak-password', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'],
      ['auth/user-disabled', 'บัญชีนี้ถูกระงับ'],
      ['auth/operation-not-allowed', 'การดำเนินการนี้ไม่ได้รับอนุญาต'],
    ];

    errorCases.forEach(([code, message]) => {
      it(`should translate error code ${code}`, async () => {
        mockSignInWithEmailAndPassword.mockRejectedValue({ code });

        await expect(
          firebaseAuth.login('test@example.com', 'password')
        ).rejects.toThrow(message);
      });
    });

    it('should provide default error message for unknown codes', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/unknown-error',
      });

      await expect(
        firebaseAuth.login('test@example.com', 'password')
      ).rejects.toThrow('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full registration flow', async () => {
      // Register
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      const registerResult = await firebaseAuth.register(
        'new@example.com',
        'password123',
        'New User'
      );
      expect(registerResult.success).toBe(true);

      // Profile should be created
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should complete full login flow', async () => {
      // Login
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      const loginResult = await firebaseAuth.login('test@example.com', 'password123');
      expect(loginResult.success).toBe(true);

      // Last login should be updated
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lastLogin: expect.any(Date) }),
        { merge: true }
      );
    });

    it.skip('should complete Google login redirect flow', async () => {
      // Start redirect
      mockSignInWithRedirect.mockResolvedValue(undefined);
      await firebaseAuth.loginWithGoogle();
      expect(mockSignInWithRedirect).toHaveBeenCalled();

      // Handle redirect result
      mockGetRedirectResult.mockResolvedValue({ user: mockUser });
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await firebaseAuth.handleRedirectResult();
      expect(result?.success).toBe(true);
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should complete password reset flow', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await firebaseAuth.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSendPasswordResetEmail).toHaveBeenCalled();
    });
  });
});
