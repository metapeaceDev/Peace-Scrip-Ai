/**
 * Firebase Authentication Service
 * Replaces the old JWT-based authentication
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
}

class FirebaseAuthService {
  /**
   * Register with Email/Password
   */
  async register(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      await this.createUserProfile(user, displayName);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName
        }
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Login with Email/Password
   */
  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login
      await this.updateLastLogin(user.uid);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Login with Google (using redirect to avoid COOP issues)
   */
  async loginWithGoogle() {
    try {
      await signInWithRedirect(auth, googleProvider);
      // User will be redirected to Google, then back to the app
      // Handle result in handleRedirectResult()
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Handle redirect result after Google login
   * Call this on app initialization
   */
  async handleRedirectResult() {
    try {
      console.log('🔍 [firebaseAuth] Getting redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result) {
        console.log('✅ [firebaseAuth] Redirect result found');
        const user = result.user;
        console.log('👤 [firebaseAuth] User:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });

        // Check if user profile exists, if not create it
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.log('📝 [firebaseAuth] Creating new user profile...');
          await this.createUserProfile(user, user.displayName || 'User');
        } else {
          console.log('🔄 [firebaseAuth] Updating last login...');
          await this.updateLastLogin(user.uid);
        }

        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        };
      }
      
      console.log('ℹ️ [firebaseAuth] No redirect result');
      return null;
    } catch (error: any) {
      console.error('❌ [firebaseAuth] Redirect result error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error; // Re-throw to be caught in App.tsx
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Create user profile in Firestore
   */
  private async createUserProfile(user: User, displayName: string) {
    const userProfile: any = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // Only add photoURL if it exists
    if (user.photoURL) {
      userProfile.photoURL = user.photoURL;
    }

    await setDoc(doc(db, 'users', user.uid), userProfile);
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(uid: string) {
    await setDoc(
      doc(db, 'users', uid),
      { lastLogin: new Date() },
      { merge: true }
    );
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    try {
      // Validate email format
      if (!email || !email.trim()) {
        throw new Error('กรุณากรอกอีเมล');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
      }

      // Configure action code settings for Thai language
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      };

      console.log('Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('Password reset email sent successfully');
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific Firebase errors
      if (error.code) {
        throw new Error(this.getErrorMessage(error.code));
      }
      
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการส่งอีเมล');
    }
  }

  /**
   * Get user-friendly error messages
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
      'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
      'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      'auth/operation-not-allowed': 'การดำเนินการนี้ไม่ได้รับอนุญาต',
      'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      'auth/user-disabled': 'บัญชีนี้ถูกระงับ',
      'auth/user-not-found': 'ไม่พบอีเมลนี้ในระบบ',
      'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
      'auth/popup-closed-by-user': 'ปิดหน้าต่าง login',
      'auth/cancelled-popup-request': 'ยกเลิกการ login',
      'auth/network-request-failed': 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    };

    return errorMessages[errorCode] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
  }
}

export const firebaseAuth = new FirebaseAuthService();
