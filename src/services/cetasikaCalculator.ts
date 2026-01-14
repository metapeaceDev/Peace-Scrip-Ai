/**
 * cetasikaCalculator.ts
 *
 * Cetasika 52 Calculator - Convert Character data to Cetasika Profile
 * Integrates with existing psychologyCalculator and paramiSystem
 */

import type { Character, ParamiPortfolio } from '../types';
import type {
  CetasikaProfile,
  AññasamanaCetasika,
  SobhanaCetasika,
  AkusalaCetasika,
} from '../types/cetasika';
import { createDefaultCetasikaProfile } from '../types/cetasika';

/**
 * Main function: Calculate complete Cetasika Profile from Character
 */
export function calculateCetasikaProfile(character: Character): CetasikaProfile {
  const profile = createDefaultCetasikaProfile();

  // Calculate each category
  profile.aññasamana = calculateAññasamana(character);
  profile.sobhana = calculateSobhana(character);
  profile.akusala = calculateAkusala(character);

  // Calculate summary metrics
  profile.summary = calculateSummary(profile);

  return profile;
}

// ============================================
// 1. UNIVERSAL MENTAL FACTORS (13)
// ============================================

function calculateAññasamana(character: Character): AññasamanaCetasika {
  const { consciousness, defilement } = character.internal;
  const parami = character.parami_portfolio;

  // Helper to get parami level safely
  const getParamiLevel = (key: keyof ParamiPortfolio): number => {
    return parami?.[key]?.level ?? 30;
  };

  return {
    // Contact - Based on awareness/mindfulness
    phassa: consciousness['Mindfulness (Sati)'] || 50,

    // Feeling - Average of pleasant/unpleasant states
    vedana:
      (consciousness['Mudita (Joy in happiness)'] + (100 - defilement['Anger (Anger)'])) / 2 || 50,

    // Perception - Based on wisdom/understanding
    sañña: consciousness['Wisdom (Panna)'] || 50,

    // Volition - Based on intention/parami strength
    cetana: (getParamiLevel('adhitthana') + getParamiLevel('viriya')) / 2,

    // One-pointedness - Based on concentration/mindfulness
    ekaggata: (consciousness['Mindfulness (Sati)'] + getParamiLevel('viriya')) / 2,

    // Life Faculty - Always 100 (alive)
    jivitindriya: 100,

    // Attention - Based on mindfulness
    manasikara: consciousness['Mindfulness (Sati)'] || 50,

    // Initial Application - Based on wisdom + effort
    vitakka: ((consciousness['Wisdom (Panna)'] || 50) + getParamiLevel('viriya')) / 2,

    // Sustained Application - Based on patience + effort
    vicara: (getParamiLevel('khanti') + getParamiLevel('viriya')) / 2,

    // Determination - Based on adhitthana parami
    adhimokkha: getParamiLevel('adhitthana'),

    // Energy - Based on viriya parami
    viriya: getParamiLevel('viriya'),

    // Rapture - Based on joy/metta
    piti: ((consciousness['Mudita (Joy in happiness)'] || 30) + getParamiLevel('metta')) / 2,

    // Zeal - Based on viriya + adhitthana
    chanda: (getParamiLevel('viriya') + getParamiLevel('adhitthana')) / 2,
  };
}

// ============================================
// 2. BEAUTIFUL/WHOLESOME FACTORS (25)
// ============================================

