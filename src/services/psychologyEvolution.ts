/**
 * Psychology Evolution Tracker
 * Tracks and validates character psychology changes based on Buddhist principles
 * Implements กาย-วาจา-ใจ (Body-Speech-Mind) analysis
 * 
 * UPDATED: Now uses Digital Mind Model v14 systems
 * - Ready for JavanaDecisionEngine integration (coming soon)
 * - Ready for ParamiUpdater integration (coming soon)
 * - Ready for ChittaVithiGenerator integration (coming soon)
 */

import type {
  Character,
  GeneratedScene,
  PsychologyChange,
  PsychologySnapshot,
  CharacterPsychologyTimeline,
  ActionAnalysis,
  CaritaType,
  KarmaIntensity,
} from '../../types';
import { calculatePsychologyProfile } from './psychologyCalculator';

// Future integrations (ready to use when needed)
// import { JavanaDecisionEngine, ChittaVithiGenerator, type SensoryInput } from './mindProcessors';
// import { ParamiUpdater } from './paramiSystem';
// import { TanhaToUpadana_Escalator } from './advancedProcessors';

/**
 * Analyze a scene to extract กาย-วาจา-ใจ (Body-Speech-Mind) actions
 */
export function analyzeSceneActions(scene: GeneratedScene, characterName: string): ActionAnalysis {
  const กาย: string[] = []; // Physical actions
  const วาจา: string[] = []; // Speech patterns
  const ใจ: string[] = []; // Mental states

  scene.sceneDesign.situations.forEach(situation => {
    // Extract physical actions from description
    if (situation.description.includes(characterName)) {
      กาย.push(situation.description);
    }

    // Extract thoughts/mental states
    if (situation.characterThoughts && situation.characterThoughts.includes(characterName)) {
      ใจ.push(situation.characterThoughts);
    }

    // Extract dialogue
    situation.dialogue
      .filter(d => d.character === characterName)
      .forEach(d => {
        วาจา.push(d.dialogue);
      });
  });

  return { กาย, วาจา, ใจ };
}

/**
 * Enhanced Buddhist Karma Classification
 * Analyzes actions with intensity levels and context awareness
 * Based on Digital Mind Model v14 principles
 */
