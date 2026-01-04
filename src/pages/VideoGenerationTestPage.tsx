/**
 * Video Generation Test Page
 *
 * Test interface for Veo 3.1 video generation:
 * - Single shot testing
 * - Batch processing validation
 * - API credential verification
 * - Error handling demonstration
 * - Progress tracking showcase
 *
 * @author Peace Script AI Team
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  generateShotVideo,
  generateSceneVideos,
  type VideoGenerationOptions,
  type VideoGenerationProgress,
} from '../services/videoGenerationService';
import type { GeneratedScene } from '../types';

// Simplified Shot type for testing
interface Shot {
  shotId?: string;
  scene?: string;
  shot?: number;
  shotType?: string;
  angle?: string;
  movement?: string;
  lighting?: string;
  description?: string;
  duration?: number;
  durationSec?: number;
  cast?: string;
  set?: string;
  costume?: string;
}

export default function VideoGenerationTestPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [batchProgress, setBatchProgress] = useState<VideoGenerationProgress[]>([]);
  const [testMode, setTestMode] = useState<'single' | 'batch'>('single');

  // Sample test shot
  const [testShot] = useState<Shot>({
    shotId: 'test-shot-001',
    shotType: 'Medium Close-Up',
    angle: 'Eye Level',
    movement: 'Slow Zoom In',
    lighting: 'Golden Hour',
    description:
      'A peaceful Buddhist monk meditating under a Bodhi tree, surrounded by soft golden light filtering through leaves',
    duration: 5,
    cast: 'Buddhist monk in orange robes',
    set: 'Ancient temple garden',
    costume: 'Traditional Theravada Buddhist robes',
  });

  // Sample test scene with multiple shots (using proper GeneratedScene type)
  const [testScene] = useState<GeneratedScene>({
    sceneNumber: 1,
    sceneDesign: {
      sceneName: 'Opening Meditation Scene',
      characters: ['Buddhist Monk'],
      location: 'Temple Garden at Dawn',
      situations: [],
      moodTone: 'Peaceful, Contemplative',
    },
    shotList: [
      {
        scene: 'Scene 1',
        shot: 1,
        shotSize: 'Wide Shot',
        perspective: 'High Angle',
        movement: 'Slow Pan Right',
        lightingDesign: 'Soft Dawn Light',
        description: 'Establishing shot of ancient temple surrounded by mist',
        durationSec: 4,
        set: 'Temple exterior',
        equipment: 'Drone',
        focalLength: '24mm',
        aspectRatio: '16:9',
        colorTemperature: '5600K',
      },
      {
        scene: 'Scene 1',
        shot: 2,
        shotSize: 'Medium Shot',
        perspective: 'Eye Level',
        movement: 'Static',
        lightingDesign: 'Natural Soft Light',
        description: 'Monk walking slowly through temple garden path',
        durationSec: 3,
        cast: 'Buddhist monk',
        set: 'Garden pathway',
        equipment: 'Steadicam',
        focalLength: '50mm',
        aspectRatio: '16:9',
        colorTemperature: '5200K',
      },
      {
        scene: 'Scene 1',
        shot: 3,
        shotSize: 'Close-Up',
        perspective: 'Low Angle',
        movement: 'Slow Zoom In',
        lightingDesign: 'Golden Hour',
        description: 'Lotus flower blooming in morning light',
        durationSec: 3,
        set: 'Temple pond',
        equipment: 'Macro Lens',
        focalLength: '100mm',
        aspectRatio: '16:9',
        colorTemperature: '4800K',
      },
    ],
    storyboard: [],
    propList: [],
    breakdown: { part1: [], part2: [], part3: [] },
  });

  const handleSingleShotTest = useCallback(async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setError('');
      setVideoUrl('');

      logger.info('🎬 Starting single shot video generation test');

      const options: VideoGenerationOptions = {
        quality: '720p',
        aspectRatio: '16:9',
        preferredModel: 'gemini-veo',
        fps: 24,
        duration: testShot.duration,
        motionStrength: 0.7,
      };

      const url = await generateShotVideo(
        testShot,
        undefined, // No base image for this test
        options,
        (p: number) => setProgress(Math.round(p))
      );

      setVideoUrl(url);
      setProgress(100);
      logger.info('✅ Single shot test completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('❌ Single shot test failed', { error: err });
      setError(errorMessage);
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  }, [testShot]);

  const handleBatchTest = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError('');
      setBatchProgress([]);

      logger.info('🎬 Starting batch video generation test');

      const options: VideoGenerationOptions = {
        quality: '720p',
        aspectRatio: '16:9',
        preferredModel: 'gemini-veo',
      };

      await generateSceneVideos(testScene, options, (progressData: VideoGenerationProgress) => {
        setBatchProgress((prev: VideoGenerationProgress[]) => {
          const newProgress = [...prev];
          newProgress[progressData.shotIndex] = progressData;
          return newProgress;
        });
      });

      logger.info('✅ Batch test completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('❌ Batch test failed', { error: err });
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [testScene]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-purple-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <h1 className="text-4xl font-bold text-white">Video Generation Test Suite</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Test Gemini Veo 3.1 API integration and video generation pipeline
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Test Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setTestMode('single')}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                testMode === 'single'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Single Shot Test
            </button>
            <button
              onClick={() => setTestMode('batch')}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                testMode === 'batch'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Batch Processing Test (3 shots)
            </button>
          </div>
        </div>

        {/* Single Shot Test */}
        {testMode === 'single' && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Single Shot Configuration</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Shot Type</label>
                <div className="text-white font-medium">{testShot.shotType}</div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Movement</label>
                <div className="text-white font-medium">{testShot.movement}</div>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <div className="text-white">{testShot.description}</div>
              </div>
            </div>

            <button
              onClick={handleSingleShotTest}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating Video... {progress}%
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Generate Video
                </>
              )}
            </button>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="mt-4">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-gray-400 text-sm mt-2">
                  {progress < 30
                    ? 'Initializing video generation...'
                    : progress < 70
                      ? 'Processing frames...'
                      : progress < 95
                        ? 'Finalizing video...'
                        : 'Almost done...'}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Preview */}
            {videoUrl && (
              <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg
                      className="w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold">Video Generated Successfully!</span>
                  </div>
                  <a
                    href={videoUrl}
                    download="generated-video.mp4"
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-white text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Download
                  </a>
                </div>
                <video src={videoUrl} controls className="w-full rounded-lg" autoPlay loop />
              </div>
            )}
          </div>
        )}

        {/* Batch Processing Test */}
        {testMode === 'batch' && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Batch Processing - {testScene.shotList?.length || 0} Shots
            </h2>

            <div className="space-y-3 mb-6">
              {testScene.shotList?.map((shot, idx: number) => (
                <div
                  key={`shot-${idx}`}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">
                        Shot {idx + 1}: {shot.shotSize}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{shot.description}</p>
                    </div>
                    {batchProgress[idx] && (
                      <div className="flex items-center gap-2">
                        {batchProgress[idx].status === 'generating' && (
                          <svg
                            className="w-4 h-4 animate-spin text-purple-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        )}
                        {batchProgress[idx].status === 'completed' && (
                          <svg
                            className="w-4 h-4 text-green-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {batchProgress[idx].status === 'failed' && (
                          <svg
                            className="w-4 h-4 text-red-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span className="text-sm text-gray-400">
                          {batchProgress[idx].currentProgress}%
                        </span>
                      </div>
                    )}
                  </div>

                  {batchProgress[idx]?.videoUrl && (
                    <video
                      src={batchProgress[idx].videoUrl}
                      controls
                      className="w-full rounded-lg mt-3"
                      style={{ maxHeight: '200px' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleBatchTest}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating {batchProgress.length} / {testScene.shotList?.length || 0} Videos...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Generate All Videos
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-red-400 font-semibold mb-1">Batch Error</h3>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Status */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">API Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Veo 3.1 API</div>
              <div className="text-white font-medium">
                {import.meta.env.VITE_GEMINI_API_KEY ? (
                  <span className="text-green-400">✓ Configured</span>
                ) : (
                  <span className="text-red-400">✗ Missing API Key</span>
                )}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Model</div>
              <div className="text-white font-medium">veo-3.1-fast-generate-preview</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Resolution</div>
              <div className="text-white font-medium">720p</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Aspect Ratio</div>
              <div className="text-white font-medium">16:9</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
