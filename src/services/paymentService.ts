/**
 * Payment Service
 * 
 * Handles subscription payments via Stripe and Omise
 * Manages billing cycles, invoices, and payment webhooks
 */

import { SubscriptionTier } from '../../types';

export interface PaymentProvider {
  id: 'stripe' | 'omise' | 'promptpay';
  name: string;
  available: boolean;
  currencies: string[];
  methods: ('card' | 'bank' | 'qr' | 'wallet' | 'promptpay')[];
}

export interface SubscriptionPrice {
  tier: SubscriptionTier;
  monthlyPrice: number; // in THB
  yearlyPrice: number; // in THB (with discount)
  currency: 'THB' | 'USD';
  earlyBirdDiscount?: number; // percentage (0-100)
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  provider: 'stripe' | 'omise';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  createdAt: Date;
  metadata?: {
    userId: string;
    email: string;
    promoCode?: string;
  };
}

export interface Invoice {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  amount: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  paidAt?: Date;
  dueDate: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Pricing Configuration (matching PRICING_STRATEGY.md)
export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, SubscriptionPrice> = {
  free: {
    tier: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'THB'
  },
  basic: {
    tier: 'basic',
    monthlyPrice: 299,
    yearlyPrice: 2990, // 10 months price (2 months free)
    currency: 'THB',
    earlyBirdDiscount: 50 // 50% OFF for early birds
  },
  pro: {
    tier: 'pro',
    monthlyPrice: 999,
    yearlyPrice: 9990, // 10 months price (2 months free)
    currency: 'THB',
    earlyBirdDiscount: 50
  },
  enterprise: {
    tier: 'enterprise',
    monthlyPrice: 8000, // Starting price
    yearlyPrice: 80000,
    currency: 'THB'
  }
};

// Payment Providers Configuration
export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    available: false, // Will be true when integrated
    currencies: ['THB', 'USD', 'EUR'],
    methods: ['card']
  },
  {
    id: 'omise',
    name: 'Omise',
    available: false, // Will be true when integrated
    currencies: ['THB'],
    methods: ['card', 'promptpay']
  },
  {
    id: 'promptpay',
    name: 'PromptPay',
    available: false,
    currencies: ['THB'],
    methods: ['qr']
  }
];

/**
 * Calculate subscription price with discounts
 */
export function calculatePrice(
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  options: {
    applyEarlyBird?: boolean;
    promoCode?: string;
    addOns?: { credits?: number; storage?: number };
  } = {}
): {
  basePrice: number;
  discount: number;
  addOnsPrice: number;
  totalPrice: number;
  savings: number;
} {
  if (tier === 'free') {
    return { basePrice: 0, discount: 0, addOnsPrice: 0, totalPrice: 0, savings: 0 };
  }

  const pricing = SUBSCRIPTION_PRICES[tier];
  const basePrice = billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;
  let discount = 0;
  let addOnsPrice = 0;

  // Apply Early Bird Discount
  if (options.applyEarlyBird && pricing.earlyBirdDiscount) {
    discount += (basePrice * pricing.earlyBirdDiscount) / 100;
  }

  // Apply Promo Code (to be implemented)
  if (options.promoCode) {
    // TODO: Validate promo code and apply discount
    console.log(`Promo code ${options.promoCode} - to be implemented`);
  }

  // Add-ons pricing
  if (options.addOns?.credits) {
    // 100 credits = ฿200
    addOnsPrice += (options.addOns.credits / 100) * 200;
  }
  if (options.addOns?.storage) {
    // 5GB = ฿100/month
    addOnsPrice += (options.addOns.storage / 5) * 100;
  }

  const totalPrice = basePrice - discount + addOnsPrice;
  const savings = discount + (billingCycle === 'yearly' ? pricing.monthlyPrice * 2 : 0);

  return {
    basePrice,
    discount,
    addOnsPrice,
    totalPrice,
    savings
  };
}

/**
 * Create a payment intent (Stripe-like interface)
 */
export async function createPaymentIntent(
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  provider: 'stripe' | 'omise',
  metadata: {
    userId: string;
    email: string;
    promoCode?: string;
  }
): Promise<PaymentIntent> {
  const { totalPrice } = calculatePrice(tier, billingCycle, {
    applyEarlyBird: true,
    promoCode: metadata.promoCode
  });

  // TODO: Integrate with actual payment provider API
  const intent: PaymentIntent = {
    id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: totalPrice,
    currency: 'THB',
    tier,
    billingCycle,
    provider,
    status: 'pending',
    createdAt: new Date(),
    metadata
  };

  console.log(`💳 Payment intent created: ${intent.id} - ฿${totalPrice} (${tier}, ${billingCycle})`);
  
  // In production:
  // if (provider === 'stripe') {
  //   return await createStripePaymentIntent(totalPrice, metadata);
  // } else {
  //   return await createOmiseCharge(totalPrice, metadata);
  // }

  return intent;
}

