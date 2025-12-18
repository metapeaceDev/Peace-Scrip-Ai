/**
 * User Details Modal Component
 * 
 * แสดงรายละเอียดเต็มของ user แต่ละคน
 * รวมถึง subscription, projects, usage history
 */

import React, { useEffect, useState } from 'react';
import { getUserDetails } from '../../services/adminAnalyticsService';
import type { UserDetails } from '../../../types';

interface UserDetailsModalProps {
  userId: string;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadDetails() {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserDetails(userId);
      setDetails(data);
    } catch (err) {
      console.error('Error loading user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Handle backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="user-details-modal">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="user-details-modal">
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
      <div className="user-details-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>User Details</h2>
            <p className="user-id">ID: {userId}</p>
          </div>
          <button onClick={onClose} className="close-button">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* User Info Section */}
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

          {/* Subscription Section */}
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

          {/* Usage Section */}
          <section className="detail-section">
            <h3>📊 Monthly Usage</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Credits Used:</label>
                <span>{details.usage.credits.used} / {details.usage.credits.max}</span>
                <div className="progress-bar-small">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        (details.usage.credits.used / details.usage.credits.max) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="detail-item">
                <label>Veo Videos:</label>
                <span>
                  {details.usage.veoVideos.used} / {details.usage.veoVideos.max || 'Unlimited'}
                </span>
              </div>
              <div className="detail-item">
                <label>Projects:</label>
                <span>{details.usage.projects}</span>
              </div>
              <div className="detail-item">
                <label>Characters:</label>
                <span>{details.usage.characters}</span>
              </div>
              <div className="detail-item">
                <label>Scenes:</label>
                <span>{details.usage.scenes}</span>
              </div>
              <div className="detail-item">
                <label>Storage Used:</label>
                <span>{(details.usage.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB</span>
              </div>
            </div>
          </section>

          {/* Projects Section */}
          <section className="detail-section">
            <h3>📁 Projects ({details.projects.length})</h3>
            {details.projects.length === 0 ? (
              <p className="empty-state">No projects yet</p>
            ) : (
              <div className="projects-list">
                {details.projects.slice(0, 10).map((project) => (
                  <div key={project.id} className="project-item">
                    <div className="project-info">
                      <h4>{project.title}</h4>
                      <p className="project-meta">
                        {project.type} • Created {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {details.projects.length > 10 && (
                  <p className="show-more">+ {details.projects.length - 10} more projects</p>
                )}
              </div>
            )}
          </section>
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
