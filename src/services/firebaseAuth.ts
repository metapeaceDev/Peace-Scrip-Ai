/**
 * Firebase Authentication Service
 * Replaces the old JWT-based authentication
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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
   * Login with Google
   */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await this.createUserProfile(user, user.displayName || 'User');
      } else {
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
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(this.getErrorMessage(error.code));
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
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLogin: new Date()
    };

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
   * Get user-friendly error messages
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
      'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
      'auth/operation-not-allowed': 'การดำเนินการนี้ไม่ได้รับอนุญาต',
      'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      'auth/user-disabled': 'บัญชีนี้ถูกระงับ',
      'auth/user-not-found': 'ไม่พบผู้ใช้นี้',
      'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
      'auth/popup-closed-by-user': 'ปิดหน้าต่าง login',
      'auth/cancelled-popup-request': 'ยกเลิกการ login',
      'auth/network-request-failed': 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    };

    return errorMessages[errorCode] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
  }
}

export const firebaseAuth = new FirebaseAuthService();
