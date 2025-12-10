import React, { useState, useEffect } from 'react';
import './UsageDashboard.css';

/**
 * Usage Dashboard - Track AI generation costs and savings
 * 
 * Features:
 * - Real-time cost tracking (Cloud vs Open Source)
 * - Provider usage breakdown
 * - Cost savings visualization
 * - Recommendations for optimization
 * - Monthly/Weekly statistics
 */

interface UsageStats {
  totalProjects: number;
  cloudProjects: number;
  openSourceProjects: number;
  hybridProjects: number;
  totalCost: number;
  potentialCost: number; // If all were cloud
  savings: number;
  savingsPercent: number;
}

interface ProviderBreakdown {
  provider: 'cloud' | 'open-source' | 'hybrid';
  count: number;
  cost: number;
  avgTime: number; // seconds
}

interface GenerationHistory {
  id: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
  provider: 'cloud' | 'open-source' | 'hybrid';
  model: string;
  cost: number;
  duration: number;
  quality: number; // 1-5 stars
}

export const UsageDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [stats, setStats] = useState<UsageStats>({
    totalProjects: 0,
    cloudProjects: 0,
    openSourceProjects: 0,
    hybridProjects: 0,
    totalCost: 0,
    potentialCost: 0,
    savings: 0,
    savingsPercent: 0,
  });
  const [providerBreakdown, setProviderBreakdown] = useState<ProviderBreakdown[]>([]);
  const [recentHistory, setRecentHistory] = useState<GenerationHistory[]>([]);

  useEffect(() => {
    // Load usage data (in real app, fetch from backend/localStorage)
    loadUsageData();
  }, [timeRange]);

  const loadUsageData = () => {
    // Mock data - replace with actual API call
    const mockStats: UsageStats = {
      totalProjects: 45,
      cloudProjects: 5,
      openSourceProjects: 30,
      hybridProjects: 10,
      totalCost: 42.5, // ฿42.50
      potentialCost: 1559.25, // ฿1,559.25 if all cloud
      savings: 1516.75,
      savingsPercent: 97.3,
    };

    const mockBreakdown: ProviderBreakdown[] = [
      { provider: 'cloud', count: 5, cost: 34.65 * 5, avgTime: 5 },
      { provider: 'open-source', count: 30, cost: 0, avgTime: 25 },
      { provider: 'hybrid', count: 10, cost: 10 * 10, avgTime: 15 },
    ];

    const mockHistory: GenerationHistory[] = [
      {
        id: '1',
        timestamp: new Date(),
        type: 'image',
        provider: 'open-source',
        model: 'FLUX schnell',
        cost: 0,
        duration: 20,
        quality: 5,
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000),
        type: 'text',
        provider: 'open-source',
        model: 'Llama 3.2 7B',
        cost: 0,
        duration: 3,
        quality: 4,
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 7200000),
        type: 'video',
        provider: 'hybrid',
        model: 'AnimateDiff + Veo fallback',
        cost: 8.75,
        duration: 45,
        quality: 5,
      },
    ];

    setStats(mockStats);
    setProviderBreakdown(mockBreakdown);
    setRecentHistory(mockHistory);
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider) {
      case 'cloud':
        return '☁️';
      case 'open-source':
        return '🔓';
      case 'hybrid':
        return '🔀';
      default:
        return '❓';
    }
  };

  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'cloud':
        return '#3b82f6'; // blue
      case 'open-source':
        return '#10b981'; // green
      case 'hybrid':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const formatCurrency = (amount: number): string => {
    return `฿${amount.toFixed(2)}`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getRecommendation = (): string => {
    const openSourcePercent = (stats.openSourceProjects / stats.totalProjects) * 100;

    if (openSourcePercent < 50) {
      return '💡 คุณยังใช้ Cloud APIs อยู่เยอะ ลองเปลี่ยนเป็น Open Source เพื่อประหยัดค่าใช้จ่ายดูไหม?';
    } else if (openSourcePercent > 80) {
      return '🎉 เยี่ยมมาก! คุณประหยัดได้เกือบ 100% โดยใช้ Open Source';
    } else {
      return '✅ สมดุลดี! คุณใช้ Hybrid mode ที่ให้ทั้งความเร็วและความประหยัด';
    }
  };

  return (
    <div className="usage-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>📊 Usage Dashboard</h2>
        <p>ติดตามค่าใช้จ่ายและการประหยัดจาก AI Generation</p>

        {/* Time Range Selector */}
        <div className="time-range-selector">
          <button
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >
            สัปดาห์นี้
          </button>
          <button
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >
            เดือนนี้
          </button>
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-card total-projects">
          <div className="metric-icon">📁</div>
          <div className="metric-value">{stats.totalProjects}</div>
          <div className="metric-label">โปรเจกต์ทั้งหมด</div>
        </div>

        <div className="metric-card total-cost">
          <div className="metric-icon">💰</div>
          <div className="metric-value">{formatCurrency(stats.totalCost)}</div>
          <div className="metric-label">ค่าใช้จ่ายจริง</div>
        </div>

        <div className="metric-card potential-cost">
          <div className="metric-icon">⚠️</div>
          <div className="metric-value">{formatCurrency(stats.potentialCost)}</div>
          <div className="metric-label">ถ้าใช้ Cloud อย่างเดียว</div>
        </div>

        <div className="metric-card savings">
          <div className="metric-icon">💚</div>
          <div className="metric-value">{formatCurrency(stats.savings)}</div>
          <div className="metric-label">
            ประหยัดได้ ({stats.savingsPercent.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Savings Visualization */}
      <div className="savings-visualization">
        <h3>💰 การประหยัดค่าใช้จ่าย</h3>
        <div className="savings-bar-container">
          <div className="savings-bar">
            <div
              className="savings-bar-fill"
              style={{ width: `${stats.savingsPercent}%` }}
            >
              {stats.savingsPercent.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="savings-comparison">
          <div className="comparison-item">
            <span className="label">ค่าใช้จ่ายจริง:</span>
            <span className="value actual">{formatCurrency(stats.totalCost)}</span>
          </div>
          <div className="comparison-item">
            <span className="label">ถ้าใช้ Cloud:</span>
            <span className="value potential">{formatCurrency(stats.potentialCost)}</span>
          </div>
          <div className="comparison-item highlight">
            <span className="label">ประหยัด:</span>
            <span className="value savings">{formatCurrency(stats.savings)}</span>
          </div>
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="provider-breakdown">
        <h3>🔍 การใช้งานแยกตาม Provider</h3>
        <div className="provider-cards">
          {providerBreakdown.map((item) => (
            <div
              key={item.provider}
              className="provider-card"
              style={{ borderColor: getProviderColor(item.provider) }}
            >
              <div className="provider-header">
                <span className="provider-icon">{getProviderIcon(item.provider)}</span>
                <span className="provider-name">
                  {item.provider === 'cloud'
                    ? 'Cloud APIs'
                    : item.provider === 'open-source'
                    ? 'Open Source'
                    : 'Hybrid'}
                </span>
              </div>
              <div className="provider-stats">
                <div className="stat">
                  <span className="stat-label">จำนวน:</span>
                  <span className="stat-value">{item.count} โปรเจกต์</span>
                </div>
                <div className="stat">
                  <span className="stat-label">ค่าใช้จ่าย:</span>
                  <span className="stat-value">{formatCurrency(item.cost)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">เวลาเฉลี่ย:</span>
                  <span className="stat-value">{formatDuration(item.avgTime)}</span>
                </div>
              </div>
              <div
                className="provider-percentage"
                style={{ backgroundColor: getProviderColor(item.provider) }}
              >
                {((item.count / stats.totalProjects) * 100).toFixed(1)}% ของการใช้งาน
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="recommendation-box">
        <h4>💡 คำแนะนำ</h4>
        <p>{getRecommendation()}</p>
      </div>

      {/* Recent History */}
      <div className="recent-history">
        <h3>📜 ประวัติการใช้งานล่าสุด</h3>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ประเภท</th>
                <th>Provider</th>
                <th>Model</th>
                <th>ระยะเวลา</th>
                <th>คุณภาพ</th>
                <th>ค่าใช้จ่าย</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.timestamp.toLocaleTimeString('th-TH')}</td>
                  <td>
                    <span className={`type-badge ${item.type}`}>
                      {item.type === 'text' && '📝'}
                      {item.type === 'image' && '🖼️'}
                      {item.type === 'video' && '🎬'}
                      {' ' + item.type}
                    </span>
                  </td>
                  <td>
                    <span className="provider-badge" style={{ color: getProviderColor(item.provider) }}>
                      {getProviderIcon(item.provider)} {item.provider}
                    </span>
                  </td>
                  <td className="model-name">{item.model}</td>
                  <td>{formatDuration(item.duration)}</td>
                  <td>
                    <span className="quality-stars">
                      {'⭐'.repeat(item.quality)}
                    </span>
                  </td>
                  <td className={item.cost === 0 ? 'cost-free' : 'cost-paid'}>
                    {item.cost === 0 ? 'ฟรี!' : formatCurrency(item.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="export-options">
        <button className="export-btn">
          📊 Export CSV
        </button>
        <button className="export-btn">
          📄 Export PDF
        </button>
        <button className="export-btn">
          📧 Email Report
        </button>
      </div>
    </div>
  );
};

export default UsageDashboard;
