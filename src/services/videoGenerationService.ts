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
import type { GeneratedScene, Character } from '../../types';

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
}

export interface VideoGenerationOptions {
  quality?: '480p' | '720p' | '1080p' | '4K';
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
  preferredModel?: 'gemini-veo' | 'comfyui-svd' | 'comfyui-animatediff' | 'auto';
  fps?: number;
  duration?: number;
  frameCount?: number;
  motionStrength?: number;

  // 🆕 VIDEO EXTENSION: Sequential Generation Support
  previousVideo?: string; // URL of previous video for seamless continuation
  endFrameInfluence?: number; // 0-1, strength of last frame influence (default: 0.7)
  transitionType?: 'seamless' | 'smooth' | 'creative'; // Transition style

  // 🆕 CHARACTER CONSISTENCY: Face ID & LoRA Support
  characterReference?: {
    faceImage?: string; // Face reference image (base64 or URL)
    loraPath?: string; // Custom LoRA model path
    loraStrength?: number; // 0-1 (default: 0.8)
  };

  // 🆕 BUDDHIST PSYCHOLOGY INTEGRATION: Character & Scene Context
  character?: Character; // Character with emotional state and psychology
  currentScene?: GeneratedScene; // Scene context for emotion tracking
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
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
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
        // Cleanup
        video.remove();
      }
    };

    video.onerror = error => {
      reject(new Error(`Failed to load video: ${error}`));
    };

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Video frame extraction timed out'));
    }, 10000);
  });
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
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`🎬 Generating video for shot: ${shot.shotType || shot.shotSize || 'Unknown'}`);

    // 🆕 SEQUENTIAL GENERATION: Extract last frame from previous video
    let initImage = baseImage;
    if (options.previousVideo && !baseImage) {
      console.log('🔗 Sequential generation: Extracting last frame from previous video...');
      try {
        initImage = await extractLastFrame(options.previousVideo);
        console.log('✅ Last frame extracted successfully for seamless continuation');
      } catch (error) {
        console.warn('⚠️ Failed to extract last frame, generating without init image:', error);
        // Continue without init image
      }
    }

    // Build comprehensive prompt from shot details
    const prompt = buildVideoPrompt(shot);

    // Get duration (support both duration and durationSec fields)
    const duration = options.duration || shot.duration || shot.durationSec || 3;

    // 🆕 Adjust generation parameters for sequential continuity
    const generationOptions: Record<string, unknown> = {
      fps: options.fps || 24,
      duration: duration,
      motionStrength: options.motionStrength || 0.7,
    };

    // 🆕 If using previous video, adjust for better continuity
    if (options.previousVideo && initImage) {
      // Lower motion strength for smoother transition
      if (options.transitionType === 'seamless') {
        generationOptions.motionStrength = 0.5; // Subtle motion
      } else if (options.transitionType === 'smooth') {
        generationOptions.motionStrength = 0.6; // Moderate motion
      }
      // 'creative' uses default 0.7

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

/**
 * Build comprehensive video generation prompt from shot details
 */
function buildVideoPrompt(shot: VideoShot): string {
  const parts: string[] = [];

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
  if (shot.costume) {
    parts.push(`wearing ${shot.costume}`);
  }

  // Quality modifiers
  parts.push('cinematic quality');
  parts.push('professional cinematography');
  parts.push('smooth motion');
  parts.push('4K resolution');

  return parts.join(', ');
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
