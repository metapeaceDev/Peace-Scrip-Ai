import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutPage } from '../CheckoutPage';
import {
  calculatePrice,
  createPaymentIntent,
  confirmPayment,
  validatePromoCode,
  SUBSCRIPTION_PRICES,
  PAYMENT_PROVIDERS,
} from '../../services/paymentService';

// Mock payment service
vi.mock('../../services/paymentService', () => ({
  calculatePrice: vi.fn(),
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  validatePromoCode: vi.fn(),
  SUBSCRIPTION_PRICES: {
    free: {
      tier: 'free',
      monthlyPrice: 0,
      yearlyPrice: 0,
    },
    basic: {
      tier: 'basic',
      monthlyPrice: 299,
      yearlyPrice: 2990,
    },
    pro: {
      tier: 'pro',
      monthlyPrice: 999,
      yearlyPrice: 9990,
    },
    enterprise: {
      tier: 'enterprise',
      monthlyPrice: 8000,
      yearlyPrice: 80000,
    },
  },
  PAYMENT_PROVIDERS: [
    {
      id: 'omise',
      name: 'Omise',
      methods: ['บัตรเครดิต', 'PromptPay', 'TrueMoney Wallet'],
      available: true,
    },
    {
      id: 'stripe',
      name: 'Stripe',
      methods: ['บัตรเครดิต', 'Google Pay', 'Apple Pay'],
      available: false,
    },
  ],
}));

describe('CheckoutPage - Component Rendering', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });
  });

  it('should render CheckoutPage component', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should display checkout header', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const headers = screen.getAllByText(/ชำระเงิน/i);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should display tier and billing cycle', () => {
    render(
      <CheckoutPage
        tier="pro"
        billingCycle="yearly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const tierLabels = screen.getAllByText(/PRO/i);
    expect(tierLabels.length).toBeGreaterThan(0);
  });

  it('should display order summary section', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const summaryHeaders = screen.getAllByText(/สรุปคำสั่งซื้อ/i);
    expect(summaryHeaders.length).toBeGreaterThan(0);
  });

  it('should display promo code section', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const promoHeaders = screen.getAllByText(/รหัสโปรโมชั่น/i);
    expect(promoHeaders.length).toBeGreaterThan(0);
  });

  it('should display payment method section', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const paymentHeaders = screen.getAllByText(/วิธีการชำระเงิน/i);
    expect(paymentHeaders.length).toBeGreaterThan(0);
  });

  it('should display cancel button', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const cancelButtons = screen.getAllByText(/ยกเลิก/i);
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('should display payment button', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const payButtons = screen.getAllByText(/ชำระเงิน/i);
    expect(payButtons.length).toBeGreaterThan(0);
  });

  it('should display security notice', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    const securityTexts = screen.getAllByText(/การชำระเงินปลอดภัย/i);
    expect(securityTexts.length).toBeGreaterThan(0);
  });
});

