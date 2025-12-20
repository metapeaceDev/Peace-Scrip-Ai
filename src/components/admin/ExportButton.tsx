/**
 * Export Button Component
 *
 * ปุ่มสำหรับ export ข้อมูล analytics
 */

import React, { useState } from 'react';
import { exportAnalyticsCSV } from '../../services/adminAnalyticsService';
import { logAdminAction } from '../../services/adminAuthService';
import { logger } from '../../utils/logger';

export const ExportButton: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    try {
      setExporting(true);

      // Export data
      const csvData = await exportAnalyticsCSV();

      // Log action
      await logAdminAction('export-data', {
        data: { format: 'csv', timestamp: new Date().toISOString() },
      });

      // Download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `peace-script-analytics-${Date.now()}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logger.info('CSV exported successfully');
    } catch (error) {
      logger.error('Error exporting CSV', { error });
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="export-button">
      <button className="btn-export" onClick={handleExportCSV} disabled={exporting}>
        {exporting ? '📊 Exporting...' : '📊 Export CSV'}
      </button>
    </div>
  );
};