function calculateSobhana(character: Character): SobhanaCetasika {
  const { consciousness } = character.internal;
  const parami = character.parami_portfolio;

  // Helper to get parami level safely
  const getParamiLevel = (key: keyof ParamiPortfolio): number => {
    return parami?.[key]?.level ?? 30;
  };

  // Base values from consciousness
  const mindfulness = consciousness['Mindfulness (Sati)'] || 30;
  const wisdom = consciousness['Wisdom (Panna)'] || 30;
  const compassion = consciousness['Karuna (compassion)'] || 30;
  const equanimity = consciousness['Upekkha (equanimity)'] || 30;

  // Calculate tranquility/lightness/pliancy pairs (simplified)
  const mentalCalmness = (mindfulness + equanimity) / 2;
  const mentalAgility = (wisdom + getParamiLevel('viriya')) / 2;

  return {
    // Common Beautiful Factors (19)
    saddha: getParamiLevel('sacca'),
    sati: mindfulness,
    hiri: getParamiLevel('sila'),
    ottappa: getParamiLevel('sila'),
    alobha: (getParamiLevel('dana') + getParamiLevel('nekkhamma')) / 2,
    adosa: (getParamiLevel('metta') + getParamiLevel('khanti')) / 2,
    tatramajjhattata: equanimity,

    // Tranquility Pair
    kayaPassaddhi: mentalCalmness,
    cittaPassaddhi: mentalCalmness,

    // Lightness Pair
    kayaLahuta: mentalAgility,
    cittaLahuta: mentalAgility,

    // Pliancy Pair
    kayaMuduta: (mentalCalmness + mentalAgility) / 2,
    cittaMuduta: (mentalCalmness + mentalAgility) / 2,

    // Wieldiness Pair
    kayaKammañata: getParamiLevel('viriya'),
    cittaKammañata: getParamiLevel('viriya'),

    // Proficiency Pair
    kayaPaguññata: wisdom,
    cittaPaguññata: wisdom,

    // Rectitude Pair
    kayaUjukata: getParamiLevel('sacca'),
    cittaUjukata: getParamiLevel('sacca'),

    // Abstinences (Virati) - 3
    sammaVaca: getParamiLevel('sila'),
    sammaKammanta: getParamiLevel('sila'),
    sammaAjiva: getParamiLevel('sila'),

    // Immeasurables (Appamañña) - 2
    karuna: compassion,
    mudita: consciousness['Mudita (Joy in happiness)'] || 30,

    // Wisdom Faculty - 1
    paññindriya: wisdom,
  };
}

// ============================================
// 3. UNWHOLESOME FACTORS (14)
// ============================================

function calculateAkusala(character: Character): AkusalaCetasika {
  const { defilement } = character.internal;
  const parami = character.parami_portfolio;

  // Helper to get parami level safely
  const getParamiLevel = (key: keyof ParamiPortfolio): number => {
    return parami?.[key]?.level ?? 30;
  };

  return {
    // Greed Group (Raga)
    lobha: defilement['Lobha (greed)'] || 20,
    ditthi: defilement['Ditthi (wrong view)'] || 20,
    mana: defilement['Mana (Pride)'] || 20,
    moha: defilement['Moha (delusion)'] || 20,

    // Hatred Group (Dosa)
    dosa: defilement['Anger (Anger)'] || 20,
    issa: defilement['Issa (envy)'] || 20,
    macchariya: defilement['Macchariya (avarice)'] || 20,
    kukkucca: defilement['Kukkucca (worry)'] || 20,

    // Delusion Group (Moha)
    thina: defilement['Thina-middha (sloth & torpor)'] || 20,
    middha: defilement['Thina-middha (sloth & torpor)'] || 20,
    vicikiccha: defilement['Vicikiccha (doubt)'] || 20,
    uddhacca: defilement['Uddhacca (restlessness)'] || 20,

    // Additional
    ahirika: 100 - getParamiLevel('sila'), // Inverse of sila
    anottappa: 100 - getParamiLevel('sila'), // Inverse of sila
  };
}

// ============================================
// 4. SUMMARY CALCULATION
// ============================================
// ============================================

function calculateSummary(profile: CetasikaProfile): CetasikaProfile['summary'] {
  // Calculate average scores for each category
  const aññasamanaValues = Object.values(profile.aññasamana);
  const sobhanaValues = Object.values(profile.sobhana);
  const akusalaValues = Object.values(profile.akusala);

  const aññasamanaAvg = aññasamanaValues.reduce((a, b) => a + b, 0) / aññasamanaValues.length;
  const sobhanaAvg = sobhanaValues.reduce((a, b) => a + b, 0) / sobhanaValues.length;
  const akusalaAvg = akusalaValues.reduce((a, b) => a + b, 0) / akusalaValues.length;

  // Calculate ratios
  const totalScore = sobhanaAvg + akusalaAvg;
  const kusalaRatio = totalScore > 0 ? sobhanaAvg / totalScore : 0.5;
  const akusalaRatio = totalScore > 0 ? akusalaAvg / totalScore : 0.5;

  // Mental balance: +100 (pure kusala) to -100 (pure akusala)
  const mentalBalance = Math.round((kusalaRatio - akusalaRatio) * 100);

  // Determine dominant category
  let dominantCategory: 'aññasamana' | 'sobhana' | 'akusala' = 'aññasamana';
  if (sobhanaAvg > akusalaAvg && sobhanaAvg > aññasamanaAvg) {
    dominantCategory = 'sobhana';
  } else if (akusalaAvg > sobhanaAvg && akusalaAvg > aññasamanaAvg) {
    dominantCategory = 'akusala';
  }

  // Consciousness level (based on mindfulness + wisdom)
  const consciousness = Math.round((profile.aññasamana.manasikara + profile.sobhana.sati) / 2);

  return {
    kusalaRatio,
    akusalaRatio,
    dominantCategory,
    mentalBalance,
    consciousness,
  };
}