function classifyKarma(
  actions: ActionAnalysis,
  character: Character
): {
  type: 'กุศลกรรม' | 'อกุศลกรรม' | 'เฉยๆ';
  intensity: KarmaIntensity;
  dominantCarita?: CaritaType;
} {
  const text = [...actions.กาย, ...actions.วาจา, ...actions.ใจ].join(' ').toLowerCase();

  // WHOLESOME KEYWORDS (100+ comprehensive list)
  const wholesomeKeywords = {
    // Generosity & Compassion (ทาน, เมตตา, กรุณา)
    mild: ['ช่วย', 'ให้', 'แบ่งปัน', 'help', 'give', 'share', 'support'],
    moderate: ['เมตตา', 'กรุณา', 'เห็นอกเห็นใจ', 'compassion', 'sympathy', 'care for'],
    severe: ['เสียสละ', 'บริจาค', 'อุทิศตน', 'sacrifice', 'dedicate', 'devote'],
    extreme: ['สละชีพ', 'ยอมตาย', 'ชีวิตเพื่อผู้อื่น', 'martyrdom', 'ultimate sacrifice'],

    // Patience & Forgiveness (ขันติ)
    patience_mild: ['อดทน', 'รอคอย', 'patience', 'wait', 'endure'],
    patience_moderate: ['อดกลั้น', 'ยับยั้ง', 'restraint', 'self-control'],
    patience_severe: ['ให้อภัย', 'ปล่อยวาง', 'forgive', 'let go'],
    patience_extreme: ['ให้อภัยข้าศึก', 'รักศัตรู', 'forgive enemy', 'love antagonist'],

    // Wisdom & Mindfulness (ปัญญา, สติ)
    wisdom_mild: ['เข้าใจ', 'รู้เท่าทัน', 'understand', 'aware', 'realize'],
    wisdom_moderate: ['ตั้งสติ', 'พิจารณา', 'mindful', 'contemplate', 'reflect'],
    wisdom_severe: ['เห็นแจ้ง', 'รู้แจ้ง', 'insight', 'enlightened understanding'],
    wisdom_extreme: ['บรรลุธรรม', 'ตรัสรู้', 'enlightenment', 'awakening'],

    // Truthfulness (สัจจะ)
    truth_mild: ['บอกความจริง', 'ซื่อสัตย์', 'tell truth', 'honest'],
    truth_moderate: ['จริงใจ', 'ไม่หลอกลวง', 'sincere', 'genuine'],
    truth_severe: ['รักษาคำพูด', 'ยึดมั่นในความจริง', 'keep promise', 'uphold truth'],

    // Protection & Righteousness (ปกป้อง, ความชอบธรรม)
    protect_mild: ['ปกป้อง', 'คุ้มครอง', 'protect', 'guard', 'defend'],
    protect_moderate: ['ปฏิเสธความชั่ว', 'ไม่ยอม', 'refuse evil', 'resist'],
    protect_severe: ['ต่อสู้ความอยุติธรรม', 'ยืนหยัดในธรรม', 'fight injustice', 'stand for dharma'],

    // Peace & Calmness (สงบ, อุเบกขา)
    peace_mild: ['สงบ', 'ใจเย็น', 'calm', 'peaceful', 'tranquil'],
    peace_moderate: ['ไม่โกรธ', 'ปล่อยวาง', 'not angry', 'equanimous'],
    peace_severe: ['อุเบกขา', 'วางเฉย', 'equanimity', 'non-attachment'],

    // Joy & Appreciation (มุทิตา)
    joy_mild: ['ดีใจ', 'ยินดี', 'happy', 'glad', 'pleased'],
    joy_moderate: ['ชื่นชม', 'ร่วมยินดี', 'appreciate', 'rejoice'],
    joy_severe: ['มุทิตา', 'ยินดีในความดีของผู้อื่น', 'sympathetic joy'],
  };

  // UNWHOLESOME KEYWORDS (100+ comprehensive list)
  const unwholesomeKeywords = {
    // Greed (โลภะ)
    greed_mild: ['อยาก', 'ต้องการ', 'want', 'desire', 'crave'],
    greed_moderate: ['โลภ', 'ละโมบ', 'greedy', 'covet'],
    greed_severe: ['แย่ง', 'ฉกฉวย', 'steal', 'rob', 'seize'],
    greed_extreme: ['ขโมย', 'ลัก', 'ปล้น', 'theft', 'robbery', 'plunder'],

    // Anger (โทสะ)
    anger_mild: ['รำคาญ', 'ขุ่นเคือง', 'annoyed', 'irritated'],
    anger_moderate: ['โกรธ', 'ขัดเคือง', 'angry', 'furious'],
    anger_severe: ['เกลียด', 'พยาบาท', 'hate', 'hatred', 'malice'],
    anger_extreme: ['ทำร้าย', 'ฆ่า', 'ทำลาย', 'harm', 'kill', 'destroy'],

    // Delusion (โมหะ)
    delusion_mild: ['สงสัย', 'ลังเล', 'doubt', 'hesitate', 'confused'],
    delusion_moderate: ['หลง', 'ไม่เข้าใจ', 'deluded', 'ignorant'],
    delusion_severe: ['หลงผิด', 'เชื่อผิด', 'wrong belief', 'misconception'],
    delusion_extreme: ['ยึดมั่นในความเห็นผิด', 'ทิฏฐิ', 'fixed wrong view', 'dogma'],

    // Pride (มานะ)
    pride_mild: ['ภูมิใจ', 'ถือตัว', 'proud', 'conceited'],
    pride_moderate: ['หยิ่ง', 'ดูถูก', 'arrogant', 'scornful'],
    pride_severe: ['เย่อหยิ่ง', 'ดูหมิ่น', 'haughty', 'disdainful'],
    pride_extreme: ['ถือตัวสูงส่ง', 'มองข้ามผู้อื่น', 'supremacy', 'contempt'],

    // Dishonesty (โกหก)
    dishonest_mild: ['ปกปิด', 'ไม่บอก', 'hide', 'conceal'],
    dishonest_moderate: ['โกหก', 'หลอกลวง', 'lie', 'deceive'],
    dishonest_severe: ['โกง', 'ฉ้อโกง', 'cheat', 'fraud'],
    dishonest_extreme: ['หักหลัง', 'ทรยศ', 'betray', 'treachery'],

    // Jealousy (อิสสา)
    jealousy_mild: ['อิจฉา', 'ริษยา', 'envious', 'jealous'],
    jealousy_moderate: ['ไม่พอใจเมื่อผู้อื่นดี', 'resentful of others'],
    jealousy_severe: ['ต้องการทำลายผู้อื่น', 'wish harm on others'],

    // Harmful Speech (วจีทุจริต)
    speech_mild: ['พูดร้าย', 'นินทา', 'gossip', 'slander'],
    speech_moderate: ['ด่า', 'ดูถูก', 'insult', 'mock'],
    speech_severe: ['สบประมาท', 'ใส่ร้าย', 'defame', 'vilify'],

    // Restlessness (อุทธัจจะ)
    restless_mild: ['กระวนกระวาย', 'ไม่สงบ', 'restless', 'agitated'],
    restless_moderate: ['ฟุ้งซ่าน', 'วุ่นวาย', 'distracted', 'scattered'],

    // Laziness (โกสัชชะ)
    lazy_mild: ['เกียจคร้าน', 'ไม่อยากทำ', 'lazy', 'reluctant'],
    lazy_moderate: ['หนีหน้าที่', 'ไม่รับผิดชอบ', 'avoid duty', 'irresponsible'],

    // Shamelessness (อหิริกะ, อโนตตัปปะ)
    shameless_mild: ['ไม่ละอาย', 'ไม่กลัวบาป', 'shameless', 'unafraid of sin'],
    shameless_moderate: ['ทำชั่วไม่สำนึก', 'do evil without remorse'],
  };

  // Count matches with intensity weighting
  let wholesomeScore = 0;
  let unwholesomeScore = 0;
  let maxIntensity: 'mild' | 'moderate' | 'severe' | 'extreme' = 'mild';

  // Analyze wholesome keywords
  Object.entries(wholesomeKeywords).forEach(([category, keywords]) => {
    const matches = (keywords as string[]).filter(kw => text.includes(kw)).length;
    if (matches > 0) {
      if (category.includes('extreme')) {
        wholesomeScore += matches * 10;
        maxIntensity = 'extreme';
      } else if (category.includes('severe')) {
        wholesomeScore += matches * 5;
        if (maxIntensity !== 'extreme') maxIntensity = 'severe';
      } else if (category.includes('moderate')) {
        wholesomeScore += matches * 2;
        if (maxIntensity === 'mild') maxIntensity = 'moderate';
      } else {
        wholesomeScore += matches * 1;
      }
    }
  });

  // Analyze unwholesome keywords
  Object.entries(unwholesomeKeywords).forEach(([category, keywords]) => {
    const matches = (keywords as string[]).filter(kw => text.includes(kw)).length;
    if (matches > 0) {
      if (category.includes('extreme')) {
        unwholesomeScore += matches * 10;
        maxIntensity = 'extreme';
      } else if (category.includes('severe')) {
        unwholesomeScore += matches * 5;
        if (maxIntensity !== 'extreme') maxIntensity = 'severe';
      } else if (category.includes('moderate')) {
        unwholesomeScore += matches * 2;
        if (maxIntensity === 'mild') maxIntensity = 'moderate';
      } else {
        unwholesomeScore += matches * 1;
      }
    }
  });

  // Check character's Anusaya influence
  const anusaya = character.buddhist_psychology?.anusaya;
  if (anusaya) {
    // If unwholesome action aligns with strong anusaya, increase its score
    if (unwholesomeScore > 0) {
      if (text.includes('โกรธ') || text.includes('anger')) {
        unwholesomeScore += (anusaya.patigha / 100) * 2;
      }
      if (text.includes('โลภ') || text.includes('greed')) {
        unwholesomeScore += (anusaya.kama_raga / 100) * 2;
      }
      if (text.includes('หลง') || text.includes('confused')) {
        unwholesomeScore += (anusaya.avijja / 100) * 2;
      }
    }
  }

  // Determine type
  let type: 'กุศลกรรม' | 'อกุศลกรรม' | 'เฉยๆ';
  if (wholesomeScore > unwholesomeScore && wholesomeScore > 0) {
    type = 'กุศลกรรม';
  } else if (unwholesomeScore > wholesomeScore && unwholesomeScore > 0) {
    type = 'อกุศลกรรม';
  } else {
    type = 'เฉยๆ';
    maxIntensity = 'mild';
  }

  return {
    type,
    intensity: maxIntensity,
    dominantCarita: character.buddhist_psychology?.carita,
  };
}

