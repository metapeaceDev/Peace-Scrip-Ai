/**
 * Buddhist Psychology Helper Functions
 * Provides utilities for Anusaya, Carita, and character initialization
 */

import type { Character, AnusayaProfile, CaritaType } from '../../types';

/**
 * Initialize default Anusaya profile based on character's existing defilement
 */
export function initializeAnusayaFromDefilement(character: Character): AnusayaProfile {
  const defilement = character.internal.defilement;

  // Map defilements to Anusaya (latent tendencies)
  const anusaya: AnusayaProfile = {
    kama_raga: defilement['Lobha (Greed)'] || 50, // Sensual desire
    patigha: defilement['Anger (Anger)'] || 50, // Aversion
    mana: defilement['Mana (arrogance)'] || 50, // Pride
    ditthi: defilement['Titthi (obsession)'] || 50, // Wrong view
    vicikiccha: defilement['Vicikiccha (doubt)'] || 50, // Doubt
    bhava_raga: (defilement['Lobha (Greed)'] || 50) * 0.8, // Craving for existence
    avijja: defilement['Moha (delusion)'] || 60, // Ignorance (usually high)
  };

  return anusaya;
}

/**
 * Determine character's dominant Carita (temperament) from their profile
 */
export function determineCaritaFromProfile(character: Character): {
  primary: CaritaType;
  secondary?: CaritaType;
} {
  const { consciousness, defilement } = character.internal;

  const scores = {
    ราคจริต: (defilement['Lobha (Greed)'] || 0) + (defilement['Titthi (obsession)'] || 0) * 0.5,
    โทสจริต:
      (defilement['Anger (Anger)'] || 0) +
      (defilement['Amodtappa (fearlessness of sin)'] || 0) * 0.5,
    โมหจริต: (defilement['Moha (delusion)'] || 0) + (defilement['Vicikiccha (doubt)'] || 0) * 0.5,
    สัทธาจริต:
      (consciousness['Faith (Belief in the right)'] || 0) +
      (consciousness['Hiri (Shame of sin)'] || 0) * 0.5,
    พุทธิจริต:
      (consciousness['Wisdom (right view)'] || 0) +
      (consciousness['Mindfulness (remembrance)'] || 0) * 0.5,
    วิตกจริต:
      (defilement['Uthachcha (distraction)'] || 0) + (defilement['Vicikiccha (doubt)'] || 0) * 0.3,
  };

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);

  return {
    primary: sorted[0][0] as CaritaType,
    secondary: sorted[1] && sorted[1][1] > 40 ? (sorted[1][0] as CaritaType) : undefined,
  };
}

/**
 * Ensure character has Buddhist Psychology profile
 * Auto-initialize if not exists
 */
export function ensureBuddhistPsychology(character: Character): Character {
  if (character.buddhist_psychology) {
    return character;
  }

  const anusaya = initializeAnusayaFromDefilement(character);
  const caritaInfo = determineCaritaFromProfile(character);

  return {
    ...character,
    buddhist_psychology: {
      anusaya,
      carita: caritaInfo.primary,
      carita_secondary: caritaInfo.secondary,
    },
  };
}

/**
 * Get recommended meditation practice based on Carita
 */
export function getRecommendedMeditation(carita: CaritaType): string[] {
  const recommendations: Record<CaritaType, string[]> = {
    ราคจริต: ['อสุภกรรมฐาน (Contemplation of unattractiveness)', 'กายคตาสติ (Body contemplation)'],
    โทสจริต: [
      'เมตตาภาวนา (Loving-kindness)',
      'พรหมวิหาร 4 (4 Divine Abodes)',
      'กสิณสี (Color kasina)',
    ],
    โมหจริต: ['อานาปานสติ (Breath meditation)', 'จตุธาตุววัฏฐาน (4 Elements analysis)'],
    สัทธาจริต: ['พุทธานุสสติ (Recollection of Buddha)', 'อนุสสติ 6'],
    พุทธิจริต: ['มรณสติ (Death contemplation)', 'อาหาเรปฏิกูลสัญญา (Food repulsiveness)'],
    วิตกจริต: ['อานาปานสติ (Breath to calm thoughts)', 'กสิณ (Kasina for focus)'],
  };

  return recommendations[carita] || ['อานาปานสติ (Universal practice)'];
}

/**
 * Calculate how strong a character's latent tendencies are
 */
export function getAnusayaStrength(anusaya: AnusayaProfile): {
  overall: 'low' | 'moderate' | 'high' | 'extreme';
  dominant: string;
  weakest: string;
} {
  const entries = Object.entries(anusaya);
  const average = entries.reduce((sum, [, val]) => sum + val, 0) / entries.length;

  const sorted = entries.sort(([, a], [, b]) => b - a);

  let overall: 'low' | 'moderate' | 'high' | 'extreme';
  if (average < 30) overall = 'low';
  else if (average < 50) overall = 'moderate';
  else if (average < 70) overall = 'high';
  else overall = 'extreme';

  return {
    overall,
    dominant: sorted[0][0],
    weakest: sorted[sorted.length - 1][0],
  };
}

/**
 * Format Anusaya for display
 */
export function formatAnusayaForDisplay(anusaya: AnusayaProfile): string {
  const labels: Record<keyof AnusayaProfile, string> = {
    kama_raga: 'กามราคะ (Sensual desire)',
    patigha: 'ปฏิฆะ (Aversion)',
    mana: 'มานะ (Conceit)',
    ditthi: 'ทิฏฐิ (Wrong view)',
    vicikiccha: 'วิจิกิจฉา (Doubt)',
    bhava_raga: 'ภวราคะ (Existence craving)',
    avijja: 'อวิชชา (Ignorance)',
  };

  return Object.entries(anusaya)
    .map(([key, value]) => `${labels[key as keyof AnusayaProfile]}: ${value.toFixed(1)}`)
    .join('\n');
}
