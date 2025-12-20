/**
 * Project Cost Dashboard Component
 * 
 * แสดงต้นทุนทั้งหมดของโปรเจกต์ แยกตามหมวดหมู่
 */

import React, { useEffect, useState } from 'react';
import {
  getProjectCostSummary,
  getCostTrends,
  exportCostDataToCSV,
} from '../../services/projectCostMonitor';
import type { ProjectCostSummary } from '../../types/analytics';
import './ProjectCostDashboard.css';

export const ProjectCostDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectCostSummary | null>(null);
  const [trends, setTrends] = useState<
    Array<{
      month: string;
      totalCost: number;
      apiCost: number;
      computeCost: number;
      storageCost: number;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [costSummary, costTrends] = await Promise.all([
        getProjectCostSummary(),
        getCostTrends(6),
      ]);

      setSummary(costSummary);
      setTrends(costTrends);
    } catch (err) {
      console.error('Error loading cost data:', err);
      setError('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!summary) return;

    const csv = exportCostDataToCSV(summary);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="project-cost-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project costs...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="project-cost-dashboard">
        <div className="error-state">
          <h3>⚠️ Error</h3>
          <p>{error || 'Failed to load cost data'}</p>
          <button onClick={loadData} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-cost-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>💰 Project Cost Dashboard</h2>
          <p className="last-updated">
            Last updated: {summary.lastUpdated.toLocaleString('th-TH')}
          </p>
        </div>
        <button onClick={handleExportCSV} className="btn-export">
          📥 Export CSV
        </button>
      </div>

      {/* Total Cost Banner */}
      <div className="cost-banner">
        <div className="banner-icon">💵</div>
        <div className="banner-content">
          <div className="banner-label">Total Monthly Cost</div>
          <div className="banner-value">
            ฿{summary.totalMonthlyCost.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Profitability Metrics */}
      <div className="profitability-section">
        <h3>📊 Profitability</h3>
        <div className="profitability-grid">
          <div className="profit-card">
            <div className="profit-label">Total Revenue</div>
            <div className="profit-value revenue">
              ฿{summary.userCosts.totalRevenue.toLocaleString('th-TH')}
            </div>
          </div>
          <div className="profit-card">
            <div className="profit-label">Total Costs</div>
            <div className="profit-value cost">
              ฿{summary.totalMonthlyCost.toLocaleString('th-TH')}
            </div>
          </div>
          <div className="profit-card">
            <div className="profit-label">Net Profit</div>
            <div
              className={`profit-value ${summary.userCosts.profit >= 0 ? 'positive' : 'negative'}`}
            >
              ฿{summary.userCosts.profit.toLocaleString('th-TH')}
            </div>
          </div>
          <div className="profit-card">
            <div className="profit-label">Profit Margin</div>
            <div
              className={`profit-value ${summary.userCosts.profitMargin >= 0 ? 'positive' : 'negative'}`}
            >
              {summary.userCosts.profitMargin.toFixed(1)}%
            </div>
          </div>
          <div className="profit-card">
            <div className="profit-label">Active Users</div>
            <div className="profit-value">
              {summary.userCosts.totalActiveUsers}
            </div>
          </div>
          <div className="profit-card">
            <div className="profit-label">Cost per User</div>
            <div className="profit-value">
              ฿{summary.userCosts.averageCostPerUser.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown by Category */}
      <div className="cost-breakdown-section">
        <h3>💸 Cost Breakdown by Category</h3>
        <div className="breakdown-grid">
          {/* APIs */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">🔌</div>
              <div className="category-info">
                <div className="category-name">API Services</div>
                <div className="category-cost">
                  ฿{summary.breakdown.apis.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              {summary.breakdown.apis.services.map((api, idx) => (
                <div key={idx} className="service-item">
                  <div className="service-name">
                    {api.apiName}
                    <span className="service-provider">{api.provider}</span>
                  </div>
                  <div className="service-stats">
                    <span className="service-calls">
                      {api.currentMonthUsage.calls} calls
                    </span>
                    <span className="service-cost">
                      ฿{api.currentMonthUsage.cost.toFixed(2)}
                    </span>
                  </div>
                  {api.pricing.freeQuota && (
                    <div className="service-quota">
                      Free quota: {api.pricing.freeQuota}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Storage */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">💾</div>
              <div className="category-info">
                <div className="category-name">Storage</div>
                <div className="category-cost">
                  ฿{summary.breakdown.storage.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              <div className="service-item">
                <div className="service-name">Firebase Storage</div>
                <div className="service-cost">
                  ฿{summary.breakdown.storage.firebase.toFixed(2)}
                </div>
              </div>
              <div className="service-item">
                <div className="service-name">Cloud Storage</div>
                <div className="service-cost">
                  ฿{summary.breakdown.storage.cloudStorage.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Compute */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">⚙️</div>
              <div className="category-info">
                <div className="category-name">Compute</div>
                <div className="category-cost">
                  ฿{summary.breakdown.compute.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              <div className="service-item">
                <div className="service-name">
                  Cloud Run (Voice Cloning)
                  <span className="service-config">2 vCPU, 8Gi RAM</span>
                </div>
                <div className="service-cost">
                  ฿{summary.breakdown.compute.cloudRun.toFixed(2)}
                </div>
              </div>
              <div className="service-item">
                <div className="service-name">Cloud Functions</div>
                <div className="service-cost">
                  ฿{summary.breakdown.compute.cloudFunctions.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">🗄️</div>
              <div className="category-info">
                <div className="category-name">Database</div>
                <div className="category-cost">
                  ฿{summary.breakdown.database.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              <div className="service-item">
                <div className="service-name">Firestore</div>
                <div className="service-cost">
                  ฿{summary.breakdown.database.firestore.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Bandwidth */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">🌐</div>
              <div className="category-info">
                <div className="category-name">Bandwidth</div>
                <div className="category-cost">
                  ฿{summary.breakdown.bandwidth.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              <div className="service-item">
                <div className="service-name">Firebase Hosting</div>
                <div className="service-cost">
                  ฿{summary.breakdown.bandwidth.hosting.toFixed(2)}
                </div>
              </div>
              <div className="service-item">
                <div className="service-name">CDN</div>
                <div className="service-cost">
                  ฿{summary.breakdown.bandwidth.cdn.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Other */}
          <div className="breakdown-category">
            <div className="category-header">
              <div className="category-icon">📦</div>
              <div className="category-info">
                <div className="category-name">Other Services</div>
                <div className="category-cost">
                  ฿{summary.breakdown.other.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="category-details">
              {summary.breakdown.other.services.map((service, idx) => (
                <div key={idx} className="service-item">
                  <div className="service-name">{service.service}</div>
                  <div className="service-cost">
                    ฿{service.monthlyCost.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends Chart */}
      {trends.length > 0 && (
        <div className="cost-trends-section">
          <h3>📈 Cost Trends (Last 6 Months)</h3>
          <div className="trends-chart">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color api"></span>API Costs
              </span>
              <span className="legend-item">
                <span className="legend-color compute"></span>Compute
              </span>
              <span className="legend-item">
                <span className="legend-color storage"></span>Storage
              </span>
            </div>
            <div className="chart-bars">
              {trends.map((trend, idx) => {
                const maxCost = Math.max(...trends.map((t) => t.totalCost));
                const height = maxCost > 0 ? (trend.totalCost / maxCost) * 100 : 0;

                return (
                  <div key={idx} className="chart-column">
                    <div className="chart-bar-stack" style={{ height: `${height}%` }}>
                      <div
                        className="bar-segment api"
                        style={{
                          height: `${maxCost > 0 ? (trend.apiCost / trend.totalCost) * 100 : 0}%`,
                        }}
                        title={`API: ฿${trend.apiCost.toFixed(2)}`}
                      ></div>
                      <div
                        className="bar-segment compute"
                        style={{
                          height: `${maxCost > 0 ? (trend.computeCost / trend.totalCost) * 100 : 0}%`,
                        }}
                        title={`Compute: ฿${trend.computeCost.toFixed(2)}`}
                      ></div>
                      <div
                        className="bar-segment storage"
                        style={{
                          height: `${maxCost > 0 ? (trend.storageCost / trend.totalCost) * 100 : 0}%`,
                        }}
                        title={`Storage: ฿${trend.storageCost.toFixed(2)}`}
                      ></div>
                    </div>
                    <div className="chart-label">{trend.month}</div>
                    <div className="chart-value">฿{trend.totalCost.toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="dashboard-actions">
        <button onClick={loadData} className="btn-refresh">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};
