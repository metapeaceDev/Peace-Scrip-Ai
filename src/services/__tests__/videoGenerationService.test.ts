/**
 * Tests for videoGenerationService
 * 
 * These tests verify the video generation service functionality including:
 * - Single shot video generation
 * - Batch scene video generation
 * - Video prompt building
 * - Video stitching (playlist creation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateShotVideo,
  generateSceneVideos,
  stitchVideos,
} from '../videoGenerationService';

// Mock Firebase Storage
vi.mock('../../config/firebase', () => ({
  storage: {
    ref: vi.fn(),
  },
}));

// Mock Gemini Service
vi.mock('../geminiService', () => ({
  generateStoryboardVideo: vi.fn().mockResolvedValue('https://example.com/video.mp4'),
  VIDEO_MODELS_CONFIG: {
    veo: {
      name: 'Gemini Veo 3.1',
      available: true,
      tier: 1,
    },
  },
}));

describe('videoGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock URL.createObjectURL for Node.js environment
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url-12345');
    global.Blob = vi.fn((content: any[]) => ({ 
      size: JSON.stringify(content).length,
      type: 'application/json'
    })) as any;
  });

  describe('generateShotVideo', () => {
    it('should generate video for a shot with full details', async () => {
      const shot = {
        scene: '1A',
        shot: '1',
        shotSize: 'Medium Shot',
        perspective: 'Eye-Level',
        movement: 'Static',
        description: 'Character enters the room',
        cast: 'John Doe',
        set: 'Living Room',
        costume: 'Casual wear',
        durationSec: 5,
      };

      const videoUrl = await generateShotVideo(shot);

      expect(videoUrl).toBeDefined();
      expect(typeof videoUrl).toBe('string');
      expect(videoUrl).toContain('http');
    });

    it('should handle shot with minimal details', async () => {
      const shot = {
        scene: '1A',
        shot: '2',
        description: 'Simple scene',
        durationSec: 3,
      };

      const videoUrl = await generateShotVideo(shot);

      expect(videoUrl).toBeDefined();
    });

    it('should call progress callback during generation', async () => {
      const shot = {
        scene: '1A',
        shot: '1',
        description: 'Test shot',
        durationSec: 5,
      };

      const onProgress = vi.fn();
      await generateShotVideo(shot, undefined, {}, onProgress);

      // Progress should be called at least once
      expect(onProgress).toHaveBeenCalled();
      
      // Should receive progress values between 0 and 100
      const progressValues = onProgress.mock.calls.map(call => call[0]);
      expect(progressValues.every((v: number) => v >= 0 && v <= 100)).toBe(true);
    });
  });

  describe('generateSceneVideos', () => {
    it('should generate videos for all shots in a scene', async () => {
      const scene = {
        sceneNumber: 1,
        sceneTitle: 'Opening Scene',
        shotList: [
          {
            scene: '1A',
            shot: '1',
            description: 'First shot',
            durationSec: 5,
          },
          {
            scene: '1A',
            shot: '2',
            description: 'Second shot',
            durationSec: 3,
          },
        ],
        storyboard: [
          { image: 'https://example.com/img1.jpg' },
          { image: 'https://example.com/img2.jpg' },
        ],
      };

      const result = await generateSceneVideos(scene as any);

      expect(result.success).toBe(true);
      expect(result.videos).toHaveLength(2);
      expect(result.failedCount).toBe(0);
      expect(result.totalDuration).toBe(8); // 5 + 3
    });

    it('should handle partial failures gracefully', async () => {
      const { generateStoryboardVideo } = await import('../geminiService');
      
      // Mock first call to succeed, second to fail
      vi.mocked(generateStoryboardVideo)
        .mockResolvedValueOnce('https://example.com/video1.mp4')
        .mockRejectedValueOnce(new Error('Generation failed'));

      const scene = {
        sceneNumber: 1,
        sceneTitle: 'Test Scene',
        shotList: [
          { scene: '1A', shot: '1', description: 'Shot 1', durationSec: 5 },
          { scene: '1A', shot: '2', description: 'Shot 2', durationSec: 3 },
        ],
      };

      const result = await generateSceneVideos(scene as any);

      expect(result.success).toBe(false);
      expect(result.videos).toHaveLength(2);
      expect(result.failedCount).toBe(1);
      expect(result.videos[0].videoUrl).toBeTruthy();
      expect(result.videos[1].videoUrl).toBe('');
      expect(result.videos[1].error).toBeDefined();
    });

    it('should report progress for each shot', async () => {
      const scene = {
        sceneNumber: 1,
        sceneTitle: 'Test Scene',
        shotList: [
          { scene: '1A', shot: '1', description: 'Shot 1', durationSec: 5 },
        ],
      };

      const onProgress = vi.fn();
      await generateSceneVideos(scene as any, {}, onProgress);

      // Should have progress callbacks for generating and completed
      expect(onProgress).toHaveBeenCalled();
      
      const statuses = onProgress.mock.calls.map(call => call[0].status);
      expect(statuses).toContain('generating');
      expect(statuses).toContain('completed');
    });
  });

  describe('stitchVideos', () => {
    it('should create playlist from video URLs', async () => {
      const videoUrls = [
        'https://example.com/video1.mp4',
        'https://example.com/video2.mp4',
        'https://example.com/video3.mp4',
      ];

      const playlistUrl = await stitchVideos(videoUrls);

      expect(playlistUrl).toBeDefined();
      expect(typeof playlistUrl).toBe('string');
      
      // Should create a blob URL
      expect(playlistUrl).toMatch(/^blob:/);
    });

    it('should include transition options in playlist', async () => {
      const videoUrls = [
        'https://example.com/video1.mp4',
        'https://example.com/video2.mp4',
      ];

      const options = {
        transitions: 'fade' as const,
        transitionDuration: 1.5,
        outputQuality: '4K' as const,
      };

      const playlistUrl = await stitchVideos(videoUrls, options);

      expect(playlistUrl).toBeDefined();
      
      // Verify playlist can be fetched and contains correct data
      const response = await fetch(playlistUrl);
      const playlist = await response.json();

      expect(playlist.videos).toHaveLength(2);
      expect(playlist.transitions).toBe('fade');
      expect(playlist.transitionDuration).toBe(1.5);
      expect(playlist.outputQuality).toBe('4K');
    });

    it('should handle empty video array', async () => {
      await expect(stitchVideos([])).rejects.toThrow();
    });
  });
});
