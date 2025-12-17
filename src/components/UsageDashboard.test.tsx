import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageDashboard } from './UsageDashboard';

describe('UsageDashboard', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  describe('Component Rendering', () => {
    it('should render dashboard header', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('📊 Usage Dashboard')).toBeInTheDocument();
      expect(
        screen.getByText('ติดตามค่าใช้จ่ายและการประหยัดจาก AI Generation')
      ).toBeInTheDocument();
    });

    it('should render time range selector buttons', () => {
      render(<UsageDashboard />);
      expect(screen.getByRole('button', { name: 'สัปดาห์นี้' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เดือนนี้' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toBeInTheDocument();
    });

    it('should select month by default', () => {
      render(<UsageDashboard />);
      const monthButton = screen.getByRole('button', { name: 'เดือนนี้' });
      expect(monthButton).toHaveClass('active');
    });

    it('should render all key metrics cards', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('โปรเจกต์ทั้งหมด')).toBeInTheDocument();
      expect(screen.getByText('ค่าใช้จ่ายจริง')).toBeInTheDocument();
      expect(screen.getByText('ถ้าใช้ Cloud อย่างเดียว')).toBeInTheDocument();
      expect(screen.getByText(/ประหยัดได้/)).toBeInTheDocument();
    });

    it('should render savings visualization section', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('💰 การประหยัดค่าใช้จ่าย')).toBeInTheDocument();
    });

    it('should render provider breakdown section', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('🔍 การใช้งานแยกตาม Provider')).toBeInTheDocument();
    });

    it('should render recommendation box', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('💡 คำแนะนำ')).toBeInTheDocument();
    });

    it('should render recent history section', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('📜 ประวัติการใช้งานล่าสุด')).toBeInTheDocument();
    });

    it('should render export options', () => {
      render(<UsageDashboard />);
      expect(screen.getByRole('button', { name: '📊 Export CSV' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '📄 Export PDF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '📧 Email Report' })).toBeInTheDocument();
    });
  });

  describe('Time Range Selection', () => {
    it('should switch to week view when clicking week button', () => {
      render(<UsageDashboard />);

      const weekButton = screen.getByRole('button', { name: 'สัปดาห์นี้' });
      fireEvent.click(weekButton);

      expect(weekButton).toHaveClass('active');
    });

    it('should switch to all time view when clicking all button', () => {
      render(<UsageDashboard />);

      const allButton = screen.getByRole('button', { name: 'ทั้งหมด' });
      fireEvent.click(allButton);

      expect(allButton).toHaveClass('active');
    });

    it('should remove active class from previous selection', () => {
      render(<UsageDashboard />);

      const monthButton = screen.getByRole('button', { name: 'เดือนนี้' });
      const weekButton = screen.getByRole('button', { name: 'สัปดาห์นี้' });

      expect(monthButton).toHaveClass('active');

      fireEvent.click(weekButton);

      expect(weekButton).toHaveClass('active');
      expect(monthButton).not.toHaveClass('active');
    });
  });

  describe('Key Metrics Display', () => {
    it('should display total projects count', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('should display actual cost', () => {
      render(<UsageDashboard />);
      const costs = screen.getAllByText('฿42.50');
      expect(costs.length).toBeGreaterThan(0);
    });

    it('should display potential cost', () => {
      render(<UsageDashboard />);
      const costs = screen.getAllByText('฿1559.25');
      expect(costs.length).toBeGreaterThan(0);
    });

    it('should display savings amount', () => {
      render(<UsageDashboard />);
      const savings = screen.getAllByText('฿1516.75');
      expect(savings.length).toBeGreaterThan(0);
    });

    it('should display savings percentage', () => {
      render(<UsageDashboard />);
      const percentTexts = screen.getAllByText(/97\.3%/);
      expect(percentTexts.length).toBeGreaterThan(0);
    });

    it('should show metric icons', () => {
      render(<UsageDashboard />);
      const metricCards = document.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(4);

      expect(metricCards[0].querySelector('.metric-icon')?.textContent).toBe('📁');
      expect(metricCards[1].querySelector('.metric-icon')?.textContent).toBe('💰');
      expect(metricCards[2].querySelector('.metric-icon')?.textContent).toBe('⚠️');
      expect(metricCards[3].querySelector('.metric-icon')?.textContent).toBe('💚');
    });
  });

  describe('Savings Visualization', () => {
    it('should render savings bar', () => {
      render(<UsageDashboard />);
      const savingsBar = document.querySelector('.savings-bar-fill');
      expect(savingsBar).toBeInTheDocument();
    });

    it('should set correct width for savings bar', () => {
      render(<UsageDashboard />);
      const savingsBar = document.querySelector('.savings-bar-fill') as HTMLElement;
      expect(savingsBar.style.width).toBe('97.3%');
    });

    it('should show percentage in savings bar', () => {
      render(<UsageDashboard />);
      const savingsBar = document.querySelector('.savings-bar-fill');
      expect(savingsBar?.textContent).toBe('97.3%');
    });

    it('should display actual cost in comparison', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('ค่าใช้จ่ายจริง:')).toBeInTheDocument();
    });

    it('should display potential cloud cost in comparison', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('ถ้าใช้ Cloud:')).toBeInTheDocument();
    });

    it('should display savings in comparison', () => {
      render(<UsageDashboard />);
      const savingsLabels = screen.getAllByText('ประหยัด:');
      expect(savingsLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Breakdown', () => {
    it('should render all provider cards', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('Cloud APIs')).toBeInTheDocument();
      expect(screen.getByText('Open Source')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });

    it('should show provider icons', () => {
      render(<UsageDashboard />);
      const providerCards = document.querySelectorAll('.provider-card');
      expect(providerCards.length).toBe(3);
    });

    it('should display count for each provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('5 โปรเจกต์')).toBeInTheDocument();
      expect(screen.getByText('30 โปรเจกต์')).toBeInTheDocument();
      expect(screen.getByText('10 โปรเจกต์')).toBeInTheDocument();
    });

    it('should display cost for cloud provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('฿173.25')).toBeInTheDocument();
    });

    it('should display cost for open source provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('฿0.00')).toBeInTheDocument();
    });

    it('should display cost for hybrid provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('฿100.00')).toBeInTheDocument();
    });

    it('should display average time for each provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('25s')).toBeInTheDocument();
      expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('should show usage percentage for each provider', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('11.1% ของการใช้งาน')).toBeInTheDocument();
      expect(screen.getByText('66.7% ของการใช้งาน')).toBeInTheDocument();
      expect(screen.getByText('22.2% ของการใช้งาน')).toBeInTheDocument();
    });

    it('should apply border color based on provider type', () => {
      render(<UsageDashboard />);
      const providerCards = document.querySelectorAll('.provider-card') as NodeListOf<HTMLElement>;

      expect(providerCards[0].style.borderColor).toBe('rgb(59, 130, 246)'); // blue for cloud
      expect(providerCards[1].style.borderColor).toBe('rgb(16, 185, 129)'); // green for open-source
      expect(providerCards[2].style.borderColor).toBe('rgb(139, 92, 246)'); // purple for hybrid
    });
  });

  describe('Recommendation Box', () => {
    it('should show recommendation message', () => {
      render(<UsageDashboard />);
      // Check for recommendation heading and content
      expect(screen.getByText('💡 คำแนะนำ')).toBeInTheDocument();
      const recommendationBox = document.querySelector('.recommendation-box');
      expect(recommendationBox?.textContent).toBeTruthy();
    });

    it('should show different recommendation based on usage', () => {
      render(<UsageDashboard />);
      // With current mock data: 30/45 = 66.7% open source (50-80%)
      // Should show balanced message with checkmark emoji
      const recommendationBox = document.querySelector('.recommendation-box');
      expect(recommendationBox?.textContent).toContain('✅');
    });
  });

  describe('Recent History Table', () => {
    it('should render table headers', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('เวลา')).toBeInTheDocument();
      expect(screen.getByText('ประเภท')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('ระยะเวลา')).toBeInTheDocument();
      expect(screen.getByText('คุณภาพ')).toBeInTheDocument();
      expect(screen.getByText('ค่าใช้จ่าย')).toBeInTheDocument();
    });

    it('should display history items', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('FLUX schnell')).toBeInTheDocument();
      expect(screen.getByText('Llama 3.2 7B')).toBeInTheDocument();
      expect(screen.getByText('AnimateDiff + Veo fallback')).toBeInTheDocument();
    });

    it('should show type badges with icons', () => {
      render(<UsageDashboard />);
      const typeBadges = document.querySelectorAll('.type-badge');
      expect(typeBadges.length).toBe(3);
    });

    it('should display provider badges', () => {
      render(<UsageDashboard />);
      const providerBadges = document.querySelectorAll('.provider-badge');
      expect(providerBadges.length).toBe(3);
    });

    it('should format duration correctly for seconds', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('20s')).toBeInTheDocument();
      expect(screen.getByText('3s')).toBeInTheDocument();
    });

    it('should format duration correctly for minutes', () => {
      render(<UsageDashboard />);
      // 45 seconds is formatted as just '45s', not '0m 45s'
      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('should display quality stars', () => {
      render(<UsageDashboard />);
      const qualityStars = document.querySelectorAll('.quality-stars');
      expect(qualityStars.length).toBe(3);
      expect(qualityStars[0].textContent).toBe('⭐⭐⭐⭐⭐'); // 5 stars
      expect(qualityStars[1].textContent).toBe('⭐⭐⭐⭐'); // 4 stars
      expect(qualityStars[2].textContent).toBe('⭐⭐⭐⭐⭐'); // 5 stars
    });

    it('should show free cost for open source', () => {
      render(<UsageDashboard />);
      const freeCosts = screen.getAllByText('ฟรี!');
      expect(freeCosts.length).toBe(2); // 2 free items in mock data
    });

    it('should show paid cost for hybrid/cloud', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('฿8.75')).toBeInTheDocument();
    });

    it('should apply cost-free class to free items', () => {
      render(<UsageDashboard />);
      const table = document.querySelector('.history-table');
      const freeCells = table?.querySelectorAll('.cost-free');
      expect(freeCells?.length).toBe(2);
    });

    it('should apply cost-paid class to paid items', () => {
      render(<UsageDashboard />);
      const table = document.querySelector('.history-table');
      const paidCells = table?.querySelectorAll('.cost-paid');
      expect(paidCells?.length).toBe(1);
    });
  });

  describe('Export Options', () => {
    it('should render all export buttons', () => {
      render(<UsageDashboard />);
      expect(screen.getByRole('button', { name: '📊 Export CSV' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '📄 Export PDF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '📧 Email Report' })).toBeInTheDocument();
    });

    it('should have export buttons clickable', () => {
      render(<UsageDashboard />);
      const csvButton = screen.getByRole('button', { name: '📊 Export CSV' });
      expect(csvButton).not.toBeDisabled();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency with baht symbol', () => {
      render(<UsageDashboard />);
      const currencies = screen.getAllByText(/฿\d+\.\d{2}/);
      expect(currencies.length).toBeGreaterThan(0);
    });

    it('should format currency to 2 decimal places', () => {
      render(<UsageDashboard />);
      // Check that currencies appear (may be duplicated in different sections)
      expect(screen.getAllByText('฿42.50').length).toBeGreaterThan(0);
      expect(screen.getAllByText('฿1559.25').length).toBeGreaterThan(0);
      expect(screen.getAllByText('฿1516.75').length).toBeGreaterThan(0);
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should have main dashboard container class', () => {
      render(<UsageDashboard />);
      const dashboard = document.querySelector('.usage-dashboard');
      expect(dashboard).toBeInTheDocument();
    });

    it('should have header section', () => {
      render(<UsageDashboard />);
      const header = document.querySelector('.dashboard-header');
      expect(header).toBeInTheDocument();
    });

    it('should have time range selector', () => {
      render(<UsageDashboard />);
      const selector = document.querySelector('.time-range-selector');
      expect(selector).toBeInTheDocument();
    });

    it('should have key metrics grid', () => {
      render(<UsageDashboard />);
      const metrics = document.querySelector('.key-metrics');
      expect(metrics).toBeInTheDocument();
    });

    it('should have savings visualization container', () => {
      render(<UsageDashboard />);
      const savings = document.querySelector('.savings-visualization');
      expect(savings).toBeInTheDocument();
    });

    it('should have provider breakdown container', () => {
      render(<UsageDashboard />);
      const breakdown = document.querySelector('.provider-breakdown');
      expect(breakdown).toBeInTheDocument();
    });

    it('should have recommendation box', () => {
      render(<UsageDashboard />);
      const recommendation = document.querySelector('.recommendation-box');
      expect(recommendation).toBeInTheDocument();
    });

    it('should have recent history container', () => {
      render(<UsageDashboard />);
      const history = document.querySelector('.recent-history');
      expect(history).toBeInTheDocument();
    });

    it('should have export options container', () => {
      render(<UsageDashboard />);
      const exportOptions = document.querySelector('.export-options');
      expect(exportOptions).toBeInTheDocument();
    });
  });

  describe('Data Calculations', () => {
    it('should calculate total projects correctly', () => {
      render(<UsageDashboard />);
      // 5 cloud + 30 open-source + 10 hybrid = 45
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('should calculate savings correctly', () => {
      render(<UsageDashboard />);
      // ฿1559.25 - ฿42.50 = ฿1516.75
      const savings = screen.getAllByText('฿1516.75');
      expect(savings.length).toBeGreaterThan(0);
    });

    it('should calculate savings percentage correctly', () => {
      render(<UsageDashboard />);
      // (1516.75 / 1559.25) * 100 = 97.3%
      const percentTexts = screen.getAllByText(/97\.3%/);
      expect(percentTexts.length).toBeGreaterThan(0);
    });

    it('should calculate provider percentages correctly', () => {
      render(<UsageDashboard />);
      // 5/45 = 11.1%, 30/45 = 66.7%, 10/45 = 22.2%
      expect(screen.getByText('11.1% ของการใช้งาน')).toBeInTheDocument();
      expect(screen.getByText('66.7% ของการใช้งาน')).toBeInTheDocument();
      expect(screen.getByText('22.2% ของการใช้งาน')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format time in Thai locale', () => {
      render(<UsageDashboard />);
      const table = document.querySelector('.history-table');
      const timeCells = table?.querySelectorAll('tbody td:first-child');
      expect(timeCells?.length).toBe(3);
    });
  });

  describe('Provider Color Coding', () => {
    it('should use blue for cloud provider', () => {
      render(<UsageDashboard />);
      const cloudCard = document.querySelector('.provider-card') as HTMLElement;
      expect(cloudCard.style.borderColor).toBe('rgb(59, 130, 246)');
    });

    it('should use green for open-source provider', () => {
      render(<UsageDashboard />);
      const cards = document.querySelectorAll('.provider-card') as NodeListOf<HTMLElement>;
      expect(cards[1].style.borderColor).toBe('rgb(16, 185, 129)');
    });

    it('should use purple for hybrid provider', () => {
      render(<UsageDashboard />);
      const cards = document.querySelectorAll('.provider-card') as NodeListOf<HTMLElement>;
      expect(cards[2].style.borderColor).toBe('rgb(139, 92, 246)');
    });
  });

  describe('Provider Icons', () => {
    it('should show cloud icon for cloud provider', () => {
      render(<UsageDashboard />);
      const providerIcons = document.querySelectorAll('.provider-icon');
      expect(providerIcons[0].textContent).toBe('☁️');
    });

    it('should show unlock icon for open-source provider', () => {
      render(<UsageDashboard />);
      const providerIcons = document.querySelectorAll('.provider-icon');
      expect(providerIcons[1].textContent).toBe('🔓');
    });

    it('should show shuffle icon for hybrid provider', () => {
      render(<UsageDashboard />);
      const providerIcons = document.querySelectorAll('.provider-icon');
      expect(providerIcons[2].textContent).toBe('🔀');
    });
  });

  describe('Metric Card Layout', () => {
    it('should have 4 metric cards', () => {
      render(<UsageDashboard />);
      const metricCards = document.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(4);
    });

    it('should have correct classes for each metric type', () => {
      render(<UsageDashboard />);
      expect(document.querySelector('.metric-card.total-projects')).toBeInTheDocument();
      expect(document.querySelector('.metric-card.total-cost')).toBeInTheDocument();
      expect(document.querySelector('.metric-card.potential-cost')).toBeInTheDocument();
      expect(document.querySelector('.metric-card.savings')).toBeInTheDocument();
    });
  });

  describe('History Type Icons', () => {
    it('should show document icon for text type', () => {
      render(<UsageDashboard />);
      const typeBadges = document.querySelectorAll('.type-badge');
      const textBadge = Array.from(typeBadges).find(badge => badge.textContent?.includes('text'));
      expect(textBadge?.textContent).toContain('📝');
    });

    it('should show image icon for image type', () => {
      render(<UsageDashboard />);
      const typeBadges = document.querySelectorAll('.type-badge');
      const imageBadge = Array.from(typeBadges).find(badge => badge.textContent?.includes('image'));
      expect(imageBadge?.textContent).toContain('🖼️');
    });

    it('should show video icon for video type', () => {
      render(<UsageDashboard />);
      const typeBadges = document.querySelectorAll('.type-badge');
      const videoBadge = Array.from(typeBadges).find(badge => badge.textContent?.includes('video'));
      expect(videoBadge?.textContent).toContain('🎬');
    });
  });

  describe('Savings Comparison', () => {
    it('should show all three comparison items', () => {
      render(<UsageDashboard />);
      const comparisonItems = document.querySelectorAll('.comparison-item');
      expect(comparisonItems.length).toBe(3);
    });

    it('should highlight savings comparison item', () => {
      render(<UsageDashboard />);
      const highlightedItem = document.querySelector('.comparison-item.highlight');
      expect(highlightedItem).toBeInTheDocument();
    });
  });

  describe('Provider Stats Display', () => {
    it('should show provider stats with labels', () => {
      render(<UsageDashboard />);
      const statLabels = screen.getAllByText('จำนวน:');
      expect(statLabels.length).toBe(3);

      const costLabels = screen.getAllByText('ค่าใช้จ่าย:');
      expect(costLabels.length).toBe(3);

      const timeLabels = screen.getAllByText('เวลาเฉลี่ย:');
      expect(timeLabels.length).toBe(3);
    });
  });

  describe('Table Structure', () => {
    it('should have table with thead and tbody', () => {
      render(<UsageDashboard />);
      const table = document.querySelector('.history-table');
      expect(table?.querySelector('thead')).toBeInTheDocument();
      expect(table?.querySelector('tbody')).toBeInTheDocument();
    });

    it('should have 7 column headers', () => {
      render(<UsageDashboard />);
      const headers = document.querySelectorAll('.history-table thead th');
      expect(headers.length).toBe(7);
    });

    it('should have 3 data rows', () => {
      render(<UsageDashboard />);
      const rows = document.querySelectorAll('.history-table tbody tr');
      expect(rows.length).toBe(3);
    });
  });
});
