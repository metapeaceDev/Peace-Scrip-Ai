/**
 * Payment Success Page
 * 
 * Shown after successful Stripe payment
 * Updates user subscription status
 */

import React, { useEffect, useState } from 'react';
import { upgradeSubscription } from '../services/subscriptionManager';
import { auth } from '../config/firebase';

interface PaymentSuccessProps {
  onContinue?: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onContinue }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const updateSubscription = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.error('No user logged in');
          return;
        }

        // Get subscription tier from URL params (passed from Stripe)
        const urlParams = new URLSearchParams(window.location.search);
        const tier = urlParams.get('tier') as 'basic' | 'pro' | 'enterprise';
        
        if (tier) {
          console.log(`✅ Payment successful! Upgrading to ${tier}...`);
          await upgradeSubscription(user.uid, tier);
          console.log('✅ Subscription updated successfully');
        }
      } catch (error) {
        console.error('Error updating subscription:', error);
      }
    };

    updateSubscription();

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onContinue) onContinue();
          else window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 text-center border border-green-500/50 shadow-2xl shadow-green-500/20">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-white mb-4">
          ชำระเงินสำเร็จ! 🎉
        </h1>
        
        <p className="text-gray-300 mb-6">
          ขอบคุณสำหรับการสมัครสมาชิก Peace Script
          <br />
          บัญชีของคุณได้รับการอัพเกรดเรียบร้อยแล้ว
        </p>

        {/* Features Unlocked */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            คุณสมบัติที่ปลดล็อก:
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              ใช้งาน AI Models ขั้นสูง
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              สร้างภาพและวิดีโอไม่จำกัด
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              เพิ่มสมาชิกในทีม
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Priority Support
            </li>
          </ul>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <button
            onClick={() => {
              if (onContinue) onContinue();
              else window.location.href = '/';
            }}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            เริ่มสร้างสรรค์เลย
          </button>
          
          <p className="text-gray-500 text-sm">
            กลับไปหน้าหลักใน {countdown} วินาที...
          </p>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-xs">
            หากมีคำถามหรือต้องการความช่วยเหลือ
            <br />
            ติดต่อ: <a href="mailto:metapeaceofficial@gmail.com" className="text-cyan-400 hover:underline">metapeaceofficial@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
