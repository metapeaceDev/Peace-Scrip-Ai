/**
 * Progress Indicator Components
 * 
 * แสดงความคืบหน้าของการสร้างวิดีโอ
 * Real-time progress updates with stages
 */

import React, { useEffect, useState } from 'react';

export interface ProgressStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress?: number; // 0-100
  message?: string;
  startTime?: Date;
  endTime?: Date;
}

interface ProgressIndicatorProps {
  stages: ProgressStage[];
  showEstimatedTime?: boolean;
  onCancel?: () => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  stages,
  showEstimatedTime = true,
  onCancel
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const activeStage = stages.find(s => s.status === 'active');
  const completedStages = stages.filter(s => s.status === 'complete').length;
  const totalProgress = (completedStages / stages.length) * 100;

  useEffect(() => {
    if (!activeStage) return;

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStage]);

  // Estimate remaining time based on average stage time
  const estimateRemainingTime = () => {
    const completedWithTime = stages.filter(s => 
      s.status === 'complete' && s.startTime && s.endTime
    );
    
    if (completedWithTime.length === 0) return null;

    const avgStageTime = completedWithTime.reduce((sum, stage) => {
      const duration = stage.endTime!.getTime() - stage.startTime!.getTime();
      return sum + duration;
    }, 0) / completedWithTime.length;

    const remainingStages = stages.length - completedStages;
    return Math.round((avgStageTime * remainingStages) / 1000); // seconds
  };

  const remainingTime = estimateRemainingTime();

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            🎬 Generating Video
          </h3>
          <p className="text-sm text-gray-400">
            Step {completedStages + 1} of {stages.length}
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Overall Progress</span>
          <span className="text-sm font-semibold text-white">
            {Math.round(totalProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>

        {showEstimatedTime && remainingTime !== null && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>⏱️</span>
            <span>Estimated time remaining: {formatTime(remainingTime)}</span>
          </div>
        )}
      </div>

      {/* Stage List */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <StageItem
            key={stage.id}
            stage={stage}
            index={index}
          />
        ))}
      </div>

      {/* Active Stage Details */}
      {activeStage && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium mb-1">
                {activeStage.label}
              </p>
              {activeStage.message && (
                <p className="text-sm text-gray-300">
                  {activeStage.message}
                </p>
              )}
              {activeStage.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${activeStage.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StageItem: React.FC<{ stage: ProgressStage; index: number }> = ({ stage, index }) => {
  const icons = {
    pending: '⏳',
    active: '🔄',
    complete: '✅',
    error: '❌'
  };

  const colors = {
    pending: 'text-gray-500',
    active: 'text-blue-400',
    complete: 'text-green-400',
    error: 'text-red-400'
  };

  const duration = stage.startTime && stage.endTime
    ? Math.round((stage.endTime.getTime() - stage.startTime.getTime()) / 1000)
    : null;

  return (
    <div className={`flex items-center gap-3 ${colors[stage.status]}`}>
      <span className="text-lg">{icons[stage.status]}</span>
      <div className="flex-1">
        <p className="font-medium text-sm">{stage.label}</p>
        {stage.message && (
          <p className="text-xs text-gray-400 mt-0.5">{stage.message}</p>
        )}
      </div>
      {duration !== null && (
        <span className="text-xs text-gray-400">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
};

/**
 * Simple loading spinner
 */
export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}> = ({ size = 'md', message }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin ${sizes[size]} border-2 border-blue-500 border-t-transparent rounded-full`} />
      {message && (
        <p className="text-sm text-gray-400">{message}</p>
      )}
    </div>
  );
};

/**
 * Circular progress indicator
 */
export const CircularProgress: React.FC<{
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}> = ({ progress, size = 120, strokeWidth = 8, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-500 transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {Math.round(progress)}%
        </span>
        {label && (
          <span className="text-xs text-gray-400 mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Toast notification
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number; // ms
}

export const Toast: React.FC<ToastProps> = ({ 
  type, 
  message, 
  onClose,
  duration = 5000 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles[type]} animate-slide-in`}>
      <span className="text-xl">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

/**
 * Toast container for managing multiple toasts
 */
export const ToastContainer: React.FC<{ 
  toasts: Array<{ id: string; type: ToastType; message: string }>;
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

// Helper function
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};
