import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector, RoleBadge, PermissionGuard } from './RoleManagement';
import type { CollaboratorRole } from '../services/teamCollaborationService';

describe('RoleManagement', () => {
  describe('RoleSelector', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('Component Rendering', () => {
      it('should render role selector with label', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} />);
        expect(screen.getByText('สิทธิ์การเข้าถึง')).toBeInTheDocument();
      });

      it('should render select dropdown', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      it('should display current role as selected', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('admin');
      });
    });

    describe('Role Options', () => {
      it('should render all three role options', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        expect(screen.getByText('ผู้ดูแล (Admin)')).toBeInTheDocument();
        expect(screen.getByText('แก้ไข (Editor)')).toBeInTheDocument();
        expect(screen.getByText('อ่านอย่างเดียว (Viewer)')).toBeInTheDocument();
      });

      it('should have correct option values', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveValue('admin');
        expect(options[1]).toHaveValue('editor');
        expect(options[2]).toHaveValue('viewer');
      });
    });

    describe('Role Selection', () => {
      it('should call onChange when role is changed', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'editor' } });
        expect(mockOnChange).toHaveBeenCalledWith('editor');
      });

      it('should call onChange with admin role', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'admin' } });
        expect(mockOnChange).toHaveBeenCalledWith('admin');
      });

      it('should call onChange with viewer role', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'viewer' } });
        expect(mockOnChange).toHaveBeenCalledWith('viewer');
      });
    });

    describe('Disabled State', () => {
      it('should disable select when disabled prop is true', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} disabled={true} />);
        const select = screen.getByRole('combobox');
        expect(select).toBeDisabled();
      });

      it('should be enabled by default', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} />);
        const select = screen.getByRole('combobox');
        expect(select).not.toBeDisabled();
      });

      it('should have disabled styling when disabled', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} disabled={true} />);
        const select = screen.getByRole('combobox');
        expect(select.className).toContain('disabled:opacity-50');
      });
    });

    describe('Permissions Display', () => {
      it('should show permissions by default', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} />);
        expect(screen.getByText('สามารถแก้ไข ลบ และจัดการทีมได้ทั้งหมด')).toBeInTheDocument();
      });

      it('should hide permissions when showPermissions is false', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} showPermissions={false} />);
        expect(screen.queryByText('สามารถแก้ไข ลบ และจัดการทีมได้ทั้งหมด')).not.toBeInTheDocument();
      });

      it('should display admin description', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} />);
        expect(screen.getByText('สามารถแก้ไข ลบ และจัดการทีมได้ทั้งหมด')).toBeInTheDocument();
      });

      it('should display editor description', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} />);
        expect(screen.getByText('สามารถแก้ไขเนื้อหาและส่งออกได้ แต่ไม่สามารถลบหรือจัดการทีม')).toBeInTheDocument();
      });

      it('should display viewer description', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        expect(screen.getByText('สามารถดูเนื้อหาเท่านั้น ไม่สามารถแก้ไขหรือส่งออก')).toBeInTheDocument();
      });
    });

    describe('Permission Tags', () => {
      it('should display admin permissions tags', () => {
        render(<RoleSelector currentRole="admin" onChange={mockOnChange} />);
        expect(screen.getByText('แก้ไข')).toBeInTheDocument();
        expect(screen.getByText('ลบ')).toBeInTheDocument();
        expect(screen.getByText('เชิญทีม')).toBeInTheDocument();
        expect(screen.getByText('จัดการทีม')).toBeInTheDocument();
        expect(screen.getByText('ส่งออก')).toBeInTheDocument();
        expect(screen.getByText('จัดการเงิน')).toBeInTheDocument();
        expect(screen.getByText('ดูสถิติ')).toBeInTheDocument();
      });

      it('should display editor permissions tags', () => {
        render(<RoleSelector currentRole="editor" onChange={mockOnChange} />);
        const tags = screen.getAllByText(/แก้ไข|ส่งออก|ดูสถิติ/);
        expect(tags.length).toBeGreaterThanOrEqual(3);
      });

      it('should display viewer permissions tag', () => {
        render(<RoleSelector currentRole="viewer" onChange={mockOnChange} />);
        expect(screen.getByText('ดูเท่านั้น')).toBeInTheDocument();
      });

      it('should display owner permissions when currentRole is owner', () => {
        render(<RoleSelector currentRole="owner" onChange={mockOnChange} />);
        expect(screen.getByText('โอนเจ้าของ')).toBeInTheDocument();
      });
    });
  });

  describe('RoleBadge', () => {
    describe('Component Rendering', () => {
      it('should render role badge', () => {
        const { container } = render(<RoleBadge role="admin" />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should display admin label and icon', () => {
        render(<RoleBadge role="admin" />);
        expect(screen.getByText('ผู้ดูแล')).toBeInTheDocument();
        expect(screen.getByText('⚙️')).toBeInTheDocument();
      });

      it('should display editor label and icon', () => {
        render(<RoleBadge role="editor" />);
        expect(screen.getByText('แก้ไข')).toBeInTheDocument();
        expect(screen.getByText('✏️')).toBeInTheDocument();
      });

      it('should display viewer label and icon', () => {
        render(<RoleBadge role="viewer" />);
        expect(screen.getByText('ดู')).toBeInTheDocument();
        expect(screen.getByText('👁️')).toBeInTheDocument();
      });

      it('should display owner label and icon', () => {
        render(<RoleBadge role="owner" />);
        expect(screen.getByText('เจ้าของ')).toBeInTheDocument();
        expect(screen.getByText('👑')).toBeInTheDocument();
      });
    });

    describe('Size Variants', () => {
      it('should apply small size classes', () => {
        const { container } = render(<RoleBadge role="admin" size="sm" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-xs');
      });

      it('should apply medium size classes by default', () => {
        const { container } = render(<RoleBadge role="admin" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-sm');
      });

      it('should apply large size classes', () => {
        const { container } = render(<RoleBadge role="admin" size="lg" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-base');
      });
    });

    describe('Icon Display', () => {
      it('should show icon by default', () => {
        render(<RoleBadge role="admin" />);
        expect(screen.getByText('⚙️')).toBeInTheDocument();
      });

      it('should hide icon when showIcon is false', () => {
        render(<RoleBadge role="admin" showIcon={false} />);
        expect(screen.queryByText('⚙️')).not.toBeInTheDocument();
        expect(screen.getByText('ผู้ดูแล')).toBeInTheDocument();
      });

      it('should show icon when showIcon is true', () => {
        render(<RoleBadge role="editor" showIcon={true} />);
        expect(screen.getByText('✏️')).toBeInTheDocument();
      });
    });

    describe('Role Colors', () => {
      it('should apply purple color for admin', () => {
        const { container } = render(<RoleBadge role="admin" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-purple-300');
        expect(badge.className).toContain('bg-purple-900/30');
      });

      it('should apply blue color for editor', () => {
        const { container } = render(<RoleBadge role="editor" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-blue-300');
        expect(badge.className).toContain('bg-blue-900/30');
      });

      it('should apply gray color for viewer', () => {
        const { container } = render(<RoleBadge role="viewer" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-gray-300');
        expect(badge.className).toContain('bg-gray-700/30');
      });

      it('should apply yellow color for owner', () => {
        const { container } = render(<RoleBadge role="owner" />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('text-yellow-300');
        expect(badge.className).toContain('bg-yellow-900/30');
      });
    });

    describe('Unknown Roles', () => {
      it('should default to viewer config for unknown role', () => {
        render(<RoleBadge role="unknown" />);
        expect(screen.getByText('ดู')).toBeInTheDocument();
        expect(screen.getByText('👁️')).toBeInTheDocument();
      });
    });
  });

  describe('PermissionGuard', () => {
    describe('Owner Permissions', () => {
      it('should render children when owner has canEdit permission', () => {
        render(
          <PermissionGuard permission="canEdit" userRole="owner">
            <div>Edit Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Edit Content')).toBeInTheDocument();
      });

      it('should render children when owner has canDelete permission', () => {
        render(
          <PermissionGuard permission="canDelete" userRole="owner">
            <div>Delete Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Delete Content')).toBeInTheDocument();
      });

      it('should render children when owner has canManageTeam permission', () => {
        render(
          <PermissionGuard permission="canManageTeam" userRole="owner">
            <div>Manage Team</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Manage Team')).toBeInTheDocument();
      });

      it('should render children when owner has canManagePayments permission', () => {
        render(
          <PermissionGuard permission="canManagePayments" userRole="owner">
            <div>Manage Payments</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Manage Payments')).toBeInTheDocument();
      });
    });

    describe('Admin Permissions', () => {
      it('should render children when admin has canEdit permission', () => {
        render(
          <PermissionGuard permission="canEdit" userRole="admin">
            <div>Edit Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Edit Content')).toBeInTheDocument();
      });

      it('should render children when admin has canDelete permission', () => {
        render(
          <PermissionGuard permission="canDelete" userRole="admin">
            <div>Delete Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Delete Content')).toBeInTheDocument();
      });

      it('should render children when admin has canManageTeam permission', () => {
        render(
          <PermissionGuard permission="canManageTeam" userRole="admin">
            <div>Manage Team</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Manage Team')).toBeInTheDocument();
      });

      it('should render children when admin has canViewAnalytics permission', () => {
        render(
          <PermissionGuard permission="canViewAnalytics" userRole="admin">
            <div>View Analytics</div>
          </PermissionGuard>
        );
        expect(screen.getByText('View Analytics')).toBeInTheDocument();
      });
    });

    describe('Editor Permissions', () => {
      it('should render children when editor has canEdit permission', () => {
        render(
          <PermissionGuard permission="canEdit" userRole="editor">
            <div>Edit Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Edit Content')).toBeInTheDocument();
      });

      it('should render children when editor has canExport permission', () => {
        render(
          <PermissionGuard permission="canExport" userRole="editor">
            <div>Export Content</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Export Content')).toBeInTheDocument();
      });

      it('should render children when editor has canViewAnalytics permission', () => {
        render(
          <PermissionGuard permission="canViewAnalytics" userRole="editor">
            <div>View Analytics</div>
          </PermissionGuard>
        );
        expect(screen.getByText('View Analytics')).toBeInTheDocument();
      });

      it('should render fallback when editor lacks canDelete permission', () => {
        render(
          <PermissionGuard permission="canDelete" userRole="editor" fallback={<div>No Access</div>}>
            <div>Delete Content</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Delete Content')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });

      it('should render fallback when editor lacks canManageTeam permission', () => {
        render(
          <PermissionGuard permission="canManageTeam" userRole="editor" fallback={<div>No Access</div>}>
            <div>Manage Team</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Manage Team')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });

      it('should render fallback when editor lacks canManagePayments permission', () => {
        render(
          <PermissionGuard permission="canManagePayments" userRole="editor" fallback={<div>No Access</div>}>
            <div>Manage Payments</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Manage Payments')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });
    });

    describe('Viewer Permissions', () => {
      it('should render fallback when viewer lacks canEdit permission', () => {
        render(
          <PermissionGuard permission="canEdit" userRole="viewer" fallback={<div>No Access</div>}>
            <div>Edit Content</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Edit Content')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });

      it('should render fallback when viewer lacks canDelete permission', () => {
        render(
          <PermissionGuard permission="canDelete" userRole="viewer" fallback={<div>No Access</div>}>
            <div>Delete Content</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Delete Content')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });

      it('should render fallback when viewer lacks canExport permission', () => {
        render(
          <PermissionGuard permission="canExport" userRole="viewer" fallback={<div>No Access</div>}>
            <div>Export Content</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Export Content')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });

      it('should render fallback when viewer lacks canViewAnalytics permission', () => {
        render(
          <PermissionGuard permission="canViewAnalytics" userRole="viewer" fallback={<div>No Access</div>}>
            <div>View Analytics</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('View Analytics')).not.toBeInTheDocument();
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });
    });

    describe('Fallback Behavior', () => {
      it('should render null when no fallback provided and permission denied', () => {
        const { container } = render(
          <PermissionGuard permission="canEdit" userRole="viewer">
            <div>Edit Content</div>
          </PermissionGuard>
        );
        expect(screen.queryByText('Edit Content')).not.toBeInTheDocument();
        expect(container.textContent).toBe('');
      });

      it('should render custom fallback component', () => {
        render(
          <PermissionGuard 
            permission="canDelete" 
            userRole="viewer" 
            fallback={<button>Upgrade to delete</button>}
          >
            <div>Delete Content</div>
          </PermissionGuard>
        );
        expect(screen.getByRole('button', { name: 'Upgrade to delete' })).toBeInTheDocument();
      });
    });

    describe('All Permissions Coverage', () => {
      it('should handle canInvite permission', () => {
        render(
          <PermissionGuard permission="canInvite" userRole="admin">
            <div>Invite Member</div>
          </PermissionGuard>
        );
        expect(screen.getByText('Invite Member')).toBeInTheDocument();
      });

      it('should deny canInvite for viewer', () => {
        render(
          <PermissionGuard permission="canInvite" userRole="viewer" fallback={<div>No Access</div>}>
            <div>Invite Member</div>
          </PermissionGuard>
        );
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });
    });
  });
});
