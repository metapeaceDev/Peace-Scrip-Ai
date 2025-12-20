/**
 * Psychology Calculator for Peace Script
 * Calculates psychological states and emotional tones based on Character.internal data
 * Integrates with DigitalMindModel concepts in a simplified form
 */

import type { Character } from '../../types';
import { 
  calculateParamiSynergy, 
  getTotalParamiStrength, 
  getStrongestParami,
  PARAMI_SYNERGY_MATRIX 
} from './paramiSystem';

export interface PsychologyProfile {
  // Core Scores (0-100)
  consciousnessScore: number;
  defilementScore: number;
  
  // Derived States
  mentalBalance: number; // -100 to +100 (consciousness - defilement)
  dominantEmotion: 'peaceful' | 'joyful' | 'angry' | 'confused' | 'fearful' | 'neutral';
  emotionalIntensity: number; // 0-100
  
  // Detailed Breakdown
  strongestVirtue: string;
  strongestDefilement: string;
  
  // For AI Prompts
  personalityDescription: string;
  emotionalTendency: string;
}

export interface EmotionalReaction {
  reactionType: 'wholesome' | 'unwholesome' | 'neutral';
  emotionalTone: string;
  intensity: number;
  reasoning: string;
}

/**
 * Calculate comprehensive psychology profile from Character.internal data
 */
export function calculatePsychologyProfile(character: Character): PsychologyProfile {
  const { consciousness, defilement } = character.internal;
  
  // Calculate average scores
  const consciousnessValues = Object.values(consciousness);
  const defilementValues = Object.values(defilement);
  
  const consciousnessScore = consciousnessValues.reduce((a, b) => a + b, 0) / consciousnessValues.length;
  const defilementScore = defilementValues.reduce((a, b) => a + b, 0) / defilementValues.length;
  
  // Mental Balance: Positive = more virtuous, Negative = more defiled
  const mentalBalance = consciousnessScore - defilementScore;
  
  // Find strongest elements
  const consciousnessEntries = Object.entries(consciousness);
  const defilementEntries = Object.entries(defilement);
  
  const strongestVirtue = consciousnessEntries.reduce((max, curr) => 
    curr[1] > max[1] ? curr : max
  )[0];
  
  const strongestDefilement = defilementEntries.reduce((max, curr) => 
    curr[1] > max[1] ? curr : max
  )[0];
  
  // Determine dominant emotion based on strongest traits
  let dominantEmotion: PsychologyProfile['dominantEmotion'] = 'neutral';
  let emotionalIntensity = 0;
  
  if (mentalBalance > 30) {
    dominantEmotion = consciousness['Mudita (Joy in happiness)'] > 70 ? 'joyful' : 'peaceful';
    emotionalIntensity = consciousnessScore;
  } else if (mentalBalance < -30) {
    if (defilement['Anger (Anger)'] > 60) {
      dominantEmotion = 'angry';
    } else if (defilement['Moha (delusion)'] > 60) {
      dominantEmotion = 'confused';
    } else if (defilement['Vicikiccha (doubt)'] > 60) {
      dominantEmotion = 'fearful';
    } else {
      dominantEmotion = 'angry'; // Default for negative balance
    }
    emotionalIntensity = defilementScore;
  } else {
    dominantEmotion = 'neutral';
    emotionalIntensity = Math.abs(mentalBalance);
  }
  
  // Generate personality description for AI
  const personalityDescription = generatePersonalityDescription(
    consciousnessScore,
    defilementScore,
    strongestVirtue,
    strongestDefilement,
    dominantEmotion
  );
  
  const emotionalTendency = generateEmotionalTendency(
    dominantEmotion,
    emotionalIntensity,
    mentalBalance
  );
  
  return {
    consciousnessScore,
    defilementScore,
    mentalBalance,
    dominantEmotion,
    emotionalIntensity,
    strongestVirtue,
    strongestDefilement,
    personalityDescription,
    emotionalTendency
  };
}

/**
 * Calculate how a character would react to a specific event/situation
 */
