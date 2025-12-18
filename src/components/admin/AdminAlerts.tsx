/**
 * Admin Alerts Component
 * 
 * แสดง alerts และ notifications สำหรับ admin เพื่อติดตามเหตุการณ์สำคัญ
 */

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface AdminAlert {
  id: string;
  type: 'cost-spike' | 'abuse-detected' | 'quota-exceeded' | 'system-error' | 'new-enterprise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  userId?: string;
  userEmail?: string;
  data?: any;
  createdAt: Timestamp;
  resolved: boolean;
}

export const AdminAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    try {
      setLoading(true);
      
      // ในการใช้จริงควรมี collection /admin-alerts ใน Firestore
      // ตอนนี้ใช้ dummy data เพื่อแสดง UI
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dummy alerts data
      const dummyAlerts: AdminAlert[] = [
        {
          id: '1',
          type: 'cost-spike',
          severity: 'high',
          title: 'Unusual Cost Spike Detected',
          message: 'API costs increased by 300% in the last hour. User making excessive Veo video requests.',
          userId: 'user123',
          userEmail: 'heavy.user@example.com',
          data: { cost: 450, normalCost: 150 },
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)), // 30 min ago
          resolved: false,
        },
        {
          id: '2',
          type: 'quota-exceeded',
          severity: 'medium',
          title: 'User Quota Exceeded',
          message: 'FREE tier user exceeded monthly credit limit. Consider upgrading or blocking.',
          userId: 'user456',
          userEmail: 'quota.user@example.com',
          data: { used: 150, limit: 100 },
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 2)), // 2 hours ago
          resolved: false,
        },
        {
          id: '3',
          type: 'new-enterprise',
          severity: 'low',
          title: 'New Enterprise Subscription',
          message: 'New ENTERPRISE tier subscription. Welcome onboarding may be needed.',
          userId: 'user789',
          userEmail: 'enterprise@company.com',
          data: { plan: 'ENTERPRISE', mrr: 8000 },
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 5)), // 5 hours ago
          resolved: true,
        },
        {
          id: '4',
          type: 'abuse-detected',
          severity: 'critical',
          title: 'Potential Abuse Detected',
          message: 'User making 100+ API calls per minute. Possible bot or abuse.',
          userId: 'user999',
          userEmail: 'suspicious@example.com',
          data: { callsPerMinute: 127 },
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 15)), // 15 min ago
          resolved: false,
        },
      ];
      
      const filtered = filter === 'unresolved' 
        ? dummyAlerts.filter(a => !a.resolved)
        : dummyAlerts;
      
      setAlerts(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setLoading(false);
    }
  }

  function getAlertIcon(type: AdminAlert['type']) {
    switch (type) {
      case 'cost-spike': return '💸';
      case 'abuse-detected': return '🚨';
      case 'quota-exceeded': return '⚠️';
      case 'system-error': return '❌';
      case 'new-enterprise': return '🎉';
      default: return '📢';
    }
  }

  function getSeverityClass(severity: AdminAlert['severity']) {
    return `alert-severity-${severity}`;
  }

  function formatTime(timestamp: Timestamp) {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <div className="admin-alerts loading">
        <div className="spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="admin-alerts">
      <div className="alerts-header">
        <div className="header-left">
          <h3>🔔 System Alerts</h3>
          <span className="alert-count">
            {alerts.length} {filter === 'unresolved' ? 'unresolved' : 'total'}
          </span>
        </div>
        <div className="header-right">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'unresolved' ? 'active' : ''}`}
              onClick={() => setFilter('unresolved')}
            >
              Unresolved
            </button>
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Alerts
            </button>
          </div>
          <button className="btn-refresh" onClick={loadAlerts}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✅</div>
          <h4>All Clear!</h4>
          <p>No {filter === 'unresolved' ? 'unresolved ' : ''}alerts at this time.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-item ${getSeverityClass(alert.severity)} ${alert.resolved ? 'resolved' : ''}`}
            >
              <div className="alert-icon">{getAlertIcon(alert.type)}</div>
              
              <div className="alert-content">
                <div className="alert-header-row">
                  <h4 className="alert-title">{alert.title}</h4>
                  <span className="alert-time">{formatTime(alert.createdAt)}</span>
                </div>
                
                <p className="alert-message">{alert.message}</p>
                
                {alert.userEmail && (
                  <div className="alert-user">
                    <span className="user-label">User:</span>
                    <span className="user-email">{alert.userEmail}</span>
                  </div>
                )}
                
                {alert.data && (
                  <div className="alert-data">
                    <details>
                      <summary>View Details</summary>
                      <pre>{JSON.stringify(alert.data, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
              
              <div className="alert-actions">
                <span className={`severity-badge ${getSeverityClass(alert.severity)}`}>
                  {alert.severity.toUpperCase()}
                </span>
                {alert.resolved ? (
                  <span className="resolved-badge">✓ Resolved</span>
                ) : (
                  <button className="btn-resolve">Resolve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="alerts-footer">
        <p className="footer-note">
          💡 <strong>Note:</strong> This is a preview with sample data. 
          In production, alerts will be generated automatically based on system monitoring.
        </p>
      </div>
    </div>
  );
};
