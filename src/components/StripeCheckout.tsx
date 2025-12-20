/**
 * Stripe Checkout Component
 *
 * Displays subscription plans and redirects to Stripe Payment Links
 * Handles Early Bird discounts and different billing cycles
 */

import React, { useState } from 'react';
import { SubscriptionTier } from '../types';
import { SUBSCRIPTION_PRICES } from '../services/paymentService';

interface StripeCheckoutProps {
  onClose?: () => void;
  currentTier?: SubscriptionTier;
}

type BillingCycle = 'monthly' | 'yearly';

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ onClose, currentTier = 'free' }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isEarlyBird, setIsEarlyBird] = useState(true); // Early Bird active by default

  const handleCheckout = (tier: SubscriptionTier) => {
    if (tier === 'free') return;

    const pricing = SUBSCRIPTION_PRICES[tier];
    let checkoutUrl = '';

    // Determine which Stripe link to use
    if (tier === 'enterprise') {
      // Enterprise: Contact Sales
      window.open('mailto:metapeaceofficial@gmail.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    // Get appropriate Stripe Payment Link
    if (isEarlyBird && pricing.stripeEarlyBirdLink) {
      checkoutUrl = pricing.stripeEarlyBirdLink;
    } else if (billingCycle === 'yearly' && pricing.stripeYearlyLink) {
      checkoutUrl = pricing.stripeYearlyLink;
    } else if (pricing.stripeMonthlyLink) {
      checkoutUrl = pricing.stripeMonthlyLink;
    }

    if (checkoutUrl) {
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } else {
      alert(
        '⚠️ Stripe Payment Link ยังไม่ได้ตั้งค่า\n\nกรุณาติดต่อ Admin เพื่อเพิ่ม Payment Links'
      );
    }
  };

  const calculatePrice = (tier: SubscriptionTier) => {
    if (tier === 'free') return 0;

    const pricing = SUBSCRIPTION_PRICES[tier];
    let price = billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;

    // Apply Early Bird discount
    if (isEarlyBird && pricing.earlyBirdDiscount) {
      price = price * (1 - pricing.earlyBirdDiscount / 100);
    }

    return price;
  };

  const plans = [
    {
      tier: 'basic' as SubscriptionTier,
      name: 'Basic',
      description: 'เหมาะสำหรับผู้เริ่มต้น',
      features: [
        '385M Tokens/month',
        '471 Images/month',
        '47 Videos/month (5 sec)',
        '1 Team Member',
        'Basic Support',
      ],
      color: 'cyan',
      popular: false,
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: 'Pro',
      description: 'สำหรับนักสร้างสรรค์มืออาชีพ',
      features: [
        '1,308M Tokens/month',
        '1,708 Images/month',
        '144 Videos/month (5 sec)',
        '3 Team Members',
        'Priority Support',
        'Advanced AI Models',
      ],
      color: 'purple',
      popular: true,
    },
    {
      tier: 'enterprise' as SubscriptionTier,
      name: 'Enterprise',
      description: 'สำหรับองค์กรขนาดใหญ่',
      features: [
        '3,495M Tokens/month',
        '4,992 Images/month',
        '344 Videos/month (5 sec)',
        '5+ Team Members',
        '24/7 Premium Support',
        'Custom AI Training',
        'Dedicated Account Manager',
      ],
      color: 'amber',
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl max-w-6xl w-full p-6 my-8 border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">เลือกแผนที่เหมาะกับคุณ</h2>
            <p className="text-gray-400">ปลดล็อกศักยภาพการสร้างสรรค์แบบเต็มรูปแบบ</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              รายปี
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                ประหยัด 2 เดือน
              </span>
            </button>
          </div>

          {/* Early Bird Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isEarlyBird}
                onChange={e => setIsEarlyBird(e.target.checked)}
                className="w-4 h-4 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
              />
              <span className="text-sm font-bold text-pink-400">🎉 Early Bird 50% OFF</span>
            </label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const price = calculatePrice(plan.tier);
            const originalPrice =
              billingCycle === 'monthly'
                ? SUBSCRIPTION_PRICES[plan.tier].monthlyPrice
                : SUBSCRIPTION_PRICES[plan.tier].yearlyPrice;
            const hasDiscount = isEarlyBird && SUBSCRIPTION_PRICES[plan.tier].earlyBirdDiscount;

            return (
              <div
                key={plan.tier}
                className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                  plan.popular
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                      แนะนำ
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold text-${plan.color}-400 mb-2`}>{plan.name}</h3>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-6">
                  {hasDiscount && (
                    <div className="text-gray-500 line-through text-lg mb-1">
                      ฿{originalPrice.toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">฿{price.toLocaleString()}</span>
                    <span className="text-gray-400">
                      /{billingCycle === 'monthly' ? 'เดือน' : 'ปี'}
                    </span>
                  </div>
                  {hasDiscount && (
                    <div className="mt-2 text-pink-400 text-sm font-bold">
                      🎉 ลด 50% (Early Bird)
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.tier)}
                  disabled={currentTier === plan.tier}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    currentTier === plan.tier
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : plan.tier === 'enterprise'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                          : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {currentTier === plan.tier
                    ? 'แผนปัจจุบัน'
                    : plan.tier === 'enterprise'
                      ? 'ติดต่อฝ่ายขาย'
                      : 'เริ่มใช้งาน'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>💳 ชำระเงินผ่าน Stripe (รองรับบัตรเครดิต/เดบิต)</p>
          <p className="mt-1">🔒 การชำระเงินปลอดภัย 100% | ยกเลิกได้ทุกเมื่อ</p>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;

