/**
 * 🎬 Video Motion Engine
 *
 * Converts character psychology + shot data into detailed motion parameters
 * for AnimateDiff video generation.
 *
 * Features:
 * - Character Motion Intelligence (psychology → movement)
 * - Camera Movement Choreography (15 movement types)
 * - Timing & Pacing Intelligence (duration-aware)
 * - Environmental Motion (living backgrounds)
 */

import type { Character, GeneratedScene } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MotionContext {
  characterMotion: string;
  cameraMovement: string;
  timing: string;
  environmentalMotion: string;
}

export interface ShotData {
  shot?: number;
  scene?: string;
  description: string;
  movement?: string;
  equipment?: string;
  shotSize?: string;
  durationSec?: number;
  perspective?: string;
  visualEffects?: string;
  cast?: string;
  aspectRatio?: string;
}

// Movement type definitions
export type CameraMovementType =
  | 'Pan Left'
  | 'Pan Right'
  | 'Tilt Up'
  | 'Tilt Down'
  | 'Dolly In'
  | 'Dolly Out'
  | 'Track Left'
  | 'Track Right'
  | 'Crane Up'
  | 'Crane Down'
  | 'Zoom In'
  | 'Zoom Out'
  | 'Follow'
  | 'Arc'
  | 'Handheld'
  | 'Static';

export type EquipmentType = 'Steadicam' | 'Dolly' | 'Crane' | 'Handheld' | 'Gimbal' | 'Tripod';

export type ShotSize = 'ECU' | 'CU' | 'MS' | 'LS' | 'EWS' | 'WS';

// ============================================
// MOTION MAPPING TABLES
// ============================================

const MOOD_TO_SPEED: Record<string, string> = {
  peaceful: 'smooth, relaxed, unhurried',
  joyful: 'light, bouncy, cheerful',
  angry: 'sharp, aggressive, forceful',
  fearful: 'quick, nervous, hesitant',
  confused: 'hesitant steps, looking around',
  excited: 'energetic, lively, animated',
  sad: 'slow, heavy, dragging',
  calm: 'steady, measured, composed',
  anxious: 'fidgety, restless, twitchy',
  determined: 'purposeful, direct, confident',
};

const ENERGY_TO_SPEED = {
  high: (energy: number) => (energy > 70 ? 'brisk, energetic, animated' : 'normal, realistic'),
  low: (energy: number) => (energy < 30 ? 'slow, lethargic, tired' : 'normal, realistic'),
  normal: () => 'natural, realistic',
};

const CARITA_TO_MANNERISMS: Record<string, string> = {
  คนธจริต: 'meditative stillness, contemplative movements',
  วิตกจริต: 'contemplative movements, meditative stillness',
  ทิฏฐิจริต: 'analytical gestures, precise movements',
  ราคจริต: 'prideful stance, elevated chin',
  โลภจริต: 'grasping gestures, reaching movements',
  โมหจริต: 'uncertain movements, confused glances',
};

const CAMERA_MOVEMENT_MAP: Record<
  CameraMovementType,
  (equipment?: string, shotSize?: string) => string
> = {
  'Pan Left': () => 'Smooth horizontal pan moving left, revealing scene',
  'Pan Right': () => 'Smooth horizontal pan moving right, revealing scene',
  'Tilt Up': () => 'Vertical smooth tilt upward, following action',
  'Tilt Down': () => 'Vertical smooth tilt downward, following action',
  'Dolly In': () => 'Moving closer to subject, intensifying focus',
  'Dolly Out': () => 'Moving away from subject, revealing context',
  'Track Left': () => 'Smooth tracking shot moving left, parallel to subject',
  'Track Right': () => 'Smooth tracking shot moving right, parallel to subject',
  'Crane Up': () => 'Elevated movement rising upward, dramatic reveal',
  'Crane Down': () => 'Elevated movement descending, intimate approach',
  'Zoom In': () => 'Optical zoom moving closer, focusing on details',
  'Zoom Out': () => 'Optical zoom pulling back, revealing wider view',
  Follow: () => 'Following subject movement, maintaining distance',
  Arc: () => 'Circular path around subject, dynamic perspective',
  Handheld: () => 'Natural camera shake, documentary feel, organic movement',
  Static: () => 'No camera movement, stable frame, locked shot',
};

const EQUIPMENT_TO_SMOOTHNESS: Record<EquipmentType, string> = {
  Steadicam: 'very smooth, stabilized, fluid motion',
  Dolly: 'smooth, controlled, professional tracking',
  Crane: 'smooth, elevated, sweeping movements',
  Handheld: 'natural shake, organic, documentary feel',
  Gimbal: 'stabilized, fluid, modern feel',
  Tripod: 'locked, static, no movement',
};

