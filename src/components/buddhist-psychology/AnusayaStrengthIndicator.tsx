/**
 * AnusayaStrengthIndicator Component
 *
 * Visual display of the 7 Anusaya (latent tendencies/defilements) strength
 * in Buddhist Psychology
 *
 * Features:
 * - Color-coded strength bars (green = low, red = high)
 * - Warning indicators for dangerous levels
 * - Detailed tooltips with descriptions
 * - Parami resistance display
 * - Comparative view
 *
 * Phase 3: Advanced UI Features
 */

import React, { useState } from 'react';
import type { AnusayaProfile, ParamiPortfolio } from '../../types';

interface AnusayaStrengthIndicatorProps {
  anusaya: AnusayaProfile;
  paramiPortfolio?: ParamiPortfolio;
  showResistance?: boolean;
  compact?: boolean;
}

interface AnusayaInfo {
  key: keyof AnusayaProfile;
  nameThai: string;
  nameEnglish: string;
  description: string;
  warningLevel: number; // 0-100, threshold for warnings
  resistedBy?: (keyof ParamiPortfolio)[]; // Paramis that reduce this anusaya
}

const ANUSAYA_INFO: AnusayaInfo[] = [
  {
    key: 'kama_raga',
    nameThai: 'กามราคานุสัย',
    nameEnglish: 'Sensual Desire',
    description: 'Latent tendency toward craving for sensual pleasures',
    warningLevel: 70,
    resistedBy: ['nekkhamma', 'upekkha', 'panna'],
  },
  {
    key: 'patigha',
    nameThai: 'ปฏิฆานุสัย',
    nameEnglish: 'Aversion',
    description: 'Latent tendency toward anger and ill-will',
    warningLevel: 65,
    resistedBy: ['metta', 'khanti', 'upekkha'],
  },
  {
    key: 'mana',
    nameThai: 'มานานุสัย',
    nameEnglish: 'Conceit',
    description: 'Latent tendency toward pride and self-importance',
    warningLevel: 75,
    resistedBy: ['upekkha', 'panna', 'sila'],
  },
  {
    key: 'ditthi',
    nameThai: 'ทิฏฐานุสัย',
    nameEnglish: 'Wrong View',
    description: 'Latent tendency toward incorrect understanding of reality',
    warningLevel: 80,
    resistedBy: ['panna', 'sacca', 'viriya'],
  },
  {
    key: 'vicikiccha',
    nameThai: 'วิจิกิจฉานุสัย',
    nameEnglish: 'Doubt',
    description: 'Latent tendency toward skepticism and uncertainty',
    warningLevel: 70,
    resistedBy: ['panna', 'adhitthana', 'viriya'],
  },
  {
    key: 'bhava_raga',
    nameThai: 'ภวราคานุสัย',
    nameEnglish: 'Craving for Existence',
    description: 'Latent tendency toward attachment to being and becoming',
    warningLevel: 85,
    resistedBy: ['nekkhamma', 'panna', 'upekkha'],
  },
  {
    key: 'avijja',
    nameThai: 'อวิชชานุสัย',
    nameEnglish: 'Ignorance',
    description: 'Fundamental latent tendency toward not-knowing the truth',
    warningLevel: 90,
    resistedBy: ['panna', 'viriya', 'adhitthana'],
  },
];

/**
 * Get color based on strength level
 */
function getStrengthColor(strength: number, warningLevel: number): string {
  if (strength >= warningLevel) return '#ef4444'; // red-500 - Dangerous
  if (strength >= warningLevel * 0.7) return '#f59e0b'; // amber-500 - Warning
  if (strength >= warningLevel * 0.4) return '#eab308'; // yellow-500 - Caution
  return '#10b981'; // emerald-500 - Safe
}

/**
 * Get severity label
 */
function getSeverityLabel(strength: number, warningLevel: number): string {
  if (strength >= warningLevel) return 'Critical';
  if (strength >= warningLevel * 0.7) return 'High';
  if (strength >= warningLevel * 0.4) return 'Moderate';
  return 'Low';
}

/**
 * Calculate parami resistance against anusaya
 */
function calculateResistance(anusaya: AnusayaInfo, paramiPortfolio: ParamiPortfolio): number {
  if (!anusaya.resistedBy) return 0;

  let totalResistance = 0;
  for (const paramiKey of anusaya.resistedBy) {
    const paramiLevel = paramiPortfolio[paramiKey]?.level || 0;
    totalResistance += paramiLevel * 0.5; // 50% effectiveness
  }

  return Math.min(totalResistance, 100);
}

/**
 * AnusayaStrengthIndicator Component
 */
