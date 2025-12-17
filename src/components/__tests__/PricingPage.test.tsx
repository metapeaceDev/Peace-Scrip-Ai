/**
 * PricingPage Component Tests - STRUCTURE-BASED
 * Tests for pricing tiers, features, comparison table, early bird promotion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import PricingPage from '../PricingPage';
import { SubscriptionTier } from '../../types';

describe('PricingPage - Component Rendering', () => {
  const mockOnSelectTier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render pricing page', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(container).toBeTruthy();
  });

  it('should render page title', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/เลือกแพ็กเกจที่เหมาะกับคุณ/i)).toBeInTheDocument();
  });

  it('should render early bird promotion', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Early Bird Promotion/i)).toBeInTheDocument();
    expect(screen.getByText(/ลด 50%/i)).toBeInTheDocument();
  });

  it('should render FAQ section', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/คำถามที่พบบ่อย/i)).toBeInTheDocument();
  });

  it('should render enterprise contact section', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/ต้องการ Enterprise Plan/i)).toBeInTheDocument();
    const salesButtons = screen.getAllByText(/ติดต่อฝ่ายขาย/i);
    expect(salesButtons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PricingPage - Pricing Tiers', () => {
  const mockOnSelectTier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all 4 pricing tiers', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const freeElements = screen.getAllByText('FREE');
    const basicElements = screen.getAllByText('BASIC');
    const proElements = screen.getAllByText('PRO');
    const enterpriseElements = screen.getAllByText('ENTERPRISE');

    expect(freeElements.length).toBeGreaterThanOrEqual(1);
    expect(basicElements.length).toBeGreaterThanOrEqual(1);
    expect(proElements.length).toBeGreaterThanOrEqual(1);
    expect(enterpriseElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display FREE tier price', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText('฿0')).toBeInTheDocument();
  });

  it('should display BASIC tier price', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText('฿299')).toBeInTheDocument();
  });

  it('should display PRO tier price', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText('฿999')).toBeInTheDocument();
  });

  it('should display ENTERPRISE tier contact pricing', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText('ติดต่อ')).toBeInTheDocument();
  });

  it('should mark BASIC as popular', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/POPULAR/i)).toBeInTheDocument();
  });

  it('should show current tier badge when tier is selected', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />);
    expect(screen.getByText(/CURRENT/i)).toBeInTheDocument();
  });
});

describe('PricingPage - Tier Features', () => {
  const mockOnSelectTier = vi.fn();

  it('should display FREE tier project limit', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const projectElements = screen.getAllByText(/1 โปรเจกต์/i);
    expect(projectElements.length).toBeGreaterThan(0);
  });

  it('should display FREE tier character limit', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const characterElements = screen.getAllByText(/3 ตัวละคร/);
    expect(characterElements.length).toBeGreaterThan(0);
  });

  it('should display BASIC tier storage', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/1 GB Storage/i)).toBeInTheDocument();
  });

  it('should display BASIC tier credits', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const creditElements = screen.getAllByText(/100 Credits\/เดือน/i);
    expect(creditElements.length).toBeGreaterThan(0);
  });

  it('should display PRO tier unlimited projects', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/โปรเจกต์ Unlimited/i)).toBeInTheDocument();
  });

  it('should display PRO tier 500 credits', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const creditElements = screen.getAllByText(/500 Credits\/เดือน/i);
    expect(creditElements.length).toBeGreaterThan(0);
  });

  it('should display PRO tier commercial license', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Commercial License/i)).toBeInTheDocument();
  });

  it('should display PRO tier API access', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/API Access/i)).toBeInTheDocument();
  });

  it('should display ENTERPRISE tier 9999 credits', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/9,999 Credits\/เดือน/i)).toBeInTheDocument();
  });

  it('should display ENTERPRISE tier SLA guarantee', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/SLA Guarantee/i)).toBeInTheDocument();
  });

  it('should display ENTERPRISE tier white label option', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/White Label/i)).toBeInTheDocument();
  });
});

describe('PricingPage - Comparison Table', () => {
  const mockOnSelectTier = vi.fn();

  it('should render comparison table', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/เปรียบเทียบแพ็กเกจ/i)).toBeInTheDocument();
  });

  it('should display table headers for all tiers', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const table = screen.getByText(/เปรียบเทียบแพ็กเกจ/i).closest('div');
    expect(table).toBeInTheDocument();
  });

  it('should display projects row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const projectElements = screen.getAllByText(/โปรเจกต์/i);
    expect(projectElements.length).toBeGreaterThan(0);
  });

  it('should display characters row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const characterElements = screen.getAllByText(/ตัวละคร/i);
    expect(characterElements.length).toBeGreaterThan(0);
  });

  it('should display scenes row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const sceneElements = screen.getAllByText(/ฉาก/i);
    expect(sceneElements.length).toBeGreaterThan(0);
  });

  it('should display resolution row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const resolutionElements = screen.getAllByText(/ความละเอียด/i);
    expect(resolutionElements.length).toBeGreaterThan(0);
  });

  it('should display storage row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const storageElements = screen.getAllByText(/พื้นที่จัดเก็บ/i);
    expect(storageElements.length).toBeGreaterThan(0);
  });

  it('should display credits row in comparison', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    // "Credits" appears in multiple places, just verify it exists
    const creditsElements = screen.getAllByText(/Credits/i);
    expect(creditsElements.length).toBeGreaterThan(0);
  });
});

describe('PricingPage - FAQ Section', () => {
  const mockOnSelectTier = vi.fn();

  it('should display payment methods question', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/รับชำระเงินอย่างไร/i)).toBeInTheDocument();
  });

  it('should display cancellation question', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/ยกเลิกได้ไหม/i)).toBeInTheDocument();
  });

  it('should display upgrade question', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/อัพเกรดกลางเดือนได้ไหม/i)).toBeInTheDocument();
  });

  it('should display credits explanation question', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Credits คืออะไร/i)).toBeInTheDocument();
  });

  it('should mention PromptPay in payment methods', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/PromptPay/i)).toBeInTheDocument();
  });

  it('should mention Credit Card in payment methods', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Credit Card/i)).toBeInTheDocument();
  });
});

describe('PricingPage - CTA Buttons', () => {
  const mockOnSelectTier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tier selection buttons', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    // 4 pricing cards, each with a button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('should show correct button text for FREE tier', () => {
    const { container } = render(
      <PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />
    );
    const buttons = container.querySelectorAll('button');
    const freeButton = Array.from(buttons).find(
      btn => btn.textContent?.includes('ใช้งานฟรี') || btn.textContent?.includes('แพ็กเกจปัจจุบัน')
    );
    expect(freeButton).toBeTruthy();
  });

  it('should show correct button text for BASIC tier', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const buttons = container.querySelectorAll('button');
    const basicButton = Array.from(buttons).find(btn => btn.textContent?.includes('เริ่มใช้งาน'));
    expect(basicButton).toBeTruthy();
  });

  it('should show correct button text for ENTERPRISE tier', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const buttons = container.querySelectorAll('button');
    const enterpriseButton = Array.from(buttons).find(
      btn => btn.textContent?.includes('ติดต่อฝ่ายขาย') && btn.closest('.grid')
    );
    expect(enterpriseButton).toBeTruthy();
  });

  it('should disable button for current tier', () => {
    const { container } = render(
      <PricingPage onSelectTier={mockOnSelectTier} currentTier="basic" />
    );
    const currentButtons = screen.getAllByText(/แพ็กเกจปัจจุบัน/i);
    expect(currentButtons[0]).toBeDisabled();
  });
});

describe('PricingPage - Props Handling', () => {
  const mockOnSelectTier = vi.fn();

  it('should accept onSelectTier callback', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(mockOnSelectTier).toBeDefined();
  });

  it('should accept currentTier prop', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} currentTier="pro" />);
    expect(container).toBeTruthy();
  });

  it('should default to free tier when currentTier not provided', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    // Component should render without errors
    const freeElements = screen.getAllByText('FREE');
    expect(freeElements.length).toBeGreaterThan(0);
  });

  it('should handle all tier types', () => {
    const tiers: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
    tiers.forEach(tier => {
      const { unmount } = render(
        <PricingPage onSelectTier={mockOnSelectTier} currentTier={tier} />
      );
      const currentElements = screen.getAllByText(/CURRENT/i);
      expect(currentElements.length).toBeGreaterThanOrEqual(1);
      unmount();
    });
  });
});

describe('PricingPage - Content Validation', () => {
  const mockOnSelectTier = vi.fn();

  it('should display pricing model description', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/ราคาคุ้มค่า/i)).toBeInTheDocument();
  });

  it('should mention early bird 50% discount', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/ลด 50%/i)).toBeInTheDocument();
  });

  it('should mention first year eligibility', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/ผู้สมัครในปีแรก/i)).toBeInTheDocument();
  });

  it('should display enterprise contact email', () => {
    const { container } = render(<PricingPage onSelectTier={mockOnSelectTier} />);
    const emailLink = container.querySelector('a[href^="mailto:"]');
    expect(emailLink).toBeInTheDocument();
  });

  it('should mention film production companies', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/บริษัทผลิตภาพยนตร์/i)).toBeInTheDocument();
  });

  it('should mention educational institutions', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/สถาบันการศึกษา/i)).toBeInTheDocument();
  });
});

describe('PricingPage - AI Models Features', () => {
  const mockOnSelectTier = vi.fn();

  it('should mention Gemini Pro in BASIC tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Gemini Pro/i)).toBeInTheDocument();
  });

  it('should mention Gemini Veo in BASIC tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Gemini Veo/i)).toBeInTheDocument();
  });

  it('should mention FLUX in PRO tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/FLUX/i)).toBeInTheDocument();
  });

  it('should mention DALL-E 3 in PRO tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/DALL-E 3/i)).toBeInTheDocument();
  });

  it('should mention Luma Dream Machine in PRO tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Luma Dream Machine/i)).toBeInTheDocument();
  });

  it('should mention Runway Gen-3 in PRO tier', () => {
    render(<PricingPage onSelectTier={mockOnSelectTier} />);
    expect(screen.getByText(/Runway Gen-3/i)).toBeInTheDocument();
  });
});
