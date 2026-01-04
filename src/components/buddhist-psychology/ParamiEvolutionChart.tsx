/**
 * ParamiEvolutionChart Component
 *
 * Interactive visualization of 10 Parami (Buddhist Perfections) evolution
 * Features:
 * - Real-time level display (0-100)
 * - Progress bars with gradient colors
 * - Synergy bonus indicators
 * - Hover tooltips with detailed stats
 * - Smooth animations
 * - Responsive design
 *
 * Phase 3: Advanced UI Features
 */

import React, { useState, useMemo } from 'react';
import type { ParamiPortfolio } from '../../types';
import { isFeatureEnabled } from '../../config/featureFlags';

interface ParamiEvolutionChartProps {
  portfolio: ParamiPortfolio;
  showSynergy?: boolean;
  compact?: boolean;
  animated?: boolean;
}

interface ParamiInfo {
  key: keyof ParamiPortfolio;
  nameThai: string;
  nameEnglish: string;
  description: string;
  color: string;
  synergyWith: (keyof ParamiPortfolio)[];
}

const PARAMI_INFO: ParamiInfo[] = [
  {
    key: 'dana',
    nameThai: 'ทาน',
    nameEnglish: 'Generosity',
    description: 'The perfection of giving and sharing',
    color: '#10b981', // emerald-500
    synergyWith: ['metta', 'upekkha', 'sila'],
  },
  {
    key: 'sila',
    nameThai: 'ศีล',
    nameEnglish: 'Morality',
    description: 'The perfection of ethical conduct',
    color: '#3b82f6', // blue-500
    synergyWith: ['sacca', 'khanti', 'dana'],
  },
  {
    key: 'nekkhamma',
    nameThai: 'เนกขัมมะ',
    nameEnglish: 'Renunciation',
    description: 'The perfection of letting go',
    color: '#8b5cf6', // violet-500
    synergyWith: ['panna', 'adhitthana', 'viriya'],
  },
  {
    key: 'panna',
    nameThai: 'ปัญญา',
    nameEnglish: 'Wisdom',
    description: 'The perfection of insight and understanding',
    color: '#f59e0b', // amber-500
    synergyWith: ['nekkhamma', 'adhitthana', 'viriya'],
  },
  {
    key: 'viriya',
    nameThai: 'วิริยะ',
    nameEnglish: 'Energy',
    description: 'The perfection of effort and perseverance',
    color: '#ef4444', // red-500
    synergyWith: ['adhitthana', 'panna', 'nekkhamma'],
  },
  {
    key: 'khanti',
    nameThai: 'ขันติ',
    nameEnglish: 'Patience',
    description: 'The perfection of forbearance',
    color: '#06b6d4', // cyan-500
    synergyWith: ['sila', 'upekkha', 'metta'],
  },
  {
    key: 'sacca',
    nameThai: 'สัจจะ',
    nameEnglish: 'Truthfulness',
    description: 'The perfection of honesty and integrity',
    color: '#84cc16', // lime-500
    synergyWith: ['sila', 'panna', 'adhitthana'],
  },
  {
    key: 'adhitthana',
    nameThai: 'อธิษฐาน',
    nameEnglish: 'Determination',
    description: 'The perfection of resolve and commitment',
    color: '#ec4899', // pink-500
    synergyWith: ['viriya', 'panna', 'nekkhamma'],
  },
  {
    key: 'metta',
    nameThai: 'เมตตา',
    nameEnglish: 'Loving-kindness',
    description: 'The perfection of unconditional love',
    color: '#f472b6', // pink-400
    synergyWith: ['dana', 'khanti', 'upekkha'],
  },
  {
    key: 'upekkha',
    nameThai: 'อุเบกขา',
    nameEnglish: 'Equanimity',
    description: 'The perfection of balanced composure',
    color: '#6366f1', // indigo-500
    synergyWith: ['panna', 'khanti', 'dana'],
  },
];

/**
 * Calculate synergy bonus for a parami based on supporting paramis
 */
function calculateSynergyBonus(parami: ParamiInfo, portfolio: ParamiPortfolio): number {
  let totalBonus = 0;
  for (const supportingKey of parami.synergyWith) {
    const supportingLevel = portfolio[supportingKey]?.level || 0;
    totalBonus += supportingLevel * 0.15; // 15% weight per supporting parami
  }
  return totalBonus;
}

/**
 * ParamiEvolutionChart Component
 */
