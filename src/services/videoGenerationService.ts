/**
 * Video Generation Service
 *
 * Comprehensive service for video generation pipeline:
 * - Single shot video generation
 * - Batch processing multiple shots
 * - Video stitching and compilation
 * - Progress tracking and error handling
 * - Queue management for large projects
 *
 * @author Peace Script AI Team
 * @version 1.0.0
 */

import { generateStoryboardVideo } from './geminiService';
import { updateEmotionalState } from './psychologyCalculator';
import type { GeneratedScene, Character } from '../types';

// Flexible Shot interface for video generation
export interface VideoShot {
  shotId?: string;
  scene?: string;
  shot?: number;
  shotType?: string;
  shotSize?: string;
  angle?: string;
  perspective?: string;
  movement?: string;
  lighting?: string;
  lightingDesign?: string;
  description?: string;
  duration?: number;
  durationSec?: number;
  cast?: string;
  set?: string;
  costume?: string;
  costumeFashion?: Record<string, string>;
}

export interface VideoGenerationOptions {
  quality?: '480p' | '720p' | '1080p' | '4K';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'custom';
  width?: number;
  height?: number;
  preferredModel?:
    | 'gemini-veo'
    | 'comfyui-svd'
    | 'comfyui-animatediff'
    | 'auto'
    | 'local-gpu'
    | string;
  fps?: number;
  duration?: number;
  frameCount?: number;
  motionStrength?: number;

  // 🆕 ComfyUI/WAN advanced parameters
  steps?: number;
  cfg?: number;

  // 🆕 VIDEO EXTENSION: Sequential Generation Support
  previousVideo?: string; // URL of previous video for seamless continuation
  previousShot?: VideoShot; // Previous shot metadata for prompt continuity
  endFrameInfluence?: number; // 0-1, strength of last frame influence (default: 0.7)
  transitionType?: 'seamless' | 'smooth' | 'creative'; // Transition style

  // 🆕 CONSISTENCY: Stable seeding
  seed?: number;
  stableSeed?: boolean; // default: true when shot/scene context exists

  // 🆕 CHARACTER CONSISTENCY: Face ID & LoRA Support
  characterReference?: {
    faceImage?: string; // Face reference image (base64 or URL)
    loraPath?: string; // Custom LoRA model path
    loraStrength?: number; // 0-1 (default: 0.8)
  };

  // 🆕 BUDDHIST PSYCHOLOGY INTEGRATION: Character & Scene Context
  character?: Character; // Character with emotional state and psychology
  currentScene?: GeneratedScene; // Scene context for emotion tracking

  // 🆕 MULTI-CAST CONSISTENCY: Provide full character objects for everyone in the shot.
  // Used to inject per-character identity anchors into the prompt.
  castCharacters?: Character[];
}

