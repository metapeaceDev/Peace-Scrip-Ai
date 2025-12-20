import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/subscriptionManager';
import { SubscriptionTier } from '../types';
import './QuotaWidget.css';

interface QuotaData {
  tier: SubscriptionTier;
  creditsUsed: number;
  creditsTotal: number;
  percentage: number;
  maxProjects: number;
  maxResolution: string;
  storageLimit: number;
}

interface QuotaWidgetProps {
  onUpgradeClick?: () => void;
}

export const QuotaWidget: React.FC<QuotaWidgetProps> = ({ onUpgradeClick }) => {
  const { currentUser } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadQuota = React.useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      const data = await getUserSubscription(currentUser.uid);
      const creditsTotal =
        data.subscription.maxCredits === -1 ? Infinity : data.subscription.maxCredits;

      setQuota({
        tier: data.subscription.tier,
        creditsUsed: data.monthlyUsage.creditsUsed,
        creditsTotal,
        percentage:
          creditsTotal === Infinity ? 0 : (data.monthlyUsage.creditsUsed / creditsTotal) * 100,
        maxProjects: data.subscription.features.maxProjects,
        maxResolution: data.subscription.features.maxResolution,
        storageLimit: data.subscription.features.storageLimit,
      });
    } catch (error) {
      console.error('Error loading quota:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !quota) return null;

  const isUnlimited = quota.creditsTotal === Infinity;
  const isLow = quota.percentage > 70;
  const isVeryLow = quota.percentage > 90;

  // สีและ icon ตาม tier
  const tierConfig = {
    free: {
      icon: '🆓',
      color: 'text-gray-400',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-700/50',
      gradient: 'from-gray-600 to-gray-700',
    },
    basic: {
      icon: '⭐',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700/50',
      gradient: 'from-blue-600 to-blue-700',
    },
    pro: {
      icon: '💎',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-700/50',
      gradient: 'from-purple-600 to-purple-700',
    },
    enterprise: {
      icon: '🏆',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700/50',
      gradient: 'from-yellow-600 to-yellow-700',
    },
  };

  const config = tierConfig[quota.tier] || tierConfig.free;
  const tierName =
    quota.tier === 'free' ? 'Free' : quota.tier.charAt(0).toUpperCase() + quota.tier.slice(1);

  const getTierPrice = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'Free';
      case 'basic':
        return '$9.99/mo';
      case 'pro':
        return '$29.99/mo';
      case 'enterprise':
        return '$99.99/mo';
      default:
        return '';
    }
  };

  const getTierColor = (tier: SubscriptionTier, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-gray-800 border-cyan-500 text-cyan-400';
    }
    switch (tier) {
      case 'free':
        return 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700';
      case 'basic':
        return 'bg-blue-900/30 border-blue-700/50 text-blue-300 hover:bg-blue-900/50';
      case 'pro':
        return 'bg-purple-900/30 border-purple-700/50 text-purple-300 hover:bg-purple-900/50';
      case 'enterprise':
        return 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-700/50 text-yellow-300 hover:from-yellow-900/50 hover:to-orange-900/50';
      default:
        return 'bg-gray-700/50 border-gray-600 text-gray-300';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className={`flex items-center gap-2 px-3 py-1.5 ${config.bgColor} ${config.borderColor} border rounded-md hover:bg-opacity-80 transition-all text-xs cursor-pointer relative z-10`}
        onClick={() => setIsOpen(!isOpen)}
        title="Click to view details"
      >
        {/* Tier Badge */}
        <span className="text-sm">{config.icon}</span>
        <span className={`font-medium ${config.color}`}>{tierName}</span>

        {/* Credits */}
        {isUnlimited ? (
          <span className="text-yellow-300 font-bold">∞</span>
        ) : (
          <span
            className={`font-medium ${
              isVeryLow ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            {quota.creditsUsed}/{quota.creditsTotal}
          </span>
        )}

        {/* Dropdown Arrow */}
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel - ขอบซ้ายชิดกับขอบซ้ายปุ่ม */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 animate-slide-down max-h-[80vh] overflow-y-auto">
          <div className="p-3">
            {/* Current Plan Header */}
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-xs font-bold text-white mb-1">Current Plan</div>
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-base font-bold uppercase ${
                    quota.tier === 'enterprise'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'
                      : 'text-cyan-400'
                  }`}
                >
                  {quota.tier}
                </span>
                <span className="text-xs text-gray-400">{getTierPrice(quota.tier)}</span>
              </div>

              {/* Credits Progress */}
              {quota.tier !== 'free' && !isUnlimited && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Credits:</span>
                    <span className="text-white font-mono">
                      {quota.creditsUsed}/{quota.creditsTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isVeryLow ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(quota.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Storage:</span>
                    <span className="text-white font-mono">0 / {quota.storageLimit} GB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 p-1.5 rounded">
                <div className="text-gray-400">โปรเจกต์</div>
                <div className="text-white font-bold text-xs">
                  {quota.maxProjects === -1 ? 'Unlimited' : quota.maxProjects}
                </div>
              </div>
              <div className="bg-gray-800 p-1.5 rounded">
                <div className="text-gray-400">ความละเอียด</div>
                <div className="text-white font-bold text-xs">{quota.maxResolution}</div>
              </div>
            </div>

            {/* Plan Options - Grid Layout */}
            <div className="text-xs text-gray-400 mb-1.5">Available Plans</div>

            {/* Free - Full Width (ถ้าเป็น plan ปัจจุบัน) */}
            {quota.tier === 'free' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick?.();
                }}
                className={`w-full text-left px-2.5 py-2 rounded text-xs mb-1 border transition-all ${getTierColor('free', true)}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold uppercase">Free</div>
                    <div className="text-[10px] text-gray-400">Free</div>
                  </div>
                  <span className="text-cyan-400">✓</span>
                </div>
              </button>
            )}

            {/* Basic + Pro - 2 columns */}
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick?.();
                }}
                className={`text-left px-2 py-1.5 rounded text-[10px] border transition-all ${getTierColor('basic', quota.tier === 'basic')}`}
              >
                <div className="font-semibold uppercase">Basic</div>
                <div className="text-[9px] text-gray-400">$9.99/mo</div>
                {quota.tier === 'basic' && <span className="text-cyan-400 text-xs">✓</span>}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick?.();
                }}
                className={`text-left px-2 py-1.5 rounded text-[10px] border transition-all ${getTierColor('pro', quota.tier === 'pro')}`}
              >
                <div className="font-semibold uppercase">Pro</div>
                <div className="text-[9px] text-gray-400">$29.99/mo</div>
                {quota.tier === 'pro' && <span className="text-cyan-400 text-xs">✓</span>}
              </button>
            </div>

            {/* Enterprise - Full Width */}
            <button
              onClick={() => {
                setIsOpen(false);
                onUpgradeClick?.();
              }}
              className={`w-full text-left px-2.5 py-2 rounded text-xs mb-1 border transition-all ${getTierColor('enterprise', quota.tier === 'enterprise')}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold uppercase">Enterprise</div>
                  <div className="text-[10px] text-gray-400">$99.99/mo</div>
                </div>
                {quota.tier === 'enterprise' && <span className="text-cyan-400">✓</span>}
              </div>
            </button>

            <div className="mt-2 pt-2 border-t border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onUpgradeClick?.();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 w-full"
              >
                <span>📊</span>
                <span>ดูรายละเอียดแพ็กเกจทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotaWidget;