/**
 * Calculate psychology changes based on actions following Buddhist principles
 * กุศลกรรม → increases consciousness, decreases defilement
 * อกุศลกรรม → decreases consciousness, increases defilement
 */
export function calculatePsychologyChanges(
  character: Character,
  scene: GeneratedScene,
  _plotPoint: string
): PsychologyChange {
  const actions = analyzeSceneActions(scene, character.name);
  const karmaResult = classifyKarma(actions, character);

  const consciousnessChanges: Record<string, number> = {};
  const defilementChanges: Record<string, number> = {};
  const anusayaChanges: Partial<Record<keyof import('../../types').AnusayaProfile, number>> = {};
  let reasoning = '';

  // Dynamic change amount based on karma intensity
  const intensityMultiplier = {
    mild: 1.0,
    moderate: 2.0,
    severe: 4.0,
    extreme: 8.0,
  };
  const baseChange = 2 * intensityMultiplier[karmaResult.intensity];

  if (karmaResult.type === 'กุศลกรรม') {
    // Wholesome actions increase virtues
    // Increase mindfulness and wisdom (most universal)
    consciousnessChanges['Mindfulness (remembrance)'] = baseChange;
    consciousnessChanges['Wisdom (right view)'] = baseChange * 0.5;

    // Specific virtues based on action keywords
    const text = [...actions.กาย, ...actions.วาจา, ...actions.ใจ].join(' ').toLowerCase();

    if (text.includes('ช่วย') || text.includes('give') || text.includes('เมตตา')) {
      consciousnessChanges['Karuna (Compassion, knowing suffering)'] = baseChange;
    }
    if (text.includes('อดทน') || text.includes('patience') || text.includes('อดกลั้น')) {
      consciousnessChanges['Hiri (Shame of sin)'] = baseChange;
    }
    if (text.includes('ดีใจ') || text.includes('happy') || text.includes('ชื่นชม')) {
      consciousnessChanges['Mudita (Joy in happiness)'] = baseChange;
    }

    // Decrease strongest defilement
    const profile = calculatePsychologyProfile(character);
    const strongestDefilement = profile.strongestDefilement;
    defilementChanges[strongestDefilement] = -baseChange;

    // Affect Anusaya (latent tendencies) - slower but permanent change
    if (character.buddhist_psychology?.anusaya) {
      const anusayaReduction = baseChange * 0.1; // 10% of main change
      if (text.includes('ให้อภัย') || text.includes('forgive')) {
        anusayaChanges.patigha = -anusayaReduction;
      }
      if (text.includes('ปัญญา') || text.includes('wisdom')) {
        anusayaChanges.avijja = -anusayaReduction;
      }
      if (text.includes('เนกขัมมะ') || text.includes('renunciation')) {
        anusayaChanges.kama_raga = -anusayaReduction;
      }
    }

    reasoning = `กุศลกรรม (${karmaResult.intensity}): การกระทำทางกาย-วาจา-ใจที่ดี เพิ่มสติปัญญา ลดกิเลส`;
  } else if (karmaResult.type === 'อกุศลกรรม') {
    // Unwholesome actions increase defilements
    const text = [...actions.กาย, ...actions.วาจา, ...actions.ใจ].join(' ').toLowerCase();

    if (text.includes('โกรธ') || text.includes('anger') || text.includes('ด่า')) {
      defilementChanges['Anger (Anger)'] = baseChange;
      if (character.buddhist_psychology?.anusaya) {
        anusayaChanges.patigha = baseChange * 0.15; // Strengthen latent tendency
      }
    }
    if (text.includes('โลภ') || text.includes('greed') || text.includes('แย่ง')) {
      defilementChanges['Lobha (Greed)'] = baseChange;
      if (character.buddhist_psychology?.anusaya) {
        anusayaChanges.kama_raga = baseChange * 0.15;
      }
    }
    if (text.includes('หลง') || text.includes('confused') || text.includes('สงสัย')) {
      defilementChanges['Moha (delusion)'] = baseChange;
      if (character.buddhist_psychology?.anusaya) {
        anusayaChanges.avijja = baseChange * 0.15;
      }
    }
    if (text.includes('หยิ่ง') || text.includes('proud') || text.includes('ถือตัว')) {
      defilementChanges['Mana (arrogance)'] = baseChange;
      if (character.buddhist_psychology?.anusaya) {
        anusayaChanges.mana = baseChange * 0.15;
      }
    }

    // Decrease mindfulness and wisdom
    consciousnessChanges['Mindfulness (remembrance)'] = -baseChange;
    consciousnessChanges['Wisdom (right view)'] = -baseChange * 0.5;

    reasoning = `อกุศลกรรม (${karmaResult.intensity}): การกระทำทางกาย-วาจา-ใจที่ไม่ดี เพิ่มกิเลส ลดสติปัญญา`;
  } else {
    reasoning = `การกระทำเป็นกลาง ไม่มีผลเปลี่ยนแปลงที่เด่นชัด`;
  }

  return {
    sceneNumber: scene.sceneNumber,
    timestamp: new Date(),
    action: actions,
    karma_type: karmaResult.type,
    karma_intensity: karmaResult.intensity,
    consciousness_delta: consciousnessChanges,
    defilement_delta: defilementChanges,
    anusaya_delta: Object.keys(anusayaChanges).length > 0 ? anusayaChanges : undefined,
    reasoning,
  };
}

