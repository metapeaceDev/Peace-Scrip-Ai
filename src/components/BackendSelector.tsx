/**
 * Backend Selector Component
 * Displays backend status and allows manual selection
 */

import React, { useState, useEffect } from 'react';
import { backendManager, BackendType, BackendStatus } from '../services/backendManager';

export const BackendSelector: React.FC = () => {
  const [statuses, setStatuses] = useState<BackendStatus[]>([]);
  const [selectedBackend, setSelectedBackend] = useState<BackendType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBackendStatuses();
    const interval = setInterval(loadBackendStatuses, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadBackendStatuses = async () => {
    try {
      const newStatuses = await backendManager.getAllBackendStatuses();
      setStatuses(newStatuses);
    } catch (error) {
      console.error('Failed to load backend statuses:', error);
    }
  };

  const handleBackendSelect = async (backend: BackendType) => {
    setIsLoading(true);
    try {
      if (backend === 'cloud') {
        // Ensure cloud backend is running
        const running = await backendManager.ensureCloudBackendRunning();
        if (!running) {
          alert('Failed to start cloud backend');
          setIsLoading(false);
          return;
        }
      }

      backendManager.setPreferredBackend(backend);
      setSelectedBackend(backend);
      await loadBackendStatuses();
    } catch (error) {
      console.error('Failed to select backend:', error);
      alert('Failed to select backend');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: BackendStatus) => {
    if (!status.available) return '❌';
    if (!status.healthy) return '⚠️';
    return '✅';
  };

  const getStatusColor = (status: BackendStatus) => {
    if (!status.available) return 'text-red-500';
    if (!status.healthy) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBackendName = (type: BackendType) => {
    const names = {
      local: 'Local ComfyUI',
      cloud: 'Cloud (RunPod)',
      gemini: 'Gemini API',
    };
    return names[type];
  };

  const getBackendDescription = (type: BackendType) => {
    const descriptions = {
      local: 'Your local GPU (Free)',
      cloud: 'RTX 3090 Cloud ($0.02/video)',
      gemini: 'Google Gemini ($0.50/video)',
    };
    return descriptions[type];
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Backend Selection</h2>
        <button
          onClick={loadBackendStatuses}
          disabled={isLoading}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3">
        {statuses.map(status => {
          const config = backendManager.getBackendConfig(status.type);
          const isSelected = selectedBackend === status.type;

          return (
            <div
              key={status.type}
              onClick={() => !isLoading && handleBackendSelect(status.type)}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }
                ${!status.healthy && 'opacity-60'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`text-2xl ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{getBackendName(status.type)}</h3>
                    <p className="text-sm text-gray-400">{getBackendDescription(status.type)}</p>
                  </div>
                </div>

                {isSelected && (
                  <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
                    Selected
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-700">
                <div className="flex space-x-4">
                  <div>
                    <span className="text-gray-400">Status: </span>
                    <span className={getStatusColor(status)}>
                      {status.healthy ? 'Healthy' : status.available ? 'Unhealthy' : 'Unavailable'}
                    </span>
                  </div>

                  {status.responseTime && (
                    <div>
                      <span className="text-gray-400">Latency: </span>
                      <span className="text-white">{status.responseTime}ms</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-gray-400">Cost: </span>
                  <span className="text-white font-semibold">
                    {config.costPerVideo === 0 ? 'Free' : `$${config.costPerVideo.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {status.type === 'cloud' && !status.healthy && (
                <div className="mt-2 text-xs text-yellow-400">
                  💡 Cloud backend will auto-start when selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <h3 className="font-semibold text-blue-300 mb-2">🔄 Automatic Fallback</h3>
        <p className="text-sm text-gray-300">
          If your selected backend fails, the system will automatically try other backends in
          priority order:
          <span className="block mt-1 text-blue-400 font-mono">
            {backendManager.getBackendPriority().join(' → ')}
          </span>
        </p>
      </div>

      <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
        <h3 className="font-semibold text-gray-300 mb-2">📊 Cost Comparison (100 videos/month)</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Local ComfyUI:</span>
            <span className="text-green-400 font-semibold">$0.00 (Free)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cloud RunPod:</span>
            <span className="text-blue-400 font-semibold">$2.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Gemini API:</span>
            <span className="text-yellow-400 font-semibold">$50.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendSelector;

