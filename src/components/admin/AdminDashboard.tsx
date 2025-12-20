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
} from '../../services/adminAnalyticsService';
import { getProjectCostSummary } from '../../services/projectCostMonitor';
import type {
  UserStats,
  RevenueMetrics,
  UsageAnalytics,
  UserListItem,
  SubscriptionTier,
} from '../../types';
import { OverviewCards } from './OverviewCards';
import { UserTable } from './UserTable';
import { ExportButton } from './ExportButton';
import { UserDetailsModal } from './UserDetailsModal';
import { EnhancedUserDetailsModal } from './EnhancedUserDetailsModal';
import { AdminUserManagement } from './AdminUserManagement';
import { RevenueChart } from './RevenueChart';
import { UsageChart } from './UsageChart';
import { AdminAlerts } from './AdminAlerts';
import { ProjectCostDashboard } from './ProjectCostDashboard';
import { ProfitLossComparisonDashboard } from './ProfitLossComparisonDashboard';
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
      const [statsData, revenueData, usageData, costData] = await Promise.all([
        getUserStats(),
        getRevenueMetrics(),
        getUsageAnalytics(),
        getProjectCostSummary(),
      ]);

      setStats(statsData);
      setRevenue(revenueData);
      setUsage(usageData);
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
            />
          )}

          {/* Analytics Charts */}
          <div className="charts-section">
            {revenue && (
              <div className="chart-card full-width">
                <RevenueChart revenue={revenue} />
              </div>
            )}

            {usage && (
              <div className="chart-card full-width">
                <UsageChart usage={usage} />
              </div>
            )}
          </div>

          {/* Users Distribution */}
          <div className="charts-section">
            <div className="chart-card">
              <h3>Users by Tier</h3>
              {stats && (
                <div className="tier-distribution">
                  {/* FREE */}
                  <div className="tier-item">
                    <div className="tier-header">
                      <span className="tier-label">FREE</span>
                      <span className="tier-count">{stats.byTier.free}</span>
                    </div>
                    {stats.tierMetrics && (
                      <div className="tier-metrics">
                        <div className="metric-row">
                          <span className="metric-label">Rev:</span>
                          <span className="metric-value revenue">฿{stats.tierMetrics.free.revenue.toLocaleString()}</span>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">Cost:</span>
                          <span className="metric-value cost">฿{stats.tierMetrics.free.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BASIC */}
                  <div className="tier-item">
                    <div className="tier-header">
                      <span className="tier-label">BASIC</span>
                      <span className="tier-count">{stats.byTier.basic}</span>
                    </div>
                    {stats.tierMetrics && (
                      <div className="tier-metrics">
                        <div className="metric-row">
                          <span className="metric-label">Rev:</span>
                          <span className="metric-value revenue">฿{stats.tierMetrics.basic.revenue.toLocaleString()}</span>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">Cost:</span>
                          <span className="metric-value cost">฿{stats.tierMetrics.basic.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRO */}
                  <div className="tier-item">
                    <div className="tier-header">
                      <span className="tier-label">PRO</span>
                      <span className="tier-count">{stats.byTier.pro}</span>
                    </div>
                    {stats.tierMetrics && (
                      <div className="tier-metrics">
                        <div className="metric-row">
                          <span className="metric-label">Rev:</span>
                          <span className="metric-value revenue">฿{stats.tierMetrics.pro.revenue.toLocaleString()}</span>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">Cost:</span>
                          <span className="metric-value cost">฿{stats.tierMetrics.pro.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ENTERPRISE */}
                  <div className="tier-item">
                    <div className="tier-header">
                      <span className="tier-label">ENTERPRISE</span>
                      <span className="tier-count">{stats.byTier.enterprise}</span>
                    </div>
                    {stats.tierMetrics && (
                      <div className="tier-metrics">
                        <div className="metric-row">
                          <span className="metric-label">Rev:</span>
                          <span className="metric-value revenue">฿{stats.tierMetrics.enterprise.revenue.toLocaleString()}</span>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">Cost:</span>
                          <span className="metric-value cost">฿{stats.tierMetrics.enterprise.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="chart-card">
              <h3>Top Users</h3>
              {usage && (
                <div className="veo-users">
                  {usage.veoVideos.byUser.slice(0, 5).map((user: any, index: number) => (
                    <div key={index} className="veo-user-item">
                      <span className="user-email">{user.email}</span>
                      <span className="user-veo-count">{user.count} videos</span>
                    </div>
                  ))}
                  {usage.veoVideos.byUser.length === 0 && (
                    <p className="no-data">No Veo videos generated yet</p>
                  )}
                </div>
              )}
            </div>
          </div>

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

