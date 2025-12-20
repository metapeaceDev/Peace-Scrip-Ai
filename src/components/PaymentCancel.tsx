/**
 * Payment Cancel Page
 *
 * Shown when user cancels Stripe payment
 */

import React, { useState } from 'react';

interface PaymentCancelProps {
  onRetry?: () => void;
  onBack?: () => void;
}

const PaymentCancel: React.FC<PaymentCancelProps> = ({ onRetry, onBack }) => {
  const [countdown, setCountdown] = useState(10);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onBack) onBack();
          else window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onBack]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 text-center border border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
        {/* Warning Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-white mb-4">การชำระเงินถูกยกเลิก</h1>

        <p className="text-gray-300 mb-6">
          คุณได้ยกเลิกกระบวนการชำระเงิน
          <br />
          ไม่มีการเรียกเก็บเงินใดๆ จากคุณ
        </p>

        {/* Reasons */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-yellow-400 font-bold mb-3">ต้องการความช่วยเหลือหรือไม่?</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>หากมีปัญหาเกี่ยวกับการชำระเงิน ลองใช้บัตรอื่นหรือติดต่อธนาคาร</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>หากต้องการปรึกษาเกี่ยวกับแผน ติดต่อทีมงานของเรา</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>คุณสามารถทดลองใช้ฟรีได้ทุกเมื่อ</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              ลองอีกครั้ง
            </button>
          )}

          <button
            onClick={() => {
              if (onBack) onBack();
              else window.location.href = '/';
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            กลับไปหน้าหลัก
          </button>

          <p className="text-gray-500 text-sm">จะกลับไปหน้าหลักอัตโนมัติใน {countdown} วินาที...</p>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-xs mb-2">ต้องการความช่วยเหลือ?</p>
          <div className="flex justify-center gap-4 text-xs">
            <a href="mailto:metapeaceofficial@gmail.com" className="text-cyan-400 hover:underline">
              📧 Email
            </a>
            <span className="text-gray-600">|</span>
            <a href="tel:+66991923952" className="text-cyan-400 hover:underline">
              📞 099-1923952
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;

