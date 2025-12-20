import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PaymentSuccess from '../PaymentSuccess';

describe('PaymentSuccess - Component Rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render PaymentSuccess component', () => {
    const { container } = render(<PaymentSuccess />);
    expect(container).toBeTruthy();
  });

  it('should display success icon', () => {
    const { container } = render(<PaymentSuccess />);
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should display success message header', () => {
    render(<PaymentSuccess />);
    const successHeaders = screen.getAllByText(/ชำระเงินสำเร็จ/i);
    expect(successHeaders.length).toBeGreaterThan(0);
  });

  it('should display thank you message', () => {
    render(<PaymentSuccess />);
    const thankYouTexts = screen.getAllByText(/ขอบคุณสำหรับการสมัครสมาชิก/i);
    expect(thankYouTexts.length).toBeGreaterThan(0);
  });

  it('should display upgrade confirmation', () => {
    render(<PaymentSuccess />);
    const confirmationTexts = screen.getAllByText(/บัญชีของคุณได้รับการอัพเกรด/i);
    expect(confirmationTexts.length).toBeGreaterThan(0);
  });

  it('should display features unlocked section', () => {
    render(<PaymentSuccess />);
    const featureHeaders = screen.getAllByText(/คุณสมบัติที่ปลดล็อก/i);
    expect(featureHeaders.length).toBeGreaterThan(0);
  });

  it('should display continue button', () => {
    render(<PaymentSuccess />);
    const continueButtons = screen.getAllByText(/เริ่มสร้างสรรค์เลย/i);
    expect(continueButtons.length).toBeGreaterThan(0);
  });

  it('should display countdown timer', () => {
    render(<PaymentSuccess />);
    const countdownTexts = screen.getAllByText(/กลับไปหน้าหลักใน/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });

  it('should display support contact information', () => {
    render(<PaymentSuccess />);
    const supportTexts = screen.getAllByText(/หากมีคำถามหรือต้องการความช่วยเหลือ/i);
    expect(supportTexts.length).toBeGreaterThan(0);
  });

  it('should display email contact link', () => {
    const { container } = render(<PaymentSuccess />);
    const emailLinks = container.querySelectorAll('a[href^="mailto:"]');
    expect(emailLinks.length).toBeGreaterThan(0);
  });
});

describe('PaymentSuccess - Unlocked Features', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should display AI models feature', () => {
    render(<PaymentSuccess />);
    const aiFeatures = screen.getAllByText(/AI Models ขั้นสูง/i);
    expect(aiFeatures.length).toBeGreaterThan(0);
  });

  it('should display unlimited creation feature', () => {
    render(<PaymentSuccess />);
    const unlimitedFeatures = screen.getAllByText(/สร้างภาพและวิดีโอไม่จำกัด/i);
    expect(unlimitedFeatures.length).toBeGreaterThan(0);
  });

  it('should display team members feature', () => {
    render(<PaymentSuccess />);
    const teamFeatures = screen.getAllByText(/เพิ่มสมาชิกในทีม/i);
    expect(teamFeatures.length).toBeGreaterThan(0);
  });

  it('should display priority support feature', () => {
    render(<PaymentSuccess />);
    const supportFeatures = screen.getAllByText(/Priority Support/i);
    expect(supportFeatures.length).toBeGreaterThan(0);
  });

  it('should display all feature checkmarks', () => {
    render(<PaymentSuccess />);
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBeGreaterThanOrEqual(4);
  });
});

