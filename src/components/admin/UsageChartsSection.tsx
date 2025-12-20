/**
 * Usage Charts Section Component
 *
 * แสดงกราฟ Analytics ต่างๆ แทนตัวเลขเปล่าๆ
 */

import React from 'react';
import type { UsageAnalytics } from '../../types';
import './UsageChartsSection.css';

interface UsageChartsSectionProps {
  usage: UsageAnalytics;
}

export const UsageChartsSection: React.FC<UsageChartsSectionProps> = ({ usage }) => {
  // Calculate totals and percentages
  const totalGenerations =
    usage.apiCalls.scripts + usage.apiCalls.images + usage.apiCalls.videos + usage.apiCalls.audio;

  const textPercent = totalGenerations > 0 ? (usage.apiCalls.scripts / totalGenerations) * 100 : 0;
  const imagePercent = totalGenerations > 0 ? (usage.apiCalls.images / totalGenerations) * 100 : 0;
  const videoPercent =
    totalGenerations > 0
      ? ((usage.apiCalls.videos + usage.veoVideos.total) / totalGenerations) * 100
      : 0;
  const audioPercent = totalGenerations > 0 ? (usage.apiCalls.audio / totalGenerations) * 100 : 0;

  // Credits by tier data
  const tierData = [
    {
      tier: 'Free',
      credits: usage.credits.byTier.free,
      color: '#94a3b8',
      icon: '🆓',
    },
    {
      tier: 'Basic',
      credits: usage.credits.byTier.basic,
      color: '#10b981',
      icon: '📦',
    },
    {
      tier: 'Pro',
      credits: usage.credits.byTier.pro,
      color: '#3b82f6',
      icon: '⭐',
    },
    {
      tier: 'Enterprise',
      credits: usage.credits.byTier.enterprise,
      color: '#8b5cf6',
      icon: '👑',
    },
  ];

  const maxCredits = Math.max(...tierData.map(t => t.credits), 1);

  return (
    <div className="usage-charts-section">
      <h3>📊 Usage Analytics Overview</h3>

      <div className="charts-grid">
        {/* Chart 1: API Generations by Type */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>🎨 API Generations by Type</h4>
            <p className="chart-subtitle">Total: {totalGenerations.toLocaleString()}</p>
          </div>

          <div className="horizontal-bar-chart">
            {/* Text */}
            <div className="bar-row">
              <div className="bar-label">
                <span className="bar-icon">📝</span>
                <span className="bar-name">Text</span>
              </div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${textPercent}%`,
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  }}
                >
                  <span className="bar-value">{usage.apiCalls.scripts}</span>
                </div>
              </div>
              <div className="bar-percent">{textPercent.toFixed(1)}%</div>
            </div>

            {/* Images */}
            <div className="bar-row">
              <div className="bar-label">
                <span className="bar-icon">🖼️</span>
                <span className="bar-name">Images</span>
              </div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${imagePercent}%`,
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                  }}
                >
                  <span className="bar-value">{usage.apiCalls.images}</span>
                </div>
              </div>
              <div className="bar-percent">{imagePercent.toFixed(1)}%</div>
            </div>

            {/* Videos */}
            <div className="bar-row">
              <div className="bar-label">
                <span className="bar-icon">🎬</span>
                <span className="bar-name">Videos</span>
              </div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${videoPercent}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                  }}
                >
                  <span className="bar-value">
                    {usage.apiCalls.videos + usage.veoVideos.total}
                  </span>
                </div>
              </div>
              <div className="bar-percent">{videoPercent.toFixed(1)}%</div>
            </div>

            {/* Audio */}
            <div className="bar-row">
              <div className="bar-label">
                <span className="bar-icon">🎤</span>
                <span className="bar-name">Audio</span>
              </div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${audioPercent}%`,
                    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                  }}
                >
                  <span className="bar-value">{usage.apiCalls.audio}</span>
                </div>
              </div>
              <div className="bar-percent">{audioPercent.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Chart 2: Credits Usage by Tier */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>💳 Credits Usage by Tier</h4>
            <p className="chart-subtitle">Total: {usage.credits.total.toLocaleString()}</p>
          </div>

          <div className="horizontal-bar-chart">
            {tierData.map(tier => {
              const percentage = (tier.credits / maxCredits) * 100;
              return (
                <div key={tier.tier} className="bar-row">
                  <div className="bar-label">
                    <span className="bar-icon">{tier.icon}</span>
                    <span className="bar-name">{tier.tier}</span>
                  </div>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${percentage}%`,
                        background: tier.color,
                      }}
                    >
                      <span className="bar-value">{tier.credits.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bar-percent">
                    {tier.credits > 0
                      ? ((tier.credits / usage.credits.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Storage Usage */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>💾 Storage Usage</h4>
            <p className="chart-subtitle">
              {usage.storage.totalGB.toFixed(2)} GB / {usage.storage.limitGB.toFixed(2)} GB
            </p>
          </div>

          <div className="storage-chart">
            <div className="storage-bar-wrapper">
              <div
                className="storage-bar-used"
                style={{
                  width: `${(usage.storage.totalGB / usage.storage.limitGB) * 100}%`,
                }}
              ></div>
              <div className="storage-labels">
                <span className="storage-label-used">
                  Used: {usage.storage.totalGB.toFixed(2)} GB
                </span>
                <span className="storage-label-remaining">
                  Remaining: {usage.storage.remainingGB.toFixed(2)} GB
                </span>
              </div>
            </div>

            <div className="storage-stats">
              <div className="storage-stat">
                <span className="stat-label">Average per User</span>
                <span className="stat-value">{usage.storage.average.toFixed(3)} GB</span>
              </div>
              <div className="storage-stat">
                <span className="stat-label">Total Limit</span>
                <span className="stat-value">{usage.storage.limitGB.toFixed(2)} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 4: Top Veo Video Users */}
        {usage.veoVideos.byUser.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>🎥 Top Veo3 Video Users</h4>
              <p className="chart-subtitle">Total: {usage.veoVideos.total} videos</p>
            </div>

            <div className="top-users-list">
              {usage.veoVideos.byUser.slice(0, 5).map((user, idx) => {
                const maxCount = usage.veoVideos.byUser[0]?.count || 1;
                const percentage = (user.count / maxCount) * 100;

                return (
                  <div key={user.userId} className="user-row">
                    <div className="user-rank">#{idx + 1}</div>
                    <div className="user-info">
                      <span className="user-email">{user.email}</span>
                      <div className="user-bar">
                        <div
                          className="user-bar-fill"
                          style={{
                            width: `${percentage}%`,
                            background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="user-count">{user.count} videos</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
