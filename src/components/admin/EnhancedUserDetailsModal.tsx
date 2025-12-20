/**
 * Enhanced User Details Modal Component
 *
 * แสดงรายละเอียดแบบละเอียด: โมเดลที่ใช้, ต้นทุนจริง, ออฟไลน์
 */

import React, { useEffect, useState } from 'react';
import { getUserDetails } from '../../services/adminAnalyticsService';
import {
  getUserModelUsage,
  getRecentGenerations,
  getUserOfflineActivity,
} from '../../services/modelUsageTracker';
import type { UserDetails } from '../../types';
import type { ModelUsage, GenerationDetails, UserOfflineActivity } from '../../types/analytics';

interface EnhancedUserDetailsModalProps {
  userId: string;
  onClose: () => void;
}

export const EnhancedUserDetailsModal: React.FC<EnhancedUserDetailsModalProps> = ({
  userId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [modelUsage, setModelUsage] = useState<{
    byModel: ModelUsage[];
    totalGenerations: number;
    totalCostTHB: number;
    breakdown: {
      text: { count: number; cost: number; models: string[] };
      image: { count: number; cost: number; models: string[] };
      video: { count: number; cost: number; models: string[] };
    };
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<GenerationDetails[]>([]);
  const [offlineActivity, setOfflineActivity] = useState<UserOfflineActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'activity'>('overview');

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [userDetails, usage, activity, offline] = await Promise.all([
        getUserDetails(userId),
        getUserModelUsage(userId),
        getRecentGenerations(userId, 20),
        getUserOfflineActivity(userId),
      ]);

      setDetails(userDetails);
      setModelUsage(usage);
      setRecentActivity(activity);
      setOfflineActivity(offline);
    } catch (err) {
      console.error('Error loading enhanced user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp: Date | { toDate: () => Date } | null | undefined): string {
    if (!timestamp) return 'N/A';
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      date = timestamp.toDate();
    } else {
      return 'N/A';
    }
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}min`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  function getTierBadgeClass(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'enterprise':
        return 'tier-badge-enterprise';
      case 'pro':
        return 'tier-badge-pro';
      case 'basic':
        return 'tier-badge-basic';
      default:
        return 'tier-badge-free';
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-badge-active';
      case 'canceled':
        return 'status-badge-canceled';
      case 'past_due':
        return 'status-badge-past-due';
      default:
        return 'status-badge-canceled';
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="user-details-modal enhanced-modal">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading enhanced user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="user-details-modal enhanced-modal">
          <div className="error-state">
            <h3>⚠️ Error</h3>
            <p>{error || 'User not found'}</p>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="user-details-modal enhanced-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Enhanced User Details</h2>
            <p className="user-email">{details.profile.email}</p>
          </div>
          <button onClick={onClose} className="close-button" aria-label="Close modal">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            🤖 Model Usage
          </button>
          <button
            className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📈 Activity Log
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* User Info */}
              <section className="detail-section">
                <h3>👤 User Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{details.profile.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Display Name:</label>
                    <span>{details.profile.displayName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{formatDate(details.profile.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Active:</label>
                    <span>{formatDate(details.profile.lastActive)}</span>
                  </div>
                </div>
              </section>

              {/* Subscription */}
              <section className="detail-section">
                <h3>💳 Subscription</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Tier:</label>
                    <span className={getTierBadgeClass(details.subscription.tier)}>
                      {details.subscription.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={getStatusBadgeClass(details.subscription.status)}>
                      {details.subscription.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Started:</label>
                    <span>{formatDate(details.subscription.startDate)}</span>
                  </div>
                  {details.subscription.canceledAt && (
                    <div className="detail-item">
                      <label>Canceled:</label>
                      <span>{formatDate(details.subscription.canceledAt)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Usage Summary */}
              <section className="detail-section">
                <h3>📊 Usage Summary</h3>
                <div className="usage-cards">
                  <div className="usage-card">
                    <div className="usage-icon">🎬</div>
                    <div className="usage-data">
                      <div className="usage-value">{details.usage.projects}</div>
                      <div className="usage-label">Projects</div>
                    </div>
                  </div>
                  <div className="usage-card">
                    <div className="usage-icon">👥</div>
                    <div className="usage-data">
                      <div className="usage-value">{details.usage.characters}</div>
                      <div className="usage-label">Characters</div>
                    </div>
                  </div>
                  <div className="usage-card">
                    <div className="usage-icon">🎞️</div>
                    <div className="usage-data">
                      <div className="usage-value">{details.usage.scenes}</div>
                      <div className="usage-label">Scenes</div>
                    </div>
                  </div>
                  <div className="usage-card">
                    <div className="usage-icon">⚡</div>
                    <div className="usage-data">
                      <div className="usage-value">
                        {details.usage.credits.used}/{details.usage.credits.max}
                      </div>
                      <div className="usage-label">Credits Used</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Offline Activity */}
              {offlineActivity && (
                <section className="detail-section">
                  <h3>🌐 Offline Activity</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Total Sessions:</label>
                      <span>{offlineActivity.sessionCount}</span>
                    </div>
                    <div className="detail-item">
                      <label>Avg Session:</label>
                      <span>{offlineActivity.avgSessionDuration.toFixed(1)} min</span>
                    </div>
                    <div className="detail-item">
                      <label>Total Time:</label>
                      <span>{(offlineActivity.totalTimeSpent / 60).toFixed(1)} hours</span>
                    </div>
                    <div className="detail-item">
                      <label>Device:</label>
                      <span>
                        {offlineActivity.deviceInfo.browser} on {offlineActivity.deviceInfo.os}
                      </span>
                    </div>
                    {offlineActivity.locationData && (
                      <>
                        <div className="detail-item">
                          <label>Location:</label>
                          <span>
                            {offlineActivity.locationData.region},{' '}
                            {offlineActivity.locationData.country}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Timezone:</label>
                          <span>{offlineActivity.locationData.timezone}</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Model Usage Tab */}
          {activeTab === 'models' && modelUsage && (
            <>
              {/* Cost Overview */}
              <section className="detail-section">
                <h3>💰 Generation Costs</h3>
                <div className="cost-summary">
                  <div className="cost-card primary">
                    <div className="cost-label">Total Generations</div>
                    <div className="cost-value">{modelUsage.totalGenerations}</div>
                  </div>
                  <div className="cost-card primary">
                    <div className="cost-label">Total Cost</div>
                    <div className="cost-value">฿{modelUsage.totalCostTHB.toFixed(2)}</div>
                  </div>
                </div>

                <div className="cost-breakdown">
                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">📝</span>
                      <span className="breakdown-title">Text Generation</span>
                    </div>
                    <div className="breakdown-stats">
                      <span>{modelUsage.breakdown.text.count} times</span>
                      <span className="breakdown-cost">
                        ฿{modelUsage.breakdown.text.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="breakdown-models">
                      {modelUsage.breakdown.text.models.join(', ') || 'None'}
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">🎨</span>
                      <span className="breakdown-title">Image Generation</span>
                    </div>
                    <div className="breakdown-stats">
                      <span>{modelUsage.breakdown.image.count} times</span>
                      <span className="breakdown-cost">
                        ฿{modelUsage.breakdown.image.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="breakdown-models">
                      {modelUsage.breakdown.image.models.join(', ') || 'None'}
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">🎬</span>
                      <span className="breakdown-title">Video Generation</span>
                    </div>
                    <div className="breakdown-stats">
                      <span>{modelUsage.breakdown.video.count} times</span>
                      <span className="breakdown-cost">
                        ฿{modelUsage.breakdown.video.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="breakdown-models">
                      {modelUsage.breakdown.video.models.join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Model Details */}
              <section className="detail-section">
                <h3>🤖 Models Used</h3>
                {modelUsage.byModel.length === 0 ? (
                  <p className="empty-state">No model usage yet</p>
                ) : (
                  <div className="models-table">
                    <div className="table-header">
                      <div>Model</div>
                      <div>Type</div>
                      <div>Count</div>
                      <div>Cost</div>
                      <div>Last Used</div>
                    </div>
                    {modelUsage.byModel.map((model, idx) => (
                      <div key={idx} className="table-row">
                        <div className="model-name">
                          {model.modelName}
                          <span className="model-provider">{model.provider}</span>
                        </div>
                        <div className="model-type">
                          {model.type === 'text' && '📝'}
                          {model.type === 'image' && '🎨'}
                          {model.type === 'video' && '🎬'}
                          {model.type}
                        </div>
                        <div>{model.count}×</div>
                        <div className="model-cost">฿{model.totalCost.toFixed(2)}</div>
                        <div className="model-date">{formatDate(model.lastUsed)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <section className="detail-section">
              <h3>📈 Recent Activity (Last 20)</h3>
              {recentActivity.length === 0 ? (
                <p className="empty-state">No activity yet</p>
              ) : (
                <div className="activity-timeline">
                  {recentActivity.map(activity => (
                    <div
                      key={activity.id}
                      className={`activity-item ${activity.success ? 'success' : 'failed'}`}
                    >
                      <div className="activity-icon">
                        {activity.type === 'text' && '📝'}
                        {activity.type === 'image' && '🎨'}
                        {activity.type === 'video' && '🎬'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-model">{activity.modelName}</span>
                          <span className="activity-time">{formatDate(activity.timestamp)}</span>
                        </div>
                        <div className="activity-details">
                          <span className="activity-type">{activity.type}</span>
                          {activity.duration && <span>• {formatDuration(activity.duration)}</span>}
                          <span>
                            • {activity.costInCredits} credits (฿
                            {activity.costInTHB.toFixed(2)})
                          </span>
                          {!activity.success && <span className="activity-failed">• Failed</span>}
                        </div>
                        {activity.metadata?.prompt && (
                          <div className="activity-prompt">
                            &quot;{activity.metadata.prompt.substring(0, 100)}
                            {activity.metadata.prompt.length > 100 && '...'}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

