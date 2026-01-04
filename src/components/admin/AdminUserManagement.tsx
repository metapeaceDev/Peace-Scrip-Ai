/**
 * Admin User Management Component
 *
 * จัดการ admin users: grant, revoke, list
 * เฉพาะ super-admin เท่านั้นที่เข้าถึงได้
 */

import React, { useEffect, useState } from 'react';
import { auth } from '../../config/firebase';
import { getAdminRole, logAdminAction } from '../../services/adminAuthService';
import {
  getAllAdmins,
  removeAdmin,
  getPendingInvitations,
  cancelInvitation,
  type PendingInvitation,
} from '../../services/adminManagementService';
import type { AdminUser } from '../../types';
import { AddAdminModal } from './AddAdminModal';
import { EditAdminModal } from './EditAdminModal';

export const AdminUserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

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

      const invitations = await getPendingInvitations();
      setPendingInvitations(invitations.filter(inv => inv.status === 'pending'));

      console.log(
        `📋 Loaded ${users.length} admin users and ${invitations.length} pending invitations`
      );
    } catch (err) {
      console.error('Error loading admin users:', err);
      throw err;
    }
  }

  const handleAddSuccess = async () => {
    await loadAdminUsers();
    setShowAddModal(false);
    alert('✅ ส่งคำเชิญสำเร็จ! ผู้ใช้จะได้รับอีเมลและ notification เพื่อยืนยันสิทธิ์ Admin');
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

  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    const confirmed = window.confirm(
      `⚠️ ยืนยันการยกเลิกคำเชิญ\n\n` +
        `คุณต้องการยกเลิกคำเชิญสำหรับ ${invitation.email} หรือไม่?\n\n` +
        `บทบาท: ${invitation.role}\n` +
        `เชิญโดย: ${invitation.invitedByEmail}\n\n` +
        `การยกเลิกจะ:\n` +
        `• ลบคำเชิญทันที\n` +
        `• ลบ notification ของผู้ถูกเชิญ\n` +
        `• ส่งอีเมลแจ้งเตือนให้ผู้ถูกเชิญทราบ`
    );

    if (!confirmed) {
      return;
    }

    setCancellingInvitationId(invitation.id);
    try {
      await cancelInvitation(invitation.id);
      await loadAdminUsers();
      alert(`✅ ยกเลิกคำเชิญสำเร็จ\n\nคำเชิญสำหรับ ${invitation.email} ถูกยกเลิกแล้ว`);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setCancellingInvitationId(null);
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
          <button onClick={loadAdminUsers} className="btn-refresh" title="Refresh list">
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
            <p className="help-text">Use the setup script to grant admin access to users</p>
          </div>
        ) : (
          <div className="users-grid">
            {adminUsers.map(user => (
              <div key={user.userId} className="admin-user-card">
                {/* Card Header */}
                <div className="card-header">
                  <div className="user-info">
                    <div className="user-avatar">{getRoleIcon(user.role)}</div>
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
                    title={
                      user.userId === auth.currentUser?.uid ? 'Cannot edit yourself' : 'Edit admin'
                    }
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(user.userId, user.email)}
                    className="btn-delete"
                    disabled={
                      deletingUserId === user.userId || user.userId === auth.currentUser?.uid
                    }
                    title={
                      user.userId === auth.currentUser?.uid
                        ? 'Cannot delete yourself'
                        : 'Delete admin'
                    }
                  >
                    {deletingUserId === user.userId ? '⏳ กำลังลบ...' : '🗑️ ลบ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="pending-invitations-section" style={{ marginTop: '2rem' }}>
          <div className="list-header">
            <h3>📨 Pending Invitations ({pendingInvitations.length})</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              คำเชิญที่รอการยืนยันจากผู้ใช้
            </p>
          </div>

          <div
            className="invitations-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            {pendingInvitations.map(invitation => {
              const isExpired = new Date(invitation.expiresAt) < new Date();
              return (
                <div
                  key={invitation.id}
                  className="invitation-card"
                  style={{
                    background: isExpired ? '#fef2f2' : '#fffbeb',
                    border: `2px solid ${isExpired ? '#fca5a5' : '#fcd34d'}`,
                    borderRadius: '8px',
                    padding: '1.25rem',
                  }}
                >
                  {/* Header */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{isExpired ? '⏰' : '📨'}</span>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: isExpired ? '#991b1b' : '#92400e',
                        }}
                      >
                        {invitation.email}
                      </h4>
                    </div>
                    <span
                      className={`role-badge ${getRoleBadgeClass(invitation.role)}`}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {invitation.role}
                    </span>
                  </div>

                  {/* Details */}
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#4b5563',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>เชิญโดย:</strong> {invitation.invitedByEmail}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>สร้างเมื่อ:</strong> {formatDate(invitation.createdAt)}
                    </div>
                    <div
                      style={{
                        marginBottom: '0.5rem',
                        color: isExpired ? '#991b1b' : '#92400e',
                        fontWeight: isExpired ? '600' : '400',
                      }}
                    >
                      <strong>หมดอายุ:</strong> {formatDate(invitation.expiresAt)}
                      {isExpired && ' (Expired)'}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                      }}
                    >
                      สิทธิ์:
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      {invitation.permissions.canViewAnalytics && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '4px',
                          }}
                        >
                          📊 Analytics
                        </span>
                      )}
                      {invitation.permissions.canExportData && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#dbeafe',
                            color: '#1e3a8a',
                            borderRadius: '4px',
                          }}
                        >
                          📥 Export
                        </span>
                      )}
                      {invitation.permissions.canManageUsers && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '4px',
                          }}
                        >
                          👥 Manage
                        </span>
                      )}
                      {invitation.permissions.canManageSubscriptions && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '4px',
                          }}
                        >
                          💳 Subscriptions
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleCancelInvitation(invitation)}
                    disabled={cancellingInvitationId === invitation.id}
                    style={{
                      width: '100%',
                      padding: '0.625rem 1rem',
                      background: cancellingInvitationId === invitation.id ? '#9ca3af' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: cancellingInvitationId === invitation.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (cancellingInvitationId !== invitation.id) {
                        e.currentTarget.style.background = '#b91c1c';
                      }
                    }}
                    onMouseLeave={e => {
                      if (cancellingInvitationId !== invitation.id) {
                        e.currentTarget.style.background = '#dc2626';
                      }
                    }}
                  >
                    {cancellingInvitationId === invitation.id
                      ? '⏳ กำลังยกเลิก...'
                      : '❌ ยกเลิกคำเชิญ'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
