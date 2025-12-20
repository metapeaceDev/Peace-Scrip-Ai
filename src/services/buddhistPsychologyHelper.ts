/**
 * Buddhist Psychology Helper Functions
 * Utilities for Anusaya, Carita, and Buddhist analysis
 */

import type { Character, AnusayaProfile, CaritaType } from '../types';

/**
 * Initialize Anusaya from existing defilement values
 * Maps defilement scores to anusaya (latent tendencies)
 */
export function initializeAnusayaFromDefilement(character: Character): AnusayaProfile {
  const defilement = character.internal?.defilement || {};

  return {
    kama_raga: (defilement['โลภะ (Greed)'] || 0) * 0.8,
    patigha: (defilement['โทสะ (Anger)'] || 0) * 0.8,
    mana: (defilement['มานะ (Pride)'] || 0) * 0.9,
    ditthi: (defilement['ทิฏฐิ (Wrong view)'] || 0) * 0.9,
    vicikiccha: (defilement['วิจิกิจฉา (Doubt)'] || 0) * 0.9,
    bhava_raga: (defilement['อุทธัจจะ (Restlessness)'] || 0) * 0.7,
    avijja: (defilement['โมหะ (Delusion)'] || 0) * 0.9,
  };
}

/**
 * Determine Carita (temperament) from consciousness/defilement profile
 */
export function determineCaritaFromProfile(character: Character): {
  primary: CaritaType;
  secondary?: CaritaType;
} {
  const consciousness = character.internal?.consciousness || {};
  const defilement = character.internal?.defilement || {};

  const scores = {
    ราคจริต: (defilement['โลภะ (Greed)'] || 0) + (defilement['กิเลส (Lust)'] || 0) * 1.5,
    โทสจริต: (defilement['โทสะ (Anger)'] || 0) + (defilement['อิสสา (Jealousy)'] || 0) * 1.2,
    โมหจริต: (defilement['โมหะ (Delusion)'] || 0) + (defilement['ถีนมิทธะ (Sloth)'] || 0),
    สัทธาจริต: (consciousness['ศรัทธา (Faith)'] || 0) + (consciousness['เมตตา (Compassion)'] || 0),
    พุทธิจริต:
      (consciousness['ปัญญา (Wisdom)'] || 0) + (consciousness['สติ (Mindfulness)'] || 0) * 1.2,
    วิตกจริต: (defilement['วิจิกิจฉา (Doubt)'] || 0) + (defilement['อุทธัจจะ (Restlessness)'] || 0),
  };

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a) as [CaritaType, number][];

  return {
    primary: sorted[0][0],
    secondary: sorted[1][1] > sorted[0][1] * 0.6 ? sorted[1][0] : undefined,
  };
}

/**
 * Ensure character has buddhist_psychology field
 */
export function ensureBuddhistPsychology(character: Character): Character {
  if (character.buddhist_psychology) {
    return character;
  }

  const anusaya = initializeAnusayaFromDefilement(character);
  const { primary, secondary } = determineCaritaFromProfile(character);

  return {
    ...character,
    buddhist_psychology: {
      anusaya,
      carita: primary,
      carita_secondary: secondary,
    },
  };
}

/**
 * Get recommended meditation practice based on Carita
 */
export function getRecommendedMeditation(carita: CaritaType): {
  practice: string;
  description: string;
  pali: string;
} {
  const recommendations: Record<
    CaritaType,
    { practice: string; description: string; pali: string }
  > = {
    ราคจริต: {
      practice: 'อสุภกรรมฐาน',
      description: 'พิจารณาความไม่งามของร่างกาย เพื่อลดความยินดีในกาม',
      pali: 'Asubha Kammatthana',
    },
    โทสจริต: {
      practice: 'เมตตากรรมฐาน',
      description: 'เจริญเมตตาต่อสรรพสัตว์ เพื่อลดความโกรธ',
      pali: 'Metta Kammatthana',
    },
    โมหจริต: {
      practice: 'ปฏิจจสมุปบาทกรรมฐาน',
      description: 'พิจารณาเหตุปัจจัยของสิ่งทั้งปวง เพื่อเห็นความจริง',
      pali: 'Paticcasamuppada Kammatthana',
    },
    สัทธาจริต: {
      practice: 'พุทธานุสติกรรมฐาน',
      description: 'ระลึกถึงพระคุณของพระพุทธเจ้า เพื่อเพิ่มศรัทธา',
      pali: 'Buddhanussati Kammatthana',
    },
    พุทธิจริต: {
      practice: 'มรณานุสติกรรมฐาน',
      description: 'พิจารณาความตาย เพื่อพัฒนาปัญญา',
      pali: 'Maranassati Kammatthana',
    },
    วิตกจริต: {
      practice: 'อานาปานสติกรรมฐาน',
      description: 'สติกำหนดลมหายใจ เพื่อสงบความฟุ้งซ่าน',
      pali: 'Anapanasati Kammatthana',
    },
  };

  return recommendations[carita];
}