export function calculateReaction(
  character: Character,
  _eventDescription: string,
  eventIntensity: number = 5 // 1-10 scale
): EmotionalReaction {
  const profile = calculatePsychologyProfile(character);
  
  // Simple reaction formula based on mental balance
  const balanceThreshold = eventIntensity * 10; // Higher intensity = harder test
  
  let reactionType: EmotionalReaction['reactionType'];
  let emotionalTone: string;
  let intensity: number;
  let reasoning: string;
  
  if (profile.mentalBalance > balanceThreshold) {
    // Virtuous reaction - consciousness overcomes the challenge
    reactionType = 'wholesome';
    emotionalTone = profile.dominantEmotion === 'peaceful' 
      ? 'calm and composed' 
      : 'understanding and compassionate';
    intensity = Math.min(profile.consciousnessScore, 100);
    reasoning = `High consciousness (${profile.consciousnessScore.toFixed(1)}) enabled ${character.name} to respond with ${profile.strongestVirtue}`;
  } else if (profile.mentalBalance < -balanceThreshold) {
    // Unwholesome reaction - defilements dominate
    reactionType = 'unwholesome';
    emotionalTone = profile.dominantEmotion === 'angry'
      ? 'irritated and aggressive'
      : profile.dominantEmotion === 'confused'
      ? 'confused and defensive'
      : 'anxious and worried';
    intensity = Math.min(profile.defilementScore, 100);
    reasoning = `Strong defilement (${profile.strongestDefilement}) overwhelmed ${character.name}'s better judgment`;
  } else {
    // Neutral/Mixed reaction - internal conflict
    reactionType = 'neutral';
    emotionalTone = 'conflicted and hesitant';
    intensity = Math.abs(profile.mentalBalance);
    reasoning = `${character.name} experiences internal conflict between ${profile.strongestVirtue} and ${profile.strongestDefilement}`;
  }
  
  return {
    reactionType,
    emotionalTone,
    intensity,
    reasoning
  };
}

/**
 * Generate natural language personality description for AI prompts
 */
function generatePersonalityDescription(
  consciousnessScore: number,
  defilementScore: number,
  strongestVirtue: string,
  strongestDefilement: string,
  _dominantEmotion: string
): string {
  const parts: string[] = [];
  
  // Overall balance
  if (consciousnessScore > defilementScore + 20) {
    parts.push('a highly virtuous and mindful person');
  } else if (defilementScore > consciousnessScore + 20) {
    parts.push('a person struggling with inner conflicts and negative emotions');
  } else {
    parts.push('a person with balanced but conflicting inner qualities');
  }
  
  // Dominant traits
  const virtueMap: Record<string, string> = {
    'Mindfulness (remembrance)': 'very mindful and aware',
    'Wisdom (right view)': 'wise and insightful',
    'Faith (Belief in the right)': 'faithful and principled',
    'Hiri (Shame of sin)': 'conscientious and morally sensitive',
    'Karuna (Compassion, knowing suffering)': 'deeply compassionate',
    'Mudita (Joy in happiness)': 'joyful and appreciative'
  };
  
  const defilementMap: Record<string, string> = {
    'Lobha (Greed)': 'prone to greed and attachment',
    'Anger (Anger)': 'quick to anger',
    'Moha (delusion)': 'often confused or deluded',
    'Mana (arrogance)': 'prideful and arrogant',
    'Titthi (obsession)': 'stubborn in wrong views',
    'Vicikiccha (doubt)': 'plagued by doubt',
    'Thina (depression)': 'tends toward lethargy',
    'Uthachcha (distraction)': 'easily distracted',
    'Ahirika (shamelessness)': 'lacking moral restraint',
    'Amodtappa (fearlessness of sin)': 'fearless of wrongdoing'
  };
  
  if (virtueMap[strongestVirtue]) {
    parts.push(`especially ${virtueMap[strongestVirtue]}`);
  }
  
  if (defilementMap[strongestDefilement] && defilementScore > 40) {
    parts.push(`but ${defilementMap[strongestDefilement]}`);
  }
  
  return parts.join(', ');
}

/**
 * Generate emotional tendency description for AI prompts
 */
function generateEmotionalTendency(
  dominantEmotion: string,
  intensity: number,
  mentalBalance: number
): string {
  const intensityDesc = intensity > 70 ? 'very' : intensity > 40 ? 'moderately' : 'slightly';
  
  const emotionMap: Record<string, string> = {
    'peaceful': `${intensityDesc} calm and serene`,
    'joyful': `${intensityDesc} happy and enthusiastic`,
    'angry': `${intensityDesc} irritable and tense`,
    'confused': `${intensityDesc} unclear and uncertain`,
    'fearful': `${intensityDesc} anxious and worried`,
    'neutral': 'emotionally balanced but unremarkable'
  };
  
  let tendency = emotionMap[dominantEmotion] || 'neutral';
  
  // Add volatility note
  if (Math.abs(mentalBalance) < 20) {
    tendency += ', emotionally unstable and unpredictable';
  }
  
  return tendency;
}