export interface VideoGenerationProgress {
  shotIndex: number;
  totalShots: number;
  currentProgress: number;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

/**
 * Extract last frame from video URL as base64 image
 * Used for seamless video-to-video generation
 *
 * @param videoUrl - URL of the video to extract from
 * @returns Base64 encoded PNG image of the last frame
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    let objectUrl: string | null = null;

    const cleanup = () => {
      try {
        video.remove();
      } catch {
        // ignore
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
        objectUrl = null;
      }
    };

    // Best-effort: fetch video bytes first and use a blob URL.
    // This often avoids canvas CORS tainting issues when the remote origin blocks video element CORS.
    (async () => {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
      } catch {
        // Fallback: direct URL. This may still work if Storage CORS is configured.
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
      }
    })().catch(() => {
      // ignore
    });

    video.muted = true;

    video.onloadedmetadata = () => {
      // Seek to last frame (0.1s before end to ensure valid frame)
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw last frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 (without data URL prefix)
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];

        console.log(`✅ Extracted last frame: ${canvas.width}x${canvas.height}`);
        resolve(base64);
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    video.onerror = error => {
      cleanup();
      reject(new Error(`Failed to load video: ${error}`));
    };

    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Video frame extraction timed out'));
    }, 10000);
  });
}

function stableHashToSeed(input: string): number {
  // Simple deterministic 32-bit hash (djb2), returned as a positive integer.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return Math.abs(hash) % 1000000000;
}

export interface BatchVideoResult {
  success: boolean;
  videos: {
    shotId: string;
    videoUrl: string;
    duration: number;
    error?: string;
  }[];
  totalDuration: number;
  failedCount: number;
}

/**
 * Generate video for a single shot
 */
export async function generateShotVideo(
  shot: VideoShot,
  baseImage?: string,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: number, details?: any, jobId?: string) => void
): Promise<string> {
  try {
    console.log(`🎬 Generating video for shot: ${shot.shotType || shot.shotSize || 'Unknown'}`);

    const preferredModel = typeof options.preferredModel === 'string' ? options.preferredModel : '';
    const isWanT2V = /comfyui-wan.*t2v/i.test(preferredModel);

    // 🆕 SEQUENTIAL GENERATION: Extract last frame from previous video
    let initImage = baseImage;
    if (!isWanT2V && options.previousVideo && !baseImage) {
      console.log('🔗 Sequential generation: Extracting last frame from previous video...');
      try {
        initImage = await extractLastFrame(options.previousVideo);
        console.log('✅ Last frame extracted successfully for seamless continuation');
      } catch (error) {
        console.warn('⚠️ Failed to extract last frame, generating without init image:', error);
        // Continue without init image
      }
    }

    // For WAN T2V (prompt-driven), avoid using init images by default.
    if (isWanT2V && initImage) {
      console.warn(
        '🧾 WAN T2V selected: ignoring init image to prioritize Physical Characteristics from text.'
      );
      initImage = undefined;
    }

    // Resolve duration/fps/frameCount coherently.
    // - If frameCount is provided, duration is derived unless explicitly overridden.
    // - If fps is not provided, let downstream logic pick a recommended fps.
    let resolvedFPS: number | undefined = options.fps;
    let resolvedDurationSec = options.duration || shot.duration || shot.durationSec || 3;
    const resolvedFrameCount = options.frameCount;

    if (typeof resolvedFrameCount === 'number' && Number.isFinite(resolvedFrameCount)) {
      if (typeof resolvedFPS !== 'number' || !Number.isFinite(resolvedFPS)) {
        // Default to 8fps (ComfyUI default in generateStoryboardVideo) when fps is unspecified.
        resolvedFPS = 8;
      }
      if (options.duration == null) {
        resolvedDurationSec = resolvedFrameCount / resolvedFPS;
      }
    }

    // Build comprehensive prompt from shot details (with continuity anchors)
    const prompt = buildVideoPrompt(shot, {
      character: options.character,
      castCharacters: options.castCharacters,
      currentScene: options.currentScene,
      previousShot: options.previousShot,
      maxChars: 900,
    });

    // 🆕 Adjust generation parameters for sequential continuity
    const generationOptions: Record<string, unknown> = {
      duration: resolvedDurationSec,
      motionStrength: options.motionStrength,
    };

    // Only set fps when explicitly provided (or needed for frameCount-derivation).
    if (typeof resolvedFPS === 'number' && Number.isFinite(resolvedFPS)) {
      generationOptions.fps = resolvedFPS;
    }

    // 🆕 Stable seed (improves identity/style consistency per shot)
    const shouldUseStableSeed = options.stableSeed !== false;
    if (shouldUseStableSeed) {
      if (typeof options.seed === 'number' && Number.isFinite(options.seed)) {
        generationOptions.seed = options.seed;
      } else {
        // WAN T2V: lock identity per character.id and lock wardrobe per scene outfit key (when available).
        if (isWanT2V && options.character?.id) {
          const outfitKey =
            options.currentScene &&
            (options.currentScene as any).characterOutfits &&
            options.character?.name
              ? String((options.currentScene as any).characterOutfits[options.character.name] || '')
              : '';
          const seedKey = `wan|characterId:${options.character.id}|outfit:${outfitKey}`;
          generationOptions.seed = stableHashToSeed(seedKey);
        } else {
          const keyParts = [
            options.character ? `character:${options.character.name || ''}` : '',
            options.currentScene ? `scene:${options.currentScene.sceneNumber || ''}` : '',
            shot.scene ? `shotScene:${shot.scene}` : '',
            typeof shot.shot === 'number' ? `shot:${shot.shot}` : '',
            shot.description ? `desc:${shot.description}` : '',
          ].filter(Boolean);
          generationOptions.seed = stableHashToSeed(keyParts.join('|'));
        }
      }
    }

    // Hair-specific negatives to reduce drift (short hair / wrong color)
    if (options.character?.physical) {
      const hair = extractHairSpecFromPhysical(options.character.physical);
      const hairNeg = buildHairNegativePrompt(hair);
      if (hairNeg) {
        const existingNeg =
          typeof (generationOptions as any).negativePrompt === 'string'
            ? String((generationOptions as any).negativePrompt)
            : typeof (options as any).negativePrompt === 'string'
              ? String((options as any).negativePrompt)
              : '';
        (generationOptions as any).negativePrompt = existingNeg
          ? `${existingNeg}, ${hairNeg}`
          : hairNeg;
      }
    }

    // 🆕 If using previous video, adjust for better continuity
    if (options.previousVideo && initImage) {
      // Lower motion strength for smoother transition
      if (options.transitionType === 'seamless') {
        generationOptions.motionStrength = 0.5; // Subtle motion
      } else if (options.transitionType === 'smooth') {
        generationOptions.motionStrength = 0.6; // Moderate motion
      }
      // 'creative' uses default 0.7

      // 🆕 Realism guardrails: when the shot is intended to be static/subtle,
      // keep motion low to avoid uncanny/warping movement in SVD continuity.
      const movement = (shot as any)?.movement;
      const movementStr = typeof movement === 'string' ? movement.toLowerCase() : '';
      const desc = typeof shot.description === 'string' ? shot.description : '';

      const currentMotion =
        typeof generationOptions.motionStrength === 'number'
          ? (generationOptions.motionStrength as number)
          : typeof options.motionStrength === 'number'
            ? (options.motionStrength as number)
            : 0.6;

      const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
      let tunedMotion = clamp01(currentMotion);

      const isStatic = movementStr.includes('static') || movementStr.includes('still');
      const isSubtleAction = /ยิ้ม|จับมือ|สบตา|พยักหน้า|หายใจ|ยืนนิ่ง|ยืดหยุ่น|ผ่อนคลาย/.test(desc);
      if (isStatic || isSubtleAction) {
        tunedMotion = Math.min(tunedMotion, 0.3);
      }

      generationOptions.motionStrength = tunedMotion;

      console.log(
        `🎨 Continuity mode: ${options.transitionType || 'smooth'}, motion: ${generationOptions.motionStrength}`
      );
    }

    // 🆕 Pass character consistency options
    if (options.characterReference) {
      generationOptions.lora = options.characterReference.loraPath;
      generationOptions.loraStrength = options.characterReference.loraStrength || 0.8;
      console.log(`👤 Character consistency enabled: LoRA=${options.characterReference.loraPath}`);
    }

    // 🆕 BUDDHIST PSYCHOLOGY: Pass character and scene context
    if (options.character) {
      generationOptions.character = options.character;
      generationOptions.currentScene = options.currentScene;
      generationOptions.shotData = shot;
      console.log(
        `🧠 Psychology-driven motion: ${options.character.emotionalState?.currentMood || 'neutral'} mood, energy ${options.character.emotionalState?.energyLevel || 50}`
      );
    }

    // Pass aspect ratio / resolution through when provided (used by ComfyUI backend).
    if (options.aspectRatio) {
      generationOptions.aspectRatio = options.aspectRatio;
    }
    if (typeof options.width === 'number') {
      generationOptions.width = options.width;
    }
    if (typeof options.height === 'number') {
      generationOptions.height = options.height;
    }

    // Generate video using existing generateStoryboardVideo function
    const videoUrl = await generateStoryboardVideo(
      prompt,
      initImage,
      onProgress,
      options.preferredModel || 'auto',
      generationOptions
    );

    console.log(`✅ Video generated successfully for shot`);
    return videoUrl;
  } catch (error) {
    console.error('❌ Failed to generate shot video:', error);
    throw error;
  }
}

