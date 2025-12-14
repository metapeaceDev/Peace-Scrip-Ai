/**
 * Parami System Extensions
 * Implements Parami_Updater and Synergy Matrix
 * Based on DigitalMindModel v14 - Complete Buddhist Psychology
 */

import type { Character, ParamiPortfolio, AnusayaProfile } from '../../types';

// ========================================================================
// PARAMI SYNERGY MATRIX
// ========================================================================

/**
 * Defines how Paramis support and boost each other
 * Example: Dana (giving) is enhanced by Khanti (patience) and Adhitthana (determination)
 */
export const PARAMI_SYNERGY_MATRIX: Record<
  keyof ParamiPortfolio,
  {
    supporting_paramis: Array<keyof ParamiPortfolio>;
    boost_formula: string;
    explanation: string;
  }
> = {
  dana: {
    supporting_paramis: ['khanti', 'adhitthana', 'metta'],
    boost_formula: '0.1 * (khanti.level + adhitthana.level + metta.level)',
    explanation:
      'Giving (Dana) is strengthened by patience (Khanti) to let go, determination (Adhitthana) to actually give, and loving-kindness (Metta) as motivation.',
  },
  sila: {
    supporting_paramis: ['viriya', 'sacca', 'khanti'],
    boost_formula: '0.1 * (viriya.level + sacca.level + khanti.level)',
    explanation:
      'Moral conduct (Sila) requires energy (Viriya) to maintain, truthfulness (Sacca) in action, and patience (Khanti) against temptation.',
  },
  nekkhamma: {
    supporting_paramis: ['panna', 'upekkha', 'adhitthana'],
    boost_formula: '0.15 * (panna.level + upekkha.level + adhitthana.level)',
    explanation:
      'Renunciation (Nekkhamma) needs wisdom (Panna) to see the drawbacks, equanimity (Upekkha) to let go, and determination (Adhitthana) to persist.',
  },
  viriya: {
    supporting_paramis: ['adhitthana', 'sacca', 'panna'],
    boost_formula: '0.1 * (adhitthana.level + sacca.level + panna.level)',
    explanation:
      'Energy (Viriya) is sustained by determination (Adhitthana), truthfulness (Sacca), and wisdom (Panna) to direct effort correctly.',
  },
  khanti: {
    supporting_paramis: ['metta', 'upekkha', 'panna'],
    boost_formula: '0.12 * (metta.level + upekkha.level + panna.level)',
    explanation:
      'Patience (Khanti) is supported by loving-kindness (Metta) to endure others, equanimity (Upekkha) to remain balanced, and wisdom (Panna) to understand suffering.',
  },
  sacca: {
    supporting_paramis: ['sila', 'adhitthana', 'panna'],
    boost_formula: '0.1 * (sila.level + adhitthana.level + panna.level)',
    explanation:
      'Truthfulness (Sacca) is upheld by moral conduct (Sila), determination (Adhitthana) to speak truth, and wisdom (Panna) to discern truth.',
  },
  adhitthana: {
    supporting_paramis: ['viriya', 'sacca', 'panna'],
    boost_formula: '0.1 * (viriya.level + sacca.level + panna.level)',
    explanation:
      'Determination (Adhitthana) is reinforced by energy (Viriya) to act, truthfulness (Sacca) to commitments, and wisdom (Panna) for right resolve.',
  },
  metta: {
    supporting_paramis: ['khanti', 'upekkha', 'panna'],
    boost_formula: '0.1 * (khanti.level + upekkha.level + panna.level)',
    explanation:
      'Loving-kindness (Metta) works with patience (Khanti), equanimity (Upekkha) for balance, and wisdom (Panna).',
  },
  upekkha: {
    supporting_paramis: ['panna', 'metta', 'khanti'],
    boost_formula: '0.12 * (panna.level + metta.level + khanti.level)',
    explanation:
      'Equanimity (Upekkha) is deepened by wisdom (Panna) to see impermanence, loving-kindness (Metta) without attachment, and patience (Khanti).',
  },
  panna: {
    supporting_paramis: ['nekkhamma', 'adhitthana', 'viriya'],
    boost_formula: '0.15 * (nekkhamma.level + adhitthana.level + viriya.level)',
    explanation:
      'Wisdom (Panna) is cultivated through renunciation (Nekkhamma), determination (Adhitthana), and sustained energy (Viriya) in practice.',
  },
};

/**
 * Maps each Parami to the Kilesa/Anusaya it directly counters
 */
