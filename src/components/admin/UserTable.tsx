/**
 * User Table Component
 * 
 * แสดงตาราง users พร้อม search, filter, pagination
 */

import React from 'react';
import type { UserListItem, SubscriptionTier } from '../../../types';

interface UserTableProps {
  users: UserListItem[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  filterTier: SubscriptionTier | 'all';
  filterStatus: string;
  onSearch: (query: string) => void;
  onFilterChange: (type: 'tier' | 'status', value: string) => void;
  onPageChange: (page: number) => void;
  onUserClick?: (userId: string) => void; // Add onClick handler
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  totalUsers,
  currentPage,
  totalPages,
  searchQuery,
  filterTier,
  filterStatus,
  onSearch,
  onFilterChange,
  onPageChange,
  onUserClick,
}) => {
  return (
    <div className="user-table-section">
      <div className="table-header">
        <h2>👥 Users ({totalUsers})</h2>
        
        <div className="table-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by email, name, or ID..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
          
          <select
            className="filter-select"
            value={filterTier}
            onChange={(e) => onFilterChange('tier', e.target.value)}
          >
            <option value="all">All Tiers</option>
            <option value="free">FREE</option>
            <option value="basic">BASIC</option>
            <option value="pro">PRO</option>
            <option value="enterprise">ENTERPRISE</option>
          </select>
          
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Credits</th>
              <th>Veo Videos</th>
              <th>Last Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-data">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.userId}
                  onClick={() => onUserClick?.(user.userId)}
                  style={{ cursor: onUserClick ? 'pointer' : 'default' }}
                  title="Click to view details"
                >
                  <td>
                    <div className="user-email">
                      {user.photoURL && (
                        <img src={user.photoURL} alt="" className="user-avatar" />
                      )}
                      <span title={user.email}>
                        {maskEmail(user.email)}
                      </span>
                    </div>
                  </td>
                  <td>{user.displayName}</td>
                  <td>
                    <span className={`tier-badge tier-${user.tier}`}>
                      {user.tier.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="credits-cell">
                      <span>{user.credits.used}/{user.credits.max}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(user.credits.used / user.credits.max) * 100}%`,
                            backgroundColor: getProgressColor(user.credits.used / user.credits.max)
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    {user.veoVideos.max === 0 ? (
                      <span className="no-access">-</span>
                    ) : user.veoVideos.max === -1 ? (
                      <span>{user.veoVideos.used}</span>
                    ) : (
                      <span>{user.veoVideos.used}/{user.veoVideos.max}</span>
                    )}
                  </td>
                  <td>{formatDate(user.lastActive)}</td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ← Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// Helper functions
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) return `${local}***@${domain}`;
  
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

function formatDate(date?: Date): string {
  if (!date) return '-';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  
  return date.toLocaleDateString();
}

function getProgressColor(ratio: number): string {
  if (ratio < 0.5) return '#4caf50'; // Green
  if (ratio < 0.8) return '#ff9800'; // Orange
  return '#f44336'; // Red
}
