/**
 * Admin Authentication Service
 * 
 * จัดการการยืนยันตัวตนและสิทธิ์ของ admin users
 * ใช้ Firebase Auth custom claims
 */

import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { AdminUser, AdminAuditLog } from '../../types';

/**
 * Check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin role of current user
 * @returns 'super-admin' | 'admin' | 'viewer' | null
 */
export async function getAdminRole(): Promise<'super-admin' | 'admin' | 'viewer' | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.admin !== true) return null;
    
    return (tokenResult.claims.adminRole as 'super-admin' | 'admin' | 'viewer') || 'viewer';
  } catch (error) {
    console.error('Error getting admin role:', error);
    return null;
  }
}

/**
 * Get admin permissions of current user
 */
export async function getAdminPermissions(): Promise<AdminUser['permissions'] | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return null;

    // Get permissions from admin-users collection
    const adminDocRef = doc(db, 'admin-users', user.uid);
    const adminDoc = await getDoc(adminDocRef);

    if (!adminDoc.exists()) {
      // Default viewer permissions
      return {
        canViewAnalytics: true,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
      };
    }

    const adminData = adminDoc.data() as AdminUser;
    return adminData.permissions;
  } catch (error) {
    console.error('Error getting admin permissions:', error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: keyof AdminUser['permissions']): Promise<boolean> {
  const permissions = await getAdminPermissions();
  if (!permissions) return false;
  
  return permissions[permission] === true;
}

/**
 * Log admin action to audit trail
 */
export async function logAdminAction(
  action: AdminAuditLog['action'],
  details?: {
    targetUserId?: string;
    data?: any;
  }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn('Cannot log admin action: no user logged in');
    return;
  }

  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      console.warn('Cannot log admin action: user is not admin');
      return;
    }

    const logRef = doc(db, 'admin-audit-log', `${Date.now()}_${user.uid}`);
    const logData: Omit<AdminAuditLog, 'id'> = {
      adminId: user.uid,
      adminEmail: user.email || 'unknown',
      action,
      targetUserId: details?.targetUserId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      details: details?.data,
    };

    await setDoc(logRef, {
      ...logData,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Admin action logged: ${action}`);
  } catch (error) {
    console.error('❌ Error logging admin action:', error);
    // Don't throw - logging failure shouldn't break the app
  }
}

/**
 * Update last access time for admin user
 */
export async function updateAdminLastAccess(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return;

    const adminDocRef = doc(db, 'admin-users', user.uid);
    const adminDoc = await getDoc(adminDocRef);

    if (adminDoc.exists()) {
      await setDoc(
        adminDocRef,
        {
          lastAccess: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error updating admin last access:', error);
  }
}

/**
 * Get admin user data
 */
export async function getAdminUserData(userId?: string): Promise<AdminUser | null> {
  const targetUserId = userId || auth.currentUser?.uid;
  if (!targetUserId) return null;

  try {
    const adminDocRef = doc(db, 'admin-users', targetUserId);
    const adminDoc = await getDoc(adminDocRef);

    if (!adminDoc.exists()) return null;

    const data = adminDoc.data();
    return {
      userId: adminDoc.id,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      createdBy: data.createdBy,
      lastAccess: data.lastAccess instanceof Timestamp ? data.lastAccess.toDate() : undefined,
    } as AdminUser;
  } catch (error) {
    console.error('Error getting admin user data:', error);
    return null;
  }
}

/**
 * Initialize admin session
 * Call this when admin dashboard loads
 */
export async function initAdminSession(): Promise<{
  isAdmin: boolean;
  role: string | null;
  permissions: AdminUser['permissions'] | null;
}> {
  const isAdmin = await checkIsAdmin();
  
  if (!isAdmin) {
    return {
      isAdmin: false,
      role: null,
      permissions: null,
    };
  }

  const role = await getAdminRole();
  const permissions = await getAdminPermissions();

  // Update last access
  await updateAdminLastAccess();

  // Log dashboard access
  await logAdminAction('view-analytics', {
    data: { page: 'dashboard' },
  });

  return {
    isAdmin: true,
    role,
    permissions,
  };
}

/**
 * Check if user can perform specific admin action
 */
export async function canPerformAction(
  action: 'view-analytics' | 'export-data' | 'manage-users' | 'manage-subscriptions'
): Promise<boolean> {
  const permissions = await getAdminPermissions();
  if (!permissions) return false;

  switch (action) {
    case 'view-analytics':
      return permissions.canViewAnalytics;
    case 'export-data':
      return permissions.canExportData;
    case 'manage-users':
      return permissions.canManageUsers;
    case 'manage-subscriptions':
      return permissions.canManageSubscriptions;
    default:
      return false;
  }
}
