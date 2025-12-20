import React from 'react';
import type { CollaboratorRole } from '../services/teamCollaborationService';

interface RoleSelectorProps {
  currentRole: CollaboratorRole;
  onChange: (role: CollaboratorRole) => void;
  disabled?: boolean;
  showPermissions?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  onChange,
  disabled = false,
  showPermissions = true,
}) => {
  const roles: Array<{
    value: CollaboratorRole;
    label: string;
    description: string;
    color: string;
  }> = [
    {
      value: 'admin',
      label: 'ผู้ดูแล (Admin)',
      description: 'สามารถแก้ไข ลบ และจัดการทีมได้ทั้งหมด',
      color: 'from-purple-600 to-pink-600',
    },
    {
      value: 'editor',
      label: 'แก้ไข (Editor)',
      description: 'สามารถแก้ไขเนื้อหาและส่งออกได้ แต่ไม่สามารถลบหรือจัดการทีม',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      value: 'viewer',
      label: 'อ่านอย่างเดียว (Viewer)',
      description: 'สามารถดูเนื้อหาเท่านั้น ไม่สามารถแก้ไขหรือส่งออก',
      color: 'from-gray-600 to-gray-700',
    },
  ];

  const permissions: Record<CollaboratorRole, string[]> = {
    owner: ['แก้ไข', 'ลบ', 'เชิญทีม', 'จัดการทีม', 'ส่งออก', 'จัดการเงิน', 'ดูสถิติ', 'โอนเจ้าของ'],
    admin: ['แก้ไข', 'ลบ', 'เชิญทีม', 'จัดการทีม', 'ส่งออก', 'จัดการเงิน', 'ดูสถิติ'],
    editor: ['แก้ไข', 'ส่งออก', 'ดูสถิติ'],
    viewer: ['ดูเท่านั้น'],
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">สิทธิ์การเข้าถึง</label>
      <select
        value={currentRole}
        onChange={e => onChange(e.target.value as CollaboratorRole)}
        disabled={disabled}
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {roles.map(role => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>

      {showPermissions && (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-4 h-4 text-cyan-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-xs font-medium text-gray-300">
                {roles.find(r => r.value === currentRole)?.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {permissions[currentRole]?.map(perm => (
                  <span
                    key={perm}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-900/30 text-cyan-300 border border-cyan-700/50"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RoleBadgeProps {
  role: CollaboratorRole | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md', showIcon = true }) => {
  const roleConfig: Record<
    string,
    { label: string; color: string; bgColor: string; icon: string }
  > = {
    owner: {
      label: 'เจ้าของ',
      color: 'text-yellow-300',
      bgColor: 'bg-yellow-900/30 border-yellow-700/50',
      icon: '👑',
    },
    admin: {
      label: 'ผู้ดูแล',
      color: 'text-purple-300',
      bgColor: 'bg-purple-900/30 border-purple-700/50',
      icon: '⚙️',
    },
    editor: {
      label: 'แก้ไข',
      color: 'text-blue-300',
      bgColor: 'bg-blue-900/30 border-blue-700/50',
      icon: '✏️',
    },
    viewer: {
      label: 'ดู',
      color: 'text-gray-300',
      bgColor: 'bg-gray-700/30 border-gray-600/50',
      icon: '👁️',
    },
  };

  const config = roleConfig[role] || roleConfig.viewer;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.bgColor} ${config.color} ${sizeClasses[size]} font-medium`}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

interface PermissionGuardProps {
  permission:
    | 'canEdit'
    | 'canDelete'
    | 'canInvite'
    | 'canManageTeam'
    | 'canExport'
    | 'canManagePayments'
    | 'canViewAnalytics';
  userRole: CollaboratorRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  userRole,
  children,
  fallback = null,
}) => {
  const permissions = {
    owner: {
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canManageTeam: true,
      canExport: true,
      canManagePayments: true,
      canViewAnalytics: true,
    },
    admin: {
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canManageTeam: true,
      canExport: true,
      canManagePayments: true,
      canViewAnalytics: true,
    },
    editor: {
      canEdit: true,
      canDelete: false,
      canInvite: false,
      canManageTeam: false,
      canExport: true,
      canManagePayments: false,
      canViewAnalytics: true,
    },
    viewer: {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canManageTeam: false,
      canExport: false,
      canManagePayments: false,
      canViewAnalytics: false,
    },
  };

  const hasPermission = permissions[userRole]?.[permission] || false;

  return <>{hasPermission ? children : fallback}</>;
};

