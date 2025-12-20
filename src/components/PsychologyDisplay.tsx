/**
 * Psychology Profile Display Component
 * Shows calculated psychology metrics for a character
 */

import React from 'react';
import type { Character } from '../types';
import {
  calculatePsychologyProfile,
  analyzeParamiPortfolio,
} from '../services/psychologyCalculator';
import { isFeatureEnabled } from '../config/featureFlags';

interface PsychologyDisplayProps {
  character: Character;
  compact?: boolean;
}

export const PsychologyDisplay: React.FC<PsychologyDisplayProps> = ({
  character,
  compact = false,
}) => {
  const profile = calculatePsychologyProfile(character);
  const paramiAnalysis = isFeatureEnabled('PARAMI_SYNERGY_MATRIX')
    ? analyzeParamiPortfolio(character)
    : null;

  // Color coding for mental balance
  const getBalanceColor = (balance: number) => {
    if (balance > 30) return 'text-green-400';
    if (balance > 0) return 'text-cyan-400';
    if (balance > -30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBalanceBg = (balance: number) => {
    if (balance > 30) return 'bg-green-500/20 border-green-500/50';
    if (balance > 0) return 'bg-cyan-500/20 border-cyan-500/50';
    if (balance > -30) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  const getMoodIcon = (mood: string) => {
    const icons: Record<string, string> = {
      peaceful: '😌',
      joyful: '😊',
      angry: '😠',
      confused: '😕',
      fearful: '😰',
      neutral: '😐',
    };
    return icons[mood] || '😐';
  };

  if (compact) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
        <div className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wide">
          ⚡ Psychology Profile
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Mood:</span>
            <span className="ml-2 text-white">
              {getMoodIcon(profile.dominantEmotion)} {profile.dominantEmotion}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Balance:</span>
            <span className={`ml-2 font-bold ${getBalanceColor(profile.mentalBalance)}`}>
              {profile.mentalBalance.toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Virtue:</span>
            <span className="ml-2 text-green-400 text-[10px]">
              {profile.consciousnessScore.toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Defil:</span>
            <span className="ml-2 text-red-400 text-[10px]">
              {profile.defilementScore.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-3">
        <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-wide">
          ⚡ Psychological Analysis
        </h3>
        <div className="text-4xl">{getMoodIcon(profile.dominantEmotion)}</div>
      </div>

      {/* Mental Balance Indicator */}
      <div className={`p-4 rounded-lg border ${getBalanceBg(profile.mentalBalance)}`}>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Mental Balance</div>
        <div className="flex items-end gap-3">
          <div className={`text-4xl font-black ${getBalanceColor(profile.mentalBalance)}`}>
            {profile.mentalBalance.toFixed(0)}
          </div>
          <div className="text-sm text-gray-300 pb-1">
            {profile.mentalBalance > 0 ? '✨ Virtuous' : '⚠️ Troubled'}
          </div>
        </div>
        <div className="mt-3 bg-gray-800/50 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${profile.mentalBalance > 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(profile.mentalBalance), 100)}%` }}
          />
        </div>
      </div>

      {/* Core Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-green-400/70 mb-1">
            Consciousness
          </div>
          <div className="text-3xl font-black text-green-400">
            {profile.consciousnessScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Strongest:{' '}
            <span className="text-green-300">{profile.strongestVirtue.split('(')[0]}</span>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-red-400/70 mb-1">Defilement</div>
          <div className="text-3xl font-black text-red-400">
            {profile.defilementScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Strongest:{' '}
            <span className="text-red-300">{profile.strongestDefilement.split('(')[0]}</span>
          </div>
        </div>
      </div>

      {/* Emotional State */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
        <div className="text-xs uppercase tracking-wider text-gray-400">Current State</div>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getMoodIcon(profile.dominantEmotion)}</div>
          <div>
            <div className="text-lg font-bold text-white capitalize">{profile.dominantEmotion}</div>
            <div className="text-xs text-gray-400">
              Intensity: {profile.emotionalIntensity.toFixed(0)}/100
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-300 mt-2 italic">
          &ldquo;{profile.emotionalTendency}&rdquo;
        </div>
      </div>

      {/* Personality Description */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="text-xs uppercase tracking-wider text-cyan-400/70 mb-2">
          Personality Summary
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{profile.personalityDescription}</p>
      </div>

      {/* Parami Portfolio (if enabled and available) */}
      {paramiAnalysis && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-purple-400/70">
              🌟 10 Paramis (Perfections)
            </div>
            <div className="text-lg font-bold text-purple-300">
              {paramiAnalysis.totalParamiStrength}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-purple-500/10 rounded p-2">
              <div className="text-purple-400/70">Strongest</div>
              <div className="font-bold text-purple-300 capitalize">
                {paramiAnalysis.strongestParami.name}
              </div>
              <div className="text-gray-400">Lv {paramiAnalysis.strongestParami.level}</div>
            </div>
            <div className="bg-pink-500/10 rounded p-2">
              <div className="text-pink-400/70">Synergy Bonus</div>
              <div className="font-bold text-pink-300">+{paramiAnalysis.overallSynergyBonus}</div>
              <div className="text-gray-400">Total boost</div>
            </div>
          </div>

          <div className="space-y-1">
            {paramiAnalysis.synergyAnalysis.slice(0, 5).map(item => (
              <div
                key={item.parami}
                className="flex items-center justify-between text-xs bg-gray-800/30 rounded px-2 py-1"
              >
                <span className="text-gray-300 capitalize">{item.parami}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Lv {item.baseLevel}</span>
                  {item.synergyBonus > 0 && (
                    <span className="text-green-400">+{item.synergyBonus.toFixed(1)}</span>
                  )}
                  <span className="text-purple-300 font-bold">
                    = {item.effectiveLevel.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {paramiAnalysis.synergyAnalysis.length > 5 && (
            <div className="text-center text-xs text-gray-500">
              ... and {paramiAnalysis.synergyAnalysis.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PsychologyDisplay;

