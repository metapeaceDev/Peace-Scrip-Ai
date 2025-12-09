/**
 * CittaMomentVisualizer Component
 * 
 * Interactive visualization of the 17-moment mind process (Citta Vithi)
 * in Abhidhamma Buddhist Psychology
 * 
 * Features:
 * - Step-by-step animation of mind moments
 * - Real-time Javana decision visualization
 * - Kusala/Akusala classification display
 * - Interactive timeline
 * - Sensory input tracking
 * 
 * Phase 3: Advanced UI Features
 */

import React, { useState, useEffect } from 'react';
import { isFeatureEnabled } from '../../config/featureFlags';

interface CittaMoment {
  id: number;
  name: string;
  nameThai: string;
  description: string;
  duration: number; // milliseconds for animation
  type: 'bhavanga' | 'dvara' | 'vinnana' | 'sampaticchana' | 'santirana' | 'votthapana' | 'javana' | 'tadarammana';
  isDecisionPoint?: boolean;
}

const CITTA_MOMENTS: CittaMoment[] = [
  {
    id: 1,
    name: 'Atita Bhavanga',
    nameThai: 'อดีตภวังค์',
    description: 'Past life-continuum consciousness',
    duration: 300,
    type: 'bhavanga',
  },
  {
    id: 2,
    name: 'Bhavanga Calana',
    nameThai: 'ภวังค์จลนะ',
    description: 'Vibrating life-continuum',
    duration: 300,
    type: 'bhavanga',
  },
  {
    id: 3,
    name: 'Bhavanga Upaccheda',
    nameThai: 'ภวังค์อุปัจเฉทะ',
    description: 'Arrest of life-continuum',
    duration: 300,
    type: 'bhavanga',
  },
  {
    id: 4,
    name: 'Pancadvaravajjana',
    nameThai: 'ปัญจทวาราวัชชนะ',
    description: 'Five-door adverting consciousness',
    duration: 400,
    type: 'dvara',
  },
  {
    id: 5,
    name: 'Pancavinnana',
    nameThai: 'ปัญจวิญญาณ',
    description: 'Five-door consciousness (seeing/hearing/etc)',
    duration: 400,
    type: 'vinnana',
  },
  {
    id: 6,
    name: 'Sampaticchana',
    nameThai: 'สัมปฏิจฉนะ',
    description: 'Receiving consciousness',
    duration: 300,
    type: 'sampaticchana',
  },
  {
    id: 7,
    name: 'Santirana',
    nameThai: 'สันตีรณะ',
    description: 'Investigating consciousness',
    duration: 300,
    type: 'santirana',
  },
  {
    id: 8,
    name: 'Votthapana',
    nameThai: 'โวฏฐัปปนะ',
    description: 'Determining consciousness',
    duration: 400,
    type: 'votthapana',
  },
  {
    id: 9,
    name: 'Javana 1',
    nameThai: 'ชวนะ 1',
    description: 'First impulsion - Decision point for kusala/akusala',
    duration: 500,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 10,
    name: 'Javana 2',
    nameThai: 'ชวนะ 2',
    description: 'Second impulsion',
    duration: 400,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 11,
    name: 'Javana 3',
    nameThai: 'ชวนะ 3',
    description: 'Third impulsion',
    duration: 400,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 12,
    name: 'Javana 4',
    nameThai: 'ชวนะ 4',
    description: 'Fourth impulsion',
    duration: 400,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 13,
    name: 'Javana 5',
    nameThai: 'ชวนะ 5',
    description: 'Fifth impulsion',
    duration: 400,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 14,
    name: 'Javana 6',
    nameThai: 'ชวนะ 6',
    description: 'Sixth impulsion',
    duration: 400,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 15,
    name: 'Javana 7',
    nameThai: 'ชวนะ 7',
    description: 'Seventh impulsion - Peak decision strength',
    duration: 500,
    type: 'javana',
    isDecisionPoint: true,
  },
  {
    id: 16,
    name: 'Tadarammana 1',
    nameThai: 'ตทารัมมณะ 1',
    description: 'First retention/registration',
    duration: 300,
    type: 'tadarammana',
  },
  {
    id: 17,
    name: 'Tadarammana 2',
    nameThai: 'ตทารัมมณะ 2',
    description: 'Second retention - Completes the process',
    duration: 300,
    type: 'tadarammana',
  },
];

interface CittaMomentVisualizerProps {
  sensoryInput?: {
    door: 'eye' | 'ear' | 'nose' | 'tongue' | 'body' | 'mind';
    intensity: number;
    type: string;
  };
  decision?: 'kusala' | 'akusala' | 'pending';
  autoPlay?: boolean;
  speed?: number; // 1.0 = normal, 2.0 = 2x speed
}

/**
 * Get color for moment type
 */
function getMomentColor(type: CittaMoment['type'], isActive: boolean): string {
  const colors = {
    bhavanga: isActive ? '#6366f1' : '#4f46e5',
    dvara: isActive ? '#8b5cf6' : '#7c3aed',
    vinnana: isActive ? '#a855f7' : '#9333ea',
    sampaticchana: isActive ? '#d946ef' : '#c026d3',
    santirana: isActive ? '#ec4899' : '#db2777',
    votthapana: isActive ? '#f43f5e' : '#e11d48',
    javana: isActive ? '#ef4444' : '#dc2626',
    tadarammana: isActive ? '#f59e0b' : '#d97706',
  };
  return colors[type] || '#6b7280';
}

