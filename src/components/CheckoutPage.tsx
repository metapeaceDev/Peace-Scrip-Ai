/**
 * Checkout Page
 *
 * Handles subscription payment flow
 */

import React, { useState } from 'react';
import { SubscriptionTier } from '../types';
import {
  calculatePrice,
  createPaymentIntent,
  confirmPayment,
  validatePromoCode,
  SUBSCRIPTION_PRICES,
  PAYMENT_PROVIDERS,
} from '../services/paymentService';

interface CheckoutPageProps {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  tier,
  billingCycle,
  onSuccess,
  onCancel,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'omise'>('omise');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const pricing = calculatePrice(tier, billingCycle, {
    applyEarlyBird: true,
    promoCode: promoApplied ? promoCode : undefined,
  });

  const handleApplyPromo = async () => {
    if (!promoCode) return;

    const validation = await validatePromoCode(promoCode);

    if (validation.valid && validation.discount) {
      setPromoApplied(true);
      setPromoDiscount(validation.discount);
      setError('');
    } else {
      setError('รหัสโปรโมชั่นไม่ถูกต้องหรือหมดอายุ');
      setPromoApplied(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      // Step 1: Create payment intent
      const intent = await createPaymentIntent(tier, billingCycle, paymentMethod, {
        userId: 'user123', // TODO: Get from auth context
        email: 'user@example.com', // TODO: Get from auth context
        promoCode: promoApplied ? promoCode : undefined,
      });

      // Step 2: Open payment provider UI (Stripe/Omise)
      // TODO: Integrate actual payment UI
      console.log('Opening payment UI for intent:', intent.id);

      // Mock payment success after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Confirm payment
      const result = await confirmPayment(intent.id);

      if (result.success) {
        console.log('Payment successful!', result.subscription);
        onSuccess?.();
      } else {
        setError('การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ชำระเงิน</h1>
        <p className="text-gray-600">
          แพ็กเกจ {SUBSCRIPTION_PRICES[tier]?.tier.toUpperCase()} -{' '}
          {billingCycle === 'monthly' ? 'รายเดือน' : 'รายปี'}
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold">สรุปคำสั่งซื้อ</h2>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>ราคาต่อ{billingCycle === 'monthly' ? 'เดือน' : 'ปี'}</span>
            <span>฿{pricing.basePrice.toLocaleString()}</span>
          </div>

          {pricing.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>ส่วนลด Early Bird 50%</span>
              <span>-฿{pricing.discount.toLocaleString()}</span>
            </div>
          )}

          {promoApplied && promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>ส่วนลดโปรโมชั่น ({promoCode})</span>
              <span>-฿{promoDiscount.toLocaleString()}</span>
            </div>
          )}

          {billingCycle === 'yearly' && (
            <div className="flex justify-between text-blue-600">
              <span>ประหยัด (ฟรี 2 เดือน)</span>
              <span>฿{(SUBSCRIPTION_PRICES[tier].monthlyPrice * 2).toLocaleString()}</span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between text-xl font-bold">
            <span>รวมทั้งหมด</span>
            <span className="text-purple-600">฿{pricing.totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Promo Code */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold">รหัสโปรโมชั่น</h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="ใส่รหัสโปรโมชั่น"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            disabled={promoApplied}
          />

          {!promoApplied ? (
            <button
              onClick={handleApplyPromo}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ใช้รหัส
            </button>
          ) : (
            <button
              onClick={() => {
                setPromoApplied(false);
                setPromoCode('');
                setPromoDiscount(0);
              }}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ยกเลิก
            </button>
          )}
        </div>

        {promoApplied && <p className="text-green-600 text-sm">✓ ใช้รหัสโปรโมชั่นสำเร็จ!</p>}
      </div>

      {/* Payment Method */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold">วิธีการชำระเงิน</h2>

        <div className="space-y-2">
          {PAYMENT_PROVIDERS.map(provider => (
            <label
              key={provider.id}
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                paymentMethod === provider.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300'
              } ${!provider.available ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={provider.id}
                checked={paymentMethod === provider.id}
                onChange={e => setPaymentMethod(e.target.value as 'stripe' | 'omise')}
                disabled={!provider.available}
              />
              <div className="flex-1">
                <p className="font-semibold">{provider.name}</p>
                <p className="text-sm text-gray-600">
                  {provider.methods.join(', ')}
                  {!provider.available && ' (เร็วๆ นี้)'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={processing}
        >
          ยกเลิก
        </button>

        <button
          onClick={handlePayment}
          className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          disabled={processing || !PAYMENT_PROVIDERS.find(p => p.id === paymentMethod)?.available}
        >
          {processing ? 'กำลังดำเนินการ...' : `ชำระเงิน ฿${pricing.totalPrice.toLocaleString()}`}
        </button>
      </div>

      {/* Security Notice */}
      <div className="text-center text-sm text-gray-600">
        🔒 การชำระเงินปลอดภัย เข้ารหัสด้วย SSL
        <br />
        ข้อมูลการ์ดของคุณจะไม่ถูกเก็บในระบบของเรา
      </div>
    </div>
  );
};
