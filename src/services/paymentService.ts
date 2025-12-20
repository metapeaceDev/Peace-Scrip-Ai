/**
 * Payment Service
 *
 * Handles subscription payments via Stripe and Omise
 * Manages billing cycles, invoices, and payment webhooks
 */

import { SubscriptionTier } from '../../types';
import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Initialize Stripe (client-side)
let stripePromise: Promise<StripeJS | null> | null = null;

function getStripePublishableKey(): string {
  // Get from environment or config
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
}

export function getStripe(): Promise<StripeJS | null> {
  if (!stripePromise) {
    const key = getStripePublishableKey();
    if (key) {
      stripePromise = loadStripe(key);
    } else {
      console.warn('Stripe publishable key not configured');
      stripePromise = Promise.resolve(null);
    }
  }
  return stripePromise;
}

// Server-side Stripe instance (for backend operations)
let stripeServer: Stripe | null = null;

function getStripeServer(): Stripe | null {
  if (!stripeServer) {
    const secretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
    if (secretKey) {
      stripeServer = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      });
    } else {
      console.warn('Stripe secret key not configured - payment features disabled');
    }
  }
  return stripeServer;
}

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
  stripeMonthlyLink?: string; // Stripe Payment Link for monthly subscription
  stripeYearlyLink?: string; // Stripe Payment Link for yearly subscription
  stripeEarlyBirdLink?: string; // Stripe Payment Link for Early Bird discount
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
    currency: 'THB',
  },
  basic: {
    tier: 'basic',
    monthlyPrice: 299,
    yearlyPrice: 2990, // 10 months price (2 months free)
    currency: 'THB',
    earlyBirdDiscount: 50, // 50% OFF for early birds → ฿150/month
    stripeMonthlyLink: 'https://buy.stripe.com/dRmbJ12Ir9bd8mwfnE1kA0g',
    stripeYearlyLink: 'https://buy.stripe.com/aFa3cvcj1879byI2AS1kA0h',
    stripeEarlyBirdLink: 'https://buy.stripe.com/00weVd0Aj5Z16eo8Zg1kA0i',
  },
  pro: {
    tier: 'pro',
    monthlyPrice: 999,
    yearlyPrice: 9990, // 10 months price (2 months free)
    currency: 'THB',
    earlyBirdDiscount: 50, // 50% OFF for early birds → ฿500/month
    stripeMonthlyLink: 'https://buy.stripe.com/eVq4gz5UDfzBeKU5N41kA0j',
    stripeYearlyLink: 'https://buy.stripe.com/fZu28rbeXafh9qAgrI1kA0k',
    stripeEarlyBirdLink: 'https://buy.stripe.com/00w00j5UD1ILfOY8Zg1kA0m',
  },
  enterprise: {
    tier: 'enterprise',
    monthlyPrice: 8000, // Starting price (custom pricing)
    yearlyPrice: 80000,
    currency: 'THB',
    earlyBirdDiscount: 0, // Enterprise: Contact metapeaceofficial@gmail.com
    stripeMonthlyLink: '', // Enterprise requires custom pricing - contact sales
    stripeYearlyLink: '', // Enterprise requires custom pricing - contact sales
  },
};

