/**
 * Admin Dashboard Component
 *
 * Dashboard หลักสำหรับ admin ดู analytics และจัดการระบบ
 */

import React, { useEffect, useState } from 'react';
import { auth } from '../../config/firebase';
import { initAdminSession } from '../../services/adminAuthService';
import {
  getUserStats,
  getRevenueMetrics,
  getUsageAnalytics,
  getUserList,
  subscribeToAnalytics,
  getQueueMetrics,
} from '../../services/adminAnalyticsService';
import { getProjectCostSummary } from '../../services/projectCostMonitor';
import type {
  UserStats,
  RevenueMetrics,
  UsageAnalytics,
  UserListItem,
  SubscriptionTier,
  QueueMetrics,
} from '../../types';
import { OverviewCards } from './OverviewCards';
import { UserTable } from './UserTable';
import { ExportButton } from './ExportButton';
import { UserDetailsModal } from './UserDetailsModal';
import { EnhancedUserDetailsModal } from './EnhancedUserDetailsModal';
import { AdminUserManagement } from './AdminUserManagement';
import { RevenueChart } from './RevenueChart';
import { UsageChartsSection } from './UsageChartsSection';
import { EnhancedUsageBarChart } from './EnhancedUsageBarChart';
import { QueueGaugeChart } from './QueueGaugeChart';
import { CollapsibleTierCard } from './CollapsibleTierCard';
import { AdminAlerts } from './AdminAlerts';
import { ProjectCostDashboard } from './ProjectCostDashboard';
import { ProfitLossComparisonDashboard } from './ProfitLossComparisonDashboard';
import { Top10Users } from './Top10Users';
import { logger } from '../../utils/logger';
import './AdminDashboard.css';
import './EnhancedUserDetailsModal.css';

