/**
 * KarmaTimelineView Component
 *
 * Interactive timeline visualization of karma actions and their effects
 * Shows cause-and-effect relationships in Buddhist Psychology
 *
 * Features:
 * - Chronological karma action display
 * - Kusala/Akusala classification
 * - Intensity visualization
 * - Effect tracking (parami gains, anusaya changes)
 * - Interactive filtering
 * - Expandable details
 *
 * Phase 3: Advanced UI Features
 */

import React, { useState, useMemo } from 'react';

interface KarmaAction {
  id: string;
  timestamp: number;
  type: 'kaya' | 'vaca' | 'mano'; // Body, Speech, Mind
  classification: 'kusala' | 'akusala';
  intensity: number; // 0-100
  description: string;
  effects: {
    paramiGains?: Record<string, number>;
    anusayaChanges?: Record<string, number>;
    cetanaStrength?: number;
  };
  scene?: number;
  character?: string;
}

interface KarmaTimelineViewProps {
  actions: KarmaAction[];
  maxDisplay?: number;
  compact?: boolean;
  showFilters?: boolean;
}

/**
 * Get action type info
 */
function getActionTypeInfo(type: KarmaAction['type']): {
  label: string;
  labelThai: string;
  icon: string;
  color: string;
} {
  const types = {
    kaya: {
      label: 'Body',
      labelThai: 'กาย',
      icon: '🧘',
      color: '#3b82f6', // blue
    },
    vaca: {
      label: 'Speech',
      labelThai: 'วาจา',
      icon: '💬',
      color: '#10b981', // emerald
    },
    mano: {
      label: 'Mind',
      labelThai: 'ใจ',
      icon: '🧠',
      color: '#8b5cf6', // violet
    },
  };
  return types[type];
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * KarmaTimelineView Component
 */
export const KarmaTimelineView: React.FC<KarmaTimelineViewProps> = ({
  actions,
  maxDisplay = 20,
  compact = false,
  showFilters = true,
}) => {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'kaya' | 'vaca' | 'mano'>('all');
  const [filterClassification, setFilterClassification] = useState<'all' | 'kusala' | 'akusala'>(
    'all'
  );

  // Filter and sort actions
  const filteredActions = useMemo(() => {
    let filtered = [...actions];

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    if (filterClassification !== 'all') {
      filtered = filtered.filter(a => a.classification === filterClassification);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return filtered.slice(0, maxDisplay);
  }, [actions, filterType, filterClassification, maxDisplay]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = actions.length;
    const kusala = actions.filter(a => a.classification === 'kusala').length;
    const akusala = actions.filter(a => a.classification === 'akusala').length;
    const avgIntensity = actions.reduce((sum, a) => sum + a.intensity, 0) / total || 0;

    return {
      total,
      kusala,
      akusala,
      kusalaPercent: (kusala / total) * 100 || 0,
      akusalaPercent: (akusala / total) * 100 || 0,
      avgIntensity,
    };
  }, [actions]);

  if (actions.length === 0) {
    return (
      <div className="karma-timeline-empty p-6 bg-gray-800/50 rounded-lg text-center">
        <div className="text-4xl mb-3">📜</div>
        <div className="text-gray-400">No karma actions recorded yet</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="karma-timeline-compact space-y-2">
        {filteredActions.map(action => {
          const typeInfo = getActionTypeInfo(action.type);
          const isKusala = action.classification === 'kusala';

          return (
            <div
              key={action.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isKusala ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              <div className="text-2xl">{typeInfo.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">
                  {action.description}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{typeInfo.labelThai}</span>
                  <span>•</span>
                  <span>{formatTimestamp(action.timestamp)}</span>
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-bold ${
                  isKusala ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {action.intensity}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="karma-timeline-view p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Karma Timeline</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-400">
            Total Actions: <span className="text-white font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-green-400">
              Kusala: {stats.kusala} ({stats.kusalaPercent.toFixed(0)}%)
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600" />
            <div className="text-red-400">
              Akusala: {stats.akusala} ({stats.akusalaPercent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-400">Filter:</div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Types
            </button>
            {(['kaya', 'vaca', 'mano'] as const).map(type => {
              const info = getActionTypeInfo(type);
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    filterType === type
                      ? 'text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{
                    backgroundColor: filterType === type ? info.color : undefined,
                  }}
                >
                  <span>{info.icon}</span>
                  <span>{info.labelThai}</span>
                </button>
              );
            })}
          </div>

          {/* Classification Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterClassification('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterClassification === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterClassification('kusala')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterClassification === 'kusala'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✓ Kusala
            </button>
            <button
              onClick={() => setFilterClassification('akusala')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterClassification === 'akusala'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✗ Akusala
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {filteredActions.map((action, index) => {
          const typeInfo = getActionTypeInfo(action.type);
          const isKusala = action.classification === 'kusala';
          const isExpanded = expandedAction === action.id;
          const hasEffects =
            action.effects.paramiGains ||
            action.effects.anusayaChanges ||
            action.effects.cetanaStrength;

          return (
            <div
              key={action.id}
              className={`karma-action-item transition-all duration-300 ${
                isExpanded ? 'scale-102' : ''
              }`}
            >
              {/* Timeline Connector */}
              {index < filteredActions.length - 1 && <div className="ml-6 h-4 w-0.5 bg-gray-700" />}

              {/* Action Card */}
              <div
                className={`rounded-lg border-2 overflow-hidden cursor-pointer ${
                  isKusala
                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                    : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                }`}
                onClick={() => setExpandedAction(isExpanded ? null : action.id)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${typeInfo.color}20` }}
                    >
                      {typeInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-white font-medium">{action.description}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span style={{ color: typeInfo.color }}>
                              {typeInfo.labelThai} ({typeInfo.label})
                            </span>
                            <span>•</span>
                            <span>{formatTimestamp(action.timestamp)}</span>
                            {action.scene && (
                              <>
                                <span>•</span>
                                <span>Scene {action.scene}</span>
                              </>
                            )}
                            {action.character && (
                              <>
                                <span>•</span>
                                <span>{action.character}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Classification */}
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isKusala
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isKusala ? '✓ Kusala' : '✗ Akusala'}
                          </div>
                          {/* Intensity */}
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Intensity</div>
                            <div className="text-white font-bold">{action.intensity}</div>
                          </div>
                        </div>
                      </div>

                      {/* Intensity Bar */}
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isKusala ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${action.intensity}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && hasEffects && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm font-semibold text-gray-300 mb-3">Effects:</div>

                      {/* Parami Gains */}
                      {action.effects.paramiGains && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 mb-2">Parami Gains:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(action.effects.paramiGains).map(([parami, gain]) => (
                              <div
                                key={parami}
                                className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded"
                              >
                                <span className="text-xs text-gray-300 capitalize">{parami}</span>
                                <span className="text-xs font-bold text-green-400">
                                  +{gain} EXP
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Anusaya Changes */}
                      {action.effects.anusayaChanges && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 mb-2">Anusaya Changes:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(action.effects.anusayaChanges).map(
                              ([anusaya, change]) => (
                                <div
                                  key={anusaya}
                                  className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded"
                                >
                                  <span className="text-xs text-gray-300">{anusaya}</span>
                                  <span
                                    className={`text-xs font-bold ${
                                      change > 0 ? 'text-red-400' : 'text-green-400'
                                    }`}
                                  >
                                    {change > 0 ? '+' : ''}
                                    {change}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cetana Strength */}
                      {action.effects.cetanaStrength !== undefined && (
                        <div>
                          <div className="text-xs text-gray-400 mb-2">
                            Volition Strength (Cetana):
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500"
                                style={{
                                  width: `${action.effects.cetanaStrength}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-bold text-white">
                              {action.effects.cetanaStrength}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Button */}
      {filteredActions.length >= maxDisplay && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-400">
            Showing {filteredActions.length} of {actions.length} actions
          </div>
        </div>
      )}
    </div>
  );
};

export default KarmaTimelineView;
