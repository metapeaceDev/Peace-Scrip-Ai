/**
 * Example Usage: Buddhist Psychology Features
 * Demonstrates how to use the integrated Buddhist psychology systems
 */

import type { Character } from '../types';
import { analyzeParamiPortfolio } from '../services/psychologyCalculator';
import { classifyKarmaWithJavana, actionsToSensoryInput } from '../services/psychologyEvolution';
import { calculateParamiSynergy, updateParamiFromAction } from '../services/paramiSystem';
import { JavanaDecisionEngine } from '../services/mindProcessors';
import { enableFeatureForDev } from '../config/featureFlags';
import { logger } from '../utils/logger';

// ============================================================================
// EXAMPLE 1: Enable Features in Development
// ============================================================================

function enableBuddhistPsychology() {
  if (import.meta.env.DEV) {
    enableFeatureForDev('JAVANA_DECISION_ENGINE');
    enableFeatureForDev('PARAMI_SYNERGY_MATRIX');
    logger.info('Buddhist Psychology features enabled');
  }
}

// ============================================================================
// EXAMPLE 2: Analyze Parami Portfolio
// ============================================================================

function exampleParamiAnalysis(character: Character) {
  const analysis = analyzeParamiPortfolio(character);

  if (!analysis) {
    logger.warn('Character has no parami portfolio');
    return;
  }

  logger.info('=== PARAMI ANALYSIS ===');
  logger.info(`Total Strength: ${analysis.totalParamiStrength}`);
  logger.info(
    `Strongest: ${analysis.strongestParami.name} (Level ${analysis.strongestParami.level})`
  );
  logger.info(`Weakest: ${analysis.weakestParami.name} (Level ${analysis.weakestParami.level})`);
  logger.info(`Overall Synergy Bonus: +${analysis.overallSynergyBonus}`);

  logger.info('\nTop 5 Paramis with Synergy:');
  analysis.synergyAnalysis.slice(0, 5).forEach((item, idx) => {
    logger.info(
      `${idx + 1}. ${item.parami}: Lv ${item.baseLevel} + ${item.synergyBonus} = ${item.effectiveLevel}`
    );
    logger.info(`   Supported by: ${item.supportingParamis.join(', ')}`);
  });
}

// ============================================================================
// EXAMPLE 3: Calculate Individual Parami Synergy
// ============================================================================

function exampleCalculateSynergy(character: Character) {
  if (!character.parami_portfolio) return;

  logger.info('=== INDIVIDUAL SYNERGY CALCULATIONS ===');

  const paramis: Array<keyof typeof character.parami_portfolio> = [
    'dana',
    'sila',
    'panna',
    'metta',
  ];

  paramis.forEach(parami => {
    const synergy = calculateParamiSynergy(parami, character.parami_portfolio!);
    const baseLevel = character.parami_portfolio![parami].level;
    const effectiveLevel = baseLevel + synergy;

    logger.info(`${parami}:`);
    logger.info(`  Base Level: ${baseLevel}`);
    logger.info(`  Synergy Bonus: +${synergy.toFixed(2)}`);
    logger.info(`  Effective Level: ${effectiveLevel.toFixed(2)}`);
  });
}

// ============================================================================
// EXAMPLE 4: Update Parami from Actions
// ============================================================================

function exampleUpdateParami(character: Character) {
  if (!character.parami_portfolio) return;

  logger.info('=== PARAMI UPDATE FROM ACTIONS ===');

  // Example: Character performs generous action
  const generousAction = {
    กาย: ['ช่วยเหลือผู้อื่น', 'แบ่งปันอาหาร'],
    วาจา: ['พูดให้กำลังใจ'],
    ใจ: ['มีใจเมตตา'],
  };

  const beforeDana = character.parami_portfolio.dana.exp;
  const updatedPortfolio = updateParamiFromAction(
    character.parami_portfolio,
    generousAction,
    'กุศลกรรม'
  );
  const afterDana = updatedPortfolio.dana.exp;

  logger.info(`Dana EXP: ${beforeDana} → ${afterDana} (+${afterDana - beforeDana})`);
  logger.info(`Dana Level: ${updatedPortfolio.dana.level}`);
}

