/**
 * Keyframe Timeline Editor
 * 
 * Visual timeline for keyframe-based animation control
 * Features:
 * - Add/remove keyframes
 * - Drag to reposition keyframes
 * - Interpolation curves
 * - Playback preview
 * - Export keyframe data
 * 
 * @author Peace Script Team (Adapted for TypeScript)
 */

import React, { useState, useRef, useEffect } from 'react';

interface Keyframe {
  id: string;
  time: number;
  parameters?: Record<string, unknown>;
  interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
}

interface KeyframeTimelineProps {
  duration?: number;
  keyframes?: Keyframe[];
  onKeyframesChange?: (keyframes: Keyframe[]) => void;
  parameters?: Record<string, unknown> | null;
  onTimeChange?: (time: number) => void;
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export default function KeyframeTimeline({
  duration = 5.0,
  keyframes = [],
  onKeyframesChange = () => {},
  parameters = null,
  onTimeChange = () => {},
  playing = false,
  onPlayingChange = () => {}
}: KeyframeTimelineProps) {
  const [localKeyframes, setLocalKeyframes] = useState<Keyframe[]>(keyframes);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(playing);
  const [zoom, setZoom] = useState(1.0);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalKeyframes(keyframes);
  }, [keyframes]);

  useEffect(() => {
    setIsPlaying(playing);
  }, [playing]);

  // Playback control
  useEffect(() => {
    if (isPlaying) {
      playbackInterval.current = setInterval(() => {
        setCurrentTime((prev: number) => {
          const next = prev + 0.1;
          if (next >= duration) {
            setIsPlaying(false);
            onPlayingChange?.(false);
            return 0;
          }
          onTimeChange?.(next);
          return next;
        });
      }, 100);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, duration, onTimeChange, onPlayingChange]);

  // Add keyframe at current time
  const handleAddKeyframe = () => {
    const newKeyframe: Keyframe = {
      id: `kf_${Date.now()}`,
      time: currentTime,
      parameters: parameters || {},
      interpolation: 'linear'
    };

    const updated = [...localKeyframes, newKeyframe].sort((a, b) => a.time - b.time);
    setLocalKeyframes(updated);
    onKeyframesChange?.(updated);
    setSelectedKeyframe(newKeyframe.id);
  };

  // Remove keyframe
  const handleRemoveKeyframe = (id: string) => {
    const updated = localKeyframes.filter((kf: Keyframe) => kf.id !== id);
    setLocalKeyframes(updated);
    onKeyframesChange?.(updated);
    if (selectedKeyframe === id) {
      setSelectedKeyframe(null);
    }
  };

  // Update keyframe time (drag)
  const handleKeyframeDrag = (id: string, newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    const updated = localKeyframes.map((kf: Keyframe) =>
      kf.id === id ? { ...kf, time: clamped } : kf
    ).sort((a: Keyframe, b: Keyframe) => a.time - b.time);
    
    setLocalKeyframes(updated);
    onKeyframesChange?.(updated);
  };

  // Click on timeline to set time
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    const clamped = Math.max(0, Math.min(duration, newTime));
    
    setCurrentTime(clamped);
    onTimeChange?.(clamped);
  };

  // Toggle playback
  const togglePlayback = () => {
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);
    onPlayingChange?.(newPlaying);
  };

  // Reset to start
  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    onTimeChange?.(0);
    onPlayingChange?.(false);
  };

  return (
    <div className="keyframe-timeline">
      {/* Header */}
      <div className="timeline-header">
        <div className="header-left">
          <div className="header-icon" style={{
            animation: isPlaying ? 'pulse 0.5s infinite' : 'none'
          }}>
            🎞️
          </div>
          <h3 className="timeline-title">Keyframe Timeline</h3>
          <span className="keyframe-count">{localKeyframes.length} keyframes</span>
        </div>

        <div className="header-right">
          {/* Playback Controls */}
          <button
            onClick={handleReset}
            className="btn-control"
            title="Reset to start"
          >
            ⏮
          </button>
          <button
            onClick={togglePlayback}
            className={`btn-control ${isPlaying ? 'playing' : ''}`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleAddKeyframe}
            className="btn-add-keyframe"
            title="Add keyframe at current time"
          >
            + Add Keyframe
          </button>

          {/* Zoom Controls */}
          <div className="zoom-controls">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="btn-zoom"
              title="Zoom out"
            >
              −
            </button>
            <span className="zoom-label">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom(Math.min(3.0, zoom + 0.25))}
              className="btn-zoom"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Canvas */}
      <div
        ref={timelineRef}
        className="timeline-canvas"
        onClick={handleTimelineClick}
        style={{ ['--zoom-level' as any]: zoom }}
      >
        {/* Time markers */}
        <div className="time-markers">
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="time-marker"
              style={{ left: `${(i / duration) * 100}%` }}
            >
              <span className="marker-label">{i}s</span>
              <div className="marker-line" />
            </div>
          ))}
        </div>

        {/* Keyframes */}
        <div className="keyframes-container">
          {localKeyframes.map((keyframe: Keyframe) => (
            <div
              key={keyframe.id}
              className={`keyframe ${selectedKeyframe === keyframe.id ? 'selected' : ''}`}
              style={{ 
                left: `${(keyframe.time / duration) * 100}%`,
                transition: 'all 0.2s ease'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedKeyframe(keyframe.id);
              }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startTime = keyframe.time;
                const rect = timelineRef.current?.getBoundingClientRect();
                if (!rect) return;

                const handleMouseMove = (moveE: MouseEvent) => {
                  const deltaX = moveE.clientX - startX;
                  const deltaTime = (deltaX / rect.width) * duration;
                  const newTime = startTime + deltaTime;
                  handleKeyframeDrag(keyframe.id, newTime);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="keyframe-diamond">◆</div>
              <div className="keyframe-time">{keyframe.time.toFixed(2)}s</div>
              
              {/* Delete button */}
              {selectedKeyframe === keyframe.id && (
                <button
                  className="btn-delete-keyframe"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveKeyframe(keyframe.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Current Time Indicator */}
        <div
          className="current-time-indicator"
          style={{ 
            left: `${(currentTime / duration) * 100}%`,
            transition: isPlaying ? 'left 0.1s linear' : 'none'
          }}
        >
          <div className="indicator-head" />
          <div className="indicator-line" />
        </div>
      </div>

      {/* Time Display */}
      <div className="timeline-footer">
        <div className="time-display">
          <span className="time-label">Current:</span>
          <span className="time-value">{currentTime.toFixed(2)}s</span>
          <span className="time-separator">/</span>
          <span className="time-value">{duration.toFixed(2)}s</span>
        </div>

        {selectedKeyframe && (
          <div className="keyframe-info">
            <span className="info-label">Selected Keyframe:</span>
            <span className="info-value">
              {localKeyframes.find((kf: Keyframe) => kf.id === selectedKeyframe)?.time.toFixed(2)}s
            </span>
            <select
              value={localKeyframes.find((kf: Keyframe) => kf.id === selectedKeyframe)?.interpolation || 'linear'}
              onChange={(e) => {
                const updated = localKeyframes.map((kf: Keyframe) =>
                  kf.id === selectedKeyframe ? { ...kf, interpolation: e.target.value as Keyframe['interpolation'] } : kf
                );
                setLocalKeyframes(updated);
                onKeyframesChange?.(updated);
              }}
              className="interpolation-select"
            >
              <option value="linear">Linear</option>
              <option value="ease-in">Ease In</option>
              <option value="ease-out">Ease Out</option>
              <option value="ease-in-out">Ease In-Out</option>
              <option value="step">Step</option>
            </select>
          </div>
        )}
      </div>

      <style>{`
        /**
         * Keyframe Timeline Styles
         */

        .keyframe-timeline {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        /* Header */
        .timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-icon {
          font-size: 16px;
          filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .timeline-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .keyframe-count {
          padding: 2px 6px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 6px;
          font-size: 10px;
          color: #f59e0b;
          font-weight: 600;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-control,
        .btn-add-keyframe,
        .btn-zoom {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-control:hover,
        .btn-add-keyframe:hover,
        .btn-zoom:hover {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.95);
          transform: scale(1.05);
        }

        .btn-control.playing {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .btn-add-keyframe {
          font-size: 10px;
          font-weight: 600;
          padding: 4px 8px;
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 2px 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }

        .zoom-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
          min-width: 35px;
          text-align: center;
        }

        .btn-zoom {
          padding: 2px 6px;
          font-size: 11px;
        }

        /* Timeline Canvas */
        .timeline-canvas {
          position: relative;
          height: 70px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          cursor: crosshair;
          overflow-x: auto;
          overflow-y: hidden;
          margin-bottom: 8px;
        }

        /* Time Markers */
        .time-markers {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .time-marker {
          position: absolute;
          top: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .marker-label {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.4);
          padding: 2px 4px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 3px;
          margin-top: 2px;
        }

        .marker-line {
          width: 1px;
          flex: 1;
          background: rgba(255, 255, 255, 0.15);
          margin-top: 2px;
        }

        /* Keyframes */
        .keyframes-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .keyframe {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          cursor: grab;
          z-index: 10;
        }

        .keyframe:active {
          cursor: grabbing;
        }

        .keyframe.selected .keyframe-diamond {
          color: #f59e0b;
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
          font-size: 18px;
        }

        .keyframe-diamond {
          font-size: 16px;
          color: #3b82f6;
          text-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
          transition: all 0.2s ease;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
        }

        .keyframe:hover .keyframe-diamond {
          font-size: 18px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
        }

        .keyframe-time {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 4px;
          font-size: 8px;
          color: rgba(255, 255, 255, 0.6);
          background: rgba(0, 0, 0, 0.6);
          padding: 1px 4px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
        }

        .btn-delete-keyframe {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 16px;
          height: 16px;
          background: rgba(239, 68, 68, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: all 0.2s ease;
        }

        .btn-delete-keyframe:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.2);
        }

        /* Current Time Indicator */
        .current-time-indicator {
          position: absolute;
          top: 0;
          height: 100%;
          width: 2px;
          pointer-events: none;
          z-index: 20;
        }

        .indicator-head {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border: 1px solid white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .indicator-line {
          width: 2px;
          height: 100%;
          background: #ef4444;
          opacity: 0.7;
        }

        /* Footer */
        .timeline-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .time-display,
        .keyframe-info {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          font-size: 10px;
        }

        .time-label,
        .info-label {
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        .time-value,
        .info-value {
          color: #3b82f6;
          font-weight: 700;
        }

        .time-separator {
          color: rgba(255, 255, 255, 0.4);
        }

        .interpolation-select {
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 9px;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
        }

        .interpolation-select:hover,
        .interpolation-select:focus {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .interpolation-select option {
          background: #1e293b;
          color: white;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .keyframe-timeline {
            padding: 16px;
          }

          .timeline-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .header-left,
          .header-right {
            justify-content: space-between;
          }

          .timeline-canvas {
            height: 100px;
          }

          .timeline-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .time-display,
          .keyframe-info {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .btn-control,
          .btn-add-keyframe {
            padding: 6px 10px;
            font-size: 12px;
          }

          .keyframe-diamond {
            font-size: 20px;
          }

          .marker-label {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