export const PARAMI_KILESA_COUNTER_MAP: Record<
  keyof ParamiPortfolio,
  {
    primary_kilesa: keyof AnusayaProfile;
    secondary_kilesas: Array<keyof AnusayaProfile>;
    mechanism: string;
  }
> = {
  dana: {
    primary_kilesa: 'kama_raga',
    secondary_kilesas: ['kama_raga'], // Greed/attachment
    mechanism: 'Giving directly opposes attachment and greed by cultivating generosity.',
  },
  sila: {
    primary_kilesa: 'kama_raga', // Transgression stems from desire
    secondary_kilesas: ['kama_raga', 'patigha'],
    mechanism: 'Moral conduct prevents coarse defilements from manifesting in action.',
  },
  nekkhamma: {
    primary_kilesa: 'kama_raga',
    secondary_kilesas: ['bhava_raga'],
    mechanism: 'Renunciation directly cuts sensual and existence craving.',
  },
  viriya: {
    primary_kilesa: 'avijja', // Sloth comes from ignorance
    secondary_kilesas: ['avijja'],
    mechanism: 'Energy overcomes laziness and maintains awareness against delusion.',
  },
  khanti: {
    primary_kilesa: 'patigha',
    secondary_kilesas: ['patigha'], // Hatred/aversion
    mechanism: 'Patience directly counters aversion, hatred, and ill-will.',
  },
  sacca: {
    primary_kilesa: 'vicikiccha', // Lying relates to doubt/uncertainty
    secondary_kilesas: ['vicikiccha'],
    mechanism: 'Truthfulness opposes deception and builds confidence, reducing doubt.',
  },
  adhitthana: {
    primary_kilesa: 'vicikiccha',
    secondary_kilesas: ['vicikiccha'], // Doubt/wavering
    mechanism: 'Determination overcomes doubt and wavering, strengthening resolve.',
  },
  metta: {
    primary_kilesa: 'patigha',
    secondary_kilesas: ['patigha'], // Ill-will
    mechanism: 'Loving-kindness directly opposes ill-will and enmity.',
  },
  upekkha: {
    primary_kilesa: 'patigha',
    secondary_kilesas: ['kama_raga'],
    mechanism: 'Equanimity balances both attraction (raga) and aversion (patigha).',
  },
  panna: {
    primary_kilesa: 'avijja',
    secondary_kilesas: ['avijja', 'ditthi'],
    mechanism: 'Wisdom directly eradicates ignorance, delusion, and wrong view.',
  },
};

/**
 * Defines the 3 levels of Parami intensity
 */
export type ParamiLevel = 'parami' | 'upaparami' | 'paramatthaparami';

export interface ParamiLevelRequirement {
  level: ParamiLevel;
  sacrifice_type: 'material' | 'body_part' | 'life';
  description: string;
  exp_multiplier: number;
}

export const PARAMI_LEVEL_REQUIREMENTS: Record<ParamiLevel, ParamiLevelRequirement> = {
  parami: {
    level: 'parami',
    sacrifice_type: 'material',
    description: 'Ordinary level - Sacrificing external possessions and wealth',
    exp_multiplier: 1.0,
  },
  upaparami: {
    level: 'upaparami',
    sacrifice_type: 'body_part',
    description: 'Middle level - Sacrificing body parts or enduring extreme physical pain',
    exp_multiplier: 5.0,
  },
  paramatthaparami: {
    level: 'paramatthaparami',
    sacrifice_type: 'life',
    description: "Supreme level - Sacrificing one's life to uphold the perfection",
    exp_multiplier: 20.0,
  },
};

// ========================================================================
// PARAMI UPDATER
// ========================================================================

/**
 * Parami_Updater - Updates experience points and levels of Paramis
 *
 * Logic:
 * 1. Receives wholesome action with intensity
 * 2. Determines which Parami(s) apply
 * 3. Checks for sacrifice level (parami/upaparami/paramatthaparami)
 * 4. Calculates EXP with synergy bonuses
 * 5. Updates Parami levels when thresholds are reached
 * 6. Grants resistance bonus to JavanaDecisionEngine
 */
