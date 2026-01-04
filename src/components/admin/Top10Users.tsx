/**
 * TOP 10 Users Component
 *
 * แสดง 10 อันดับผู้ใช้งานสูงสุดแบบ real-time
 * เรียงตามการใช้งาน credits, API calls, และ activity
 * Updated: ดึงข้อมูลจาก subscriptions collection เพื่อความแม่นยำ
 */

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SubscriptionTier } from '../../types';
import './Top10Users.css';

interface TopUser {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tier: SubscriptionTier;
  creditsUsed: number;
  totalApiCalls: number;
  lastActive?: Date;
  score: number; // คะแนนรวมสำหรับการจัดอันดับ
  rank: number;
}

export const Top10Users: React.FC = () => {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'credits' | 'apiCalls'>('score');

  useEffect(() => {
    // Real-time listener for subscriptions data (more accurate)
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef);

    const unsubscribe = onSnapshot(
      q,
      async snapshot => {
        try {
          // Fetch users data for email, displayName, photoURL
          const usersRef = collection(db, 'users');
          const usersQuery = query(usersRef);
          const usersSnapshot = await new Promise<QuerySnapshot<DocumentData>>(resolve => {
            const unsub = onSnapshot(usersQuery, snap => {
              resolve(snap);
              unsub();
            });
          });

          const usersMap = new Map();
          usersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            usersMap.set(doc.id, {
              email: data.email || 'unknown@example.com',
              displayName: data.displayName || data.name || 'User',
              photoURL: data.photoURL || data.avatar,
              lastActive: data.lastActive?.toDate?.() || null,
            });
          });

          const users: TopUser[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            const userInfo = usersMap.get(doc.id) || {
              email: 'unknown@example.com',
              displayName: 'User',
              photoURL: undefined,
              lastActive: null,
            };

            const tier = (data.subscription?.tier || 'basic') as SubscriptionTier;
            const creditsUsed = data.monthlyUsage?.creditsUsed || 0;
            const apiCalls = data.usage?.apiCalls || 0;

            // Calculate score based on activity
            // Score = (credits * 1) + (API calls * 0.5) + (tier multiplier * 100)
            const tierMultiplier =
              tier === 'enterprise' ? 3 : tier === 'pro' ? 2 : tier === 'basic' ? 1 : 0;

            const score = creditsUsed * 1 + apiCalls * 0.5 + tierMultiplier * 100;

            users.push({
              userId: doc.id,
              email: userInfo.email,
              displayName: userInfo.displayName,
              photoURL: userInfo.photoURL,
              tier,
              creditsUsed,
              totalApiCalls: apiCalls,
              lastActive: userInfo.lastActive,
              score: Math.round(score),
              rank: 0, // Will be set after sorting
            });
          });

          // Sort by selected criteria
          const sorted = users.sort((a, b) => {
            switch (sortBy) {
              case 'credits':
                return b.creditsUsed - a.creditsUsed;
              case 'apiCalls':
                return b.totalApiCalls - a.totalApiCalls;
              default:
                return b.score - a.score;
            }
          });

          // Add ranks and get top 10
          const top10 = sorted.slice(0, 10).map((user, index) => ({
            ...user,
            rank: index + 1,
          }));

          setTopUsers(top10);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching top users:', error);
          setLoading(false);
        }
      },
      error => {
        console.error('Error in snapshot listener:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sortBy]);

  const getTierLabel = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'enterprise':
        return 'Enterprise';
      case 'pro':
        return 'Pro';
      case 'basic':
        return 'Basic';
      default:
        return 'Free';
    }
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return 'ไม่มีข้อมูล';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days === 1) return 'เมื่อวาน';
    return `${days} วันที่แล้ว`;
  };

  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="top10-users-container">
        <div className="top10-header">
          <h3>🏆 TOP 10 Users</h3>
        </div>
        <div className="top10-loading">Loading top users...</div>
      </div>
    );
  }

  return (
    <div className="top10-users-container">
      <div className="top10-header">
        <h3>🏆 TOP 10 Users</h3>
        <div className="sort-options">
          <button className={sortBy === 'score' ? 'active' : ''} onClick={() => setSortBy('score')}>
            คะแนนรวม
          </button>
          <button
            className={sortBy === 'credits' ? 'active' : ''}
            onClick={() => setSortBy('credits')}
          >
            Credits
          </button>
          <button
            className={sortBy === 'apiCalls' ? 'active' : ''}
            onClick={() => setSortBy('apiCalls')}
          >
            API Calls
          </button>
        </div>
      </div>

      <div className="top10-list">
        {/* Top 3 - Featured */}
        <div className="top3-section">
          <h4 className="section-title">🏆 TOP 3</h4>
          <div className="top3-grid">
            {topUsers
              .filter(u => u.rank <= 3)
              .map(user => (
                <div key={user.userId} className={`top10-item featured rank-${user.rank}`}>
                  <div className="rank">
                    <span className="rank-display">{getRankDisplay(user.rank)}</span>
                  </div>

                  <div className="user-avatar-container">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="user-avatar"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling!.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`avatar-placeholder ${user.photoURL ? 'hidden' : ''}`}
                      data-tier={user.tier}
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="user-info">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-email">{user.email}</div>
                  </div>

                  <div className="user-tier">
                    <span className="tier-badge" data-tier={user.tier}>
                      {getTierLabel(user.tier)}
                    </span>
                  </div>

                  <div className="user-stats">
                    <div className="stat-group">
                      <div className="stat-item">
                        <span className="stat-icon">⭐</span>
                        <span className="stat-value">{user.score.toLocaleString()}</span>
                        <span className="stat-label">คะแนน</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">💳</span>
                        <span className="stat-value">{user.creditsUsed.toLocaleString()}</span>
                        <span className="stat-label">Credits</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">🔌</span>
                        <span className="stat-value">{user.totalApiCalls.toLocaleString()}</span>
                        <span className="stat-label">API</span>
                      </div>
                    </div>
                    <div className="last-active">
                      <span className="active-icon">🕐</span>
                      {formatLastActive(user.lastActive)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Rank 4-10 - Compact */}
        {topUsers.filter(u => u.rank > 3).length > 0 && (
          <div className="others-section">
            <h4 className="section-title">📊 Rank 4-10</h4>
            <div className="others-grid">
              {topUsers
                .filter(u => u.rank > 3)
                .map(user => (
                  <div key={user.userId} className="top10-item compact">
                    <div className="compact-header">
                      <span className="rank-number">#{user.rank}</span>
                      <div className="compact-avatar">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                        ) : (
                          <div className="avatar-placeholder" data-tier={user.tier}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="compact-info">
                        <div className="user-name">{user.displayName}</div>
                        <span className="tier-badge-small" data-tier={user.tier}>
                          {getTierLabel(user.tier)}
                        </span>
                      </div>
                    </div>
                    <div className="compact-stats">
                      <div className="stat-mini">
                        <span className="stat-label">⭐</span>
                        <span className="stat-value">{user.score.toLocaleString()}</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-label">💳</span>
                        <span className="stat-value">{user.creditsUsed.toLocaleString()}</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-label">🔌</span>
                        <span className="stat-value">{user.totalApiCalls.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
