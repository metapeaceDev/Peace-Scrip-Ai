/**
 * Payment Service Tests
 * Tests for subscription payments, pricing, discounts, and invoice generation
 */

import { describe, it, expect } from 'vitest';
import {
  SUBSCRIPTION_PRICES,
  PAYMENT_PROVIDERS,
  calculatePrice,
  generateInvoice,
  getAvailablePaymentMethods,
} from '../paymentService';
import type { SubscriptionTier } from '../../../types';

describe('paymentService', () => {
  describe('SUBSCRIPTION_PRICES constant', () => {
    it('should have all 4 subscription tiers', () => {
      expect(Object.keys(SUBSCRIPTION_PRICES).length).toBe(4);
      expect(SUBSCRIPTION_PRICES).toHaveProperty('free');
      expect(SUBSCRIPTION_PRICES).toHaveProperty('basic');
      expect(SUBSCRIPTION_PRICES).toHaveProperty('pro');
      expect(SUBSCRIPTION_PRICES).toHaveProperty('enterprise');
    });

    it('should have correct tier values', () => {
      expect(SUBSCRIPTION_PRICES.free.tier).toBe('free');
      expect(SUBSCRIPTION_PRICES.basic.tier).toBe('basic');
      expect(SUBSCRIPTION_PRICES.pro.tier).toBe('pro');
      expect(SUBSCRIPTION_PRICES.enterprise.tier).toBe('enterprise');
    });

    it('should have all required properties', () => {
      Object.values(SUBSCRIPTION_PRICES).forEach(price => {
        expect(price).toHaveProperty('tier');
        expect(price).toHaveProperty('monthlyPrice');
        expect(price).toHaveProperty('yearlyPrice');
        expect(price).toHaveProperty('currency');
      });
    });

    it('should have THB currency for all tiers', () => {
      Object.values(SUBSCRIPTION_PRICES).forEach(price => {
        expect(price.currency).toBe('THB');
      });
    });

    it('should have yearly price at ~10 months of monthly price', () => {
      const basic = SUBSCRIPTION_PRICES.basic;
      const pro = SUBSCRIPTION_PRICES.pro;
      
      // Basic: ฿299/month × 10 = ฿2,990/year (2 months free)
      expect(basic.yearlyPrice).toBe(basic.monthlyPrice * 10);
      
      // Pro: ฿999/month × 10 = ฿9,990/year (2 months free)
      expect(pro.yearlyPrice).toBe(pro.monthlyPrice * 10);
    });
  });

  describe('Free Tier Pricing', () => {
    const freePricing = SUBSCRIPTION_PRICES.free;

    it('should be completely free', () => {
      expect(freePricing.monthlyPrice).toBe(0);
      expect(freePricing.yearlyPrice).toBe(0);
    });

    it('should not have early bird discount', () => {
      expect(freePricing.earlyBirdDiscount).toBeUndefined();
    });

    it('should not have Stripe payment links', () => {
      expect(freePricing.stripeMonthlyLink).toBeUndefined();
      expect(freePricing.stripeYearlyLink).toBeUndefined();
      expect(freePricing.stripeEarlyBirdLink).toBeUndefined();
    });
  });

  describe('Basic Tier Pricing', () => {
    const basicPricing = SUBSCRIPTION_PRICES.basic;

    it('should have correct monthly price', () => {
      expect(basicPricing.monthlyPrice).toBe(299);
    });

    it('should have correct yearly price with 2 months free', () => {
      expect(basicPricing.yearlyPrice).toBe(2990);
      expect(basicPricing.yearlyPrice).toBe(basicPricing.monthlyPrice * 10);
    });

    it('should have 50% early bird discount', () => {
      expect(basicPricing.earlyBirdDiscount).toBe(50);
    });

    it('should have Stripe payment links', () => {
      expect(basicPricing.stripeMonthlyLink).toBeTruthy();
      expect(basicPricing.stripeYearlyLink).toBeTruthy();
      expect(basicPricing.stripeEarlyBirdLink).toBeTruthy();
      expect(basicPricing.stripeMonthlyLink).toContain('stripe.com');
    });
  });

  describe('Pro Tier Pricing', () => {
    const proPricing = SUBSCRIPTION_PRICES.pro;

    it('should have correct monthly price', () => {
      expect(proPricing.monthlyPrice).toBe(999);
    });

    it('should have correct yearly price with 2 months free', () => {
      expect(proPricing.yearlyPrice).toBe(9990);
      expect(proPricing.yearlyPrice).toBe(proPricing.monthlyPrice * 10);
    });

    it('should have 50% early bird discount', () => {
      expect(proPricing.earlyBirdDiscount).toBe(50);
    });

    it('should have Stripe payment links', () => {
      expect(proPricing.stripeMonthlyLink).toBeTruthy();
      expect(proPricing.stripeYearlyLink).toBeTruthy();
      expect(proPricing.stripeEarlyBirdLink).toBeTruthy();
      expect(proPricing.stripeMonthlyLink).toContain('stripe.com');
    });
  });

  describe('Enterprise Tier Pricing', () => {
    const enterprisePricing = SUBSCRIPTION_PRICES.enterprise;

    it('should have custom pricing', () => {
      expect(enterprisePricing.monthlyPrice).toBe(8000);
      expect(enterprisePricing.yearlyPrice).toBe(80000);
    });

    it('should not have early bird discount', () => {
      expect(enterprisePricing.earlyBirdDiscount).toBe(0);
    });

    it('should not have Stripe payment links (contact sales)', () => {
      expect(enterprisePricing.stripeMonthlyLink).toBe('');
      expect(enterprisePricing.stripeYearlyLink).toBe('');
    });
  });

  describe('Price Hierarchy', () => {
    it('should have increasing monthly prices', () => {
      expect(SUBSCRIPTION_PRICES.free.monthlyPrice).toBe(0);
      expect(SUBSCRIPTION_PRICES.basic.monthlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.free.monthlyPrice);
      expect(SUBSCRIPTION_PRICES.pro.monthlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.basic.monthlyPrice);
      expect(SUBSCRIPTION_PRICES.enterprise.monthlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.pro.monthlyPrice);
    });

    it('should have increasing yearly prices', () => {
      expect(SUBSCRIPTION_PRICES.free.yearlyPrice).toBe(0);
      expect(SUBSCRIPTION_PRICES.basic.yearlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.free.yearlyPrice);
      expect(SUBSCRIPTION_PRICES.pro.yearlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.basic.yearlyPrice);
      expect(SUBSCRIPTION_PRICES.enterprise.yearlyPrice).toBeGreaterThan(SUBSCRIPTION_PRICES.pro.yearlyPrice);
    });
  });

  describe('PAYMENT_PROVIDERS constant', () => {
    it('should have all 3 payment providers', () => {
      expect(PAYMENT_PROVIDERS.length).toBe(3);
      
      const providerIds = PAYMENT_PROVIDERS.map(p => p.id);
      expect(providerIds).toContain('stripe');
      expect(providerIds).toContain('omise');
      expect(providerIds).toContain('promptpay');
    });

    it('should have required properties for each provider', () => {
      PAYMENT_PROVIDERS.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('available');
        expect(provider).toHaveProperty('currencies');
        expect(provider).toHaveProperty('methods');
        expect(typeof provider.available).toBe('boolean');
        expect(Array.isArray(provider.currencies)).toBe(true);
        expect(Array.isArray(provider.methods)).toBe(true);
      });
    });

    it('should have Stripe provider with card support', () => {
      const stripe = PAYMENT_PROVIDERS.find(p => p.id === 'stripe');
      
      expect(stripe).toBeDefined();
      expect(stripe!.name).toBe('Stripe');
      expect(stripe!.methods).toContain('card');
      expect(stripe!.currencies).toContain('THB');
      expect(stripe!.currencies).toContain('USD');
    });

    it('should have Omise provider with PromptPay support', () => {
      const omise = PAYMENT_PROVIDERS.find(p => p.id === 'omise');
      
      expect(omise).toBeDefined();
      expect(omise!.name).toBe('Omise');
      expect(omise!.methods).toContain('card');
      expect(omise!.methods).toContain('promptpay');
      expect(omise!.currencies).toContain('THB');
    });

    it('should have PromptPay provider with QR support', () => {
      const promptpay = PAYMENT_PROVIDERS.find(p => p.id === 'promptpay');
      
      expect(promptpay).toBeDefined();
      expect(promptpay!.name).toBe('PromptPay');
      expect(promptpay!.methods).toContain('qr');
      expect(promptpay!.currencies).toContain('THB');
    });
  });

  describe('calculatePrice', () => {
    it('should return zero for free tier', () => {
      const result = calculatePrice('free', 'monthly');
      
      expect(result.basePrice).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.addOnsPrice).toBe(0);
      expect(result.totalPrice).toBe(0);
      expect(result.savings).toBe(0);
    });

    it('should calculate basic monthly price correctly', () => {
      const result = calculatePrice('basic', 'monthly');
      
      expect(result.basePrice).toBe(299);
      expect(result.discount).toBe(0);
      expect(result.totalPrice).toBe(299);
      expect(result.savings).toBe(0);
    });

    it('should calculate basic yearly price with savings', () => {
      const result = calculatePrice('basic', 'yearly');
      
      expect(result.basePrice).toBe(2990);
      expect(result.discount).toBe(0);
      expect(result.totalPrice).toBe(2990);
      expect(result.savings).toBe(299 * 2); // 2 months free
    });

    it('should apply early bird discount correctly', () => {
      const result = calculatePrice('basic', 'monthly', { applyEarlyBird: true });
      
      expect(result.basePrice).toBe(299);
      expect(result.discount).toBe(299 * 0.5); // 50% discount = ฿149.50
      expect(result.totalPrice).toBe(299 - 149.5); // ฿149.50
    });

    it('should apply early bird to pro tier', () => {
      const result = calculatePrice('pro', 'monthly', { applyEarlyBird: true });
      
      expect(result.basePrice).toBe(999);
      expect(result.discount).toBe(999 * 0.5); // 50% discount = ฿499.50
      expect(result.totalPrice).toBe(999 - 499.5); // ฿499.50
    });

    it('should not apply early bird to enterprise', () => {
      const result = calculatePrice('enterprise', 'monthly', { applyEarlyBird: true });
      
      expect(result.discount).toBe(0); // No early bird for enterprise
      expect(result.totalPrice).toBe(8000);
    });

    it('should calculate add-ons price for credits', () => {
      const result = calculatePrice('basic', 'monthly', {
        addOns: { credits: 100 }
      });
      
      // 100 credits = ฿200
      expect(result.addOnsPrice).toBe(200);
      expect(result.totalPrice).toBe(299 + 200);
    });

    it('should calculate add-ons price for storage', () => {
      const result = calculatePrice('basic', 'monthly', {
        addOns: { storage: 5 }
      });
      
      // 5GB = ฿100/month
      expect(result.addOnsPrice).toBe(100);
      expect(result.totalPrice).toBe(299 + 100);
    });

    it('should calculate combined add-ons', () => {
      const result = calculatePrice('pro', 'monthly', {
        addOns: { credits: 200, storage: 10 }
      });
      
      // 200 credits = ฿400, 10GB = ฿200
      expect(result.addOnsPrice).toBe(400 + 200);
      expect(result.totalPrice).toBe(999 + 600);
    });

    it('should combine early bird and add-ons', () => {
      const result = calculatePrice('basic', 'monthly', {
        applyEarlyBird: true,
        addOns: { credits: 100 }
      });
      
      const basePrice = 299;
      const discount = 299 * 0.5; // ฿149.50
      const addOnsPrice = 200; // 100 credits
      
      expect(result.basePrice).toBe(basePrice);
      expect(result.discount).toBe(discount);
      expect(result.addOnsPrice).toBe(addOnsPrice);
      expect(result.totalPrice).toBe(basePrice - discount + addOnsPrice); // 299 - 149.5 + 200 = ฿349.50
    });

    it('should calculate yearly with early bird and add-ons', () => {
      const result = calculatePrice('pro', 'yearly', {
        applyEarlyBird: true,
        addOns: { storage: 5 }
      });
      
      const basePrice = 9990;
      const discount = 9990 * 0.5; // ฿4,995
      const addOnsPrice = 100; // 5GB storage
      const yearlySavings = 999 * 2; // 2 months free = ฿1,998
      
      expect(result.basePrice).toBe(basePrice);
      expect(result.discount).toBe(discount);
      expect(result.addOnsPrice).toBe(addOnsPrice);
      expect(result.totalPrice).toBe(basePrice - discount + addOnsPrice);
      expect(result.savings).toBe(discount + yearlySavings);
    });
  });

  describe('generateInvoice', () => {
    it('should generate invoice for basic monthly subscription', () => {
      const userId = 'user123';
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-02-01'),
      };
      
      const invoice = generateInvoice(userId, 'basic', 'monthly', period);
      
      expect(invoice.userId).toBe(userId);
      expect(invoice.tier).toBe('basic');
      expect(invoice.amount).toBe(299);
      expect(invoice.currency).toBe('THB');
      expect(invoice.period).toEqual(period);
      expect(invoice.status).toBe('open');
      expect(invoice.items.length).toBeGreaterThan(0);
    });

    it('should generate invoice with correct line items', () => {
      const invoice = generateInvoice('user123', 'pro', 'monthly', {
        start: new Date(),
        end: new Date(),
      });
      
      expect(invoice.items[0].description).toContain('PRO Plan');
      expect(invoice.items[0].unitPrice).toBe(999);
      expect(invoice.items[0].quantity).toBe(1);
      expect(invoice.items[0].amount).toBe(999);
    });

    it('should have due date 7 days from creation', () => {
      const invoice = generateInvoice('user123', 'basic', 'monthly', {
        start: new Date(),
        end: new Date(),
      });
      
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      expect(invoice.dueDate.getTime()).toBeGreaterThanOrEqual(sevenDaysLater.getTime() - 1000);
      expect(invoice.dueDate.getTime()).toBeLessThanOrEqual(sevenDaysLater.getTime() + 1000);
    });

    it('should generate unique invoice IDs', () => {
      const invoice1 = generateInvoice('user123', 'basic', 'monthly', {
        start: new Date(),
        end: new Date(),
      });
      
      const invoice2 = generateInvoice('user123', 'basic', 'monthly', {
        start: new Date(),
        end: new Date(),
      });
      
      expect(invoice1.id).not.toBe(invoice2.id);
      expect(invoice1.id).toMatch(/^inv_/);
      expect(invoice2.id).toMatch(/^inv_/);
    });

    it('should generate invoice for yearly subscription', () => {
      const invoice = generateInvoice('user123', 'pro', 'yearly', {
        start: new Date('2024-01-01'),
        end: new Date('2025-01-01'),
      });
      
      expect(invoice.amount).toBe(9990);
      expect(invoice.items[0].description).toContain('PRO Plan - yearly');
    });
  });

  describe('getAvailablePaymentMethods', () => {
    it('should return all providers for Thailand', () => {
      const methods = getAvailablePaymentMethods('TH');
      
      expect(methods.length).toBe(3);
      expect(methods.some(m => m.id === 'stripe')).toBe(true);
      expect(methods.some(m => m.id === 'omise')).toBe(true);
      expect(methods.some(m => m.id === 'promptpay')).toBe(true);
    });

    it('should return only Stripe for international users', () => {
      const methods = getAvailablePaymentMethods('US');
      
      expect(methods.length).toBe(1);
      expect(methods[0].id).toBe('stripe');
    });

    it('should default to Thailand if no country specified', () => {
      const methods = getAvailablePaymentMethods();
      
      expect(methods.length).toBe(3);
    });

    it('should filter providers correctly for UK', () => {
      const methods = getAvailablePaymentMethods('GB');
      
      expect(methods.length).toBe(1);
      expect(methods[0].id).toBe('stripe');
    });

    it('should filter providers correctly for Japan', () => {
      const methods = getAvailablePaymentMethods('JP');
      
      expect(methods.length).toBe(1);
      expect(methods[0].id).toBe('stripe');
    });
  });

  describe('Pricing Edge Cases', () => {
    it('should handle zero credits add-on', () => {
      const result = calculatePrice('basic', 'monthly', {
        addOns: { credits: 0 }
      });
      
      expect(result.addOnsPrice).toBe(0);
      expect(result.totalPrice).toBe(299);
    });

    it('should handle zero storage add-on', () => {
      const result = calculatePrice('pro', 'monthly', {
        addOns: { storage: 0 }
      });
      
      expect(result.addOnsPrice).toBe(0);
      expect(result.totalPrice).toBe(999);
    });

    it('should handle large credits add-on', () => {
      const result = calculatePrice('pro', 'monthly', {
        addOns: { credits: 1000 }
      });
      
      // 1000 credits = ฿2,000 (1000/100 × ฿200)
      expect(result.addOnsPrice).toBe(2000);
      expect(result.totalPrice).toBe(999 + 2000);
    });

    it('should handle large storage add-on', () => {
      const result = calculatePrice('pro', 'monthly', {
        addOns: { storage: 50 }
      });
      
      // 50GB = ฿1,000 (50/5 × ฿100)
      expect(result.addOnsPrice).toBe(1000);
      expect(result.totalPrice).toBe(999 + 1000);
    });

    it('should not apply negative discount', () => {
      const result = calculatePrice('basic', 'monthly', { applyEarlyBird: false });
      
      expect(result.discount).toBe(0);
      expect(result.totalPrice).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should support full checkout flow calculation', () => {
      // 1. User selects pro yearly with early bird
      const pricing = calculatePrice('pro', 'yearly', {
        applyEarlyBird: true,
        addOns: { credits: 200, storage: 10 }
      });
      
      // 2. Generate invoice
      const invoice = generateInvoice('user123', 'pro', 'yearly', {
        start: new Date('2024-01-01'),
        end: new Date('2025-01-01'),
      });
      
      // 3. Verify payment methods available
      const methods = getAvailablePaymentMethods('TH');
      
      expect(pricing.totalPrice).toBeGreaterThan(0);
      expect(pricing.savings).toBeGreaterThan(0);
      expect(invoice.amount).toBe(9990); // Base yearly price without add-ons
      expect(methods.length).toBe(3);
    });

    it('should calculate yearly savings correctly', () => {
      const monthlyTotal = calculatePrice('basic', 'monthly').totalPrice * 12;
      const yearlyTotal = calculatePrice('basic', 'yearly').totalPrice;
      
      // Yearly should be cheaper (2 months free)
      expect(yearlyTotal).toBeLessThan(monthlyTotal);
      expect(monthlyTotal - yearlyTotal).toBe(299 * 2);
    });

    it('should support tier comparison', () => {
      const tiers: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
      const prices = tiers.map(tier => calculatePrice(tier, 'monthly'));
      
      // Verify increasing prices
      expect(prices[0].totalPrice).toBe(0);
      expect(prices[1].totalPrice).toBe(299);
      expect(prices[2].totalPrice).toBe(999);
      expect(prices[3].totalPrice).toBe(8000);
    });

    it('should support early bird campaign workflow', () => {
      // Without early bird
      const regular = calculatePrice('basic', 'monthly', { applyEarlyBird: false });
      
      // With early bird
      const earlyBird = calculatePrice('basic', 'monthly', { applyEarlyBird: true });
      
      expect(earlyBird.totalPrice).toBeLessThan(regular.totalPrice);
      expect(earlyBird.discount).toBe(299 * 0.5);
      expect(earlyBird.totalPrice).toBe(149.5); // ฿299 - 50% = ฿149.50
    });
  });
});