const SHOT_SIZE_TO_SPEED: Record<ShotSize, string> = {
  ECU: 'slow, deliberate, intimate',
  CU: 'slow, deliberate, emotional',
  MS: 'normal, steady, balanced',
  LS: 'moderate, sweeping, establishing',
  EWS: 'moderate, sweeping, grand',
  WS: 'moderate, sweeping, contextual',
};

const LOCATION_TO_MOTION: Record<string, string> = {
  market: 'crowd walking naturally, vendors gesturing, fabric banners swaying',
  street: 'cars passing, pedestrians walking, leaves blowing in wind',
  ถนน: 'cars passing, pedestrians walking, leaves blowing in wind',
  forest: 'trees swaying, leaves falling, dappled light filtering through canopy',
  ป่า: 'trees swaying, leaves falling, dappled light filtering through canopy',
  beach: 'waves rolling, palm trees swaying, sand particles drifting',
  ทะเล: 'waves rolling, palm trees swaying, sand particles drifting',
  office: 'papers rustling, computer screens glowing, subtle air movement',
  สำนักงาน: 'papers rustling, computer screens glowing, subtle air movement',
  home: 'curtains moving gently, shadows shifting, ambient movement',
  บ้าน: 'curtains moving gently, shadows shifting, ambient movement',
  temple: 'incense smoke rising, candles flickering, peaceful atmosphere',
  wat: 'incense smoke rising, candles flickering, peaceful atmosphere',
  วัด: 'incense smoke rising, candles flickering, peaceful atmosphere',
  อุโบสถ: 'incense smoke rising, candles flickering, peaceful atmosphere',
  ศาลาวัด: 'incense smoke rising, candles flickering, peaceful atmosphere',
  เจดีย์: 'incense smoke rising, candles flickering, peaceful atmosphere',
  palace: 'flags waving, guards standing, grand atmosphere',
  พระราชวัง: 'flags waving, guards standing, grand atmosphere',
  village: 'people working, animals moving, daily life activities',
  หมู่บ้าน: 'people working, animals moving, daily life activities',
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Build Character Motion Context
 *
 * Converts character psychology (mood, energy, temperament)
 * into natural movement descriptions.
 *
 * @param character - Character with emotional state and psychology
 * @param shotDescription - Action description from shot data
 * @returns Formatted character motion string
 */
export function buildMotionContext(
  character: Character,
  shotDescription: string,
  fashionOverride?: Record<string, string>
): string {
  const { emotionalState, buddhist_psychology } = character;

  // Extract mood and energy (use correct property names)
  const mood = emotionalState?.currentMood || 'calm';
  const energy = emotionalState?.energyLevel || 50;

  // Determine motion speed from mood
  let motionSpeed = MOOD_TO_SPEED[mood.toLowerCase()] || 'natural, realistic';

  // Adjust for energy level
  if (energy > 70) {
    motionSpeed = ENERGY_TO_SPEED.high(energy);
  } else if (energy < 30) {
    motionSpeed = ENERGY_TO_SPEED.low(energy);
  }

  // Get mannerisms from temperament (carita)
  const carita = buddhist_psychology?.carita || 'วิตกจริต';
  const mannerisms = CARITA_TO_MANNERISMS[carita] || 'natural movements';

  // Costume/Fashion cues (kept short; continuity is critical for video)
  const effectiveFashion = fashionOverride || character.fashion;
  const fashionStyle = effectiveFashion?.['Style Concept'] || effectiveFashion?.Style || '';
  const fashionOutfit = effectiveFashion?.['Main Outfit'] || effectiveFashion?.Outfit || '';
  const costumeLine =
    fashionStyle || fashionOutfit
      ? `- Costume & Fashion: ${[fashionStyle, fashionOutfit].filter(Boolean).join(' | ')} (NO outfit change, NO costume change)`
      : undefined;

  // Speech/Voice cues (acting direction; video generation may not include audio)
  const voiceChar =
    character.physical?.['Voice characteristics'] || character.physical?.Voice || '';
  const speech = character.speechPattern;
  const speechLine =
    voiceChar || speech
      ? `- Vaca (Speech/Voice acting): ${[
          voiceChar ? `Voice: ${voiceChar}` : '',
          speech
            ? `Dialect=${speech.dialect}, Accent=${speech.accent}, Formality=${speech.formalityLevel}, Personality=${speech.personality}`
            : '',
        ]
          .filter(Boolean)
          .join(' | ')}. If speaking, natural lip sync; if not speaking, relaxed lips.`
      : undefined;

  // Kaya/Vaca/Citta: align physical action with mental state
  const mentalBalance = emotionalState?.mentalBalance || 50;
  let bodyLanguage: string;

  if (mentalBalance > 70) {
    bodyLanguage = 'relaxed shoulders, open gestures, smooth movements';
  } else if (mentalBalance > 40) {
    bodyLanguage = 'balanced posture, controlled gestures';
  } else {
    bodyLanguage = 'tense shoulders, closed posture, guarded movements';
  }

  const cittaLine = `- Citta (Mind): ${mood}, mental balance ${mentalBalance}, ${carita} temperament → express through eyes/face micro-expressions and posture.`;
  const kayaLine = `- Kaya (Body): ${bodyLanguage}; movements obey real-world physics; no float/glide.`;

  // 🆕 Anatomy/limb integrity guardrails (helps reduce missing-body artifacts during walking/gesture)
  const desc = (shotDescription || '').toLowerCase();
  const hasLocomotionCue =
    /\b(walk|run|step|stride|turn|enter|exit)\b/.test(desc) ||
    /(เดิน|วิ่ง|ก้าว|ก้าวเดิน|หัน|เดินเข้า|เดินออก)/.test(shotDescription || '');
  const anatomyLine = hasLocomotionCue
    ? `- Body Integrity: full body present; all limbs/hands/feet complete; NO missing limbs; NO amputations; stable anatomy while moving.`
    : undefined;

  return `CHARACTER MOTION:
- Action: ${shotDescription}
- Motion Speed: ${motionSpeed} (${mood} mood, ${energy > 60 ? 'high' : energy < 40 ? 'low' : 'medium'} energy)
- Motion Quality: natural, realistic
- Body Language: ${bodyLanguage}
- Mannerisms: ${mannerisms} (${carita})

${[kayaLine, anatomyLine, speechLine, cittaLine, costumeLine].filter(Boolean).join('\n')}`;
}

/**
 * Build Camera Movement Context
 *
 * Converts shot movement data into cinematic camera choreography.
 *
 * @param shotData - Shot data with movement, equipment, shot size
 * @returns Formatted camera movement string
 */
export function buildCameraMovementContext(shotData: ShotData): string {
  const { movement, equipment, shotSize } = shotData;

  // Default to static if no movement specified
  const movementType = (movement as CameraMovementType) || 'Static';

  // Get base movement description
  const movementDescription =
    CAMERA_MOVEMENT_MAP[movementType]?.(equipment, shotSize) || 'No camera movement, stable frame';

  // Determine smoothness from equipment
  const smoothness = equipment
    ? EQUIPMENT_TO_SMOOTHNESS[equipment as EquipmentType] || 'smooth, professional'
    : 'smooth, professional';

  // Determine speed from shot size
  const speed = shotSize
    ? SHOT_SIZE_TO_SPEED[shotSize as ShotSize] || 'normal, steady'
    : 'normal, steady';

  return `CAMERA MOVEMENT:
- Type: ${movementDescription} (${movementType})
- Smoothness: ${smoothness}
- Speed: ${speed}`;
}

/**
 * Build Timing Context
 *
 * Creates duration-aware pacing and keyframe breakdown.
 *
 * @param shotData - Shot data with duration
 * @returns Formatted timing string
 */
export function buildTimingContext(shotData: ShotData): string {
  const duration = shotData.durationSec || 5;

  // Determine pacing from duration
  let pacing: string;
  let actionSpeed: string;

  if (duration <= 2) {
    pacing = 'fast, quick tempo, energetic';
    actionSpeed = 'rapid, dynamic, intense';
  } else if (duration <= 5) {
    pacing = 'normal, standard tempo';
    actionSpeed = 'natural, realistic';
  } else if (duration <= 10) {
    pacing = 'slow, contemplative';
    actionSpeed = 'deliberate, measured';
  } else {
    pacing = 'very slow, dramatic';
    actionSpeed = 'extremely slow, cinematic';
  }

  // Calculate keyframes
  const mid = duration / 2;
  const end = duration;

  return `TIMING & PACING:
- Duration: ${duration} seconds total
- Pacing: ${pacing}
- Action Speed: ${actionSpeed}
- Key Moments:
  * Start (0s): Establish shot
  * Mid (${mid.toFixed(1)}s): Main action/movement
  * End (${end}s): Complete action`;
}

/**
 * Build Environmental Motion Context
 *
 * Adds living background elements based on location and mood.
 *
 * @param currentScene - Scene with location data
 * @returns Formatted environmental motion string
 */
export function buildEnvironmentalMotionContext(currentScene: GeneratedScene): string {
  // Extract location from sceneDesign
  const location = currentScene.sceneDesign?.location?.toLowerCase() || '';

  // Extract location keyword
  // Prefer a calmer default than "street" to avoid injecting urban elements into scenes
  // when the location string is missing or uses a non-English locale.
  let locationKey = 'home';
  for (const key of Object.keys(LOCATION_TO_MOTION)) {
    if (location.includes(key)) {
      locationKey = key;
      break;
    }
  }

  const backgroundMotion =
    LOCATION_TO_MOTION[locationKey] || 'natural environmental movement, ambient life';

  // Determine atmosphere from scene mood/tone and situations
  const moodTone = currentScene.sceneDesign?.moodTone?.toLowerCase() || '';
  const situations = currentScene.sceneDesign?.situations || [];
  const situationText = situations
    .map(s => s.description)
    .join(' ')
    .toLowerCase();
  const sceneText = `${moodTone} ${situationText}`;

  let atmosphere: string;

  if (sceneText.includes('tense') || sceneText.includes('suspense')) {
    atmosphere = 'slight shake, ominous shadows, tension in the air';
  } else if (sceneText.includes('peaceful') || sceneText.includes('calm')) {
    atmosphere = 'gentle movements, soft swaying, tranquil';
  } else if (sceneText.includes('chaotic') || sceneText.includes('busy')) {
    atmosphere = 'fast movements, multiple elements, dynamic energy';
  } else {
    atmosphere = 'natural ambient movement, living environment';
  }

  return `ENVIRONMENTAL MOTION:
- Background: ${backgroundMotion}
- Atmosphere: ${atmosphere}`;
}

/**
 * Build Complete Video Prompt
 *
 * Combines all motion contexts into comprehensive video generation prompt.
 *
 * @param shotData - Shot data with all parameters
 * @param currentScene - Current scene context
 * @param character - Character with psychology
 * @param basePrompt - Base image generation prompt
 * @returns Enhanced video prompt with full motion intelligence
 */
export function buildVideoPrompt(
  shotData: ShotData,
  currentScene: GeneratedScene,
  character: Character,
  basePrompt: string
): string {
  const safeText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  type CanonicalShotSize = ShotSize;

  const normalizeShotSize = (raw: string): CanonicalShotSize | undefined => {
    const s = safeText(raw).toUpperCase();
    if (!s) return undefined;

    // Order matters (EWS contains WS, ECU contains CU).
    if (/(\bEWS\b|EXTREME\s+WIDE)/.test(s)) return 'EWS';
    if (/(\bWS\b|WIDE\s+SHOT|WIDE\s+ANGLE|มุมกว้าง|ภาพมุมกว้าง|ระยะกว้าง)/iu.test(raw)) return 'WS';
    if (/(\bLS\b|LONG\s+SHOT|FULL\s+SHOT|ระยะไกล)/iu.test(raw)) return 'LS';
    if (/(\bMS\b|MEDIUM\s+SHOT|MEDIUM\s+ANGLE|มุมกลาง|ระยะกลาง|มิดช็อต|มิดชอต)/iu.test(raw))
      return 'MS';
    if (/(\bECU\b|EXTREME\s+CLOSE|EXTREME\s+CLOSE-?UP|เอ็กซ์ตรีม|ระยะใกล้มาก)/iu.test(raw))
      return 'ECU';
    if (/(\bCU\b|CLOSE-?UP|โคลสอัพ|โคลสอัพ|ระยะใกล้)/iu.test(raw)) return 'CU';

    // Fallback: if user stored "CU" inside a longer string like "Close-Up (CU)".
    if (s.includes('ECU')) return 'ECU';
    if (s.includes('CU')) return 'CU';
    if (s.includes('MS')) return 'MS';
    if (s.includes('LS')) return 'LS';
    if (s.includes('EWS')) return 'EWS';
    if (s.includes('WS')) return 'WS';
    return undefined;
  };

  const sanitizeActionDescriptionForShotSize = (
    description: string,
    canonicalSize?: CanonicalShotSize
  ): string => {
    const d = safeText(description);
    if (!d || !canonicalSize) return d;

    // Remove camera/framing words that contradict the structured shot size.
    // We keep action/story content; we only strip phrases that commonly act as camera instructions.
    const stripWideTerms = (text: string) =>
      text
        .replace(
          /\b(establishing\s+shot|establishing|wide\s*shot|wideshot|wide\s*angle|long\s*shot|full\s*shot)\b/gi,
          ''
        )
        .replace(/\b(ews|ws|ls)\b/gi, '')
        .replace(/(ภาพ)?\s*มุมกว้าง/giu, '')
        .replace(/ระยะ\s*กว้าง/giu, '')
        .replace(/ระยะ\s*ไกล/giu, '');

    const stripCloseTerms = (text: string) =>
      text
        .replace(/\b(extreme\s+close\-?up|extreme\s+close|close\-?up|cu|ecu)\b/gi, '')
        .replace(/\b(cu|ecu)\b/gi, '')
        .replace(/โคลสอัพ|โคลส\s*อัพ|ระยะ\s*ใกล้มาก|ระยะ\s*ใกล้/giu, '');

    let out = d;
    if (canonicalSize === 'MS') {
      out = stripWideTerms(out);
      out = stripCloseTerms(out);
    } else if (canonicalSize === 'WS' || canonicalSize === 'EWS' || canonicalSize === 'LS') {
      out = stripCloseTerms(out);
    } else if (canonicalSize === 'CU' || canonicalSize === 'ECU') {
      out = stripWideTerms(out);
    }

    // Clean up leftover punctuation/spaces
    out = out
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,.:;\-–—]+/g, '')
      .replace(/[\s,.:;\-–—]+$/g, '')
      .trim();

    return out || d;
  };

  const buildCameraFramingDirective = (
    canonicalSize: CanonicalShotSize | undefined,
    requiredCastNames: string[]
  ): string | undefined => {
    if (!canonicalSize) return undefined;

    const castCount = requiredCastNames.length;
    const isTwoOrMore = castCount >= 2;
    const castHint = isTwoOrMore
      ? `Two-shot composition (keep ${requiredCastNames.slice(0, 3).join(', ')} visible).`
      : castCount === 1
        ? `Single-subject framing (keep ${requiredCastNames[0]} centered and fully visible for the intended crop).`
        : '';

    switch (canonicalSize) {
      case 'ECU':
        return `Extreme Close-Up (ECU): eyes/face detail fill frame; background minimal; NO wide framing. ${castHint}`.trim();
      case 'CU':
        return `Close-Up (CU): head/shoulders; face clearly readable; background secondary; NO wide framing. ${castHint}`.trim();
      case 'MS':
        return `Medium Shot (MS): waist-up; faces clearly visible; background present but not dominant; NOT wide shot/NOT long shot/ไม่ใช่มุมกว้าง. ${castHint}`.trim();
      case 'LS':
        return `Long Shot (LS): full bodies visible; show surrounding space; NOT close-up. ${castHint}`.trim();
      case 'WS':
        return `Wide Shot (WS): show environment/context; characters smaller in frame; NOT close-up. ${castHint}`.trim();
      case 'EWS':
        return `Extreme Wide Shot (EWS): environment dominates; characters small silhouettes; NOT close-up. ${castHint}`.trim();
      default:
        return undefined;
    }
  };

  const getLeadHairSignature = (c: Character): string => {
    const physical = (c?.physical || {}) as Record<string, string>;
    const entries = Object.entries(physical);
    const pickByKey = (needle: RegExp) =>
      entries
        .filter(([k, v]) => needle.test(String(k)) && typeof v === 'string' && v.trim().length > 0)
        .map(([, v]) => v.trim());

    const hair = pickByKey(/hair|hairstyle|hair style|ทรงผม|ผม|ทรง/iu)[0];
    const hairColor = pickByKey(/hair\s*color|haircolor|สีผม/iu)[0];
    const face = pickByKey(/face\s*shape|faceshape|รูปหน้า|โครงหน้า/iu)[0];

    const parts = [
      hair ? `Hairstyle=${hair}` : '',
      hairColor ? `HairColor=${hairColor}` : '',
      face ? `FaceShape=${face}` : '',
    ].filter(Boolean);

    const joined = parts.join(' | ');
    // Keep it short to avoid diluting shot/action constraints.
    return joined.length > 160 ? `${joined.slice(0, 160).trim()}…` : joined;
  };

  const normalizeName = (name: string) => name.replace(/^\s+|\s+$/g, '');

  const parseCastNames = (castValue: unknown): string[] => {
    const raw = safeText(castValue);
    if (!raw) return [];
    // Split on common separators: comma, Thai comma, ampersand, slash, newline
    const parts = raw
      .split(/[\n,，&/]+/g)
      .map(s => s.trim())
      .filter(Boolean)
      // Handle Thai "และ" (and) inside a segment
      .flatMap(seg =>
        seg
          .split(/\s+และ\s+/g)
          .map(s => s.trim())
          .filter(Boolean)
      );
    const unique = Array.from(new Set(parts.map(normalizeName).filter(Boolean)));
    return unique;
  };

  const isOptionalExtra = (name: string) => {
    const n = normalizeName(name).toLowerCase();
    return (
      n.includes('นักแสดงประกอบ') ||
      n.includes('ตัวประกอบ') ||
      n.includes('extra') ||
      n.includes('extras') ||
      n.includes('background')
    );
  };

  const trimBasePrompt = (rawPrompt: string): string => {
    let p = safeText(rawPrompt);
    if (!p) return '';
    // Avoid duplicate prefixing.
    p = p.replace(/^Cinematic shot\.?\s*/i, '').trim();

    // If the base prompt already contains a big CRITICAL RULES section, strip it to avoid overload.
    const criticalIdx = p.toLowerCase().indexOf('**critical rules');
    if (criticalIdx >= 0) {
      p = p.slice(0, criticalIdx).trim();
    }

    // Preserve any explicit continuity sentence if present.
    const continuityMatch = p.match(/Continue\s+smoothly[\s\S]{0,260}/i);
    const continuityLine = continuityMatch ? continuityMatch[0].trim() : '';

    // Keep the beginning as style/identity anchor, but cap to reduce prompt dilution.
    const cap = 900;
    const head = p.length > cap ? `${p.slice(0, cap).trim()}…` : p;

    if (continuityLine && !head.includes(continuityLine)) {
      return `${head}\n\nContinuity: ${continuityLine}`;
    }
    return head;
  };

  // Try to resolve the canonical shot row from the scene's shotList (for cast/costume/set/lighting).
  const resolvedShotRow = (() => {
    const shotNum =
      typeof (shotData as any)?.shot === 'number' ? ((shotData as any).shot as number) : undefined;
    if (typeof shotNum === 'number' && Array.isArray(currentScene.shotList)) {
      const exact = currentScene.shotList.find(s => s.shot === shotNum);
      if (exact) return exact;
    }

    // Fallback: match by description prefix (best-effort)
    const desc = safeText(shotData.description);
    if (desc && Array.isArray(currentScene.shotList)) {
      const loose = currentScene.shotList.find(
        s => safeText(s.description).slice(0, 40) === desc.slice(0, 40)
      );
      if (loose) return loose;
    }
    return undefined;
  })();

  const sceneNumber = currentScene.sceneNumber;
  const sceneName = safeText(currentScene.sceneDesign?.sceneName);
  const sceneLocation = safeText(currentScene.sceneDesign?.location);
  const moodTone = safeText(currentScene.sceneDesign?.moodTone);

  const shotNum =
    typeof (shotData as any)?.shot === 'number' ? ((shotData as any).shot as number) : undefined;
  const shotSize = safeText(shotData.shotSize) || safeText(resolvedShotRow?.shotSize);
  const perspective = safeText(shotData.perspective) || safeText(resolvedShotRow?.perspective);
  const movement = safeText(shotData.movement) || safeText(resolvedShotRow?.movement) || 'Static';
  const equipment = safeText(shotData.equipment) || safeText(resolvedShotRow?.equipment);
  const durationSec =
    typeof shotData.durationSec === 'number' ? shotData.durationSec : resolvedShotRow?.durationSec;
  const aspectRatio =
    safeText((shotData as any)?.aspectRatio) || safeText(resolvedShotRow?.aspectRatio);

  const castNames = (() => {
    const fromShotRow = parseCastNames(resolvedShotRow?.cast);
    const fromShotData = parseCastNames(shotData.cast);
    const fromScene = Array.isArray(currentScene.sceneDesign?.characters)
      ? currentScene.sceneDesign.characters.map(normalizeName).filter(Boolean)
      : [];

    const merged = Array.from(
      new Set([...fromShotRow, ...fromShotData, ...fromScene].filter(Boolean))
    );
    return merged;
  })();

  const leadName = safeText((character as any)?.name);
  const requiredCast = castNames.filter(n => !isOptionalExtra(n));
  const optionalCast = castNames.filter(n => isOptionalExtra(n));

  const castWithoutLead = leadName ? requiredCast.filter(n => n !== leadName) : requiredCast;

  const leadHairSignature = getLeadHairSignature(character);

  const canonicalShotSize = normalizeShotSize(shotSize);
  const sanitizedAction = sanitizeActionDescriptionForShotSize(
    shotData.description,
    canonicalShotSize
  );
  const cameraFramingDirective = buildCameraFramingDirective(canonicalShotSize, requiredCast);

  const sceneProps = (() => {
    if (!Array.isArray(currentScene.propList)) return [] as string[];
    const items = currentScene.propList.map(p => safeText(p?.propArt)).filter(Boolean);
    return Array.from(new Set(items)).slice(0, 8);
  })();

  // 🆕 Check if shot has characters/cast (handle undefined, null, or non-string)
  const hasCharacters =
    shotData.cast && typeof shotData.cast === 'string' && shotData.cast.trim().length > 0;

  // 🆕 Detect EST shot type (Establishing Shot) - needs structures/buildings visible
  const isEstablishingShot =
    shotData.shotSize?.toUpperCase().includes('EST') ||
    shotData.description?.toLowerCase().includes('establishing');

  // 🆕 Extract key objects from shot description for EST shots
  const extractKeyObjects = (description: string): string => {
    const objectKeywords = [
      'cabin',
      'hut',
      'house',
      'building',
      'structure',
      'barn',
      'shed',
      'cottage',
      'lodge',
      'shack',
      'tower',
      'castle',
      'temple',
      'church',
    ];
    const found = objectKeywords.filter(keyword => description.toLowerCase().includes(keyword));
    return found.length > 0 ? found.join(', ') : 'structure';
  };

  // Build all motion contexts
  const characterMotion = hasCharacters
    ? buildMotionContext(character, shotData.description, (resolvedShotRow as any)?.costumeFashion)
    : isEstablishingShot
      ? (() => {
          const keyObjects = extractKeyObjects(shotData.description);
          return `ESTABLISHING SHOT: Show the ${keyObjects} clearly visible in frame. ${keyObjects.toUpperCase()} MUST BE VISIBLE. Focus on ${keyObjects} and architectural details. The ${keyObjects} should be prominent in the shot. NO people needed - empty scene showing ${keyObjects} and environment only.`;
        })()
      : 'EMPTY SCENE: No people, no humans, no characters in this shot. Pure landscape shot.';

  const cameraMovement = buildCameraMovementContext(shotData);
  const timing = buildTimingContext(shotData);
  const environmental = buildEnvironmentalMotionContext(currentScene);

  // 📍 Extract Location Details if available
  const locationDetails = (currentScene.sceneDesign as any)?.locationDetails;
  const locationEnvironmentContext = locationDetails
    ? `\n- Environment: ${locationDetails.environment?.description || ''}${locationDetails.environment?.architecture ? ` | Architecture: ${locationDetails.environment.architecture}` : ''}${locationDetails.environment?.dimensions ? ` | Space: ${locationDetails.environment.dimensions}` : ''}`
    : '';
  const locationAtmosphereContext = locationDetails?.atmosphere
    ? `\n- Atmosphere: ${locationDetails.atmosphere.weather || ''}${locationDetails.atmosphere.temperature ? ` | ${locationDetails.atmosphere.temperature}` : ''}${locationDetails.atmosphere.windSpeed ? ` | Wind: ${locationDetails.atmosphere.windSpeed}` : ''}`
    : '';
  const locationSensoryContext = locationDetails?.sensory
    ? `\n- Sensory Details: ${locationDetails.sensory.lighting ? `Light Quality: ${locationDetails.sensory.lighting}` : ''}${locationDetails.sensory.colors ? ` | Color Palette: ${locationDetails.sensory.colors}` : ''}${locationDetails.sensory.sounds ? ` | Ambient Sounds: ${locationDetails.sensory.sounds}` : ''}`
    : '';

  const compactBase = trimBasePrompt(basePrompt);

  // 🎬 IMPORTANT: Keep the prompt structured and prioritized.
  // WAN/AnimateDiff are sensitive to overload; long repeated rules dilute identity/action constraints.
  return `SHOT LIST (HIGHEST PRIORITY):
- Scene: ${sceneNumber}${sceneName ? ` — ${sceneName}` : ''}
- Shot: ${typeof shotNum === 'number' ? shotNum : '?'} | Size: ${shotSize || 'N/A'} | Perspective: ${perspective || 'N/A'} | Camera: ${movement}${equipment ? ` (${equipment})` : ''}
- Duration: ${typeof durationSec === 'number' ? `${durationSec}s` : 'N/A'}${aspectRatio ? ` | Aspect Ratio: ${aspectRatio}` : ''}
- CAST (MUST APPEAR): ${requiredCast.length > 0 ? requiredCast.join(', ') : castNames.length > 0 ? castNames.join(', ') : 'N/A'}
${optionalCast.length > 0 ? `- Background/Extras (OPTIONAL): ${optionalCast.join(', ')}` : ''}
- ON-SCREEN CAST LOCK: ${requiredCast.length > 0 ? `Required cast must be visible on-screen (NO missing key characters). Visible people count must be AT LEAST ${requiredCast.length}.` : 'N/A'}
- CAMERA FRAMING (AUTHORITATIVE): ${cameraFramingDirective || (canonicalShotSize ? `${canonicalShotSize} framing` : 'Follow shot size')}
- ACTION (CONTENT ONLY; framing is controlled by shot size above): ${sanitizedAction || safeText(shotData.description)}

CHARACTERS (IDENTITY LOCK):
- Lead: ${leadName || 'N/A'} — keep EXACT face/hair/outfit continuity; NO outfit change.
${leadHairSignature ? `- Lead Identity Signature (MUST MATCH): ${leadHairSignature}` : ''}
${castWithoutLead.length > 0 ? `- Also present (DO NOT OMIT): ${castWithoutLead.join(', ')} — must be visible in-frame; keep identity consistent.` : ''}

SCENE DETAILS:
- Location: ${sceneLocation || 'N/A'}${locationEnvironmentContext}${locationAtmosphereContext}${locationSensoryContext}
- Mood/Tone: ${moodTone || 'N/A'}
${contextualContinuityLine(currentScene, resolvedShotRow, shotData) ? `- Continuity: ${contextualContinuityLine(currentScene, resolvedShotRow, shotData)}` : ''}
${safeText(resolvedShotRow?.lightingDesign) ? `- Lighting: ${safeText(resolvedShotRow?.lightingDesign)}` : ''}
${safeText(resolvedShotRow?.set) ? `- Set: ${safeText(resolvedShotRow?.set)}` : ''}
${
  (resolvedShotRow as any)?.costumeFashion &&
  typeof (resolvedShotRow as any).costumeFashion === 'object'
    ? `- Costume & Fashion (SHOT OVERRIDE): ${Object.entries(
        (resolvedShotRow as any).costumeFashion as Record<string, string>
      )
        .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim())
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ')} (NO costume change)`
    : ''
}
${safeText(resolvedShotRow?.costume) ? `- Costume Notes: ${safeText(resolvedShotRow?.costume)} (NO costume change)` : ''}
${sceneProps.length > 0 ? `- Props: ${sceneProps.join(', ')}` : ''}

