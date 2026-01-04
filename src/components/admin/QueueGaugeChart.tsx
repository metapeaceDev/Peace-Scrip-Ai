/**
 * Queue Gauge Chart Component
 *
 * แสดงแผนภาพครึ่งวงกลมคิวงาน (Gauge Chart) พร้อมรายละเอียดคิวแยกตามสถานะ
 */

import React from 'react';
import type { QueueMetrics } from '../../types';
import './QueueGaugeChart.css';

interface QueueGaugeChartProps {
  metrics: QueueMetrics;
}

export const QueueGaugeChart: React.FC<QueueGaugeChartProps> = ({ metrics }) => {
  const {
    completed,
    processing,
    queued,
    total,
    completedPercentage,
    processingPercentage,
    queuedPercentage,
  } = metrics;

  // คำนวณมุมสำหรับ gauge (180 degrees = 100%)
  const completedAngle = (completedPercentage / 100) * 180;
  const processingAngle = (processingPercentage / 100) * 180;
  const queuedAngle = (queuedPercentage / 100) * 180;

  // คำนวณตำแหน่งเข็ม (pointer)
  const pointerAngle = -90 + (completedPercentage / 100) * 180; // -90 to 90 degrees

  return (
    <div className="queue-gauge-container">
      <h3 className="gauge-title">📊 คิวงานรวม (Real-time)</h3>

      {/* Gauge Chart */}
      <div className="gauge-chart">
        <svg className="gauge-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Completed arc (green) */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#10b981"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${completedAngle} 180`}
            className="gauge-arc-completed"
          />

          {/* Processing arc (red) */}
          {processing > 0 && (
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${processingAngle} 180`}
              strokeDashoffset={`-${completedAngle}`}
              className="gauge-arc-processing"
            />
          )}

          {/* Queued arc (yellow) */}
          {queued > 0 && (
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${queuedAngle} 180`}
              strokeDashoffset={`-${completedAngle + processingAngle}`}
              className="gauge-arc-queued"
            />
          )}

          {/* Center text - improved layout with proper positioning */}
          <text x="100" y="60" textAnchor="middle" className="gauge-total-value">
            {total}
          </text>
          <text x="100" y="84" textAnchor="middle" className="gauge-percentage">
            {completedPercentage.toFixed(1)}%
          </text>
          <text x="100" y="98" textAnchor="middle" className="gauge-total-label">
            งานทั้งหมด
          </text>

          {/* Pointer (needle) */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="40"
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${pointerAngle} 100 100)`}
            className="gauge-pointer"
          />
          <circle cx="100" cy="100" r="5" fill="#374151" />
        </svg>

        {/* Percentage display */}
        <div className="gauge-percentage">{completedPercentage.toFixed(1)}%</div>
      </div>

      {/* Queue Details (3 columns) */}
      <div className="queue-details">
        {/* Completed Column */}
        <div className="queue-column completed-column">
          <div className="column-icon">✅</div>
          <div className="column-label">เสร็จแล้ว</div>
          <div className="column-value">{completed}</div>
          <div className="column-bar">
            <div
              className="column-bar-fill completed-bar"
              style={{ width: `${completedPercentage}%` }}
            />
          </div>
          <div className="column-percentage">{completedPercentage.toFixed(1)}%</div>
        </div>

        {/* Processing Column */}
        <div className="queue-column processing-column">
          <div className="column-icon">⚙️</div>
          <div className="column-label">กำลังทำ</div>
          <div className="column-value">{processing}</div>
          <div className="column-bar">
            <div
              className="column-bar-fill processing-bar"
              style={{ width: `${processingPercentage}%` }}
            />
          </div>
          <div className="column-percentage">{processingPercentage.toFixed(1)}%</div>
        </div>

        {/* Queued Column */}
        <div className="queue-column queued-column">
          <div className="column-icon">⏳</div>
          <div className="column-label">รอคิว</div>
          <div className="column-value">{queued}</div>
          <div className="column-bar">
            <div className="column-bar-fill queued-bar" style={{ width: `${queuedPercentage}%` }} />
          </div>
          <div className="column-percentage">{queuedPercentage.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};
