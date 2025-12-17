import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentTracker } from './PaymentTracker';
import type { TeamMember, Payment } from '../../types';
import * as firebase from 'firebase/firestore';

// Mock Firebase
vi.mock('../config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  orderBy: vi.fn(),
}));

describe('PaymentTracker', () => {
  const mockMembers: TeamMember[] = [
    {
      id: '1',
      name: 'สมชาย ใจดี',
      role: 'นักแสดง',
      email: 'somchai@example.com',
      share: 20,
    },
    {
      id: '2',
      name: 'สมหญิง สวยงาม',
      role: 'ผู้กำกับ',
      email: 'somying@example.com',
      share: 30,
    },
  ];

  const mockPayments: Payment[] = [
    {
      id: 'p1',
      memberId: '1',
      amount: 5000,
      method: 'bank_transfer',
      reference: 'TXN123456',
      notes: 'ค่าตัวงวดแรก',
      projectId: 'project1',
      status: 'completed',
      date: new Date('2024-01-15'),
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'p2',
      memberId: '2',
      amount: 10000,
      method: 'promptpay',
      reference: '',
      notes: '',
      projectId: 'project1',
      status: 'pending',
      date: new Date('2024-01-20'),
      createdAt: new Date('2024-01-20'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getDocs to return payments
    const mockSnapshot = {
      forEach: (callback: any) => {
        mockPayments.forEach((payment, index) => {
          callback({
            id: payment.id,
            data: () => ({
              ...payment,
              date: { toDate: () => payment.date },
            }),
          });
        });
      },
    };

    (firebase.getDocs as any).mockResolvedValue(mockSnapshot);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      (firebase.getDocs as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      // Check for spinning loader
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('should render component title', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });
    });

    it('should render add payment button', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });
    });

    it('should render payment history section', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('ประวัติการจ่ายเงิน')).toBeInTheDocument();
      });
    });
  });

  describe('Loading Payments', () => {
    it('should load payments on mount', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(firebase.getDocs).toHaveBeenCalled();
      });
    });

    it('should query payments for the correct project', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(firebase.where).toHaveBeenCalledWith('projectId', '==', 'project1');
      });
    });

    it('should order payments by date descending', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(firebase.orderBy).toHaveBeenCalledWith('date', 'desc');
      });
    });

    it('should display loaded payments', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
        expect(screen.getByText('สมหญิง สวยงาม')).toBeInTheDocument();
      });
    });

    it('should handle loading error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (firebase.getDocs as any).mockRejectedValue(new Error('Firebase error'));

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no payments', async () => {
      (firebase.getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('ยังไม่มีการบันทึกการจ่ายเงิน')).toBeInTheDocument();
      });
    });

    it('should show empty state instruction', async () => {
      (firebase.getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('คลิก "บันทึกการจ่ายเงิน" เพื่อเริ่มต้น')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Form', () => {
    it('should toggle form visibility when clicking add button', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      expect(screen.getByText('บันทึกการจ่ายเงินใหม่')).toBeInTheDocument();
    });

    it('should change button text when form is open', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      // Top button changes to ยกเลิก
      const buttons = screen.getAllByText('ยกเลิก');
      expect(buttons.length).toBeGreaterThan(0);
      expect(screen.queryByText('+ บันทึกการจ่ายเงิน')).not.toBeInTheDocument();
    });

    it('should render all form fields', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      // Use placeholder or role to find fields
      expect(screen.getByText(/สมาชิก \*/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByText(/วิธีการจ่ายเงิน \*/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('เลขที่ธุรกรรม / เลขที่เช็ค')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('รายละเอียดเพิ่มเติม...')).toBeInTheDocument();
    });

    it('should render member options in dropdown', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const memberSelect = selects[0] as HTMLSelectElement;
      expect(memberSelect.options.length).toBe(3); // placeholder + 2 members
      expect(memberSelect.options[1].text).toContain('สมชาย ใจดี');
      expect(memberSelect.options[2].text).toContain('สมหญิง สวยงาม');
    });

    it('should render payment method options', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const methodSelect = selects[1] as HTMLSelectElement;
      expect(methodSelect.options.length).toBe(5);
      expect(methodSelect.options[0].text).toBe('โอนผ่านธนาคาร');
      expect(methodSelect.options[1].text).toBe('พร้อมเพย์');
      expect(methodSelect.options[2].text).toBe('เงินสด');
      expect(methodSelect.options[3].text).toBe('เช็ค');
      expect(methodSelect.options[4].text).toBe('อื่นๆ');
    });
  });

  describe('Form Submission', () => {
    it('should submit valid payment', async () => {
      (firebase.addDoc as any).mockResolvedValue({ id: 'new-payment' });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      // Fill form using querySelectorAll
      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input[type="number"]');
      const textInputs = document.querySelectorAll('input[type="text"]');
      const textareas = document.querySelectorAll('textarea');

      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(inputs[0], { target: { value: '5000' } });
      fireEvent.change(selects[1], { target: { value: 'bank_transfer' } });
      fireEvent.change(textInputs[0], { target: { value: 'REF123' } });
      fireEvent.change(textareas[0], { target: { value: 'Test payment' } });

      // Get submit button (there are multiple with same text)
      const submitButtons = screen.getAllByText('บันทึกการจ่ายเงิน');
      fireEvent.click(submitButtons[submitButtons.length - 1]); // Last one is submit button

      await waitFor(() => {
        expect(firebase.addDoc).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      (firebase.addDoc as any).mockResolvedValue({ id: 'new-payment' });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input[type="number"]');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(inputs[0], { target: { value: '5000' } });

      const submitButtons = screen.getAllByText('บันทึกการจ่ายเงิน');
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText('บันทึกการจ่ายเงินใหม่')).not.toBeInTheDocument();
      });
    });

    it('should close form after successful submission', async () => {
      (firebase.addDoc as any).mockResolvedValue({ id: 'new-payment' });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input[type="number"]');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(inputs[0], { target: { value: '5000' } });

      const submitButtons = screen.getAllByText('บันทึกการจ่ายเงิน');
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });
    });

    it('should handle submission error', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      (firebase.addDoc as any).mockRejectedValue(new Error('Firebase error'));

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input[type="number"]');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(inputs[0], { target: { value: '5000' } });

      const submitButtons = screen.getAllByText('บันทึกการจ่ายเงิน');
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการบันทึกการจ่ายเงิน');
      });
    });

    it('should show loading state during submission', async () => {
      (firebase.addDoc as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'new' }), 100))
      );

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input[type="number"]');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(inputs[0], { target: { value: '5000' } });

      const submitButtons = screen.getAllByText('บันทึกการจ่ายเงิน');
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      expect(screen.getByText('กำลังบันทึก...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('กำลังบันทึก...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Payment Display', () => {
    it('should display payment amount in Thai currency format', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('฿5,000.00')).toBeInTheDocument();
        expect(screen.getByText('฿10,000.00')).toBeInTheDocument();
      });
    });

    it('should display payment method labels in Thai', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('โอนผ่านธนาคาร')).toBeInTheDocument();
        expect(screen.getByText('พร้อมเพย์')).toBeInTheDocument();
      });
    });

    it('should display payment status badges', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('สำเร็จ')).toBeInTheDocument();
        expect(screen.getByText('รอดำเนินการ')).toBeInTheDocument();
      });
    });

    it('should display payment dates in Thai format', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        const dateElements = screen.getAllByText(/มกราคม/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should display payment reference when available', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText(/TXN123456/)).toBeInTheDocument();
      });
    });

    it('should display payment notes when available', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText(/ค่าตัวงวดแรก/)).toBeInTheDocument();
      });
    });

    it('should display member name for each payment', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
        expect(screen.getByText('สมหญิง สวยงาม')).toBeInTheDocument();
      });
    });

    it('should display member role for each payment', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('นักแสดง')).toBeInTheDocument();
        expect(screen.getByText('ผู้กำกับ')).toBeInTheDocument();
      });
    });

    it('should handle unknown member gracefully', async () => {
      const paymentsWithUnknown = [
        {
          ...mockPayments[0],
          memberId: 'unknown-id',
        },
      ];

      (firebase.getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          paymentsWithUnknown.forEach(payment => {
            callback({
              id: payment.id,
              data: () => ({
                ...payment,
                date: { toDate: () => payment.date },
              }),
            });
          });
        },
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('Unknown')).toBeInTheDocument();
      });
    });
  });

  describe('Status Colors', () => {
    it('should apply green color for completed status', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        const completedBadge = screen.getByText('สำเร็จ');
        expect(completedBadge.className).toContain('bg-green-100');
        expect(completedBadge.className).toContain('text-green-800');
      });
    });

    it('should apply yellow color for pending status', async () => {
      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        const pendingBadge = screen.getByText('รอดำเนินการ');
        expect(pendingBadge.className).toContain('bg-yellow-100');
        expect(pendingBadge.className).toContain('text-yellow-800');
      });
    });

    it('should apply red color for failed status', async () => {
      const failedPayment = [
        {
          ...mockPayments[0],
          status: 'failed' as const,
        },
      ];

      (firebase.getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          failedPayment.forEach(payment => {
            callback({
              id: payment.id,
              data: () => ({
                ...payment,
                date: { toDate: () => payment.date },
              }),
            });
          });
        },
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        const failedBadge = screen.getByText('ล้มเหลว');
        expect(failedBadge.className).toContain('bg-red-100');
        expect(failedBadge.className).toContain('text-red-800');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty members array', async () => {
      render(<PaymentTracker members={[]} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('+ บันทึกการจ่ายเงิน')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ บันทึกการจ่ายเงิน'));

      const selects = document.querySelectorAll('select');
      const memberSelect = selects[0] as HTMLSelectElement;
      expect(memberSelect.options.length).toBe(1); // only placeholder
    });

    it('should handle large payment amounts', async () => {
      const largePayment = [
        {
          ...mockPayments[0],
          amount: 1000000,
        },
      ];

      (firebase.getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          largePayment.forEach(payment => {
            callback({
              id: payment.id,
              data: () => ({
                ...payment,
                date: { toDate: () => payment.date },
              }),
            });
          });
        },
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('฿1,000,000.00')).toBeInTheDocument();
      });
    });

    it('should handle decimal amounts', async () => {
      const decimalPayment = [
        {
          ...mockPayments[0],
          amount: 1234.56,
        },
      ];

      (firebase.getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          decimalPayment.forEach(payment => {
            callback({
              id: payment.id,
              data: () => ({
                ...payment,
                date: { toDate: () => payment.date },
              }),
            });
          });
        },
      });

      render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(screen.getByText('฿1,234.56')).toBeInTheDocument();
      });
    });

    it('should reload payments after project change', async () => {
      const { rerender } = render(<PaymentTracker members={mockMembers} projectId="project1" />);

      await waitFor(() => {
        expect(firebase.getDocs).toHaveBeenCalledTimes(1);
      });

      rerender(<PaymentTracker members={mockMembers} projectId="project2" />);

      await waitFor(() => {
        expect(firebase.getDocs).toHaveBeenCalledTimes(2);
      });
    });
  });
});
