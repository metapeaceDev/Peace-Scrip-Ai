/**
 * Analytics Dashboard
 *
 * แสดงสถิติการใช้งาน, ต้นทุน, และข้อเสนอแนะสำหรับ upgrade
 */

import React, { useState, useMemo } from 'react';
import { SubscriptionTier } from '../types';
import { getUserSubscription } from '../services/userStore';
import {
  getUsageStats,
  calculateCostSavings,
  getUsageHistory,
  exportUsageData,
} from '../services/usageTracker';
import { SUBSCRIPTION_PRICES } from '../services/paymentService';

export const AnalyticsDashboard: React.FC = () => {
  const subscription = getUserSubscription();
  const stats = getUsageStats();
  const costSavings = calculateCostSavings();
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('30days');

  // Calculate usage percentages
  const creditsPercent = 0; // TODO: Add credits to UserSubscription features

  const storagePercent =
    subscription.features.storageLimit !== Infinity
      ? Math.min((stats.storage.used / subscription.features.storageLimit) * 100, 100)
      : 0;

  const projectsPercent =
    subscription.features.maxProjects !== Infinity
      ? (stats.projects.total / subscription.features.maxProjects) * 100
      : 0;

  // Determine if user should upgrade
  const shouldUpgrade = useMemo(() => {
    if (subscription.tier === 'enterprise') return false;
    if (subscription.tier === 'pro') return false;

    // Suggest upgrade if any resource is > 80% used
    return creditsPercent > 80 || storagePercent > 80 || projectsPercent > 80;
  }, [subscription.tier, creditsPercent, storagePercent, projectsPercent]);

  // Calculate next tier recommendation
  const nextTier: SubscriptionTier = subscription.tier === 'free' ? 'basic' : 'pro';
  const nextTierPrice = SUBSCRIPTION_PRICES[nextTier];

  // Export usage data
  const handleExport = () => {
    const data = exportUsageData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get usage history (no filtering by time range yet - returns all history)
  const history = getUsageHistory();

  // Calculate daily averages
  const dailyAverages = useMemo(() => {
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 365;
    return {
      images: (stats.images.generated / days).toFixed(1),
      videos: (stats.videos.generated / days).toFixed(1),
      credits: ((stats.images.totalCreditsUsed + stats.videos.totalCreditsUsed) / days).toFixed(1),
    };
  }, [stats, timeRange]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">แดชบอร์ดการใช้งาน</h1>
          <p className="text-gray-600 mt-1">แพ็กเกจ {subscription.tier.toUpperCase()}</p>
        </div>

        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as '7days' | '30days' | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="7days">7 วันที่แล้ว</option>
            <option value="30days">30 วันที่แล้ว</option>
            <option value="all">ทั้งหมด</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📥 Export ข้อมูล
          </button>
        </div>
      </div>

      {/* Cost Savings Alert */}
      {costSavings.totalSaved > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">💰</span>
            <div>
              <h3 className="text-xl font-bold text-green-800">
                คุณประหยัดได้ ฿{costSavings.totalSaved.toLocaleString()} ในเดือนนี้!
              </h3>
              <p className="text-green-700 mt-1">
                จากการใช้ Free Providers (ComfyUI, Pollinations)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Recommendation */}
      {shouldUpgrade && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🚀</span>
              <div>
                <h3 className="text-xl font-bold text-purple-800">
                  คุณใช้งานเกือบหมดแล้ว! พิจารณา Upgrade?
                </h3>
                <p className="text-purple-700 mt-1">
                  Upgrade เป็น {nextTier.toUpperCase()} ได้เพียง ฿
                  {nextTierPrice.monthlyPrice.toLocaleString()}/เดือน (ตอนนี้ลด 50%!)
                </p>
              </div>
            </div>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
              Upgrade เลย
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Credits Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Credits</h3>
            <span className={`text-2xl ${creditsPercent > 80 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.images.totalCreditsUsed + stats.videos.totalCreditsUsed}/∞
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">Unlimited (Enterprise tier will have limits)</p>

          <div className="mt-4 pt-4 border-t space-y-1 text-sm text-gray-600">
            <p>• รูปภาพ: {stats.images.totalCreditsUsed} credits</p>
            <p>• วิดีโอ: {stats.videos.totalCreditsUsed} credits</p>
            <p>
              • รวมทั้งหมด: {stats.images.totalCreditsUsed + stats.videos.totalCreditsUsed} credits
            </p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Storage</h3>
            <span className={`text-2xl ${storagePercent > 80 ? 'text-red-500' : 'text-blue-500'}`}>
              {stats.storage.used.toFixed(0)}/
              {subscription.features.storageLimit === Infinity
                ? '∞'
                : subscription.features.storageLimit}{' '}
              MB
            </span>
          </div>

          {subscription.features.storageLimit !== Infinity && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{storagePercent.toFixed(1)}% ใช้ไป</p>
            </>
          )}

          <div className="mt-4 pt-4 border-t space-y-1 text-sm text-gray-600">
            <p>• รูปภาพ: {stats.storage.images.toFixed(0)} MB</p>
            <p>• วิดีโอ: {stats.storage.videos.toFixed(0)} MB</p>
            <p>• โปรเจกต์: {stats.storage.projects.toFixed(0)} MB</p>
          </div>
        </div>

        {/* Projects Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">โปรเจกต์</h3>
            <span
              className={`text-2xl ${projectsPercent > 80 ? 'text-red-500' : 'text-purple-500'}`}
            >
              {stats.projects.total}/
              {subscription.features.maxProjects === Infinity
                ? '∞'
                : subscription.features.maxProjects}
            </span>
          </div>

          {subscription.features.maxProjects !== Infinity && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full ${projectsPercent > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${projectsPercent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{projectsPercent.toFixed(1)}% ใช้ไป</p>
            </>
          )}

          <div className="mt-4 pt-4 border-t space-y-1 text-sm text-gray-600">
            <p>
              • ตัวละคร: {stats.characters.total}/
              {subscription.features.maxCharacters === Infinity
                ? '∞'
                : subscription.features.maxCharacters}
            </p>
            <p>
              • ฉาก: {stats.scenes.total}/
              {subscription.features.maxScenes === Infinity ? '∞' : subscription.features.maxScenes}
            </p>
          </div>
        </div>
      </div>

      {/* Generation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Images */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📸 การสร้างรูปภาพ</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">สำเร็จ</span>
              <span className="text-2xl font-bold text-green-600">{stats.images.generated}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">ล้มเหลว</span>
              <span className="text-lg font-semibold text-red-600">{stats.images.failed}</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-gray-600">เฉลี่ยต่อวัน</span>
              <span className="text-lg font-semibold">{dailyAverages.images} รูป</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">อัตราสำเร็จ</span>
              <span className="text-lg font-semibold text-blue-600">
                {stats.images.generated > 0
                  ? (
                      (stats.images.generated / (stats.images.generated + stats.images.failed)) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Videos */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🎬 การสร้างวิดีโอ</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">สำเร็จ</span>
              <span className="text-2xl font-bold text-green-600">{stats.videos.generated}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">ระยะเวลารวม</span>
              <span className="text-lg font-semibold">{stats.videos.totalDuration} วินาที</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-gray-600">เฉลี่ยต่อวัน</span>
              <span className="text-lg font-semibold">{dailyAverages.videos} คลิป</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">เฉลี่ยความยาว</span>
              <span className="text-lg font-semibold text-blue-600">
                {stats.videos.generated > 0
                  ? (stats.videos.totalDuration / stats.videos.generated).toFixed(1)
                  : 0}{' '}
                วินาที
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 กิจกรรมล่าสุด</h3>

        <div className="space-y-2">
          {history.slice(0, 10).map((entry, index) => {
            const icon = entry.type === 'image' ? '📸' : entry.type === 'video' ? '🎬' : '📝';
            const color = entry.success ? 'text-green-600' : 'text-red-600';

            return (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-medium">
                      {entry.type === 'image'
                        ? 'สร้างรูปภาพ'
                        : entry.type === 'video'
                          ? 'สร้างวิดีโอ'
                          : 'Text Generation'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {entry.provider} • {new Date(entry.timestamp).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-semibold ${color}`}>
                    {entry.success ? '✓ สำเร็จ' : '✗ ล้มเหลว'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {entry.credits != null && entry.credits > 0 && `${entry.credits} credits`}
                  </p>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <p className="text-center text-gray-500 py-8">ยังไม่มีกิจกรรม</p>
          )}
        </div>
      </div>

      {/* API Calls Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🔌 การเรียกใช้ API</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">Text Generation</p>
            <p className="text-3xl font-bold text-blue-600">{stats.apiCalls.geminiText}</p>
            <p className="text-sm text-gray-500 mt-1">API Calls</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">Image Generation</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.images.generated + stats.images.failed}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Requests</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">Video Generation</p>
            <p className="text-3xl font-bold text-purple-600">{stats.videos.generated}</p>
            <p className="text-sm text-gray-500 mt-1">Total Requests</p>
          </div>
        </div>
      </div>
    </div>
  );
};

