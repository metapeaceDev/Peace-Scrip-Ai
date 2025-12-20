/**
 * Admin Authentication Service
 *
 * จัดการการยืนยันตัวตนและสิทธิ์ของ admin users
 * ใช้ Firebase Auth custom claims
 */

import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { AdminUser, AdminAuditLog } from '../types';
import { logger } from '../utils/logger';

/**
 * Check if current user is admin
 * @param forceRefresh - Force token refresh to get latest claims (default: false)
 */
export async function checkIsAdmin(forceRefresh = false): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    // Force refresh if requested to get latest claims from server
    if (forceRefresh) {
      await user.getIdToken(true);
    }

    const tokenResult = await user.getIdTokenResult(forceRefresh);
    const isAdmin = tokenResult.claims.admin === true;

    if (forceRefresh) {
      logger.debug('Admin check (refreshed)', {
        email: user.email,
        isAdmin,
        adminRole: tokenResult.claims.adminRole,
        allClaims: tokenResult.claims,
      });
    }

    return isAdmin;
  } catch (error) {
    logger.error('Error checking admin status', { error });
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
    logger.error('Error getting admin role', { error });
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
    logger.error('Error getting admin permissions', { error });
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
    logger.warn('Cannot log admin action: no user logged in');
    return;
  }

  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      logger.warn('Cannot log admin action: user is not admin');
      return;
    }

    const logRef = doc(db, 'admin-audit-log', `${Date.now()}_${user.uid}`);
    const logData: any = {
      adminId: user.uid,
      adminEmail: user.email || 'unknown',
      action,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
    };

    // Only add targetUserId if it exists
    if (details?.targetUserId) {
      logData.targetUserId = details.targetUserId;
    }

    // Only add details if it exists
    if (details?.data) {
      logData.details = details.data;
    }

    await setDoc(logRef, {
      ...logData,
      timestamp: serverTimestamp(),
    });

    logger.info(`Admin action logged: ${action}`);
  } catch (error) {
    logger.error('Error logging admin action', { error });
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
    logger.error('Error updating admin last access', { error });
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
      createdAt:
        data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      createdBy: data.createdBy,
      lastAccess: data.lastAccess instanceof Timestamp ? data.lastAccess.toDate() : undefined,
    } as AdminUser;
  } catch (error) {
    logger.error('Error getting admin user data', { error });
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
  // Always force refresh on session init to get latest claims
  const isAdmin = await checkIsAdmin(true);

  if (!isAdmin) {
    logger.warn('User is not admin or token not refreshed');
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