/**
 * Generate videos for multiple shots in a scene (batch processing)
 */
export async function generateSceneVideos(
  scene: GeneratedScene,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<BatchVideoResult> {
  const results: BatchVideoResult = {
    success: true,
    videos: [],
    totalDuration: 0,
    failedCount: 0,
  };

  const shots = scene.shotList || [];
  console.log(`🎬 Starting batch video generation for ${shots.length} shots`);

  // 🆕 Track last video URL for sequential generation
  let lastVideoUrl: string | undefined;

  // 🆕 Track previous shot metadata for prompt continuity
  let previousShot: VideoShot | undefined;

  // 🆕 Track character emotional state across shots
  let currentCharacter = options.character;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];

    try {
      // Update progress
      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 0,
          status: 'generating',
        });
      }

      // 🆕 EMOTION CONTINUITY: Update character emotional state for this shot
      if (currentCharacter && options.currentScene) {
        currentCharacter = updateEmotionalState(
          currentCharacter,
          `scene-${scene.sceneNumber}-shot-${i + 1}`
        );
        console.log(
          `🎭 Shot ${i + 1} emotion: ${currentCharacter.emotionalState?.currentMood} (energy: ${currentCharacter.emotionalState?.energyLevel})`
        );
      }

      // Find corresponding storyboard image for this shot
      const storyboardImage = scene.storyboard?.[i]?.image;

      // 🆕 SEQUENTIAL GENERATION: Use last video for continuity
      const shotOptions: VideoGenerationOptions = {
        ...options,
        previousVideo: i > 0 ? lastVideoUrl : undefined, // Use previous shot's video
        previousShot: i > 0 ? previousShot : undefined,
        transitionType: options.transitionType || 'smooth', // Default to smooth transitions
        character: currentCharacter, // ✅ Pass updated character
        currentScene: options.currentScene, // ✅ Pass scene context
      };

      // Generate video for this shot
      const videoUrl = await generateShotVideo(
        shot,
        storyboardImage,
        shotOptions, // ✅ Pass options with previousVideo
        progress => {
          if (onProgress) {
            onProgress({
              shotIndex: i,
              totalShots: shots.length,
              currentProgress: progress,
              status: 'generating',
            });
          }
        }
      );

      // 🆕 Store video URL for next shot
      lastVideoUrl = videoUrl;
      previousShot = shot;

      // Store result
      results.videos.push({
        shotId: `${shot.scene}-shot-${shot.shot}`,
        videoUrl: videoUrl,
        duration: shot.durationSec,
      });

      results.totalDuration += shot.durationSec;

      // Update progress - completed
      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 100,
          status: 'completed',
          videoUrl: videoUrl,
        });
      }

      // Small delay between shots to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to generate video for shot ${i}:`, error);

      results.failedCount++;
      results.videos.push({
        shotId: `${shot.scene}-shot-${shot.shot}`,
        videoUrl: '',
        duration: 0,
        error: errorMessage,
      });

      // Update progress - failed
      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 0,
          status: 'failed',
          error: errorMessage,
        });
      }

      // Continue with next shot instead of failing completely
      console.warn(`⚠️ Continuing with remaining shots...`);
    }
  }

  results.success = results.failedCount === 0;
  console.log(
    `✅ Batch generation complete: ${results.videos.length - results.failedCount}/${shots.length} successful`
  );

  if (lastVideoUrl) {
    console.log(`🔗 Sequential generation used ${shots.length - 1} frame transitions`);
  }

  return results;
}

