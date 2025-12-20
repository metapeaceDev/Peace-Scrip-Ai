/**
 * Profit & Loss Analyzer Service
 *
 * คำนวณกำไร-ขาดทุน พร้อมภาษีตามกฎหมายไทย
 * วิเคราะห์เปรียบเทียบรายงวด และส่งออกรายงาน
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  ProfitLossStatement,
  PeriodComparison,
  HistoricalProfitLoss,
  ComparisonPeriod,
} from '../types/analytics';
import { THAI_TAX_RATES, SUBSCRIPTION_PRICING } from '../types/analytics';
import { getProjectCostSummary } from './projectCostMonitor';

// ===== Helper Functions =====

/**
 * Get date range for a period
 */
function getDateRange(
  periodType: ComparisonPeriod,
  referenceDate: Date = new Date()
): { start: Date; end: Date; label: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  switch (periodType) {
    case 'month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const thaiMonths = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม',
      ];
      const thaiYear = year + 543;
      return {
        start,
        end,
        label: `${thaiMonths[month]} ${thaiYear}`,
      };
    }

    case 'quarter': {
      const quarter = Math.floor(month / 3);
      const start = new Date(year, quarter * 3, 1);
      const end = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59);
      const thaiYear = year + 543;
      return {
        start,
        end,
        label: `Q${quarter + 1} ${thaiYear}`,
      };
    }

    case 'year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      const thaiYear = year + 543;
      return {
        start,
        end,
        label: `ปี ${thaiYear}`,
      };
    }

    default: {
      // Custom - return current month as fallback
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end, label: 'Custom Period' };
    }
  }
}

/**
 * Get previous period date range
 */
function getPreviousPeriod(
  periodType: ComparisonPeriod,
  currentStart: Date
): { start: Date; end: Date; label: string } {
  const year = currentStart.getFullYear();
  const month = currentStart.getMonth();

  switch (periodType) {
    case 'month': {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      return getDateRange('month', new Date(prevYear, prevMonth, 1));
    }

    case 'quarter': {
      const quarter = Math.floor(month / 3);
      const prevQuarterMonth = quarter === 0 ? 9 : (quarter - 1) * 3;
      const prevYear = quarter === 0 ? year - 1 : year;
      return getDateRange('quarter', new Date(prevYear, prevQuarterMonth, 1));
    }

    case 'year': {
      return getDateRange('year', new Date(year - 1, 0, 1));
    }

    default:
      return getDateRange('month', new Date(year, month - 1, 1));
  }
}

/**
 * Calculate revenue for a period
 */
async function calculateRevenue(
  _start: Date,
  _end: Date
): Promise<{ subscriptions: number; addons: number; other: number; total: number }> {
  try {
    // Get subscription data from Firestore
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef, where('subscription.status', '==', 'active'));

    const snapshot = await getDocs(q);
    let subscriptions = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const tier = data.subscription?.tier as keyof typeof SUBSCRIPTION_PRICING;

      if (tier && tier !== 'free') {
        // Assume monthly billing for simplicity
        subscriptions += SUBSCRIPTION_PRICING[tier].monthly;
      }

      // Check for addon purchases (credits bought beyond subscription)
      // TODO: Implement addon tracking in separate collection
      // For now, estimate based on usage patterns
    });

    const addons = 0; // TODO: Calculate addon revenue from separate collection
    const other = 0; // Other revenue sources (future: white-label, consulting)
    const total = subscriptions + addons + other;

    return { subscriptions, addons, other, total };
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return { subscriptions: 0, addons: 0, other: 0, total: 0 };
  }
}

/**
 * Calculate operating expenses (estimated/manual entry)
 */
