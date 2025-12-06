/**
 * Psychology Evolution Tracker
 * Tracks and validates character psychology changes based on Buddhist principles
 * Implements กาย-วาจา-ใจ (Body-Speech-Mind) analysis
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
  plotPoint: string
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
    plotPoint,
    actions,
    consciousnessChanges,
    defilementChanges,
    anusayaChanges: Object.keys(anusayaChanges).length > 0 ? anusayaChanges : undefined,
    reasoning,
    karmaType: karmaResult.type,
    karmaIntensity: karmaResult.intensity,
    dominantCarita: karmaResult.dominantCarita,
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
  Object.entries(change.consciousnessChanges).forEach(([virtue, delta]) => {
    const current = newConsciousness[virtue] || 50;
    newConsciousness[virtue] = Math.max(0, Math.min(100, current + delta));
  });

  // Apply defilement changes
  Object.entries(change.defilementChanges).forEach(([defilement, delta]) => {
    const current = newDefilement[defilement] || 50;
    newDefilement[defilement] = Math.max(0, Math.min(100, current + delta));
  });

  // Apply Anusaya changes (if exists)
  let newAnusaya = character.buddhist_psychology?.anusaya;
  if (change.anusayaChanges && newAnusaya) {
    newAnusaya = { ...newAnusaya };
    Object.entries(change.anusayaChanges).forEach(([key, delta]) => {
      const anusayaKey = key as keyof typeof newAnusaya;
      if (newAnusaya && typeof newAnusaya[anusayaKey] === 'number') {
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
  sceneNumber: number,
  plotPoint: string
): PsychologySnapshot {
  const profile = calculatePsychologyProfile(character);

  return {
    sceneNumber,
    plotPoint,
    consciousness: { ...character.internal.consciousness },
    defilement: { ...character.internal.defilement },
    mentalBalance: profile.mentalBalance,
    dominantEmotion: profile.dominantEmotion,
    buddhist_psychology: character.buddhist_psychology
      ? {
          anusaya: { ...character.buddhist_psychology.anusaya },
          carita: character.buddhist_psychology.carita,
          carita_secondary: character.buddhist_psychology.carita_secondary,
        }
      : undefined,
  };
}

/**
 * Initialize psychology timeline for a character
 */