// ============================================================================
// EXAMPLE 5: Convert Actions to Sensory Inputs
// ============================================================================

function exampleActionsToSensory() {
  logger.info('=== ACTIONS TO SENSORY INPUTS ===');

  const actions = {
    กาย: ['ทำร้ายผู้อื่น'],
    วาจา: ['พูดด่า'],
    ใจ: ['โกรธเคือง'],
  };

  const sensoryInputs = actionsToSensoryInput(actions);

  logger.info('Input Actions:', actions);
  logger.info('\nSensory Inputs:');
  sensoryInputs.forEach((input, idx) => {
    logger.info(`${idx + 1}. ${input.senseDoor} door:`);
    logger.info(`   Type: ${input.type}`);
    logger.info(`   Object: ${input.object}`);
    logger.info(`   Intensity: ${input.intensity}/100`);
  });
}

// ============================================================================
// EXAMPLE 6: Classify Karma with Javana Engine
// ============================================================================

function exampleKarmaClassification(character: Character) {
  console.log('=== KARMA CLASSIFICATION WITH JAVANA ===');

  const wholesomeActions = {
    กาย: ['ช่วยเหลือคนอื่น', 'บริจาคทาน'],
    วาจา: ['พูดดี', 'ให้กำลังใจ'],
    ใจ: ['มีเมตตา', 'ปล่อยวาง'],
  };

  const result = classifyKarmaWithJavana(wholesomeActions, character);

  console.log('Actions:', wholesomeActions);
  console.log('\nClassification Result:');
  console.log(`Type: ${result.type}`);
  console.log(`Intensity: ${result.intensity}`);
  console.log(`Dominant Carita: ${result.dominantCarita || 'N/A'}`);

  if (result.javana_results) {
    console.log('\nJavana Analysis:');
    result.javana_results.forEach((javana, idx) => {
      console.log(`${idx + 1}. ${javana.citta_type} (${javana.quality})`);
      console.log(`   Reasoning: ${javana.reasoning}`);
    });
  }
}

// ============================================================================
// EXAMPLE 7: Direct Javana Decision Engine
// ============================================================================

function exampleJavanaEngine(character: Character) {
  console.log('=== JAVANA DECISION ENGINE ===');

  // Create a sensory input
  const pleasantInput = {
    type: 'pleasant' as const,
    object: 'Beautiful scenery',
    intensity: 70,
    senseDoor: 'eye' as const,
  };

  const result = JavanaDecisionEngine.decide(pleasantInput, character);

  console.log('Sensory Input:', pleasantInput);
  console.log('\nJavana Decision:');
  console.log(`Citta Type: ${result.citta_type}`);
  console.log(`Quality: ${result.quality}`);
  console.log(`Hetu (Roots): ${result.hetu.join(', ')}`);
  console.log(`Vedana (Feeling): ${result.vedana}`);
  console.log(`Cetana Strength: ${result.cetana_strength}/100`);
  console.log(`Reasoning: ${result.reasoning}`);
}

// ============================================================================
// EXAMPLE 8: Complete Character Psychology Update
// ============================================================================

function exampleCompleteUpdate(character: Character) {
  console.log('=== COMPLETE PSYCHOLOGY UPDATE ===');

  const sceneActions = {
    กาย: ['ปกป้องคนอ่อนแอ', 'ช่วยเหลือผู้ประสบภัย'],
    วาจา: ['พูดความจริง', 'ให้กำลังใจ'],
    ใจ: ['มีเมตตา', 'ตั้งใจทำดี', 'มีสติ'],
  };

  // Step 1: Classify karma
  const karmaResult = classifyKarmaWithJavana(sceneActions, character);
  console.log('1. Karma Classification:', karmaResult.type, `(${karmaResult.intensity})`);

  // Step 2: Update paramis (if wholesome)
  if (karmaResult.type === 'กุศลกรรม' && character.parami_portfolio) {
    const updatedParami = updateParamiFromAction(
      character.parami_portfolio,
      sceneActions,
      karmaResult.type
    );
    console.log('2. Parami Updated:');
    console.log(`   Dana: ${updatedParami.dana.level} (${updatedParami.dana.exp} exp)`);
    console.log(`   Metta: ${updatedParami.metta.level} (${updatedParami.metta.exp} exp)`);

    // Step 3: Analyze synergy
    character.parami_portfolio = updatedParami;
    const analysis = analyzeParamiPortfolio(character);
    if (analysis) {
      console.log('3. Parami Analysis:');
      console.log(`   Total Strength: ${analysis.totalParamiStrength}`);
      console.log(`   Synergy Bonus: +${analysis.overallSynergyBonus}`);
    }
  }
}

