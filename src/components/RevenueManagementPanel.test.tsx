import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RevenueManagementPanel } from './RevenueManagementPanel';
import type { TeamMember } from '../../types';

// Mock child components
vi.mock('./FinancialDashboard', () => ({
  FinancialDashboard: ({ members, projectId }: any) => (
    <div data-testid="financial-dashboard">
      Financial Dashboard - {projectId} - {members.length} members
    </div>
  ),
}));

vi.mock('./PaymentTracker', () => ({
  PaymentTracker: ({ members, projectId }: any) => (
    <div data-testid="payment-tracker">
      Payment Tracker - {projectId} - {members.length} members
    </div>
  ),
}));

vi.mock('./ContractManager', () => ({
  ContractManager: ({ projectId }: any) => (
    <div data-testid="contract-manager">Contract Manager - {projectId}</div>
  ),
}));

vi.mock('./CreditsExporter', () => ({
  CreditsExporter: ({ members, projectTitle }: any) => (
    <div data-testid="credits-exporter">
      Credits Exporter - {projectTitle} - {members.length} members
    </div>
  ),
}));

describe('RevenueManagementPanel', () => {
  const mockMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Alice',
      role: 'writer',
      revenueShare: 5000,
      email: 'alice@example.com',
    },
    {
      id: '2',
      name: 'Bob',
      role: 'editor',
      revenueShare: 3000,
      email: 'bob@example.com',
    },
    {
      id: '3',
      name: 'Charlie',
      role: 'designer',
      revenueShare: 2000,
      email: 'charlie@example.com',
    },
  ];

  const defaultProps = {
    members: mockMembers,
    projectId: 'project-123',
    projectTitle: 'Test Project',
  };

  describe('Component Rendering', () => {
    it('should render component', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByText('จัดการรายได้')).toBeInTheDocument();
    });

    it('should render project title', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should render all 4 tabs', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBe(4);
      expect(screen.getByText('ภาพรวม')).toBeInTheDocument();
      expect(screen.getAllByText('เครดิต')[0]).toBeInTheDocument();
    });

    it('should show dashboard tab as active by default', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const dashboardTab = screen.getByText('ภาพรวม').closest('button');
      expect(dashboardTab).toHaveClass('border-blue-600', 'text-blue-600');
    });

    it('should switch to payments tab when clicked', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const paymentsTab = screen.getAllByText('การจ่ายเงิน')[0];
      fireEvent.click(paymentsTab);
      expect(screen.getByTestId('payment-tracker')).toBeInTheDocument();
    });

    it('should switch to contracts tab when clicked', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const contractsTab = screen.getAllByText('สัญญา')[0];
      fireEvent.click(contractsTab);
      expect(screen.getByTestId('contract-manager')).toBeInTheDocument();
    });

    it('should switch to credits tab when clicked', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const creditsTab = screen.getAllByText('เครดิต')[0];
      fireEvent.click(creditsTab);
      expect(screen.getByTestId('credits-exporter')).toBeInTheDocument();
    });

    it('should update active tab styling when switched', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const paymentsTab = screen.getAllByText('การจ่ายเงิน')[0].closest('button');
      fireEvent.click(paymentsTab!);
      expect(paymentsTab).toHaveClass('border-blue-600', 'text-blue-600');
    });
  });

  describe('Tab Content', () => {
    it('should render FinancialDashboard by default', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByTestId('financial-dashboard')).toBeInTheDocument();
    });

    it('should pass correct props to FinancialDashboard', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByText(/Financial Dashboard - project-123 - 3 members/)).toBeInTheDocument();
    });

    it('should pass correct props to PaymentTracker', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      fireEvent.click(screen.getAllByText('การจ่ายเงิน')[0]);
      expect(screen.getByText(/Payment Tracker - project-123 - 3 members/)).toBeInTheDocument();
    });

    it('should pass correct props to ContractManager', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      fireEvent.click(screen.getAllByText('สัญญา')[0]);
      expect(screen.getByText(/Contract Manager - project-123/)).toBeInTheDocument();
    });

    it('should pass correct props to CreditsExporter', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      fireEvent.click(screen.getAllByText('เครดิต')[0]);
      expect(screen.getByText(/Credits Exporter - Test Project - 3 members/)).toBeInTheDocument();
    });
  });

  describe('Quick Stats Bar', () => {
    it('should display team members count', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByText('สมาชิกทีม')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display total revenue', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      expect(screen.getByText('รายได้ทั้งหมด')).toBeInTheDocument();
      expect(screen.getByText('฿10,000')).toBeInTheDocument();
    });

    it('should calculate revenue correctly', () => {
      const customMembers: TeamMember[] = [
        { id: '1', name: 'A', role: 'writer', revenueShare: 1500, email: 'a@test.com' },
        { id: '2', name: 'B', role: 'editor', revenueShare: 2500, email: 'b@test.com' },
      ];
      render(<RevenueManagementPanel {...defaultProps} members={customMembers} />);
      expect(screen.getByText('฿4,000')).toBeInTheDocument();
    });

    it('should display contracts stat card', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const elements = screen.getAllByText('สัญญา');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display payments stat card', () => {
      render(<RevenueManagementPanel {...defaultProps} />);
      const elements = screen.getAllByText('การจ่ายเงิน');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Tab Icons', () => {
    it('should render dashboard icon', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should render all tab icons', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      // Each tab has an icon + 4 quick stats icons = 8 SVGs
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(4);
    });
  });

  describe('Layout', () => {
    it('should have gray background', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-gray-50', 'min-h-screen');
    });

    it('should have max-width container', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      const maxWidthContainer = container.querySelector('.max-w-7xl');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('should have white tab panel', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      const tabPanel = container.querySelector('.bg-white.rounded-lg.shadow');
      expect(tabPanel).toBeInTheDocument();
    });

    it('should have grid layout for stats', () => {
      const { container } = render(<RevenueManagementPanel {...defaultProps} />);
      const statsGrid = container.querySelector('.grid.grid-cols-1');
      expect(statsGrid).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should handle empty members array', () => {
      render(<RevenueManagementPanel {...defaultProps} members={[]} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('฿0')).toBeInTheDocument();
    });

    it('should handle members without revenueShare', () => {
      const membersWithoutRevenue: TeamMember[] = [
        { id: '1', name: 'A', role: 'writer', email: 'a@test.com' },
      ];
      render(<RevenueManagementPanel {...defaultProps} members={membersWithoutRevenue} />);
      expect(screen.getByText('฿0')).toBeInTheDocument();
    });

    it('should display correct project ID in components', () => {
      render(<RevenueManagementPanel {...defaultProps} projectId="custom-project-456" />);
      expect(screen.getByText(/custom-project-456/)).toBeInTheDocument();
    });
  });
});