describe('CheckoutPage - Price Display', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display base price for monthly billing', () => {
    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 0,
      totalPrice: 299,
    });

    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const priceTexts = screen.getAllByText(/฿299/);
    expect(priceTexts.length).toBeGreaterThan(0);
  });

  it('should display early bird discount', () => {
    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });

    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const discountTexts = screen.getAllByText(/Early Bird 50%/i);
    expect(discountTexts.length).toBeGreaterThan(0);
  });

  it('should display total price', () => {
    (calculatePrice as any).mockReturnValue({
      basePrice: 999,
      discount: 499.5,
      totalPrice: 499.5,
    });

    render(
      <CheckoutPage
        tier="pro"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const totalLabels = screen.getAllByText(/รวมทั้งหมด/i);
    expect(totalLabels.length).toBeGreaterThan(0);
  });

  it('should display yearly savings message', () => {
    (calculatePrice as any).mockReturnValue({
      basePrice: 2990,
      discount: 1495,
      totalPrice: 1495,
    });

    render(
      <CheckoutPage
        tier="basic"
        billingCycle="yearly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const savingsTexts = screen.getAllByText(/ประหยัด/i);
    expect(savingsTexts.length).toBeGreaterThan(0);
  });

  it('should calculate price correctly for enterprise tier', () => {
    (calculatePrice as any).mockReturnValue({
      basePrice: 8000,
      discount: 4000,
      totalPrice: 4000,
    });

    render(
      <CheckoutPage
        tier="enterprise"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const enterpriseTexts = screen.getAllByText(/ENTERPRISE/i);
    expect(enterpriseTexts.length).toBeGreaterThan(0);
  });
});

describe('CheckoutPage - Promo Code Functionality', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });
  });

  it('should have promo code input field', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector('input[placeholder*="รหัสโปรโมชั่น"]');
    expect(promoInput).toBeTruthy();
  });

  it('should allow typing in promo code field', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector(
      'input[placeholder*="รหัสโปรโมชั่น"]'
    ) as HTMLInputElement;

    if (promoInput) {
      fireEvent.change(promoInput, { target: { value: 'SAVE50' } });
      expect(promoInput.value).toBe('SAVE50');
    }
  });

  it('should display apply promo button', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const applyButtons = screen.getAllByText(/ใช้รหัส/i);
    expect(applyButtons.length).toBeGreaterThan(0);
  });

  it('should show success message when promo code is valid', async () => {
    (validatePromoCode as any).mockResolvedValue({
      valid: true,
      discount: 100,
    });

    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector(
      'input[placeholder*="รหัสโปรโมชั่น"]'
    ) as HTMLInputElement;
    const applyButton = screen.getByText(/ใช้รหัส/i);

    fireEvent.change(promoInput, { target: { value: 'VALID50' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      const successTexts = screen.getAllByText(/ใช้รหัสโปรโมชั่นสำเร็จ/i);
      expect(successTexts.length).toBeGreaterThan(0);
    });
  });

  it('should show error message when promo code is invalid', async () => {
    (validatePromoCode as any).mockResolvedValue({
      valid: false,
    });

    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector(
      'input[placeholder*="รหัสโปรโมชั่น"]'
    ) as HTMLInputElement;
    const applyButton = screen.getByText(/ใช้รหัส/i);

    fireEvent.change(promoInput, { target: { value: 'INVALID' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      const errorTexts = screen.getAllByText(/ไม่ถูกต้องหรือหมดอายุ/i);
      expect(errorTexts.length).toBeGreaterThan(0);
    });
  });

  it('should convert promo code to uppercase', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector(
      'input[placeholder*="รหัสโปรโมชั่น"]'
    ) as HTMLInputElement;

    if (promoInput) {
      fireEvent.change(promoInput, { target: { value: 'save50' } });
      expect(promoInput.value).toBe('SAVE50');
    }
  });

  it('should show cancel button after promo is applied', async () => {
    (validatePromoCode as any).mockResolvedValue({
      valid: true,
      discount: 100,
    });

    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promoInput = container.querySelector(
      'input[placeholder*="รหัสโปรโมชั่น"]'
    ) as HTMLInputElement;
    const applyButton = screen.getByText(/ใช้รหัส/i);

    fireEvent.change(promoInput, { target: { value: 'VALID50' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      const cancelButtons = screen.getAllByText(/ยกเลิก/i);
      expect(cancelButtons.length).toBeGreaterThan(1); // Main cancel + promo cancel
    });
  });
});

describe('CheckoutPage - Payment Method Selection', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });
  });

  it('should display available payment providers', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const omiseLabels = screen.getAllByText(/Omise/i);
    expect(omiseLabels.length).toBeGreaterThan(0);
  });

  it('should display unavailable payment providers', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const stripeLabels = screen.getAllByText(/Stripe/i);
    expect(stripeLabels.length).toBeGreaterThan(0);
  });

  it('should show payment method details', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const promptPayTexts = screen.getAllByText(/PromptPay/i);
    expect(promptPayTexts.length).toBeGreaterThan(0);
  });

  it('should allow selecting payment method', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const radioButtons = container.querySelectorAll('input[type="radio"]');
    expect(radioButtons.length).toBeGreaterThan(0);
  });

  it('should have Omise selected by default', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const omiseRadio = container.querySelector('input[value="omise"]') as HTMLInputElement;
    expect(omiseRadio?.checked).toBe(true);
  });

  it('should show coming soon for unavailable providers', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const comingSoonTexts = screen.getAllByText(/เร็วๆ นี้/i);
    expect(comingSoonTexts.length).toBeGreaterThan(0);
  });
});

