/**
 * Referral Dashboard Component
 * 
 * แสดงสถิติและจัดการ referral code
 */

import React, { useState } from 'react';
import { getUserReferralStats, generateReferralLink, createCustomReferralCode } from '../services/referralService';

export const ReferralDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const stats = getUserReferralStats(userId);
  const [customCode, setCustomCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    const link = generateReferralLink(stats.code, 'copy');
    
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareSocial = () => {
    const twitterUrl = generateReferralLink(stats.code, 'social');
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleShareEmail = () => {
    const emailUrl = generateReferralLink(stats.code, 'email');
    window.location.href = emailUrl;
  };

  const handleCreateCustomCode = async () => {
    if (!customCode || customCode.length < 4) {
      setMessage({ type: 'error', text: 'รหัสต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }

    const result = createCustomReferralCode(userId, customCode);
    
    if (result.success) {
      setMessage({ type: 'success', text: `สร้างรหัส ${result.code?.code} สำเร็จ!` });
      setCustomCode('');
      // Refresh stats
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ type: 'error', text: result.error || 'ไม่สามารถสร้างรหัสได้' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🎁 Referral Program</h1>
        <p className="text-gray-600">
          แนะนำเพื่อน รับ 50 credits ต่อคน • เพื่อนของคุณก็ได้ 50 credits ฟรี!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm opacity-90">Total Referrals</div>
          <div className="text-4xl font-bold mt-2">{stats.totalReferrals}</div>
          <div className="text-sm opacity-75 mt-1">คนที่คุณแนะนำ</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm opacity-90">Successful</div>
          <div className="text-4xl font-bold mt-2">{stats.successfulReferrals}</div>
          <div className="text-sm opacity-75 mt-1">ลงทะเบียนสำเร็จ</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm opacity-90">Credits Earned</div>
          <div className="text-4xl font-bold mt-2">{stats.creditsEarned}</div>
          <div className="text-sm opacity-75 mt-1">credits ที่ได้รับ</div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="bg-white border-2 border-purple-200 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold mb-4">รหัส Referral ของคุณ</h2>
        
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
          <div className="text-sm text-gray-600 mb-2">Your Referral Code</div>
          <div className="text-4xl font-mono font-bold text-purple-600 tracking-wider">
            {stats.code}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={generateReferralLink(stats.code, 'copy')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                copiedLink
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleShareSocial}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
            >
              🐦 Share on Twitter
            </button>
            <button
              onClick={handleShareEmail}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
            >
              ✉️ Share via Email
            </button>
          </div>
        </div>
      </div>

      {/* Custom Code Creation (VIP Feature) */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3">✨ สร้างรหัสที่จดจำง่าย</h3>
        <p className="text-gray-700 mb-4 text-sm">
          สร้างรหัส referral แบบกำหนดเอง (4-12 ตัวอักษร, A-Z และ 0-9 เท่านั้น)
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="เช่น PEACE2024"
            maxLength={12}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg uppercase"
          />
          <button
            onClick={handleCreateCustomCode}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
          >
            สร้างรหัส
          </button>
        </div>

        {message && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">💡 วิธีการทำงาน</h3>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold">แชร์รหัสของคุณ</h4>
              <p className="text-gray-600 text-sm">
                ส่งลิงก์หรือรหัส referral ให้เพื่อนๆ ผ่าน social media, email, หรือวิธีอื่นๆ
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold">เพื่อนลงทะเบียน</h4>
              <p className="text-gray-600 text-sm">
                เมื่อเพื่อนสมัครใช้งานด้วยรหัสของคุณ พวกเขาจะได้รับ 50 credits ฟรีทันที
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold">คุณได้รับ Credits</h4>
              <p className="text-gray-600 text-sm">
                คุณจะได้รับ 50 credits เข้าบัญชีทันที ไม่มีขีดจำกัด - แนะนำเท่าไหร่ก็ได้!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      {stats.recentReferrals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">📊 Referrals ล่าสุด</h3>
          
          <div className="space-y-2">
            {stats.recentReferrals.map((referral, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">User {referral.userId.substring(0, 8)}...</p>
                    <p className="text-sm text-gray-600">
                      {referral.timestamp.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-green-600">+{referral.creditsAwarded} credits</p>
                  <p className="text-xs text-gray-500">Successful</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3">💎 เคล็ดลับเพื่อเพิ่ม Referrals</h3>
        
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>แชร์ผลงานที่คุณสร้างด้วย Peace Script บน social media</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>เล่าถึงประโยชน์ที่ได้รับจากการใช้งาน (ประหยัดเวลา, ความคิดสร้างสรรค์)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>แนะนำให้ผู้ที่สนใจเขียนบท, ผู้กำกับ, นักแสดง, หรือนักเรียนภาพยนตร์</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>ใช้รหัสที่จำง่าย เช่น ชื่อของคุณหรือชื่อทีม</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
