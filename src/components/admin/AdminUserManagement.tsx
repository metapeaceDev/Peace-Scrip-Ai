/**
 * Admin User Management Component
 * 
 * จัดการ admin users: grant, revoke, list
 * เฉพาะ super-admin เท่านั้นที่เข้าถึงได้
 */

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { getAdminRole, logAdminAction } from '../../services/adminAuthService';
import { getAllAdmins, removeAdmin } from '../../services/adminManagementService';
import type { AdminUser } from '../../../types';
import { AddAdminModal } from './AddAdminModal';
import { EditAdminModal } from './EditAdminModal';

export const AdminUserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    try {
      setLoading(true);
      
      // Check if current user is super-admin
      const role = await getAdminRole();
      setCurrentRole(role);
      
      if (role !== 'super-admin') {
        setError('Only super-admins can manage admin users');
        setLoading(false);
        return;
      }

      // Load admin users
      await loadAdminUsers();
      
      // Log access
      await logAdminAction('view-analytics');
      
      setLoading(false);
    } catch (err) {
      console.error('Error initializing admin user management:', err);
      setError('Failed to load admin users');
      setLoading(false);
    }
  }

  async function loadAdminUsers() {
    try {
      const users = await getAllAdmins();
      setAdminUsers(users);
    } catch (err) {
      console.error('Error loading admin users:', err);
      throw err;
    }
  }

  const handleAddSuccess = async () => {
    await loadAdminUsers();
    setShowAddModal(false);
  };

  const handleEditSuccess = async () => {
    await loadAdminUsers();
    setEditingAdmin(null);
  };

  const handleDelete = async (userId: string, email: string) => {
    // แสดง confirmation dialog ที่ละเอียดกว่า
    const confirmed = window.confirm(
      `⚠️ ยืนยันการลบ Admin\n\n` +
      `คุณแน่ใจหรือไม่ที่จะลบสิทธิ์ admin:\n` +
      `อีเมล: ${email}\n\n` +
      `การดำเนินการนี้จะ:\n` +
      `• ลบสิทธิ์ Admin ทันที\n` +
      `• ส่งอีเมลแจ้งเตือนไปยังผู้ถูกลบ\n` +
      `• ส่งอีเมลยืนยันถึงคุณ\n` +
      `• บันทึกใน Audit Log\n\n` +
      `กด OK เพื่อยืนยัน หรือ Cancel เพื่อยกเลิก`
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    try {
      await removeAdmin(userId);
      await loadAdminUsers();
      await logAdminAction('revoke-admin', { targetUserId: userId });
      
      // แสดงข้อความสำเร็จ
      alert(`✅ ลบสิทธิ์ Admin สำเร็จ\n\nอีเมลแจ้งเตือนถูกส่งไปยัง ${email} และคุณแล้ว`);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  function formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'super-admin':
        return 'role-badge-super-admin';
      case 'admin':
        return 'role-badge-admin';
      case 'viewer':
        return 'role-badge-viewer';
      default:
        return 'role-badge-viewer';
    }
  }

  function getRoleIcon(role: string): string {
    switch (role) {
      case 'super-admin':
        return '👑';
      case 'admin':
        return '🔑';
      case 'viewer':
        return '👁️';
      default:
        return '👤';
    }
  }

  if (loading) {
    return (
      <div className="admin-user-management loading">
        <div className="loading-spinner"></div>
        <p>Loading admin users...</p>
      </div>
    );
  }

  if (error || currentRole !== 'super-admin') {
    return (
      <div className="admin-user-management error">
        <div className="error-message">
          <h3>⚠️ Access Denied</h3>
          <p>{error || 'You do not have permission to manage admin users'}</p>
          <p className="help-text">Only super-admins can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-user-management">
      {/* Header */}
      <div className="management-header">
        <div>
          <h2>👥 Admin User Management</h2>
          <p className="subtitle">Manage admin users and their permissions</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-add-admin"
            title="Add new admin"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            เพิ่ม Admin
          </button>
          <button
            onClick={loadAdminUsers}
            className="btn-refresh"
            title="Refresh list"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Admin Users List */}
      <div className="admin-users-list">
        <div className="list-header">
          <h3>Admin Users ({adminUsers.length})</h3>
        </div>

        {adminUsers.length === 0 ? (
          <div className="empty-state">
            <p>No admin users found</p>
            <p className="help-text">
              Use the setup script to grant admin access to users
            </p>
          </div>
        ) : (
          <div className="users-grid">
            {adminUsers.map((user) => (
              <div key={user.userId} className="admin-user-card">
                {/* Card Header */}
                <div className="card-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <h4 className="user-email">{user.email}</h4>
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <div className="info-row">
                    <span className="label">User ID:</span>
                    <span className="value monospace">{user.userId.substring(0, 20)}...</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Created By:</span>
                    <span className="value">{user.createdBy || 'system'}</span>
                  </div>

                </div>

                {/* Permissions */}
                <div className="card-footer">
                  <div className="permissions-label">Permissions:</div>
                  <div className="permissions-list">
                    {user.permissions.canViewAnalytics && (
                      <span className="permission-badge">📊 Analytics</span>
                    )}
                    {user.permissions.canExportData && (
                      <span className="permission-badge">📥 Export</span>
                    )}
                    {user.permissions.canManageUsers && (
                      <span className="permission-badge">👥 Manage Users</span>
                    )}
                    {user.permissions.canManageSubscriptions && (
                      <span className="permission-badge">💳 Subscriptions</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="card-actions">
                  <button
                    onClick={() => setEditingAdmin(user)}
                    className="btn-edit"
                    disabled={user.userId === auth.currentUser?.uid}
                    title={user.userId === auth.currentUser?.uid ? 'Cannot edit yourself' : 'Edit admin'}
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(user.userId, user.email)}
                    className="btn-delete"
                    disabled={deletingUserId === user.userId || user.userId === auth.currentUser?.uid}
                    title={user.userId === auth.currentUser?.uid ? 'Cannot delete yourself' : 'Delete admin'}
                  >
                    {deletingUserId === user.userId ? '⏳ กำลังลบ...' : '🗑️ ลบ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddAdminModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      <EditAdminModal
        admin={editingAdmin}
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        onSuccess={handleEditSuccess}
        currentUserId={auth.currentUser?.uid || ''}
      />

      {/* Help Section - Optional, can be removed if not needed */}
      {/*
      <div className="help-section">
        <h3>💡 Quick Commands</h3>
        <div className="commands-list">
          <div className="command-item">
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; super-admin</code>
            <p>Grant super-admin role (full access)</p>
          </div>
          </div>
          <div className="command-item">
            <code>node scripts/set-admin-claims.js list</code>
            <p>List all admin users</p>
          </div>
        </div>
      </div>
      */}
    </div>
  );
};