export function initializePsychologyTimeline(character: Character): CharacterPsychologyTimeline {
  const initialProfile = calculatePsychologyProfile(character);

  return {
    characterId: character.id,
    characterName: character.name,
    snapshots: [
      {
        sceneNumber: 0,
        plotPoint: 'เริ่มต้น',
        consciousness: { ...character.internal.consciousness },
        defilement: { ...character.internal.defilement },
        mentalBalance: initialProfile.mentalBalance,
        dominantEmotion: initialProfile.dominantEmotion,
        buddhist_psychology: character.buddhist_psychology
          ? {
              anusaya: { ...character.buddhist_psychology.anusaya },
              carita: character.buddhist_psychology.carita,
              carita_secondary: character.buddhist_psychology.carita_secondary,
            }
          : undefined,
      },
    ],
    changes: [],
    overallArc: {
      startingBalance: initialProfile.mentalBalance,
      endingBalance: initialProfile.mentalBalance,
      totalChange: 0,
      direction: 'คงที่',
      interpretation: 'ยังไม่มีการเปลี่ยนแปลง',
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
  plotPoint: string
): { timeline: CharacterPsychologyTimeline; updatedCharacter: Character } {
  // Calculate changes from this scene
  const change = calculatePsychologyChanges(character, scene, plotPoint);

  // Apply changes to get updated character
  const updatedCharacter = applyPsychologyChanges(character, change);

  // Create snapshot of new state
  const snapshot = createPsychologySnapshot(updatedCharacter, scene.sceneNumber, plotPoint);

  // Update timeline
  const newTimeline: CharacterPsychologyTimeline = {
    ...timeline,
    snapshots: [...timeline.snapshots, snapshot],
    changes: [...timeline.changes, change],
    overallArc: calculateOverallArc(timeline.snapshots[0], snapshot, [...timeline.changes, change]),
  };

  return { timeline: newTimeline, updatedCharacter };
}

/**
 * Calculate overall character arc interpretation
 */
function calculateOverallArc(
  start: PsychologySnapshot,
  end: PsychologySnapshot,
  changes: PsychologyChange[]
): CharacterPsychologyTimeline['overallArc'] {
  const totalChange = end.mentalBalance - start.mentalBalance;

  let direction: 'กุศลขึ้น' | 'กุศลลง' | 'คงที่';
  let interpretation: string;

  if (totalChange > 10) {
    direction = 'กุศลขึ้น';
    interpretation = `ตัวละครพัฒนาไปในทางที่ดีขึ้น เพิ่มสติปัญญา ลดกิเลส (${totalChange.toFixed(1)} คะแนน)`;
  } else if (totalChange < -10) {
    direction = 'กุศลลง';
    interpretation = `ตัวละครตกต่ำลง เพิ่มกิเลส ลดสติปัญญา (${totalChange.toFixed(1)} คะแนน)`;
  } else {
    direction = 'คงที่';
    interpretation = `ตัวละครมีการเปลี่ยนแปลงเล็กน้อย ยังคงสมดุลใกล้เคียงเดิม`;
  }

  // Count karma types
  const wholesomeCount = changes.filter(c => c.karmaType === 'กุศลกรรม').length;
  const unwholesomeCount = changes.filter(c => c.karmaType === 'อกุศลกรรม').length;

  interpretation += `\n\nตลอดเรื่อง: กุศลกรรม ${wholesomeCount} ครั้ง, อกุศลกรรม ${unwholesomeCount} ครั้ง`;

  // Buddhist interpretation
  if (direction === 'กุศลขึ้น') {
    interpretation += `\n\nตามหลักธรรม: ตัวละครนี้แสดงให้เห็นถึงการพัฒนาจิตใจ ผ่านการกระทำที่ถูกต้อง (สัมมากัมมันตะ) และการเจริญสติปัญญา`;
  } else if (direction === 'กุศลลง') {
    interpretation += `\n\nตามหลักธรรม: ตัวละครนี้แสดงให้เห็นถึงการตกต่ำ เพราะถูกครอบงำด้วยกิเลส (ราคะ โทสะ โมหะ) ขาดสติและปัญญาในการรู้เท่าทัน`;
  }

  return {
    startingBalance: start.mentalBalance,
    endingBalance: end.mentalBalance,
    totalChange,
    direction,
    interpretation,
  };
}

/**
 * Validate if character arc follows Buddhist principles
 */
export function validateCharacterArc(timeline: CharacterPsychologyTimeline): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const { totalChange } = timeline.overallArc;

  // Check for unrealistic jumps
  timeline.snapshots.forEach((snapshot, i) => {
    if (i === 0) return;

    const prev = timeline.snapshots[i - 1];
    const change = snapshot.mentalBalance - prev.mentalBalance;

    if (Math.abs(change) > 20) {
      warnings.push(
        `ฉาก ${snapshot.sceneNumber}: การเปลี่ยนแปลงจิตใจรุนแรงเกินไป (${change.toFixed(1)} คะแนน) ควรเป็นไปอย่างค่อยเป็นค่อยไป`
      );
    }
  });

  // Check for meaningful character development
  if (Math.abs(totalChange) < 5 && timeline.snapshots.length > 5) {
    warnings.push(
      `ตัวละครมีการพัฒนาน้อยเกินไป (${totalChange.toFixed(1)} คะแนน) ในขณะที่มี ${timeline.snapshots.length} ฉาก`
    );
    recommendations.push(
      'ควรเพิ่มจุดเปลี่ยนสำคัญที่ทำให้ตัวละครเกิดการเปลี่ยนแปลงทางจิตใจอย่างชัดเจน'
    );
  }

  // Check for consistency with Buddhist principles
  const wholesomeScenes = timeline.changes.filter(c => c.karmaType === 'กุศลกรรม').length;
  const unwholesomeScenes = timeline.changes.filter(c => c.karmaType === 'อกุศลกรรม').length;

  if (wholesomeScenes > unwholesomeScenes && totalChange < 0) {
    warnings.push(
      'ขัดหลักกรรม: ตัวละครทำกุศลกรรมมากกว่า แต่กลับมีจิตใจแย่ลง ไม่สอดคล้องกับหลักธรรม'
    );
    recommendations.push(
      'ควรปรับการกระทำหรือผลลัพธ์ให้สอดคล้องกับหลักกรรม: กุศลกรรม → สุข, อกุศลกรรม → ทุกข์'
    );
  }

  if (unwholesomeScenes > wholesomeScenes && totalChange > 0) {
    warnings.push(
      'ขัดหลักกรรม: ตัวละครทำอกุศลกรรมมากกว่า แต่กลับมีจิตใจดีขึ้น ไม่สอดคล้องกับหลักธรรม'
    );
    recommendations.push('ควรเพิ่มฉากที่ตัวละครได้รับผลของกรรม หรือมีการกลับตัวอย่างชัดเจน');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    recommendations,
  };
}