function calculateOperatingExpenses(revenueTotal: number): {
  salaries: number;
  marketing: number;
  infrastructure: number;
  software: number;
  other: number;
  total: number;
} {
  // These should be manually entered or tracked separately
  // For now, we'll use conservative estimates based on startup standards

  // Typical SaaS startup expense ratios:
  const salaries = 0; // Pre-revenue stage - founders working for equity
  const marketing = revenueTotal * 0.15; // 15% of revenue on marketing (growth stage)
  const infrastructure = 2000; // Fixed ฿2,000/month (domains, SSL, monitoring tools)
  const software = 1500; // Fixed ฿1,500/month (GitHub, analytics, email service)
  const other = 1000; // Misc expenses ฿1,000/month

  const total = salaries + marketing + infrastructure + software + other;

  return {
    salaries,
    marketing,
    infrastructure,
    software,
    other,
    total,
  };
}

/**
 * Calculate taxes based on Thai tax law
 */
function calculateTaxes(
  revenue: number,
  netProfitBeforeTax: number,
  salaries: number,
  taxRates: typeof THAI_TAX_RATES = THAI_TAX_RATES
): {
  vat: number;
  corporateTax: number;
  withholdingTax: number;
  socialSecurity: number;
  total: number;
} {
  // VAT (7% on revenue - but we collect from customers, so neutral if handled correctly)
  // For simplicity, we'll show VAT payable on output (revenue)
  const vat = revenue * taxRates.vat;

  // Corporate Tax (20% on net profit before tax)
  // Only applicable if profit > 0
  const corporateTax = netProfitBeforeTax > 0 ? netProfitBeforeTax * taxRates.corporateTax : 0;

  // Withholding Tax (3% on API services we pay)
  // Assuming we pay to foreign providers (Gemini, Replicate)
  const withholdingTax = 0; // Not applicable for B2B software services to foreign entities

  // Social Security (5% on salaries, capped at ฿750/person/month)
  const socialSecurity = salaries > 0 ? Math.min(salaries * taxRates.socialSecurity, 750) : 0;

  const total = vat + corporateTax + withholdingTax + socialSecurity;

  return {
    vat,
    corporateTax,
    withholdingTax,
    socialSecurity,
    total,
  };
}

// ===== Main Functions =====

/**
 * Calculate Profit & Loss for a specific period
 */
export async function calculateProfitLoss(
  periodType: ComparisonPeriod = 'month',
  referenceDate?: Date
): Promise<ProfitLossStatement> {
  const { start, end, label } = getDateRange(periodType, referenceDate);

  // Get revenue data
  const revenue = await calculateRevenue(start, end);

  // Get cost data from existing projectCostMonitor
  const costSummary = await getProjectCostSummary();

  // COGS (Cost of Goods Sold) - direct costs to deliver service
  const cogs = {
    apiCosts: costSummary.breakdown.apis.total,
    storageCosts: costSummary.breakdown.storage.total,
    computeCosts: costSummary.breakdown.compute.total,
    databaseCosts: costSummary.breakdown.database.total,
    bandwidthCosts: costSummary.breakdown.bandwidth.total,
    total: costSummary.totalMonthlyCost - costSummary.breakdown.other.total, // Exclude "other" from COGS
  };

  // Gross Profit
  const grossProfit = revenue.total - cogs.total;
  const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;

  // Operating Expenses
  const operatingExpenses = calculateOperatingExpenses(revenue.total);

  // EBITDA
  const ebitda = grossProfit - operatingExpenses.total;
  const ebitdaMargin = revenue.total > 0 ? (ebitda / revenue.total) * 100 : 0;

  // Net Profit Before Tax (assuming no interest, depreciation for software business)
  const netProfitBeforeTax = ebitda;

  // Calculate Taxes
  const taxes = calculateTaxes(revenue.total, netProfitBeforeTax, operatingExpenses.salaries);

  // Net Profit After Tax
  const netProfitAfterTax = netProfitBeforeTax - taxes.corporateTax;
  const netMargin = revenue.total > 0 ? (netProfitAfterTax / revenue.total) * 100 : 0;

  return {
    period: {
      type: periodType,
      start,
      end,
      label,
    },
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    operatingExpenses,
    ebitda,
    ebitdaMargin,
    taxes,
    netProfitBeforeTax,
    netProfitAfterTax,
    netMargin,
  };
}