// Payment Providers Configuration
export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    available: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, // Available when configured
    currencies: ['THB', 'USD', 'EUR'],
    methods: ['card'],
  },
  {
    id: 'omise',
    name: 'Omise',
    available: false, // Will be true when integrated
    currencies: ['THB'],
    methods: ['card', 'promptpay'],
  },
  {
    id: 'promptpay',
    name: 'PromptPay',
    available: false,
    currencies: ['THB'],
    methods: ['qr'],
  },
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
    savings,
  };
}

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly',
  metadata: {
    userId: string;
    email: string;
    promoCode?: string;
  },
  options: {
    successUrl?: string;
    cancelUrl?: string;
  } = {}
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeServer();

  if (!stripe) {
    throw new Error('Stripe is not configured. Please add VITE_STRIPE_SECRET_KEY to environment.');
  }

  const pricing = SUBSCRIPTION_PRICES[tier];
  const basePrice = billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;

  // Apply promo code discount if provided
  let discountCoupon: string | undefined;
  if (metadata.promoCode) {
    const promoValidation = await validatePromoCode(metadata.promoCode);
    if (promoValidation.valid) {
      // Create or use existing Stripe coupon
      discountCoupon = metadata.promoCode;
    }
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: metadata.email,
    client_reference_id: metadata.userId,
    line_items: [
      {
        price_data: {
          currency: 'thb',
          product_data: {
            name: `Peace Script AI - ${tier.toUpperCase()} Plan`,
            description: `${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} subscription to Peace Script AI ${tier} tier`,
          },
          recurring: {
            interval: billingCycle === 'monthly' ? 'month' : 'year',
          },
          unit_amount: Math.round(basePrice * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    discounts: discountCoupon ? [{ coupon: discountCoupon }] : undefined,
    success_url:
      options.successUrl ||
      `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: options.cancelUrl || `${window.location.origin}/payment/cancel`,
    metadata: {
      userId: metadata.userId,
      tier,
      billingCycle,
      promoCode: metadata.promoCode || '',
    },
  });

  console.log(`✅ Stripe Checkout Session created: ${session.id}`);

  return {
    sessionId: session.id,
    url: session.url!,
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
    promoCode: metadata.promoCode,
  });

  if (provider === 'stripe') {
    const stripe = getStripeServer();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    // Create Stripe Payment Intent
    const stripeIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100), // Convert to cents
      currency: 'thb',
      metadata: {
        userId: metadata.userId,
        email: metadata.email,
        tier,
        billingCycle,
        promoCode: metadata.promoCode || '',
      },
    });

    const intent: PaymentIntent = {
      id: stripeIntent.id,
      amount: totalPrice,
      currency: 'THB',
      tier,
      billingCycle,
      provider,
      status: stripeIntent.status === 'succeeded' ? 'succeeded' : 'pending',
      createdAt: new Date(stripeIntent.created * 1000),
      metadata,
    };

    console.log(
      `💳 Stripe Payment Intent created: ${intent.id} - ฿${totalPrice} (${tier}, ${billingCycle})`
    );

    return intent;
  } else {
    // Omise integration (placeholder)
    const intent: PaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: totalPrice,
      currency: 'THB',
      tier,
      billingCycle,
      provider,
      status: 'pending',
      createdAt: new Date(),
      metadata,
    };

    console.log(
      `💳 Payment intent created (${provider}): ${intent.id} - ฿${totalPrice} (${tier}, ${billingCycle})`
    );

    return intent;
  }
}

/**
 * Confirm payment (called after user completes payment)
 */
export async function confirmPayment(
  sessionId: string
): Promise<{
  success: boolean;
  subscription?: { tier: SubscriptionTier; expiresAt: Date; subscriptionId: string };
}> {
  const stripe = getStripeServer();

  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return {
        success: false,
      };
    }

    // Get subscription details
    const subscriptionId = session.subscription as string;
    const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;

    const tier = (session.metadata?.tier as SubscriptionTier) || 'basic';
    const billingCycle = session.metadata?.billingCycle || 'monthly';
    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
      throw new Error('User ID not found in session');
    }

    // Calculate expiration date
    const expiresAt = new Date(subscription.current_period_end * 1000);

    // Update user subscription in Firestore
    const { updateUserSubscription } = await import('./firestoreService');
    await updateUserSubscription(userId, {
      tier,
      status: 'active',
      billingCycle: billingCycle as 'monthly' | 'yearly',
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: expiresAt,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: subscription.customer as string,
    });

    console.log(`✅ Payment confirmed: ${sessionId} - User ${userId} upgraded to ${tier}`);

    return {
      success: true,
      subscription: {
        tier,
        expiresAt,
        subscriptionId,
      },
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      success: false,
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  stripeSubscriptionId: string,
  immediate: boolean = false
): Promise<{ success: boolean; endsAt: Date }> {
  const stripe = getStripeServer();

  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    let subscription: any;

    if (immediate) {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      // Cancel at period end
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const endsAt = new Date(subscription.current_period_end * 1000);

    // Update user subscription in Firestore
    const { updateUserSubscription } = await import('./firestoreService');
    await updateUserSubscription(userId, {
      status: immediate ? 'canceled' : 'canceling',
      endDate: endsAt,
      canceledAt: new Date(),
    });

    console.log(
      `🚫 Subscription canceled for user ${userId} - ends at ${endsAt.toLocaleDateString()}`
    );

    return {
      success: true,
      endsAt,
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Upgrade/Downgrade subscription
 */
export async function changeSubscription(
  userId: string,
  stripeSubscriptionId: string,
  newTier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly'
): Promise<{
  success: boolean;
  prorated: number;
  nextBillingDate: Date;
}> {
  const stripe = getStripeServer();

  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Get current subscription
    const currentSubscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;

    // Get pricing for new tier
    const pricing = SUBSCRIPTION_PRICES[newTier];
    const newPrice = billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;

    // Create new price in Stripe (or use existing price ID if you have them)
    const price = await stripe.prices.create({
      currency: 'thb',
      unit_amount: Math.round(newPrice * 100),
      recurring: {
        interval: billingCycle === 'monthly' ? 'month' : 'year',
      },
      product_data: {
        name: `Peace Script AI - ${newTier.toUpperCase()} Plan`,
      },
    });

    // Update subscription with proration
    const updatedSubscription = (await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: price.id,
        },
      ],
      proration_behavior: 'always_invoice', // Create prorated invoice
      metadata: {
        tier: newTier,
        billingCycle,
      },
    })) as any;

    // Get upcoming invoice to calculate proration
    const upcomingInvoice = (await stripe.invoices.retrieve(
      (await stripe.invoices.list({ subscription: stripeSubscriptionId, limit: 1 })).data[0]?.id ||
        ''
    )) as any;

    const prorated = upcomingInvoice.amount_due / 100; // Convert from cents
    const nextBillingDate = new Date(updatedSubscription.current_period_end * 1000);

    // Update user subscription in Firestore
    const { updateUserSubscription } = await import('./firestoreService');
    await updateUserSubscription(userId, {
      tier: newTier,
      billingCycle,
      endDate: nextBillingDate,
    });

    console.log(`🔄 Subscription changed to ${newTier} - Prorated: ฿${prorated}`);

    return {
      success: true,
      prorated,
      nextBillingDate,
    };
  } catch (error) {
    console.error('Error changing subscription:', error);
    throw error;
  }
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
    applyEarlyBird: false,
  });

  const items: InvoiceItem[] = [
    {
      description: `${tier.toUpperCase()} Plan - ${billingCycle}`,
      quantity: 1,
      unitPrice: basePrice,
      amount: basePrice,
    },
  ];

  if (discount > 0) {
    items.push({
      description: 'Discount',
      quantity: 1,
      unitPrice: -discount,
      amount: -discount,
    });
  }

  if (addOnsPrice > 0) {
    items.push({
      description: 'Add-ons',
      quantity: 1,
      unitPrice: addOnsPrice,
      amount: addOnsPrice,
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
    items,
  };

  return invoice;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripeServer();

  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Webhook handler for payment provider callbacks
 */
export async function handlePaymentWebhook(
  provider: 'stripe' | 'omise',
  event: Stripe.Event
): Promise<void> {
  console.log(`📨 Webhook received from ${provider}: ${event.type}`);

  const { updateUserSubscription } = await import('./firestoreService');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;

      if (userId && session.subscription) {
        const subscriptionId = session.subscription as string;
        const stripe = getStripeServer();

        if (stripe) {
          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
          const tier = (session.metadata?.tier as SubscriptionTier) || 'basic';
          const billingCycle = session.metadata?.billingCycle || 'monthly';

          await updateUserSubscription(userId, {
            tier,
            status: 'active',
            billingCycle: billingCycle as 'monthly' | 'yearly',
            startDate: new Date(subscription.current_period_start * 1000),
            endDate: new Date(subscription.current_period_end * 1000),
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: subscription.customer as string,
          });

          console.log(`✅ Checkout completed - User ${userId} upgraded to ${tier}`);
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        const stripe = getStripeServer();

        if (stripe) {
          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
          const userId = subscription.metadata?.userId;

          if (userId) {
            await updateUserSubscription(userId, {
              status: 'active',
              endDate: new Date(subscription.current_period_end * 1000),
            });

            console.log(`✅ Payment succeeded - Subscription ${subscriptionId} renewed`);
          }
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        const stripe = getStripeServer();

        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            await updateUserSubscription(userId, {
              status: 'past_due',
            });

            console.log(`❌ Payment failed - Subscription ${subscriptionId} past due`);
            // TODO: Send email notification to user
          }
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const status =
          subscription.status === 'active'
            ? 'active'
            : subscription.status === 'canceled'
              ? 'canceled'
              : subscription.status === 'past_due'
                ? 'past_due'
                : 'active';

        await updateUserSubscription(userId, {
          status,
          endDate: new Date(subscription.current_period_end * 1000),
        });

        console.log(`🔄 Subscription updated - ${subscription.id} status: ${status}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        await updateUserSubscription(userId, {
          status: 'canceled',
          tier: 'free',
          endDate: new Date(),
        });

        console.log(`🚫 Subscription deleted - User ${userId} downgraded to free`);
      }
      break;
    }

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
export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  discount?: number;
  type?: 'percentage' | 'fixed';
  expiresAt?: Date;
  stripeCouponId?: string;
}> {
  const stripe = getStripeServer();

  if (!stripe) {
    // Fallback to mock codes if Stripe not configured
    const mockPromoCodes: Record<
      string,
      { discount: number; type: 'percentage' | 'fixed'; expiresAt: Date }
    > = {
      EARLYBIRD50: { discount: 50, type: 'percentage', expiresAt: new Date('2025-12-31') },
      WELCOME100: { discount: 100, type: 'fixed', expiresAt: new Date('2025-12-31') },
    };

    const promo = mockPromoCodes[code.toUpperCase()];

    if (!promo || promo.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      discount: promo.discount,
      type: promo.type,
      expiresAt: promo.expiresAt,
    };
  }

  try {
    // Try to retrieve the promotion code from Stripe
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return { valid: false };
    }

    const promotionCode = promotionCodes.data[0];
    const coupon = (promotionCode as any).coupon;

    // Check if promotion code is active
    if (!promotionCode.active) {
      return { valid: false };
    }

    // Check if expired
    if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
      return { valid: false };
    }

    // Check redemption limits
    if (
      promotionCode.max_redemptions &&
      promotionCode.times_redeemed >= promotionCode.max_redemptions
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      discount: coupon.percent_off || (coupon.amount_off ? coupon.amount_off / 100 : 0),
      type: coupon.percent_off ? 'percentage' : 'fixed',
      expiresAt: promotionCode.expires_at ? new Date(promotionCode.expires_at * 1000) : undefined,
      stripeCouponId: coupon.id,
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false };
  }
}
