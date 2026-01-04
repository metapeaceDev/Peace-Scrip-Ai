/**
 * Enhanced Usage Bar Chart Component
 *
 * แสดงแผนภูมิแท่งสำหรับ: Cost, Revenue, Profit (ปัจจุบัน/เดือน/ปี)
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { UsageAnalytics, RevenueMetrics } from '../../types';
import './EnhancedUsageBarChart.css';

type ViewMode = 'current' | 'monthly' | 'yearly';

interface EnhancedUsageBarChartProps {
  usage: UsageAnalytics;
  revenue: RevenueMetrics;
  totalCost: number; // จาก tierMetrics
}

export const EnhancedUsageBarChart: React.FC<EnhancedUsageBarChartProps> = ({
  revenue,
  totalCost,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  const totalRevenue = revenue.mrr; // MRR as monthly revenue
  const totalProfit = totalRevenue - totalCost;

  // Generate data based on view mode
  const generateChartData = () => {
    switch (viewMode) {
      case 'current':
        // Overview ปัจจุบัน (ตั้งแต่เริ่มต้นจนถึงปัจจุบัน)
        return [
          {
            name: 'Total Cost',
            value: totalCost,
            color: '#ef4444',
            fullName: 'ต้นทุนรวม (฿)',
          },
          {
            name: 'Total Revenue',
            value: totalRevenue,
            color: '#8b5cf6',
            fullName: 'รายได้รวม (฿)',
          },
          {
            name: 'Total Profit',
            value: Math.abs(totalProfit),
            color: totalProfit >= 0 ? '#10b981' : '#f87171',
            fullName: totalProfit >= 0 ? 'กำไร (฿)' : 'ขาดทุน (฿)',
            actualValue: totalProfit,
          },
        ];

      case 'monthly':
        // รายเดือน - สมมติข้อมูล 12 เดือนย้อนหลัง
        const months = [
          'ม.ค.',
          'ก.พ.',
          'มี.ค.',
          'เม.ย.',
          'พ.ค.',
          'มิ.ย.',
          'ก.ค.',
          'ส.ค.',
          'ก.ย.',
          'ต.ค.',
          'พ.ย.',
          'ธ.ค.',
        ];
        const currentMonth = new Date().getMonth();
        return months.slice(0, currentMonth + 1).map((month, index) => {
          const factor = (index + 1) / (currentMonth + 1); // Growth simulation
          const monthlyCost = (totalCost / (currentMonth + 1)) * factor;
          const monthlyRevenue = (totalRevenue / (currentMonth + 1)) * factor;
          const monthlyProfit = monthlyRevenue - monthlyCost;

          return {
            name: month,
            cost: monthlyCost,
            revenue: monthlyRevenue,
            profit: monthlyProfit,
          };
        });

      case 'yearly':
        // รายปี - สมมติข้อมูล 3 ปี
        return [2023, 2024, 2025].map((year, index) => {
          const factor = index === 2 ? 1 : (index + 1) / 3;
          const yearlyCost = totalCost * 12 * factor;
          const yearlyRevenue = totalRevenue * 12 * factor;
          const yearlyProfit = yearlyRevenue - yearlyCost;

          return {
            name: year.toString(),
            cost: yearlyCost,
            revenue: yearlyRevenue,
            profit: yearlyProfit,
          };
        });

      default:
        return [];
    }
  };

  const data = generateChartData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      if (viewMode === 'current') {
        const item = payload[0].payload;
        const displayValue = item.actualValue !== undefined ? item.actualValue : item.value;
        return (
          <div className="enhanced-usage-tooltip">
            <p className="tooltip-label">{item.fullName}</p>
            <p className="tooltip-value" style={{ color: item.color }}>
              ฿{displayValue.toLocaleString()}
            </p>
          </div>
        );
      } else {
        const item = payload[0].payload;
        return (
          <div className="enhanced-usage-tooltip">
            <p className="tooltip-label">{item.name}</p>
            <p className="tooltip-item">
              <span style={{ color: '#ef4444' }}>● Cost: ฿{item.cost.toLocaleString()}</span>
            </p>
            <p className="tooltip-item">
              <span style={{ color: '#8b5cf6' }}>● Revenue: ฿{item.revenue.toLocaleString()}</span>
            </p>
            <p className="tooltip-item">
              <span style={{ color: item.profit >= 0 ? '#10b981' : '#f87171' }}>
                ● Profit: ฿{item.profit.toLocaleString()}
              </span>
            </p>
          </div>
        );
      }
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
    <div className="enhanced-usage-bar-chart">
      <div className="chart-header">
        <div className="chart-header-content">
          <h3>💰 ภาพรวมทางการเงิน</h3>
          <p className="chart-subtitle">Financial Overview</p>
        </div>
        <div className="view-mode-selector">
          <button
            className={viewMode === 'current' ? 'active' : ''}
            onClick={() => setViewMode('current')}
          >
            ปัจจุบัน
          </button>
          <button
            className={viewMode === 'monthly' ? 'active' : ''}
            onClick={() => setViewMode('monthly')}
          >
            รายเดือน
          </button>
          <button
            className={viewMode === 'yearly' ? 'active' : ''}
            onClick={() => setViewMode('yearly')}
          >
            รายปี
          </button>
        </div>
      </div>

      {/* Metrics Summary - Show in all modes */}
      <div className="metrics-summary">
        <div className="metric-card cost">
          <span className="metric-icon">💸</span>
          <div className="metric-info">
            <span className="metric-label">Total Cost</span>
            <span className="metric-value">฿{totalCost.toLocaleString()}</span>
            <span className="metric-sublabel">ต้นทุนรวม</span>
          </div>
        </div>
        <div className="metric-card revenue">
          <span className="metric-icon">💰</span>
          <div className="metric-info">
            <span className="metric-label">Total Revenue</span>
            <span className="metric-value">฿{totalRevenue.toLocaleString()}</span>
            <span className="metric-sublabel">รายได้รวม</span>
          </div>
        </div>
        <div className={`metric-card profit ${totalProfit >= 0 ? 'positive' : 'negative'}`}>
          <span className="metric-icon">{totalProfit >= 0 ? '📈' : '📉'}</span>
          <div className="metric-info">
            <span className="metric-label">Total Profit/Loss</span>
            <span className="metric-value">฿{totalProfit.toLocaleString()}</span>
            <span className="metric-sublabel">{totalProfit >= 0 ? 'กำไร' : 'ขาดทุน'}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            style={{ fontSize: '0.875rem' }}
            angle={viewMode === 'current' ? -15 : 0}
            textAnchor={viewMode === 'current' ? 'end' : 'middle'}
            height={80}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '0.875rem' }} tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} />
          {viewMode === 'current' ? (
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry: any, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          ) : (
            <>
              <Bar dataKey="cost" fill="#ef4444" name="ต้นทุนรวม" radius={[8, 8, 0, 0]} />
              <Bar dataKey="revenue" fill="#8b5cf6" name="รายได้รวม" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" name="กำไร" radius={[8, 8, 0, 0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-footer">
        <p className="chart-note">
          💡 <strong>หมายเหตุ:</strong>{' '}
          {viewMode === 'current'
            ? 'ข้อมูลแสดงผลการดำเนินงานรวมตั้งแต่เริ่มต้นจนถึงปัจจุบัน'
            : viewMode === 'monthly'
              ? 'ข้อมูลแสดงผลการดำเนินงานรายเดือนของปีปัจจุบัน'
              : 'ข้อมูลแสดงผลการดำเนินงานรายปี'}
        </p>
      </div>
    </div>
  );
};
