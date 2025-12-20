/**
 * Enhanced Video Generation Hook
 * 
 * React hook for video generation with:
 * - Real-time progress tracking
 * - Stage-based status updates
 * - Error handling with retry
 * - Toast notifications
 * - Cancellation support
 */

import { useState, useCallback, useRef } from 'react';
import { generateShotVideo, type VideoGenerationOptions } from '../services/videoGenerationService';
import { parseError, retryWithBackoff } from '../services/errorHandler';
import type { ProgressStage } from '../components/ProgressIndicator';

export interface UseVideoGenerationResult {
  isGenerating: boolean;
  progress: number; // 0-100
  stages: ProgressStage[];
  videoUrl: string | null;
  error: string | null;
  generate: (shot: any, options?: VideoGenerationOptions) => Promise<string | null>;
  cancel: () => void;
  reset: () => void;
}

export const useVideoGeneration = (): UseVideoGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<ProgressStage[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize stages
  const initializeStages = useCallback(() => {
    const initialStages: ProgressStage[] = [
      {
        id: 'prepare',
        label: 'Preparing Generation',
        status: 'pending',
        message: 'Setting up parameters and backend...'
      },
      {
        id: 'validate',
        label: 'Validating Input',
        status: 'pending',
        message: 'Checking prompt and settings...'
      },
      {
        id: 'generate',
        label: 'Generating Video',
        status: 'pending',
        message: 'Creating video frames...',
        progress: 0
      },
      {
        id: 'process',
        label: 'Processing',
        status: 'pending',
        message: 'Encoding and finalizing...'
      },
      {
        id: 'complete',
        label: 'Complete',
        status: 'pending',
        message: 'Video ready!'
      }
    ];
    setStages(initialStages);
    return initialStages;
  }, []);

  // Update stage status
  const updateStage = useCallback((
    stageId: string,
    updates: Partial<ProgressStage>
  ) => {
    setStages(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, ...updates }
        : stage
    ));
  }, []);

  // Main generate function
  const generate = useCallback(async (
    shot: any,
    options: VideoGenerationOptions = {}
  ): Promise<string | null> => {
    try {
      // Reset state
      setIsGenerating(true);
      setProgress(0);
      setVideoUrl(null);
      setError(null);
      abortControllerRef.current = new AbortController();

      // const stages = initializeStages();

      // Stage 1: Prepare
      updateStage('prepare', { 
        status: 'active',
        startTime: new Date()
      });
      setProgress(10);

      // Simulate preparation
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStage('prepare', { 
        status: 'complete',
        endTime: new Date()
      });

      // Stage 2: Validate
      updateStage('validate', { 
        status: 'active',
        startTime: new Date()
      });
      setProgress(20);

      // Validate shot data
      if (!shot?.description && !shot?.shotType) {
        throw new Error('Shot must have description or shotType');
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      updateStage('validate', { 
        status: 'complete',
        endTime: new Date()
      });

      // Stage 3: Generate
      updateStage('generate', { 
        status: 'active',
        startTime: new Date(),
        progress: 0
      });
      setProgress(30);

      // Simulate progress during generation
      const progressInterval = setInterval(() => {
        setStages(prev => prev.map(stage => {
          if (stage.id === 'generate') {
            const newProgress = Math.min((stage.progress || 0) + 5, 90);
            return { ...stage, progress: newProgress };
          }
          return stage;
        }));
        setProgress(prev => Math.min(prev + 3, 80));
      }, 1000);

      // Generate video with retry logic
      const url = await retryWithBackoff(
        async () => {
          const result = await generateShotVideo(shot, undefined, options);
          return result;
        },
        {
          maxRetries: 2,
          retryDelay: 1000,
          logToConsole: true
        }
      );

      clearInterval(progressInterval);

      if (!url) {
        throw new Error('Video generation returned null');
      }

      updateStage('generate', { 
        status: 'complete',
        endTime: new Date(),
        progress: 100
      });
      setProgress(90);

      // Stage 4: Process
      updateStage('process', { 
        status: 'active',
        startTime: new Date()
      });

      // Simulate post-processing
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStage('process', { 
        status: 'complete',
        endTime: new Date()
      });
      setProgress(95);

      // Stage 5: Complete
      updateStage('complete', { 
        status: 'active',
        startTime: new Date()
      });

      setVideoUrl(url);
      setProgress(100);

      updateStage('complete', { 
        status: 'complete',
        endTime: new Date()
      });

      console.log('✅ Video generation completed:', url);
      return url;

    } catch (err) {
      const parsedError = parseError(err, 'comfyui');
      console.error('❌ Video generation failed:', parsedError);
      
      setError(parsedError.message);
      
      // Mark current active stage as error
      setStages(prev => prev.map(stage =>
        stage.status === 'active'
          ? { ...stage, status: 'error' as const, message: parsedError.suggestion || parsedError.message }
          : stage
      ));

      return null;
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [initializeStages, updateStage]);

  // Cancel generation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setError('Generation cancelled by user');
      
      // Mark active stage as error
      setStages(prev => prev.map(stage =>
        stage.status === 'active'
          ? { ...stage, status: 'error' as const, message: 'Cancelled' }
          : stage
      ));
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setStages([]);
    setVideoUrl(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    stages,
    videoUrl,
    error,
    generate,
    cancel,
    reset
  };
};

/**
 * Batch video generation hook
 */
export interface UseBatchVideoGenerationResult {
  isGenerating: boolean;
  currentIndex: number;
  totalCount: number;
  videos: Array<{ shotId: string; url: string | null; error?: string }>;
  overallProgress: number;
  generateBatch: (shots: any[], options?: VideoGenerationOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export const useBatchVideoGeneration = (): UseBatchVideoGenerationResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<Array<{ shotId: string; url: string | null; error?: string }>>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const cancelledRef = useRef(false);

  const generateBatch = useCallback(async (
    shots: any[],
    options: VideoGenerationOptions = {}
  ) => {
    try {
      setIsGenerating(true);
      setCurrentIndex(0);
      setVideos([]);
      setOverallProgress(0);
      cancelledRef.current = false;

      const results: Array<{ shotId: string; url: string | null; error?: string }> = [];

      for (let i = 0; i < shots.length; i++) {
        if (cancelledRef.current) {
          console.log('⏸️ Batch generation cancelled');
          break;
        }

        setCurrentIndex(i);
        const shot = shots[i];

        try {
          console.log(`🎬 Generating video ${i + 1}/${shots.length}...`);
          
          const url = await generateShotVideo(shot, undefined, options);
          
          results.push({
            shotId: shot.shotId || `shot-${i}`,
            url
          });

          setVideos([...results]);
          setOverallProgress(((i + 1) / shots.length) * 100);

        } catch (error) {
          const parsedError = parseError(error, 'comfyui');
          console.error(`❌ Failed to generate video ${i + 1}:`, parsedError);
          
          results.push({
            shotId: shot.shotId || `shot-${i}`,
            url: null,
            error: parsedError.message
          });

          setVideos([...results]);
        }
      }

      console.log('✅ Batch generation completed:', results);

    } catch (error) {
      console.error('❌ Batch generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsGenerating(false);
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setCurrentIndex(0);
    setVideos([]);
    setOverallProgress(0);
    cancelledRef.current = false;
  }, []);

  return {
    isGenerating,
    currentIndex,
    totalCount: videos.length,
    videos,
    overallProgress,
    generateBatch,
    cancel,
    reset
  };
};