/**
 * Confirm payment (called after user completes payment)
 */
export async function confirmPayment(
  intentId: string
): Promise<{ success: boolean; subscription?: { tier: SubscriptionTier; expiresAt: Date } }> {
  // TODO: Verify payment with provider and update user subscription
  
  console.log(`✅ Payment confirmed: ${intentId}`);
  
  // Mock success response
  return {
    success: true,
    subscription: {
      tier: 'basic',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  immediate: boolean = false
): Promise<{ success: boolean; endsAt: Date }> {
  // TODO: Cancel subscription via payment provider
  
  const endsAt = immediate
    ? new Date()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // End of current billing period

  console.log(`🚫 Subscription canceled for user ${userId} - ends at ${endsAt.toLocaleDateString()}`);

  return {
    success: true,
    endsAt
  };
}

/**
 * Upgrade/Downgrade subscription
 */
export async function changeSubscription(
  userId: string,
  newTier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly'
): Promise<{
  success: boolean;
  prorated: number;
  nextBillingDate: Date;
}> {
  // TODO: Calculate prorated amount and update subscription
  
  const { totalPrice } = calculatePrice(newTier, billingCycle, { applyEarlyBird: false });
  const prorated = totalPrice * 0.5; // Mock: assume user is halfway through current period

  console.log(`🔄 Subscription changed to ${newTier} - Prorated: ฿${prorated}`);

  return {
    success: true,
    prorated,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
}

/**
 * Generate invoice for a billing period
 */
export function generateInvoice(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  period: { start: Date; end: Date }
): Invoice {
  const { basePrice, discount, addOnsPrice, totalPrice } = calculatePrice(tier, billingCycle, {
    applyEarlyBird: false
  });

  const items: InvoiceItem[] = [
    {
      description: `${tier.toUpperCase()} Plan - ${billingCycle}`,
      quantity: 1,
      unitPrice: basePrice,
      amount: basePrice
    }
  ];

  if (discount > 0) {
    items.push({
      description: 'Discount',
      quantity: 1,
      unitPrice: -discount,
      amount: -discount
    });
  }

  if (addOnsPrice > 0) {
    items.push({
      description: 'Add-ons',
      quantity: 1,
      unitPrice: addOnsPrice,
      amount: addOnsPrice
    });
  }

  const invoice: Invoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    tier,
    amount: totalPrice,
    currency: 'THB',
    period,
    status: 'open',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    items
  };

  return invoice;
}

/**
 * Webhook handler for payment provider callbacks
 */
export async function handlePaymentWebhook(
  provider: 'stripe' | 'omise',
  event: {
    type: string;
    data: unknown;
  }
): Promise<void> {
  console.log(`📨 Webhook received from ${provider}: ${event.type}`);

  // TODO: Implement webhook handlers for different event types
  // Examples:
  // - payment_intent.succeeded -> Activate subscription
  // - payment_intent.failed -> Send notification
  // - customer.subscription.deleted -> Deactivate subscription
  // - invoice.payment_succeeded -> Send receipt

  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('✅ Payment succeeded - activate subscription');
      break;
    case 'payment_intent.failed':
      console.log('❌ Payment failed - notify user');
      break;
    case 'customer.subscription.deleted':
      console.log('🚫 Subscription deleted - deactivate');
      break;
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }
}

/**
 * Get available payment methods for user's location
 */
export function getAvailablePaymentMethods(country: string = 'TH'): PaymentProvider[] {
  // Thailand: All methods
  if (country === 'TH') {
    return PAYMENT_PROVIDERS;
  }
  
  // International: Stripe only
  return PAYMENT_PROVIDERS.filter(p => p.id === 'stripe');
}

/**
 * Validate promo code
 */
export async function validatePromoCode(
  code: string
): Promise<{
  valid: boolean;
  discount?: number;
  type?: 'percentage' | 'fixed';
  expiresAt?: Date;
}> {
  // TODO: Check promo code in database
  
  const mockPromoCodes: Record<string, { discount: number; type: 'percentage' | 'fixed'; expiresAt: Date }> = {
    'EARLYBIRD50': { discount: 50, type: 'percentage', expiresAt: new Date('2025-12-31') },
    'WELCOME100': { discount: 100, type: 'fixed', expiresAt: new Date('2025-12-31') }
  };

  const promo = mockPromoCodes[code.toUpperCase()];
  
  if (!promo) {
    return { valid: false };
  }

  if (promo.expiresAt < new Date()) {
    return { valid: false };
  }

  return {
    valid: true,
    discount: promo.discount,
    type: promo.type,
    expiresAt: promo.expiresAt
  };
}
