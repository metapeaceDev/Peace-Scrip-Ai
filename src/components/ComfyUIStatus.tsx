/**
 * ComfyUI Backend Status Component
 *
 * แสดงสถานะของ ComfyUI Backend Service
 * เช็ค health, workers, queue stats
 */

import React, { useState, useEffect } from 'react';
import {
  checkBackendStatus,
  getWorkerStats,
  getQueueStats,
} from '../services/comfyuiBackendClient';

interface WorkerStats {
  totalWorkers: number;
  healthyWorkers: number;
  workers: Array<{
    url: string;
    healthy: boolean;
    lastCheck: string;
  }>;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface ComfyUIStatusProps {
  compact?: boolean;
}

const ComfyUIStatus: React.FC<ComfyUIStatusProps> = ({ compact = false }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkStatus();
    // Refresh every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Silent mode for background polling - don't spam console
      const status = await checkBackendStatus(true);

      if (status.running) {
        setIsOnline(true);

        // Get detailed stats
        const [workers, queue] = await Promise.all([getWorkerStats(), getQueueStats()]);

        setWorkerStats(workers);
        setQueueStats(queue);
      } else {
        setIsOnline(false);
        setError(status.error || 'Service unavailable');
      }
    } catch (err) {
      setIsOnline(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isOnline) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-2 w-2 border border-gray-400 border-t-transparent"></div>
          <span className="text-gray-500 text-xs">Checking...</span>
        </div>
      );
    }
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          <span className="text-gray-400 text-sm">Checking ComfyUI service...</span>
        </div>
      </div>
    );
  }

  // Compact mode (for header)
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-400">ComfyUI:</span>
        {isOnline ? (
          <>
            <span className="text-green-400">Online</span>
            {workerStats && (
              <span className="text-gray-500">
                ({workerStats.healthyWorkers}/{workerStats.totalWorkers})
              </span>
            )}
          </>
        ) : (
          <span className="text-red-400">Offline</span>
        )}
      </div>
    );
  }

  // Full mode (original)
  return (
    <div
      className={`border rounded-lg p-4 mb-4 ${
        isOnline ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          ></div>
          <span className="font-semibold text-white">ComfyUI Backend Service</span>
          {isOnline && (
            <span className="text-xs px-2 py-1 bg-green-700 text-green-100 rounded-full">
              Online
            </span>
          )}
        </div>

        {isOnline && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {!isOnline && error && (
        <div className="mt-2">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={checkStatus}
            className="mt-2 text-xs text-red-300 hover:text-white transition-colors underline"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {isOnline && !showDetails && (
        <div className="flex gap-4 mt-2 text-sm">
          {workerStats && (
            <div className="text-green-300">
              <span className="font-semibold">{workerStats.healthyWorkers}</span>
              <span className="text-gray-400">/{workerStats.totalWorkers} Workers</span>
            </div>
          )}
          {queueStats && (
            <>
              <div className="text-yellow-300">
                <span className="font-semibold">{queueStats.active}</span>
                <span className="text-gray-400"> Active</span>
              </div>
              <div className="text-gray-300">
                <span className="font-semibold">{queueStats.waiting}</span>
                <span className="text-gray-400"> Waiting</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detailed Stats */}
      {isOnline && showDetails && (
        <div className="mt-4 space-y-4">
          {/* Worker Stats */}
          {workerStats && (
            <div className="bg-gray-800 rounded p-3">
              <h4 className="text-sm font-semibold text-white mb-2">
                Workers ({workerStats.totalWorkers})
              </h4>
              <div className="space-y-2">
                {workerStats.workers.map((worker, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-mono">{worker.url}</span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        worker.healthy ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                      }`}
                    >
                      {worker.healthy ? '✓ Healthy' : '✗ Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue Stats */}
          {queueStats && (
            <div className="bg-gray-800 rounded p-3">
              <h4 className="text-sm font-semibold text-white mb-2">Queue Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Waiting:</span>
                  <span className="text-yellow-300 font-semibold">{queueStats.waiting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active:</span>
                  <span className="text-blue-300 font-semibold">{queueStats.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-green-300 font-semibold">{queueStats.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Failed:</span>
                  <span className="text-red-300 font-semibold">{queueStats.failed}</span>
                </div>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="w-full text-xs py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Stats'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ComfyUIStatus;
