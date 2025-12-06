import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/subscriptionManager';
import { SubscriptionTier } from '../../types';
import './QuotaWidget.css';

interface QuotaData {
  tier: SubscriptionTier;
  creditsUsed: number;
  creditsTotal: number;
  percentage: number;
}

interface QuotaWidgetProps {
  onUpgradeClick?: () => void;
}

export const QuotaWidget: React.FC<QuotaWidgetProps> = ({ onUpgradeClick }) => {
  const { currentUser } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuota = React.useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      const data = await getUserSubscription(currentUser.uid);
      const creditsTotal = data.subscription.maxCredits === -1 
        ? Infinity 
        : data.subscription.maxCredits;
      
      setQuota({
        tier: data.subscription.tier,
        creditsUsed: data.monthlyUsage.creditsUsed,
        creditsTotal,
        percentage: creditsTotal === Infinity 
          ? 0 
          : (data.monthlyUsage.creditsUsed / creditsTotal) * 100,
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

  if (loading || !quota) return null;

  const isUnlimited = quota.creditsTotal === Infinity;
  const isLow = quota.percentage > 70;
  const isVeryLow = quota.percentage > 90;

  return (
    <div className={`quota-widget ${isVeryLow ? 'very-low' : isLow ? 'low' : ''}`}>
      <div className="quota-header">
        <span className={`tier-badge-mini tier-${quota.tier}`}>
          {quota.tier.toUpperCase()}
        </span>
        <div className="quota-info">
          {isUnlimited ? (
            <span className="unlimited-badge">∞ Unlimited</span>
          ) : (
            <>
              <span className="credits-count">
                {quota.creditsUsed}/{quota.creditsTotal}
              </span>
              <span className="credits-label">credits</span>
            </>
          )}
        </div>
      </div>
      
      {!isUnlimited && (
        <div className="quota-bar-mini-widget">
          <div 
            className={`quota-fill ${isVeryLow ? 'very-low' : isLow ? 'low' : ''}`}
            style={{ width: `${Math.min(quota.percentage, 100)}%` }}
          />
        </div>
      )}

      {isVeryLow && !isUnlimited && (
        <button className="upgrade-btn-mini" onClick={onUpgradeClick}>
          ⬆️ Upgrade
        </button>
      )}
    </div>
  );
};

export default QuotaWidget;
