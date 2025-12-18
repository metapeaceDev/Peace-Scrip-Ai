/**
 * Admin User Management Component
 * 
 * จัดการ admin users: grant, revoke, list
 * เฉพาะ super-admin เท่านั้นที่เข้าถึงได้
 */

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAdminRole, logAdminAction } from '../../services/adminAuthService';
import type { AdminUser } from '../../../types';

export const AdminUserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const q = query(
        collection(db, 'admin-users'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        ...doc.data(),
        userId: doc.id,
      })) as AdminUser[];
      
      setAdminUsers(users);
    } catch (err) {
      console.error('Error loading admin users:', err);
      throw err;
    }
  }

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

      {/* Info Banner */}
      <div className="info-banner">
        <div className="banner-icon">ℹ️</div>
        <div className="banner-content">
          <strong>How to manage admin users:</strong>
          <p>
            To grant or revoke admin access, use the Firebase Admin SDK script:
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; &lt;ROLE&gt;</code>
          </p>
          <p className="mt-2">
            See <strong>ADMIN_SETUP_GUIDE.md</strong> for detailed instructions.
          </p>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>💡 Quick Commands</h3>
        <div className="commands-list">
          <div className="command-item">
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; super-admin</code>
            <p>Grant super-admin role (full access)</p>
          </div>
          <div className="command-item">
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; admin</code>
            <p>Grant admin role (cannot manage other admins)</p>
          </div>
          <div className="command-item">
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; viewer</code>
            <p>Grant viewer role (read-only access)</p>
          </div>
          <div className="command-item">
            <code>node scripts/set-admin-claims.js &lt;USER_ID&gt; revoke</code>
            <p>Revoke admin access</p>
          </div>
          <div className="command-item">
            <code>node scripts/set-admin-claims.js list</code>
            <p>List all admin users</p>
          </div>
        </div>
      </div>
    </div>
  );
};