describe('PaymentSuccess - Countdown Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should start countdown at 5 seconds', () => {
    render(<PaymentSuccess />);
    const countdownTexts = screen.getAllByText(/5 วินาที/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });

  it('should decrease countdown after 1 second', () => {
    render(<PaymentSuccess />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const countdownTexts = screen.getAllByText(/4 วินาที/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });

  it('should decrease countdown to 3 seconds', () => {
    render(<PaymentSuccess />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const countdownTexts = screen.getAllByText(/3 วินาที/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });

  it('should decrease countdown to 2 seconds', () => {
    render(<PaymentSuccess />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const countdownTexts = screen.getAllByText(/2 วินาที/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });

  it('should decrease countdown to 1 second', () => {
    render(<PaymentSuccess />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const countdownTexts = screen.getAllByText(/1 วินาที/i);
    expect(countdownTexts.length).toBeGreaterThan(0);
  });
});

describe('PaymentSuccess - User Interaction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should call onContinue when button is clicked', () => {
    const mockOnContinue = vi.fn();
    render(<PaymentSuccess onContinue={mockOnContinue} />);

    const continueButton = screen.getByText(/เริ่มสร้างสรรค์เลย/i);
    fireEvent.click(continueButton);

    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('should redirect to home if no onContinue provided', () => {
    render(<PaymentSuccess />);

    const continueButton = screen.getByText(/เริ่มสร้างสรรค์เลย/i);
    fireEvent.click(continueButton);

    expect(window.location.href).toBe('/');
  });

  it('should have clickable email link', () => {
    const { container } = render(<PaymentSuccess />);
    const emailLink = container.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;

    expect(emailLink).toBeTruthy();
    expect(emailLink?.href).toContain('metapeaceofficial@gmail.com');
  });
});

describe('PaymentSuccess - Auto Redirect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should auto redirect after 5 seconds when no callback', () => {
    render(<PaymentSuccess />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(window.location.href).toBe('/');
  });

  it('should call onContinue after countdown when provided', () => {
    const mockOnContinue = vi.fn();
    render(<PaymentSuccess onContinue={mockOnContinue} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('should not redirect before countdown ends', () => {
    render(<PaymentSuccess />);

    vi.advanceTimersByTime(3000);

    expect(window.location.href).not.toBe('/');
  });
});

describe('PaymentSuccess - Props Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should accept onContinue callback prop', () => {
    const mockOnContinue = vi.fn();
    const { container } = render(<PaymentSuccess onContinue={mockOnContinue} />);
    expect(container).toBeTruthy();
  });

  it('should work without onContinue prop', () => {
    const { container } = render(<PaymentSuccess />);
    expect(container).toBeTruthy();
  });
});

describe('PaymentSuccess - Visual Elements', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should have gradient background', () => {
    const { container } = render(<PaymentSuccess />);
    const backgroundDiv = container.querySelector('.bg-gradient-to-br');
    expect(backgroundDiv).toBeTruthy();
  });

  it('should display success icon with animation', () => {
    const { container } = render(<PaymentSuccess />);
    const animatedIcon = container.querySelector('.animate-bounce');
    expect(animatedIcon).toBeTruthy();
  });

  it('should have green themed elements', () => {
    const { container } = render(<PaymentSuccess />);
    const greenElements = container.querySelectorAll('[class*="green"]');
    expect(greenElements.length).toBeGreaterThan(0);
  });

  it('should have bordered card container', () => {
    const { container } = render(<PaymentSuccess />);
    const borderedCard = container.querySelector('.border-green-500\\/50');
    expect(borderedCard).toBeTruthy();
  });

  it('should display features in a list format', () => {
    const { container } = render(<PaymentSuccess />);
    const featuresList = container.querySelector('ul');
    expect(featuresList).toBeTruthy();
  });
});

describe('PaymentSuccess - Accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should have clickable button with proper styling', () => {
    const { container } = render(<PaymentSuccess />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should display contact email as clickable link', () => {
    const { container } = render(<PaymentSuccess />);
    const emailLink = container.querySelector('a[href*="mailto"]');
    expect(emailLink).toBeTruthy();
  });

  it('should have proper text contrast for readability', () => {
    const { container } = render(<PaymentSuccess />);
    const whiteTexts = container.querySelectorAll('.text-white');
    expect(whiteTexts.length).toBeGreaterThan(0);
  });
});