export class ParamiUpdater {
  /**
   * Evaluate if an action qualifies as Parami development
   */
  static qualifiesAsParami(
    action: string,
    character: Character
  ): {
    qualifies: boolean;
    parami_type?: keyof ParamiPortfolio;
    sacrifice_level: ParamiLevel;
    reasoning: string;
  } {
    const lowerAction = action.toLowerCase();
    const consciousness = character.internal?.consciousness || {};
    const panna = consciousness['ปัญญา (Wisdom)'] || 0;
    const sati = consciousness['สติ (Mindfulness)'] || 0;

    // Requirement 1: Must have Adhitthana (clear intention)
    const hasAdhitthana =
      lowerAction.includes('ตั้งใจ') ||
      lowerAction.includes('resolve') ||
      lowerAction.includes('determined');

    // Requirement 2: Must have Panna (understanding of purpose)
    const hasPanna =
      panna > 30 || lowerAction.includes('เพื่อ') || lowerAction.includes('for the sake of');

    if (!hasAdhitthana || !hasPanna) {
      return {
        qualifies: false,
        sacrifice_level: 'parami',
        reasoning: 'Action lacks clear intention (Adhitthana) or wisdom (Panna). Not a Parami.',
      };
    }

    // Determine which Parami
    let parami_type: keyof ParamiPortfolio | undefined;
    let sacrifice_level: ParamiLevel = 'parami';

    // Dana (Generosity)
    if (
      lowerAction.includes('ให้') ||
      lowerAction.includes('บริจาค') ||
      lowerAction.includes('give')
    ) {
      parami_type = 'dana';
      if (lowerAction.includes('ทุกอย่าง') || lowerAction.includes('everything')) {
        sacrifice_level = 'upaparami';
      }
      if (lowerAction.includes('ชีวิต') || lowerAction.includes('life')) {
        sacrifice_level = 'paramatthaparami';
      }
    }

    // Sila (Morality)
    if (
      lowerAction.includes('ศีล') ||
      lowerAction.includes('precept') ||
      lowerAction.includes('ไม่')
    ) {
      parami_type = 'sila';
      if (lowerAction.includes('ยอมตาย') || lowerAction.includes('rather die')) {
        sacrifice_level = 'paramatthaparami';
      }
    }

    // Khanti (Patience)
    if (
      lowerAction.includes('อดทน') ||
      lowerAction.includes('อดกลั้น') ||
      lowerAction.includes('endure')
    ) {
      parami_type = 'khanti';
      if (lowerAction.includes('ทรมาน') || lowerAction.includes('torture')) {
        sacrifice_level = 'upaparami';
      }
      if (lowerAction.includes('ให้อภัยผู้ฆ่า') || lowerAction.includes('forgive killer')) {
        sacrifice_level = 'paramatthaparami';
      }
    }

    // Sacca (Truthfulness)
    if (
      lowerAction.includes('ความจริง') ||
      lowerAction.includes('truth') ||
      lowerAction.includes('ไม่โกหก')
    ) {
      parami_type = 'sacca';
      if (lowerAction.includes('ยอมตาย') || lowerAction.includes('die for truth')) {
        sacrifice_level = 'paramatthaparami';
      }
    }

    // Metta (Loving-kindness)
    if (
      lowerAction.includes('เมตตา') ||
      lowerAction.includes('รัก') ||
      lowerAction.includes('loving')
    ) {
      parami_type = 'metta';
      if (lowerAction.includes('ศัตรู') || lowerAction.includes('enemy')) {
        sacrifice_level = 'upaparami';
      }
    }

    // Panna (Wisdom)
    if (
      lowerAction.includes('ปัญญา') ||
      lowerAction.includes('wisdom') ||
      lowerAction.includes('เห็นแจ้ง')
    ) {
      parami_type = 'panna';
      if (sati > 70 && panna > 70) {
        sacrifice_level = 'upaparami';
      }
    }

    if (!parami_type) {
      return {
        qualifies: false,
        sacrifice_level: 'parami',
        reasoning: 'Action does not clearly align with any specific Parami.',
      };
    }

    return {
      qualifies: true,
      parami_type,
      sacrifice_level,
      reasoning: `Action qualifies as ${parami_type} at ${sacrifice_level} level.`,
    };
  }

