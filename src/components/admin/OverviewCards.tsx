/**
 * Overview Cards Component
 * 
 * แสดง metrics สำคัญในรูปแบบ card
 */

import React from 'react';
import type { UserStats, RevenueMetrics, UsageAnalytics } from '../../../types';

interface OverviewCardsProps {
  stats: UserStats;
  revenue: RevenueMetrics;
  usage: UsageAnalytics;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ stats, revenue, usage }) => {
  return (
    <div className="overview-cards">
      <div className="card">
        <div className="card-icon">👥</div>
        <div className="card-content">
          <h3>Total Users</h3>
          <p className="card-value">{stats.total.toLocaleString()}</p>
          <p className="card-subtitle">
            Active: {stats.active} | New: {stats.new}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">💰</div>
        <div className="card-content">
          <h3>MRR</h3>
          <p className="card-value">฿{revenue.mrr.toLocaleString()}</p>
          <p className="card-subtitle">
            ARPU: ฿{revenue.arpu.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">💳</div>
        <div className="card-content">
          <h3>Credits Used</h3>
          <p className="card-value">{usage.credits.total.toLocaleString()}</p>
          <p className="card-subtitle">
            Avg: {usage.credits.average.toFixed(0)} per user
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">🎬</div>
        <div className="card-content">
          <h3>Veo Videos</h3>
          <p className="card-value">{usage.veoVideos.total}</p>
          <p className="card-subtitle">
            {usage.veoVideos.byUser.length} users
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">📞</div>
        <div className="card-content">
          <h3>API Calls</h3>
          <p className="card-value">{(usage.apiCalls.scripts + usage.apiCalls.images + usage.apiCalls.videos).toLocaleString()}</p>
          <p className="card-subtitle">
            S:{usage.apiCalls.scripts} I:{usage.apiCalls.images} V:{usage.apiCalls.videos}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-icon">💾</div>
        <div className="card-content">
          <h3>Storage</h3>
          <p className="card-value">{usage.storage.totalGB.toFixed(2)} GB</p>
          <p className="card-subtitle">
            Avg: {usage.storage.average.toFixed(2)} GB
          </p>
        </div>
      </div>
    </div>
  );
};