/**
 * Apply psychology changes to character (immutable update)
 * Now includes Anusaya (latent tendencies) updates
 */
export function applyPsychologyChanges(character: Character, change: PsychologyChange): Character {
  const newConsciousness = { ...character.internal.consciousness };
  const newDefilement = { ...character.internal.defilement };

  // Apply consciousness changes
  Object.entries(change.consciousness_delta).forEach(([virtue, delta]) => {
    const current = newConsciousness[virtue] || 50;
    newConsciousness[virtue] = Math.max(0, Math.min(100, current + (delta as number)));
  });

  // Apply defilement changes
  Object.entries(change.defilement_delta).forEach(([defilement, delta]) => {
    const current = newDefilement[defilement] || 50;
    newDefilement[defilement] = Math.max(0, Math.min(100, current + (delta as number)));
  });

  // Apply Anusaya changes (if exists)
  let newAnusaya = character.buddhist_psychology?.anusaya;
  if (change.anusaya_delta && newAnusaya) {
    newAnusaya = { ...newAnusaya };
    Object.entries(change.anusaya_delta).forEach(([key, delta]) => {
      const anusayaKey = key as keyof typeof newAnusaya;
      if (newAnusaya && typeof newAnusaya[anusayaKey] === 'number' && delta !== undefined) {
        newAnusaya[anusayaKey] = Math.max(0, Math.min(100, newAnusaya[anusayaKey] + delta));
      }
    });
  }

  return {
    ...character,
    internal: {
      ...character.internal,
      consciousness: newConsciousness,
      defilement: newDefilement,
    },
    buddhist_psychology: newAnusaya
      ? {
          ...character.buddhist_psychology!,
          anusaya: newAnusaya,
        }
      : character.buddhist_psychology,
  };
}

