/**
 * Video Generation Progress Component
 *
 * แสดง progress สำหรับการสร้างวิดีโอ
 * รองรับ real-time updates ผ่าน WebSocket
 * แสดงข้อมูล: frame count, current step, node, ETA
 */

import React, { useEffect, useState } from 'react';

interface ProgressDetails {
  currentStep?: number;
  totalSteps?: number;
  currentNode?: string;
  isVideo?: boolean;
  numFrames?: number;
  estimatedFrames?: string | number;
  videoType?: string;
}

interface VideoGenerationProgressProps {
  jobId: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  details?: ProgressDetails;
  estimatedTime?: number; // in seconds
}

const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({
  jobId,
  progress,
  status,
  details,
  estimatedTime,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  // Calculate ETA
  const calculateETA = (): string => {
    if (!estimatedTime && progress > 0 && progress < 100) {
      // Estimate based on elapsed time and progress
      const estimatedTotal = (elapsedTime / progress) * 100;
      const remaining = Math.max(0, estimatedTotal - elapsedTime);
      return formatTime(remaining);
    }
    return estimatedTime ? formatTime(estimatedTime) : 'Unknown';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Status colors
  const statusColors = {
    queued: 'bg-yellow-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const statusText = {
    queued: '🔄 Queued',
    processing: '⚡ Processing',
    completed: '✅ Completed',
    failed: '❌ Failed',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${statusColors[status]} ${status === 'processing' ? 'animate-pulse' : ''}`}
          ></div>
          <span className="font-semibold text-white">{statusText[status]}</span>
          {details?.videoType && (
            <span className="text-xs px-2 py-1 bg-purple-700 text-purple-100 rounded-full">
              {details.videoType === 'animatediff' ? 'AnimateDiff' : 'SVD'}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Job: {jobId.slice(0, 8)}...</span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">Progress</span>
          <span className="font-semibold text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${statusColors[status]} transition-all duration-300 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      </div>

      {/* Video-specific Details */}
      {status === 'processing' && details && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Current Step */}
          {details.currentStep !== undefined && details.totalSteps !== undefined && (
            <div className="bg-gray-900 rounded p-2">
              <div className="text-gray-400 text-xs mb-1">Step</div>
              <div className="text-white font-semibold">
                {details.currentStep} / {details.totalSteps}
              </div>
            </div>
          )}

          {/* Frame Count */}
          {(details.numFrames || details.estimatedFrames) && (
            <div className="bg-gray-900 rounded p-2">
              <div className="text-gray-400 text-xs mb-1">Frames</div>
              <div className="text-white font-semibold">
                {details.numFrames || details.estimatedFrames}
              </div>
            </div>
          )}

          {/* Current Node */}
          {details.currentNode &&
            details.currentNode !== 'polling' &&
            details.currentNode !== 'complete' && (
              <div className="bg-gray-900 rounded p-2 col-span-2">
                <div className="text-gray-400 text-xs mb-1">Current Node</div>
                <div className="text-white font-mono text-xs truncate">{details.currentNode}</div>
              </div>
            )}

          {/* Time Info */}
          <div className="bg-gray-900 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">Elapsed</div>
            <div className="text-white font-semibold">{formatTime(elapsedTime)}</div>
          </div>

          <div className="bg-gray-900 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">ETA</div>
            <div className="text-white font-semibold">{calculateETA()}</div>
          </div>
        </div>
      )}

      {/* Queued Info */}
      {status === 'queued' && (
        <div className="text-sm text-gray-400 text-center">
          Your video generation is queued and will start shortly...
        </div>
      )}

      {/* Completion Info */}
      {status === 'completed' && (
        <div className="text-sm text-green-400 text-center">
          ✨ Video generated successfully in {formatTime(elapsedTime)}
        </div>
      )}

      {/* Error Info */}
      {status === 'failed' && (
        <div className="text-sm text-red-400 text-center">
          ⚠️ Video generation failed. Please check logs or retry.
        </div>
      )}
    </div>
  );
};

export default VideoGenerationProgress;
