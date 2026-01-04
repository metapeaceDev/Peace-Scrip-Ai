/**
 * Video Generation Demo Page
 *
 * ตัวอย่างการใช้งาน video generation components:
 * - VideoGenerationProgress
 * - VideoGenerationError
 * - Automatic fallback handling
 */

import React, { useState } from 'react';
import VideoGenerationProgress from '../components/VideoGenerationProgress';
import VideoGenerationError, { type VideoError } from '../components/VideoGenerationError';
import {
  generateVideoWithFallback,
  type VideoGenerationRequest,
} from '../services/videoGenerationFallback';
import { parseVideoError, isRetryableError, hasFallbackOption } from '../utils/videoErrorUtils';

interface JobState {
  jobId: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  details?: any;
  error?: VideoError;
  videoUrl?: string;
}

const VideoGenerationDemo: React.FC = () => {
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    prompt: 'A serene sunset over mountains',
    videoType: 'animatediff' as 'animatediff' | 'svd',
    numFrames: 16,
    fps: 8,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);

    // Reset job state
    const jobId = `demo-${Date.now()}`;
    setJobState({
      jobId,
      progress: 0,
      status: 'queued',
    });

    try {
      const request: VideoGenerationRequest = {
        prompt: formData.prompt,
        videoType: formData.videoType,
        numFrames: formData.numFrames,
        fps: formData.fps,
      };

      const result = await generateVideoWithFallback(
        request,
        'comfyui', // Preferred method
        (progress, status) => {
          setJobState(prev => ({
            ...prev!,
            progress,
            status: progress === 100 ? 'completed' : 'processing',
            details: { currentNode: status },
          }));
        }
      );

      if (result.success) {
        setJobState(prev => ({
          ...prev!,
          progress: 100,
          status: 'completed',
          videoUrl: result.videoUrl,
        }));
      } else {
        setJobState(prev => ({
          ...prev!,
          status: 'failed',
          error: result.error,
        }));
      }
    } catch (error) {
      const videoError = parseVideoError(error, formData.videoType);
      setJobState(prev => ({
        ...prev!,
        status: 'failed',
        error: videoError,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    handleGenerate();
  };

  const handleFallback = async () => {
    if (!jobState?.error) return;

    setIsGenerating(true);
    const jobId = `fallback-${Date.now()}`;

    setJobState({
      jobId,
      progress: 0,
      status: 'queued',
    });

    try {
      const request: VideoGenerationRequest = {
        prompt: formData.prompt,
        videoType: formData.videoType,
        numFrames: formData.numFrames,
        fps: formData.fps,
      };

      // Use Gemini Veo as fallback
      const result = await generateVideoWithFallback(
        request,
        'gemini-veo', // Force fallback method
        (progress, status) => {
          setJobState(prev => ({
            ...prev!,
            progress,
            status: progress === 100 ? 'completed' : 'processing',
            details: { currentNode: status },
          }));
        }
      );

      if (result.success) {
        setJobState(prev => ({
          ...prev!,
          progress: 100,
          status: 'completed',
          videoUrl: result.videoUrl,
        }));
      } else {
        setJobState(prev => ({
          ...prev!,
          status: 'failed',
          error: result.error,
        }));
      }
    } catch (error) {
      const videoError = parseVideoError(error, formData.videoType);
      setJobState(prev => ({
        ...prev!,
        status: 'failed',
        error: videoError,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Video Generation Demo</h2>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <textarea
              value={formData.prompt}
              onChange={e => setFormData({ ...formData, prompt: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video Type</label>
              <select
                value={formData.videoType}
                onChange={e => setFormData({ ...formData, videoType: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                disabled={isGenerating}
              >
                <option value="animatediff">AnimateDiff</option>
                <option value="svd">SVD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Frames</label>
              <input
                type="number"
                value={formData.numFrames}
                onChange={e => setFormData({ ...formData, numFrames: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                min={16}
                max={128}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">FPS</label>
              <input
                type="number"
                value={formData.fps}
                onChange={e => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                min={6}
                max={24}
                disabled={isGenerating}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
          >
            {isGenerating ? 'Generating...' : 'Generate Video'}
          </button>
        </div>
      </div>

      {/* Progress Display */}
      {jobState && jobState.status !== 'failed' && (
        <VideoGenerationProgress
          jobId={jobState.jobId}
          progress={jobState.progress}
          status={jobState.status}
          details={jobState.details}
        />
      )}

      {/* Error Display */}
      {jobState?.error && (
        <VideoGenerationError
          error={jobState.error}
          onRetry={isRetryableError(jobState.error.type) ? handleRetry : undefined}
          onFallback={hasFallbackOption(jobState.error.type) ? handleFallback : undefined}
          showSetupGuide
        />
      )}

      {/* Result Display */}
      {jobState?.status === 'completed' && jobState.videoUrl && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">✅ Video Generated Successfully</h3>
          <video src={jobState.videoUrl} controls className="w-full rounded-lg" autoPlay loop />
          <div className="mt-4 flex gap-3">
            <a
              href={jobState.videoUrl}
              download
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Download Video
            </a>
            <button
              onClick={() => setJobState(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerationDemo;
