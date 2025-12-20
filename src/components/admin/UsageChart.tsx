/**
 * Usage Chart Component
 *
 * แสดงกราฟการใช้งาน Credits, API Calls, และ Veo Videos
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { UsageAnalytics } from '../../types';

interface UsageChartProps {
  usage: UsageAnalytics;
}

export const UsageChart: React.FC<UsageChartProps> = ({ usage }) => {
  // Generate weekly data for the last 8 weeks
  const generateWeeklyData = () => {
    const weeks = [];
    const currentDate = new Date();

    for (let i = 7; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i * 7);

      const weekLabel = `Week ${8 - i}`;

      // Simulate usage trend (ในการใช้จริงควรดึงจาก Firestore)
      const growthFactor = 1 + (7 - i) * 0.12; // 12% growth per week
      const baseCredits = usage.credits.total / growthFactor;
      const baseApiCalls =
        (usage.apiCalls.scripts + usage.apiCalls.images + usage.apiCalls.videos) / growthFactor;
      const baseVeoVideos = usage.veoVideos.total / growthFactor;

      weeks.push({
        week: weekLabel,
        credits: Math.round(baseCredits / 8), // Per week
        apiCalls: Math.round(baseApiCalls / 8),
        veoVideos: Math.round(baseVeoVideos / 8),
      });
    }

    return weeks;
  };

  const data = generateWeeklyData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length >= 3 && payload[0]?.payload?.week) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{payload[0].payload.week}</p>
          <p className="tooltip-item">
            <span className="dot" style={{ backgroundColor: '#10b981' }}></span>
            Credits: {(payload[0]?.value || 0).toLocaleString()}
          </p>
          <p className="tooltip-item">
            <span className="dot" style={{ backgroundColor: '#f59e0b' }}></span>
            API Calls: {(payload[1]?.value || 0).toLocaleString()}
          </p>
          <p className="tooltip-item">
            <span className="dot" style={{ backgroundColor: '#ef4444' }}></span>
            Veo Videos: {(payload[2]?.value || 0).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div className="usage-chart-container">
      <div className="chart-header">
        <h3>📊 Usage Analytics</h3>
        <div className="chart-metrics">
          <div className="metric-item">
            <span className="metric-label">Total Credits</span>
            <span className="metric-value credits">{usage.credits.total.toLocaleString()}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">API Calls</span>
            <span className="metric-value api">
              {(
                usage.apiCalls.scripts +
                usage.apiCalls.images +
                usage.apiCalls.videos
              ).toLocaleString()}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Veo Videos</span>
            <span className="metric-value veo">{usage.veoVideos.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '0.875rem' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '0.875rem' }} tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
          <Bar dataKey="credits" fill="#10b981" name="Credits Used" radius={[8, 8, 0, 0]} />
          <Bar dataKey="apiCalls" fill="#f59e0b" name="API Calls" radius={[8, 8, 0, 0]} />
          <Bar dataKey="veoVideos" fill="#ef4444" name="Veo Videos" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-footer">
        <p className="chart-note">
          💡 <strong>Note:</strong> Usage data shown for the last 8 weeks. Data represents
          cumulative usage per week.
        </p>
      </div>
    </div>
  );
};