/**
 * Get period-over-period comparison
 */
export async function getComparison(
  periodType: ComparisonPeriod = 'month',
  referenceDate?: Date
): Promise<PeriodComparison> {
  // Get current period P&L
  const current = await calculateProfitLoss(periodType, referenceDate);

  // Get previous period P&L
  const prevPeriod = getPreviousPeriod(periodType, current.period.start);
  const previous = await calculateProfitLoss(periodType, prevPeriod.start);

  // Calculate changes
  const calculateChange = (current: number, previous: number) => {
    const amount = current - previous;
    const percentage = previous !== 0 ? (amount / previous) * 100 : 0;
    return { amount, percentage };
  };

  return {
    current,
    previous,
    changes: {
      revenue: calculateChange(current.revenue.total, previous.revenue.total),
      cogs: calculateChange(current.cogs.total, previous.cogs.total),
      grossProfit: calculateChange(current.grossProfit, previous.grossProfit),
      operatingExpenses: calculateChange(
        current.operatingExpenses.total,
        previous.operatingExpenses.total
      ),
      ebitda: calculateChange(current.ebitda, previous.ebitda),
      netProfitAfterTax: calculateChange(current.netProfitAfterTax, previous.netProfitAfterTax),
    },
  };
}

/**
 * Get historical P&L data for trend analysis
 */
export async function getHistoricalData(
  periodType: ComparisonPeriod = 'month',
  periodsCount: number = 6
): Promise<HistoricalProfitLoss> {
  const periods: ProfitLossStatement[] = [];
  const currentDate = new Date();

  // Get P&L for each period going backwards
  for (let i = 0; i < periodsCount; i++) {
    let referenceDate: Date;

    switch (periodType) {
      case 'month':
        referenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        break;
      case 'quarter':
        referenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1);
        break;
      case 'year':
        referenceDate = new Date(currentDate.getFullYear() - i, 0, 1);
        break;
      default:
        referenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    }

    const pnl = await calculateProfitLoss(periodType, referenceDate);
    periods.unshift(pnl); // Add to beginning to maintain chronological order
  }

  // Calculate trends
  const revenueGrowth: number[] = [];
  const profitMargins: number[] = [];
  const costRatios: number[] = [];

  for (let i = 1; i < periods.length; i++) {
    const current = periods[i];
    const previous = periods[i - 1];

    // Revenue growth %
    const growth =
      previous.revenue.total > 0
        ? ((current.revenue.total - previous.revenue.total) / previous.revenue.total) * 100
        : 0;
    revenueGrowth.push(growth);

    // Profit margin %
    profitMargins.push(current.netMargin);

    // Cost ratio (COGS as % of revenue)
    const costRatio =
      current.revenue.total > 0 ? (current.cogs.total / current.revenue.total) * 100 : 0;
    costRatios.push(costRatio);
  }

  // Add first period's margin and cost ratio
  profitMargins.unshift(periods[0].netMargin);
  const firstCostRatio =
    periods[0].revenue.total > 0 ? (periods[0].cogs.total / periods[0].revenue.total) * 100 : 0;
  costRatios.unshift(firstCostRatio);

  return {
    periods,
    trends: {
      revenueGrowth,
      profitMargins,
      costRatios,
    },
  };
}

/**
 * Export P&L report to CSV
 */
