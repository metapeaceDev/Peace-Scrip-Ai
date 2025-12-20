/**
 * Motion Editor Service
 * Helper functions to generate AI suggestions from videoMotionEngine
 * and integrate with existing AnimateDiff system
 */

import type { Character, GeneratedScene } from '../types';
import {
  CinematicSuggestions,
  MotionEdit,
  CameraMovement,
  FocalLength,
  MOOD_LIGHTING_MAP,
} from '../types/motionEdit';
import {
  buildMotionContext,
  buildCameraMovementContext,
  getMotionModuleStrength,
  getRecommendedFPS,
  getRecommendedFrameCount,
} from './videoMotionEngine';

/**
 * Generate AI cinematic suggestions based on character psychology
 */
export function generateCinematicSuggestions(
  character: Character,
  currentScene?: GeneratedScene
): CinematicSuggestions {
  // Get shot description from current scene if available
  const shotDescription =
    currentScene?.sceneDesign?.situations?.[0]?.description || 'Character performing action';

  // Get motion context from character psychology
  const motionContext = buildMotionContext(character, shotDescription);

  // Get camera context from shot data
  const shotDataForContext = {
    description: shotDescription,
    movement: 'Static',
    equipment: 'Tripod',
    shotSize: 'MS',
    durationSec: 3,
  };
  const cameraContext = buildCameraMovementContext(shotDataForContext);

  // Determine camera movement based on energy level
  let suggestedMovement: CameraMovement = 'Static';
  if (motionContext.includes('high energy') || motionContext.includes('intense')) {
    suggestedMovement = 'Handheld';
  } else if (motionContext.includes('graceful') || motionContext.includes('flowing')) {
    suggestedMovement = 'Dolly';
  } else if (motionContext.includes('searching') || motionContext.includes('observing')) {
    suggestedMovement = 'Pan';
  } else if (motionContext.includes('tense') || motionContext.includes('anxious')) {
    suggestedMovement = 'Steadicam';
  }

  // Determine focal length based on emotional intensity
  let suggestedFocalLength: FocalLength = '35mm';
  const shotDataForIntensity = {
    description: shotDescription,
    movement: 'Static' as const,
    durationSec: 3,
  };
  const intensity = getMotionModuleStrength(shotDataForIntensity, character);

  if (intensity > 0.8) {
    suggestedFocalLength = '85mm'; // Close-up for intense emotions
  } else if (intensity > 0.6) {
    suggestedFocalLength = '50mm'; // Normal for moderate emotions
  } else if (intensity < 0.3) {
    suggestedFocalLength = '24mm'; // Wide for calm/isolated
  }

  // Get mood from character emotional state
  const mood = character.emotionalState?.currentMood || 'neutral';

  // Build camera suggestion text
  const cameraPrompt = `${cameraContext}. Use ${suggestedFocalLength} lens with ${suggestedMovement.toLowerCase()} camera movement to capture the ${mood} mood.`;

  // Build lighting suggestion based on mood
  const lightingPreset = MOOD_LIGHTING_MAP[mood] || MOOD_LIGHTING_MAP.neutral;
  const lightingPrompt = `${lightingPreset.description}. Color temperature: ${lightingPreset.color_temperature}. Mood: ${lightingPreset.mood}.`;

  // Build sound suggestion
  const soundPrompt = `Natural ambient sound with subtle ${mood} atmosphere`;

  // Calculate confidence based on data completeness
  let confidence = 0.7; // base confidence
  if (character.emotionalState?.currentMood) confidence += 0.1;
  if (character.name && character.name.length > 3) confidence += 0.1;
  if (currentScene?.sceneDesign?.location) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  return {
    suggested_camera: cameraPrompt,
    suggested_lighting: lightingPrompt,
    suggested_sound: soundPrompt,
    suggested_movement: suggestedMovement,
    suggested_focal_length: suggestedFocalLength,
    confidence,
  };
}

/**
 * Generate sound suggestions based on scene and character
 * Simplified version
 */
export function generateSoundSuggestion(
  character: Character,
  _currentScene?: GeneratedScene
): string {
  const mood = character.emotionalState?.currentMood || 'neutral';

  // Basic sound suggestions based on mood
  const moodSounds: Record<string, string> = {
    happy: 'upbeat ambient sounds, light footsteps',
    sad: 'soft, slow breathing, occasional sighs',
    anxious: 'rapid heartbeat, shallow breathing',
    angry: 'heavy breathing, tense silence',
    calm: 'gentle ambient sounds, natural atmosphere',
    neutral: 'natural ambient sounds',
  };

  return moodSounds[mood] || moodSounds.neutral;
}

/**
 * Convert MotionEdit to AnimateDiff parameters
 */
export interface AnimateDiffParams {
  motion_strength: number;
  fps: number;
  frame_count: number;
  camera_movement: string;
  lighting_context: string;
  sound_context: string;
}

