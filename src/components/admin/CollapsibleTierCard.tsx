/**
 * Collapsible Tier Card Component
 *
 * การ์ด Tier ที่สามารถพับซ่อนได้ พร้อมไอคอนและรายละเอียดกำไร/ขาดทุน
 */

import React, { useState } from 'react';
import type { SubscriptionTier, TierUsageBreakdown } from '../../types';
import './CollapsibleTierCard.css';

interface CollapsibleTierCardProps {
  tier: SubscriptionTier;
  count: number;
  revenue: number;
  cost: number;
  breakdown: TierUsageBreakdown;
}

const TIER_CONFIG = {
  free: {
    label: 'FREE',
    icon: '🆓',
    color: '#95a5a6',
    gradient: 'linear-gradient(135deg, #bdc3c7, #95a5a6)',
  },
  basic: {
    label: 'BASIC',
    icon: '📦',
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #5dade2, #3498db)',
  },
  pro: {
    label: 'PRO',
    icon: '⭐',
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #bb8fce, #9b59b6)',
  },
  enterprise: {
    label: 'ENTERPRISE',
    icon: '🏢',
    color: '#f5576c',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
  },
};

export const CollapsibleTierCard: React.FC<CollapsibleTierCardProps> = ({
  tier,
  count,
  revenue,
  cost,
  breakdown,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = TIER_CONFIG[tier];
  const totalProfit =
    breakdown.text.profit +
    breakdown.images.profit +
    breakdown.videos.profit +
    breakdown.audio.profit;

  return (
    <div className="collapsible-tier-card">
      {/* Header (Clickable) */}
      <div
        className="tier-card-header"
        style={{ background: config.gradient }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="tier-header-left">
          <span className="tier-icon">{config.icon}</span>
          <div className="tier-info">
            <span className="tier-label">{config.label}</span>
            <span className="tier-user-count">{count} users</span>
          </div>
        </div>

        <div className="tier-header-right">
          <div className="tier-summary">
            <div className="tier-summary-item">
              <span className="summary-label">Rev:</span>
              <span className="summary-value revenue">฿{revenue.toLocaleString()}</span>
            </div>
            <div className="tier-summary-item">
              <span className="summary-label">Cost:</span>
              <span className="summary-value cost">฿{cost.toFixed(2)}</span>
            </div>
            <div className="tier-summary-item">
              <span className="summary-label">Profit:</span>
              <span
                className={`summary-value profit ${totalProfit >= 0 ? 'positive' : 'negative'}`}
              >
                ฿{totalProfit.toFixed(2)}
              </span>
            </div>
          </div>

          <button className="tier-collapse-btn">{isExpanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {/* Content (Collapsible) */}
      {isExpanded && (
        <div className="tier-card-content">
          {/* Text */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-icon">📝</span>
              <span className="breakdown-label">Text</span>
            </div>
            <div className="breakdown-stats">
              <div className="stat-item">
                <span className="stat-label">ครั้ง:</span>
                <span className="stat-value">{breakdown.text.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cost:</span>
                <span className="stat-value cost">฿{breakdown.text.cost.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue:</span>
                <span className="stat-value revenue">฿{breakdown.text.revenue.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit:</span>
                <span
                  className={`stat-value profit ${breakdown.text.profit >= 0 ? 'positive' : 'negative'}`}
                >
                  {breakdown.text.profit >= 0 ? '+' : ''}฿{breakdown.text.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-icon">🖼️</span>
              <span className="breakdown-label">Images</span>
            </div>
            <div className="breakdown-stats">
              <div className="stat-item">
                <span className="stat-label">ครั้ง:</span>
                <span className="stat-value">{breakdown.images.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cost:</span>
                <span className="stat-value cost">฿{breakdown.images.cost.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue:</span>
                <span className="stat-value revenue">฿{breakdown.images.revenue.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit:</span>
                <span
                  className={`stat-value profit ${breakdown.images.profit >= 0 ? 'positive' : 'negative'}`}
                >
                  {breakdown.images.profit >= 0 ? '+' : ''}฿{breakdown.images.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Videos */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-icon">🎬</span>
              <span className="breakdown-label">Videos</span>
            </div>
            <div className="breakdown-stats">
              <div className="stat-item">
                <span className="stat-label">ครั้ง:</span>
                <span className="stat-value">{breakdown.videos.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cost:</span>
                <span className="stat-value cost">฿{breakdown.videos.cost.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue:</span>
                <span className="stat-value revenue">฿{breakdown.videos.revenue.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit:</span>
                <span
                  className={`stat-value profit ${breakdown.videos.profit >= 0 ? 'positive' : 'negative'}`}
                >
                  {breakdown.videos.profit >= 0 ? '+' : ''}฿{breakdown.videos.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-icon">🎤</span>
              <span className="breakdown-label">Audio</span>
            </div>
            <div className="breakdown-stats">
              <div className="stat-item">
                <span className="stat-label">ครั้ง:</span>
                <span className="stat-value">{breakdown.audio.count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cost:</span>
                <span className="stat-value cost">฿{breakdown.audio.cost.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue:</span>
                <span className="stat-value revenue">฿{breakdown.audio.revenue.toFixed(2)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit:</span>
                <span
                  className={`stat-value profit ${breakdown.audio.profit >= 0 ? 'positive' : 'negative'}`}
                >
                  {breakdown.audio.profit >= 0 ? '+' : ''}฿{breakdown.audio.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
