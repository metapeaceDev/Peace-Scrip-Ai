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
import type { GeneratedScene } from '../../types';

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
}

export interface VideoGenerationProgress {
  shotIndex: number;
  totalShots: number;
  currentProgress: number;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
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

    // Build comprehensive prompt from shot details
    const prompt = buildVideoPrompt(shot);

    // Get duration (support both duration and durationSec fields)
    const duration = options.duration || shot.duration || shot.durationSec || 3;

    // Generate video using existing generateStoryboardVideo function
    const videoUrl = await generateStoryboardVideo(
      prompt,
      baseImage,
      onProgress,
      options.preferredModel || 'auto',
      {
        fps: options.fps || 24,
        duration: duration,
        motionStrength: options.motionStrength || 0.7,
      }
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

      // Find corresponding storyboard image for this shot
      const storyboardImage = scene.storyboard?.[i]?.image;

      // Generate video for this shot
      const videoUrl = await generateShotVideo(
        shot,
        storyboardImage,
        options,
        (progress) => {
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
  onProgress?: (sceneIndex: number, totalScenes: number, shotProgress: VideoGenerationProgress) => void
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
      const result = await generateSceneVideos(
        scene,
        options,
        (shotProgress) => {
          if (onProgress) {
            onProgress(i, scenes.length, shotProgress);
          }
        }
      );

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
