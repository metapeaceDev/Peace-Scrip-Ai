/**
 * EditAdminModal Component
 * Modal สำหรับแก้ไข role และ permissions ของ admin ที่มีอยู่
 * เฉพาะ super-admin เท่านั้นที่สามารถใช้ได้
 */

import React, { useState, useEffect } from 'react';
import { 
  AdminUser, 
  AdminPermissions, 
  updateAdmin,
  getDefaultPermissionsForRole,
  getRoleDescription 
} from '../../services/adminManagementService';

interface EditAdminModalProps {
  admin: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string; // เพื่อป้องกันการแก้ไขตัวเอง
}

export const EditAdminModal: React.FC<EditAdminModalProps> = ({
  admin,
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
}) => {
  const [role, setRole] = useState<'super-admin' | 'admin' | 'viewer'>('viewer');
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canViewAnalytics: true,
    canExportData: false,
    canManageUsers: false,
    canManageSubscriptions: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // โหลดข้อมูล admin เมื่อเปิด modal
  useEffect(() => {
    if (admin) {
      setRole(admin.role);
      setPermissions(admin.permissions);
      setHasChanges(false);
      setError(null);
    }
  }, [admin]);

  // ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่
  useEffect(() => {
    if (!admin) return;

    const roleChanged = role !== admin.role;
    const permissionsChanged = JSON.stringify(permissions) !== JSON.stringify(admin.permissions);
    
    setHasChanges(roleChanged || permissionsChanged);
  }, [role, permissions, admin]);

  if (!isOpen || !admin) return null;

  const isSelf = admin.userId === currentUserId;

  const handleRoleChange = (newRole: 'super-admin' | 'admin' | 'viewer') => {
    setRole(newRole);
    
    // ตั้งค่า permissions ตามค่าเริ่มต้นของ role
    const defaultPerms = getDefaultPermissionsForRole(newRole);
    setPermissions(defaultPerms);
  };

  const handlePermissionChange = (key: keyof AdminPermissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSelf) {
      setError('คุณไม่สามารถแก้ไขสิทธิ์ของตัวเองได้');
      return;
    }

    if (!hasChanges) {
      setError('ไม่มีการเปลี่ยนแปลง');
      return;
    }

    // แสดง confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      await updateAdmin({
        userId: admin.userId,
        role: role,
        permissions: permissions,
      });

      console.log('✅ Admin updated successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('❌ Error updating admin:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอัพเดท admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setShowConfirmation(false);
      onClose();
    }
  };

  return (
    <>
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🔄 ยืนยันการแก้ไข Admin</h2>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', fontSize: '1rem', color: '#374151' }}>
                คุณต้องการแก้ไขสิทธิ์ Admin นี้หรือไม่?
              </p>
              
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>📧 อีเมล:</strong> {admin.email}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>👤 บทบาทใหม่:</strong> {
                    role === 'super-admin' ? 'Super Admin' :
                    role === 'admin' ? 'Admin' : 'Viewer'
                  }
                </div>
                <div>
                  <strong>🔐 สิทธิ์ใหม่:</strong>
                  <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                    {permissions.canViewAnalytics && <li>ดู Analytics</li>}
                    {permissions.canExportData && <li>Export ข้อมูล</li>}
                    {permissions.canManageUsers && <li>จัดการ Admin</li>}
                    {permissions.canManageSubscriptions && <li>จัดการ Subscriptions</li>}
                  </ul>
                </div>
              </div>

              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                💡 <strong>หมายเหตุ:</strong> ระบบจะส่งอีเมลแจ้งเตือนไปยังทั้งคุณและผู้ถูกแก้ไข
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCancelConfirmation}
                  className="btn-secondary"
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdate}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    '✅ ยืนยันการแก้ไข'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Edit Admin Form */}
      <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ แก้ไข Admin</h2>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          {/* แสดงข้อมูล Email (ไม่สามารถแก้ไขได้) */}
          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input
              type="email"
              className="form-input"
              value={admin.email}
              disabled
              style={{ 
                backgroundColor: '#f3f4f6', 
                cursor: 'not-allowed',
                opacity: 0.7 
              }}
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              ไม่สามารถเปลี่ยนอีเมลได้
            </small>
          </div>

          {/* เลือก Role */}
          <div className="form-group">
            <label className="form-label">บทบาท (Role)</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as any)}
              disabled={loading || isSelf}
            >
              <option value="viewer">Viewer - ดูข้อมูลเท่านั้น</option>
              <option value="admin">Admin - จัดการข้อมูล</option>
              <option value="super-admin">Super Admin - จัดการทุกอย่าง</option>
            </select>
            
            {/* คำอธิบาย Role */}
            <div className="role-info-box" style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              ℹ️ {getRoleDescription(role)}
            </div>
          </div>

          {/* สิทธิ์การใช้งาน (Permissions) */}
          <div className="form-group">
            <label className="form-label">สิทธิ์การใช้งาน</label>
            <div className="permissions-grid">
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canViewAnalytics}
                  onChange={(e) => handlePermissionChange('canViewAnalytics', e.target.checked)}
                  disabled={loading || isSelf}
                />
                <span>📊 ดู Analytics</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canExportData}
                  onChange={(e) => handlePermissionChange('canExportData', e.target.checked)}
                  disabled={loading || isSelf}
                />
                <span>📥 Export ข้อมูล</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canManageUsers}
                  onChange={(e) => handlePermissionChange('canManageUsers', e.target.checked)}
                  disabled={loading || isSelf}
                />
                <span>👥 จัดการ Admin</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canManageSubscriptions}
                  onChange={(e) => handlePermissionChange('canManageSubscriptions', e.target.checked)}
                  disabled={loading || isSelf}
                />
                <span>💳 จัดการ Subscriptions</span>
              </label>
            </div>
          </div>

          {/* แสดงข้อผิดพลาด */}
          {error && (
            <div className="error-banner" style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* แสดงเตือนถ้าพยายามแก้ไขตัวเอง */}
          {isSelf && (
            <div className="warning-banner" style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              🔒 คุณไม่สามารถแก้ไขสิทธิ์ของตัวเองได้
            </div>
          )}

          {/* ปุ่มบันทึก */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !hasChanges || isSelf}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  💾 บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>

          {/* แสดงข้อมูลเพิ่มเติม */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <p>สร้างเมื่อ: {admin.createdAt.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            {admin.lastAccess && (
              <p>เข้าใช้งานล่าสุด: {admin.lastAccess.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            )}
          </div>
        </form>
      </div>
    </div>
    </>
  );
};