/**
 * Get Anusaya strength level
 */
export function getAnusayaStrength(anusaya: AnusayaProfile): {
  level: 'low' | 'moderate' | 'high' | 'extreme';
  average: number;
  strongest: keyof AnusayaProfile;
} {
  const values = Object.values(anusaya) as number[];
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;

  const entries = Object.entries(anusaya) as [keyof AnusayaProfile, number][];
  const strongest = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0];

  const level =
    average < 25 ? 'low' : average < 50 ? 'moderate' : average < 75 ? 'high' : 'extreme';

  return { level, average, strongest };
}

/**
 * Format Anusaya for display
 */
export function formatAnusayaForDisplay(anusaya: AnusayaProfile): Array<{
  name: string;
  value: number;
  thai: string;
  pali: string;
}> {
  return [
    { name: 'kama_raga', value: anusaya.kama_raga, thai: 'กามราคานุสัย', pali: 'Kama-raga' },
    { name: 'patigha', value: anusaya.patigha, thai: 'ปฏิฆานุสัย', pali: 'Patigha' },
    { name: 'mana', value: anusaya.mana, thai: 'มานานุสัย', pali: 'Mana' },
    { name: 'ditthi', value: anusaya.ditthi, thai: 'ทิฏฐานุสัย', pali: 'Ditthi' },
    { name: 'vicikiccha', value: anusaya.vicikiccha, thai: 'วิจิกิจฉานุสัย', pali: 'Vicikiccha' },
    { name: 'bhava_raga', value: anusaya.bhava_raga, thai: 'ภวราคานุสัย', pali: 'Bhava-raga' },
    { name: 'avijja', value: anusaya.avijja, thai: 'อวิชชานุสัย', pali: 'Avijja' },
  ];
}

/**
 * Get Carita display info
 */
export function getCaritaDisplayInfo(carita: CaritaType): {
  emoji: string;
  color: string;
  description: string;
  pali: string;
} {
  const info: Record<
    CaritaType,
    { emoji: string; color: string; description: string; pali: string }
  > = {
    ราคจริต: {
      emoji: '💰',
      color: 'text-yellow-400',
      description: 'มีแนวโน้มติดยินดีในกาม ความสุขทางประสาทสัมผัส',
      pali: 'Raga-carita',
    },
    โทสจริต: {
      emoji: '🔥',
      color: 'text-red-400',
      description: 'มีแนวโน้มโกรธง่าย หงุดหงิด ไม่พอใจ',
      pali: 'Dosa-carita',
    },
    โมหจริต: {
      emoji: '🌀',
      color: 'text-gray-400',
      description: 'มีแนวโน้มหลงงมงาย ไม่เข้าใจความจริง',
      pali: 'Moha-carita',
    },
    สัทธาจริต: {
      emoji: '🙏',
      color: 'text-blue-400',
      description: 'มีศรัทธา เชื่อมั่น มีจิตใจดี',
      pali: 'Saddha-carita',
    },
    พุทธิจริต: {
      emoji: '🧠',
      color: 'text-purple-400',
      description: 'มีปัญญา ใคร่ครวญ รอบคอบ',
      pali: 'Buddhi-carita',
    },
    วิตกจริต: {
      emoji: '💭',
      color: 'text-cyan-400',
      description: 'มีความคิดมาก ใช้เหตุผล วิเคราะห์',
      pali: 'Vitakka-carita',
    },
  };

  return info[carita];
}

/**
 * Get intensity color and label
 */
export function getIntensityDisplay(intensity: 'mild' | 'moderate' | 'severe' | 'extreme'): {
  label: string;
  color: string;
  emoji: string;
  multiplier: number;
} {
  const display = {
    mild: {
      label: 'เล็กน้อย',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      emoji: '○',
      multiplier: 1,
    },
    moderate: {
      label: 'ปานกลาง',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      emoji: '◐',
      multiplier: 2,
    },
    severe: {
      label: 'รุนแรง',
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      emoji: '◕',
      multiplier: 4,
    },
    extreme: {
      label: 'สูงสุด',
      color: 'bg-red-500/20 text-red-400 border-red-500/50',
      emoji: '●',
      multiplier: 8,
    },
  };

  return display[intensity];
}