/**
 * Format psychology profile for inclusion in AI prompts
 */
export function formatPsychologyForPrompt(character: Character): string {
  const profile = calculatePsychologyProfile(character);
  
  return `
PSYCHOLOGICAL PROFILE for ${character.name}:
- Mental State: ${profile.personalityDescription}
- Emotional Tendency: ${profile.emotionalTendency}
- Core Virtue: ${profile.strongestVirtue} (Consciousness Score: ${profile.consciousnessScore.toFixed(1)}/100)
- Main Weakness: ${profile.strongestDefilement} (Defilement Score: ${profile.defilementScore.toFixed(1)}/100)
- Current Dominant Emotion: ${profile.dominantEmotion} (Intensity: ${profile.emotionalIntensity.toFixed(1)}/100)
- Mental Balance: ${profile.mentalBalance.toFixed(1)} (${profile.mentalBalance > 0 ? 'Virtuous' : 'Troubled'})

IMPORTANT: Portray this character's behavior, dialogue, and reactions consistent with this psychological profile.
`.trim();
}

/**
 * Analyze Parami Portfolio with Synergy Calculations
 * Shows which paramis are strong, weak, and synergy bonuses
 * 
 * @param character - Character with parami_portfolio
 * @returns Detailed parami analysis with synergy information
 */
export function analyzeParamiPortfolio(character: Character): {
  totalParamiStrength: number;
  strongestParami: { name: string; level: number; exp: number };
  weakestParami: { name: string; level: number; exp: number };
  synergyAnalysis: Array<{
    parami: string;
    baseLevel: number;
    synergyBonus: number;
    effectiveLevel: number;
    supportingParamis: string[];
  }>;
  overallSynergyBonus: number;
} | null {
  const portfolio = character.parami_portfolio;
  
  if (!portfolio) {
    return null;
  }

  // Calculate total strength
  const totalParamiStrength = getTotalParamiStrength(portfolio);

  // Find strongest and weakest
  const strongest = getStrongestParami(portfolio);
  const paramiEntries = Object.entries(portfolio) as Array<[keyof typeof portfolio, { level: number; exp: number }]>;
  const weakest = paramiEntries.reduce((min, [name, data]) => 
    data.level < min.level ? { name, ...data } : min,
    { name: paramiEntries[0][0], ...paramiEntries[0][1] }
  );

  // Get exp for strongest
  const strongestExp = portfolio[strongest.name].exp;

  // Calculate synergy for each parami
  const synergyAnalysis = paramiEntries.map(([name, data]) => {
    const synergyBonus = calculateParamiSynergy(name, portfolio);
    const effectiveLevel = data.level + synergyBonus;

    // Get supporting paramis from PARAMI_SYNERGY_MATRIX
    const supportingParamis = PARAMI_SYNERGY_MATRIX[name]?.supporting_paramis || [];

    return {
      parami: name,
      baseLevel: data.level,
      synergyBonus: Math.round(synergyBonus * 10) / 10, // Round to 1 decimal
      effectiveLevel: Math.round(effectiveLevel * 10) / 10,
      supportingParamis,
    };
  });

  // Calculate overall synergy bonus
  const overallSynergyBonus = synergyAnalysis.reduce((sum, item) => sum + item.synergyBonus, 0);

  return {
    totalParamiStrength,
    strongestParami: { name: strongest.name, level: strongest.level, exp: strongestExp },
    weakestParami: { name: weakest.name, level: weakest.level, exp: weakest.exp },
    synergyAnalysis: synergyAnalysis.sort((a, b) => b.effectiveLevel - a.effectiveLevel),
    overallSynergyBonus: Math.round(overallSynergyBonus * 10) / 10,
  };
}

/**
 * Update character's emotional state based on current psychology
 * This should be called when scenes are generated or when character values change
 */
export function updateEmotionalState(character: Character, sceneContext?: string): Character {
  const profile = calculatePsychologyProfile(character);
  
  return {
    ...character,
    emotionalState: {
      currentMood: profile.dominantEmotion,
      energyLevel: profile.consciousnessScore, // High consciousness = high energy
      mentalBalance: profile.mentalBalance,
      lastUpdated: sceneContext || new Date().toISOString()
    }
  };
}

/**
 * Batch update emotional states for multiple characters
 */
export function updateAllEmotionalStates(characters: Character[], sceneContext?: string): Character[] {
  return characters.map(c => updateEmotionalState(c, sceneContext));
}
