/**
 * GPU Status Component
 *
 * Shows real-time GPU detection status and backend recommendations
 */

import {
  useDeviceDetection,
  formatDeviceInfo,
  getDeviceEmoji,
  getBackendEmoji,
  type BackendRecommendation,
} from '../hooks/useDeviceDetection';

interface GPUStatusProps {
  showDetailed?: boolean;
  onBackendSelect?: (backend: BackendRecommendation) => void;
}

export function GPUStatus({ showDetailed = false, onBackendSelect }: GPUStatusProps) {
  const { resources, isDetecting, error, recommendedBackend, allBackends } = useDeviceDetection();

  if (isDetecting) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Detecting GPU...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-500">⚠️</span>
          <span className="text-red-300">GPU detection failed: {error}</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">Using fallback: Cloud/API backends only</p>
      </div>
    );
  }

  if (!resources) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Device Status */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">💻 Your Hardware</h3>

        <div className="space-y-2">
          {resources.devices.length > 0 ? (
            resources.devices.map((device, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  device.available
                    ? 'bg-green-900/20 border border-green-700'
                    : 'bg-gray-900/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getDeviceEmoji(device.type)}</span>
                  <div>
                    <p
                      className={`font-medium ${device.available ? 'text-green-300' : 'text-gray-400'}`}
                    >
                      {device.name}
                    </p>
                    {showDetailed && device.available && (
                      <p className="text-sm text-gray-400">{formatDeviceInfo(device)}</p>
                    )}
                  </div>
                </div>
                {device.isRecommended && device.available && (
                  <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
                    Recommended
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center space-x-3 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
              <span className="text-2xl">💻</span>
              <div>
                <p className="font-medium text-gray-300">CPU Only</p>
                <p className="text-sm text-gray-400">No GPU detected</p>
              </div>
            </div>
          )}
        </div>

        {showDetailed && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Platform</p>
                <p className="text-white font-medium capitalize">{resources.platform}</p>
              </div>
              <div>
                <p className="text-gray-400">CPU Cores</p>
                <p className="text-white font-medium">{resources.cpu.cores}</p>
              </div>
              <div>
                <p className="text-gray-400">RAM Available</p>
                <p className="text-white font-medium">
                  {(resources.memory.available / 1024).toFixed(1)} GB
                </p>
              </div>
              <div>
                <p className="text-gray-400">RAM Total</p>
                <p className="text-white font-medium">
                  {(resources.memory.total / 1024).toFixed(1)} GB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backend Recommendation */}
      {recommendedBackend && (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{getBackendEmoji(recommendedBackend.type)}</span>
                <h3 className="text-white font-semibold">Recommended Backend</h3>
              </div>

              <p className="text-gray-300 mb-2">{recommendedBackend.reason}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
                  {recommendedBackend.speed === 'very-fast'
                    ? '⚡ Very Fast'
                    : recommendedBackend.speed === 'fast'
                      ? '🚀 Fast'
                      : recommendedBackend.speed === 'medium'
                        ? '⏱️ Medium'
                        : '🐌 Slow'}
                </span>
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded">
                  {recommendedBackend.quality === 'excellent'
                    ? '⭐ Excellent'
                    : recommendedBackend.quality === 'high'
                      ? '✨ High'
                      : recommendedBackend.quality === 'good'
                        ? '👍 Good'
                        : '✓ Moderate'}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    recommendedBackend.cost === 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {recommendedBackend.cost === 0
                    ? '🎉 FREE'
                    : `💰 $${recommendedBackend.cost.toFixed(2)}/video`}
                </span>
              </div>
            </div>

            {onBackendSelect && (
              <button
                onClick={() => onBackendSelect(recommendedBackend)}
                className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Use This
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Available Backends */}
      {showDetailed && allBackends.length > 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">⚙️ All Available Backends</h3>

          <div className="space-y-2">
            {allBackends.map((backend, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all ${
                  backend.type === recommendedBackend?.type
                    ? 'bg-blue-900/20 border-blue-700'
                    : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-xl">{getBackendEmoji(backend.type)}</span>
                    <div className="flex-1">
                      <p className="text-white font-medium capitalize">
                        {backend.type.replace('-', ' ')}
                      </p>
                      <p className="text-sm text-gray-400">{backend.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        backend.cost === 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {backend.cost === 0 ? 'FREE' : `$${backend.cost.toFixed(2)}`}
                    </span>

                    {onBackendSelect && backend.type !== recommendedBackend?.type && (
                      <button
                        onClick={() => onBackendSelect(backend)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Select
                      </button>
                    )}

                    {backend.type === recommendedBackend?.type && (
                      <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              💡 <strong>Tip:</strong> The system will automatically fallback to the next available
              backend if the primary one fails.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact GPU Status Badge (for header/navbar)
 */
export function GPUStatusBadge() {
  const { resources, isDetecting, recommendedBackend } = useDeviceDetection();

  if (isDetecting) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 rounded-full">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-400">Detecting...</span>
      </div>
    );
  }

  const hasGPU = resources?.devices.some(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  const gpuDevice = resources?.devices.find(
    d => (d.type === 'cuda' || d.type === 'mps') && d.available
  );

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
        hasGPU ? 'bg-green-900/30 border border-green-700' : 'bg-gray-800 border border-gray-700'
      }`}
    >
      <span className="text-sm">{hasGPU ? getDeviceEmoji(gpuDevice!.type) : '☁️'}</span>
      <span className="text-xs text-gray-300">
        {hasGPU
          ? `${gpuDevice!.name.split(' ')[0]}`
          : recommendedBackend?.type.replace('-', ' ') || 'Cloud'}
      </span>
      {hasGPU && recommendedBackend?.cost === 0 && (
        <span className="text-xs text-green-400 font-semibold">FREE</span>
      )}
    </div>
  );
}