// ============================================
// 5. HELPER FUNCTIONS
// ============================================

/**
 * Get top N strongest cetasika factors
 */
export function getTopCetasikaFactors(
  profile: CetasikaProfile,
  n = 5
): Array<{ name: string; value: number; category: string }> {
  const allFactors: Array<{ name: string; value: number; category: string }> = [];

  // Collect all factors
  Object.entries(profile.aññasamana).forEach(([name, value]) => {
    allFactors.push({ name, value, category: 'universal' });
  });

  Object.entries(profile.sobhana).forEach(([name, value]) => {
    allFactors.push({ name, value, category: 'wholesome' });
  });

  Object.entries(profile.akusala).forEach(([name, value]) => {
    allFactors.push({ name, value, category: 'unwholesome' });
  });

  // Sort by value descending
  allFactors.sort((a, b) => b.value - a.value);

  // Return top N
  return allFactors.slice(0, n);
}

/**
 * Get cetasika factor by name (searches all categories)
 */
export function getCetasikaFactor(profile: CetasikaProfile, factorName: string): number | null {
  if (factorName in profile.aññasamana) {
    return profile.aññasamana[factorName as keyof AññasamanaCetasika];
  }
  if (factorName in profile.sobhana) {
    return profile.sobhana[factorName as keyof SobhanaCetasika];
  }
  if (factorName in profile.akusala) {
    return profile.akusala[factorName as keyof AkusalaCetasika];
  }
  return null;
}

/**
 * Compare two cetasika profiles (for evolution tracking)
 */
export function compareCetasikaProfiles(
  before: CetasikaProfile,
  after: CetasikaProfile
): {
  improved: string[];
  declined: string[];
  unchanged: string[];
  mentalBalanceChange: number;
} {
  const improved: string[] = [];
  const declined: string[] = [];
  const unchanged: string[] = [];

  // Compare all factors
  const compareCategory = (
    categoryBefore: Partial<Record<string, number>> | AññasamanaCetasika | SobhanaCetasika | AkusalaCetasika,
    categoryAfter: Partial<Record<string, number>> | AññasamanaCetasika | SobhanaCetasika | AkusalaCetasika
  ) => {
    const beforeKeys = Object.keys(categoryBefore);
    beforeKeys.forEach(key => {
      const beforeVal = (categoryBefore as Record<string, number>)[key] ?? 0;
      const afterVal = (categoryAfter as Record<string, number>)[key] ?? 0;
      const diff = afterVal - beforeVal;
      if (diff > 5) improved.push(key);
      else if (diff < -5) declined.push(key);
      else unchanged.push(key);
    });
  };

  compareCategory(before.aññasamana, after.aññasamana);
  compareCategory(before.sobhana, after.sobhana);
  compareCategory(before.akusala, after.akusala);

  const mentalBalanceChange = after.summary.mentalBalance - before.summary.mentalBalance;

  return {
    improved,
    declined,
    unchanged,
    mentalBalanceChange,
  };
}

/**
 * Generate text description of cetasika profile
 */
export function describeCetasikaProfile(profile: CetasikaProfile): string {
  const { summary } = profile;
  const top5 = getTopCetasikaFactors(profile, 5);

  let description = '';

  // Overall balance
  if (summary.mentalBalance > 50) {
    description += 'มีจิตใจที่สงบเยือกเย็น มีกุสลธรรมเป็นหลัก. ';
  } else if (summary.mentalBalance > 0) {
    description += 'มีจิตใจสมดุล กุสลธรรมเหนือกว่ากิเลส. ';
  } else if (summary.mentalBalance > -50) {
    description += 'จิตใจไม่สมดุล กิเลสเหนือกว่ากุสลธรรม. ';
  } else {
    description += 'จิตใจหมกมุ่นในกิเลส ควรฝึกฝนธรรม. ';
  }

  // Dominant category
  if (summary.dominantCategory === 'sobhana') {
    description += 'โดดเด่นด้านธรรมสวยงาม (กุสลเจตสิก). ';
  } else if (summary.dominantCategory === 'akusala') {
    description += 'มีอกุสลธรรมเด่นชัด ควรระวังกิเลส. ';
  } else {
    description += 'เจตสิกสากลเป็นหลัก จิตปกติธรรมดา. ';
  }

  // Top factors
  description += `เจตสิกเด่นที่สุด: ${top5.map(f => f.name).join(', ')}.`;

  return description;
}

export default calculateCetasikaProfile;
