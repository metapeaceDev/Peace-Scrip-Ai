/**
 * Backend Selector Component (Enhanced)
 * 
 * Intelligent backend selection with real-time status
 * Connected to Load Balancer API
 */

import React, { useState, useEffect } from 'react';
import { 
  loadBalancerClient, 
  type BackendType, 
  type BackendInfo,
  type UserPreferences,
  type LoadBalancerStatus
} from '../services/loadBalancerClient';

export const BackendSelectorEnhanced: React.FC = () => {
  const [status, setStatus] = useState<LoadBalancerStatus | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredBackend: 'auto',
    maxCostPerJob: null,
    prioritizeSpeed: false,
    allowCloudFallback: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await loadBalancerClient.getStatus();
      setStatus(data);
      setPreferences(data.preferences);
      setError(null);
    } catch (err) {
      console.error('Failed to load backend status:', err);
      setError('Failed to connect to ComfyUI Service. Is it running?');
    }
  };

  const handleBackendSelect = async (backend: 'auto' | BackendType) => {
    setIsLoading(true);
    try {
      const newPrefs = await loadBalancerClient.updatePreferences({
        preferredBackend: backend,
      });
      setPreferences(newPrefs);
      await loadStatus();
    } catch (err) {
      console.error('Failed to update backend:', err);
      alert('Failed to update backend selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesChange = async (updates: Partial<UserPreferences>) => {
    setIsLoading(true);
    try {
      const newPrefs = await loadBalancerClient.updatePreferences(updates);
      setPreferences(newPrefs);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (backend: BackendInfo) => {
    if (!backend.available) return '❌';
    if (!backend.healthy) return '⚠️';
    return '✅';
  };

  const getStatusColor = (backend: BackendInfo) => {
    if (!backend.available) return 'text-red-500';
    if (!backend.healthy) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getQueueColor = (queue: number) => {
    if (queue === 0) return 'text-green-500';
    if (queue < 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-xl font-bold text-red-400">Connection Error</h2>
        </div>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={loadStatus}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-300">Loading backend status...</span>
        </div>
      </div>
    );
  }

  const selectedBackend = preferences.preferredBackend;

  return (
    <div className="space-y-6">
      {/* Main Backend Selection */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🎯 Backend Selection</h2>
          <button
            onClick={loadStatus}
            disabled={isLoading}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Auto Mode */}
        <div
          onClick={() => !isLoading && handleBackendSelect('auto')}
          className={`
            p-4 rounded-lg border-2 cursor-pointer transition-all mb-3
            ${
              selectedBackend === 'auto'
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold text-white">Auto (Recommended)</h3>
                <p className="text-sm text-gray-400">
                  Automatically select best backend based on cost, speed, and availability
                </p>
              </div>
            </div>
            {selectedBackend === 'auto' && (
              <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
                Active
              </span>
            )}
          </div>
        </div>

        {/* Backend Options */}
        <div className="space-y-3">
          {status.backends.map(backend => {
            const isSelected = selectedBackend === backend.name;
            const icon = loadBalancerClient.getBackendIcon(backend.name);
            const displayName = loadBalancerClient.getBackendDisplayName(backend.name);
            const description = loadBalancerClient.getBackendDescription(backend.name);

            return (
              <div
                key={backend.name}
                onClick={() => !isLoading && handleBackendSelect(backend.name)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }
                  ${!backend.healthy && 'opacity-60'}
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl ${getStatusColor(backend)}`}>
                      {getStatusIcon(backend)}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{icon}</span>
                        <h3 className="font-semibold text-white">{displayName}</h3>
                      </div>
                      <p className="text-sm text-gray-400">{description}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full">
                      Selected
                    </span>
                  )}
                </div>

                {/* Backend Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-700">
                  <div>
                    <span className="text-xs text-gray-400">Cost</span>
                    <div className="font-semibold text-white">
                      {loadBalancerClient.formatCost(backend.cost)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Speed</span>
                    <div className="font-semibold text-white">
                      {loadBalancerClient.formatTime(backend.speed)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Queue</span>
                    <div className={`font-semibold ${getQueueColor(backend.queue)}`}>
                      {backend.queue} jobs
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Total Jobs</span>
                    <div className="font-semibold text-white">{backend.jobs}</div>
                  </div>
                </div>

                {/* Additional Stats */}
                {backend.jobs > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between text-xs">
                    <div>
                      <span className="text-gray-400">Total Cost: </span>
                      <span className="text-white font-semibold">
                        {loadBalancerClient.formatCost(backend.totalCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Time: </span>
                      <span className="text-white font-semibold">
                        {loadBalancerClient.formatTime(backend.avgProcessingTime)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences Panel */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">⚙️ Preferences</h3>
        
        <div className="space-y-4">
          {/* Max Cost */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Max Cost Per Job</span>
              <input
                type="checkbox"
                checked={preferences.maxCostPerJob !== null}
                onChange={(e) => {
                  handlePreferencesChange({
                    maxCostPerJob: e.target.checked ? 0.01 : null,
                  });
                }}
                className="rounded"
              />
            </label>
            {preferences.maxCostPerJob !== null && (
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={preferences.maxCostPerJob}
                onChange={(e) => {
                  handlePreferencesChange({
                    maxCostPerJob: parseFloat(e.target.value),
                  });
                }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white"
                placeholder="0.01"
              />
            )}
          </div>

          {/* Speed Priority */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-gray-300">Prioritize Speed</span>
              <p className="text-xs text-gray-500">Prefer faster backends even if more expensive</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.prioritizeSpeed}
              onChange={(e) => {
                handlePreferencesChange({ prioritizeSpeed: e.target.checked });
              }}
              className="rounded"
            />
          </label>

          {/* Cloud Fallback */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-gray-300">Allow Cloud Fallback</span>
              <p className="text-xs text-gray-500">Use cloud if local fails</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.allowCloudFallback}
              onChange={(e) => {
                handlePreferencesChange({ allowCloudFallback: e.target.checked });
              }}
              className="rounded"
            />
          </label>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h3 className="font-semibold text-blue-300 mb-2">💡 How It Works</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>✅ <strong>Auto mode</strong> intelligently routes jobs based on cost, speed, and availability</li>
          <li>✅ <strong>Automatic failover</strong> to next best backend if selected one fails</li>
          <li>✅ <strong>Real-time monitoring</strong> updates status every 30 seconds</li>
          <li>✅ <strong>Cost optimization</strong> prefers free local GPU when available</li>
        </ul>
      </div>
    </div>
  );
};