  /**
   * Calculate EXP gain with synergy bonuses
   */
  static calculateExpGain(
    parami_type: keyof ParamiPortfolio,
    intensity: number,
    sacrifice_level: ParamiLevel,
    current_parami: ParamiPortfolio
  ): number {
    // Base EXP from intensity
    const baseExp = intensity * 10;

    // Sacrifice level multiplier
    const levelMultiplier = PARAMI_LEVEL_REQUIREMENTS[sacrifice_level].exp_multiplier;

    // Synergy bonus from supporting Paramis
    const synergy = PARAMI_SYNERGY_MATRIX[parami_type];
    let synergyBonus = 0;

    synergy.supporting_paramis.forEach(supportingParami => {
      const supportLevel = current_parami[supportingParami]?.level || 0;
      synergyBonus += supportLevel * 0.1; // 10% per level
    });

    const totalExp = baseExp * levelMultiplier * (1 + synergyBonus);

    return Math.round(totalExp);
  }

  /**
   * Update Parami portfolio with new EXP
   */
  static updateParami(
    parami_type: keyof ParamiPortfolio,
    exp_gain: number,
    current_parami: ParamiPortfolio
  ): {
    updated_parami: ParamiPortfolio;
    level_up: boolean;
    new_level: number;
    message: string;
  } {
    const current = current_parami[parami_type] || { level: 0, exp: 0, target_kilesa: '' };
    const newExp = current.exp + exp_gain;

    // Level up threshold: 1000 EXP per level
    const EXP_PER_LEVEL = 1000;
    const newLevel = Math.floor(newExp / EXP_PER_LEVEL);
    const levelUp = newLevel > current.level;

    const updated_parami: ParamiPortfolio = {
      ...current_parami,
      [parami_type]: {
        ...current,
        level: newLevel,
        exp: newExp,
      },
    };

    const message = levelUp
      ? `${parami_type} increased to level ${newLevel}! (${exp_gain} EXP gained)`
      : `${parami_type} gained ${exp_gain} EXP (Total: ${newExp}/${(newLevel + 1) * EXP_PER_LEVEL})`;

    return {
      updated_parami,
      level_up: levelUp,
      new_level: newLevel,
      message,
    };
  }