type TabView = 'analytics' | 'users-management' | 'alerts' | 'project-costs' | 'profit-loss';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('analytics');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [usage, setUsage] = useState<UsageAnalytics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [averageCostPerUser, setAverageCostPerUser] = useState<number>(0);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<SubscriptionTier | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // User Details Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [useEnhancedModal] = useState(true); // Always use enhanced modal

  // Initialize admin session with auto token refresh
  useEffect(() => {
    async function init() {
      try {
        // Force token refresh on first load to get latest claims
        if (auth.currentUser) {
          logger.debug('Refreshing token on Admin Dashboard load');
          await auth.currentUser.getIdToken(true);
          const tokenResult = await auth.currentUser.getIdTokenResult();
          logger.debug('Token refreshed', {
            email: auth.currentUser.email,
            admin: tokenResult.claims.admin,
            adminRole: tokenResult.claims.adminRole,
          });
        }

        const session = await initAdminSession();

        if (!session.isAdmin) {
          console.error('❌ Not admin:', session);

          // Check if user has claims but session failed
          if (auth.currentUser) {
            const tokenResult = await auth.currentUser.getIdTokenResult();
            if (tokenResult.claims.admin) {
              logger.warn('Has admin claims but session failed, retrying');
              // Retry once
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retrySession = await initAdminSession();
              if (retrySession.isAdmin) {
                setAuthorized(true);
                await loadData();
                setLoading(false);
                return;
              }
            }
          }

          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load initial data
        await loadData();

        setLoading(false);
      } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        setAuthorized(false);
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!authorized) return;

    const unsubscribe = subscribeToAnalytics(data => {
      setStats(data.stats);
      setRevenue(data.revenue);
      setUsage(data.usage);
    });

    return () => unsubscribe();
  }, [authorized]);

  // Load data
  async function loadData() {
    try {
      const [statsData, revenueData, usageData, queueData, costData] = await Promise.all([
        getUserStats(),
        getRevenueMetrics(),
        getUsageAnalytics(),
        getQueueMetrics(),
        getProjectCostSummary(),
      ]);

      setStats(statsData);
      setRevenue(revenueData);
      setUsage(usageData);
      setQueueMetrics(queueData);
      setAverageCostPerUser(costData.userCosts.averageCostPerUser);

      await loadUsers();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Load users list
  async function loadUsers(page = 1) {
    try {
      const result = await getUserList({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        tier: filterTier !== 'all' ? filterTier : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        sortBy: 'lastActive',
        sortOrder: 'desc',
      });

      setUsers(result.users);
      setTotalUsers(result.total);
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Handle search
  function handleSearch(query: string) {
    setSearchQuery(query);
    setCurrentPage(1);
  }

  // Handle filter change
  function handleFilterChange(type: 'tier' | 'status', value: string) {
    if (type === 'tier') {
      setFilterTier(value as SubscriptionTier | 'all');
    } else {
      setFilterStatus(value);
    }
    setCurrentPage(1);
  }

  // Apply filters
  useEffect(() => {
    if (authorized) {
      loadUsers(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterTier, filterStatus, currentPage, authorized]);

  // Loading state
  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  // Unauthorized state
  if (!authorized) {
    return (
      <div className="admin-dashboard unauthorized">
        <div className="access-denied">
          <h1>🔒 Access Denied</h1>
          <p>You don&apos;t have permission to access this page.</p>
          <p>Please contact a system administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>📊 Admin Analytics Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              height: '40px',
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
          >
            🏠 Back to Studio
          </button>
          <ExportButton />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics & Users
        </button>
        <button
          className={`tab-button ${activeTab === 'project-costs' ? 'active' : ''}`}
          onClick={() => setActiveTab('project-costs')}
        >
          💰 Project Costs
        </button>
        <button
          className={`tab-button ${activeTab === 'profit-loss' ? 'active' : ''}`}
          onClick={() => setActiveTab('profit-loss')}
        >
          📊 Profit & Loss
        </button>
        <button
          className={`tab-button ${activeTab === 'users-management' ? 'active' : ''}`}
          onClick={() => setActiveTab('users-management')}
        >
          👥 Admin Management
        </button>
        <button
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Alerts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          {/* Analytics Tab */}

          {/* Overview Cards */}
          {stats && revenue && usage && (
            <OverviewCards
              stats={stats}
              revenue={revenue}
              usage={usage}
              averageCostPerUser={averageCostPerUser}
              totalCost={
                (stats.tierMetrics?.free?.cost || 0) +
                (stats.tierMetrics?.basic?.cost || 0) +
                (stats.tierMetrics?.pro?.cost || 0) +
                (stats.tierMetrics?.enterprise?.cost || 0)
              }
            />
          )}

          {/* Usage Charts Section - Visual Analytics */}
          {usage && (
            <UsageChartsSection usage={usage} />
          )}

          {/* Analytics Charts */}
          <div className="charts-section">
            {revenue && (
              <div className="chart-card full-width">
                <RevenueChart revenue={revenue} />
              </div>
            )}

            {usage && revenue && stats && stats.tierMetrics && (
              <div className="chart-card full-width">
                <EnhancedUsageBarChart 
                  usage={usage} 
                  revenue={revenue}
                  totalCost={
                    (stats.tierMetrics.free?.cost || 0) +
                    (stats.tierMetrics.basic?.cost || 0) +
                    (stats.tierMetrics.pro?.cost || 0) +
                    (stats.tierMetrics.enterprise?.cost || 0)
                  }
                />
              </div>
            )}
          </div>

          {/* Users Distribution */}
          <div className="charts-section">
            <div className="chart-card">
              <h3>📊 Users by Tier</h3>
              {stats && usage && usage.tierBreakdown && (
                <div className="tier-distribution-collapsible">
                  <CollapsibleTierCard
                    tier="free"
                    count={stats.byTier.free}
                    revenue={stats.tierMetrics?.free.revenue || 0}
                    cost={stats.tierMetrics?.free.cost || 0}
                    breakdown={usage.tierBreakdown.free}
                  />
                  <CollapsibleTierCard
                    tier="basic"
                    count={stats.byTier.basic}
                    revenue={stats.tierMetrics?.basic.revenue || 0}
                    cost={stats.tierMetrics?.basic.cost || 0}
                    breakdown={usage.tierBreakdown.basic}
                  />
                  <CollapsibleTierCard
                    tier="pro"
                    count={stats.byTier.pro}
                    revenue={stats.tierMetrics?.pro.revenue || 0}
                    cost={stats.tierMetrics?.pro.cost || 0}
                    breakdown={usage.tierBreakdown.pro}
                  />
                  <CollapsibleTierCard
                    tier="enterprise"
                    count={stats.byTier.enterprise}
                    revenue={stats.tierMetrics?.enterprise.revenue || 0}
                    cost={stats.tierMetrics?.enterprise.cost || 0}
                    breakdown={usage.tierBreakdown.enterprise}
                  />
                </div>
              )}
            </div>

            <div className="chart-card">
              {queueMetrics && <QueueGaugeChart metrics={queueMetrics} />}
              {!queueMetrics && (
                <div className="loading-placeholder">กำลังโหลดข้อมูลคิวงาน...</div>
              )}
            </div>
          </div>

          {/* TOP 10 Users */}
          <Top10Users />

          {/* User Table */}
          <UserTable
            users={users}
            totalUsers={totalUsers}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            searchQuery={searchQuery}
            filterTier={filterTier}
            filterStatus={filterStatus}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onPageChange={setCurrentPage}
            onUserClick={setSelectedUserId}
          />

          {/* User Details Modal */}
          {selectedUserId && useEnhancedModal && (
            <EnhancedUserDetailsModal
              userId={selectedUserId}
              onClose={() => setSelectedUserId(null)}
            />
          )}
          {selectedUserId && !useEnhancedModal && (
            <UserDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
          )}
        </div>
      )}

      {/* Project Costs Tab */}
      {activeTab === 'project-costs' && (
        <div className="tab-content">
          <ProjectCostDashboard />
        </div>
      )}

      {/* Profit & Loss Tab */}
      {activeTab === 'profit-loss' && (
        <div className="tab-content">
          <ProfitLossComparisonDashboard />
        </div>
      )}

      {/* Admin Users Management Tab */}
      {activeTab === 'users-management' && (
        <div className="tab-content">
          <AdminUserManagement />
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="tab-content">
          <AdminAlerts />
        </div>
      )}
    </div>
  );
};

