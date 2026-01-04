/**
 * Cost Calculator Component (Enhanced)
 *
 * Interactive cost estimation with Load Balancer API
 * Helps users understand costs and optimize backend usage
 */

import React, { useState, useEffect } from 'react';
import {
  loadBalancerClient,
  type BackendType,
  type CostEstimate,
  type BackendRecommendation,
} from '../services/loadBalancerClient';

export const CostCalculatorEnhanced: React.FC = () => {
  const [jobCount, setJobCount] = useState(100);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [needsFast, setNeedsFast] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [recommendations, setRecommendations] = useState<{
    recommendations: BackendRecommendation[];
    totalCost: number;
    totalTime: number;
    avgCostPerJob: number;
  } | null>(null);
  const [selectedBackend, setSelectedBackend] = useState<BackendType | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    calculateCosts();
  }, [jobCount, selectedBackend, maxBudget, needsFast]);

  const calculateCosts = async () => {
    setIsLoading(true);
    try {
      // Get cost estimate
      const costEst = await loadBalancerClient.estimateCost(jobCount, selectedBackend);
      setEstimate(costEst);

      // Get recommendations
      const recs = await loadBalancerClient.getRecommendations({
        jobCount,
        maxBudget,
        needsFast,
      });
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to calculate costs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getBackendColor = (backend: BackendType) => {
    const colors: Record<BackendType, string> = {
      local: 'bg-green-500',
      cloud: 'bg-blue-500',
      gemini: 'bg-purple-500',
    };
    return colors[backend];
  };

  const formatCurrency = (amount: number) => {
    return amount === 0 ? 'Free' : `$${amount.toFixed(2)}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Input Panel */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">💰 Cost Calculator</h2>

        <div className="space-y-4">
          {/* Job Count */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Number of Videos to Generate</label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="1000"
                value={jobCount}
                onChange={e => setJobCount(parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="1"
                max="10000"
                value={jobCount}
                onChange={e => setJobCount(parseInt(e.target.value) || 1)}
                className="w-24 bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white text-center"
              />
            </div>
          </div>

          {/* Backend Selection */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Backend</label>
            <select
              value={selectedBackend}
              onChange={e => setSelectedBackend(e.target.value as BackendType | 'auto')}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="local">Local GPU Only</option>
              <option value="cloud">Cloud Only</option>
              <option value="gemini">Gemini Only</option>
            </select>
          </div>

          {/* Budget Limit */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Set Budget Limit</span>
              <input
                type="checkbox"
                checked={maxBudget !== null}
                onChange={e => setMaxBudget(e.target.checked ? 10 : null)}
                className="rounded"
              />
            </label>
            {maxBudget !== null && (
              <input
                type="number"
                step="1"
                min="0"
                value={maxBudget}
                onChange={e => setMaxBudget(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white"
                placeholder="Maximum budget in USD"
              />
            )}
          </div>

          {/* Speed Priority */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-gray-300">Prioritize Speed</span>
              <p className="text-xs text-gray-500">Get results faster (may cost more)</p>
            </div>
            <input
              type="checkbox"
              checked={needsFast}
              onChange={e => setNeedsFast(e.target.checked)}
              className="rounded"
            />
          </label>
        </div>
      </div>

      {/* Cost Estimate */}
      {estimate && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">📊 Cost Estimate</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(estimate.totalCost)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Cost Per Video</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(estimate.avgCostPerJob)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Est. Total Time</div>
              <div className="text-2xl font-bold text-white">
                {formatTime(estimate.estimatedTime)}
              </div>
            </div>
          </div>

          {/* Backend Breakdown */}
          {Object.keys(estimate.breakdown).length > 1 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Backend Distribution</h4>
              <div className="space-y-2">
                {Object.entries(estimate.breakdown).map(([backend, data]) => {
                  const percentage = (data.jobs / jobCount) * 100;
                  const backendType = backend as BackendType;

                  return (
                    <div key={backend} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <span>{loadBalancerClient.getBackendIcon(backendType)}</span>
                          <span>{loadBalancerClient.getBackendDisplayName(backendType)}</span>
                        </span>
                        <span className="text-white font-semibold">
                          {data.jobs} videos ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`absolute h-full ${getBackendColor(backendType)} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        Cost: {formatCurrency(data.cost)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">💡 Recommendations</h3>

          <div className="space-y-3">
            {recommendations.recommendations.map(rec => {
              if (rec.jobCount === 0) return null;

              const percentage = (rec.jobCount / jobCount) * 100;
              const icon = loadBalancerClient.getBackendIcon(rec.backend);
              const displayName = loadBalancerClient.getBackendDisplayName(rec.backend);

              return (
                <div
                  key={rec.backend}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <h4 className="font-semibold text-white">{displayName}</h4>
                        <p className="text-xs text-gray-400">{rec.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{rec.jobCount} videos</div>
                      <div className="text-xs text-gray-400">{percentage.toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-700">
                    <div>
                      <span className="text-xs text-gray-400">Cost</span>
                      <div className="font-semibold text-white">{formatCurrency(rec.cost)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Time</span>
                      <div className="font-semibold text-white">{formatTime(rec.time)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
            <div>
              <span className="text-sm text-gray-400">Total Cost: </span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(recommendations.totalCost)}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Avg per Video: </span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(recommendations.avgCostPerJob)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Savings Comparison */}
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
        <h3 className="font-semibold text-green-300 mb-2">💸 Potential Savings</h3>
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>100% Local GPU (Free):</span>
            <span className="font-semibold text-green-400">$0.00</span>
          </div>
          <div className="flex justify-between">
            <span>Hybrid (Auto mode):</span>
            <span className="font-semibold text-blue-400">
              {estimate ? formatCurrency(estimate.totalCost) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>100% Gemini:</span>
            <span className="font-semibold text-red-400">${(jobCount * 0.08).toFixed(2)}</span>
          </div>
        </div>
        {estimate && estimate.totalCost > 0 && (
          <div className="mt-3 pt-3 border-t border-green-800">
            <p className="text-xs text-green-300">
              💡 You could save ${(jobCount * 0.08 - estimate.totalCost).toFixed(2)} compared to
              using only Gemini!
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
};