export const AnusayaStrengthIndicator: React.FC<AnusayaStrengthIndicatorProps> = ({
  anusaya,
  paramiPortfolio,
  showResistance = true,
  compact = false,
}) => {
  const [hoveredAnusaya, setHoveredAnusaya] = useState<keyof AnusayaProfile | null>(null);

  // Calculate average strength
  const averageStrength =
    (Object.values(anusaya) as number[]).reduce((sum: number, val: number) => sum + val, 0) / 7;

  // Count critical anusayas
  const criticalCount = ANUSAYA_INFO.filter(info => anusaya[info.key] >= info.warningLevel).length;

  if (compact) {
    return (
      <div className="anusaya-indicator-compact">
        <div className="grid grid-cols-1 gap-2">
          {ANUSAYA_INFO.map(info => {
            const strength = anusaya[info.key];
            const color = getStrengthColor(strength, info.warningLevel);
            const severity = getSeverityLabel(strength, info.warningLevel);

            return (
              <div
                key={info.key as string}
                className="flex items-center gap-2 p-2 rounded bg-gray-800/50"
              >
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-200">{info.nameThai}</div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${strength}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {strength}
                  <span className="ml-1 text-gray-500">{severity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="anusaya-strength-indicator p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Anusaya: Latent Tendencies</h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div>
            Average Strength:{' '}
            <span className="text-white font-semibold">{averageStrength.toFixed(1)}</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-bold">{criticalCount} Critical</span>
            </div>
          )}
        </div>
      </div>

      {/* Anusaya Bars */}
      <div className="space-y-4">
        {ANUSAYA_INFO.map(info => {
          const strength = anusaya[info.key];
          const color = getStrengthColor(strength, info.warningLevel);
          const severity = getSeverityLabel(strength, info.warningLevel);
          const resistance =
            paramiPortfolio && showResistance ? calculateResistance(info, paramiPortfolio) : 0;
          const netStrength = Math.max(0, strength - resistance);
          const isHovered = hoveredAnusaya === info.key;
          const isCritical = strength >= info.warningLevel;

          return (
            <div
              key={info.key as string}
              className={`anusaya-item transition-all duration-300 ${isHovered ? 'scale-102' : ''}`}
              onMouseEnter={() => setHoveredAnusaya(info.key)}
              onMouseLeave={() => setHoveredAnusaya(null)}
            >
              {/* Anusaya Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      isHovered ? 'scale-125 shadow-lg' : ''
                    } ${isCritical ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: color,
                      boxShadow: isHovered ? `0 0 12px ${color}` : 'none',
                    }}
                  />
                  <div>
                    <div className="text-white font-medium">
                      {info.nameThai} ({info.nameEnglish})
                    </div>
                    {isHovered && (
                      <div className="text-xs text-gray-400 mt-1">{info.description}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">
                    {strength}
                    {resistance > 0 && (
                      <span className="ml-2 text-sm text-green-400 font-normal">
                        -{resistance.toFixed(0)} 🛡️
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      isCritical
                        ? 'text-red-400'
                        : severity === 'High'
                          ? 'text-amber-400'
                          : severity === 'Moderate'
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                    }`}
                  >
                    {severity}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                {/* Raw Strength */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(strength, 100)}%`,
                    backgroundColor: color,
                  }}
                />
                {/* Parami Resistance (overlay) */}
                {resistance > 0 && (
                  <div
                    className="absolute top-0 h-full bg-green-400/40 transition-all duration-500"
                    style={{
                      right: `${100 - Math.min(strength, 100)}%`,
                      width: `${Math.min(resistance, strength)}%`,
                    }}
                  />
                )}
                {/* Warning Threshold Line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/50"
                  style={{ left: `${info.warningLevel}%` }}
                />
              </div>

              {/* Resistance Details (on hover) */}
              {isHovered && showResistance && paramiPortfolio && resistance > 0 && (
                <div className="mt-2 p-3 bg-gray-800/80 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-300 mb-2">
                    <strong className="text-green-400">Parami Resistance:</strong> -
                    {resistance.toFixed(1)} (Net: {netStrength.toFixed(1)})
                  </div>
                  <div className="text-xs text-gray-400">
                    Protected by:{' '}
                    {info.resistedBy?.map((key, idx) => {
                      const level = paramiPortfolio[key]?.level || 0;
                      return (
                        <span key={key as string}>
                          {idx > 0 && ', '}
                          <span className="text-gray-300">
                            {String(key)} (Lv {level})
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

      {/* Warning System */}
      {criticalCount > 0 && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="text-red-400 font-bold mb-1">Critical Anusaya Detected</div>
              <div className="text-sm text-gray-300">
                {criticalCount} latent {criticalCount === 1 ? 'tendency' : 'tendencies'}{' '}
                {criticalCount === 1 ? 'has' : 'have'} reached dangerous levels. Consider:
              </div>
              <ul className="mt-2 ml-4 text-sm text-gray-400 list-disc space-y-1">
                <li>Developing opposing Paramis (perfections)</li>
                <li>Mindfulness practice to observe these tendencies</li>
                <li>Avoiding triggering situations when possible</li>
                <li>Seeking guidance from experienced practitioners</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span>Safe (Low)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Caution (Moderate)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span>Warning (High)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Critical (Dangerous)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnusayaStrengthIndicator;

