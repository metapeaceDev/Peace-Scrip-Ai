/**
 * Bhumi Indicator Component
 * Shows current plane of existence (Bhumi) with environmental effects
 * Based on Digital Mind Model v14 - 31 Realms
 */

import React from 'react';
import type { Character } from '../../types';
import { getBhumiById } from '../data/bhumiData';

interface BhumiIndicatorProps {
  character: Character;
  showDetails?: boolean;
}

export const BhumiIndicator: React.FC<BhumiIndicatorProps> = ({
  character,
  showDetails = true,
}) => {
  const mindState = character.mind_state;

  if (!mindState || !mindState.current_bhumi) {
    // Default to Manussa Bhumi (Human realm)
    const humanBhumi = getBhumiById(5);
    if (!humanBhumi) return null;

    return (
      <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌍</span>
          <div>
            <div className="font-semibold text-gray-800">{humanBhumi.name}</div>
            <div className="text-xs text-gray-600">{humanBhumi.pali_name}</div>
          </div>
        </div>
      </div>
    );
  }

  const bhumi = getBhumiById(mindState.current_bhumi);

  if (!bhumi) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">ไม่พบข้อมูลภูมิ</p>
      </div>
    );
  }

  /**
   * Get icon and gradient based on Bhumi type
   */
  const getBhumiStyle = () => {
    switch (bhumi.type) {
      case 'อบายภูมิ':
        return {
          icon: '🔥',
          gradient: 'from-red-100 to-orange-100',
          border: 'border-red-300',
          badge: 'bg-red-500 text-white',
        };
      case 'กามสุคติภูมิ':
        return {
          icon: bhumi.id === 5 ? '🌍' : '☁️',
          gradient: 'from-blue-50 to-purple-50',
          border: 'border-blue-300',
          badge: 'bg-blue-500 text-white',
        };
      case 'รูปภูมิ':
        return {
          icon: '✨',
          gradient: 'from-purple-50 to-pink-50',
          border: 'border-purple-300',
          badge: 'bg-purple-500 text-white',
        };
      case 'อรูปภูมิ':
        return {
          icon: '🌌',
          gradient: 'from-indigo-50 to-blue-50',
          border: 'border-indigo-300',
          badge: 'bg-indigo-500 text-white',
        };
      default:
        return {
          icon: '❓',
          gradient: 'from-gray-50 to-gray-100',
          border: 'border-gray-300',
          badge: 'bg-gray-500 text-white',
        };
    }
  };

  const style = getBhumiStyle();

  if (!showDetails) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${style.gradient} border ${style.border}`}
      >
        <span className="text-2xl">{style.icon}</span>
        <span className="font-medium text-gray-800">{bhumi.name}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${style.badge}`}>#{bhumi.id}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-6 bg-gradient-to-br ${style.gradient} rounded-xl border-2 ${style.border} shadow-sm`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{style.icon}</span>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{bhumi.name}</h3>
            <p className="text-sm text-gray-600">{bhumi.pali_name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.badge}`}>
          ภูมิ #{bhumi.id}/31
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">{bhumi.description}</p>

      {/* Environmental Rules */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">กฎแห่งภูมิ (Environmental Rules):</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/60 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">การสร้างกรรม</div>
            <div className="font-semibold text-gray-800">
              ×{bhumi.environmental_rules.kamma_creation_multiplier.toFixed(1)}
            </div>
          </div>

          <div className="p-3 bg-white/60 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">พัฒนาบารมี</div>
            <div className="font-semibold text-gray-800">
              {bhumi.environmental_rules.parami_development_possible ? '✅ ได้' : '❌ ไม่ได้'}
            </div>
          </div>

          <div className="p-3 bg-white/60 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">โน้มน้าว</div>
            <div className="font-semibold text-gray-800">
              {bhumi.environmental_rules.kusala_tendency > 0
                ? `กุศล +${bhumi.environmental_rules.kusala_tendency}`
                : `อกุศล ${bhumi.environmental_rules.kusala_tendency}`}
            </div>
          </div>

          <div className="p-3 bg-white/60 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">ระดับสติ</div>
            <div className="font-semibold text-gray-800">
              {bhumi.environmental_rules.sati_default_level}/100
            </div>
          </div>
        </div>

        {/* Dominant Feeling */}
        <div className="p-3 bg-white/60 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">เวทนาเด่น (Dominant Feeling)</div>
          <div className="font-semibold text-gray-800">
            {getVedanaDisplay(bhumi.environmental_rules.dominant_feeling)}
          </div>
        </div>

        {/* Escape Difficulty */}
        <div className="p-3 bg-white/60 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">ความยากในการพ้นภูมิ</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                style={{ width: `${bhumi.environmental_rules.escape_difficulty}%` }}
              ></div>
            </div>
            <span className="font-semibold text-gray-800 text-sm">
              {bhumi.environmental_rules.escape_difficulty}/100
            </span>
          </div>
        </div>
      </div>

      {/* Lifespan */}
      <div className="mt-4 pt-4 border-t border-gray-300/50">
        <div className="text-xs text-gray-600 mb-1">อายุขัยโดยประมาณ</div>
        <div className="font-semibold text-gray-800">
          {bhumi.lifespan.value} {bhumi.lifespan.unit}
          {bhumi.lifespan.in_human_years && (
            <span className="text-sm text-gray-600 ml-2">(≈ {bhumi.lifespan.in_human_years})</span>
          )}
        </div>
      </div>

      {/* Notable Beings */}
      {bhumi.notable_beings && bhumi.notable_beings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-300/50">
          <div className="text-xs text-gray-600 mb-2">ผู้สถิตในภูมินี้</div>
          <div className="flex flex-wrap gap-2">
            {bhumi.notable_beings.map((being, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/60 rounded text-xs font-medium text-gray-700"
              >
                {being}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get Thai display for Vedana type
 */
function getVedanaDisplay(vedana: string): string {
  const vedanaMap: Record<string, string> = {
    sukha: '🟢 สุข (Sukha - Bodily pleasure)',
    dukkha: '🔴 ทุกข์ (Dukkha - Bodily pain)',
    somanassa: '💚 โสมนัส (Somanassa - Mental pleasure)',
    domanassa: '💔 โทมนัส (Domanassa - Mental pain)',
    upekkha: '⚪ อุเบกขา (Upekkhā - Neutral)',
  };

  return vedanaMap[vedana] || vedana;
}

export default BhumiIndicator;
