/**
 * Overview Cards Component
 *
 * แสดง metrics สำคัญในรูปแบบ card แบบ 2 คอลัมน์
 * คอลัมน์ 1: ผู้ใช้ทั้งหมด / ต้นทุนผู้ใช้ / เอ็มอาร์อาร์ / เครดิตที่ใช้
 * คอลัมน์ 2: ผลรวมข้อความ / ผลรวมรูปภาพ / จำนวนวีดีโอรวม / พื้นที่จัดเก็บ
 */

import React from 'react';
import type { UserStats, RevenueMetrics, UsageAnalytics } from '../../types';

interface OverviewCardsProps {
  stats: UserStats;
  revenue: RevenueMetrics;
  usage: UsageAnalytics;
  averageCostPerUser?: number; // THB - from ProjectCostSummary
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  stats,
  revenue,
  usage,
  averageCostPerUser = 0,
}) => {
  return (
    <div className="overview-cards">
      {/* Column 1: User Metrics */}
      <div className="cards-column">
        {/* 1. ผู้ใช้ทั้งหมด - Total Users */}
        <div className="card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>ผู้ใช้ทั้งหมด</h3>
            <p className="card-value">{stats.total.toLocaleString()}</p>
            <p className="card-subtitle">
              Active: {stats.active} | New: {stats.new}
            </p>
          </div>
        </div>

        {/* 2. ต้นทุนผู้ใช้ - User Cost */}
        <div className="card">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <h3>ต้นทุนผู้ใช้</h3>
            <p className="card-value">
              ฿{averageCostPerUser.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="card-subtitle">Average cost per user</p>
          </div>
        </div>

        {/* 3. เอ็มอาร์อาร์ - MRR */}
        <div className="card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>เอ็มอาร์อาร์</h3>
            <p className="card-value">฿{revenue.mrr.toLocaleString()}</p>
            <p className="card-subtitle">ARPU: ฿{revenue.arpu.toFixed(2)}</p>
          </div>
        </div>

        {/* 4. เครดิตที่ใช้ - Credits Used */}
        <div className="card">
          <div className="card-icon">💳</div>
          <div className="card-content">
            <h3>เครดิตที่ใช้</h3>
            <p className="card-value">{usage.credits.total.toLocaleString()}</p>
            <p className="card-subtitle">Avg: {usage.credits.average.toFixed(0)} per user</p>
          </div>
        </div>
      </div>

      {/* Column 2: Generation Metrics */}
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

