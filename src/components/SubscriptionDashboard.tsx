import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserSubscription,
  getPlansComparison,
  upgradeSubscription,
  SUBSCRIPTION_PLANS,
} from '../services/subscriptionManager';
import { SubscriptionTier } from '../../types';
import './SubscriptionDashboard.css';

interface UsageStats {
  tier: SubscriptionTier;
  creditsUsed: number;
  creditsTotal: number;
  creditsPercentage: number;
  resetDate: Date;
  usage: {
    projects: number;
    maxProjects: number;
    characters: number;
    maxCharacters: number;
    scenes: number;
    maxScenes: number;
    storage: number;
    maxStorage: number;
  };
}

export const SubscriptionDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, [currentUser]);

  const loadSubscriptionData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const data = await getUserSubscription(currentUser.uid);

      const creditsUsed = data.monthlyUsage.creditsUsed;
      const creditsTotal =
        data.subscription.maxCredits === -1 ? Infinity : data.subscription.maxCredits;

      setStats({
        tier: data.subscription.tier,
        creditsUsed,
        creditsTotal,
        creditsPercentage: creditsTotal === Infinity ? 0 : (creditsUsed / creditsTotal) * 100,
        resetDate: data.monthlyUsage.resetAt,
        usage: {
          projects: data.usage.projectsCreated,
          maxProjects: data.subscription.features.maxProjects,
          characters: data.usage.charactersCreated,
          maxCharacters: data.subscription.features.maxCharacters,
          scenes: data.usage.scenesCreated,
          maxScenes: data.subscription.features.maxScenes,
          storage: data.usage.storageUsed / 1024, // Convert to GB
          maxStorage: data.subscription.features.storageLimit,
        },
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!currentUser?.uid) return;

    try {
      await upgradeSubscription(currentUser.uid, tier);
      await loadSubscriptionData();
      setShowUpgradeModal(false);
      alert(`✅ อัพเกรดเป็นแผน ${tier} สำเร็จ!`);
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('❌ เกิดข้อผิดพลาดในการอัพเกรด');
    }
  };

  if (loading) {
    return <div className="subscription-loading">กำลังโหลด...</div>;
  }

  if (!stats) {
    return <div className="subscription-error">ไม่สามารถโหลดข้อมูลได้</div>;
  }

  const plans = getPlansComparison();

  return (
    <div className="subscription-dashboard">
      {/* Current Plan Header */}
      <div className="current-plan-header">
        <div className="plan-badge">
          <span className={`tier-label tier-${stats.tier}`}>{stats.tier.toUpperCase()}</span>
        </div>
        <h2>แผนปัจจุบัน</h2>
        {stats.tier !== 'enterprise' && (
          <button className="upgrade-btn-header" onClick={() => setShowUpgradeModal(true)}>
            ⬆️ อัพเกรดแผน
          </button>
        )}
      </div>

      {/* Credits Usage */}
      <div className="credits-section">
        <div className="section-header">
          <h3>💳 Credits</h3>
          <span className="reset-info">
            รีเซ็ต: {new Date(stats.resetDate).toLocaleDateString('th-TH')}
          </span>
        </div>
        <div className="credits-bar-container">
          <div
            className={`credits-bar ${stats.creditsPercentage > 80 ? 'warning' : ''}`}
            style={{ width: `${Math.min(stats.creditsPercentage, 100)}%` }}
          />
        </div>
        <div className="credits-text">
          {stats.creditsTotal === Infinity ? (
            <span>Unlimited Credits</span>
          ) : (
            <span>
              ใช้ไป {stats.creditsUsed} / {stats.creditsTotal} credits (
              {stats.creditsPercentage.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>

      {/* Usage Stats Grid */}
      <div className="usage-grid">
        <UsageCard
          icon="📁"
          label="โปรเจกต์"
          current={stats.usage.projects}
          max={stats.usage.maxProjects}
        />
        <UsageCard
          icon="👤"
          label="ตัวละคร"
          current={stats.usage.characters}
          max={stats.usage.maxCharacters}
        />
        <UsageCard icon="🎬" label="ซีน" current={stats.usage.scenes} max={stats.usage.maxScenes} />
        <UsageCard
          icon="💾"
          label="พื้นที่"
          current={stats.usage.storage}
          max={stats.usage.maxStorage}
          unit="GB"
        />
      </div>

      {/* Features List */}
      <div className="features-section">
        <h3>✨ คุณสมบัติของแผนปัจจุบัน</h3>
        <div className="features-list">
          {SUBSCRIPTION_PLANS[stats.tier].features.allowedImageModels.map(model => (
            <div key={model} className="feature-item">
              ✓ {model} Image Generation
            </div>
          ))}
          {SUBSCRIPTION_PLANS[stats.tier].features.allowedVideoModels.length > 0 && (
            <div className="feature-item">
              ✓ Video Generation (สูงสุด{' '}
              {SUBSCRIPTION_PLANS[stats.tier].features.videoDurationLimit}s)
            </div>
          )}
          {SUBSCRIPTION_PLANS[stats.tier].features.exportFormats.map(format => (
            <div key={format} className="feature-item">
              ✓ Export {format.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>เลือกแผนที่เหมาะกับคุณ</h2>
              <button onClick={() => setShowUpgradeModal(false)}>✕</button>
            </div>
            <div className="plans-grid">
              {plans.map(plan => (
                <div
                  key={plan.tier}
                  className={`plan-card ${plan.recommended ? 'recommended' : ''} ${
                    plan.tier === stats.tier ? 'current' : ''
                  }`}
                >
                  {plan.recommended && <div className="recommended-badge">แนะนำ</div>}
                  {plan.tier === stats.tier && <div className="current-badge">ปัจจุบัน</div>}

                  <h3>{plan.name}</h3>
                  <div className="plan-price">{plan.price}</div>

                  <ul className="plan-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>

                  {plan.tier !== stats.tier && (
                    <button
                      className="select-plan-btn"
                      onClick={() => {
                        setSelectedPlan(plan.tier);
                        if (confirm(`ยืนยันการอัพเกรดเป็นแผน ${plan.name}?`)) {
                          handleUpgrade(plan.tier);
                        }
                      }}
                    >
                      {plan.tier === 'enterprise' ? 'ติดต่อเรา' : 'เลือกแผนนี้'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Usage Card Component
interface UsageCardProps {
  icon: string;
  label: string;
  current: number;
  max: number;
  unit?: string;
}

const UsageCard: React.FC<UsageCardProps> = ({ icon, label, current, max, unit = '' }) => {
  const percentage = max === -1 ? 0 : (current / max) * 100;
  const isUnlimited = max === -1;

  return (
    <div className="usage-card">
      <div className="usage-icon">{icon}</div>
      <div className="usage-label">{label}</div>
      <div className="usage-value">
        {isUnlimited ? (
          <span className="unlimited">∞ Unlimited</span>
        ) : (
          <>
            <span className="current">{current.toFixed(unit === 'GB' ? 2 : 0)}</span>
            <span className="separator">/</span>
            <span className="max">
              {max.toFixed(unit === 'GB' ? 2 : 0)} {unit}
            </span>
          </>
        )}
      </div>
      {!isUnlimited && (
        <div className="usage-bar-mini">
          <div
            className={`usage-bar-fill ${percentage > 80 ? 'warning' : ''}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
