import React, { useState, useEffect } from 'react';
import { getUserSubscription, setUserTier } from '../services/userStore';
import { SubscriptionTier } from '../types';

interface UserStatusProps {
  embedded?: boolean; // Optional: use inline mode for Settings panel
  compact?: boolean; // Optional: use compact mode for top header
}

/**
 * UserStatus Component - Global subscription status widget
 * Displays current plan, credits, storage, and allows plan switching (demo mode)
 * Modes: floating (default), embedded (Settings panel), compact (header)
 */
const UserStatus: React.FC<UserStatusProps> = ({ embedded = false, compact = false }) => {
  const [subscription, setSubscription] = useState(getUserSubscription());
  const [isOpen, setIsOpen] = useState(false);

  // Update local state when store changes
  useEffect(() => {
    const interval = setInterval(() => {
      setSubscription(getUserSubscription());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTierChange = (tier: SubscriptionTier) => {
    setUserTier(tier);
    setSubscription(getUserSubscription());
    setIsOpen(false);
  };

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-600';
      case 'basic':
        return 'bg-blue-600';
      case 'pro':
        return 'bg-purple-600';
      case 'enterprise':
        return 'bg-gradient-to-r from-yellow-600 to-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getTierPrice = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'ฟรี';
      case 'basic':
        return '฿299/เดือน';
      case 'pro':
        return '฿999/เดือน';
      case 'enterprise':
        return 'ติดต่อ';
      default:
        return '';
    }
  };

  const getStorageUsed = () => {
    // Mock calculation (in real app, track actual usage from Firebase Storage)
    return '34.86 MB';
  };

  // Compact mode: minimal display for top header
  if (compact) {
    const creditsPercent = (subscription.credits / subscription.maxCredits) * 100;
    const tierColor =
      subscription.tier === 'enterprise'
        ? 'from-yellow-400 to-orange-400'
        : subscription.tier === 'pro'
          ? 'from-purple-400 to-pink-400'
          : subscription.tier === 'basic'
            ? 'from-blue-400 to-cyan-400'
            : 'from-gray-400 to-gray-500';

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded transition-all bg-gray-900/30 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600"
          title="View Plan Details"
        >
          <span
            className={`text-xs font-bold uppercase bg-gradient-to-r ${tierColor} bg-clip-text text-transparent`}
          >
            {subscription.tier}
          </span>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Credits:</span>
            <span className="text-white font-mono">{subscription.credits}</span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 z-50 animate-fade-in-up">
            {/* Current Plan Info */}
            <div className="border-b border-gray-700 pb-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-xl font-bold uppercase bg-gradient-to-r ${tierColor} bg-clip-text text-transparent`}
                >
                  {subscription.tier}
                </span>
                <span className="text-xs text-gray-400">{getTierPrice(subscription.tier)}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Credits:</span>
                  <span className="text-white font-mono">
                    {subscription.credits}/{subscription.maxCredits}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${creditsPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400">Storage:</span>
                  <span className="text-white font-mono">
                    {getStorageUsed()} / {subscription.features.storageLimit} GB
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="bg-gray-700/50 p-2 rounded text-center">
                <div className="text-gray-400 mb-1">Projects</div>
                <div className="text-white font-bold">
                  3/
                  {subscription.features.maxProjects === Infinity
                    ? '∞'
                    : subscription.features.maxProjects}
                </div>
              </div>
              <div className="bg-gray-700/50 p-2 rounded text-center">
                <div className="text-gray-400 mb-1">Generated</div>
                <div className="text-white font-bold">247</div>
              </div>
              <div className="bg-gray-700/50 p-2 rounded text-center">
                <div className="text-gray-400 mb-1">Exports</div>
                <div className="text-white font-bold">12</div>
              </div>
            </div>

            {/* Plan Selector */}
            <div className="text-xs text-gray-400 mb-2 font-semibold">Switch Plan (Demo):</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTierChange('free')}
                className={`py-2 px-3 rounded text-xs font-bold transition ${
                  subscription.tier === 'free'
                    ? 'bg-gray-600 text-white ring-2 ring-cyan-500'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
                }`}
              >
                🆓 Free
              </button>
              <button
                onClick={() => handleTierChange('pro')}
                className={`py-2 px-3 rounded text-xs font-bold transition ${
                  subscription.tier === 'pro'
                    ? 'bg-purple-600 text-white ring-2 ring-cyan-500'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ⭐ Pro
              </button>
              <button
                onClick={() => handleTierChange('enterprise')}
                className={`py-2 px-3 rounded text-xs font-bold transition col-span-2 ${
                  subscription.tier === 'enterprise'
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white ring-2 ring-cyan-500'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
                }`}
              >
                🚀 Enterprise
              </button>
            </div>
            <div className="mt-3 text-center text-xs text-gray-500">
              💡 Demo mode - no real billing
            </div>
          </div>
        )}
      </div>
    );
  }

  // Embedded mode: inline display for Settings panel
  if (embedded) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        {/* Current Plan Info */}
        <div className="border-b border-gray-700 pb-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span
              className={`text-xl font-bold uppercase ${
                subscription.tier === 'enterprise'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'
                  : 'text-cyan-400'
              }`}
            >
              {subscription.tier}
            </span>
            <span className="text-sm text-gray-400">{getTierPrice(subscription.tier)}</span>
          </div>
          {subscription.tier !== 'free' && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">API Credits:</span>
                <span className="text-white font-mono">
                  {subscription.credits}/{subscription.maxCredits}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${(subscription.credits / subscription.maxCredits) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-400">Cloud Storage:</span>
                <span className="text-white font-mono">
                  {getStorageUsed()} / {subscription.features.storageLimit} GB
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: '13.8%' }} // Mock: 34.86 MB / 256 MB
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-gray-800/50 p-3 rounded text-center">
            <div className="text-gray-400 mb-1">Projects</div>
            <div className="text-white font-bold">
              3/
              {subscription.features.maxProjects === Infinity
                ? '∞'
                : subscription.features.maxProjects}
            </div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded text-center">
            <div className="text-gray-400 mb-1">Generated</div>
            <div className="text-white font-bold">247</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded text-center">
            <div className="text-gray-400 mb-1">Export</div>
            <div className="text-white font-bold">12</div>
          </div>
        </div>

        {/* Plan Selector */}
        <div className="text-xs text-gray-400 mb-2 font-semibold">Switch Plan (Demo):</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTierChange('free')}
            className={`py-2 px-3 rounded text-xs font-bold transition ${
              subscription.tier === 'free'
                ? 'bg-gray-600 text-white ring-2 ring-cyan-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🆓 Free
          </button>
          <button
            onClick={() => handleTierChange('pro')}
            className={`py-2 px-3 rounded text-xs font-bold transition ${
              subscription.tier === 'pro'
                ? 'bg-purple-600 text-white ring-2 ring-cyan-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⭐ Pro
          </button>
          <button
            onClick={() => handleTierChange('enterprise')}
            className={`py-2 px-3 rounded text-xs font-bold transition col-span-2 ${
              subscription.tier === 'enterprise'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white ring-2 ring-cyan-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🚀 Enterprise
          </button>
        </div>
        <div className="mt-3 text-center text-xs text-gray-500">
          💡 This is demo mode - no real billing
        </div>
      </div>
    );
  }

  // Floating widget mode (default)
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 mb-2 w-80 animate-fade-in-up">
          {/* Current Plan Info */}
          <div className="border-b border-gray-700 pb-3 mb-3">
            <div className="text-sm font-bold text-white mb-1">Current Plan</div>
            <div className="flex justify-between items-center mb-2">
              <span
                className={`text-lg font-bold uppercase ${
                  subscription.tier === 'enterprise'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'
                    : 'text-cyan-400'
                }`}
              >
                {subscription.tier}
              </span>
              <span className="text-xs text-gray-400">{getTierPrice(subscription.tier)}</span>
            </div>
            {subscription.tier !== 'free' && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Credits:</span>
                  <span className="text-white font-mono">
                    {subscription.credits}/{subscription.maxCredits}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(subscription.credits / subscription.maxCredits) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400">Storage:</span>
                  <span className="text-white font-mono">
                    {getStorageUsed()} / {subscription.features.storageLimit} GB
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">โปรเจกต์</div>
              <div className="text-white font-bold">
                {subscription.features.maxProjects === -1
                  ? 'Unlimited'
                  : `${subscription.features.maxProjects}`}
              </div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">ความละเอียด</div>
              <div className="text-white font-bold">{subscription.features.maxResolution}</div>
            </div>
          </div>

          {/* Plan Selector (Demo Mode) */}
          <div className="text-xs text-gray-400 mb-2">Change Plan (Demo Mode)</div>
          {(['free', 'basic', 'pro', 'enterprise'] as SubscriptionTier[]).map(tier => (
            <button
              key={tier}
              onClick={() => handleTierChange(tier)}
              className={`w-full text-left px-3 py-2.5 rounded text-sm mb-1 hover:bg-gray-800 transition-all ${
                subscription.tier === tier
                  ? 'bg-gray-700 border border-cyan-500'
                  : 'bg-gray-800/50 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold uppercase text-white">{tier}</span>
                <span className="text-xs text-gray-400">{getTierPrice(tier)}</span>
              </div>
            </button>
          ))}

          {/* Upgrade CTA (for Free/Basic users) */}
          {(subscription.tier === 'free' || subscription.tier === 'basic') && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <a
                href="#/pricing"
                className="block w-full text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                🚀 Upgrade Now
              </a>
            </div>
          )}
        </div>
      )}

      {/* Compact Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${getTierColor(subscription.tier)} text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm font-semibold`}
      >
        <span className="uppercase">{subscription.tier}</span>
        {subscription.tier !== 'free' && (
          <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {subscription.credits}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default UserStatus;
