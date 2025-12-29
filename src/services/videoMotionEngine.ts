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
  description: string;
  movement?: string;
  equipment?: string;
  shotSize?: string;
  durationSec?: number;
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
  forest: 'trees swaying, leaves falling, dappled light filtering through canopy',
  beach: 'waves rolling, palm trees swaying, sand particles drifting',
  office: 'papers rustling, computer screens glowing, subtle air movement',
  home: 'curtains moving gently, shadows shifting, ambient movement',
  temple: 'incense smoke rising, candles flickering, peaceful atmosphere',
  palace: 'flags waving, guards standing, grand atmosphere',
  village: 'people working, animals moving, daily life activities',
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
export function buildMotionContext(character: Character, shotDescription: string): string {
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

  // Determine body language from mental balance
  const mentalBalance = emotionalState?.mentalBalance || 50;
  let bodyLanguage: string;

  if (mentalBalance > 70) {
    bodyLanguage = 'relaxed shoulders, open gestures, smooth movements';
  } else if (mentalBalance > 40) {
    bodyLanguage = 'balanced posture, controlled gestures';
  } else {
    bodyLanguage = 'tense shoulders, closed posture, guarded movements';
  }

  return `CHARACTER MOTION:
- Action: ${shotDescription}
- Motion Speed: ${motionSpeed} (${mood} mood, ${energy > 60 ? 'high' : energy < 40 ? 'low' : 'medium'} energy)
- Motion Quality: natural, realistic
- Body Language: ${bodyLanguage}
- Mannerisms: ${mannerisms} (${carita})`;
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
  const location = currentScene.sceneDesign?.location?.toLowerCase() || 'street';

  // Extract location keyword
  let locationKey = 'street';
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
  // Build all motion contexts
  const characterMotion = buildMotionContext(character, shotData.description);
  const cameraMovement = buildCameraMovementContext(shotData);
  const timing = buildTimingContext(shotData);
  const environmental = buildEnvironmentalMotionContext(currentScene);

  // Combine with base prompt
  return `${basePrompt}

${characterMotion}

${cameraMovement}

${timing}

${environmental}

MOTION INSTRUCTIONS:
- Maintain character consistency throughout video
- Smooth, natural transitions between keyframes
- Realistic physics and movement
- Professional cinematic quality
- No static frames or freezing`;
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
    /\b(smile|kiss|hug|hold|grab|touch|walk|run|turn|nod|talk|speak|whisper|laugh)\b/.test(description) ||
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
    strength = Math.min(1.0, strength + 0.3);
  } else if (shotData.movement === 'Static') {
    // Static refers to CAMERA movement; the subject can still move.
    // Reduce only slightly to avoid jitter, but keep enough motion for realism.
    strength = Math.max(0.2, strength - 0.15);
  }

  // Ensure subtle motion for human actions (prevents frozen-looking people).
  if (hasActionCue) {
    strength = Math.max(strength, 0.28);
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

