/**
 * Character Comparison Tool
 * Side-by-side comparison of multiple characters' psychology profiles
 * Useful for testing and understanding character differences
 */

import React from 'react';
import type { Character } from '../../types';
import { calculatePsychologyProfile, calculateReaction } from '../services/psychologyCalculator';

interface CharacterComparisonProps {
  characters: Character[];
  onClose: () => void;
}

export const CharacterComparison: React.FC<CharacterComparisonProps> = ({ characters, onClose }) => {
  const testEvent = {
    description: 'มีคนดุด่าและดูถูกคุณต่อหน้าคนอื่น',
    intensity: 7
  };

  const profiles = characters.map(char => ({
    character: char,
    profile: calculatePsychologyProfile(char),
    reaction: calculateReaction(char, testEvent.description, testEvent.intensity)
  }));

  // Sort by Mental Balance
  profiles.sort((a, b) => b.profile.mentalBalance - a.profile.mentalBalance);

  const getBalanceColor = (balance: number) => {
    if (balance > 30) return 'from-green-500 to-emerald-600';
    if (balance > 0) return 'from-green-400 to-cyan-500';
    if (balance > -30) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-600';
  };

  const getReactionBadge = (type: string) => {
    switch (type) {
      case 'wholesome':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/50">✨ WHOLESOME</span>;
      case 'unwholesome':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded border border-red-500/50">⚠️ UNWHOLESOME</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded border border-yellow-500/50">🤔 NEUTRAL</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border-2 border-cyan-500/50 rounded-2xl max-w-7xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-wide">
                🔬 Character Comparison Lab
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                เปรียบเทียบ {characters.length} ตัวละคร - เรียงตาม Mental Balance
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Test Event Info */}
        <div className="p-4 bg-purple-500/10 border-b border-purple-500/30">
          <div className="text-xs uppercase tracking-wider text-purple-400 mb-1">Test Event</div>
          <div className="text-sm text-white">"{testEvent.description}" (Intensity: {testEvent.intensity}/10)</div>
        </div>

        {/* Comparison Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map(({ character, profile, reaction }, index) => (
              <div
                key={character.id}
                className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden hover:border-cyan-500/50 transition-all"
              >
                {/* Rank Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Character Header */}
                <div className={`bg-gradient-to-r ${getBalanceColor(profile.mentalBalance)} p-4 relative`}>
                  <div className="text-lg font-black text-white mb-1 pr-10">
                    {character.name}
                  </div>
                  <div className="text-xs text-white/80">
                    {character.role || 'Unknown Role'}
                  </div>
                </div>

                {/* Profile Image */}
                {character.image && (
                  <div className="relative h-32 bg-gray-900 overflow-hidden">
                    <img 
                      src={character.image} 
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Stats */}
                <div className="p-4 space-y-3">
                  {/* Mental Balance */}
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Mental Balance</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getBalanceColor(profile.mentalBalance)} transition-all`}
                          style={{ width: `${Math.abs(profile.mentalBalance)}%` }}
                        />
                      </div>
                      <span className={`font-black text-sm w-12 text-right ${
                        profile.mentalBalance > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {profile.mentalBalance > 0 ? '+' : ''}{profile.mentalBalance.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Consciousness vs Defilement */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-cyan-500/10 rounded p-2 border border-cyan-500/30">
                      <div className="text-[10px] text-cyan-400 uppercase mb-1">Consciousness</div>
                      <div className="text-lg font-black text-cyan-300">{profile.consciousnessScore.toFixed(0)}</div>
                    </div>
                    <div className="bg-red-500/10 rounded p-2 border border-red-500/30">
                      <div className="text-[10px] text-red-400 uppercase mb-1">Defilement</div>
                      <div className="text-lg font-black text-red-300">{profile.defilementScore.toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Dominant Emotion */}
                  <div className="bg-gray-900/50 rounded p-2">
                    <div className="text-[10px] text-gray-400 uppercase mb-1">Dominant Emotion</div>
                    <div className="text-sm font-bold text-white">{profile.dominantEmotion}</div>
                  </div>

                  {/* Reaction */}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-[10px] text-gray-400 uppercase mb-2">Reaction to Test Event</div>
                    <div className="mb-2">
                      {getReactionBadge(reaction.reactionType)}
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="font-bold text-cyan-400">{reaction.emotionalTone}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                      "{reaction.reasoning.slice(0, 80)}..."
                    </div>
                  </div>

                  {/* Strongest Virtue/Defilement */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-500/5 rounded p-2 border border-green-500/20">
                      <div className="text-[9px] text-green-400 uppercase mb-1">Virtue</div>
                      <div className="text-green-300 font-bold truncate">
                        {profile.strongestVirtue.split('(')[0].trim()}
                      </div>
                    </div>
                    <div className="bg-red-500/5 rounded p-2 border border-red-500/20">
                      <div className="text-[9px] text-red-400 uppercase mb-1">Weakness</div>
                      <div className="text-red-300 font-bold truncate">
                        {profile.strongestDefilement.split('(')[0].trim()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wide">
              📊 Summary Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 uppercase mb-1">Total Characters</div>
                <div className="text-2xl font-black text-white">{characters.length}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                <div className="text-xs text-green-400 uppercase mb-1">Virtuous</div>
                <div className="text-2xl font-black text-green-300">
                  {profiles.filter(p => p.profile.mentalBalance > 0).length}
                </div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                <div className="text-xs text-red-400 uppercase mb-1">Troubled</div>
                <div className="text-2xl font-black text-red-300">
                  {profiles.filter(p => p.profile.mentalBalance < 0).length}
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                <div className="text-xs text-yellow-400 uppercase mb-1">Neutral</div>
                <div className="text-2xl font-black text-yellow-300">
                  {profiles.filter(p => Math.abs(p.profile.mentalBalance) < 10).length}
                </div>
              </div>
            </div>

            {/* Balance Range */}
            <div className="mt-4 bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 uppercase mb-2">Mental Balance Range</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-300 mb-1">
                    <span className="text-red-400 font-bold">
                      Lowest: {Math.min(...profiles.map(p => p.profile.mentalBalance)).toFixed(0)}
                    </span>
                    <span className="text-green-400 font-bold">
                      Highest: {Math.max(...profiles.map(p => p.profile.mentalBalance)).toFixed(0)}
                    </span>
                  </div>
                  <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Insights */}
          <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-cyan-400 mb-2">💡 Testing Insights</div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• ตัวละครที่มี Mental Balance ต่างกัน 50+ คะแนน ควรแสดงพฤติกรรมแตกต่างชัดเจน</p>
              <p>• ตัวละคร Virtuous (สีเขียว) มักมี Wholesome Reactions</p>
              <p>• ตัวละคร Troubled (สีแดง) มักมี Unwholesome Reactions</p>
              <p>• ใช้เครื่องมือนี้เพื่อหา Character Diversity ในเรื่องของคุณ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterComparison;
