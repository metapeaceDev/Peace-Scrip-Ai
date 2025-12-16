import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ReferralDashboard } from './ReferralDashboard';

// Mock referral service
const mockGetUserReferralStats = vi.fn();
const mockGenerateReferralLink = vi.fn();
const mockCreateCustomReferralCode = vi.fn();

vi.mock('../services/referralService', () => ({
  getUserReferralStats: (...args: any[]) => mockGetUserReferralStats(...args),
  generateReferralLink: (...args: any[]) => mockGenerateReferralLink(...args),
  createCustomReferralCode: (...args: any[]) => mockCreateCustomReferralCode(...args)
}));

describe('ReferralDashboard', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetUserReferralStats.mockReturnValue({
      code: 'PEACE123',
      totalReferrals: 15,
      successfulReferrals: 12,
      creditsEarned: 600,
      recentReferrals: [
        {
          userId: 'user12345678',
          timestamp: new Date('2024-01-15'),
          creditsAwarded: 50
        },
        {
          userId: 'user87654321',
          timestamp: new Date('2024-01-10'),
          creditsAwarded: 50
        }
      ]
    });

    mockGenerateReferralLink.mockImplementation((code: string, source: string) => {
      if (source === 'copy') return `https://peacescript.ai/ref/${code}`;
      if (source === 'social') return `https://twitter.com/intent/tweet?text=Join code ${code}`;
      if (source === 'email') return `mailto:?subject=Try Peace Script&body=Use code ${code}`;
      return '';
    });

    mockCreateCustomReferralCode.mockReturnValue({
      success: true,
      code: { code: 'CUSTOM2024', userId: mockUserId }
    });

    // Mock window methods
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      }
    });
    window.open = vi.fn();
    delete (window as any).location;
    (window as any).location = { href: '', reload: vi.fn() };
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the component', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/Referral Program/)).toBeInTheDocument();
    });

    it('should display program description', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/แนะนำเพื่อน รับ 50 credits/)).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should display total referrals', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText(/คนที่คุณแนะนำ/)).toBeInTheDocument();
    });

    it('should display successful referrals', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/ลงทะเบียนสำเร็จ/)).toBeInTheDocument();
    });

    it('should display credits earned', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText('600')).toBeInTheDocument();
      expect(screen.getByText(/credits ที่ได้รับ/)).toBeInTheDocument();
    });
  });

  describe('Referral Code', () => {
    it('should display referral code', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText('PEACE123')).toBeInTheDocument();
    });

    it('should display referral link', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByDisplayValue(/https:\/\/peacescript\.ai\/ref\/PEACE123/)).toBeInTheDocument();
    });
  });

  describe('Copy Link', () => {
    it('should display copy button', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/Copy Link/)).toBeInTheDocument();
    });
  });

  describe('Social Sharing', () => {
    it('should open Twitter share', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const twitterButton = screen.getByText(/Share on Twitter/);
      
      fireEvent.click(twitterButton);
      
      expect(window.open).toHaveBeenCalled();
    });

    it('should set href for email share', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const emailButton = screen.getByText(/Share via Email/);
      
      fireEvent.click(emailButton);
      
      expect(window.location.href).toContain('mailto:');
    });
  });

  describe('Custom Code Creation', () => {
    it('should display custom code input', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByPlaceholderText(/PEACE2024/)).toBeInTheDocument();
    });

    it('should convert input to uppercase', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const input = screen.getByPlaceholderText(/PEACE2024/) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(input.value).toBe('TEST');
    });

    it('should show error for short code', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const button = screen.getByText('สร้างรหัส');
      
      fireEvent.click(button);
      
      expect(screen.getByText(/รหัสต้องมีอย่างน้อย 4 ตัวอักษร/)).toBeInTheDocument();
    });

    it('should create custom code successfully', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const input = screen.getByPlaceholderText(/PEACE2024/);
      const button = screen.getByText('สร้างรหัส');
      
      fireEvent.change(input, { target: { value: 'CUSTOM' } });
      fireEvent.click(button);
      
      expect(mockCreateCustomReferralCode).toHaveBeenCalledWith(mockUserId, 'CUSTOM');
    });

    it('should show success message', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const input = screen.getByPlaceholderText(/PEACE2024/);
      const button = screen.getByText('สร้างรหัส');
      
      fireEvent.change(input, { target: { value: 'CUSTOM2024' } });
      fireEvent.click(button);
      
      expect(screen.getByText(/สร้างรหัส CUSTOM2024 สำเร็จ/)).toBeInTheDocument();
    });
  });

  describe('How It Works', () => {
    it('should display all 3 steps', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/แชร์รหัสของคุณ/)).toBeInTheDocument();
      expect(screen.getByText(/เพื่อนลงทะเบียน/)).toBeInTheDocument();
      expect(screen.getByText(/คุณได้รับ Credits/)).toBeInTheDocument();
    });
  });

  describe('Recent Referrals', () => {
    it('should display recent referrals section', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/Referrals ล่าสุด/)).toBeInTheDocument();
    });

    it('should display user IDs', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      // User ID is truncated in display
      const userElements = screen.getAllByText(/User/);
      expect(userElements.length).toBeGreaterThan(0);
    });

    it('should display credits awarded', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      const creditsElements = screen.getAllByText(/\+50 credits/);
      expect(creditsElements).toHaveLength(2);
    });
  });

  describe('Tips Section', () => {
    it('should display tips heading', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/เคล็ดลับเพื่อเพิ่ม Referrals/)).toBeInTheDocument();
    });

    it('should display tips', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(screen.getByText(/แชร์ผลงานที่คุณสร้างด้วย Peace Script/)).toBeInTheDocument();
    });
  });

  describe('Service Integration', () => {
    it('should call getUserReferralStats', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(mockGetUserReferralStats).toHaveBeenCalledWith(mockUserId);
    });

    it('should call generateReferralLink', () => {
      render(<ReferralDashboard userId={mockUserId} />);
      expect(mockGenerateReferralLink).toHaveBeenCalledWith('PEACE123', 'copy');
    });
  });
});