export function motionEditToAnimateDiffParams(
  motionEdit: MotionEdit,
  character: Character,
  _currentScene?: GeneratedScene
): AnimateDiffParams {
  // Create shot data for videoMotionEngine functions
  const shotData = {
    description: motionEdit.shot_preview_generator_panel.prompt,
    movement: motionEdit.camera_control.movement,
    equipment: motionEdit.camera_control.equipment,
    shotSize: motionEdit.shot_preview_generator_panel.shot_type,
    durationSec: 3, // Default duration
  };

  // Get base parameters from videoMotionEngine
  const motionStrength = getMotionModuleStrength(shotData, character);
  const fps = getRecommendedFPS(shotData);
  const frameCount = getRecommendedFrameCount(shotData, fps);

  // Build enhanced camera movement context
  const cameraMovement = `${motionEdit.camera_control.perspective} perspective, ${motionEdit.camera_control.movement} movement using ${motionEdit.camera_control.equipment}, ${motionEdit.camera_control.focal_length} focal length. ${motionEdit.camera_control.shot_prompt}`;

  // Build lighting context
  const lightingContext = `${motionEdit.lighting_design.description}. Color temperature: ${motionEdit.lighting_design.color_temperature}${motionEdit.lighting_design.mood ? `, ${motionEdit.lighting_design.mood} mood` : ''}`;

  // Build sound context
  const soundContext = motionEdit.sounds.auto_sfx
    ? `Auto SFX enabled. ${motionEdit.sounds.description}${motionEdit.sounds.ambient ? `. Ambient: ${motionEdit.sounds.ambient}` : ''}`
    : motionEdit.sounds.description;

  return {
    motion_strength: motionStrength,
    fps,
    frame_count: frameCount,
    camera_movement: cameraMovement,
    lighting_context: lightingContext,
    sound_context: soundContext,
  };
}

/**
 * Build complete video prompt with motion edit context
 */
export function buildVideoPromptWithMotion(
  motionEdit: MotionEdit,
  character: Character,
  _currentScene?: GeneratedScene
): string {
  const shotPreview = motionEdit.shot_preview_generator_panel;
  const camera = motionEdit.camera_control;
  const frame = motionEdit.frame_control;
  const lighting = motionEdit.lighting_design;

  // Build layered prompt
  const layers = [
    // Shot type and structure
    `${shotPreview.shot_type}: ${shotPreview.prompt}`,

    // Frame composition (3 layers)
    `Frame composition - Foreground: ${frame.foreground || 'natural depth'}`,
    `Main focus: ${frame.object}`,
    `Background: ${frame.background || 'contextual environment'}`,

    // Camera setup
    `Camera: ${camera.perspective} perspective, ${camera.movement} movement`,
    `Equipment: ${camera.equipment}, ${camera.focal_length} lens`,
    camera.shot_prompt,

    // Lighting
    `Lighting: ${lighting.description}`,
    `Color temperature: ${lighting.color_temperature}`,

    // Character psychology (from videoMotionEngine)
    buildMotionContext(character, shotPreview.prompt),

    // Extra details
    shotPreview.extra || '',
  ];

  return layers.filter(Boolean).join('. ');
}

/**
 * Validate motion edit data
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMotionEdit(motionEdit: MotionEdit): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!motionEdit.shot_preview_generator_panel.prompt?.trim()) {
    errors.push('Scene prompt is required');
  }

  if (!motionEdit.frame_control.object?.trim()) {
    errors.push('Main object in frame is required');
  }

  if (!motionEdit.lighting_design.description?.trim()) {
    errors.push('Lighting description is required');
  }

  // Warnings
  if (!motionEdit.frame_control.foreground?.trim()) {
    warnings.push('Consider adding foreground elements for depth');
  }

  if (!motionEdit.frame_control.background?.trim()) {
    warnings.push('Consider adding background description for context');
  }

  if (!motionEdit.sounds.description?.trim() && !motionEdit.sounds.auto_sfx) {
    warnings.push('No sound design specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create preset motion edit from shot type
 */
export function createMotionEditPreset(
  shotType: MotionEdit['shot_preview_generator_panel']['shot_type'],
  character: Character,
  currentScene?: GeneratedScene
): Partial<MotionEdit> {
  const suggestions = generateCinematicSuggestions(character, currentScene);

  // Base preset from shot type
  const basePreset = {
    shot_preview_generator_panel: {
      structure: character.name,
      prompt: '',
      extra: '',
      shot_type: shotType,
      voiceover: '',
    },
  };

  // Add AI suggestions
  return {
    ...basePreset,
    camera_control: {
      shot_prompt: suggestions.suggested_camera,
      perspective: 'Neutral',
      movement: suggestions.suggested_movement,
      equipment: suggestions.suggested_movement === 'Handheld' ? 'Handheld' : 'Tripod',
      focal_length: suggestions.suggested_focal_length,
    },
    lighting_design: {
      description: suggestions.suggested_lighting,
      color_temperature: 'Neutral',
      mood: 'Bright',
    },
    sounds: {
      auto_sfx: true,
      description: suggestions.suggested_sound,
      ambient: '',
    },
  };
}

