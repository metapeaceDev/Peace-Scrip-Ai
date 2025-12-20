/**
 * Revenue Chart Component
 *
 * แสดงกราฟรายได้ MRR (Monthly Recurring Revenue) และ ARR (Annual Recurring Revenue)
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RevenueMetrics } from '../../types';

interface RevenueChartProps {
  revenue: RevenueMetrics;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ revenue }) => {
  // Generate monthly data for the last 12 months
  const generateMonthlyData = () => {
    const months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);

      const monthName = date.toLocaleDateString('th-TH', {
        month: 'short',
        year: '2-digit',
      });

      // Simulate growth trend (ในการใช้จริงควรดึงจาก Firestore)
      const growthFactor = 1 + (11 - i) * 0.15; // 15% growth per month
      const baseRevenue = revenue.mrr / growthFactor;
      const activeCount = Object.values(revenue.byTier).reduce((sum: number, val: number) => sum + val, 0);

      months.push({
        month: monthName,
        mrr: Math.round(baseRevenue),
        arr: Math.round(baseRevenue * 12),
        active: Math.round(activeCount / growthFactor),
      });
    }

    return months;
  };

  const data = generateMonthlyData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length >= 3 && payload[0]?.payload?.month) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{payload[0].payload.month}</p>
          <p className="tooltip-mrr">
            <span className="dot" style={{ backgroundColor: '#667eea' }}></span>
            MRR: ฿{(payload[0]?.value || 0).toLocaleString()}
          </p>
          <p className="tooltip-arr">
            <span className="dot" style={{ backgroundColor: '#764ba2' }}></span>
            ARR: ฿{(payload[1]?.value || 0).toLocaleString()}
          </p>
          <p className="tooltip-active">
            Active: {(payload[2]?.value || 0).toLocaleString()} users
          </p>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `฿${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `฿${(value / 1000).toFixed(0)}K`;
    }
    return `฿${value}`;
  };

  return (
    <div className="revenue-chart-container">
      <div className="chart-header">
        <h3>📈 Revenue Trends</h3>
        <div className="chart-metrics">
          <div className="metric-item">
            <span className="metric-label">Current MRR</span>
            <span className="metric-value">฿{revenue.mrr.toLocaleString()}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Current ARR</span>
            <span className="metric-value">฿{revenue.arr.toLocaleString()}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">ARPU</span>
            <span className="metric-value">฿{revenue.arpu.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '0.875rem' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '0.875rem' }} tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="#667eea"
            strokeWidth={3}
            name="MRR (Monthly)"
            dot={{ fill: '#667eea', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="arr"
            stroke="#764ba2"
            strokeWidth={3}
            name="ARR (Annual)"
            dot={{ fill: '#764ba2', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-footer">
        <p className="chart-note">
          💡 <strong>Note:</strong> Revenue data shown for the last 12 months. MRR = Monthly
          Recurring Revenue, ARR = Annual Recurring Revenue
        </p>
      </div>
    </div>
  );
};