STYLE / BASE PROMPT (COMPACT):
${compactBase || 'N/A'}

MOTION DIRECTION:
${characterMotion}

${cameraMovement}

${timing}

${environmental}

CRITICAL (DO NOT BREAK):
- Single continuous take. NO cuts. NO jump cuts. NO angle switches.
- If camera is Static: locked frame, no zoom.
- Realistic human motion; grounded physics; NO warping/morphing.
- HD sharp frames; NO noise/grain/artifacts.
- Anatomy integrity: full body present; NO missing limbs/hands/feet.`;
}

function contextualContinuityLine(
  currentScene: GeneratedScene,
  resolvedShotRow: any,
  shotData: ShotData
): string {
  const safeText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const location = safeText(currentScene.sceneDesign?.location);
  const set = safeText(resolvedShotRow?.set);
  const lighting = safeText(resolvedShotRow?.lightingDesign);

  const bits = [
    location ? `match the same location (${location})` : '',
    set ? `match the same set dressing (${set})` : '',
    lighting ? `match the same lighting (${lighting})` : '',
    'keep background layout consistent with the previous shot',
    'keep high background detail and sharp focus',
  ].filter(Boolean);

  // Only add this for shots that actually include characters (avoids weird constraints for empty establishing shots)
  const hasCast = typeof shotData.cast === 'string' && shotData.cast.trim().length > 0;
  return hasCast ? bits.join('; ') : '';
}

/**
 * Get AnimateDiff Motion Module Strength
 *
 * Calculates optimal motion module strength based on shot parameters.
 *
 * @param shotData - Shot data
 * @param character - Character with energy level
 * @returns Motion strength value (0.0 - 1.0)
 */
export function getMotionModuleStrength(shotData: ShotData, character: Character): number {
  const energy = character.emotionalState?.energyLevel || 50;
  const duration = shotData.durationSec || 5;

  const description = (shotData.description || '').toLowerCase();

  // If the shot description contains interaction/action verbs, we should never go too low,
  // even when the camera is static.
  const hasActionCue =
    /\b(smile|kiss|hug|hold|grab|touch|walk|run|turn|nod|talk|speak|whisper|laugh)\b/.test(
      description
    ) ||
    /(จับมือ|กอด|จูบ|แตะ|ลูบ|เดิน|วิ่ง|หัน|พยักหน้า|พูด|กระซิบ|หัวเราะ|ยิ้ม)/.test(description);

  // Base strength from energy
  let strength = energy / 100;

  // Adjust for duration (longer = more motion)
  if (duration > 10) {
    strength = Math.min(1.0, strength + 0.2);
  } else if (duration < 3) {
    strength = Math.max(0.3, strength - 0.2);
  }

  // Adjust for movement type
  if (shotData.movement === 'Handheld') {
    strength = Math.min(1.0, strength + 0.2); // Reduced from +0.3 to prevent excessive motion
  } else if (shotData.movement === 'Static') {
    // CRITICAL FIX: Reduce motion for static shots to prevent ghostly/warped movement
    // Static camera = less overall motion needed, prevents unnatural warping
    strength = Math.max(0.15, strength - 0.25); // Increased reduction from -0.15
  }

  // Ensure subtle motion for human actions (prevents frozen-looking people).
  if (hasActionCue) {
    strength = Math.max(strength, 0.25); // Lowered from 0.28 for more natural motion
  }

  return Math.max(0.15, Math.min(1.0, strength));
}

/**
 * Get Recommended FPS
 *
 * Suggests optimal frames per second based on shot characteristics.
 *
 * @param shotData - Shot data
 * @returns Recommended FPS (8, 12, 16, or 24)
 */
export function getRecommendedFPS(shotData: ShotData): number {
  const duration = shotData.durationSec || 5;

  // Longer shots = higher FPS for smoothness
  if (duration > 10) return 24;
  if (duration > 5) return 16;
  if (duration > 3) return 12;
  return 8;
}

/**
 * Get Recommended Frame Count
 *
 * Calculates total frames needed based on duration and FPS.
 *
 * @param shotData - Shot data
 * @param fps - Frames per second
 * @returns Total frame count
 */
export function getRecommendedFrameCount(shotData: ShotData, fps: number): number {
  const duration = shotData.durationSec || 5;
  return Math.max(8, Math.min(120, duration * fps)); // Min 8, max 120 frames
}
