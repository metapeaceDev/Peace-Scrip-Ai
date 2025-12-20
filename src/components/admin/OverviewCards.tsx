/**
 * Overview Cards Component
 *
 * แสดง metrics สำคัญในรูปแบบ 2 คอลัมน์
 * คอลัมน์ 1: แบ่งเป็น 2 แถว (แถวละ 3 การ์ด)
 * คอลัมน์ 2: Generation Metrics (Text, Audio, Images, Videos, Storage)
 */

import React from 'react';
import type { UserStats, RevenueMetrics, UsageAnalytics } from '../../types';

interface OverviewCardsProps {
  stats: UserStats;
  revenue: RevenueMetrics;
  usage: UsageAnalytics;
  averageCostPerUser?: number; // THB - from ProjectCostSummary
  totalCost?: number; // Total cost from tierMetrics
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  stats,
  revenue,
  usage,
  totalCost = 0,
}) => {
  const creditsUsed = usage.credits.total;
  const totalApiCalls = usage.apiCalls.scripts + usage.apiCalls.images + usage.apiCalls.videos + usage.apiCalls.audio;
  const totalProfit = revenue.mrr - totalCost;

  return (
    <div className="overview-cards">
      {/* Column 1: User & Financial Metrics (2 rows) */}
      <div className="cards-column column-split">
        {/* แถวที่ 1 */}
        <div className="cards-row-inline">
          {/* 1. ผู้ใช้ทั้งหมด */}
          <div className="card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h3>ผู้ใช้ทั้งหมด</h3>
              <p className="card-value">{stats.total.toLocaleString()}</p>
              <p className="card-subtitle">
                Active: {stats.active}<br />
                New: {stats.new}<br />
                <span className="online-badge">🟢 Online: {stats.online}</span>
              </p>
            </div>
          </div>

          {/* 2. เครดิตที่ใช้ */}
          <div className="card">
            <div className="card-icon">💳</div>
            <div className="card-content">
              <h3>เครดิตที่ใช้</h3>
              <p className="card-value">{creditsUsed.toLocaleString()}</p>
              <p className="card-subtitle">
                Avg: {usage.credits.average.toFixed(0)} per user<br />
                Total: {usage.credits.total.toLocaleString()} Monthly Credits
              </p>
            </div>
          </div>

          {/* 3. API Calls */}
          <div className="card">
            <div className="card-icon">🔌</div>
            <div className="card-content">
              <h3>API Calls</h3>
              <p className="card-value">{totalApiCalls.toLocaleString()}</p>
              <p className="card-subtitle">ปัจจุบัน</p>
            </div>
          </div>
        </div>

        {/* แถวที่ 2 */}
        <div className="cards-row-inline">
          {/* 1. Profit/Loss */}
          <div className={`card ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
            <div className="card-icon">{totalProfit >= 0 ? '📈' : '📉'}</div>
            <div className="card-content">
              <h3>Profit/Loss</h3>
              <p className="card-value" style={{ color: totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
                ฿{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </p>
              <p className="card-subtitle">Total</p>
            </div>
          </div>

          {/* 2. เอ็มอาร์อาร์ - MRR */}
          <div className="card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h3>เอ็มอาร์อาร์</h3>
              <p className="card-value">฿{revenue.mrr.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
              <p className="card-subtitle">
                ARPU: ฿{revenue.arpu.toFixed(2)}
              </p>
            </div>
          </div>

          {/* 3. ต้นทุนรวม */}
          <div className="card">
            <div className="card-icon">💵</div>
            <div className="card-content">
              <h3>ต้นทุนรวม</h3>
              <p className="card-value">
                ฿{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="card-subtitle">
                Total Cost
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Generation Metrics (Vertical Stack) */}
      <div className="cards-column">
        {/* 1. ผลรวมข้อความ - Total Text */}
        <div className="card">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <h3>ผลรวมข้อความ</h3>
            <p className="card-value">{usage.apiCalls.scripts.toLocaleString()}</p>
            <p className="card-subtitle">Text generations</p>
          </div>
        </div>

        {/* 2. ผลรวมเสียง - Total Audio */}
        <div className="card">
          <div className="card-icon">🎤</div>
          <div className="card-content">
            <h3>ผลรวมเสียง</h3>
            <p className="card-value">{usage.apiCalls.audio.toLocaleString()}</p>
            <p className="card-subtitle">Audio generations</p>
          </div>
        </div>

        {/* 3. ผลรวมรูปภาพ - Total Images */}
        <div className="card">
          <div className="card-icon">🖼️</div>
          <div className="card-content">
            <h3>ผลรวมรูปภาพ</h3>
            <p className="card-value">{usage.apiCalls.images.toLocaleString()}</p>
            <p className="card-subtitle">Images generated</p>
          </div>
        </div>

        {/* 4. จำนวนวีดีโอรวม - Total Videos */}
        <div className="card">
          <div className="card-icon">🎬</div>
          <div className="card-content">
            <h3>จำนวนวีดีโอรวม</h3>
            <p className="card-value">
              {(usage.apiCalls.videos + usage.veoVideos.total).toLocaleString()}
            </p>
            <p className="card-subtitle">
              Veo3: {usage.veoVideos.total} | Other: {usage.apiCalls.videos}
            </p>
          </div>
        </div>

        {/* 5. พื้นที่จัดเก็บ - Storage */}
        <div className="card">
          <div className="card-icon">💾</div>
          <div className="card-content">
            <h3>พื้นที่จัดเก็บ</h3>
            <p className="card-value">{usage.storage.totalGB.toFixed(2)} GB</p>
            <p className="card-subtitle">
              Used: {usage.storage.totalGB.toFixed(2)} GB | Remaining:{' '}
              {usage.storage.remainingGB.toFixed(2)} GB | Total: {usage.storage.limitGB.toFixed(2)}{' '}
              GB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

