/**
 * CetasikaViewer.tsx
 *
 * Cetasika 52 Mental Factors Viewer Component
 * Displays Buddhist Psychology mental factors with interactive radar chart
 */

import React, { useState } from 'react';
import type { CetasikaProfile } from '../../types/cetasika';
import { CETASIKA_NAMES, getCetasikaLevel } from '../../types/cetasika';
import { describeCetasikaProfile, getTopCetasikaFactors } from '../../services/cetasikaCalculator';

interface CetasikaViewerProps {
  profile: CetasikaProfile;
  character?: {
    name: string;
    title?: string;
  };
  onClose?: () => void;
}

export const CetasikaViewer: React.FC<CetasikaViewerProps> = ({ profile, character, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'universal' | 'wholesome' | 'unwholesome'>(
    'summary'
  );

  const top5Factors = getTopCetasikaFactors(profile, 5);
  const description = describeCetasikaProfile(profile);

  // Get color based on value
  const getColorClass = (value: number) => {
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-blue-400';
    if (value >= 40) return 'text-yellow-400';
    if (value >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get background color for bars
  const getBarColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-yellow-500';
    if (value >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="cetasika-viewer bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              🧘 เจตสิก 52 - Buddhist Mental Factors
            </h2>
            {character && (
              <p className="text-lg text-gray-300 mt-1">
                Character: <span className="font-semibold">{character.name}</span>
                {character.title && <span className="text-purple-400"> ({character.title})</span>}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Kusala Ratio</div>
            <div className="text-2xl font-bold text-green-400">
              {(profile.summary.kusalaRatio * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Akusala Ratio</div>
            <div className="text-2xl font-bold text-red-400">
              {(profile.summary.akusalaRatio * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Mental Balance</div>
            <div
              className={`text-2xl font-bold ${profile.summary.mentalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {profile.summary.mentalBalance > 0 ? '+' : ''}
              {profile.summary.mentalBalance}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Consciousness</div>
            <div className="text-2xl font-bold text-blue-400">{profile.summary.consciousness}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800/30">
        {[
          { id: 'summary', label: '📊 Summary', icon: '📊' },
          { id: 'universal', label: '🌐 Universal (13)', icon: '🌐' },
          { id: 'wholesome', label: '✨ Wholesome (25)', icon: '✨' },
          { id: 'unwholesome', label: '☠️ Unwholesome (14)', icon: '☠️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600/30 text-white border-b-2 border-purple-400'
                : 'text-gray-400 hover:bg-gray-700/30'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-lg font-bold text-purple-300 mb-2">📝 Profile Description</h3>
              <p className="text-gray-300 leading-relaxed">{description}</p>
            </div>

            {/* Top 5 Factors */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-blue-300 mb-3">🔝 Top 5 Dominant Factors</h3>
              <div className="space-y-3">
                {top5Factors.map((factor: { name: string; value: number; category: string }, idx: number) => (
                  <div key={factor.name} className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-500">#{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">
                          {CETASIKA_NAMES[factor.name]?.en || factor.name}
                        </span>
                        <span className={`font-bold ${getColorClass(factor.value)}`}>
                          {factor.value.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getBarColor(factor.value)}`}
                          style={{ width: `${factor.value}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {CETASIKA_NAMES[factor.name]?.th || factor.name} •{' '}
                        <span className="capitalize">{factor.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm text-blue-300 mb-2">Universal (อัญญสมานา)</div>
                <div className="text-3xl font-bold text-blue-400">13 factors</div>
                <div className="text-xs text-gray-400 mt-1">Present in all consciousness</div>
              </div>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm text-green-300 mb-2">Wholesome (โสภนะ)</div>
                <div className="text-3xl font-bold text-green-400">25 factors</div>
                <div className="text-xs text-gray-400 mt-1">Beautiful mental states</div>
              </div>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="text-sm text-red-300 mb-2">Unwholesome (อกุสล)</div>
                <div className="text-3xl font-bold text-red-400">14 factors</div>
                <div className="text-xs text-gray-400 mt-1">Defilement states</div>
              </div>
            </div>
          </div>
        )}

        {/* UNIVERSAL TAB */}
        {activeTab === 'universal' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-4">
              อัญญสมานาเจตสิก - Mental factors present in all consciousness states
            </div>
            {Object.entries(profile.aññasamana).map(([name, value]) => (
              <CetasikaFactorRow key={name} name={name} value={value} />
            ))}
          </div>
        )}

        {/* WHOLESOME TAB */}
        {activeTab === 'wholesome' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-4">
              โสภนะเจตสิก - Beautiful/wholesome mental factors (Kusala)
            </div>
            {Object.entries(profile.sobhana).map(([name, value]) => (
              <CetasikaFactorRow key={name} name={name} value={value} category="wholesome" />
            ))}
          </div>
        )}

        {/* UNWHOLESOME TAB */}
        {activeTab === 'unwholesome' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-4">
              อกุสลเจตสิก - Unwholesome mental factors (Defilements)
            </div>
            {Object.entries(profile.akusala).map(([name, value]) => (
              <CetasikaFactorRow key={name} name={name} value={value} category="unwholesome" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Component: Individual Factor Row
const CetasikaFactorRow: React.FC<{
  name: string;
  value: number;
  category?: 'wholesome' | 'unwholesome';
}> = ({ name, value, category }) => {
  const level = getCetasikaLevel(value);
  const cetasikaInfo = CETASIKA_NAMES[name] || { en: name, th: name, pali: name };

  const getColorClass = (val: number) => {
    if (category === 'unwholesome') {
      // For unwholesome, higher is worse (red)
      if (val >= 80) return 'text-red-400';
      if (val >= 60) return 'text-orange-400';
      if (val >= 40) return 'text-yellow-400';
      return 'text-green-400';
    } else {
      // For wholesome/universal, higher is better (green)
      if (val >= 80) return 'text-green-400';
      if (val >= 60) return 'text-blue-400';
      if (val >= 40) return 'text-yellow-400';
      return 'text-orange-400';
    }
  };

  const getBarColor = (val: number) => {
    if (category === 'unwholesome') {
      if (val >= 80) return 'bg-red-500';
      if (val >= 60) return 'bg-orange-500';
      if (val >= 40) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (val >= 80) return 'bg-green-500';
      if (val >= 60) return 'bg-blue-500';
      if (val >= 40) return 'bg-yellow-500';
      return 'bg-orange-500';
    }
  };

  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-white">{cetasikaInfo.en}</div>
          <div className="text-xs text-gray-400">{cetasikaInfo.th}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${getColorClass(value)}`}>{value.toFixed(0)}</div>
          <div className="text-xs text-gray-500 capitalize">{level}</div>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export default CetasikaViewer;