export function exportProfitLossReport(pnl: ProfitLossStatement): string {
  const csv: string[] = [];

  // Header
  csv.push('Peace Script AI - Profit & Loss Statement');
  csv.push(`Period: ${pnl.period.label}`);
  csv.push(
    `From: ${pnl.period.start.toLocaleDateString('th-TH')} To: ${pnl.period.end.toLocaleDateString('th-TH')}`
  );
  csv.push('');

  // Revenue section
  csv.push('=== REVENUE (รายได้) ===');
  csv.push(`Subscriptions,${pnl.revenue.subscriptions.toFixed(2)}`);
  csv.push(`Add-ons,${pnl.revenue.addons.toFixed(2)}`);
  csv.push(`Other,${pnl.revenue.other.toFixed(2)}`);
  csv.push(`Total Revenue,${pnl.revenue.total.toFixed(2)}`);
  csv.push('');

  // COGS section
  csv.push('=== COST OF GOODS SOLD (ต้นทุนขาย) ===');
  csv.push(`API Costs,${pnl.cogs.apiCosts.toFixed(2)}`);
  csv.push(`Storage Costs,${pnl.cogs.storageCosts.toFixed(2)}`);
  csv.push(`Compute Costs,${pnl.cogs.computeCosts.toFixed(2)}`);
  csv.push(`Database Costs,${pnl.cogs.databaseCosts.toFixed(2)}`);
  csv.push(`Bandwidth Costs,${pnl.cogs.bandwidthCosts.toFixed(2)}`);
  csv.push(`Total COGS,${pnl.cogs.total.toFixed(2)}`);
  csv.push('');

  // Gross Profit
  csv.push('=== GROSS PROFIT (กำไรขั้นต้น) ===');
  csv.push(`Gross Profit,${pnl.grossProfit.toFixed(2)}`);
  csv.push(`Gross Margin,${pnl.grossMargin.toFixed(2)}%`);
  csv.push('');

  // Operating Expenses
  csv.push('=== OPERATING EXPENSES (ค่าใช้จ่ายดำเนินงาน) ===');
  csv.push(`Salaries,${pnl.operatingExpenses.salaries.toFixed(2)}`);
  csv.push(`Marketing,${pnl.operatingExpenses.marketing.toFixed(2)}`);
  csv.push(`Infrastructure,${pnl.operatingExpenses.infrastructure.toFixed(2)}`);
  csv.push(`Software,${pnl.operatingExpenses.software.toFixed(2)}`);
  csv.push(`Other,${pnl.operatingExpenses.other.toFixed(2)}`);
  csv.push(`Total OpEx,${pnl.operatingExpenses.total.toFixed(2)}`);
  csv.push('');

  // EBITDA
  csv.push('=== EBITDA ===');
  csv.push(`EBITDA,${pnl.ebitda.toFixed(2)}`);
  csv.push(`EBITDA Margin,${pnl.ebitdaMargin.toFixed(2)}%`);
  csv.push('');

  // Taxes
  csv.push('=== TAXES (ภาษี) ===');
  csv.push(`VAT (7%),${pnl.taxes.vat.toFixed(2)}`);
  csv.push(`Corporate Tax (20%),${pnl.taxes.corporateTax.toFixed(2)}`);
  csv.push(`Withholding Tax (3%),${pnl.taxes.withholdingTax.toFixed(2)}`);
  csv.push(`Social Security (5%),${pnl.taxes.socialSecurity.toFixed(2)}`);
  csv.push(`Total Taxes,${pnl.taxes.total.toFixed(2)}`);
  csv.push('');

  // Net Profit
  csv.push('=== NET PROFIT (กำไรสุทธิ) ===');
  csv.push(`Net Profit Before Tax,${pnl.netProfitBeforeTax.toFixed(2)}`);
  csv.push(`Net Profit After Tax,${pnl.netProfitAfterTax.toFixed(2)}`);
  csv.push(`Net Margin,${pnl.netMargin.toFixed(2)}%`);
  csv.push('');

  csv.push('Generated by Peace Script AI Admin Dashboard');
  csv.push(`Export Date: ${new Date().toLocaleString('th-TH')}`);

  return csv.join('\n');
}

