/**
 * Cost Calculator Component
 *
 * แสดงการคำนวณค่าใช้จ่ายสำหรับแต่ละ backend
 * ช่วย user เลือก backend ที่เหมาะสมตามงบประมาณ
 */

import React from 'react';

export interface BackendCost {
  name: string;
  type: 'local' | 'cloud-comfyui' | 'replicate' | 'gemini-veo';
  costPerVideo: number; // USD
  quality: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
  available: boolean;
  features: string[];
  requirements?: string;
}

interface CostCalculatorProps {
  videoCount: number;
  onBackendSelect?: (backend: BackendCost) => void;
}

export const BACKEND_COSTS: BackendCost[] = [
  {
    name: 'Local ComfyUI (GPU)',
    type: 'local',
    costPerVideo: 0,
    quality: 'high',
    speed: 'fast',
    available: true,
    features: ['FREE', 'Custom LoRA', 'Offline', 'Privacy'],
    requirements: 'Requires local GPU (NVIDIA/Apple Silicon)',
  },
  {
    name: 'Cloud ComfyUI (RunPod)',
    type: 'cloud-comfyui',
    costPerVideo: 0.02,
    quality: 'high',
    speed: 'fast',
    available: false, // Will be true after Phase 2
    features: ['Pay-per-use', 'RTX 3090', 'Custom LoRA', 'Auto-scaling'],
    requirements: 'Internet connection required',
  },
  {
    name: 'Replicate (Hotshot-XL)',
    type: 'replicate',
    costPerVideo: 0.018,
    quality: 'medium',
    speed: 'medium',
    available: true,
    features: ['Pay-per-use', 'No setup', 'Quick start'],
    requirements: 'Replicate API key required',
  },
  {
    name: 'Gemini Veo 3.1',
    type: 'gemini-veo',
    costPerVideo: 0.5,
    quality: 'high',
    speed: 'slow',
    available: true,
    features: ['Highest quality', 'Natural motion', 'Latest model'],
    requirements: 'Gemini API key required',
  },
];

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  videoCount = 1,
  onBackendSelect,
}) => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">💰 Cost Comparison</h3>

      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Number of videos to generate:</label>
        <input
          type="number"
          min="1"
          max="1000"
          defaultValue={videoCount}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white"
        />
      </div>

      <div className="space-y-3">
        {BACKEND_COSTS.map(backend => {
          const totalCost = backend.costPerVideo * videoCount;
          const isRecommended = backend.costPerVideo === 0 && backend.available;

          return (
            <div
              key={backend.type}
              className={`
                bg-gray-900/50 rounded-lg p-4 border-2 transition-all cursor-pointer
                ${
                  isRecommended
                    ? 'border-green-500/50 hover:border-green-500'
                    : backend.available
                      ? 'border-gray-700 hover:border-gray-600'
                      : 'border-gray-800 opacity-60 cursor-not-allowed'
                }
              `}
              onClick={() => backend.available && onBackendSelect?.(backend)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-white font-medium flex items-center gap-2">
                    {backend.name}
                    {isRecommended && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        RECOMMENDED
                      </span>
                    )}
                    {!backend.available && (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                        COMING SOON
                      </span>
                    )}
                  </h4>
                  <p className="text-gray-400 text-sm mt-1">{backend.requirements}</p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {totalCost === 0 ? (
                      <span className="text-green-400">FREE</span>
                    ) : (
                      <span>${totalCost.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${backend.costPerVideo.toFixed(3)}/video
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <QualityBadge quality={backend.quality} />
                </span>
                <span className="flex items-center gap-1">
                  <SpeedBadge speed={backend.speed} />
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {backend.features.map((feature, idx) => (
                  <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-300 text-sm">
          💡 <strong>Tip:</strong> Use local GPU (if available) to generate unlimited videos for
          FREE. Cloud options are available when you don't have a compatible GPU.
        </p>
      </div>
    </div>
  );
};

const QualityBadge: React.FC<{ quality: 'high' | 'medium' | 'low' }> = ({ quality }) => {
  const colors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400',
  };

  return (
    <span className={colors[quality]}>
      ⭐ {quality.charAt(0).toUpperCase() + quality.slice(1)} Quality
    </span>
  );
};

const SpeedBadge: React.FC<{ speed: 'fast' | 'medium' | 'slow' }> = ({ speed }) => {
  const colors = {
    fast: 'text-green-400',
    medium: 'text-yellow-400',
    slow: 'text-orange-400',
  };

  const icons = {
    fast: '⚡',
    medium: '🚀',
    slow: '🐌',
  };

  return (
    <span className={colors[speed]}>
      {icons[speed]} {speed.charAt(0).toUpperCase() + speed.slice(1)}
    </span>
  );
};

/**
 * Estimate total project cost
 */
export function estimateProjectCost(
  shotCount: number,
  backend: BackendCost
): {
  total: number;
  perShot: number;
  breakdown: string;
} {
  const total = shotCount * backend.costPerVideo;

  return {
    total,
    perShot: backend.costPerVideo,
    breakdown: `${shotCount} shots × $${backend.costPerVideo.toFixed(3)}/video = $${total.toFixed(2)}`,
  };
}

