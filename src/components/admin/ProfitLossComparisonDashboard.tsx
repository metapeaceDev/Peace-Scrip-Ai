/**
 * Profit & Loss Comparison Dashboard
 *
 * หน้าเปรียบเทียบกำไร-ขาดทุน พร้อมภาษีหลังหักและรายละเอียดครบถ้วน
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ProfitLossStatement,
  PeriodComparison,
  HistoricalProfitLoss,
  ComparisonPeriod,
} from '../../types/analytics';
import {
  calculateProfitLoss,
  getComparison,
  getHistoricalData,
  exportProfitLossReport,
} from '../../services/profitLossAnalyzer';
import './ProfitLossComparisonDashboard.css';

export const ProfitLossComparisonDashboard: React.FC = () => {
  const [periodType, setPeriodType] = useState<ComparisonPeriod>('month');
  const [currentPL, setCurrentPL] = useState<ProfitLossStatement | null>(null);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalProfitLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<
    'summary' | 'detailed' | 'comparison' | 'trends'
  >('summary');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load current P&L
      const pnl = await calculateProfitLoss(periodType);
      setCurrentPL(pnl);

      // Load comparison
      const comp = await getComparison(periodType);
      setComparison(comp);

      // Load historical data
      const historical = await getHistoricalData(periodType, 6);
      setHistoricalData(historical);
    } catch (error) {
      console.error('Error loading P&L data:', error);
    } finally {
      setLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleExport() {
    if (!currentPL) return;
    const csv = exportProfitLossReport(currentPL);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `profit-loss-${currentPL.period.label}.csv`;
    link.click();
  }

  function formatMoney(amount: number): string {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  function formatChange(change: { amount: number; percentage: number }): JSX.Element {
    const isPositive = change.amount >= 0;
    return (
      <span className={`pnl-change ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '▲' : '▼'} {formatMoney(Math.abs(change.amount))} (
        {formatPercent(Math.abs(change.percentage))})
      </span>
    );
  }

  if (loading || !currentPL) {
    return (
      <div className="pnl-dashboard-container">
        <div className="pnl-loading">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูลกำไร-ขาดทุน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pnl-dashboard-container">
      {/* Header */}
      <div className="pnl-header">
        <div className="pnl-header-left">
          <h1>📊 Profit & Loss Analysis</h1>
          <p className="pnl-subtitle">รายงานกำไร-ขาดทุน พร้อมภาษีหลังหัก</p>
        </div>

        <div className="pnl-header-controls">
          <select
            value={periodType}
            onChange={e => setPeriodType(e.target.value as ComparisonPeriod)}
            aria-label="เลือกประเภทเวลา"
          >
            <option value="month">รายเดือน</option>
            <option value="quarter">รายไตรมาส</option>
            <option value="year">รายปี</option>
          </select>

          <button onClick={handleExport} className="pnl-export-btn">
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Period Banner */}
      <div className="pnl-period-banner">
        <h2>{currentPL.period.label}</h2>
        <p className="pnl-date-range">
          {currentPL.period.start.toLocaleDateString('th-TH')} -{' '}
          {currentPL.period.end.toLocaleDateString('th-TH')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="pnl-tabs">
        <button
          className={`pnl-tab ${selectedView === 'summary' ? 'active' : ''}`}
          onClick={() => setSelectedView('summary')}
        >
          📋 สรุปรวม
        </button>
        <button
          className={`pnl-tab ${selectedView === 'detailed' ? 'active' : ''}`}
          onClick={() => setSelectedView('detailed')}
        >
          📝 รายละเอียด
        </button>
        <button
          className={`pnl-tab ${selectedView === 'comparison' ? 'active' : ''}`}
          onClick={() => setSelectedView('comparison')}
        >
          📊 เปรียบเทียบ
        </button>
        <button
          className={`pnl-tab ${selectedView === 'trends' ? 'active' : ''}`}
          onClick={() => setSelectedView('trends')}
        >
          📈 แนวโน้ม
        </button>
      </div>

      {/* Summary View */}
      {selectedView === 'summary' && (
        <div className="pnl-content">
          {/* Key Metrics Cards */}
          <div className="pnl-metrics-grid">
            <div className="pnl-metric-card revenue">
              <div className="pnl-metric-icon">💰</div>
              <div className="pnl-metric-content">
                <h3>รายได้รวม</h3>
                <p className="pnl-metric-value">{formatMoney(currentPL.revenue.total)}</p>
                <p className="pnl-metric-subtitle">
                  Subscription: {formatMoney(currentPL.revenue.subscriptions)}
                </p>
              </div>
            </div>

            <div className="pnl-metric-card cogs">
              <div className="pnl-metric-icon">📦</div>
              <div className="pnl-metric-content">
                <h3>ต้นทุนขาย</h3>
                <p className="pnl-metric-value">{formatMoney(currentPL.cogs.total)}</p>
                <p className="pnl-metric-subtitle">APIs: {formatMoney(currentPL.cogs.apiCosts)}</p>
              </div>
            </div>

            <div className="pnl-metric-card gross-profit">
              <div className="pnl-metric-icon">📊</div>
              <div className="pnl-metric-content">
                <h3>กำไรขั้นต้น</h3>
                <p className="pnl-metric-value">{formatMoney(currentPL.grossProfit)}</p>
                <p className="pnl-metric-subtitle">
                  Margin: {formatPercent(currentPL.grossMargin)}
                </p>
              </div>
            </div>

            <div className="pnl-metric-card ebitda">
              <div className="pnl-metric-icon">💵</div>
              <div className="pnl-metric-content">
                <h3>EBITDA</h3>
                <p className="pnl-metric-value">{formatMoney(currentPL.ebitda)}</p>
                <p className="pnl-metric-subtitle">
                  Margin: {formatPercent(currentPL.ebitdaMargin)}
                </p>
              </div>
            </div>

            <div className="pnl-metric-card taxes">
              <div className="pnl-metric-icon">🧾</div>
              <div className="pnl-metric-content">
                <h3>ภาษีรวม</h3>
                <p className="pnl-metric-value">{formatMoney(currentPL.taxes.total)}</p>
                <p className="pnl-metric-subtitle">
                  Corp Tax: {formatMoney(currentPL.taxes.corporateTax)}
                </p>
              </div>
            </div>

            <div className="pnl-metric-card net-profit">
              <div className="pnl-metric-icon">✅</div>
              <div className="pnl-metric-content">
                <h3>กำไรสุทธิ (หลังหักภาษี)</h3>
                <p
                  className={`pnl-metric-value ${currentPL.netProfitAfterTax >= 0 ? 'positive' : 'negative'}`}
                >
                  {formatMoney(currentPL.netProfitAfterTax)}
                </p>
                <p className="pnl-metric-subtitle">Margin: {formatPercent(currentPL.netMargin)}</p>
              </div>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div className="pnl-section">
            <h3>🧾 รายละเอียดภาษี</h3>
            <div className="pnl-tax-breakdown">
              <div className="pnl-tax-item">
                <span className="pnl-tax-label">VAT (7%)</span>
                <span className="pnl-tax-value">{formatMoney(currentPL.taxes.vat)}</span>
              </div>
              <div className="pnl-tax-item">
                <span className="pnl-tax-label">Corporate Tax (20%)</span>
                <span className="pnl-tax-value">{formatMoney(currentPL.taxes.corporateTax)}</span>
              </div>
              <div className="pnl-tax-item">
                <span className="pnl-tax-label">Withholding Tax (3%)</span>
                <span className="pnl-tax-value">{formatMoney(currentPL.taxes.withholdingTax)}</span>
              </div>
              <div className="pnl-tax-item">
                <span className="pnl-tax-label">Social Security (5%)</span>
                <span className="pnl-tax-value">{formatMoney(currentPL.taxes.socialSecurity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {selectedView === 'detailed' && (
        <div className="pnl-content">
          <div className="pnl-detailed-table">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th className="pnl-amount">จำนวนเงิน (฿)</th>
                  <th className="pnl-percent">% ของรายได้</th>
                </tr>
              </thead>
              <tbody>
                {/* Revenue Section */}
                <tr className="pnl-section-header">
                  <td colSpan={3}>
                    <strong>รายได้ (REVENUE)</strong>
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Subscriptions</td>
                  <td className="pnl-amount">{formatMoney(currentPL.revenue.subscriptions)}</td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.revenue.subscriptions / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Add-ons</td>
                  <td className="pnl-amount">{formatMoney(currentPL.revenue.addons)}</td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.revenue.addons / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Other</td>
                  <td className="pnl-amount">{formatMoney(currentPL.revenue.other)}</td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.revenue.other / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr className="pnl-subtotal">
                  <td>
                    <strong>รายได้รวม</strong>
                  </td>
                  <td className="pnl-amount">
                    <strong>{formatMoney(currentPL.revenue.total)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>100.00%</strong>
                  </td>
                </tr>

                {/* COGS Section */}
                <tr className="pnl-section-header">
                  <td colSpan={3}>
                    <strong>ต้นทุนขาย (COST OF GOODS SOLD)</strong>
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">API Costs</td>
                  <td className="pnl-amount negative">{formatMoney(currentPL.cogs.apiCosts)}</td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.cogs.apiCosts / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Storage Costs</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.cogs.storageCosts)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.cogs.storageCosts / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Compute Costs</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.cogs.computeCosts)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.cogs.computeCosts / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Database Costs</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.cogs.databaseCosts)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.cogs.databaseCosts / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Bandwidth Costs</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.cogs.bandwidthCosts)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.cogs.bandwidthCosts / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr className="pnl-subtotal">
                  <td>
                    <strong>ต้นทุนขายรวม</strong>
                  </td>
                  <td className="pnl-amount negative">
                    <strong>{formatMoney(currentPL.cogs.total)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>
                      {formatPercent((currentPL.cogs.total / currentPL.revenue.total) * 100)}
                    </strong>
                  </td>
                </tr>

                {/* Gross Profit */}
                <tr className="pnl-total">
                  <td>
                    <strong>กำไรขั้นต้น (GROSS PROFIT)</strong>
                  </td>
                  <td className="pnl-amount">
                    <strong>{formatMoney(currentPL.grossProfit)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>{formatPercent(currentPL.grossMargin)}</strong>
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr className="pnl-section-header">
                  <td colSpan={3}>
                    <strong>ค่าใช้จ่ายดำเนินงาน (OPERATING EXPENSES)</strong>
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Salaries</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.operatingExpenses.salaries)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.operatingExpenses.salaries / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Marketing</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.operatingExpenses.marketing)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.operatingExpenses.marketing / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Infrastructure</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.operatingExpenses.infrastructure)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.operatingExpenses.infrastructure / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Software</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.operatingExpenses.software)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.operatingExpenses.software / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Other</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.operatingExpenses.other)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.operatingExpenses.other / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr className="pnl-subtotal">
                  <td>
                    <strong>ค่าใช้จ่ายรวม</strong>
                  </td>
                  <td className="pnl-amount negative">
                    <strong>{formatMoney(currentPL.operatingExpenses.total)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>
                      {formatPercent(
                        (currentPL.operatingExpenses.total / currentPL.revenue.total) * 100
                      )}
                    </strong>
                  </td>
                </tr>

                {/* EBITDA */}
                <tr className="pnl-total">
                  <td>
                    <strong>EBITDA</strong>
                  </td>
                  <td className="pnl-amount">
                    <strong>{formatMoney(currentPL.ebitda)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>{formatPercent(currentPL.ebitdaMargin)}</strong>
                  </td>
                </tr>

                {/* Taxes */}
                <tr className="pnl-section-header">
                  <td colSpan={3}>
                    <strong>ภาษี (TAXES)</strong>
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">VAT (7%)</td>
                  <td className="pnl-amount negative">{formatMoney(currentPL.taxes.vat)}</td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.taxes.vat / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Corporate Tax (20%)</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.taxes.corporateTax)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent((currentPL.taxes.corporateTax / currentPL.revenue.total) * 100)}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Withholding Tax (3%)</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.taxes.withholdingTax)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.taxes.withholdingTax / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pnl-indent">Social Security (5%)</td>
                  <td className="pnl-amount negative">
                    {formatMoney(currentPL.taxes.socialSecurity)}
                  </td>
                  <td className="pnl-percent">
                    {formatPercent(
                      (currentPL.taxes.socialSecurity / currentPL.revenue.total) * 100
                    )}
                  </td>
                </tr>
                <tr className="pnl-subtotal">
                  <td>
                    <strong>ภาษีรวม</strong>
                  </td>
                  <td className="pnl-amount negative">
                    <strong>{formatMoney(currentPL.taxes.total)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>
                      {formatPercent((currentPL.taxes.total / currentPL.revenue.total) * 100)}
                    </strong>
                  </td>
                </tr>

                {/* Net Profit Before Tax */}
                <tr className="pnl-total">
                  <td>
                    <strong>กำไรสุทธิก่อนหักภาษี</strong>
                  </td>
                  <td className="pnl-amount">
                    <strong>{formatMoney(currentPL.netProfitBeforeTax)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>
                      {formatPercent(
                        (currentPL.netProfitBeforeTax / currentPL.revenue.total) * 100
                      )}
                    </strong>
                  </td>
                </tr>

                {/* Net Profit After Tax */}
                <tr className="pnl-final">
                  <td>
                    <strong>กำไรสุทธิหลังหักภาษี</strong>
                  </td>
                  <td
                    className={`pnl-amount ${currentPL.netProfitAfterTax >= 0 ? 'positive' : 'negative'}`}
                  >
                    <strong>{formatMoney(currentPL.netProfitAfterTax)}</strong>
                  </td>
                  <td className="pnl-percent">
                    <strong>{formatPercent(currentPL.netMargin)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {selectedView === 'comparison' && comparison && (
        <div className="pnl-content">
          <div className="pnl-comparison-header">
            <h3>📊 เปรียบเทียบระหว่างงวด</h3>
            <p className="pnl-comparison-subtitle">
              {comparison.previous.period.label} vs {comparison.current.period.label}
            </p>
          </div>

          <div className="pnl-comparison-grid">
            <div className="pnl-comparison-card">
              <h4>รายได้รวม</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.revenue.total)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.revenue.total)}</span>
                </div>
                <div className="pnl-comparison-change">
                  {formatChange(comparison.changes.revenue)}
                </div>
              </div>
            </div>

            <div className="pnl-comparison-card">
              <h4>ต้นทุนขาย</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.cogs.total)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.cogs.total)}</span>
                </div>
                <div className="pnl-comparison-change">{formatChange(comparison.changes.cogs)}</div>
              </div>
            </div>

            <div className="pnl-comparison-card">
              <h4>กำไรขั้นต้น</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.grossProfit)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.grossProfit)}</span>
                </div>
                <div className="pnl-comparison-change">
                  {formatChange(comparison.changes.grossProfit)}
                </div>
              </div>
            </div>

            <div className="pnl-comparison-card">
              <h4>ค่าใช้จ่ายดำเนินงาน</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.operatingExpenses.total)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.operatingExpenses.total)}</span>
                </div>
                <div className="pnl-comparison-change">
                  {formatChange(comparison.changes.operatingExpenses)}
                </div>
              </div>
            </div>

            <div className="pnl-comparison-card">
              <h4>EBITDA</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.ebitda)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.ebitda)}</span>
                </div>
                <div className="pnl-comparison-change">
                  {formatChange(comparison.changes.ebitda)}
                </div>
              </div>
            </div>

            <div className="pnl-comparison-card highlight">
              <h4>กำไรสุทธิ (หลังหักภาษี)</h4>
              <div className="pnl-comparison-values">
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดก่อน:</span>
                  <span>{formatMoney(comparison.previous.netProfitAfterTax)}</span>
                </div>
                <div className="pnl-comparison-value">
                  <span className="pnl-label">งวดปัจจุบัน:</span>
                  <span>{formatMoney(comparison.current.netProfitAfterTax)}</span>
                </div>
                <div className="pnl-comparison-change">
                  {formatChange(comparison.changes.netProfitAfterTax)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && historicalData && (
        <div className="pnl-content">
          <div className="pnl-trends-section">
            <h3>📈 แนวโน้มกำไร-ขาดทุน (6 งวดล่าสุด)</h3>

            {/* Simple Bar Chart */}
            <div className="pnl-chart">
              <div className="pnl-chart-bars">
                {historicalData.periods.map((period, index) => {
                  const maxValue = Math.max(
                    ...historicalData.periods.map(p => Math.abs(p.netProfitAfterTax))
                  );
                  const height =
                    maxValue > 0 ? (Math.abs(period.netProfitAfterTax) / maxValue) * 100 : 0;
                  const isPositive = period.netProfitAfterTax >= 0;

                  return (
                    <div key={index} className="pnl-chart-bar-container">
                      <div className="pnl-chart-bar-wrapper">
                        <div
                          className={`pnl-chart-bar ${isPositive ? 'positive' : 'negative'}`}
                          style={{ height: `${height}%` } as React.CSSProperties}
                        >
                          <span className="pnl-bar-value">
                            {formatMoney(period.netProfitAfterTax)}
                          </span>
                        </div>
                      </div>
                      <div className="pnl-chart-label">{period.period.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trend Metrics */}
            <div className="pnl-trends-metrics">
              <div className="pnl-trend-metric">
                <h4>📈 การเติบโตของรายได้</h4>
                <div className="pnl-trend-values">
                  {historicalData.trends.revenueGrowth.map((growth, index) => (
                    <div key={index} className="pnl-trend-item">
                      <span className={growth >= 0 ? 'positive' : 'negative'}>
                        {growth >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(growth))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pnl-trend-metric">
                <h4>💹 กำไรสุทธิ (%)</h4>
                <div className="pnl-trend-values">
                  {historicalData.trends.profitMargins.map((margin, index) => (
                    <div key={index} className="pnl-trend-item">
                      <span className={margin >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(margin)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pnl-trend-metric">
                <h4>📊 สัดส่วนต้นทุน (%)</h4>
                <div className="pnl-trend-values">
                  {historicalData.trends.costRatios.map((ratio, index) => (
                    <div key={index} className="pnl-trend-item">
                      <span>{formatPercent(ratio)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
