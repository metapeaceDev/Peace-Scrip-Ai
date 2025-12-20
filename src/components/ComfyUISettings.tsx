/**
 * ComfyUI Settings Page
 *
 * หน้าตั้งค่า ComfyUI ครอบคลุมทุกมิติ:
 * - Backend selection & status
 * - Device/GPU configuration
 * - Cost calculator & comparison
 * - System health monitoring
 * - Performance settings
 */

import React, { useState } from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { GPUStatus } from './GPUStatus';
import { CostCalculator } from './CostCalculator';
import { BackendHealthPanel, BackendStatusIndicator } from './BackendStatus';
import { DeviceSettings } from './DeviceSettings';

export const ComfyUISettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'backend' | 'cost' | 'advanced'>(
    'overview'
  );
  const { resources, recommendedBackend, isDetecting } = useDeviceDetection();
  const deviceInfo = resources;
  const backend = recommendedBackend;

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'backend', label: '🔧 Backend', icon: '🔧' },
    { id: 'cost', label: '💰 Cost Analysis', icon: '💰' },
    { id: 'advanced', label: '⚙️ Advanced', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">ComfyUI Settings</h1>
          <p className="text-gray-400">
            Configure your video generation backend and optimize performance
          </p>
        </div>

        {/* Quick Status Bar */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BackendStatusIndicator />

            {backend && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Current Backend</div>
                  <div className="text-lg font-semibold text-white">{backend.name}</div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-400">Cost per Video</div>
                  <div className="text-lg font-semibold text-white">
                    {backend.cost === 0 ? 'FREE' : `$${backend.cost.toFixed(3)}`}
                  </div>
                </div>

                {deviceInfo && (
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Available Devices</div>
                    <div className="text-lg font-semibold text-white">
                      {deviceInfo.devices.filter((d: any) => d.available).length}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <OverviewTab deviceInfo={deviceInfo} backend={backend} isDetecting={isDetecting} />
          )}

          {activeTab === 'backend' && <BackendTab />}

          {activeTab === 'cost' && <CostTab />}

          {activeTab === 'advanced' && <AdvancedTab />}
        </div>
      </div>
    </div>
  );
};

/**
 * Overview Tab - General system status
 */
const OverviewTab: React.FC<{
  deviceInfo: any;
  backend: any;
  isDetecting: boolean;
}> = ({ deviceInfo, backend, isDetecting: _isDetecting }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GPU Status */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">🎮 GPU & Device Status</h3>
        <GPUStatus />
      </div>

      {/* System Health */}
      <BackendHealthPanel />

      {/* Quick Actions */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">⚡ Quick Actions</h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left">
            <div className="font-medium">🔄 Refresh Device Detection</div>
            <div className="text-sm text-blue-200 mt-1">Re-scan available GPUs and backends</div>
          </button>

          <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-left">
            <div className="font-medium">🧪 Test Backend Connection</div>
            <div className="text-sm text-green-200 mt-1">Verify ComfyUI is working correctly</div>
          </button>

          <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-left">
            <div className="font-medium">📊 View Performance Stats</div>
            <div className="text-sm text-purple-200 mt-1">
              See generation speed and quality metrics
            </div>
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
        <div className="space-y-3">
          {deviceInfo?.devices.some((d: any) => d.type === 'cuda' && d.available) ? (
            <RecommendationCard
              icon="🚀"
              title="NVIDIA GPU Detected"
              description="Your CUDA GPU provides excellent performance. Continue using local generation for best speed and zero cost."
              type="success"
            />
          ) : deviceInfo?.devices.some((d: any) => d.type === 'mps' && d.available) ? (
            <RecommendationCard
              icon="🍎"
              title="Apple Silicon Detected"
              description="Your Mac has Metal Performance Shaders. Good for local generation, but consider cloud for very complex scenes."
              type="info"
            />
          ) : (
            <RecommendationCard
              icon="☁️"
              title="No GPU Detected"
              description="Consider using cloud backends (RunPod, Replicate) for faster video generation. Cost: ~$0.02/video."
              type="warning"
            />
          )}

          {backend && backend.cost > 0 && (
            <RecommendationCard
              icon="💰"
              title="Using Paid Backend"
              description={`Current cost: $${backend.cost}/video. For high volume, consider local GPU or cheaper alternatives.`}
              type="info"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}> = ({ icon, title, description, type }) => {
  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-medium mb-1">{title}</div>
          <div className="text-sm opacity-90">{description}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Backend Tab - Backend selection and configuration
 */
const BackendTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <DeviceSettings />
    </div>
  );
};

/**
 * Cost Tab - Cost analysis and comparison
 */
const CostTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <CostCalculator videoCount={100} />

      {/* Monthly Budget Planner */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📅 Monthly Budget Planner</h3>
        <MonthlyBudgetCalculator />
      </div>
    </div>
  );
};

const MonthlyBudgetCalculator: React.FC = () => {
  const [videosPerMonth, setVideosPerMonth] = useState(100);
  const backends = [
    { name: 'Local GPU (FREE)', cost: 0 },
    { name: 'Cloud ComfyUI', cost: 0.02 },
    { name: 'Replicate', cost: 0.018 },
    { name: 'Gemini Veo', cost: 0.5 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Videos per month</label>
        <input
          type="number"
          value={videosPerMonth}
          onChange={e => setVideosPerMonth(Number(e.target.value))}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          min="1"
          max="10000"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backends.map(backend => {
          const monthlyCost = backend.cost * videosPerMonth;
          return (
            <div
              key={backend.name}
              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
            >
              <div className="font-medium text-white mb-2">{backend.name}</div>
              <div className="text-3xl font-bold text-blue-400">${monthlyCost.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-1">
                ${backend.cost.toFixed(3)}/video × {videosPerMonth} videos
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Advanced Tab - Advanced settings and debugging
 */
const AdvancedTab: React.FC = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">🔬 Advanced Settings</h3>

        <div className="space-y-4">
          {/* Debug Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Debug Mode</div>
              <div className="text-sm text-gray-400">Show detailed logs and error messages</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={e => setDebugMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Cache */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Enable Caching</div>
              <div className="text-sm text-gray-400">
                Cache detection results for faster loading
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cacheEnabled}
                onChange={e => setCacheEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Max Retries */}
          <div>
            <label className="block text-white font-medium mb-2">Max Retry Attempts</label>
            <input
              type="number"
              value={maxRetries}
              onChange={e => setMaxRetries(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              min="0"
              max="10"
            />
            <div className="text-sm text-gray-400 mt-1">
              Number of times to retry failed requests (0-10)
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-left">
            <div className="font-medium">🗑️ Clear All Cache</div>
            <div className="text-sm text-red-300 mt-1">
              Remove all cached detection results and settings
            </div>
          </button>

          <button className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-left">
            <div className="font-medium">🔄 Reset to Defaults</div>
            <div className="text-sm text-red-300 mt-1">Reset all settings to factory defaults</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComfyUISettings;

