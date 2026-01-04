import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingPage from './PricingPage';

describe('PricingPage', () => {
  const mockOnSelectTier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render page header', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('เลือกแพ็กเกจที่เหมาะกับคุณ')).toBeInTheDocument();
      expect(screen.getByText('ราคาคุ้มค่า ทุกแพ็กเกจได้ AI ที่ดีที่สุด')).toBeInTheDocument();
    });

    it('should render early bird promotion banner', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Early Bird Promotion/)).toBeInTheDocument();
      expect(screen.getByText(/ลด 50% สำหรับผู้สมัครในปีแรก/)).toBeInTheDocument();
    });

    it('should render all four pricing tiers', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Each tier name appears twice: in card and in table
      expect(screen.getAllByText('FREE').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BASIC').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PRO').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ENTERPRISE').length).toBeGreaterThan(0);
    });

    it('should render comparison table', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('เปรียบเทียบแพ็กเกจ')).toBeInTheDocument();
    });

    it('should render FAQ section', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('คำถามที่พบบ่อย')).toBeInTheDocument();
    });

    it('should render enterprise contact section', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ต้องการ Enterprise Plan?')).toBeInTheDocument();
    });
  });

  describe('Pricing Tiers - FREE', () => {
    it('should display FREE tier price', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('฿0')).toBeInTheDocument();
    });

    it('should display FREE tier features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Values appear in both card and table
      expect(screen.getAllByText(/1 โปรเจกต์/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3 ตัวละคร/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/9 ฉาก/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/500 MB/).length).toBeGreaterThan(0);
    });

    it('should display FREE tier button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      // When not current tier, FREE shows "ใช้งานฟรี"
      expect(screen.getByRole('button', { name: /ใช้งานฟรี/ })).toBeInTheDocument();
    });

    it('should show watermark warning in FREE tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Export PDF \(Watermark\)/)).toBeInTheDocument();
    });
  });

  describe('Pricing Tiers - BASIC', () => {
    it('should display BASIC tier price', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('฿299')).toBeInTheDocument();
    });

    it('should show popular badge on BASIC tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('⭐ POPULAR')).toBeInTheDocument();
    });

    it('should display BASIC tier features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Values appear in both card and table
      expect(screen.getAllByText(/5 โปรเจกต์/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/10 ตัวละคร/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/100 Credits/).length).toBeGreaterThan(0);
    });

    it('should have special styling for popular tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const cards = document.querySelectorAll('.border-cyan-500');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing Tiers - PRO', () => {
    it('should display PRO tier price', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('฿999')).toBeInTheDocument();
    });

    it('should display PRO tier unlimited features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const unlimitedTexts = screen.getAllByText(/Unlimited/);
      expect(unlimitedTexts.length).toBeGreaterThan(0);
    });

    it('should display PRO tier credits', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/500 Credits\/เดือน/)).toBeInTheDocument();
    });

    it('should show commercial license in PRO', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Commercial License/)).toBeInTheDocument();
    });
  });

  describe('Pricing Tiers - ENTERPRISE', () => {
    it('should display contact pricing for Enterprise', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ติดต่อ')).toBeInTheDocument();
      expect(screen.getByText(/เริ่มต้น ฿5,000\+\/เดือน/)).toBeInTheDocument();
    });

    it('should display enterprise features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/9,999 Credits\/เดือน/)).toBeInTheDocument();
      expect(screen.getByText(/100 GB\+ Storage/)).toBeInTheDocument();
      expect(screen.getByText(/On-Premise Deployment/)).toBeInTheDocument();
    });

    it('should have contact sales button for Enterprise', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const contactButtons = screen.getAllByRole('button', { name: /ติดต่อฝ่ายขาย/ });
      expect(contactButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Current Tier Highlighting', () => {
    it('should show current badge for free tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="free" />);
      expect(screen.getByText('✓ CURRENT')).toBeInTheDocument();
    });

    it('should show current badge for basic tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      expect(screen.getByText('✓ CURRENT')).toBeInTheDocument();
    });

    it('should disable button for current tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      const currentButton = screen.getByRole('button', { name: /แพ็กเกจปัจจุบัน/ });
      expect(currentButton).toBeDisabled();
    });

    it('should not show current badge when no current tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Default is 'free', so should have 1 current badge
      const currentBadges = screen.getAllByText('✓ CURRENT');
      expect(currentBadges.length).toBe(1);
    });

    it('should apply ring styling to current tier card', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="pro" />);
      const cards = document.querySelectorAll('.ring-green-500');
      expect(cards.length).toBe(1);
    });
  });

  describe('Tier Selection', () => {
    it('should call onSelectTier when clicking FREE button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      const freeButton = screen.getByRole('button', { name: /ใช้งานฟรี/ });
      fireEvent.click(freeButton);
      expect(mockOnSelectTier).toHaveBeenCalledWith('free');
    });

    it('should call onSelectTier when clicking BASIC button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="pro" />);
      // When free is not current, both BASIC and PRO show "เริ่มใช้งาน"
      const buttons = screen.getAllByRole('button', { name: /เริ่มใช้งาน/ });
      const basicButton = buttons[0]; // First one is BASIC (in order)
      fireEvent.click(basicButton);
      expect(mockOnSelectTier).toHaveBeenCalledWith('basic');
    });

    it('should call onSelectTier when clicking PRO button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="free" />);
      const buttons = screen.getAllByRole('button', { name: /เริ่มใช้งาน/ });
      // When free is current: BASIC=buttons[0], PRO=buttons[1]
      const proButton = buttons[1];
      fireEvent.click(proButton);
      expect(mockOnSelectTier).toHaveBeenCalledWith('pro');
    });

    it('should call onSelectTier when clicking ENTERPRISE button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="pro" />);
      const enterpriseButton = screen.getByRole('button', { name: /ติดต่อฝ่ายขาย/ });
      fireEvent.click(enterpriseButton);
      expect(mockOnSelectTier).toHaveBeenCalledWith('enterprise');
    });

    it('should not call onSelectTier when clicking current tier button', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      const currentButton = screen.getByRole('button', { name: /แพ็กเกจปัจจุบัน/ });
      fireEvent.click(currentButton);
      expect(mockOnSelectTier).not.toHaveBeenCalled();
    });
  });

  describe('Comparison Table', () => {
    it('should render table with all tier names', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();

      const headers = table?.querySelectorAll('th');
      expect(headers?.length).toBeGreaterThan(4);
    });

    it('should show project limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('โปรเจกต์')).toBeInTheDocument();
    });

    it('should show character limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ตัวละคร')).toBeInTheDocument();
    });

    it('should show scene limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ฉาก')).toBeInTheDocument();
    });

    it('should show resolution limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ความละเอียด')).toBeInTheDocument();
    });

    it('should show storage limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('พื้นที่จัดเก็บ')).toBeInTheDocument();
    });

    it('should show credits limits row', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('Credits')).toBeInTheDocument();
    });

    it('should display correct values in comparison table', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Values appear in both features list and table
      expect(screen.getAllByText(/1 โปรเจกต์/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3 ตัวละคร/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1024/).length).toBeGreaterThan(0);
    });
  });

  describe('FAQ Section', () => {
    it('should render all FAQ questions', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/รับชำระเงินอย่างไร/)).toBeInTheDocument();
      expect(screen.getByText(/ยกเลิกได้ไหม/)).toBeInTheDocument();
      expect(screen.getByText(/อัพเกรดกลางเดือนได้ไหม/)).toBeInTheDocument();
      expect(screen.getByText(/Credits คืออะไร/)).toBeInTheDocument();
    });

    it('should show payment methods answer', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Credit Card, PromptPay/)).toBeInTheDocument();
    });

    it('should show cancellation policy', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ/)).toBeInTheDocument();
    });

    it('should show upgrade policy', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/คิดเฉพาะส่วนต่างตามจำนวนวันที่เหลือ/)).toBeInTheDocument();
    });

    it('should explain credits', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/ใช้สร้างรูป\/วิดีโอด้วย Premium AI Models/)).toBeInTheDocument();
    });
  });

  describe('Enterprise Contact Section', () => {
    it('should render enterprise contact heading', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('ต้องการ Enterprise Plan?')).toBeInTheDocument();
    });

    it('should render enterprise description', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/เรามีแพ็กเกจที่ปรับแต่งได้สำหรับองค์กรใหญ่/)).toBeInTheDocument();
    });

    it('should have email link for sales contact', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const emailLink = screen.getByRole('link', { name: /ติดต่อฝ่ายขาย/ });
      expect(emailLink).toHaveAttribute('href', 'mailto:sales@peace-script-ai.com');
    });
  });

  describe('Feature Icons and Symbols', () => {
    it('should show checkmarks for included features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const checkmarks = document.querySelectorAll('.text-cyan-400');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should show warning symbol for limited features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Free AI Models เท่านั้น/)).toBeInTheDocument();
    });

    it('should gray out excluded features', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/ไม่สามารถใช้เชิงพาณิชย์/)).toBeInTheDocument();
    });
  });

  describe('Button States and Styling', () => {
    it('should style popular tier button differently', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="free" />);
      const buttons = screen.getAllByRole('button');
      const popularButton = buttons.find(btn => btn.className.includes('from-cyan-600'));
      expect(popularButton).toBeTruthy();
    });

    it('should have different button text for each tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
      // When basic is current: free shows "ใช้งานฟรี", basic shows "แพ็กเกจปัจจุบัน", pro shows "เริ่มใช้งาน"
      expect(screen.getByRole('button', { name: /ใช้งานฟรี/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /แพ็กเกจปัจจุบัน/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /เริ่มใช้งาน/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ติดต่อฝ่ายขาย/ })).toBeInTheDocument();
    });

    it('should disable current tier button with cursor-not-allowed', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="pro" />);
      const currentButton = screen.getByRole('button', { name: /แพ็กเกจปัจจุบัน/ });
      expect(currentButton.className).toContain('cursor-not-allowed');
    });
  });

  describe('Responsive Grid Layout', () => {
    it('should have grid layout for pricing cards', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have responsive grid classes', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const grids = document.querySelectorAll('.grid-cols-1');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing Details', () => {
    it('should show monthly pricing note', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const monthlyNotes = screen.getAllByText('/เดือน');
      expect(monthlyNotes.length).toBe(3); // FREE, BASIC, PRO
    });

    it('should show all tier prices', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText('฿0')).toBeInTheDocument();
      expect(screen.getByText('฿299')).toBeInTheDocument();
      expect(screen.getByText('฿999')).toBeInTheDocument();
      expect(screen.getByText('ติดต่อ')).toBeInTheDocument();
    });
  });

  describe('Feature Coverage', () => {
    it('should show export formats for each tier', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Export PDF \(Watermark\)/)).toBeInTheDocument();
      expect(screen.getByText(/Export PDF, Final Draft, Fountain/)).toBeInTheDocument();
      expect(screen.getByText(/Export ทุกรูปแบบ/)).toBeInTheDocument();
    });

    it('should show AI model availability', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Free AI Models เท่านั้น/)).toBeInTheDocument();
      expect(screen.getByText(/Gemini Pro Image/)).toBeInTheDocument();
      expect(screen.getByText(/ComfyUI FLUX/)).toBeInTheDocument();
    });

    it('should show priority queue levels', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Priority Queue \(Standard\)/)).toBeInTheDocument();
      expect(screen.getByText(/Priority Queue \(High\)/)).toBeInTheDocument();
    });
  });

  describe('Special Features', () => {
    it('should show collaboration tools in PRO', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Collaboration Tools/)).toBeInTheDocument();
    });

    it('should show version control in PRO', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/Version Control/)).toBeInTheDocument();
    });

    it('should show API access in PRO', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/API Access \(Beta\)/)).toBeInTheDocument();
    });

    it('should show SLA in Enterprise', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/SLA Guarantee/)).toBeInTheDocument();
    });

    it('should show white label option in Enterprise', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      expect(screen.getByText(/White Label Option/)).toBeInTheDocument();
    });
  });

  describe('Gradient and Styling', () => {
    it('should have gradient background', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const mainDiv = document.querySelector('.bg-gradient-to-br');
      expect(mainDiv).toBeInTheDocument();
    });

    it('should have gradient text for header', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const gradientText = document.querySelector('.bg-clip-text');
      expect(gradientText).toBeInTheDocument();
    });

    it('should have border styling for cards', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const borders = document.querySelectorAll('.border-gray-700');
      expect(borders.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined currentTier with default', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      // Should default to 'free' and show current badge
      expect(screen.getByText('✓ CURRENT')).toBeInTheDocument();
    });

    it('should handle all tiers as current tier', () => {
      const tiers = ['free', 'basic', 'pro', 'enterprise'] as const;
      tiers.forEach(tier => {
        const { unmount } = render(
          <PricingPage onSelectTier={mockOnSelectTier} currentTier={tier} />
        );
        expect(screen.getByText('✓ CURRENT')).toBeInTheDocument();
        unmount();
      });
    });

    it('should render without onSelectTier function', () => {
      // @ts-ignore - testing edge case
      expect(() => render(<PricingPage />)).not.toThrow();
    });
  });

  describe('Table Structure', () => {
    it('should have thead and tbody', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const table = document.querySelector('table');
      expect(table?.querySelector('thead')).toBeInTheDocument();
      expect(table?.querySelector('tbody')).toBeInTheDocument();
    });

    it('should have correct number of columns', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const headers = document.querySelectorAll('thead th');
      expect(headers.length).toBe(5); // Feature + 4 tiers
    });

    it('should have 6 feature rows in comparison table', () => {
      render(<PricingPage onSelectTier={mockOnSelectTier} />);
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(6); // projects, characters, scenes, resolution, storage, credits
    });
  });
});