  /**
   * Calculate resistance bonus for JavanaDecisionEngine
   */
  static getResistanceBonus(parami_type: keyof ParamiPortfolio, parami_level: number): number {
    // Each Parami level provides 10 points of resistance
    // This is used in JavanaDecisionEngine to counter kilesa
    return parami_level * 10;
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Get total Parami strength across all 10 Paramis
 */
export function getTotalParamiStrength(parami: ParamiPortfolio): number {
  return Object.values(parami).reduce((total, p) => total + (p?.level || 0), 0);
}

/**
 * Get strongest Parami
 */
export function getStrongestParami(parami: ParamiPortfolio): {
  name: keyof ParamiPortfolio;
  level: number;
} {
  let strongest: keyof ParamiPortfolio = 'dana';
  let maxLevel = 0;

  (Object.keys(parami) as Array<keyof ParamiPortfolio>).forEach(key => {
    const level = parami[key]?.level || 0;
    if (level > maxLevel) {
      maxLevel = level;
      strongest = key;
    }
  });

  return { name: strongest, level: maxLevel };
}

/**
 * Format Parami for display
 */
export function formatParamiDisplay(parami: ParamiPortfolio): Array<{
  name: string;
  level: number;
  exp: number;
  progress: number; // 0-100%
  target_kilesa: string;
}> {
  const EXP_PER_LEVEL = 1000;

  return (Object.keys(parami) as Array<keyof ParamiPortfolio>).map(key => {
    const p = parami[key] || { level: 0, exp: 0, target_kilesa: '' };
    const currentLevelExp = p.exp % EXP_PER_LEVEL;
    const progress = (currentLevelExp / EXP_PER_LEVEL) * 100;

    return {
      name: key,
      level: p.level,
      exp: p.exp,
      progress: Math.round(progress),
      target_kilesa:
        ('target_kilesa' in p ? p.target_kilesa : undefined) ||
        PARAMI_KILESA_COUNTER_MAP[key]?.primary_kilesa ||
        '',
    };
  });
}

/**
 * Calculate Parami Synergy Bonus
 * Returns the synergy bonus for a specific parami based on its supporting paramis
 */
export function calculateParamiSynergy(
  parami_name: keyof ParamiPortfolio,
  portfolio: ParamiPortfolio
): number {
  const config = PARAMI_SYNERGY_MATRIX[parami_name];
  if (!config) return 0;

  // Get supporting paramis levels
  const supportingLevels = config.supporting_paramis.map(
    p => portfolio[p]?.level || 0
  );

  // Parse boost formula (simplified implementation)
  // Example formula: '0.1 * (khanti.level + adhitthana.level + metta.level)'
  const multiplierMatch = config.boost_formula.match(/^([\d.]+)\s*\*/);
  const multiplier = multiplierMatch ? parseFloat(multiplierMatch[1]) : 0.1;

  // Calculate sum of supporting levels
  const sum = supportingLevels.reduce((total, level) => total + level, 0);

  return multiplier * sum;
}

/**
 * Update Parami from character actions
 * Analyzes actions and increases relevant paramis
 */
export function updateParamiFromAction(
  portfolio: ParamiPortfolio,
  action: { กาย: string[]; วาจา: string[]; ใจ: string[] },
  karmaType: 'กุศลกรรม' | 'อกุศลกรรม' | 'เฉยๆ'
): ParamiPortfolio {
  // Only wholesome actions increase paramis
  if (karmaType !== 'กุศลกรรม') {
    return portfolio;
  }

  const updated = { ...portfolio };
  const allActions = [...action.กาย, ...action.วาจา, ...action.ใจ].join(' ').toLowerCase();

  // Dana (Generosity)
  if (allActions.includes('ช่วย') || allActions.includes('ให้') || allActions.includes('แบ่งปัน') ||
      allActions.includes('help') || allActions.includes('give') || allActions.includes('share')) {
    updated.dana = { ...updated.dana, exp: updated.dana.exp + 10 };
  }

  // Sila (Morality)
  if (allActions.includes('ซื่อสัตย์') || allActions.includes('ถูกต้อง') ||
      allActions.includes('honest') || allActions.includes('right')) {
    updated.sila = { ...updated.sila, exp: updated.sila.exp + 10 };
  }

  // Nekkhamma (Renunciation)
  if (allActions.includes('ปล่อยวาง') || allActions.includes('ไม่ยึดติด') ||
      allActions.includes('let go') || allActions.includes('renounce')) {
    updated.nekkhamma = { ...updated.nekkhamma, exp: updated.nekkhamma.exp + 10 };
  }

  // Viriya (Energy)
  if (allActions.includes('พยายาม') || allActions.includes('เพียร') ||
      allActions.includes('try') || allActions.includes('effort')) {
    updated.viriya = { ...updated.viriya, exp: updated.viriya.exp + 10 };
  }

  // Khanti (Patience)
  if (allActions.includes('อดทน') || allActions.includes('อดกลั้น') || allActions.includes('ใจเย็น') ||
      allActions.includes('patient') || allActions.includes('endure')) {
    updated.khanti = { ...updated.khanti, exp: updated.khanti.exp + 10 };
  }

  // Sacca (Truthfulness)
  if (allActions.includes('จริงใจ') || allActions.includes('ความจริง') ||
      allActions.includes('truthful') || allActions.includes('sincere')) {
    updated.sacca = { ...updated.sacca, exp: updated.sacca.exp + 10 };
  }

  // Adhitthana (Determination)
  if (allActions.includes('มุ่งมั่น') || allActions.includes('ตั้งใจ') ||
      allActions.includes('determined') || allActions.includes('resolved')) {
    updated.adhitthana = { ...updated.adhitthana, exp: updated.adhitthana.exp + 10 };
  }

  // Metta (Loving-kindness)
  if (allActions.includes('เมตตา') || allActions.includes('รัก') || allActions.includes('ใจดี') ||
      allActions.includes('kind') || allActions.includes('love') || allActions.includes('care')) {
    updated.metta = { ...updated.metta, exp: updated.metta.exp + 10 };
  }

  // Upekkha (Equanimity)
  if (allActions.includes('สงบ') || allActions.includes('วางเฉย') ||
      allActions.includes('calm') || allActions.includes('equanimity')) {
    updated.upekkha = { ...updated.upekkha, exp: updated.upekkha.exp + 10 };
  }

  // Panna (Wisdom)
  if (allActions.includes('ปัญญา') || allActions.includes('เข้าใจ') || allActions.includes('รู้เท่าทัน') ||
      allActions.includes('wisdom') || allActions.includes('understand') || allActions.includes('insight')) {
    updated.panna = { ...updated.panna, exp: updated.panna.exp + 10 };
  }

  // Handle level ups
  Object.keys(updated).forEach((key) => {
    const paramiKey = key as keyof ParamiPortfolio;
    while (updated[paramiKey].exp >= 100) {
      updated[paramiKey] = {
        level: updated[paramiKey].level + 1,
        exp: updated[paramiKey].exp - 100,
      };
    }
  });

  return updated;
}

