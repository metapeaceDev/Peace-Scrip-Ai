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

import React, { useState, useCallback } from 'react';
import { Film, Play, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  generateShotVideo,
  generateSceneVideos,
  type VideoGenerationOptions,
  type VideoGenerationProgress,
} from '../services/videoGenerationService';

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

// Simplified GeneratedScene type for testing
interface GeneratedScene {
  id?: string;
  sceneNumber?: number;
  title?: string;
  emotionalTone?: string;
  setting?: string;
  timeOfDay?: string;
  weatherAtmosphere?: string;
  shotList?: Shot[];
  dialogue?: unknown[];
  storyboard?: { shot: number; image: string; video?: string }[];
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

  // Sample test scene with multiple shots
  const [testScene] = useState<GeneratedScene>({
    id: 'test-scene-001',
    title: 'Opening Meditation Scene',
    emotionalTone: 'Peaceful, Contemplative',
    setting: 'Temple Garden at Dawn',
    timeOfDay: 'Early Morning',
    weatherAtmosphere: 'Clear sky with soft morning mist',
    shotList: [
      {
        shotId: 'shot-001',
        shotType: 'Wide Shot',
        angle: 'High Angle',
        movement: 'Slow Pan Right',
        lighting: 'Soft Dawn Light',
        description: 'Establishing shot of ancient temple surrounded by mist',
        duration: 4,
        set: 'Temple exterior',
      },
      {
        shotId: 'shot-002',
        shotType: 'Medium Shot',
        angle: 'Eye Level',
        movement: 'Static',
        lighting: 'Natural Soft Light',
        description: 'Monk walking slowly through temple garden path',
        duration: 3,
        cast: 'Buddhist monk',
        set: 'Garden pathway',
      },
      {
        shotId: 'shot-003',
        shotType: 'Close-Up',
        angle: 'Low Angle',
        movement: 'Slow Zoom In',
        lighting: 'Golden Hour',
        description: 'Lotus flower blooming in morning light',
        duration: 3,
        set: 'Temple pond',
      },
    ],
    dialogue: [],
  });

  const handleSingleShotTest = useCallback(async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setError('');
      setVideoUrl('');

      console.log('🎬 Starting single shot video generation test...');

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
      console.log('✅ Single shot test completed successfully!');
    } catch (err: any) {
      console.error('❌ Single shot test failed:', err);
      setError(err.message || 'Unknown error occurred');
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

      console.log('🎬 Starting batch video generation test...');

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

      console.log('✅ Batch test completed successfully!');
    } catch (err: any) {
      console.error('❌ Batch test failed:', err);
      setError(err.message || 'Unknown error occurred');
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
            <Film className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">
              Video Generation Test Suite
            </h1>
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
            <h2 className="text-xl font-semibold text-white mb-4">
              Single Shot Configuration
            </h2>

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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Video... {progress}%
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
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
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
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
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Video Generated Successfully!</span>
                  </div>
                  <a
                    href={videoUrl}
                    download="generated-video.mp4"
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-white text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg"
                  autoPlay
                  loop
                />
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
              {testScene.shotList?.map((shot: Shot, idx: number) => (
                <div
                  key={shot.shotId}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">
                        Shot {idx + 1}: {shot.shotType}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{shot.description}</p>
                    </div>
                    {batchProgress[idx] && (
                      <div className="flex items-center gap-2">
                        {batchProgress[idx].status === 'generating' && (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        )}
                        {batchProgress[idx].status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                        {batchProgress[idx].status === 'failed' && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating {batchProgress.length} / {testScene.shotList?.length || 0}{' '}
                  Videos...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate All Videos
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
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