// ============================================================================
// EXAMPLE 9: Test Different Character Types
// ============================================================================

function exampleCharacterTypes() {
  console.log('=== CHARACTER TYPE COMPARISONS ===');

  // Virtuous character
  const virtuousMonk: Partial<Character> = {
    name: 'Virtuous Monk',
    internal: {
      consciousness: {
        'สติ (Mindfulness)': 95,
        'ปัญญา (Wisdom)': 90,
      },
      subconscious: {},
      defilement: {
        โลภะ: 5,
        โทสะ: 5,
        โมหะ: 10,
      },
    },
    buddhist_psychology: {
      anusaya: {
        kama_raga: 10,
        patigha: 5,
        avijja: 15,
        mana: 8,
        ditthi: 5,
        vicikiccha: 3,
        bhava_raga: 12,
      },
      carita: 'สัทธาจริต',
    },
  };

  // Defiled character
  const defiledPerson: Partial<Character> = {
    name: 'Defiled Person',
    internal: {
      consciousness: {
        'สติ (Mindfulness)': 10,
        'ปัญญา (Wisdom)': 15,
      },
      subconscious: {},
      defilement: {
        โลภะ: 90,
        โทสะ: 85,
        โมหะ: 80,
      },
    },
    buddhist_psychology: {
      anusaya: {
        kama_raga: 95,
        patigha: 90,
        avijja: 85,
        mana: 70,
        ditthi: 60,
        vicikiccha: 50,
        bhava_raga: 75,
      },
      carita: 'ราคจริต',
    },
  };

  const pleasantInput = {
    type: 'pleasant' as const,
    object: 'Money and wealth',
    intensity: 80,
    senseDoor: 'eye' as const,
  };

  console.log('\n--- Virtuous Monk ---');
  const monkResult = JavanaDecisionEngine.decide(pleasantInput, virtuousMonk as Character);
  console.log(`Quality: ${monkResult.quality}`);
  console.log(`Cetana: ${monkResult.cetana_strength}/100`);
  console.log(`Reasoning: ${monkResult.reasoning}`);

  console.log('\n--- Defiled Person ---');
  const defiledResult = JavanaDecisionEngine.decide(pleasantInput, defiledPerson as Character);
  console.log(`Quality: ${defiledResult.quality}`);
  console.log(`Cetana: ${defiledResult.cetana_strength}/100`);
  console.log(`Reasoning: ${defiledResult.reasoning}`);
}

// ============================================================================
// MAIN DEMO FUNCTION
// ============================================================================

export function runBuddhistPsychologyDemo(character: Character) {
  console.log('\n🧘 BUDDHIST PSYCHOLOGY INTEGRATION DEMO 🧘\n');

  // Enable features (dev only)
  enableBuddhistPsychology();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Run examples
  exampleParamiAnalysis(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleCalculateSynergy(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleUpdateParami(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleActionsToSensory();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleKarmaClassification(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleJavanaEngine(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleCompleteUpdate(character);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exampleCharacterTypes();

  console.log('\n✅ Demo complete!\n');
}

// Export individual examples for selective use
export {
  enableBuddhistPsychology,
  exampleParamiAnalysis,
  exampleCalculateSynergy,
  exampleUpdateParami,
  exampleActionsToSensory,
  exampleKarmaClassification,
  exampleJavanaEngine,
  exampleCompleteUpdate,
  exampleCharacterTypes,
};

