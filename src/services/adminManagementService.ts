/**
 * Admin Management Service
 * จัดการ CRUD operations สำหรับ admin users
 * เชื่อมต่อกับ Firebase Cloud Functions เพื่อจัดการ custom claims
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

// Types
export interface AdminPermissions {
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canManageSubscriptions: boolean;
}

export interface AdminUser {
  userId: string;
  email: string;
  role: 'super-admin' | 'admin' | 'viewer';
  permissions: AdminPermissions;
  createdAt: Date;
  createdBy: string;
  lastAccess?: Date;
}

export interface AddAdminData {
  email: string;
  role: 'super-admin' | 'admin' | 'viewer';
  permissions: AdminPermissions;
}

export interface UpdateAdminData {
  userId: string;
  role?: 'super-admin' | 'admin' | 'viewer';
  permissions?: AdminPermissions;
}

// Initialize Firebase Functions
const functions = getFunctions();

/**
 * เพิ่ม admin ใหม่ (ส่งคำเชิญ)
 * เฉพาะ super-admin เท่านั้นที่สามารถเรียกใช้ได้
 * ระบบจะส่งอีเมลคำเชิญไปให้ผู้ใช้ยืนยันก่อน
 */
export async function addAdmin(data: AddAdminData): Promise<{ success: boolean; message: string; invitationId?: string }> {
  try {
    console.log('🚀 Calling createAdminInvitation with:', { email: data.email, role: data.role });
    
    const createAdminInvitation = httpsCallable(functions, 'createAdminInvitation');
    const result = await createAdminInvitation({
      email: data.email,
      role: data.role,
      permissions: data.permissions,
    });

    const response = result.data as { success: boolean; message: string; invitationId?: string; expiresAt?: string };
    
    console.log('✅ Admin invitation sent successfully:', response);
    return {
      success: response.success,
      message: response.message || 'ส่งคำเชิญเรียบร้อย กรุณารอผู้ใช้ยืนยัน',
      invitationId: response.invitationId,
    };
  } catch (error: any) {
    console.error('❌ Error sending admin invitation - Full error:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', error.details);
    
    // Parse Firebase error messages
    let errorMessage = 'ไม่สามารถส่งคำเชิญได้';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'คุณไม่มีสิทธิ์เชิญ Admin (ต้องเป็น Super Admin เท่านั้น)';
    } else if (error.code === 'unauthenticated') {
      errorMessage = 'กรุณาเข้าสู่ระบบก่อนส่งคำเชิญ';
    } else if (error.code === 'not-found') {
      errorMessage = `ไม่พบผู้ใช้ที่มีอีเมล ${data.email} ในระบบ กรุณาให้ผู้ใช้ลงทะเบียนก่อน`;
    } else if (error.code === 'already-exists' && error.message?.includes('pending')) {
      errorMessage = 'มีคำเชิญที่รออยู่แล้วสำหรับอีเมลนี้';
    } else if (error.code === 'already-exists' && error.message?.includes('already an admin')) {
      errorMessage = 'ผู้ใช้นี้เป็น Admin อยู่แล้ว';
    } else if (error.code === 'invalid-argument') {
      errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * ลบ admin
 * เฉพาะ super-admin เท่านั้นที่สามารถเรียกใช้ได้
 * ไม่สามารถลบตัวเองได้
 */
export async function removeAdmin(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const revokeAdminAccess = httpsCallable(functions, 'revokeAdminAccess');
    const result = await revokeAdminAccess({ userId });

    const response = result.data as { success: boolean; message: string };
    
    console.log('✅ Admin removed successfully:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Error removing admin:', error);
    
    let errorMessage = 'Failed to remove admin';
    
    if (error.code === 'permission-denied') {
      if (error.message.includes('your own')) {
        errorMessage = 'You cannot remove your own admin access.';
      } else {
        errorMessage = 'You do not have permission to remove admins. Only super-admins can perform this action.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * อัพเดทข้อมูล admin (role และ/หรือ permissions)
 * เฉพาะ super-admin เท่านั้นที่สามารถเรียกใช้ได้
 * ไม่สามารถแก้ไขตัวเองได้
 */
export async function updateAdmin(data: UpdateAdminData): Promise<{ success: boolean; message: string }> {
  try {
    const updateAdminPermissions = httpsCallable(functions, 'updateAdminPermissions');
    const result = await updateAdminPermissions({
      userId: data.userId,
      role: data.role,
      permissions: data.permissions,
    });

    const response = result.data as { success: boolean; message: string };
    
    console.log('✅ Admin updated successfully:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Error updating admin:', error);
    
    let errorMessage = 'Failed to update admin';
    
    if (error.code === 'permission-denied') {
      if (error.message.includes('your own')) {
        errorMessage = 'You cannot modify your own permissions.';
      } else {
        errorMessage = 'You do not have permission to update admins. Only super-admins can perform this action.';
      }
    } else if (error.code === 'not-found') {
      errorMessage = 'Admin user not found.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * ดึงรายการ admin ทั้งหมด
 * สามารถเรียกใช้ได้โดย admin ทุกคน
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  try {
    const adminsRef = collection(db, 'admin-users');
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const admins: AdminUser[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      admins.push({
        userId: doc.id,
        email: data.email,
        role: data.role,
        permissions: data.permissions,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        lastAccess: data.lastAccess?.toDate(),
      });
    });

    console.log(`📋 Loaded ${admins.length} admin users`);
    return admins;
  } catch (error) {
    console.error('❌ Error loading admins:', error);
    throw new Error('Failed to load admin users');
  }
}

/**
 * ตรวจสอบว่า email เป็น admin อยู่หรือไม่
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  try {
    const admins = await getAllAdmins();
    return admins.some(admin => admin.email.toLowerCase() === email.toLowerCase());
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}

/**
 * Default permissions สำหรับแต่ละ role
 */
export function getDefaultPermissionsForRole(role: 'super-admin' | 'admin' | 'viewer'): AdminPermissions {
  switch (role) {
    case 'super-admin':
      return {
        canViewAnalytics: true,
        canExportData: true,
        canManageUsers: true,
        canManageSubscriptions: true,
      };
    case 'admin':
      return {
        canViewAnalytics: true,
        canExportData: true,
        canManageUsers: false,
        canManageSubscriptions: true,
      };
    case 'viewer':
      return {
        canViewAnalytics: true,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
      };
    default:
      return {
        canViewAnalytics: false,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
      };
  }
}

/**
 * รับคำอธิบาย role
 */
export function getRoleDescription(role: 'super-admin' | 'admin' | 'viewer'): string {
  switch (role) {
    case 'super-admin':
      return 'มีสิทธิ์ทุกอย่าง รวมถึงการจัดการ admin คนอื่น';
    case 'admin':
      return 'สามารถจัดการข้อมูลและ subscriptions แต่ไม่สามารถจัดการ admin คนอื่น';
    case 'viewer':
      return 'ดูข้อมูล analytics เท่านั้น ไม่สามารถแก้ไขหรือ export ข้อมูล';
    default:
      return '';
  }
}