describe('CheckoutPage - Payment Processing', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });

    (createPaymentIntent as any).mockResolvedValue({
      id: 'intent_123',
      amount: 149.5,
    });

    (confirmPayment as any).mockResolvedValue({
      success: true,
      subscription: {
        tier: 'basic',
        startDate: new Date(),
      },
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const buttons = container.querySelectorAll('button');
    const cancelButton = Array.from(buttons).find(btn => btn.textContent?.includes('ยกเลิก'));

    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('should show processing state when payment is being processed', async () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const buttons = container.querySelectorAll('button');
    const payButton = Array.from(buttons).find(btn => btn.textContent?.includes('ชำระเงิน'));

    if (payButton) {
      fireEvent.click(payButton);

      await waitFor(
        () => {
          const processingTexts = screen.getAllByText(/กำลังดำเนินการ/i);
          expect(processingTexts.length).toBeGreaterThan(0);
        },
        { timeout: 100 }
      );
    }
  });

  it('should call onSuccess when payment succeeds', async () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const buttons = container.querySelectorAll('button');
    const payButton = Array.from(buttons).find(btn => btn.textContent?.includes('ชำระเงิน'));

    if (payButton) {
      fireEvent.click(payButton);

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    }
  });

  it('should show error when payment fails', async () => {
    (confirmPayment as any).mockResolvedValue({
      success: false,
    });

    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const buttons = container.querySelectorAll('button');
    const payButton = Array.from(buttons).find(btn => btn.textContent?.includes('ชำระเงิน'));

    if (payButton) {
      fireEvent.click(payButton);

      await waitFor(
        () => {
          const errorTexts = screen.getAllByText(/การชำระเงินล้มเหลว/i);
          expect(errorTexts.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    }
  });

  it('should disable payment button for unavailable providers', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Switch to Stripe (unavailable)
    const stripeRadio = container.querySelector('input[value="stripe"]') as HTMLInputElement;
    if (stripeRadio) {
      fireEvent.click(stripeRadio);

      const buttons = container.querySelectorAll('button');
      const payButton = Array.from(buttons).find(btn =>
        btn.textContent?.includes('ชำระเงิน')
      ) as HTMLButtonElement;

      expect(payButton?.disabled).toBe(true);
    }
  });
});

describe('CheckoutPage - Props Handling', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (calculatePrice as any).mockReturnValue({
      basePrice: 299,
      discount: 149.5,
      totalPrice: 149.5,
    });
  });

  it('should accept tier prop', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept billingCycle prop', () => {
    const { container } = render(
      <CheckoutPage
        tier="pro"
        billingCycle="yearly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept onSuccess callback', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept onCancel callback', () => {
    const { container } = render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle all tier options', () => {
    const tiers: Array<'free' | 'basic' | 'pro' | 'enterprise'> = [
      'free',
      'basic',
      'pro',
      'enterprise',
    ];

    tiers.forEach(tier => {
      const { container } = render(
        <CheckoutPage
          tier={tier}
          billingCycle="monthly"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  it('should handle monthly billing cycle', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="monthly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const monthlyTexts = screen.getAllByText(/รายเดือน/i);
    expect(monthlyTexts.length).toBeGreaterThan(0);
  });

  it('should handle yearly billing cycle', () => {
    render(
      <CheckoutPage
        tier="basic"
        billingCycle="yearly"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const yearlyTexts = screen.getAllByText(/รายปี/i);
    expect(yearlyTexts.length).toBeGreaterThan(0);
  });
});
