/**
 * Add Admin Modal Component
 * Modal สำหรับเพิ่ม admin user ใหม่
 * เฉพาะ super-admin เท่านั้นที่สามารถใช้ได้
 */

import React, { useState } from 'react';
import { 
  addAdmin,
  getDefaultPermissionsForRole,
  getRoleDescription,
  type AdminPermissions 
} from '../../services/adminManagementService';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super-admin' | 'admin' | 'viewer'>('viewer');
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canViewAnalytics: true,
    canExportData: false,
    canManageUsers: false,
    canManageSubscriptions: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

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

    if (!email.trim()) {
      setError('กรุณากรอกอีเมล');
      return;
    }

    if (!email.includes('@')) {
      setError('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    // แสดง confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmAdd = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      await addAdmin({
        email: email.trim(),
        role,
        permissions,
      });

      console.log('✅ Admin added successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('❌ Error adding admin:', err);
      
      // ถ้าเป็น error ที่มี invitation ค้างอยู่แล้ว ให้แสดงข้อความพิเศษ
      if (err.message?.includes('มีคำเชิญที่รออยู่แล้ว') || 
          err.message?.includes('invitation') && err.message?.includes('pending')) {
        const confirmMessage = 
          `⚠️ มีคำเชิญสำหรับ ${email} ที่รอการยืนยันอยู่แล้ว\n\n` +
          `คุณต้องการ:\n` +
          `1. ✅ ปิดหน้านี้แล้วไปยกเลิกคำเชิญเก่า (แนะนำ)\n` +
          `2. ❌ รอให้คำเชิญเก่าหมดอายุ (7 วัน)\n\n` +
          `กด OK เพื่อปิดหน้านี้และไปจัดการคำเชิญเก่า`;
        
        if (window.confirm(confirmMessage)) {
          handleClose();
          // แจ้งให้ไปที่ tab Admin User Management
          window.alert(
            '💡 คำแนะนำ:\n\n' +
            '1. ไปที่ tab "Admin User Management"\n' +
            '2. Scroll ลงไปด้านล่าง\n' +
            '3. ดูที่ส่วน "📨 Pending Invitations"\n' +
            '4. กดปุ่ม "❌ ยกเลิกคำเชิญ"\n' +
            '5. กลับมากดเพิ่ม Admin ใหม่อีกครั้ง'
          );
        }
        setError('มีคำเชิญที่รอการยืนยันอยู่แล้ว กรุณาไปยกเลิกคำเชิญเก่าก่อน');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการเพิ่ม admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setRole('viewer');
      setPermissions(getDefaultPermissionsForRole('viewer'));
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
              <h2>📧 ยืนยันการส่งคำเชิญ Admin</h2>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                คุณต้องการส่งคำเชิญเป็น Admin ให้กับผู้ใช้นี้หรือไม่?
              </p>
              
              <div style={{
                backgroundColor: '#fffbeb',
                border: '2px solid #fcd34d',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#92400e'
              }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  <strong>⚠️ โปรดทราบ:</strong><br/>
                  • ระบบจะส่งอีเมลคำเชิญไปยังผู้ใช้<br/>
                  • ผู้ใช้ต้องกดยืนยันก่อนจะได้รับสิทธิ์จริง<br/>
                  • คำเชิญจะหมดอายุใน 7 วัน
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                color: '#1f2937'
              }}>
                <div style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                  <strong style={{ color: '#1f2937' }}>📧 อีเมลผู้ถูกเชิญ:</strong> {email}
                </div>
                <div style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                  <strong style={{ color: '#1f2937' }}>👤 บทบาท:</strong> {
                    role === 'super-admin' ? 'Super Admin' :
                    role === 'admin' ? 'Admin' : 'Viewer'
                  }
                </div>
                <div style={{ color: '#1f2937' }}>
                  <strong style={{ color: '#1f2937' }}>🔐 สิทธิ์:</strong>
                  <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', color: '#1f2937' }}>
                    {permissions.canViewAnalytics && <li style={{ color: '#1f2937' }}>ดู Analytics</li>}
                    {permissions.canExportData && <li style={{ color: '#1f2937' }}>Export ข้อมูล</li>}
                    {permissions.canManageUsers && <li style={{ color: '#1f2937' }}>จัดการ Admin</li>}
                    {permissions.canManageSubscriptions && <li style={{ color: '#1f2937' }}>จัดการ Subscriptions</li>}
                  </ul>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={handleCancelConfirmation}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.5rem' }}
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      กำลังส่งคำเชิญ...
                    </>
                  ) : (
                    '📧 ส่งคำเชิญ'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Add Admin Form */}
      <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📧 เชิญผู้ใช้เป็น Admin</h2>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          {/* คำอธิบาย */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px solid #bfdbfe',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            color: '#1e40af'
          }}>
            <p style={{ margin: 0, lineHeight: '1.6' }}>
              <strong>📌 วิธีการทำงาน:</strong><br/>
              1. กรอกข้อมูลและส่งคำเชิญ<br/>
              2. ระบบส่งอีเมลไปยังผู้ใช้<br/>
              3. ผู้ใช้กดยืนยันในอีเมล<br/>
              4. ได้รับสิทธิ์ Admin ทันที
            </p>
          </div>

          {/* Email Input */}
          <div className="form-group">
            <label className="form-label">
              อีเมล <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading}
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              กรอกอีเมลของผู้ใช้ที่ต้องการให้สิทธิ์ admin
            </small>
          </div>

          {/* เลือก Role */}
          <div className="form-group">
            <label className="form-label">บทบาท (Role)</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as any)}
              disabled={loading}
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
                  disabled={loading}
                />
                <span>📊 ดู Analytics</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canExportData}
                  onChange={(e) => handlePermissionChange('canExportData', e.target.checked)}
                  disabled={loading}
                />
                <span>📥 Export ข้อมูล</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canManageUsers}
                  onChange={(e) => handlePermissionChange('canManageUsers', e.target.checked)}
                  disabled={loading}
                />
                <span>👥 จัดการ Admin</span>
              </label>

              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.canManageSubscriptions}
                  onChange={(e) => handlePermissionChange('canManageSubscriptions', e.target.checked)}
                  disabled={loading}
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  กำลังส่งคำเชิญ...
                </>
              ) : (
                '📧 ส่งคำเชิญ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};