/**
 * CittaMomentVisualizer Component
 */
export const CittaMomentVisualizer: React.FC<CittaMomentVisualizerProps> = ({
  sensoryInput,
  decision = 'pending',
  autoPlay = false,
  speed = 1.0,
}) => {
  const [currentMoment, setCurrentMoment] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [progress, setProgress] = useState<number>(0);

  const isEnabled = isFeatureEnabled('JAVANA_DECISION_ENGINE');

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || currentMoment >= CITTA_MOMENTS.length) {
      return;
    }

    const moment = CITTA_MOMENTS[currentMoment];
    const duration = moment.duration / speed;
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentMoment(current => current + 1);
          return 0;
        }
        return prev + (100 / (duration / 50)); // Update every 50ms
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [isPlaying, currentMoment, speed]);

  // Reset when reaching the end
  useEffect(() => {
    if (currentMoment >= CITTA_MOMENTS.length) {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [currentMoment]);

  const handlePlay = () => {
    if (currentMoment >= CITTA_MOMENTS.length) {
      setCurrentMoment(0);
      setProgress(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentMoment(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const handleMomentClick = (index: number) => {
    setCurrentMoment(index);
    setProgress(0);
    setIsPlaying(false);
  };

  if (!isEnabled) {
    return (
      <div className="citta-visualizer-disabled p-6 bg-gray-800 rounded-lg">
        <div className="text-gray-400 text-center">
          <div className="text-lg mb-2">Javana Decision Engine</div>
          <div className="text-sm">Feature currently disabled</div>
        </div>
      </div>
    );
  }

  const activeMoment = CITTA_MOMENTS[currentMoment];

  return (
    <div className="citta-moment-visualizer p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">
          Citta Vithi: 17-Moment Mind Process
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {sensoryInput && (
            <div className="flex items-center gap-2">
              <span>Door:</span>
              <span className="text-white font-medium capitalize">{sensoryInput.door}</span>
              <span className="text-gray-500">|</span>
              <span>Intensity:</span>
              <span className="text-white font-medium">{sensoryInput.intensity}%</span>
            </div>
          )}
          {decision !== 'pending' && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              decision === 'kusala' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {decision === 'kusala' ? 'Kusala (Wholesome)' : 'Akusala (Unwholesome)'}
            </div>
          )}
        </div>
      </div>

      {/* Current Moment Display */}
      {activeMoment && (
        <div className="mb-6 p-6 bg-gray-800/80 rounded-lg border-2 border-purple-500">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-400">
                Moment {activeMoment.id} of 17
              </div>
              <div className="text-2xl font-bold text-white">
                {activeMoment.nameThai}
              </div>
              <div className="text-lg text-gray-300">
                {activeMoment.name}
              </div>
            </div>
            {activeMoment.isDecisionPoint && (
              <div className="px-4 py-2 bg-red-500/20 rounded-lg border border-red-500">
                <div className="text-xs text-red-400 font-bold">
                  DECISION POINT
                </div>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-400 mb-3">
            {activeMoment.description}
          </div>
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-purple-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-6">
        <div className="grid grid-cols-17 gap-1 mb-2">
          {CITTA_MOMENTS.map((moment, index) => {
            const isActive = index === currentMoment;
            const isPast = index < currentMoment;
            const color = getMomentColor(moment.type, isActive);

            return (
              <div
                key={moment.id}
                className={`h-12 rounded cursor-pointer transition-all duration-200 ${
                  isActive ? 'scale-110 shadow-lg' : ''
                } ${isPast ? 'opacity-50' : ''}`}
                style={{
                  backgroundColor: color,
                  boxShadow: isActive ? `0 0 12px ${color}` : 'none',
                }}
                onClick={() => handleMomentClick(index)}
                title={`${moment.nameThai} (${moment.name})`}
              >
                {moment.isDecisionPoint && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-xs font-bold text-white">J</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels */}
        <div className="grid grid-cols-5 gap-2 text-xs text-gray-400">
          <div>Bhavanga (1-3)</div>
          <div>Dvara & Vinnana (4-5)</div>
          <div>Investigation (6-8)</div>
          <div>Javana (9-15)</div>
          <div>Retention (16-17)</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            ▶ {currentMoment >= CITTA_MOMENTS.length ? 'Replay' : 'Play'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          ↻ Reset
        </button>
        <div className="flex items-center gap-2 ml-4">
          <label className="text-sm text-gray-400">Speed:</label>
          <select
            value={speed}
            onChange={(e) => {
              // Speed control would need to be passed as prop or state
              console.log('Speed:', e.target.value);
            }}
            className="bg-gray-700 text-white rounded px-3 py-2 text-sm"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-3">Moment Types:</div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4f46e5' }} />
            <span className="text-gray-300">Bhavanga</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7c3aed' }} />
            <span className="text-gray-300">Sensory Door</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c026d3' }} />
            <span className="text-gray-300">Investigation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-600" />
            <span className="text-gray-300">Javana (Decision)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CittaMomentVisualizer;