export const ParamiEvolutionChart: React.FC<ParamiEvolutionChartProps> = ({
  portfolio,
  showSynergy = true,
  compact = false,
  animated = true,
}) => {
  const [hoveredParami, setHoveredParami] = useState<keyof ParamiPortfolio | null>(null);

  // Check feature flag
  const isEnabled = isFeatureEnabled('PARAMI_SYNERGY_MATRIX');

  // Calculate synergy bonuses
  const synergyData = useMemo(() => {
    if (!showSynergy || !isEnabled) return {};

    const data: Record<string, number> = {};
    for (const parami of PARAMI_INFO) {
      data[parami.key as string] = calculateSynergyBonus(parami, portfolio);
    }
    return data;
  }, [portfolio, showSynergy, isEnabled]);

  // Calculate average level
  const averageLevel = useMemo(() => {
    const levels = PARAMI_INFO.map(p => portfolio[p.key]?.level || 0);
    return levels.reduce((sum, level) => sum + level, 0) / levels.length;
  }, [portfolio]);

  if (compact) {
    return (
      <div className="parami-chart-compact">
        <div className="grid grid-cols-2 gap-2">
          {PARAMI_INFO.map(parami => {
            const data = portfolio[parami.key] || { level: 0, exp: 0 };
            const synergy = synergyData[parami.key as string] || 0;

            return (
              <div
                key={parami.key as string}
                className="flex items-center gap-2 p-2 rounded bg-gray-800/50"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parami.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-200 truncate">
                    {parami.nameThai}
                  </div>
                  <div className="text-xs text-gray-400">
                    Lv {data.level}
                    {synergy > 0 && (
                      <span className="ml-1 text-green-400">+{synergy.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="parami-evolution-chart p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Parami Evolution</h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div>
            Average Level:{' '}
            <span className="text-white font-semibold">{averageLevel.toFixed(1)}</span>
          </div>
          {showSynergy && isEnabled && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Synergy Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Parami Bars */}
      <div className="space-y-4">
        {PARAMI_INFO.map(parami => {
          const data = portfolio[parami.key] || { level: 0, exp: 0 };
          const synergy = synergyData[parami.key as string] || 0;
          const isHovered = hoveredParami === parami.key;

          return (
            <div
              key={parami.key as string}
              className={`parami-item transition-all duration-300 ${isHovered ? 'scale-102' : ''}`}
              onMouseEnter={() => setHoveredParami(parami.key)}
              onMouseLeave={() => setHoveredParami(null)}
            >
              {/* Parami Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      animated ? 'transition-all duration-300' : ''
                    } ${isHovered ? 'scale-125 shadow-lg' : ''}`}
                    style={{
                      backgroundColor: parami.color,
                      boxShadow: isHovered ? `0 0 12px ${parami.color}` : 'none',
                    }}
                  />
                  <div>
                    <div className="text-white font-medium">
                      {parami.nameThai} ({parami.nameEnglish})
                    </div>
                    {isHovered && (
                      <div className="text-xs text-gray-400 mt-1">{parami.description}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">
                    Lv {data.level}
                    {synergy > 0 && (
                      <span className="ml-2 text-sm text-green-400 font-normal">
                        +{synergy.toFixed(1)} ⚡
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {data.exp} / {(data.level + 1) * 100} EXP
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                {/* Base Level */}
                <div
                  className={`absolute top-0 left-0 h-full rounded-full ${
                    animated ? 'transition-all duration-500 ease-out' : ''
                  }`}
                  style={{
                    width: `${Math.min(data.level, 100)}%`,
                    background: `linear-gradient(90deg, ${parami.color}dd, ${parami.color})`,
                  }}
                />
                {/* Synergy Bonus */}
                {synergy > 0 && (
                  <div
                    className={`absolute top-0 h-full bg-green-400/40 ${
                      animated ? 'transition-all duration-500 ease-out animate-pulse' : ''
                    }`}
                    style={{
                      left: `${Math.min(data.level, 100)}%`,
                      width: `${Math.min(synergy, 100 - data.level)}%`,
                    }}
                  />
                )}
              </div>

              {/* Synergy Details (on hover) */}
              {isHovered && showSynergy && isEnabled && synergy > 0 && (
                <div className="mt-2 p-3 bg-gray-800/80 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-300 mb-2">
                    <strong className="text-green-400">Synergy Bonus:</strong> +{synergy.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Supported by:{' '}
                    {parami.synergyWith.map((key, idx) => {
                      const supportingParami = PARAMI_INFO.find(p => p.key === key);
                      const supportLevel = portfolio[key]?.level || 0;
                      return (
                        <span key={key as string}>
                          {idx > 0 && ', '}
                          <span className="text-gray-300">
                            {supportingParami?.nameThai} (Lv {supportLevel})
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>High (80+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Medium (50-79)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Low (20-49)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded" />
            <span>Minimal (0-19)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParamiEvolutionChart;