/**
 * Create psychology snapshot of character at current state
 */
export function createPsychologySnapshot(
  character: Character,
  sceneNumber: number
): PsychologySnapshot {
  return {
    sceneNumber,
    consciousness: { ...character.internal.consciousness },
    defilement: { ...character.internal.defilement },
    anusaya: character.buddhist_psychology?.anusaya
      ? { ...character.buddhist_psychology.anusaya }
      : undefined,
    parami: character.parami_portfolio
      ? { ...character.parami_portfolio }
      : undefined,
    current_bhumi: character.mind_state?.current_bhumi,
    magga_stage: character.mind_state?.magga_stage,
  };
}

/**
 * Initialize psychology timeline for a character
 */
export function initializePsychologyTimeline(character: Character): CharacterPsychologyTimeline {
  return {
    characterId: character.id,
    characterName: character.name,
    changes: [],
    snapshots: [createPsychologySnapshot(character, 0)],
    summary: {
      total_kusala: 0,
      total_akusala: 0,
      net_progress: 0,
      dominant_pattern: 'เริ่มต้น',
    },
  };
}

/**
 * Update psychology timeline with new scene
 */
export function updatePsychologyTimeline(
  timeline: CharacterPsychologyTimeline,
  character: Character,
  scene: GeneratedScene,
  _plotPoint: string
): { timeline: CharacterPsychologyTimeline; updatedCharacter: Character } {
  // Calculate changes from this scene
  const change = calculatePsychologyChanges(character, scene, _plotPoint);

  // Apply changes to get updated character
  const updatedCharacter = applyPsychologyChanges(character, change);

  // Create snapshot of new state
  const snapshot = createPsychologySnapshot(updatedCharacter, scene.sceneNumber);

  // Calculate summary statistics
  const allChanges = [...timeline.changes, change];
  const kusalaCount = allChanges.filter(c => c.karma_type === 'กุศลกรรม').length;
  const akusalaCount = allChanges.filter(c => c.karma_type === 'อกุศลกรรม').length;

  // Update timeline
  const newTimeline: CharacterPsychologyTimeline = {
    ...timeline,
    snapshots: [...timeline.snapshots, snapshot],
    changes: allChanges,
    summary: {
      total_kusala: kusalaCount,
      total_akusala: akusalaCount,
      net_progress: kusalaCount - akusalaCount,
      dominant_pattern: kusalaCount > akusalaCount ? 'กุศลเด่น' : akusalaCount > kusalaCount ? 'อกุศลเด่น' : 'สมดุล',
    },
  };

  return { timeline: newTimeline, updatedCharacter };
}


