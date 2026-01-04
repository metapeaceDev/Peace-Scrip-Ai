/**
 * Parami Progress Component
 * Shows 10 Paramis (Perfections) with progress bars, synergy, and target kilesa
 * Based on Digital Mind Model v14
 */

import React from 'react';
import type { Character, ParamiPortfolio } from '../types';

interface ParamiProgressProps {
  character: Character;
  showSynergy?: boolean; // Show synergy indicators
  compact?: boolean;
}

export const ParamiProgress: React.FC<ParamiProgressProps> = ({
  character,
  showSynergy = true,
  compact = false,
}) => {
  const parami = character.parami_portfolio;

  if (!parami) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">ยังไม่มีข้อมูลบารมี</p>
      </div>
    );
  }

  const paramiInfo: Record<
    keyof ParamiPortfolio,
    { thai: string; pali: string; icon: string; color: string; targetKilesa: string }
  > = {
    dana: {
      thai: 'ทาน',
      pali: 'Dāna',
      icon: '🎁',
      color: 'bg-green-500',
      targetKilesa: 'กามราคะ (Greed)',
    },
    sila: {
      thai: 'ศีล',
      pali: 'Sīla',
      icon: '✨',
      color: 'bg-blue-500',
      targetKilesa: 'ทิฏฐิ (Wrong View)',
    },
    nekkhamma: {
      thai: 'เนกขัมมะ',
      pali: 'Nekkhamma',
      icon: '🏔️',
      color: 'bg-purple-500',
      targetKilesa: 'กามราคะ (Sensual Lust)',
    },
    viriya: {
      thai: 'วิริยะ',
      pali: 'Viriya',
      icon: '💪',
      color: 'bg-orange-500',
      targetKilesa: 'ถีนมิทธะ (Sloth)',
    },
    khanti: {
      thai: 'ขันติ',
      pali: 'Khanti',
      icon: '🕊️',
      color: 'bg-teal-500',
      targetKilesa: 'ปฏิฆะ (Ill-will)',
    },
    sacca: {
      thai: 'สัจจะ',
      pali: 'Sacca',
      icon: '💎',
      color: 'bg-indigo-500',
      targetKilesa: 'วิจิกิจฉา (Doubt)',
    },
    adhitthana: {
      thai: 'อธิษฐาน',
      pali: 'Adhiṭṭhāna',
      icon: '🎯',
      color: 'bg-red-500',
      targetKilesa: 'วิจิกิจฉา (Doubt)',
    },
    metta: {
      thai: 'เมตตา',
      pali: 'Mettā',
      icon: '💖',
      color: 'bg-pink-500',
      targetKilesa: 'ปฏิฆะ (Ill-will)',
    },
    upekkha: {
      thai: 'อุเบกขา',
      pali: 'Upekkhā',
      icon: '⚖️',
      color: 'bg-gray-500',
      targetKilesa: 'มานะ (Conceit)',
    },
    panna: {
      thai: 'ปัญญา',
      pali: 'Paññā',
      icon: '🔆',
      color: 'bg-yellow-500',
      targetKilesa: 'อวิชชา (Ignorance)',
    },
  };

  const EXP_PER_LEVEL = 1000;

  /**
   * Calculate progress percentage to next level
   */
  const getProgressPercent = (exp: number, _level: number): number => {
    const expInCurrentLevel = exp % EXP_PER_LEVEL;
    return (expInCurrentLevel / EXP_PER_LEVEL) * 100;
  };

  /**
   * Get remaining EXP to next level
   */
  const getRemainingEXP = (exp: number): number => {
    return EXP_PER_LEVEL - (exp % EXP_PER_LEVEL);
  };

  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(parami) as Array<keyof ParamiPortfolio>).map(key => {
          const info = paramiInfo[key];
          const { level } = parami[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center p-2 bg-white rounded-lg border border-gray-200"
              title={`${info.thai} (${info.pali}): Level ${level}`}
            >
              <span className="text-2xl">{info.icon}</span>
              <span className="text-xs font-medium mt-1">{info.thai}</span>
              <span className="text-sm font-bold text-gray-700">Lv.{level}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <span className="text-2xl">🌟</span>
        <span>บารมี 10 (Pāramī) - {character.name}</span>
      </h3>

      <div className="space-y-4">
        {(Object.keys(parami) as Array<keyof ParamiPortfolio>).map(key => {
          const info = paramiInfo[key];
          const { level, exp } = parami[key];
          const progress = getProgressPercent(exp, level);
          const remaining = getRemainingEXP(exp);

          return (
            <div
              key={key}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{info.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {info.thai} ({info.pali})
                    </div>
                    <div className="text-xs text-gray-500">ต่อต้าน: {info.targetKilesa}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-700">Lv.{level}</div>
                  <div className="text-xs text-gray-500">{exp.toLocaleString()} EXP</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${info.color} transition-all duration-500 ease-out`}
                  style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                  {progress.toFixed(1)}% • เหลือ {remaining.toLocaleString()} EXP
                </div>
              </div>

              {/* Synergy Indicators */}
              {showSynergy && level > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">Synergy: </span>
                  {getSynergyParamis(key).map((synergyKey, idx) => (
                    <span key={idx} className="ml-2">
                      +{parami[synergyKey].level * 10}% จาก {paramiInfo[synergyKey].thai}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Object.values(parami).reduce((sum, p) => sum + p.level, 0)}
          </div>
          <div className="text-xs text-gray-600">Total Levels</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {Object.values(parami)
              .reduce((sum, p) => sum + p.exp, 0)
              .toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Total EXP</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.max(...Object.values(parami).map(p => p.level))}
          </div>
          <div className="text-xs text-gray-600">Highest Level</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {(Object.keys(parami) as Array<keyof ParamiPortfolio>).find(
              k => parami[k].level === Math.max(...Object.values(parami).map(p => p.level))
            )}
          </div>
          <div className="text-xs text-gray-600">Strongest Parami</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get synergy Paramis for a given Parami (simplified version)
 */
function getSynergyParamis(key: keyof ParamiPortfolio): Array<keyof ParamiPortfolio> {
  const synergyMap: Record<keyof ParamiPortfolio, Array<keyof ParamiPortfolio>> = {
    dana: ['khanti', 'adhitthana', 'metta'],
    sila: ['sacca', 'panna', 'khanti'],
    nekkhamma: ['panna', 'viriya', 'upekkha'],
    viriya: ['adhitthana', 'panna', 'sila'],
    khanti: ['metta', 'upekkha', 'panna'],
    sacca: ['sila', 'adhitthana', 'panna'],
    adhitthana: ['viriya', 'sacca', 'panna'],
    metta: ['khanti', 'upekkha', 'dana'],
    upekkha: ['panna', 'khanti', 'metta'],
    panna: ['viriya', 'sila', 'upekkha'],
  };

  return synergyMap[key] || [];
}

export default ParamiProgress;