type PromptContext = {
  character?: Character;
  castCharacters?: Character[];
  currentScene?: GeneratedScene;
  previousShot?: VideoShot;
  maxChars?: number;
};

function safeTrim(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function truncateTo(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function extractHairSpecFromPhysical(physical: Record<string, string> | undefined): {
  raw: string;
  hintEn: string;
  isLong: boolean;
  isDarkBrown: boolean;
} {
  const rawCandidates: string[] = [];
  const get = (key: string) => {
    if (!physical) return '';
    const found = Object.entries(physical).find(([k]) => k.trim().toLowerCase() === key);
    return safeTrim(found?.[1]);
  };

  const hair = get('hair');
  const hairStyle = get('hair style');
  const physicalCharacteristics = get('physical characteristics');

  if (hair) rawCandidates.push(hair);
  if (hairStyle && hairStyle !== hair) rawCandidates.push(hairStyle);
  if (physicalCharacteristics) {
    if (/\b(hair)\b/i.test(physicalCharacteristics) || /ผม/.test(physicalCharacteristics)) {
      rawCandidates.push(physicalCharacteristics);
    }
  }

  const raw = truncateTo(rawCandidates.filter(Boolean).join(' | '), 220);
  const hasThai = /[\u0E00-\u0E7F]/.test(raw);

  const hints: string[] = [];
  const isLong = /ยาวประบ่า|ยาวถึงไหล่|ผมยาว/.test(raw) || /shoulder-?length|long hair/i.test(raw);
  const isDarkBrown = /น้ำตาลเข้ม|dark\s*brown/i.test(raw);
  const isWavy = /ดัดลอน|ลอนอ่อน|wavy|soft\s*waves/i.test(raw);

  if (hasThai) {
    if (/ยาวประบ่า|ยาวถึงไหล่/.test(raw)) hints.push('shoulder-length');
    else if (/ผมยาว/.test(raw)) hints.push('long hair');
    if (/ดัดลอน|ลอนอ่อน/.test(raw)) hints.push('soft wavy');
    if (/น้ำตาลเข้ม/.test(raw)) hints.push('dark brown');
  } else {
    if (isLong) hints.push('shoulder-length');
    if (isWavy) hints.push('soft wavy');
    if (isDarkBrown) hints.push('dark brown');
  }

  return {
    raw,
    hintEn: hints.length ? hints.join(', ') : '',
    isLong,
    isDarkBrown,
  };
}

function buildHairNegativePrompt(hair: {
  raw: string;
  isLong: boolean;
  isDarkBrown: boolean;
}): string {
  if (!hair.raw) return '';

  const negatives: string[] = [];
  if (hair.isLong) {
    negatives.push('short hair', 'bob cut', 'pixie cut');
  }
  if (hair.isDarkBrown) {
    negatives.push('blonde hair', 'light hair', 'unnatural hair color', 'vivid dyed hair');
  }
  return negatives.join(', ');
}

function summarizeRecord(record: Record<string, string> | undefined, maxPairs: number): string {
  if (!record) return '';
  const entries = Object.entries(record)
    .map(([k, v]) => [safeTrim(k), safeTrim(v)] as const)
    .filter(([k, v]) => k && v);
  if (entries.length === 0) return '';

  // Prefer common keys when present.
  const preferredKeys = [
    'gender',
    'age',
    'ethnicity',
    'skin',
    'skin tone',
    'hair',
    'eyes',
    'height',
    'build',
    'outfit',
    'style',
    'clothing',
  ];
  const preferred: Array<[string, string]> = [];
  for (const key of preferredKeys) {
    const found = entries.find(([k]) => k.toLowerCase() === key);
    if (found && !preferred.some(([k]) => k === found[0])) {
      preferred.push(found as [string, string]);
    }
  }

  const merged = [...preferred, ...entries.filter(e => !preferred.some(p => p[0] === e[0]))];
  return merged
    .slice(0, maxPairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

/**
 * Build comprehensive video generation prompt from shot details.
 * Adds lightweight continuity anchors (character + scene + previous shot) and caps length.
 */
function buildVideoPrompt(shot: VideoShot, context: PromptContext = {}): string {
  const parts: string[] = [];

  // Continuity anchors (highest priority, but kept short)
  if (context.character) {
    const name = safeTrim(context.character.name);
    const role = safeTrim(context.character.role);
    const desc = truncateTo(safeTrim(context.character.description), 180);
    const physical = summarizeRecord(context.character.physical, 3);
    // Shot List can override Costume & Fashion per shot (keeps other character fields intact)
    const effectiveFashion =
      shot && typeof (shot as any).costumeFashion === 'object' && (shot as any).costumeFashion
        ? ((shot as any).costumeFashion as Record<string, string>)
        : context.character.fashion;
    const fashion = summarizeRecord(effectiveFashion, 2);
    const hair = extractHairSpecFromPhysical(context.character.physical);

    const characterBits = [
      name ? `Character: ${name}` : '',
      role ? `Role: ${role}` : '',
      desc ? `Description: ${desc}` : '',
      physical ? `Appearance: ${physical}` : '',
      hair.raw ? `Hair (AUTHORITATIVE): ${hair.raw}${hair.hintEn ? ` (${hair.hintEn})` : ''}` : '',
      fashion ? `Wardrobe: ${fashion}` : '',
    ].filter(Boolean);

    if (characterBits.length) {
      parts.push(characterBits.join('. '));
      parts.push('Maintain the exact same identity, face, hair, and outfit continuity.');
    }
  }

  // Multi-cast identity anchors (short, high-signal, and capped)
  if (Array.isArray(context.castCharacters) && context.castCharacters.length > 0) {
    const leadName = safeTrim(context.character?.name);
    const seen = new Set<string>();

    const supporting = context.castCharacters
      .filter(c => {
        const name = safeTrim(c?.name);
        if (!name) return false;
        if (leadName && name === leadName) return false;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 3);

    if (supporting.length > 0) {
      const otherSummaries = supporting
        .map(c => {
          const name = safeTrim(c.name);
          const physical = summarizeRecord(c.physical, 2);
          const fashion = summarizeRecord(c.fashion, 1);
          const hair = extractHairSpecFromPhysical(c.physical);

          const bits = [
            name ? `Character: ${name}` : '',
            physical ? `Appearance: ${physical}` : '',
            hair.raw
              ? `Hair (AUTHORITATIVE): ${hair.raw}${hair.hintEn ? ` (${hair.hintEn})` : ''}`
              : '',
            fashion ? `Wardrobe: ${fashion}` : '',
          ].filter(Boolean);

          return bits.join('. ');
        })
        .filter(Boolean);

      if (otherSummaries.length > 0) {
        parts.push(`Other characters (IDENTITY LOCK): ${otherSummaries.join(' | ')}`);
        parts.push('Do not swap faces, hairstyles, or body types between characters.');
      }
    }
  }

  if (context.currentScene) {
    const sceneName = safeTrim(context.currentScene.sceneDesign?.sceneName);
    const location = safeTrim(context.currentScene.sceneDesign?.location);
    const mood = safeTrim(context.currentScene.sceneDesign?.moodTone);

    const sceneBits = [
      sceneName ? `Scene: ${sceneName}` : '',
      location ? `Location: ${location}` : '',
      mood ? `Tone: ${mood}` : '',
    ].filter(Boolean);
    if (sceneBits.length) {
      parts.push(sceneBits.join('. '));
    }
  }

  if (context.previousShot?.description) {
    const prevType = context.previousShot.shotType || context.previousShot.shotSize;
    const prevDesc = truncateTo(safeTrim(context.previousShot.description), 140);
    parts.push(
      truncateTo(
        `Continue smoothly from the previous shot${prevType ? ` (${prevType})` : ''}: ${prevDesc}`,
        220
      )
    );
  }

  // Shot type and framing (support both shotType and shotSize)
  const shotType = shot.shotType || shot.shotSize;
  if (shotType) {
    parts.push(`${shotType} shot`);
  }

  // Camera angle (support both angle and perspective)
  const angle = shot.angle || shot.perspective;
  if (angle) {
    parts.push(`${angle} angle`);
  }

  // Camera movement
  if (shot.movement && shot.movement !== 'Static') {
    parts.push(`${shot.movement.toLowerCase()} camera movement`);
  }

  // Lighting (support both lighting and lightingDesign)
  const lighting = shot.lighting || shot.lightingDesign;
  if (lighting) {
    parts.push(`${lighting.toLowerCase()} lighting`);
  }

  // Main description
  if (shot.description) {
    parts.push(shot.description);
  }

  // Cast/characters
  if (shot.cast) {
    parts.push(`featuring ${shot.cast}`);
  }

  // Set/location
  if (shot.set) {
    parts.push(`in ${shot.set}`);
  }

  // Costume details
  if (shot.costume && typeof shot.costume === 'string') {
    parts.push(`wearing ${shot.costume}`);
  } else if (shot.costumeFashion && typeof shot.costumeFashion === 'object') {
    const fashionSummary = summarizeRecord(shot.costumeFashion as Record<string, string>, 3);
    if (fashionSummary) {
      parts.push(`Costume & Fashion: ${fashionSummary}`);
    }
  }

  // Quality modifiers
  parts.push('cinematic quality');
  parts.push('professional cinematography');
  parts.push('smooth motion');
  parts.push('4K resolution');

  const joined = parts.join(', ');
  return truncateTo(joined, context.maxChars ?? 900);
}

/**
 * Stitch multiple videos together into one complete video
 * (This requires video processing library - placeholder for now)
 */
export async function stitchVideos(
  videoUrls: string[],
  options: {
    transitions?: 'none' | 'fade' | 'dissolve' | 'cut';
    transitionDuration?: number;
    outputQuality?: '480p' | '720p' | '1080p' | '4K';
  } = {}
): Promise<string> {
  console.log(`🎬 Stitching ${videoUrls.length} videos together...`);

  // Note: Full video stitching requires FFmpeg backend service
  // This is a client-side implementation that creates a playlist
  // For production, consider using:
  // 1. FFmpeg backend service (Node.js + fluent-ffmpeg)
  // 2. Cloud video processing (AWS MediaConvert, Google Transcoder API)
  // 3. Third-party services (Shotstack, Cloudinary)

  try {
    // Create a simple concatenation using HTML5 video playlist
    // This creates a JSON manifest that can be played sequentially
    const playlist = {
      videos: videoUrls.map((url, index) => ({
        id: `video-${index}`,
        url: url,
        order: index,
      })),
      transitions: options.transitions || 'cut',
      transitionDuration: options.transitionDuration || 0,
      outputQuality: options.outputQuality || '1080p',
      createdAt: new Date().toISOString(),
    };

    // Convert playlist to blob and create URL
    const playlistBlob = new Blob([JSON.stringify(playlist, null, 2)], {
      type: 'application/json',
    });
    const playlistUrl = URL.createObjectURL(playlistBlob);

    console.log('✅ Video playlist created:', playlistUrl);
    console.log(`📋 Playlist contains ${videoUrls.length} videos`);

    // For future implementation with backend:
    // - Send videoUrls to backend FFmpeg service
    // - Backend downloads, stitches, and uploads final video
    // - Return final video URL from Firebase Storage

    return playlistUrl;
  } catch (error) {
    console.error('❌ Video stitching failed:', error);
    throw new Error(
      `Failed to create video playlist: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate complete movie from all scenes
 */
export async function generateCompleteMovie(
  scenes: GeneratedScene[],
  options: VideoGenerationOptions = {},
  onProgress?: (
    sceneIndex: number,
    totalScenes: number,
    shotProgress: VideoGenerationProgress
  ) => void
): Promise<{
  success: boolean;
  sceneVideos: Array<{
    sceneId: string;
    shots: Array<{ shotId: string; videoUrl: string; duration: number }>;
    totalDuration: number;
  }>;
  totalDuration: number;
  totalShots: number;
}> {
  console.log(`🎬 Starting complete movie generation for ${scenes.length} scenes`);

  const sceneVideos: Array<{
    sceneId: string;
    shots: Array<{ shotId: string; videoUrl: string; duration: number }>;
    totalDuration: number;
  }> = [];

  let totalDuration = 0;
  let totalShots = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`🎬 Processing scene ${i + 1}/${scenes.length}`);

    try {
      // Generate videos for all shots in this scene
      const result = await generateSceneVideos(scene, options, shotProgress => {
        if (onProgress) {
          onProgress(i, scenes.length, shotProgress);
        }
      });

      sceneVideos.push({
        sceneId: `scene-${scene.sceneNumber}`,
        shots: result.videos,
        totalDuration: result.totalDuration,
      });

      totalDuration += result.totalDuration;
      totalShots += result.videos.length;
    } catch (error) {
      console.error(`❌ Failed to process scene ${i}:`, error);
      // Continue with next scene
    }
  }

  console.log(
    `✅ Complete movie generation finished: ${sceneVideos.length}/${scenes.length} scenes, ${totalShots} total shots, ${totalDuration.toFixed(1)}s duration`
  );

  return {
    success: sceneVideos.length === scenes.length,
    sceneVideos,
    totalDuration,
    totalShots,
  };
}

/**
 * Export complete movie data for download/sharing
 */
export function exportMovieData(movieData: {
  title: string;
  scenes: Array<{
    sceneId: string;
    shots: Array<{ shotId: string; videoUrl: string; duration: number }>;
  }>;
  totalDuration: number;
}) {
  const exportData = {
    title: movieData.title,
    createdAt: new Date().toISOString(),
    totalDuration: movieData.totalDuration,
    scenes: movieData.scenes.map((scene, idx) => ({
      sceneNumber: idx + 1,
      sceneId: scene.sceneId,
      shotCount: scene.shots.length,
      shots: scene.shots.map((shot, shotIdx) => ({
        shotNumber: shotIdx + 1,
        shotId: shot.shotId,
        videoUrl: shot.videoUrl,
        duration: shot.duration,
      })),
    })),
  };

  // Create downloadable JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${movieData.title.replace(/\s+/g, '-')}-movie-data.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('✅ Movie data exported successfully');
}