/**
 * Validate if character arc follows Buddhist principles (simplified version)
 */
export function validateCharacterArc(timeline: CharacterPsychologyTimeline): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const { total_kusala, total_akusala, net_progress } = timeline.summary;

  // Check for meaningful character development
  if (timeline.snapshots.length > 5 && total_kusala === 0 && total_akusala === 0) {
    warnings.push(
      `ตัวละครไม่มีการพัฒนาเลย ในขณะที่มี ${timeline.snapshots.length} ฉาก`
    );
    recommendations.push(
      'ควรเพิ่มจุดเปลี่ยนสำคัญที่ทำให้ตัวละครเกิดการเปลี่ยนแปลงทางจิตใจ'
    );
  }

  // Check Buddhist principle consistency
  if (total_kusala > total_akusala && net_progress < -10) {
    warnings.push(
      'ขัดหลักกรรม: ตัวละครทำกุศลกรรมมากกว่า แต่กลับมีพัฒนาการแย่ลง'
    );
    recommendations.push(
      'ควรปรับผลลัพธ์ให้สอดคล้องกับหลักกรรม: กุศลกรรม → ผลดี'
    );
  }

  if (total_akusala > total_kusala && net_progress > 10) {
    warnings.push(
      'ขัดหลักกรรม: ตัวละครทำอกุศลกรรมมากกว่า แต่กลับมีพัฒนาการดีขึ้น'
    );
    recommendations.push(
      'ควรเพิ่มฉากที่ตัวละครได้รับผลของกรรม หรือมีการกลับตัว'
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
    recommendations,
  };
}
