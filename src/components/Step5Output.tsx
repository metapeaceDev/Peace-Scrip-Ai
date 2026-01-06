import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  ScriptData,
  GeneratedScene,
  PlotPoint,
  Character,
  DialogueLine,
  PsychologySnapshot,
  PsychologyChange,
  LocationDetails,
} from '../types';
import { useTranslation } from './LanguageSwitcher';
import {
  generateStoryboardImage,
  generateStoryboardVideo,
  VIDEO_MODELS_CONFIG,
  getAI,
} from '../services/geminiService';
import { checkBackendStatus } from '../services/comfyuiBackendClient';
import {
  generateSceneAudio,
  mergeVideoWithAudio,
  type AudioTimeline,
} from '../services/audioGenerationService';
import { updatePsychologyTimeline } from '../services/psychologyEvolution';
import { CHARACTER_IMAGE_STYLES } from '../constants';
import { hasAccessToModel } from '../services/userStore';
import { RegenerateOptionsModal, type RegenerationMode } from './RegenerateOptionsModal';
import { LocationDetailsModal } from './LocationDetailsModal';
import { generateLocationImage } from './locationImageGenerator';
import { MotionEditor } from './MotionEditor';
import type { MotionEdit } from '../types/motionEdit';
import { DEFAULT_MOTION_EDIT } from '../types/motionEdit';
import MotionEditorPage from '../pages/MotionEditorPage';
import { PermissionGuard } from './RoleManagement';
import type { CollaboratorRole } from '../services/teamCollaborationService';

interface Step5OutputProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  prevStep: () => void;
  onRegisterUndo?: () => void;
  _goToStep: (step: number) => void;
  onNavigateToCharacter?: (
    charName: string,
    fromStep?: number,
    sceneContext?: { pointTitle: string; sceneIndex: number },
    openPsychology?: boolean
  ) => void;
  returnToScene?: { pointTitle: string; sceneIndex: number } | null;
  onResetReturnToScene?: () => void;
  userRole?: CollaboratorRole; // User's role for permission checking
}

type ComfyBackendStatus = {
  running: boolean;
  platform?: {
    hasNvidiaGPU?: boolean;
  };
  error?: string;
};

function isSameShotNumber(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber)) return asNumber;
    }
    return null;
  };

  const na = normalize(a);
  const nb = normalize(b);
  return na != null && nb != null && na === nb;
}

// --- Constants for Shot List Dropdowns ---
const SHOT_OPTIONS: Record<string, string[]> = {
  shotSize: [
    'Select...',
    'ECU (Extreme Close Up)',
    'CU (Close Up)',
    'MCU (Medium Close Up)',
    'MS (Medium Shot)',
    'MLS (Medium Long Shot)',
    'LS (Long Shot)',
    'VLS (Very Long Shot)',
    'EST (Establishing Shot)',
  ],
  perspective: [
    'Select...',
    'Eye-Level',
    'High Angle',
    'Low Angle',
    "Bird's Eye / Overhead",
    "Worm's Eye",
    'POV (Point of View)',
    'OTS (Over the Shoulder)',
    'Canted / Dutch Angle',
    'Ground Level',
  ],
  movement: [
    'Select...',
    'Static',
    'Pan',
    'Tilt',
    'Dolly In',
    'Dolly Out',
    'Zoom In',
    'Zoom Out',
    'Tracking / Truck',
    'Crab',
    'Pedestal',
    'Crane / Jib',
    'Handheld',
    'Steadicam',
    'Gimbal / Stabilizer',
    'Arc',
    'Whip Pan',
  ],
  equipment: [
    'Select...',
    'Tripod',
    'Dolly',
    'Slider',
    'Jib / Crane',
    'Steadicam',
    'Gimbal (Ronin/Movi)',
    'Handheld Rig',
    'EasyRig',
    'Drone',
    'Snorricam',
    'Vehicle Mount',
  ],
  focalLength: [
    'Select...',
    '14mm (Ultra Wide)',
    '24mm (Wide)',
    '35mm (Standard Wide)',
    '50mm (Standard)',
    '85mm (Portrait)',
    '100mm (Macro/Tele)',
    '135mm (Telephoto)',
    '200mm+ (Super Tele)',
    'Zoom Lens',
  ],
  aspectRatio: [
    'Select...',
    '16:9 (1.78:1)',
    '2.39:1 (Anamorphic)',
    '1.85:1 (Academy Flat)',
    '4:3 (1.33:1)',
    '1:1 (Square)',
    '9:16 (Vertical)',
    '2:1 (Univisium)',
  ],
  colorTemperature: [
    'Select...',
    '3200K (Tungsten/Warm)',
    '4300K (Fluorescent/Mixed)',
    '5600K (Daylight)',
    '6500K (Overcast/Cool)',
    '2000K (Candlelight)',
    '10000K (Blue Sky)',
  ],
  visualEffects: [
    'Select...',
    'None',
    'Slow Motion',
    'Fast Motion / Time-lapse',
    'Reverse',
    'Split Screen',
    'Picture-in-Picture',
    'Green Screen / Chroma Key',
    'Color Grading / LUT',
    'Black & White',
    'Sepia Tone',
    'Vignette',
    'Lens Flare',
    'Light Leaks',
    'Film Grain',
    'Bokeh Effect',
    'Depth of Field',
    'Motion Blur',
    'Zoom Blur',
    'Glitch / Distortion',
    'VHS / Retro Effect',
    'Chromatic Aberration',
    'Particles / Dust',
    'Smoke / Fog',
    'Rain / Snow',
    'Fire / Explosions',
    'Magic / Energy Effects',
    'Hologram / Sci-Fi',
    'CGI Integration',
    'Matte Painting',
    'Compositing',
    'Rotoscoping',
    'Tracking / Stabilization',
    'Speed Ramping',
    'Freeze Frame',
    'Morphing / Transition',
  ],
};

// Fixed headers to ensure all columns are shown even if data is missing
const SHOT_LIST_HEADERS = [
  'shot',
  'cast',
  'costume',
  'set',
  'description',
  'visualEffects',
  'durationSec',
  'shotSize',
  'perspective',
  'movement',
  'equipment',
  'focalLength',
  'aspectRatio',
  'lightingDesign',
  'colorTemperature',
];

// Helper to safely render content that might be an object/array
const safeRender = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Flatten object to string to prevent React crash
    return JSON.stringify(value);
  }
  return String(value);
};

// --- EXPORT GENERATORS ---

// Helper to center text for screenplay output
const centerText = (text: string, width: number): string => {
  if (text.length >= width) return text;
  const leftPad = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPad) + text;
};

const generateScreenplayText = (data: ScriptData): string => {
  let output = '';

  // Title Page
  output += `\n\n\n\n\n\n`;
  output += `${centerText(data.title.toUpperCase(), 50)}\n`;
  output += `by\n`;
  output += `Peace Script AI\n\n\n\n`;
  output += `Genre: ${data.mainGenre}\n`;
  output += `Logline: ${data.logLine}\n`;
  output += `\n\n\n\n\n\n\n\n`; // Page break simulation

  data.structure.forEach(point => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach(scene => {
      const loc = (scene.sceneDesign.location || 'INT. UNKNOWN - DAY').toUpperCase();

      // Scene Heading
      output += `\n${loc}\n\n`;

      // Action / Description
      scene.sceneDesign.situations.forEach(sit => {
        output += `${sit.description}\n\n`;

        // Dialogue
        sit.dialogue.forEach(d => {
          const charName = d.character.toUpperCase();
          // Indentation logic for text file (approximate)
          output += `\t\t\t\t${charName}\n`;

          // Safe handling of characterThoughts - handles legacy data formats (string/array/object)
          let thoughts = '';
          if (sit.characterThoughts) {
            if (typeof sit.characterThoughts === 'string') {
              thoughts = sit.characterThoughts;
            } else if (Array.isArray(sit.characterThoughts)) {
              thoughts = (sit.characterThoughts as any[]).join(' ');
            } else if (typeof sit.characterThoughts === 'object') {
              thoughts = JSON.stringify(sit.characterThoughts);
            }
          }
          if (thoughts && thoughts.length > 0) {
            output += `\t\t\t(thinking: ${thoughts.substring(0, 20)}...)\n`;
          }
          output += `\t\t${d.dialogue}\n\n`;
        });
      });
    });
  });
  return output;
};

const generateShotListCSV = (data: ScriptData): string => {
  const formatCostume = (shot: any): string => {
    if (shot?.costume && typeof shot.costume === 'string') return shot.costume;
    const cf = shot?.costumeFashion;
    if (cf && typeof cf === 'object') {
      const fashion = cf as Record<string, string>;
      const orderedKeys = [
        'Style Concept',
        'Main Outfit',
        'Shoe',
        'Accessories',
        'Color Palette',
        'Condition/Texture',
      ];
      const parts: string[] = [];
      for (const key of orderedKeys) {
        const value = typeof fashion[key] === 'string' ? fashion[key].trim() : '';
        if (value) parts.push(`${key}: ${value}`);
      }
      if (parts.length > 0) return parts.join(' | ');

      // Fallback for unexpected schemas
      return Object.entries(fashion)
        .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim())
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    }
    return '';
  };

  const headers = [
    'Scene #',
    'Shot #',
    'Cast',
    'Costume',
    'Set',
    'Description',
    'Size',
    'Angle',
    'Movement',
    'Equipment',
    'Lens',
    'Aspect Ratio',
    'Lighting',
    'Color Temp',
    'Visual Effects',
    'Duration',
  ];
  let csvContent = headers.join(',') + '\n';

  data.structure.forEach(point => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach(scene => {
      scene.shotList.forEach(shot => {
        const row = [
          scene.sceneNumber,
          shot.shot,
          `"${(shot.cast || '').replace(/"/g, '""')}"`,
          `"${formatCostume(shot).replace(/"/g, '""')}"`,
          `"${(shot.set || '').replace(/"/g, '""')}"`,
          `"${shot.description.replace(/"/g, '""')}"`,
          shot.shotSize,
          shot.perspective,
          shot.movement,
          shot.equipment,
          shot.focalLength,
          shot.aspectRatio,
          shot.lightingDesign,
          shot.colorTemperature,
          shot.visualEffects || 'None',
          shot.durationSec,
        ];
        csvContent += row.join(',') + '\n';
      });
    });
  });
  return csvContent;
};

const generateStoryboardHTML = (data: ScriptData): string => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Storyboard - ${data.title}</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
            h1 { text-align: center; color: #333; }
            .scene-header { background: #333; color: white; padding: 10px; margin-top: 20px; border-radius: 5px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 15px; }
            .card { background: white; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
            .image-container { width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .image-container img { width: 100%; height: 100%; object-fit: cover; }
            .info { padding: 15px; }
            .shot-num { font-weight: bold; color: #0088cc; font-size: 1.1em; }
            .desc { font-size: 0.9em; color: #555; margin-top: 5px; }
            .tech { font-size: 0.8em; color: #888; margin-top: 10px; font-style: italic; }
            @media print {
                body { background: white; }
                .card { border: 1px solid #ddd; }
            }
        </style>
    </head>
    <body>
        <h1>Storyboard: ${data.title}</h1>
    `;

  data.structure.forEach(point => {
    const scenes = data.generatedScenes[point.title] || [];
    scenes.forEach(scene => {
      if (!scene.storyboard || scene.storyboard.length === 0) return;

      html += `<div class="scene-header">Scene ${scene.sceneNumber}: ${scene.sceneDesign.sceneName}</div>`;
      html += `<div class="grid">`;

      scene.storyboard.forEach(sb => {
        const shotInfo = scene.shotList.find(s => isSameShotNumber(s.shot, sb.shot));
        html += `
                    <div class="card">
                        <div class="image-container">
                            ${
                              sb.video
                                ? `<video src="${sb.video}" controls style="width: 100%; height: 100%; object-fit: cover;">
                                     Your browser does not support the video tag.
                                   </video>`
                                : sb.image
                                  ? `<img src="${sb.image}" />`
                                  : '<span style="color:white">No Media</span>'
                            }
                        </div>
                        <div class="info">
                            <div class="shot-num">Shot ${sb.shot}</div>
                            <div class="desc">${shotInfo?.description || ''}</div>
                            <div class="tech">
                                ${shotInfo?.shotSize || ''} | ${shotInfo?.perspective || ''} | ${shotInfo?.movement || ''}
                            </div>
                        </div>
                    </div>
                `;
      });

      html += `</div>`;
    });
  });

  html += `</body></html>`;
  return html;
};

const LoadingSpinner: React.FC = () => (
  <div role="status" className="flex items-center justify-center space-x-2 h-full">
    <span className="sr-only">Loading...</span>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
  </div>
);

const SceneDisplay: React.FC<{
  sceneData: GeneratedScene;
  onSave: (updatedScene: GeneratedScene) => void;
  allCharacters: Character[];
  onRegisterUndo?: () => void;
  _goToStep: (step: number) => void;
  onNavigateToCharacter?: (
    charName: string,
    fromStep?: number,
    sceneContext?: { pointTitle: string; sceneIndex: number }
  ) => void;
  pointTitle: string;
  sceneIndex: number;
  scriptData: ScriptData;
  isRegenerateLocationModalOpen: boolean;
  setIsRegenerateLocationModalOpen: (value: boolean) => void;
  isRegeneratingAllLocation: boolean;
  locationRegenerationProgress: number;
  handleRegenerateAllLocationDetails: (mode: 'fresh' | 'refine' | 'edited') => Promise<void>;
  locationImageAlbum: Array<{
    url: string;
    timestamp: number;
    locationString: string;
    id: string;
  }>;
  selectedLocationImageId: string | null;
  isGeneratingLocationImage: boolean;
  onSelectLocationImage: (id: string) => void;
  onDeleteLocationImage: (id: string) => void;
  handleGenerateLocationImage: () => void;
}> = ({
  sceneData,
  onSave,
  allCharacters,
  onRegisterUndo,
  onNavigateToCharacter,
  pointTitle,
  sceneIndex,
  scriptData,
  isRegenerateLocationModalOpen,
  setIsRegenerateLocationModalOpen,
  isRegeneratingAllLocation,
  locationRegenerationProgress,
  handleRegenerateAllLocationDetails,
  locationImageAlbum,
  selectedLocationImageId,
  isGeneratingLocationImage,
  onSelectLocationImage,
  onDeleteLocationImage,
  handleGenerateLocationImage,
}) => {
  // Sub-tabs for Scene Design only
  const [activeTab, setActiveTab] = useState('design');
  const [isEditing, setIsEditing] = useState(false);

  // Ensure all arrays exist (handle legacy data)
  const safeSceneData: GeneratedScene = {
    ...sceneData,
    sceneDesign: {
      ...sceneData.sceneDesign,
      situations: (sceneData.sceneDesign?.situations || []).map(sit => ({
        ...sit,
        dialogue: sit.dialogue || [],
        characterThoughts: sit.characterThoughts || '',
      })),
    },
    shotList: sceneData.shotList || [],
    propList: sceneData.propList || [],
    storyboard: sceneData.storyboard || [],
    breakdown: {
      part1: sceneData.breakdown?.part1 || [],
      part2: sceneData.breakdown?.part2 || [],
      part3: sceneData.breakdown?.part3 || [],
    },
  };
  const [editedScene, setEditedScene] = useState<GeneratedScene>(safeSceneData);

  // State for granular location editing
  const [locPrefix, setLocPrefix] = useState('INT.');
  const [locName, setLocName] = useState('');
  const [locTime, setLocTime] = useState('DAY');

  // State for storyboard generation
  const [generatingShotId, setGeneratingShotId] = useState<number | null>(null);
  const [generatingVideoShotId, setGeneratingVideoShotId] = useState<number | null>(null);
  const [currentVideoJobId, setCurrentVideoJobId] = useState<string | null>(null); // 🆕 Track video job ID for cancellation
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [storyboardStyle, setStoryboardStyle] = useState<string>(CHARACTER_IMAGE_STYLES[0]);
  const [storyboardModel, setStoryboardModel] = useState<string>('auto'); // 🆕 Model selection for storyboard
  const [preferredVideoModel, setPreferredVideoModel] = useState<string>('auto');
  const [comfyBackendStatus, setComfyBackendStatus] = useState<ComfyBackendStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const progressDisplayedRef = useRef(0);
  const progressTimeoutsRef = useRef<number[]>([]);

  // Keep the ref in sync even if other handlers call setProgress directly.
  useEffect(() => {
    progressDisplayedRef.current = progress;
  }, [progress]);

  const loadComfyBackendStatus = useCallback(async () => {
    try {
      const status = await checkBackendStatus(true);
      setComfyBackendStatus(status as ComfyBackendStatus);
    } catch {
      setComfyBackendStatus({ running: false, error: 'Backend check failed' });
    }
  }, []);

  const clearProgressAnimation = useCallback(() => {
    for (const timeoutId of progressTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    progressTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearProgressAnimation();
    };
  }, [clearProgressAnimation]);

  const setProgressImmediate = useCallback((value: number) => {
    const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    progressDisplayedRef.current = safe;
    setProgress(safe);
  }, []);

  const animateProgressTo = useCallback(
    (targetValue: number) => {
      const target = Math.max(0, Math.min(100, Number.isFinite(targetValue) ? targetValue : 0));
      const from = progressDisplayedRef.current;

      // Always stop previous animations when a newer progress arrives.
      clearProgressAnimation();

      // Reset or no-op cases.
      if (target <= 0) {
        setProgressImmediate(0);
        return;
      }
      if (target <= from) {
        return;
      }

      // If job is basically done, do not delay showing it.
      if (target >= 99) {
        setProgressImmediate(target);
        return;
      }

      // Special early-stage smoothing: make 0 -> 14 feel like 0 -> 5 -> 8 -> 12 -> 14.
      // Works for any target between 6..20.
      if (from === 0 && target > 5 && target <= 20) {
        const candidateSteps = [5, Math.round(target * 0.6), Math.round(target * 0.85), target];

        const steps: number[] = [];
        let last = from;
        for (const v of candidateSteps) {
          const clamped = Math.max(0, Math.min(target, v));
          if (clamped > last) {
            steps.push(clamped);
            last = clamped;
          }
        }

        const delays = [0, 160, 320, 480];
        steps.forEach((value, index) => {
          const timeoutId = window.setTimeout(
            () => {
              setProgressImmediate(value);
            },
            delays[Math.min(index, delays.length - 1)]
          );
          progressTimeoutsRef.current.push(timeoutId);
        });
        return;
      }

      // Generic smoothing: small ramp over ~520ms.
      const delta = target - from;
      const stepsCount = Math.max(3, Math.min(8, Math.ceil(delta / 4)));
      const durationMs = 520;
      const stepMs = Math.floor(durationMs / stepsCount);
      for (let i = 1; i <= stepsCount; i++) {
        const value = Math.round(from + (delta * i) / stepsCount);
        const timeoutId = window.setTimeout(() => {
          setProgressImmediate(value);
        }, i * stepMs);
        progressTimeoutsRef.current.push(timeoutId);
      }
    },
    [clearProgressAnimation, setProgressImmediate]
  );

  // 🎙️ Voice Generation States

  // @ts-ignore - audioTimeline reserved for future audio preview feature
  const [audioTimeline, setAudioTimeline] = useState<AudioTimeline | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [generatingAudioForShot, setGeneratingAudioForShot] = useState<number | null>(null);

  // 🆕 Video Generation Settings
  // WAN defaults (reset when WAN is selected)
  // Baseline proven in this project: lower FPS + calmer motion tends to reduce noise/blur/drift.
  const [videoCfg, setVideoCfg] = useState<number>(5.5);
  const [videoSteps, setVideoSteps] = useState<number>(30);
  const [videoFps, setVideoFps] = useState<number>(12);
  const [videoMotionStrength, setVideoMotionStrength] = useState<number>(92);

  // If user selects Wan, re-apply Wan defaults (helps when they previously tuned values for other models).
  useEffect(() => {
    if (preferredVideoModel === 'comfyui-wan') {
      setVideoCfg(5.5);
      setVideoSteps(30);
      setVideoFps(12);
      setVideoMotionStrength(92);
    }
  }, [preferredVideoModel]);

  // 🆕 Video Resolution & Aspect Ratio
  const [videoAspectRatio, setVideoAspectRatio] = useState<
    '16:9' | '9:16' | '1:1' | '4:3' | 'custom'
  >('16:9');
  const [customWidth, setCustomWidth] = useState<number>(1024);
  const [customHeight, setCustomHeight] = useState<number>(576);

  // Deletion confirmation states (UI based to avoid window.confirm issues)
  const [confirmDeleteSituationId, setConfirmDeleteSituationId] = useState<number | null>(null);
  const [confirmDeleteShotId, setConfirmDeleteShotId] = useState<number | null>(null);
  const [confirmDeleteShotListId, setConfirmDeleteShotListId] = useState<number | null>(null);
  const [confirmDeletePropId, setConfirmDeletePropId] = useState<number | null>(null);
  const [confirmDeleteBreakdownId, setConfirmDeleteBreakdownId] = useState<{
    part: 'part1' | 'part2' | 'part3';
    index: number;
  } | null>(null);

  // Ref for stopping auto-generation
  const abortGenerationRef = useRef(false);

  // Robust shot number comparison (storyboard/shotList may contain number or string)
  const isSameShotNumber = (a: unknown, b: unknown) => {
    const aNum = typeof a === 'number' ? a : typeof a === 'string' ? Number(a) : NaN;
    const bNum = typeof b === 'number' ? b : typeof b === 'string' ? Number(b) : NaN;

    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return aNum === bNum;
    }
    return String(a ?? '').trim() === String(b ?? '').trim();
  };

  // Drag and Drop State for Dialogue
  const [draggedDialogueIndex, setDraggedDialogueIndex] = useState<number | null>(null);
  const [activeSituationForDrag, setActiveSituationForDrag] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    sitIndex: number;
    dlgIndex: number;
    position: 'top' | 'bottom';
  } | null>(null);

  // Helper to extract location parts
  const parseLocationParts = (loc: string) => {
    const prefixMatch = loc.match(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)/);
    const timeMatch = loc.match(/-\s*(DAY|NIGHT|DAWN|DUSK|CONTINUOUS|LATER|MORNING|EVENING)$/);

    const prefix = prefixMatch ? prefixMatch[0] : 'INT.';
    const time = timeMatch ? timeMatch[1] : 'DAY';

    let name = loc;
    if (prefixMatch) name = name.replace(prefixMatch[0], '').trim();
    if (timeMatch) name = name.replace(timeMatch[0], '').trim();
    // Clean up leading hyphen if exists
    name = name.replace(/^-+\s*/, '').trim();

    if (!name && !prefixMatch && !timeMatch) name = loc; // Fallback if regex misses

    return { prefix, name, time };
  };

  useEffect(() => {
    if (!isEditing) {
      setEditedScene(sceneData);
    } else {
      const loc = sceneData.sceneDesign.location || '';
      const { prefix, name, time } = parseLocationParts(loc);

      setLocPrefix(prefix);
      setLocName(name);
      setLocTime(time);
    }
  }, [sceneData, isEditing]);

  const handleSave = () => {
    // Reconstruct location string
    const finalLocation = `${locPrefix} ${locName} - ${locTime}`;
    const finalScene = {
      ...editedScene,
      sceneDesign: {
        ...editedScene.sceneDesign,
        location: finalLocation,
      },
    };
    onSave(finalScene);
    setIsEditing(false);
    setConfirmDeleteSituationId(null); // Reset states
  };

  const handleCancel = () => {
    setEditedScene(sceneData);
    setIsEditing(false);
    setConfirmDeleteSituationId(null);
  };

  // --- Edit Handlers ---
  const updateDesignField = (field: keyof typeof editedScene.sceneDesign, value: any) => {
    setEditedScene(prev => ({
      ...prev,
      sceneDesign: { ...prev.sceneDesign, [field]: value },
    }));
  };

  // --- Character List Management Handlers ---
  const handleAddCharacterToScene = (charName: string) => {
    if (!charName) return;
    setEditedScene(prev => ({
      ...prev,
      sceneDesign: {
        ...prev.sceneDesign,
        characters: [...prev.sceneDesign.characters, charName],
      },
    }));
  };

  const handleRemoveCharacterFromScene = (charName: string) => {
    setEditedScene(prev => ({
      ...prev,
      sceneDesign: {
        ...prev.sceneDesign,
        characters: prev.sceneDesign.characters.filter(c => c !== charName),
      },
    }));
  };

  // --- Wardrobe Manager Handlers ---
  const handleWardrobeChange = (charName: string, outfitId: string) => {
    setEditedScene(prev => ({
      ...prev,
      characterOutfits: {
        ...prev.characterOutfits,
        [charName]: outfitId,
      },
    }));
  };

  // --- Situation Management ---
  const updateSituation = (index: number, field: string, value: any) => {
    setEditedScene(prev => {
      const newSituations = [...prev.sceneDesign.situations];
      newSituations[index] = { ...newSituations[index], [field]: value };
      return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
    });
  };

  const handleAddSituation = () => {
    setEditedScene(prev => ({
      ...prev,
      sceneDesign: {
        ...prev.sceneDesign,
        situations: [
          ...prev.sceneDesign.situations,
          { description: '', characterThoughts: '', dialogue: [] },
        ],
      },
    }));
  };

  const handleRemoveSituation = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    // 2-Step Confirmation logic
    if (confirmDeleteSituationId === index) {
      // Confirmed
      if (onRegisterUndo) onRegisterUndo();

      setEditedScene(prev => {
        const newSituations = prev.sceneDesign.situations.filter((_, i) => i !== index);
        return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
      });
      setConfirmDeleteSituationId(null);
    } else {
      // First click
      setConfirmDeleteSituationId(index);
      setTimeout(() => setConfirmDeleteSituationId(prev => (prev === index ? null : prev)), 3000);
    }
  };

  // --- Dialogue Management (UPDATED FOR ARRAY) ---
  const updateDialogue = (
    sitIndex: number,
    lineId: string,
    field: 'character' | 'dialogue',
    value: string
  ) => {
    setEditedScene(prev => {
      const newSituations = [...prev.sceneDesign.situations];
      const newDialogue = newSituations[sitIndex].dialogue.map(d => {
        if (d.id === lineId) {
          return { ...d, [field]: value };
        }
        return d;
      });

      newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: newDialogue };
      return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
    });
  };

  const handleAddDialogue = (sitIndex: number) => {
    setEditedScene(prev => {
      const newSituations = [...prev.sceneDesign.situations];
      const currentDialogue = [...newSituations[sitIndex].dialogue];

      // Generate unique ID for new line
      const newLine: DialogueLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        character: '',
        dialogue: '',
      };

      newSituations[sitIndex] = {
        ...newSituations[sitIndex],
        dialogue: [...currentDialogue, newLine],
      };
      return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
    });
  };

  const handleRemoveDialogue = (sitIndex: number, lineId: string) => {
    if (onRegisterUndo) onRegisterUndo();

    setEditedScene(prev => {
      const newSituations = [...prev.sceneDesign.situations];
      const newDialogue = newSituations[sitIndex].dialogue.filter(d => d.id !== lineId);

      newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: newDialogue };
      return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
    });
  };

  // --- Drag and Drop Logic for Dialogue ---
  const handleDragStart = (e: React.DragEvent, sitIndex: number, dlgIndex: number) => {
    setDraggedDialogueIndex(dlgIndex);
    setActiveSituationForDrag(sitIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedDialogueIndex(null);
    setActiveSituationForDrag(null);
    setDropIndicator(null);
  };

  const handleDragOver = (e: React.DragEvent, sitIndex: number, dlgIndex: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling to prevent parent interference

    if (activeSituationForDrag !== sitIndex) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';

    setDropIndicator(prev => {
      // Optimization: Don't update state if it hasn't changed
      if (
        prev &&
        prev.sitIndex === sitIndex &&
        prev.dlgIndex === dlgIndex &&
        prev.position === position
      )
        return prev;
      return { sitIndex, dlgIndex, position };
    });
  };

  const handleDrop = (e: React.DragEvent, sitIndex: number) => {
    e.preventDefault();
    if (draggedDialogueIndex === null || !dropIndicator || dropIndicator.sitIndex !== sitIndex) {
      handleDragEnd(e);
      return;
    }

    const { dlgIndex: targetIndex, position } = dropIndicator;

    // Prevent dropping on self
    if (draggedDialogueIndex === targetIndex && (position === 'top' || position === 'bottom')) {
      handleDragEnd(e);
      return;
    }

    setEditedScene(prev => {
      const newSituations = [...prev.sceneDesign.situations];
      const dialogueList = [...newSituations[sitIndex].dialogue];

      // Remove source item
      const [movedItem] = dialogueList.splice(draggedDialogueIndex, 1);

      // Calculate destination index
      let insertIndex = targetIndex;

      // If dragging from above to below, the index shifts because we removed 1 item above
      if (draggedDialogueIndex < insertIndex) {
        insertIndex--; // Shift target up because an item above was removed
      }

      if (position === 'bottom') {
        insertIndex++;
      }

      // Safety clamp
      if (insertIndex < 0) insertIndex = 0;
      if (insertIndex > dialogueList.length) insertIndex = dialogueList.length;

      dialogueList.splice(insertIndex, 0, movedItem);

      newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: dialogueList };
      return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
    });

    handleDragEnd(e);
  };

  const updateTableItem = (
    section: 'shotList' | 'propList' | 'breakdown',
    index: number,
    field: string,
    value: string,
    subSection?: 'part1' | 'part2' | 'part3'
  ) => {
    setEditedScene(prev => {
      if (section === 'breakdown' && subSection) {
        const newPart = [...prev.breakdown[subSection]];
        const item = (newPart[index] || {}) as Record<string, string>;
        const updatedItem: Record<string, string> = { ...item, [field]: value };
        newPart[index] = updatedItem;
        return { ...prev, breakdown: { ...prev.breakdown, [subSection]: newPart } };
      } else if (section === 'shotList') {
        const list = [...prev.shotList];
        const item = list[index] || {};

        // Smart Auto-Fill Logic for Shot List
        let extraUpdates = {};
        if (field === 'cast') {
          // If cast changes, try to auto-set costume from Wardrobe Manager
          const assignedOutfitId = prev.characterOutfits?.[value];
          if (assignedOutfitId) {
            extraUpdates = { costume: assignedOutfitId };
          }
        }

        const updatedItem = { ...item, [field]: value, ...extraUpdates };
        (list as any[])[index] = updatedItem;
        return { ...prev, shotList: list };
      } else if (section === 'propList') {
        const list = [...prev.propList];
        const item = list[index] || {};
        const updatedItem = { ...item, [field]: value };
        (list as any[])[index] = updatedItem;
        return { ...prev, propList: list };
      }
      return prev;
    });
  };

  // --- Psychology to Visual Helpers ---
  const buildEmotionalContext = (character: Character): string => {
    let context = '';
    const emotion = character.emotionalState;

    if (emotion) {
      // Map mood to visual expression
      const moodMap: Record<string, string> = {
        peaceful: 'calm, serene, relaxed facial expression, composed posture',
        joyful: 'smiling, bright eyes, positive energy, open body language',
        angry: 'furrowed brows, tense jaw, intense gaze, clenched fists, hostile stance',
        confused: 'puzzled look, uncertain posture, questioning expression',
        fearful: 'wide eyes, tense body, defensive stance, worried expression',
        neutral: 'composed, neutral expression, balanced posture',
      };

      context += `EMOTION: ${moodMap[emotion.currentMood] || 'neutral'}. `;

      // Energy level affects animation/presence
      if (emotion.energyLevel > 70) {
        context += 'HIGH ENERGY: energetic, animated, dynamic presence. ';
      } else if (emotion.energyLevel < 30) {
        context += 'LOW ENERGY: tired, sluggish, low vitality, weary appearance. ';
      }

      // Mental balance affects overall demeanor
      if (emotion.mentalBalance > 50) {
        context += 'BALANCED MIND: clear-minded, centered, confident demeanor. ';
      } else if (emotion.mentalBalance < -50) {
        context += 'TROUBLED MIND: stressed, inner turmoil visible, anxious appearance. ';
      }
    }

    return context;
  };

  const buildDefilementContext = (character: Character): string => {
    const defilements = character.internal?.defilement;
    if (!defilements) return '';

    // Find dominant defilement (highest value)
    const entries = Object.entries(defilements);
    if (entries.length === 0) return '';

    const dominant = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
    const [name, value] = dominant;

    // Only mention if significantly high (>60%)
    if (value < 60) return '';

    const defilementMap: Record<string, string> = {
      'Lobha (Greed)': 'greedy eyes, calculating expression, grasping gestures',
      'Anger (Anger)': 'angry face, hostile body language, aggressive stance',
      'Moha (delusion)': 'confused look, uncertain posture, unfocused gaze',
      'Mana (arrogance)': 'proud stance, superior expression, chin lifted, condescending look',
      'Titthi (obsession)': 'intense focus, fixed stare, obsessive mannerism',
      'Envy (Issa)': 'envious expression, bitter look, resentful posture',
      'Restlessness (uddhacca)': 'restless movement, fidgeting, anxious energy',
    };

    return `DOMINANT TRAIT: ${defilementMap[name] || name} (${Math.round(value)}% intensity). `;
  };

  const buildConsciousnessAura = (character: Character): string => {
    const consciousness = character.internal?.consciousness;
    if (!consciousness) return '';

    const values = Object.values(consciousness);
    if (values.length === 0) return '';

    const avgConsciousness = values.reduce((a, b) => a + b, 0) / values.length;

    if (avgConsciousness > 75) {
      return 'AURA: virtuous presence, serene energy, inner peace radiating, wise demeanor. ';
    } else if (avgConsciousness > 50) {
      return 'AURA: balanced presence, moderate composure. ';
    } else if (avgConsciousness < 40) {
      return 'AURA: troubled energy, restless presence, inner conflict visible. ';
    }

    return '';
  };

  const buildCaritaMannerism = (character: Character): string => {
    const carita = character.buddhist_psychology?.carita;
    if (!carita) return '';

    const caritaMap: Record<string, string> = {
      ราคจริต: 'sensual mannerisms, pleasure-seeking expression, indulgent posture',
      โทสจริต: 'intense gaze, passionate body language, energetic movements, strong presence',
      โมหจริต: 'confused mannerisms, hesitant movements, uncertain expressions',
      สัทธาจริต: 'faithful demeanor, trusting expression, open posture, devotional presence',
      พุทธิจริต: 'intellectual gaze, analytical expression, thoughtful posture, scholarly manner',
      วิตกจริต: 'contemplative pose, thoughtful expression, meditative presence',
    };

    return `TEMPERAMENT: ${caritaMap[carita] || carita}. `;
  };

  const buildDetailedPhysical = (character: Character): string => {
    const physical = character.physical || {};
    let details = '';

    // Gender
    if (physical['Gender']) {
      details += `${physical['Gender']}, `;
    }

    // Build/Height/Weight
    if (physical['Height, Weight']) {
      details += `${physical['Height, Weight']}, `;
    }

    // Skin color
    if (physical['Skin color']) {
      details += `${physical['Skin color']} skin, `;
    }

    // Eye characteristics (very important for emotion!)
    if (physical['Eye characteristics']) {
      details += `eyes: ${physical['Eye characteristics']}, `;
    }

    // Facial characteristics
    if (physical['Facial characteristics']) {
      details += `face: ${physical['Facial characteristics']}, `;
    }

    return details;
  };

  const buildDetailedFashion = (character: Character, outfitDesc: string): string => {
    const fashion = character.fashion || {};
    let details = `wearing ${outfitDesc}`;

    // Style concept
    if (fashion['Style Concept']) {
      details += `, style: ${fashion['Style Concept']}`;
    }

    // Color palette
    if (fashion['Color Palette']) {
      details += `, colors: ${fashion['Color Palette']}`;
    }

    // Accessories
    if (fashion['Accessories']) {
      details += `, accessories: ${fashion['Accessories']}`;
    }

    // Shoe
    if (fashion['Shoe'] || (fashion as any)['Footwear']) {
      details += `, shoes: ${(fashion['Shoe'] || (fashion as any)['Footwear']) as string}`;
    }

    // Condition/Texture
    if (fashion['Condition/Texture']) {
      details += `, condition: ${fashion['Condition/Texture']}`;
    }

    return details;
  };

  const buildGoalsContext = (character: Character): string => {
    if (!character.goals) return '';

    let context = '';

    // Inner conflict affects body tension
    if (character.goals.conflict) {
      context += `INNER CONFLICT: ${character.goals.conflict} - shows in tense posture, worried micro-expressions. `;
    }

    // Objective affects determination
    if (character.goals.objective) {
      context += `MOTIVATION: ${character.goals.objective} - shows in determined gaze, purposeful stance. `;
    }

    return context;
  };

  const buildSituationContext = (currentScene: GeneratedScene, shotData: any): string => {
    if (!currentScene.sceneDesign?.situations || currentScene.sceneDesign.situations.length === 0) {
      return '';
    }

    let context = '';

    // Get the first situation (or find the most relevant one)
    const situation = currentScene.sceneDesign.situations[0];

    // Add situation description (scene context)
    if (situation.description) {
      context += `SITUATION: ${situation.description}. `;
    }

    // Add character inner thoughts (for subtle expression)
    if (situation.characterThoughts) {
      context += `CHARACTER THOUGHTS: "${situation.characterThoughts}" - show this through subtle facial expressions and body language. `;
    }

    // Extract emotion from recent dialogue
    if (situation.dialogue && situation.dialogue.length > 0) {
      // Get last 2-3 lines of dialogue for context
      const recentDialogue = situation.dialogue.slice(-3);

      // Check if this shot's character has dialogue
      if (shotData.cast) {
        const characterDialogue = recentDialogue.filter(
          d =>
            d.character === shotData.cast ||
            shotData.cast.includes(d.character) ||
            d.character.includes(shotData.cast)
        );

        if (characterDialogue.length > 0) {
          const lastLine = characterDialogue[characterDialogue.length - 1];
          context += `RECENT LINE: "${lastLine.dialogue}" - facial expression and body language should match the emotional tone of this dialogue. `;
        }
      }
    }

    return context;
  };

  // --- Enhanced Storyboard Prompt Builder ---
  const buildPrompt = (shotData: any, currentScene: GeneratedScene, isVideo: boolean = false) => {
    // 1. Context: Location
    const locationContext = currentScene.sceneDesign.location || 'Unknown location';

    // 2. Context: Set Details (from Shot List override or default)
    const setDetails = shotData.set || locationContext;

    // 3. Context: Characters & Costumes (ENHANCED with Psychology)
    let characterContext = '';
    let psychologyContext = '';

    if (shotData.cast) {
      // Specific Cast Member
      const profile = allCharacters.find(
        c => c.name === shotData.cast || c.name.includes(shotData.cast)
      );

      if (profile) {
        // Physical characteristics (enhanced with details)
        const detailedPhysical = buildDetailedPhysical(profile);
        const hair = profile.physical?.['Hair style'] || '';

        // Costume Lookup (enhanced with fashion details)
        let outfitDesc = profile.fashion?.['Main Outfit'] || '';
        if (shotData.costume) {
          const specificOutfit = profile.outfitCollection?.find(o => o.id === shotData.costume);
          if (specificOutfit) {
            outfitDesc = specificOutfit.description;
          }
        }
        const detailedFashion = buildDetailedFashion(profile, outfitDesc);

        characterContext = `${shotData.cast}: ${detailedPhysical}${hair}, ${detailedFashion}`;

        // 🧠 NEW: Add Psychology Context
        psychologyContext = buildEmotionalContext(profile);
        psychologyContext += buildDefilementContext(profile);
        psychologyContext += buildConsciousnessAura(profile);
        psychologyContext += buildCaritaMannerism(profile);
        psychologyContext += buildGoalsContext(profile);
      } else {
        characterContext = shotData.cast; // Fallback to just name
      }
    } else {
      // Fallback: List all characters in scene with assigned wardrobes
      const sceneCharacterNames = currentScene.sceneDesign.characters || [];
      characterContext = sceneCharacterNames
        .map(name => {
          const profile = allCharacters.find(c => c.name.includes(name) || name.includes(c.name));

          if (profile) {
            const detailedPhysical = buildDetailedPhysical(profile);
            const assignedOutfitId = currentScene.characterOutfits?.[name];
            let outfitDesc = profile.fashion?.['Main Outfit'] || '';

            if (assignedOutfitId) {
              const specificOutfit = profile.outfitCollection?.find(o => o.id === assignedOutfitId);
              if (specificOutfit) outfitDesc = specificOutfit.description;
            }

            const detailedFashion = buildDetailedFashion(profile, outfitDesc);
            return `${name}: ${detailedPhysical}${detailedFashion}`;
          }
          return '';
        })
        .filter(Boolean)
        .join('. ');
    }

    // 4. Use user's selected style for both Image AND Video generation
    // Add motion-specific keywords for video while preserving user's aesthetic choice
    const styleInstruction = isVideo
      ? `${storyboardStyle}, High Quality Motion, Smooth Animation, 4K`
      : storyboardStyle;

    // 5. Construct Rich Prompt with Psychology Enhancement
    // 🆕 EST Shot Detection - emphasize physical objects/structures
    const isEstablishingShot = shotData.shotSize?.toUpperCase().includes('EST');

    let prompt = `STYLE: ${styleInstruction}.
SCENE SETTING: ${setDetails}.
CHARACTERS: ${characterContext || 'Generic characters'}.`;

    // Add psychology context if available
    if (psychologyContext) {
      prompt += `\n${psychologyContext}`;
    }

    // Add situation/dialogue context
    const situationContext = buildSituationContext(currentScene, shotData);
    if (situationContext) {
      prompt += `\n${situationContext}`;
    }

    prompt += `
SHOT Action: ${shotData.description}.
CAMERA SPECS: ${shotData.shotSize} Shot, ${shotData.perspective} Angle.`;

    // Add Visual Effects if specified (BEFORE rules for better AI comprehension)
    if (
      shotData.visualEffects &&
      shotData.visualEffects !== 'Select...' &&
      shotData.visualEffects !== 'None'
    ) {
      prompt += `
VISUAL EFFECTS: **${shotData.visualEffects.toUpperCase()}**. Apply ${shotData.visualEffects} effect throughout entire shot. Maintain effect consistency from first to last frame.`;
    }

    prompt += `
LIGHTING/MOOD: ${shotData.lightingDesign || 'Neutral'}, ${currentScene.sceneDesign.moodTone}.

${
  isEstablishingShot
    ? 'IMPORTANT FOR EST SHOT: Clearly show all physical structures, buildings, and architectural elements mentioned. Focus on establishing the location and environment. Maintain wide framing to capture the full scene.'
    : "IMPORTANT: Show the character's emotional and psychological state through facial expressions, body language, and overall presence. Ensure character consistency with physical and psychological descriptions."
}`;

    return prompt.trim();
  };

  const handleGenerateShotImage = async (shotIndex: number, shotData: any) => {
    if (onRegisterUndo) onRegisterUndo();
    const shotNumber = shotData.shot;
    if (!shotNumber) return;

    setGeneratingShotId(shotIndex);
    setProgress(0);
    try {
      const prompt = buildPrompt(shotData, editedScene, false);

      // Get characters involved in this scene (with improved matching)
      const sceneCharacterNames = (editedScene.sceneDesign?.characters || []).map((name: string) =>
        name.trim().toLowerCase()
      );
      const sceneCharacters: Character[] = allCharacters.filter((c: Character) =>
        sceneCharacterNames.includes(c.name.trim().toLowerCase())
      );

      console.log('🎭 [Storyboard] Scene characters:', {
        sceneNames: sceneCharacterNames,
        foundCharacters: sceneCharacters.map(c => c.name),
        allCharacters: allCharacters.map(c => c.name),
      });

      // 🆕 CONSISTENCY: Generate stable seed from scene + shot number
      const sceneKey = `${editedScene.sceneNumber || 'scene'}-${shotNumber}`;
      const sceneSeed =
        Math.abs(sceneKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000000;

      // 🆕 CONTINUITY: Get previous shot's image for reference
      const previousShot = editedScene.shotList?.[shotIndex - 1];
      const previousShotNumber = previousShot?.shot;
      const previousShotImage = previousShotNumber
        ? editedScene.storyboard?.find(s => isSameShotNumber(s.shot, previousShotNumber))?.image
        : undefined;

      console.log(
        `🎨 Generating shot ${shotNumber} with seed: ${sceneSeed}, previous shot: ${previousShotNumber || 'none'}`
      );

      const base64Image = await generateStoryboardImage(
        prompt,
        sceneCharacters,
        p => setProgress(p),
        {
          seed: sceneSeed, // 🔧 STABLE SEED per scene
          previousShotImage: previousShotImage, // 🔧 CONTINUITY reference
          preferredModel: storyboardModel, // 🆕 USER SELECTED MODEL
        }
      );

      const oldStoryboardItem =
        editedScene.storyboard?.find(s => isSameShotNumber(s.shot, shotNumber)) || {};
      const newItem = { ...oldStoryboardItem, shot: shotNumber, image: base64Image };

      const updatedStoryboard = [
        ...(editedScene.storyboard?.filter(s => !isSameShotNumber(s.shot, shotNumber)) || []),
        newItem,
      ];

      const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
      setEditedScene(updatedScene);

      // Immediate Save
      if (!isEditing) onSave(updatedScene);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: t('step5.error.generationFailed') || 'Generation Failed',
        message: t('step5.error.imageFailed') || 'Failed to generate image. Please try again.',
      });
      console.error(error);
    } finally {
      setGeneratingShotId(null);
      setProgress(0);
    }
  };

  const handleGenerateShotVideo = async (
    shotIndex: number,
    shotData: any,
    useImage: boolean = false
  ) => {
    if (onRegisterUndo) onRegisterUndo();
    const shotNumber = shotData.shot;
    if (!shotNumber) return;

    // ✅ Validate required data before generation
    if (!shotData.description || shotData.description.trim() === '') {
      setErrorModal({
        isOpen: true,
        title: t('common.missingInfo') || 'ข้อมูลไม่ครบถ้วน',
        message: 'Shot description is required for video generation',
      });
      return;
    }
    const sceneDialogueLines =
      editedScene.sceneDesign?.situations?.flatMap(s => s.dialogue || []) || [];
    if (sceneDialogueLines.length === 0) {
      console.warn('⚠️ Warning: No dialogue found in scene');
    }
    if (!scriptData?.characters?.[0]) {
      console.warn('⚠️ Warning: No character data found');
    }

    // 🎙️ Automatic Voice Detection & Fallback System
    // ตรวจสอบว่ามี dialogue ในฉากนี้หรือไม่
    const shouldIncludeVoice = sceneDialogueLines.length > 0;
    if (shouldIncludeVoice) {
      // วิเคราะห์ตัวละครที่มี dialogue
      const charactersInDialogue = [...new Set(sceneDialogueLines.map(d => d.character))];
      
      // แยกประเภทตัวละคร: มี voice sample, มีแค่ speech pattern, หรือไม่มีอะไรเลย
      const voiceStatus = charactersInDialogue.map(charName => {
        const char = scriptData.characters.find(c => c.name === charName);
        return {
          name: charName,
          hasVoiceSample: !!char?.voiceCloning?.hasVoiceSample,
          hasSpeechPattern: !!(char?.speechPattern || char?.dialect),
          character: char
        };
      });

      const charactersWithVoice = voiceStatus.filter(s => s.hasVoiceSample);
      const charactersWithSpeechPattern = voiceStatus.filter(s => !s.hasVoiceSample && s.hasSpeechPattern);
      const charactersWithoutAnyData = voiceStatus.filter(s => !s.hasVoiceSample && !s.hasSpeechPattern);

      // แจ้งเตือนผู้ใช้เกี่ยวกับการใช้เสียง
      if (charactersWithVoice.length > 0 || charactersWithSpeechPattern.length > 0) {
        console.warn('🎙️ Voice Generation Status:');
        if (charactersWithVoice.length > 0) {
          console.warn(`  ✅ Voice Cloning (${charactersWithVoice.length}):`, charactersWithVoice.map(c => c.name));
        }
        if (charactersWithSpeechPattern.length > 0) {
          console.warn(`  📝 Speech Pattern Fallback (${charactersWithSpeechPattern.length}):`, charactersWithSpeechPattern.map(c => c.name));
        }
        if (charactersWithoutAnyData.length > 0) {
          console.warn(`  ⚠️ No Voice Data (${charactersWithoutAnyData.length}):`, charactersWithoutAnyData.map(c => c.name));
          
          const shouldContinue = confirm(
            `⚠️ Warning: Some characters have no voice data:\n${charactersWithoutAnyData.map(c => c.name).join(', ')}\n\nContinue without voice for these characters?`
          );
          if (!shouldContinue) return;
        }
      }
    }

    setGeneratingVideoShotId(shotIndex);
    setCurrentVideoJobId(null); // Reset job ID
    setProgress(0);
    setAudioProgress(0);

    try {
      // 🔍 DEBUG: Log video generation settings (use console.warn to prevent minification)
      console.warn('🎬 VIDEO GENERATION DEBUG:');
      console.warn('  Model:', preferredVideoModel);
      console.warn('  Aspect Ratio:', videoAspectRatio);
      console.warn('  Use Image:', useImage);
      console.warn('  Shot Data:', {
        shot: shotNumber,
        description: shotData.description,
        movement: shotData.movement,
        durationSec: shotData.durationSec,
      });

      // Use existing image as base ONLY if useImage is true and image exists
      const existingImage = useImage
        ? editedScene.storyboard?.find(s => isSameShotNumber(s.shot, shotNumber))?.image
        : undefined;

      // 🆕 Continuity: only use previous shot video when user explicitly opts-in (useImage=true)
      // Otherwise, regenerations can look like "it reused the old video" because the last frame strongly conditions the output.
      const previousVideo =
        useImage && Number(shotNumber) > 1
          ? editedScene.storyboard?.find(s => isSameShotNumber(s.shot, Number(shotNumber) - 1))
              ?.video
          : undefined;

      // 🆕 Continuity: only pass previous shot metadata when continuity is enabled.
      // Otherwise, prompt-only continuity can conflict with the actual video conditioning (and cause drift).
      const previousShot =
        useImage &&
        typeof previousVideo === 'string' &&
        previousVideo.length > 0 &&
        Number(shotNumber) > 1
          ? editedScene.shotList?.find(s => isSameShotNumber(s.shot, Number(shotNumber) - 1))
          : undefined;

      console.warn('  Has Base Image:', !!existingImage);
      console.warn('  Has Previous Video:', !!previousVideo);

      // 🆕 Avoid "same clip" on regenerate:
      // Video generation uses stable/deterministic seeding by default for consistency.
      // When NOT doing continuity (no previousVideo), we want each click to produce a new result.
      const requestSeed =
        typeof previousVideo === 'string' && previousVideo.length > 0
          ? undefined
          : Math.floor(Math.random() * 1000000000);

      console.warn('  Seed:', requestSeed ?? '(stable/derived)');

      const { generateShotVideo } = await import('../services/videoGenerationService');

      const normalizeCastToString = (castValue: unknown): string => {
        if (typeof castValue === 'string') return castValue;
        if (Array.isArray(castValue)) return castValue.filter(Boolean).join(', ');
        return '';
      };

      // 🎭 CHARACTER FACE ID: Extract characters from scene
      const sceneCharacters = editedScene.sceneDesign?.characters || [];
      const fullCharacters = sceneCharacters
        .map(charName => {
          // If charName is a string, find full character data
          if (typeof charName === 'string') {
            return scriptData.characters.find(c => c.name === charName);
          }
          // If already a character object, use it
          return charName;
        })
        .filter((c): c is Character => c !== undefined);

      // Resolve cast + lead character
      const castFromShot = normalizeCastToString((shotData as any)?.cast);
      const sceneCharacterNames = fullCharacters.map(c => c.name).filter(Boolean);
      const castString =
        castFromShot.trim().length > 0 ? castFromShot : sceneCharacterNames.join(', ');
      const castNames = castString
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const leadCharacter =
        scriptData.characters.find(c => castNames.includes(c.name)) ||
        fullCharacters[0] ||
        scriptData.characters[0];

      // 🆕 Per-shot Costume & Fashion should come from Shot List (not Step 3 character fashion)
      // Keep all other character fields (External/Physical/Speech/Psychology) from Step 3.
      const leadCharacterForShot: Character =
        shotData &&
        typeof (shotData as any).costumeFashion === 'object' &&
        (shotData as any).costumeFashion
          ? ({ ...leadCharacter, fashion: (shotData as any).costumeFashion } as Character)
          : leadCharacter;

      // Resolve cast character objects (used to inject per-character identity anchors into the video prompt).
      const castCharacters = castNames
        .map(name => scriptData.characters.find(c => c.name === name))
        .filter((c): c is Character => !!c);

      // Pass multiple references for better identity stability in multi-character shots
      // const getCharacterFaceRef = (c?: Character) => c?.faceReferenceImage || c?.image; // For future use
      // IMPORTANT: Some shots specify cast in shot.cast but omit them from sceneDesign.characters.
      // Use the union so we don't drop a character (e.g., Peace) or accidentally swap identities.
      const allShotCharacters: Character[] = Array.from(
        new Map(
          [leadCharacterForShot, ...castCharacters, ...fullCharacters]
            .filter(Boolean)
            .map(c => [c.id || c.name, c] as const)
        ).values()
      );

      console.info(
        `🎭 Shot cast resolved: ${allShotCharacters.length} character(s) with images:`,
        allShotCharacters.map(c => ({
          name: c.name,
          hasFaceRef: !!(c.faceReferenceImage || c.image),
        }))
      );

      // 🔍 DIAGNOSTIC: Log actual video parameters being sent
      console.log('📊 Video Generation Parameters:', {
        model: preferredVideoModel,
        cfg: videoCfg,
        steps: videoSteps,
        fps: videoFps,
        motionStrength: videoMotionStrength,
        timestamp: new Date().toISOString(),
      });

      const videoUri = await generateShotVideo(
        shotData,
        existingImage,
        {
          preferredModel: preferredVideoModel,
          seed: requestSeed,
          previousVideo: typeof previousVideo === 'string' ? previousVideo : undefined,
          previousShot: previousShot as any,
          transitionType: 'smooth',
          character: leadCharacterForShot, // 🆕 Lead character + per-shot Costume & Fashion override
          castCharacters: castCharacters.length > 0 ? castCharacters : undefined,
          currentScene: editedScene,
          // Pass aspect ratio / resolution through to downstream ComfyUI calls
          aspectRatio: videoAspectRatio,
          width: videoAspectRatio === 'custom' ? customWidth : undefined,
          height: videoAspectRatio === 'custom' ? customHeight : undefined,
          // Note: cfg, steps, fps, motionStrength are handled internally by video generation service
        },
        (p: number) => {
          console.info(`🎬 UI Progress Update: ${Math.round(p)}%`);
          animateProgressTo(p);
        }
      );

      // 🔍 DEBUG: Check video URL before saving
      console.warn('🎬 Step5Output - Video Result:', videoUri);
      console.warn('🎬 Step5Output - Type:', typeof videoUri);
      console.warn('🎬 Step5Output - Length:', videoUri?.length);

      // 🎙️ VOICE GENERATION: Generate audio and merge with video
      // ระบบจะใช้ Voice Cloning อัตโนมัติถ้ามี ถ้าไม่มีจะใช้ Speech Pattern & Dialect
      let finalVideoUri = videoUri;
      if (shouldIncludeVoice) {
        try {
          console.warn('🎙️ Starting audio generation for shot...');
          setGeneratingAudioForShot(shotIndex);
          setAudioProgress(0);

          // แยก dialogues ตามประเภทการสร้างเสียง
          const dialoguesWithVoice = sceneDialogueLines.filter(d => {
            const char = scriptData.characters.find(c => c.name === d.character);
            return char?.voiceCloning?.hasVoiceSample;
          });

          const dialoguesWithSpeechPattern = sceneDialogueLines.filter(d => {
            const char = scriptData.characters.find(c => c.name === d.character);
            return !char?.voiceCloning?.hasVoiceSample && (char?.speechPattern || char?.dialect);
          });

          if (dialoguesWithVoice.length > 0 || dialoguesWithSpeechPattern.length > 0) {
            setAudioProgress(20);
            console.warn(`🎙️ Generating audio:`);
            console.warn(`  ✅ Voice Cloning: ${dialoguesWithVoice.length} lines`);
            console.warn(`  📝 Speech Pattern: ${dialoguesWithSpeechPattern.length} lines`);

            // สร้าง audio timeline รวมทั้ง voice cloning และ speech pattern
            const allDialogues = [...dialoguesWithVoice, ...dialoguesWithSpeechPattern];
            const { audioBlob, timeline } = await generateSceneAudio(
              allDialogues,
              scriptData.characters,
              {
                gapBetweenLines: 0.5,
                startDelay: 0.5,
                useSpeechPatternFallback: true, // เปิดใช้ Speech Pattern fallback
              }
            );

            setAudioTimeline(timeline);
            setAudioProgress(60);
            console.warn('🎙️ Audio generated, merging with video...');

            // Fetch video blob
            const videoResponse = await fetch(videoUri);
            const videoBlob = await videoResponse.blob();

            setAudioProgress(80);

            // Merge video + audio
            const finalVideoBlob = await mergeVideoWithAudio(videoBlob, audioBlob, {
              fadeIn: 0.5,
              fadeOut: 0.5,
            });

            setAudioProgress(100);

            // Convert to data URL (for now - later can upload to storage)
            finalVideoUri = URL.createObjectURL(finalVideoBlob);
            console.warn('🎙️ Video+Audio merge complete!');
          } else {
            console.warn('🎙️ No dialogues with voice data in this shot');
          }
        } catch (audioError) {
          console.error('❌ Audio generation failed:', audioError);
          setErrorModal({
            isOpen: true,
            title: '⚠️ Audio Error',
            message: `Video generated successfully, but audio generation failed: ${audioError instanceof Error ? audioError.message : 'Unknown error'}`,
          });
          // Continue with video-only
        } finally {
          setGeneratingAudioForShot(null);
          setAudioProgress(0);
        }
      }

      const oldStoryboardItem = editedScene.storyboard?.find(s =>
        isSameShotNumber(s.shot, shotNumber)
      ) || {
        shot: shotNumber,
        image: '',
      };
      const newItem = { ...oldStoryboardItem, video: finalVideoUri };

      const updatedStoryboard = [
        ...(editedScene.storyboard?.filter(s => !isSameShotNumber(s.shot, shotNumber)) || []),
        newItem,
      ];

      const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
      setEditedScene(updatedScene);

      if (!isEditing) onSave(updatedScene);
    } catch (error) {
      // 🔍 Show actual error message instead of generic message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Video generation error:', error);
      console.error('❌ Error message:', errorMessage);
      console.error('❌ Preferred model was:', preferredVideoModel);

      setErrorModal({
        isOpen: true,
        title: 'Video Generation Failed',
        message: `Failed to generate video: ${errorMessage}`,
      });
    } finally {
      setGeneratingVideoShotId(null);
      setCurrentVideoJobId(null);
      clearProgressAnimation();
      setProgressImmediate(0);
      setAudioProgress(0);
      setGeneratingAudioForShot(null);
    }
  };

  // 🆕 Cancel video generation
  const handleCancelVideoGeneration = async () => {
    if (!currentVideoJobId) {
      console.warn('⚠️ No video job to cancel');
      return;
    }

    try {
      console.log(`🛑 Cancelling video job: ${currentVideoJobId}`);
      const { cancelVideoJob } = await import('../services/comfyuiBackendClient');
      const result = await cancelVideoJob(currentVideoJobId);

      if (result.success) {
        setSuccessModal({
          isOpen: true,
          title: '✅ Cancelled',
          message: 'Video generation cancelled successfully',
        });
        console.log('✅ Cancellation result:', result);
      } else {
        setInfoModal({
          isOpen: true,
          title: '⚠️ Cancellation Result',
          message: result.message,
        });
      }
    } catch (error) {
      console.error('❌ Failed to cancel video job:', error);
      setErrorModal({
        isOpen: true,
        title: 'Cancellation Failed',
        message: `Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setGeneratingVideoShotId(null);
      setCurrentVideoJobId(null);
      setProgress(0);
    }
  };

  const handleStopGeneration = () => {
    abortGenerationRef.current = true;
  };

  const handleGenerateAllShots = async () => {
    if (
      !window.confirm(
        'This will auto-generate images for all shots without images. It may take some time. Continue?'
      )
    )
      return;
    if (onRegisterUndo) onRegisterUndo();

    setIsGeneratingAll(true);
    abortGenerationRef.current = false; // Reset abort flag

    let currentSceneState = { ...editedScene };

    // Safety check for shotList
    if (!currentSceneState.shotList || currentSceneState.shotList.length === 0) {
      setErrorModal({
        isOpen: true,
        title: 'No Shots Available',
        message: 'No shots available to generate images for.',
      });
      setIsGeneratingAll(false);
      return;
    }

    // Process sequentially to maintain state integrity and avoid overwhelming API
    for (let i = 0; i < currentSceneState.shotList.length; i++) {
      if (abortGenerationRef.current) {
        break; // Stop loop if aborted
      }

      const shot = currentSceneState.shotList[i];
      const shotNumber = shot.shot;

      // Skip if image exists
      if (currentSceneState.storyboard?.some(s => isSameShotNumber(s.shot, shotNumber))) continue;

      setGeneratingShotId(i); // Update UI to show which shot is generating
      setProgress(0);
      try {
        const prompt = buildPrompt(shot, currentSceneState, false);

        // Get characters involved in this scene
        const sceneCharacterNames = currentSceneState.sceneDesign?.characters || [];
        const sceneCharacters: Character[] = allCharacters.filter((c: Character) =>
          sceneCharacterNames.includes(c.name)
        );

        // 🆕 CONSISTENCY: Generate stable seed from scene + shot number
        const sceneKey = `${currentSceneState.sceneNumber || 'scene'}-${shotNumber}`;
        const sceneSeed =
          Math.abs(sceneKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000000;

        // 🆕 CONTINUITY: Get previous shot's image for reference
        const previousShot = currentSceneState.shotList[i - 1];
        const previousShotNumber = previousShot?.shot;
        const previousShotImage = previousShotNumber
          ? currentSceneState.storyboard?.find(s => isSameShotNumber(s.shot, previousShotNumber))
              ?.image
          : undefined;

        console.log(
          `🎨 [Batch] Generating shot ${shotNumber} with seed: ${sceneSeed}, previous: ${previousShotNumber || 'none'}`
        );

        const base64Image = await generateStoryboardImage(
          prompt,
          sceneCharacters,
          p => setProgress(p),
          {
            seed: sceneSeed, // 🔧 STABLE SEED per scene
            previousShotImage: previousShotImage, // 🔧 CONTINUITY reference
            preferredModel: storyboardStyle.includes('ComfyUI') ? 'comfyui-sdxl' : undefined,
          }
        );

        // Update local accumulation object
        const oldItem =
          currentSceneState.storyboard?.find(s => isSameShotNumber(s.shot, shotNumber)) || {};
        const newItem = { ...oldItem, shot: shotNumber, image: base64Image };

        const newStoryboard = [...(currentSceneState.storyboard || []), newItem];
        currentSceneState = { ...currentSceneState, storyboard: newStoryboard };

        // Update React state visually
        setEditedScene(currentSceneState);

        // Immediate Save per shot (safety)
        if (!isEditing) onSave(currentSceneState);
      } catch (e) {
        console.error(`Failed to generate shot ${shotNumber}`, e);
        // Continue to next shot even if one fails
      }
    }

    setIsGeneratingAll(false);
    setGeneratingShotId(null);
    setProgress(0);
    if (abortGenerationRef.current) {
      setInfoModal({
        isOpen: true,
        title: 'Stopped',
        message: 'Auto-generation stopped by user.',
      });
    } else {
      setSuccessModal({
        isOpen: true,
        title: '✅ Complete!',
        message: 'Batch generation complete!',
      });
    }
  };

  const handleDeleteShotImage = (shotNumber: number) => {
    if (confirmDeleteShotId === shotNumber) {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const newStoryboard = (prev.storyboard || []).filter(
          s => !isSameShotNumber(s.shot, shotNumber)
        );
        if (!isEditing) onSave({ ...prev, storyboard: newStoryboard });
        return { ...prev, storyboard: newStoryboard };
      });
      setConfirmDeleteShotId(null);
    } else {
      setConfirmDeleteShotId(shotNumber);
      setTimeout(() => setConfirmDeleteShotId(null), 3000);
    }
  };

  // Delete Shot List Item
  const handleDeleteShotListItem = (index: number) => {
    if (confirmDeleteShotListId === index) {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const newShotList = [...prev.shotList];
        newShotList.splice(index, 1);
        const updated = { ...prev, shotList: newShotList };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmDeleteShotListId(null);
    } else {
      setConfirmDeleteShotListId(index);
      setTimeout(() => setConfirmDeleteShotListId(null), 3000);
    }
  };

  // Delete Prop List Item
  const handleDeletePropListItem = (index: number) => {
    if (confirmDeletePropId === index) {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const newPropList = [...prev.propList];
        newPropList.splice(index, 1);
        const updated = { ...prev, propList: newPropList };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmDeletePropId(null);
    } else {
      setConfirmDeletePropId(index);
      setTimeout(() => setConfirmDeletePropId(null), 3000);
    }
  };

  // Clear All functions
  const [confirmClearSection, setConfirmClearSection] = useState<string | null>(null);

  // Shot List AI actions
  const [isGeneratingShotList, setIsGeneratingShotList] = useState(false);
  const [regeneratingShotListIndex, setRegeneratingShotListIndex] = useState<number | null>(null);
  const [regeneratingPropListIndex, setRegeneratingPropListIndex] = useState<number | null>(null);
  const [isRegeneratingAllShots, setIsRegeneratingAllShots] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState(0);
  const [singleShotProgress, setSingleShotProgress] = useState(0);
  const [singlePropProgress, setSinglePropProgress] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isGeneratingLocationDetails, setIsGeneratingLocationDetails] = useState(false);
  // Regenerate Shot List Modal (for regenerating all shots)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [selectedRegenerateMode, setSelectedRegenerateMode] = useState<'fresh' | 'refine' | 'edited' | null>(null);
  // Regenerate Single Shot Modal
  const [regenerateSingleShotModal, setRegenerateSingleShotModal] = useState<{
    isOpen: boolean;
    shotIndex: number | null;
  }>({ isOpen: false, shotIndex: null });
  // Regenerate Prop List Modal (for regenerating all props)
  const [isRegeneratePropModalOpen, setIsRegeneratePropModalOpen] = useState(false);
  const [isRegeneratingAllProps, setIsRegeneratingAllProps] = useState(false);
  const [selectedPropRegenerateMode, setSelectedPropRegenerateMode] = useState<'fresh' | 'refine' | 'edited' | null>(null);
  // Regenerate Single Prop Modal
  const [regenerateSinglePropModal, setRegenerateSinglePropModal] = useState<{
    isOpen: boolean;
    propIndex: number | null;
  }>({ isOpen: false, propIndex: null });

  const handleClearAllShotList = () => {
    if (confirmClearSection === 'shotlist') {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const updated = { ...prev, shotList: [] as any[] };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmClearSection(null);
    } else {
      setConfirmClearSection('shotlist');
      setTimeout(() => setConfirmClearSection(null), 3000);
    }
  };

  const handleGenerateShotListAll = async () => {
    if (!isEditing) return;
    if (onRegisterUndo) onRegisterUndo();

    const hasExisting = (editedScene.shotList?.length || 0) > 0;
    if (hasExisting && !window.confirm('This will replace the current Shot List. Continue?')) {
      return;
    }

    setIsGeneratingShotList(true);
    try {
      const { generateShotListForScene } = await import('../services/geminiService');

      const previousScenes = (() => {
        const buckets =
          (scriptData as any)?.generatedScenes &&
          typeof (scriptData as any).generatedScenes === 'object'
            ? Object.values((scriptData as any).generatedScenes)
            : [];
        const all = buckets.flatMap((v: any) => (Array.isArray(v) ? v : []));
        return all
          .filter(
            (s: any) =>
              typeof s?.sceneNumber === 'number' && s.sceneNumber < editedScene.sceneNumber
          )
          .sort((a: any, b: any) => Number(b.sceneNumber) - Number(a.sceneNumber))
          .slice(0, 2);
      })();

      const newShotList = await generateShotListForScene(
        { sceneNumber: editedScene.sceneNumber, sceneDesign: editedScene.sceneDesign },
        {
          language: scriptData?.language,
          title: scriptData?.title,
          logline: (scriptData as any)?.logline,
        },
        editedScene.shotList,
        { previousScenes }
      );

      setEditedScene(prev => {
        const updated = { ...prev, shotList: newShotList as any };
        if (!isEditing) onSave(updated);
        return updated;
      });
      if (!isEditing) onSave({ ...editedScene, shotList: newShotList as any });
    } catch (e) {
      console.error('Failed to generate shot list:', e);
      setErrorModal({
        isOpen: true,
        title: 'Generation Failed',
        message: `Failed to generate Shot List: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setIsGeneratingShotList(false);
    }
  };

  // Regenerate all shots in Shot List (ทีละช็อต เพื่อรักษา continuity)
  const handleRegenerateAllShotList = async () => {
    if (!isEditing) return;
    if (!editedScene.shotList || editedScene.shotList.length === 0) {
      setErrorModal({
        isOpen: true,
        title: 'No Shot List',
        message: 'ไม่มี Shot List ให้รีเจน กรุณาสร้าง Shot List ก่อน',
      });
      return;
    }

    const confirmed = window.confirm(
      `คุณต้องการรีเจน Shot List ทั้งหมด (${editedScene.shotList.length} ช็อต) ใช่หรือไม่?\n\nระบบจะรีเจนทีละช็อตเพื่อรักษา Continuity (ชุด, พร็อพ, อารมณ์)`
    );
    if (!confirmed) return;

    if (onRegisterUndo) onRegisterUndo();
    setIsRegeneratingAllShots(true);

    try {
      const { regenerateShotListItem } = await import('../services/geminiService');
      const totalShots = editedScene.shotList.length;
      const newShotList = [...editedScene.shotList];

      // Get previous scenes for continuity context
      const previousScenes = (() => {
        const buckets =
          (scriptData as any)?.generatedScenes &&
          typeof (scriptData as any).generatedScenes === 'object'
            ? Object.values((scriptData as any).generatedScenes)
            : [];
        const all = buckets.flatMap((v: any) => (Array.isArray(v) ? v : []));
        return all
          .filter(
            (s: any) =>
              typeof s?.sceneNumber === 'number' && s.sceneNumber < editedScene.sceneNumber
          )
          .sort((a: any, b: any) => Number(b.sceneNumber) - Number(a.sceneNumber))
          .slice(0, 2);
      })();

      // Regenerate each shot sequentially (preserves continuity)
      for (let i = 0; i < totalShots; i++) {
        console.log(`🔄 Regenerating shot ${i + 1} of ${totalShots}...`);
        
        const current = newShotList[i];
        const shotNumber = typeof (current as any)?.shot === 'number' ? (current as any).shot : i + 1;
        const prev = i > 0 ? newShotList[i - 1] : undefined;
        const next = i < totalShots - 1 ? editedScene.shotList[i + 1] : undefined;

        try {
          const regenerated = await regenerateShotListItem(
            { sceneNumber: editedScene.sceneNumber, sceneDesign: editedScene.sceneDesign },
            shotNumber,
            { language: scriptData?.language },
            { previousShot: prev, currentShot: current, nextShot: next },
            { previousScenes }
          );

          // Update the shot in newShotList (preserving continuity for next iteration)
          newShotList[i] = { ...(newShotList[i] || {}), ...(regenerated as any), shot: shotNumber };

          // Update UI progressively
          setEditedScene(prevState => {
            const list = [...newShotList];
            return { ...prevState, shotList: list };
          });
        } catch (error) {
          console.error(`Failed to regenerate shot ${i + 1}:`, error);
          // Continue with next shot even if one fails
        }
      }

      // Final save
      if (!isEditing) {
        onSave({ ...editedScene, shotList: newShotList });
      }

      setSuccessModal({
        isOpen: true,
        title: '✅ รีเจนเสร็จสิ้น',
        message: `รีเจน Shot List เสร็จสิ้น: ${totalShots} ช็อต\n\nระบบรักษา Continuity ของชุด พร็อพ และอารมณ์ตัวละครไว้แล้ว`,
      });
    } catch (e) {
      console.error('Failed to regenerate all shots:', e);
      setErrorModal({
        isOpen: true,
        title: '❌ เกิดข้อผิดพลาด',
        message: `เกิดข้อผิดพลาดในการรีเจน Shot List: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setIsRegeneratingAllShots(false);
    }
  };

  const handleRegenerateShotListItem = async (index: number) => {
    // Open modal to let user choose regeneration mode
    setRegenerateSingleShotModal({ isOpen: true, shotIndex: index });
  };

  const handleRegenerateSingleShotWithMode = async (mode: 'fresh' | 'refine' | 'edited') => {
    const index = regenerateSingleShotModal.shotIndex;
    if (index === null) return;

    // Close modal
    setRegenerateSingleShotModal({ isOpen: false, shotIndex: null });

    if (onRegisterUndo) onRegisterUndo();

    const current = (editedScene.shotList || [])[index];
    const shotNumber =
      typeof (current as any)?.shot === 'number' ? (current as any).shot : index + 1;
    setRegeneratingShotListIndex(index);
    setSingleShotProgress(0);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setSingleShotProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 5;
      });
    }, 300);

    try {
      const { regenerateShotListItem } = await import('../services/geminiService');
      const prev = index > 0 ? (editedScene.shotList || [])[index - 1] : undefined;
      const next =
        index < (editedScene.shotList || []).length - 1
          ? (editedScene.shotList || [])[index + 1]
          : undefined;

      const previousScenes = (() => {
        const buckets =
          (scriptData as any)?.generatedScenes &&
          typeof (scriptData as any).generatedScenes === 'object'
            ? Object.values((scriptData as any).generatedScenes)
            : [];
        const all = buckets.flatMap((v: any) => (Array.isArray(v) ? v : []));
        return all
          .filter(
            (s: any) =>
              typeof s?.sceneNumber === 'number' && s.sceneNumber < editedScene.sceneNumber
          )
          .sort((a: any, b: any) => Number(b.sceneNumber) - Number(a.sceneNumber))
          .slice(0, 2);
      })();

      const regenerated = await regenerateShotListItem(
        { sceneNumber: editedScene.sceneNumber, sceneDesign: editedScene.sceneDesign },
        shotNumber,
        { language: scriptData?.language },
        { previousShot: prev, currentShot: current, nextShot: next },
        { previousScenes },
        mode // Pass the selected mode
      );

      clearInterval(progressInterval);
      setSingleShotProgress(95);

      setEditedScene(prevState => {
        const list = [...(prevState.shotList || [])];
        list[index] = { ...(list[index] || {}), ...(regenerated as any), shot: shotNumber };
        const updated = { ...prevState, shotList: list };
        // Auto-save if not in editing mode
        if (!isEditing) {
          onSave(updated);
        }
        return updated;
      });

      setSingleShotProgress(100);
      setTimeout(() => setSingleShotProgress(0), 500);
    } catch (e) {
      clearInterval(progressInterval);
      setSingleShotProgress(0);
      console.error('Failed to regenerate shot list row:', e);
      setErrorModal({
        isOpen: true,
        title: 'Regeneration Failed',
        message: `Failed to regenerate shot: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setRegeneratingShotListIndex(null);
    }
  };

  const handleRegeneratePropListItem = async (index: number) => {
    // Open modal to select regeneration mode
    setRegenerateSinglePropModal({ isOpen: true, propIndex: index });
  };

  // Handler for single prop regeneration with mode
  const handleRegenerateSinglePropWithMode = async (mode: 'fresh' | 'refine' | 'edited') => {
    const index = regenerateSinglePropModal.propIndex;
    if (index === null) return;

    // Close modal
    setRegenerateSinglePropModal({ isOpen: false, propIndex: null });

    if (onRegisterUndo) onRegisterUndo();

    const current = (editedScene.propList || [])[index];
    setRegeneratingPropListIndex(index);
    setSinglePropProgress(0);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setSinglePropProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 5;
      });
    }, 300);

    try {
      const { getAI, extractJsonFromResponse } = await import('../services/geminiService');
      const ai = getAI();

      const lang = typeof scriptData?.language === 'string' ? scriptData.language : 'Thai';
      const languageInstruction = lang === 'Thai'
        ? 'Output all text in THAI language (ภาษาไทยเท่านั้น)'
        : 'Output all text in English';

      // Build mode-specific instructions
      let modeInstructions = '';
      let currentPropContext = '';

      if (mode === 'fresh') {
        modeInstructions = `
🔄 FRESH START MODE:
- สร้าง Prop Art ใหม่ทั้งหมด ไม่อิงจาก Prop Art เดิม
- ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details, Shot List, Prop List)
- สร้างแนวทางใหม่ทั้งหมด
`;
      } else if (mode === 'refine') {
        currentPropContext = `\n\nCURRENT PROP (สำหรับอ้างอิง):\n- Prop Art: ${current.propArt}\n- Scene Set Details: ${current.sceneSetDetails}`;
        modeInstructions = `
✨ REFINE EXISTING MODE:
- ปรับปรุง Prop Art เดิก โดยรักษาโครงสร้างหลัก
- ใช้ Shot List, Scene Details, Prop List ปัจจุบันเป็นพื้นฐาน
- วิเคราะห์ เชื่อมโยง ต่อเนื่อง ปรับปรุง เพิ่มรายละเอียด
`;
      } else if (mode === 'edited') {
        currentPropContext = `\n\nEDITED PROP (ที่ผู้ใช้แก้ไข):\n- Prop Art: ${current.propArt}\n- Scene Set Details: ${current.sceneSetDetails}`;
        modeInstructions = `
📝 USE EDITED DATA MODE:
- สร้าง Prop Art ใหม่โดยรวมการแก้ไขของผู้ใช้เข้าไป
- นำการแก้ไข Shot List, Scene Details, Prop List ไปใช้
- รักษาข้อมูลที่แก้ไขแล้ว เติมส่วนที่ยังขาดให้สมบูรณ์
`;
      }

      // Get location details if available
      const locationDetails = (editedScene.sceneDesign as any)?.locationDetails;
      const locationContext = locationDetails
        ? `\n\nLOCATION DETAILS:\n- Environment: ${locationDetails.environment?.description || ''}\n- Set Dressing: ${locationDetails.production?.setDressing || ''}\n- Props Reference: ${locationDetails.production?.props || ''}`
        : '';

      const prompt = `You are a professional production designer and prop master.

Task: Regenerate improved prop item for Scene ${editedScene.sceneNumber}.

${languageInstruction}

${modeInstructions}

SCENE CONTEXT:
- Location: ${editedScene.sceneDesign.location}
- Scene: ${editedScene.sceneDesign.sceneName}
- Mood: ${editedScene.sceneDesign.moodTone}
- Situations: ${editedScene.sceneDesign.situations.map((s: any) => s.description).join('; ')}${locationContext}${currentPropContext}

OTHER PROPS IN SCENE:
${(editedScene.propList || []).filter((_, i) => i !== index).map(p => `- ${p.propArt}`).join('\n')}

Generate an IMPROVED version of this prop with:
1. More specific and detailed propArt name
2. Enhanced sceneSetDetails with better description
3. Consider the location environment and atmosphere
4. Ensure it fits naturally with other props in the scene

Return ONLY valid JSON (no markdown):
{
  "propArt": "Improved prop name in ${lang}",
  "sceneSetDetails": "Enhanced detailed set description in ${lang}"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = extractJsonFromResponse(response.text || '{}');
      const regenerated = JSON.parse(text);

      clearInterval(progressInterval);
      setSinglePropProgress(95);

      setEditedScene(prevState => {
        const list = [...(prevState.propList || [])];
        list[index] = {
          scene: current.scene || String(editedScene.sceneNumber),
          propArt: regenerated.propArt || current.propArt,
          sceneSetDetails: regenerated.sceneSetDetails || current.sceneSetDetails,
        };
        const updated = { ...prevState, propList: list };
        if (!isEditing) onSave(updated);
        return updated;
      });
      if (!isEditing) {
        const list = [...(editedScene.propList || [])];
        list[index] = {
          scene: current.scene || String(editedScene.sceneNumber),
          propArt: regenerated.propArt || current.propArt,
          sceneSetDetails: regenerated.sceneSetDetails || current.sceneSetDetails,
        };
        onSave({ ...editedScene, propList: list });
      }

      setSinglePropProgress(100);
      setTimeout(() => setSinglePropProgress(0), 500);
    } catch (e) {
      clearInterval(progressInterval);
      setSinglePropProgress(0);
      console.error('Failed to regenerate prop list item:', e);
      setErrorModal({
        isOpen: true,
        title: 'Regeneration Failed',
        message: `Failed to regenerate prop: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setRegeneratingPropListIndex(null);
    }
  };

  // Handler function for Regenerate All Props
  const handleRegenerateAllProps = async (mode: 'fresh' | 'refine' | 'edited') => {
    setIsRegeneratePropModalOpen(false);
    setSelectedPropRegenerateMode(mode);

    if (!editedScene.propList || editedScene.propList.length === 0) {
      setErrorModal({
        isOpen: true,
        title: 'No Prop List',
        message: 'ไม่มี Prop List ให้รีเจน กรุณาสร้าง Prop List ก่อน',
      });
      return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsRegeneratingAllProps(true);
    setRegenerationProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setRegenerationProgress(prev => {
          if (prev >= 40) return 40;
          return prev + Math.random() * 4;
        });
      }, 400);

      const { getAI, extractJsonFromResponse } = await import('../services/geminiService');
      const ai = getAI();

      const lang = typeof scriptData?.language === 'string' ? scriptData.language : 'Thai';
      const languageInstruction = lang === 'Thai'
        ? 'Output all text in THAI language (ภาษาไทยเท่านั้น)'
        : 'Output all text in English';

      const locationDetails = (editedScene.sceneDesign as any)?.locationDetails;
      const locationContext = locationDetails
        ? `\n\nLOCATION DETAILS:\n- Environment: ${locationDetails.environment?.description || ''}\n- Set Dressing: ${locationDetails.production?.setDressing || ''}\n- Props Reference: ${locationDetails.production?.props || ''}`
        : '';

      const existingProps = editedScene.propList.map((p: any) => `- ${p.propArt}: ${p.sceneSetDetails}`).join('\n');
      
      // Shot List context
      const shotListContext = (editedScene.shotList && editedScene.shotList.length > 0)
        ? `\n\nSHOT LIST (for reference):\n${editedScene.shotList.map((shot: any, i: number) => 
            `Shot ${i + 1}: ${shot.shotSize || 'N/A'} - ${shot.description?.substring(0, 100) || 'No description'}...`
          ).join('\n')}`
        : '';

      // Build mode-specific instructions
      let modeInstructions = '';
      let existingPropsContext = '';

      if (mode === 'fresh') {
        modeInstructions = `
🔄 FRESH START MODE:
- สร้าง Prop List ใหม่ทั้งหมด ไม่อิงจาก Prop List เดิม
- ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details, Shot List)
- ไม่นำข้อมูล Prop List เดิม มาพิจารณา
- สร้างรายการ props ที่จำเป็นและเหมาะสมกับฉากใหม่ทั้งหมด
`;
      } else if (mode === 'refine') {
        existingPropsContext = `\n\nCURRENT PROP LIST (สำหรับอ้างอิง):\n${existingProps}`;
        modeInstructions = `
✨ REFINE EXISTING MODE:
- ปรับปรุงคุณภาพ Prop List เดิม โดยรักษาโครงสร้างหลัก
- ใช้ Shot List, Scene Details ปัจจุบันเป็นพื้นฐาน
- วิเคราะห์ เชื่อมโยง ต่อเนื่อง ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์
- ปรับปรุงชื่อและรายละเอียดให้ชัดเจนและละเอียดมากขึ้น
- เพิ่ม props ที่จำเป็นแต่ยังขาด
- ลบ props ที่ซ้ำซ้อนหรือไม่จำเป็น
`;
      } else if (mode === 'edited') {
        existingPropsContext = `\n\nEDITED PROP LIST (ที่ผู้ใช้แก้ไข):\n${existingProps}`;
        modeInstructions = `
📝 USE EDITED DATA MODE:
- สร้าง Prop List ใหม่โดยรวมการแก้ไขของผู้ใช้เข้าไป
- นำการแก้ไข Shot List, Scene Details ข้อมูลปัจจุบัน ไปใช้
- สร้าง Prop List ใหม่ที่สอดคล้องคอนทินิวิตี้กับที่แก้ไข
- รักษาข้อมูลที่ผู้ใช้แก้ไขแล้ว และเติมส่วนที่ยังขาดให้สมบูรณ์
- ปรับ props อื่นๆ ให้เข้ากับที่ผู้ใช้แก้ไข
`;
      }

      const prompt = `You are a professional production designer and prop master.

Task: Regenerate the ENTIRE prop list for Scene ${editedScene.sceneNumber}.

${languageInstruction}

${modeInstructions}

SCENE CONTEXT:
- Scene: ${editedScene.sceneNumber} — ${editedScene.sceneDesign.sceneName}
- Location: ${editedScene.sceneDesign.location}
- Mood: ${editedScene.sceneDesign.moodTone}
- Situations: ${editedScene.sceneDesign.situations.map((s: any) => s.description).join('; ')}${locationContext}${shotListContext}${existingPropsContext}

Generate a comprehensive prop list with:
1. Specific and detailed prop names (ชื่อ prop ที่ชัดเจนและเฉพาะเจาะจง)
2. Detailed scene set descriptions (คำอธิบายฉากและการใช้งานอย่างละเอียด)
3. Consider the location environment and atmosphere
4. Ensure props fit naturally with Shot List and Scene mood
5. Include essential props for the scene to work

Return ONLY valid JSON array (no markdown):
[
  {
    "propArt": "Specific prop name in ${lang}",
    "sceneSetDetails": "Detailed description of prop usage and placement in ${lang}"
  }
]`;

      setRegenerationProgress(prev => Math.max(prev, 40));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      setRegenerationProgress(prev => Math.max(prev, 90));
      clearInterval(progressInterval);

      const text = extractJsonFromResponse(response.text || '[]');
      const regenerated = JSON.parse(text);

      if (!Array.isArray(regenerated) || regenerated.length === 0) {
        throw new Error('Invalid response from AI - no props generated');
      }

      const newPropList = regenerated.map((prop: any) => ({
        scene: String(editedScene.sceneNumber),
        propArt: prop.propArt || 'Unknown Prop',
        sceneSetDetails: prop.sceneSetDetails || 'No details',
      }));

      setEditedScene(prev => {
        const updated = { ...prev, propList: newPropList };
        if (!isEditing) onSave(updated);
        return updated;
      });

      if (!isEditing) {
        onSave({ ...editedScene, propList: newPropList });
      }

      setRegenerationProgress(100);
      setTimeout(() => {
        setRegenerationProgress(0);
        setIsRegeneratingAllProps(false);
      }, 500);

    } catch (e) {
      console.error('Failed to regenerate all props:', e);
      setErrorModal({
        isOpen: true,
        title: 'Regeneration Failed',
        message: `Failed to regenerate prop list: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
      setRegenerationProgress(0);
      setIsRegeneratingAllProps(false);
    }
  };

  // Handler functions for Regenerate Shot List Modal
  const handleRegenerateShotListWithMode = async (mode: 'fresh' | 'refine' | 'edited') => {
    setIsRegenerateModalOpen(false);
    setSelectedRegenerateMode(mode);

    if (!editedScene.shotList || editedScene.shotList.length === 0) {
      setErrorModal({
        isOpen: true,
        title: 'No Shot List',
        message: 'ไม่มี Shot List ให้รีเจน กรุณาสร้าง Shot List ก่อน',
      });
      return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsRegeneratingAllShots(true);
    setRegenerationProgress(0);

    try {
      // Simulate progress - smoother animation
      const progressInterval = setInterval(() => {
        setRegenerationProgress(prev => {
          if (prev >= 30) return 30;
          return prev + Math.random() * 3;
        });
      }, 300);

      // Import getAI function and create AI instance
      const { getAI, extractJsonFromResponse } = await import('../services/geminiService');
      const ai = getAI();

      const totalShots = editedScene.shotList.length;

      // Build prompt based on mode
      let modeContext = '';
      let existingShotListContext = '';

      if (mode === 'fresh') {
        modeContext = `
🔄 FRESH START MODE:
- สร้าง Shot List ใหม่ทั้งหมด
- ไม่อิงจาก Shot List เดิม
- ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details)
- สร้างมุมมอง แนวทาง และ composition ใหม่ทั้งหมด
`;
      } else if (mode === 'refine') {
        existingShotListContext = `
EXISTING SHOT LIST (สำหรับอ้างอิง):
${editedScene.shotList.map((shot: any, i: number) => `
Shot ${i + 1}:
- Shot Size: ${shot.shotSize || 'N/A'}
- Perspective: ${shot.perspective || 'N/A'}
- Movement: ${shot.movement || 'N/A'}
- Description: ${shot.description || 'N/A'}
`).join('\\n')}
`;
        modeContext = `
✨ REFINE EXISTING MODE:
- ปรับปรุงคุณภาพ Shot List เดิม
- รักษาโครงสร้างหลักและจำนวน shots เดิม
- วิเคราะห์และเพิ่มรายละเอียดที่เหมาะสม
- ปรับแต่งให้สมบูรณ์และมืออาชีพขึ้น
- คงจำนวน shots เท่าเดิม: ${totalShots} shots
`;
      } else if (mode === 'edited') {
        existingShotListContext = `
CURRENT SHOT LIST WITH EDITS (ข้อมูลปัจจุบันที่ผู้ใช้แก้ไข):
${editedScene.shotList.map((shot: any, i: number) => `
Shot ${i + 1}:
- Shot Size: ${shot.shotSize || 'N/A'}
- Perspective: ${shot.perspective || 'N/A'}
- Movement: ${shot.movement || 'N/A'}
- Equipment: ${shot.equipment || 'N/A'}
- Focal Length: ${shot.focalLength || 'N/A'}
- Lighting: ${shot.lighting || 'N/A'}
- Mood: ${shot.mood || 'N/A'}
- Description: ${shot.description || 'N/A'}
- Duration: ${shot.duration || 'N/A'}
- Notes: ${shot.notes || 'N/A'}
`).join('\\n')}
`;
        modeContext = `
📝 USE EDITED DATA MODE (แนะนำ):
- นำการแก้ไขของผู้ใช้ไปใช้
- สร้าง Shot List ใหม่ที่สอดคล้องกับข้อมูลที่แก้ไข
- รักษาองค์ประกอบสำคัญที่ผู้ใช้กำหนด
- ขยายความและเติมรายละเอียดให้สมบูรณ์
- AI จะเติมส่วนที่ยังไม่ครบและปรับให้เข้ากันได้
`;
      }

      const prompt = `คุณคือผู้เชี่ยวชาญด้านการถ่ายทำภาพยนตร์และการออกแบบช็อต (Professional Cinematographer & Shot Designer)

⚠️ สำคัญมาก: ข้อมูลที่คุณสร้างจะถูกใช้โดย AI ในการสร้างภาพและวีดีโอจริง ดังนั้นต้องละเอียด ชัดเจน และเป็นภาษาไทยทั้งหมด

งาน: สร้าง Shot List สำหรับฉากที่ ${editedScene.sceneNumber} โดยใช้แนวทาง ${mode === 'fresh' ? 'FRESH START (เริ่มใหม่ทั้งหมด)' : mode === 'refine' ? 'REFINE EXISTING (ปรับปรุงเดิม)' : 'EDITED DATA (ใช้ข้อมูลที่แก้ไข)'}

${modeContext}

ข้อมูลฉาก:
- เลขที่ฉาก: ${editedScene.sceneNumber}
- ชื่อฉาก: ${editedScene.sceneDesign.sceneName}
- สถานที่: ${editedScene.sceneDesign.location}
- อารมณ์/โทนสี: ${editedScene.sceneDesign.moodTone}
- ตัวละคร: ${editedScene.sceneDesign.characters.join(', ')}
- สถานการณ์/การกระทำ: ${editedScene.sceneDesign.situations.map((s: any) => s.description).join('; ')}
- จำนวน Shots ที่ต้องสร้าง: ${totalShots}
${(editedScene.sceneDesign as any)?.locationDetails ? `
- รายละเอียดสถานที่เพิ่มเติม: ${JSON.stringify((editedScene.sceneDesign as any).locationDetails).substring(0, 300)}...
` : ''}

บริบทเรื่องราวสำหรับความต่อเนื่อง:
- จุดประสงค์ของฉาก: เข้าใจว่าฉากนี้ทำหน้าที่อะไรในการเล่าเรื่อง
- การพัฒนาตัวละคร: ติดตามเส้นทางอารมณ์ตัวละครผ่านแต่ละ shot
- ธีมภาพ: รักษาภาษาภาพให้สอดคล้องกัน
- การไหลของ action: แต่ละ shot ต้องเชื่อมโยงอย่างมีเหตุผล
- การพัฒนาอารมณ์: สร้างหรือคลาย tension อย่างเป็นระบบ

${existingShotListContext}

${mode === 'fresh' ? `
สร้าง Shot List ใหม่ ${totalShots} shots โดยคำนึงถึง:
1. Shot Progression: เริ่มจาก Establishing → Coverage → Details → Cutaway
2. ความหลากหลายในขนาด shot (ECU, CU, MS, LS, EST) - ห้ามใช้ shot size เดิมซ้ำกันติดต่อกัน
3. มุมกล้องที่เหมาะสมกับอารมณ์ฉาก (High Angle = อ่อนแอ, Low Angle = พลัง)
4. การเคลื่อนกล้องที่สร้างพลวัต (Pan, Tilt, Dolly, Tracking) - ใช้อย่างมีจุดประสงค์
5. Continuity: 180-degree rule, eyeline match, screen direction
6. Match on Action: ตัด shot ในขณะที่มีการเคลื่อนไหว
7. Rhythm: สลับ shot สั้น-ยาว, นิ่ง-เคลื่อนไหว
8. ระบุอุปกรณ์และค่า focal length ที่เหมาะสม
9. เชื่อมโยง shots ด้วย action หรือ emotion ที่ต่อเนื่อง
10. ระบุใน notes ว่า shot นี้เชื่อมกับ shot ก่อน/หลังอย่างไร
` : mode === 'refine' ? `
ปรับปรุง Shot List โดยเน้น:
1. คงจำนวน shots เท่าเดิม (${totalShots} shots)
2. ปรับ Shot Progression ให้ลื่นไหลขึ้น
3. แก้ไข Continuity Issues (180-degree rule, eyeline, screen direction)
4. เพิ่ม Match Cuts และ Transitions ที่เหมาะสม
5. ปรับ Shot Rhythm ให้มี dynamics (mix static/moving, wide/close)
6. เติมรายละเอียด continuity ใน notes
7. แก้ shot size ที่ซ้ำกันติดต่อกัน
8. ปรับ camera movement ให้มีจุดประสงค์ชัด
9. อธิบายการเชื่อมต่อระหว่าง shots ใน description
10. เสนอแนะการใช้อุปกรณ์ที่เหมาะสมกว่า
` : `
สร้าง Shot List ใหม่โดยเน้น:
1. นำข้อมูลที่ผู้ใช้แก้ไขไปใช้เป็นหลัก
2. เติม Continuity Details ในส่วนที่ว่าง
3. ปรับ shots อื่นๆ ให้เข้ากับที่ผู้ใช้แก้ไข
4. เชื่อม Shot Progression ให้ลื่นไหล
5. เพิ่ม Match on Action และ Transitions
6. รักษา 180-degree rule และ Screen Direction
7. แก้ Shot Size ที่ซ้ำติดกัน
8. ขยายความใน description เกี่ยวกับการเชื่อมต่อ shots
9. เติม Continuity Notes อย่างละเอียด
10. ปรับ Shot Rhythm ให้มี flow
`}

🎯 ข้อกำหนดสำคัญ (CRITICAL REQUIREMENTS):
- สร้าง ${totalShots} shots พอดี (ไม่มากไม่น้อย)
- ทุกฟิลด์ต้องมีข้อมูลจริง เป็นภาษาไทย (ห้าม empty, ห้าม "N/A", ห้าม "TBD")
- แต่ละ shot ต้องมีรายละเอียดเฉพาะและแตกต่างกัน
- Description ต้องยาวอย่างน้อย 100 คำ พรรณนาอย่างละเอียดเพื่อให้ AI สร้างภาพได้
- ใช้ภาษาไทยทั้งหมด ยกเว้นชื่อเทคนิค (เช่น Shot Size, Focal Length)

📸 ข้อมูลสำหรับการสร้างภาพ/วีดีโอ (FOR IMAGE/VIDEO GENERATION):
⚠️ สำคัญที่สุด: ข้อมูลเหล่านี้จะถูกส่งไป AI เพื่อสร้างภาพและวีดีโอจริง ต้องละเอียดมากพอที่ AI จะสร้างได้

สำหรับแต่ละ shot ต้องระบุอย่างละเอียด:

1. **description (คำบรรยาย)**: 
   - ต้องยาวอย่างน้อย 100 คำ เป็นภาษาไทย
   - อธิบายทุกสิ่งที่มองเห็นในเฟรม: ตัวละคร, การกระทำ, อารมณ์ใบหน้า, ท่าทาง, การเคลื่อนไหว
   - บอกองค์ประกอบภาพ: foreground, middle ground, background
   - ระบุตำแหน่งกล้อง: สูงต่ำ, ใกล้ไกล, มุมมอง
   - บอกแสงและเงา: มาจากทิศไหน, สีอุ่นหรือเย็น, บรรยากาศอย่างไร
   - บอกสี: สีหลักในเฟรม, โทนสีโดยรวม
   - อธิบายอารมณ์: ผู้ชมควรรู้สึกอย่างไร
   - เชื่อมโยงกับ shot ก่อนหน้าและถัดไป

2. **cast (นักแสดง)**:
   - ระบุชื่อตัวละครทุกคนในเฟรม
   - บอกตำแหน่งและท่าทางของแต่ละคน
   - บอกอารมณ์และการแสดงออก

3. **costume (เครื่องแต่งกาย)**:
   - อธิบายเครื่องแต่งกายอย่างละเอียด: สี, ผ้า, สไตล์, อุปกรณ์เสริม
   - ต้องเหมาะกับตัวละครและสถานการณ์
   - ถ้ามีรายละเอียดเด่น (เช่น เนคไท สร้อย หมวก) ต้องบอก

4. **set (ฉาก/เซ็ต)**:
   - บรรยายสถานที่อย่างละเอียดมาก
   - ระบุสิ่งของ เฟอร์นิเจอร์ ตกแต่ง ทุกอย่างที่มองเห็น
   - บอกบรรยากาศ เช่น ยุคสมัย สะอาดหรือรกรุงรัง ใหม่หรือเก่า
   - ระบุพื้นผิว วัสดุ เช่น ไม้ คอนกรีต หญ้า น้ำ

5. **visualEffects (เอฟเฟกต์พิเศษ)**:
   - ถ้าต้องการ VFX ระบุชัดเจนว่าต้องการอะไร
   - ถ้าไม่ต้องการ ใช้ "ไม่มี" หรือ "ธรรมชาติ"

6. **lightingDesign (การออกแบบแสง)**:
   - อธิบายแสงอย่างละเอียด: key light, fill light, back light
   - บอกตำแหน่งแสง (ซ้าย/ขวา/หน้า/หลัง)
   - บอกความนุ่มหรือแข็งของแสง
   - บอกเงา: ชัดหรือนุ่ม, ตกที่ไหน

7. **colorTemperature (อุณหภูมิสี)**:
   - ระบุเป็น Kelvin: 2700K-3200K (อุ่น), 5000-5600K (กลางวัน), 6000-7000K (เย็น)
   - เหมาะกับบรรยากาศของฉาก

🎬 ความต่อเนื่อง (CONTINUITY & FLOW):
- รักษา visual continuity (180-degree rule, eyeline match)
- สร้าง transitions ที่ลื่นไหล (match on action, cut on movement)
- สร้าง shot progression: Establish (wide) → Detail (close) → Reaction
- หลากหลายขนาด shot: ห้ามใช้ shot size เดียวกันซ้ำติดกัน
- จังหวะ shot: สลับ static/dynamic, สั้น/ยาว
- แสงและอารมณ์ต่อเนื่องตลอดซีเควนซ์
- เชื่อมโยง shots ด้วย action หรือ emotion ที่ต่อเนื่อง

📋 รูปแบบ Shot Progression:
1. Establishing Shot (EST/VLS) - แสดงที่ตั้ง/บริบท
2. Master Shot (LS/MLS) - แสดงความสัมพันธ์ตัวละคร
3. Coverage (MS/CU) - shot รายละเอียด, ปฏิกิริยา
4. Close-ups (CU/ECU) - จังหวะอารมณ์, รายละเอียดสำคัญ
5. Transitions - เชื่อมไปฉากถัดไป

**CONTINUITY & FLOW REQUIREMENTS:**
- Maintain visual continuity between shots (180-degree rule, eyeline match)
- Create smooth transitions (match on action, cut on movement)
- Build shot progression: Establish (wide) → Detail (close) → Reaction
- Vary shot sizes for visual interest: Don't use same shot size consecutively
- Consider shot rhythm: Mix static/dynamic, short/long durations
- Ensure consistent lighting and mood throughout sequence
- Link shots with continuous action or emotional progression
- Use camera movement purposefully to guide viewer attention

**SHOT PROGRESSION PATTERN:**
1. Establishing Shot (EST/VLS) - Show location/context
2. Master Shot (LS/MLS) - Show character relationships
3. Coverage (MS/CU) - Detail shots, reactions, important elements
4. Close-ups (CU/ECU) - Emotional beats, details
5. Transitions - Link to next sequence smoothly

📤 รูปแบบ OUTPUT (ต้องตรงตามนี้เท่านั้น):
ส่งกลับเป็น JSON array เท่านั้น ตัวอย่าง:
[
  {
    "shot": 1,
    "scene": "${editedScene.sceneNumber}",
    "shotSize": "ECU|CU|MCU|MS|MLS|LS|VLS|EST (เลือก 1 อัน)",
    "perspective": "Eye-Level|High Angle|Low Angle|Dutch Angle|POV|OTS (เลือก 1 อัน)",
    "movement": "Static|Pan Left|Pan Right|Tilt Up|Tilt Down|Dolly In|Dolly Out|Tracking|Handheld|Zoom (เลือก 1 อัน)",
    "equipment": "Tripod|Handheld|Gimbal|Dolly|Crane|Drone|Steadicam (เลือก 1 อัน)",
    "focalLength": "16mm|24mm|35mm|50mm|85mm|135mm|200mm (เลือกที่เหมาะสม)",
    "aspectRatio": "16:9",
    "cast": "ชื่อตัวละครในช็อตนี้ พร้อมตำแหน่งและท่าทาง เช่น 'จอห์นยืนอยู่ทางซ้าย มือถือแก้วกาแฟ สีหน้าเครียด, แมรี่นั่งโซฟาทางขวา ใส่ชุดแดง กำลังอ่านหนังสือ'",
    "costume": "รายละเอียดเครื่องแต่งกายอย่างละเอียด เช่น 'จอห์นใส่สูทสีดำ เสื้อเชิ้ตขาว เนคไทสีแดงเข้ม รองเท้าหนังดำ, แมรี่ใส่ชุดเดรสแดงสด กระโปรงยาว สร้อยคอมุกขาว ส้นสูงสีนู้ด'",
    "set": "คำบรรยายฉากอย่างละเอียดมาก เช่น 'ห้องนั่งเล่นสมัยใหม่ ผนังสีขาวครีม พื้นไม้โอ๊คสว่าง มีโซฟาหนัง สีน้ำตาลเข้ม 3 ที่นั่งวางอยู่กลางห้อง โต๊ะกาแฟกระจกใสตรงกลาง วางหนังสือและแจกันดอกไม้สีขาว หน้าต่างบานใหญ่ด้านหลังส่องแสงเข้ามา ผ้าม่านสีครีมปล่อยลงครึ่งบาน ตู้หนังสือไม้สูงอยู่ฝาซ้าย โคมไฟตั้งพื้นมุมขวา ภาพวาดสีน้ำเงินแขวนผนัง บรรยากาศเรียบหรูและอบอุ่น'",
    "visualEffects": "ระบุความต้องการ VFX หรือใช้ 'ไม่มี' เช่น 'ไม่มี', 'ฉากหลัง green screen สำหรับ CGI', 'เอฟเฟกต์หิมะตก', 'ใช้ practical effects เท่านั้น'",
    "lighting": "Natural Light|Soft Light|Hard Light|3-Point|Rembrandt|Silhouette|Golden Hour (เลือกและอธิบายเพิ่ม)",
    "lightingDesign": "แผนการจัดแสงอย่างละเอียดมาก เช่น 'แสงหลัก (key light) มาจากหน้าต่างด้านซ้าย ทำมุม 45 องศา เป็นแสงธรรมชาติสีอุ่น สร้างเงาบนใบหน้าข้างขวา, แสงเติม (fill light) จากโคมไฟมุมขวาลดเงา 50%, แสงหลัง (back light) จากโคมไฟตั้งพื้นด้านหลังตัวละครสร้างแสงริมขอบแยกตัวออกจากฉากหลัง, แสงรอง (ambient) จากเพดานกระจายทั่วห้อง สร้างบรรยากาศอบอุ่น'",
    "colorTemperature": "ระบุค่า Kelvin เช่น '3200K' (อบอุ่น), '5600K' (กลางวัน), '6500K' (เย็น) - เลือกให้เหมาะกับบรรยากาศ",
    "mood": "อธิบายอารมณ์และความรู้สึกอย่างละเอียด เช่น 'บรรยากาศเงียบสงบแต่ตึงเครียด ความรู้สึกหนักใจ ความคาดหวังผสมความวิตกกังวล แสงนุ่มสร้างความอบอุ่นแต่ใบหน้าตัวละครแสดงความกังวล ผู้ชมรู้สึกถึงความตึงเครียดที่กำลังจะปะทุ'",
    "description": "คำบรรยายยาวอย่างน้อย 100 คำ อธิบายทุกรายละเอียดสำหรับการสร้างภาพ/วีดีโอ: องค์ประกอบภาพ, ตัวละคร, การกระทำ, อารมณ์ใบหน้า, ท่าทาง, การเคลื่อนไหว, foreground-background, แสงและเงา, สี, บรรยากาศ, ตำแหน่งกล้อง, มุมมอง, ความลึก, จุดสนใจ, อารมณ์ที่ต้องการสื่อ, และวิธีเชื่อมต่อกับ shot ก่อนหน้าและถัดไป - ต้องละเอียดพอที่ AI สร้างภาพได้ทันที",
    "duration": "2s|3s|5s|8s|10s|15s (ประมาณการตามความซับซ้อน)",
    "durationSec": 5,
    "notes": "บันทึกเทคนิค ข้อควรระวัง continuity ข้อมูล transition และวิธีเชื่อมต่อกับ shots ข้างเคียง เช่น 'Match on action: ตัดขณะจอห์นหยิบแก้วขึ้น เชื่อมกับ shot ถัดไปที่เห็นแก้วถึงปาก, 180-degree rule: รักษากล้องไว้ฝั่งขวาตลอด, Continuity: ตรวจสอบตำแหน่งหนังสือบนโต๊ะต้องเหมือนกัน'"
  }
]

✅ แต่ละฟิลด์ต้องมี (เป็นภาษาไทย):
- shot: ตัวเลขลำดับ (1, 2, 3...)
- scene: "${editedScene.sceneNumber}"
- shotSize: ขนาด shot จริง (ห้ามเป็นคำบรรยายทั่วไป)
- perspective: มุมกล้องจริง (ห้ามเป็นคำทั่วไป)
- movement: การเคลื่อนไหวเฉพาะ หรือ "Static"
- equipment: ชื่ออุปกรณ์เฉพาะ
- focalLength: ค่า focal length จริงพร้อมหน่วย (เช่น "50mm")
- aspectRatio: "16:9" (default)
- cast: ชื่อตัวละคร + ตำแหน่ง + ท่าทาง + อารมณ์ (ภาษาไทย ละเอียด)
- costume: คำบรรยายเครื่องแต่งกาย สี ผ้า สไตล์ อุปกรณ์ (ภาษาไทย ละเอียดมาก)
- set: คำบรรยายฉาก สถานที่ สิ่งของ บรรยากาศ วัสดุ (ภาษาไทย ละเอียดมากที่สุด)
- visualEffects: ความต้องการ VFX หรือ "ไม่มี" (ภาษาไทย)
- lighting: ประเภทแสงพร้อมคำอธิบาย (ภาษาไทย)
- lightingDesign: แผนจัดแสงละเอียด key/fill/back/ambient ตำแหน่ง ทิศทาง สี (ภาษาไทย ยาวมาก)
- colorTemperature: ค่า Kelvin เช่น "3200K" หรือ "5600K"
- mood: อธิบายอารมณ์และความรู้สึก (ภาษาไทย อย่างน้อย 30 คำ)
- description: คำบรรยายยาว อย่างน้อย 100 คำ ละเอียดทุกรายละเอียด พร้อมวิธีเชื่อมต่อ shots (ภาษาไทย)
- duration: เวลาประมาณการพร้อมหน่วย (เช่น "5s")
- durationSec: ค่าตัวเลขวินาที (เช่น 5)
- notes: บันทึกเทคนิค continuity transitions (ภาษาไทย อย่างน้อย 50 คำ)

🎬 สร้าง ${totalShots} shots ที่มีความต่อเนื่องสูงทันที:`;

      clearInterval(progressInterval);
      setRegenerationProgress(40);

      // Continue smooth progress during API call (40% → 98%)
      const apiProgressInterval = setInterval(() => {
        setRegenerationProgress(prev => {
          if (prev >= 98) return 98;
          return prev + Math.random() * 4;
        });
      }, 400);

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' },
      });

      clearInterval(apiProgressInterval);
      setRegenerationProgress(prev => Math.max(prev, 90));
      await new Promise(resolve => setTimeout(resolve, 100));

      setRegenerationProgress(prev => Math.max(prev, 94));

      const regenerated = JSON.parse(extractJsonFromResponse(response.text || '[]'));

      setRegenerationProgress(prev => Math.max(prev, 97));

      if (!Array.isArray(regenerated) || regenerated.length === 0) {
        throw new Error('AI ส่งกลับข้อมูล Shot List ไม่ถูกต้อง');
      }

      // Validate that all required fields are present and not empty
      const requiredFields = [
        'shot', 'scene', 'shotSize', 'perspective', 'movement', 'equipment', 
        'focalLength', 'aspectRatio', 'cast', 'costume', 'set', 'visualEffects',
        'lighting', 'lightingDesign', 'colorTemperature', 'mood', 
        'description', 'duration', 'durationSec', 'notes'
      ];
      let incompleteShots: number[] = [];
      
      regenerated.forEach((shot: any, index: number) => {
        const missingFields = requiredFields.filter(field => !shot[field] || String(shot[field]).trim() === '' || shot[field] === 'N/A');
        if (missingFields.length > 0) {
          incompleteShots.push(index + 1);
          console.warn(`Shot ${index + 1} missing fields:`, missingFields);
          
          // Auto-fill missing fields with defaults
          if (!shot.aspectRatio || shot.aspectRatio === 'N/A') shot.aspectRatio = '16:9';
          if (!shot.equipment || shot.equipment === 'N/A') shot.equipment = 'Tripod';
          if (!shot.duration || shot.duration === 'N/A') shot.duration = '5s';
          if (!shot.durationSec || shot.durationSec === 'N/A') {
            // Parse duration to get seconds
            const match = shot.duration?.match(/(\d+)s/);
            shot.durationSec = match ? parseInt(match[1]) : 5;
          }
          if (!shot.cast || shot.cast === 'N/A') shot.cast = editedScene.sceneDesign.characters.join(', ') || 'Background';
          if (!shot.costume || shot.costume === 'N/A') shot.costume = 'Standard';
          if (!shot.set || shot.set === 'N/A') shot.set = editedScene.sceneDesign.location || 'Generic location';
          if (!shot.visualEffects || shot.visualEffects === 'N/A') shot.visualEffects = 'None';
          if (!shot.lightingDesign || shot.lightingDesign === 'N/A') shot.lightingDesign = shot.lighting || 'Natural light';
          if (!shot.colorTemperature || shot.colorTemperature === 'N/A') shot.colorTemperature = '5600K';
        }
        
        // Ensure description is detailed enough
        if (shot.description && shot.description.length < 30) {
          console.warn(`Shot ${index + 1} has short description:`, shot.description);
        }
      });

      // Check for continuity issues
      let continuityWarnings: string[] = [];
      for (let i = 0; i < regenerated.length - 1; i++) {
        const current = regenerated[i];
        const next = regenerated[i + 1];
        
        // Check for consecutive same shot sizes (bad rhythm)
        if (current.shotSize === next.shotSize && i > 0) {
          continuityWarnings.push(`Shots ${i + 1}-${i + 2}: Same shot size (${current.shotSize}) - may lack visual variety`);
        }
        
        // Check if notes mention continuity
        if (next.notes && !next.notes.toLowerCase().includes('transition') && 
            !next.notes.toLowerCase().includes('cut') && 
            !next.notes.toLowerCase().includes('continues') &&
            !next.notes.toLowerCase().includes('follows')) {
          // Notes don't mention how shot connects - informational only
        }
      }

      if (continuityWarnings.length > 0) {
        console.warn('⚠️ Continuity Suggestions:', continuityWarnings);
      }

      if (incompleteShots.length > 0) {
        console.warn(`⚠️ Warning: ${incompleteShots.length} shots have incomplete data (auto-filled):`, incompleteShots);
      }

      // Update Shot List
      setEditedScene(prevState => {
        const updated = { ...prevState, shotList: regenerated };
        if (!isEditing) onSave(updated);
        return updated;
      });

      // Log success to console instead of alert
      console.log(`✅ สำเร็จ: สร้าง Shot List ใหม่ ${regenerated.length} shots แล้ว`);
      console.log(`โหมด: ${
        mode === 'fresh' ? '🔄 เริ่มใหม่ทั้งหมด' :
        mode === 'refine' ? '✨ ปรับปรุง Shot List เดิม' :
        '📝 ใช้ข้อมูลที่แก้ไข'
      }`);
      
      // Show inline success message instead of alert
      setRegenerationProgress(100);
    } catch (e) {
      console.error('Failed to regenerate Shot List with mode:', e);
      setErrorModal({
        isOpen: true,
        title: '❌ เกิดข้อผิดพลาด',
        message: `${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setIsRegeneratingAllShots(false);
      setSelectedRegenerateMode(null);
      setRegenerationProgress(0);
    }
  };

  const handleClearAllStoryboard = () => {
    if (confirmClearSection === 'storyboard') {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const updated = { ...prev, storyboard: [] as any[] };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmClearSection(null);
    } else {
      setConfirmClearSection('storyboard');
      setTimeout(() => setConfirmClearSection(null), 3000);
    }
  };

  const handleClearAllPropList = () => {
    if (confirmClearSection === 'proplist') {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const updated = { ...prev, propList: [] as any[] };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmClearSection(null);
    } else {
      setConfirmClearSection('proplist');
      setTimeout(() => setConfirmClearSection(null), 3000);
    }
  };

  // Delete Breakdown Item
  const handleDeleteBreakdownItem = (part: 'part1' | 'part2' | 'part3', index: number) => {
    if (
      confirmDeleteBreakdownId &&
      confirmDeleteBreakdownId.part === part &&
      confirmDeleteBreakdownId.index === index
    ) {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const newBreakdown = { ...prev.breakdown };
        const partArray = [...newBreakdown[part]];
        partArray.splice(index, 1);
        newBreakdown[part] = partArray;
        const updated = { ...prev, breakdown: newBreakdown };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmDeleteBreakdownId(null);
    } else {
      setConfirmDeleteBreakdownId({ part, index });
      setTimeout(() => setConfirmDeleteBreakdownId(null), 3000);
    }
  };

  // Clear All Breakdown
  const handleClearAllBreakdown = () => {
    if (confirmClearSection === 'breakdown') {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const updated = {
          ...prev,
          breakdown: {
            part1: [] as any[],
            part2: [] as any[],
            part3: [] as any[],
          },
        };
        if (!isEditing) onSave(updated);
        return updated;
      });
      setConfirmClearSection(null);
    } else {
      setConfirmClearSection('breakdown');
      setTimeout(() => setConfirmClearSection(null), 3000);
    }
  };

  // Get parsed location for display view
  const displayLocation = parseLocationParts(
    editedScene.sceneDesign.location || 'INT. UNKNOWN - DAY'
  );

  // --- Renderers ---

  const renderEditableTable = (
    headers: string[],
    data: any[],
    section: 'shotList' | 'propList' | 'breakdown',
    subSection?: 'part1' | 'part2' | 'part3'
  ) => (
    <div className="relative">
      {/* Custom Horizontal Scrollbar - Top Position with Beautiful Design */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-cyan-500/30 shadow-lg">
        <div 
          className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-gray-800 hover:scrollbar-thumb-cyan-400"
          style={{ 
            direction: 'ltr',
            scrollbarWidth: 'thin',
            scrollbarColor: '#06b6d4 #1f2937'
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            const tableWrapper = target.parentElement?.nextElementSibling?.firstChild as HTMLElement;
            if (tableWrapper) {
              tableWrapper.scrollLeft = target.scrollLeft;
            }
          }}
        >
          <div style={{ width: `${Math.max(headers.length * 150 + 100, 1200)}px`, height: '12px' }}></div>
        </div>
        <div className="absolute top-1 right-2 text-xs font-medium text-cyan-400 bg-gray-900/90 px-2 py-0.5 rounded-full border border-cyan-500/30">
          ← Scroll →
        </div>
      </div>
      
      {/* Table Container with Vertical Scroll Only (Horizontal controlled by top bar) */}
      <div 
        className="overflow-y-auto max-h-[70vh] rounded-lg border border-gray-700 shadow-2xl relative"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#06b6d4 #1f2937',
          overflowX: 'hidden'
        }}
      >
        <div 
          className="overflow-x-auto"
          style={{ 
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            const topScrollbar = target.parentElement?.parentElement?.firstChild?.firstChild as HTMLElement;
            if (topScrollbar) {
              topScrollbar.scrollLeft = target.scrollLeft;
            }
          }}
        >
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs text-gray-300 uppercase bg-gradient-to-r from-gray-700/70 via-gray-700/50 to-gray-700/70 backdrop-blur sticky top-0 z-[5]">
          <tr>
            {/* Actions column at LEFT - Regen button always visible, Delete only in Edit Mode */}
            {section === 'shotList' && (
              <th scope="col" className="px-4 py-3 min-w-[100px] whitespace-nowrap text-center bg-gray-800/50">
                Actions
              </th>
            )}
            {/* Actions column for Prop List - Regen always visible, Delete only in Edit Mode */}
            {section === 'propList' && (
              <th scope="col" className="px-4 py-3 min-w-[100px] whitespace-nowrap text-center">
                Actions
              </th>
            )}
            {/* Actions column for Breakdown - only in Edit Mode */}
            {section === 'breakdown' && isEditing && (
              <th scope="col" className="px-4 py-3 min-w-[100px] whitespace-nowrap text-center">
                Actions
              </th>
            )}
            {headers.map(h => (
              <th key={h} scope="col" className="px-4 py-3 min-w-[150px] whitespace-nowrap">
                {h.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-t border-gray-700 hover:bg-gray-800/50 even:bg-gray-800/30"
            >
              {/* Actions buttons at LEFT for Shot List - Regen always visible, Delete only in Edit Mode */}
              {section === 'shotList' && (
                <td className="px-2 py-2 text-center bg-gray-800/30">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center justify-center gap-2">
                      {/* Regen button - always visible */}
                      <button
                        type="button"
                        onClick={() => handleRegenerateShotListItem(i)}
                        disabled={regeneratingShotListIndex === i}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          regeneratingShotListIndex === i
                            ? 'bg-gray-700 text-gray-300 opacity-70 cursor-not-allowed'
                            : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg'
                        }`}
                        title="Regenerate this shot with continuity"
                      >
                        {regeneratingShotListIndex === i ? '⟳ Regenerating…' : '⟳ Regen'}
                      </button>
                      {/* Delete button - only in Edit Mode */}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleDeleteShotListItem(i)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                            confirmDeleteShotListId === i
                              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                              : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                          }`}
                          title={confirmDeleteShotListId === i ? 'Click again to confirm' : 'Delete shot'}
                        >
                          {confirmDeleteShotListId === i ? (
                            '✓ Confirm?'
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    {/* Progress Bar - Show when regenerating */}
                    {regeneratingShotListIndex === i && singleShotProgress > 0 && (
                      <div className="w-full max-w-[140px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-cyan-400 font-semibold">Regenerating...</span>
                          <span className="text-[10px] font-bold text-cyan-400">
                            {Math.round(singleShotProgress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${singleShotProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              )}
              {/* Actions buttons at LEFT for Prop List - Regen always visible, Delete only in Edit Mode */}
              {section === 'propList' && (
                <td className="px-2 py-2 text-center bg-gray-800/30">
                  <div className="flex items-center justify-center gap-2">
                    {/* Regen button - always visible */}
                    <button
                      type="button"
                      onClick={() => handleRegeneratePropListItem(i)}
                      disabled={regeneratingPropListIndex === i}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        regeneratingPropListIndex === i
                          ? 'bg-gray-700 text-gray-300 opacity-70 cursor-not-allowed'
                          : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg'
                      }`}
                      title="Regenerate this prop with better details"
                    >
                      {regeneratingPropListIndex === i ? '⟳ Regenerating…' : '⟳ Regen'}
                    </button>
                    {/* Delete button - only in Edit Mode */}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDeletePropListItem(i)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          confirmDeletePropId === i
                            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                            : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                        }`}
                        title={confirmDeletePropId === i ? 'Click again to confirm' : 'Delete prop'}
                      >
                        {confirmDeletePropId === i ? (
                          '✓ Confirm?'
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  {/* Progress Bar for Prop Regeneration */}
                  {regeneratingPropListIndex === i && singlePropProgress > 0 && (
                    <div className="w-full max-w-[140px] mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-cyan-400 font-semibold">Regenerating...</span>
                        <span className="text-[10px] font-bold text-cyan-400">
                          {Math.round(singlePropProgress)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${singlePropProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </td>
              )}
              {headers.map(h => {
                // Specific Logic for Shot List Columns
                if (section === 'shotList' && h === 'cast') {
                  // CAST DROPDOWN
                  const availableCast = editedScene.sceneDesign.characters || [];
                  return (
                    <td key={`${i}-${h}`} className="px-2 py-2 min-w-[120px]">
                      {isEditing ? (
                        <select
                          value={safeRender((row as any)[h])}
                          onChange={e => updateTableItem(section, i, h, e.target.value)}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="">Select Cast...</option>
                          {availableCast.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Link to Profile Logic
                        <div className="flex items-center gap-1">
                          <span>{safeRender((row as any)[h]) || '-'}</span>
                          {(row as any)[h] && (
                            <button
                              onClick={() =>
                                onNavigateToCharacter &&
                                onNavigateToCharacter((row as any)[h], 5, {
                                  pointTitle,
                                  sceneIndex,
                                })
                              } // Jump to Character Step from Step 5 with context
                              className="text-cyan-500 hover:text-cyan-300"
                              title="Go to Profile"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                }

                const isDropdown = section === 'shotList' && SHOT_OPTIONS[h];
                return (
                  <td key={`${i}-${h}`} className="px-2 py-2 min-w-[120px]">
                    {isEditing ? (
                      isDropdown ? (
                        <select
                          value={safeRender((row as any)[h])}
                          onChange={e =>
                            updateTableItem(section, i, h as string, e.target.value, subSection)
                          }
                          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          {(isDropdown as string[]).map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          value={safeRender((row as any)[h])}
                          onChange={e =>
                            updateTableItem(section, i, h as string, e.target.value, subSection)
                          }
                          rows={2}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1"
                        />
                      )
                    ) : (
                      <span className="px-2 block">{safeRender((row as any)[h]) || '-'}</span>
                    )}
                  </td>
                );
              })}
              {/* Actions buttons for Breakdown - only in Edit Mode */}
              {section === 'breakdown' && isEditing && (
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (subSection) {
                          handleDeleteBreakdownItem(subSection, i);
                        }
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        section === 'breakdown' &&
                        confirmDeleteBreakdownId?.part === subSection &&
                        confirmDeleteBreakdownId?.index === i
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                      }`}
                      title={
                        section === 'breakdown' &&
                        confirmDeleteBreakdownId?.part === subSection &&
                        confirmDeleteBreakdownId?.index === i
                          ? 'Click again to confirm'
                          : 'Delete item'
                      }
                    >
                      {section === 'breakdown' &&
                      confirmDeleteBreakdownId?.part === subSection &&
                      confirmDeleteBreakdownId?.index === i ? (
                        '✓ Confirm?'
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );

  // List of characters available in the project but NOT yet in the scene
  const availableCharactersToAdd = allCharacters.filter(
    c => !editedScene.sceneDesign.characters.includes(c.name)
  );

  // Handle saving location details
  const handleSaveLocationDetails = (updatedDetails: any) => {
    if (onRegisterUndo) onRegisterUndo();
    setEditedScene(prev => ({
      ...prev,
      sceneDesign: {
        ...prev.sceneDesign,
        locationDetails: updatedDetails,
      },
    }));
    if (!isEditing) {
      onSave({
        ...editedScene,
        sceneDesign: {
          ...editedScene.sceneDesign,
          locationDetails: updatedDetails,
        },
      });
    }
  };

  // Handle regenerating location details section
  const handleRegenerateLocationSection = async (section: string) => {
    // TODO: Implement regeneration for specific section
    console.log('Regenerating section:', section);
    // This would call generateLocationDetails with specific section parameter
  };

  return (
    <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600 fade-in-scene relative">
      {/* Location Details Modal */}
      <LocationDetailsModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        locationDetails={editedScene?.sceneDesign?.locationDetails}
        locationString={editedScene?.sceneDesign?.location || 'INT. UNKNOWN - DAY'}
        onSave={handleSaveLocationDetails}
        onRegenerate={handleRegenerateLocationSection}
        onRegenerateAll={() => setIsRegenerateLocationModalOpen(true)}
        isRegeneratingAll={isRegeneratingAllLocation}
        regenerationProgress={locationRegenerationProgress}
        locationImageAlbum={locationImageAlbum}
        selectedLocationImageId={selectedLocationImageId}
        onGenerateLocationImage={handleGenerateLocationImage}
        isGeneratingImage={isGeneratingLocationImage}
        onSelectLocationImage={onSelectLocationImage}
        onDeleteLocationImage={onDeleteLocationImage}
      />

      {/* Regenerate Location Details Modal */}
      {isRegenerateLocationModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Regenerate Location Details
              </h2>
              <p className="text-cyan-100 text-sm mt-1">เลือกวิธีการสร้าง Location Details</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Option 1: Fresh Start */}
              <button
                type="button"
                onClick={() => handleRegenerateAllLocationDetails('fresh')}
                disabled={isRegeneratingAllLocation}
                className="w-full text-left bg-gradient-to-br from-blue-900/50 to-blue-800/30 hover:from-blue-800/60 hover:to-blue-700/40 border-2 border-blue-500/30 hover:border-blue-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      เริ่มใหม่ทั้งหมด <span className="text-sm text-gray-400">(Fresh Start)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Location Details ใหม่ทั้งหมด ไม่อิงจาก Location Details เดิม
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details)</li>
                      <li>• ไม่นำข้อมูล Location Details เดิม มาพิจารณา</li>
                      <li className="text-cyan-300 font-medium">• เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 2: Refine Existing */}
              <button
                type="button"
                onClick={() => handleRegenerateAllLocationDetails('refine')}
                disabled={isRegeneratingAllLocation}
                className="w-full text-left bg-gradient-to-br from-purple-900/50 to-purple-800/30 hover:from-purple-800/60 hover:to-purple-700/40 border-2 border-purple-500/30 hover:border-purple-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✨</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ปรับปรุง Location Details เดิม <span className="text-sm text-gray-400">(Refine Existing)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      ปรับปรุงคุณภาพ Location Details เดิม โดยรักษาโครงสร้างหลัก
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้ Scene Details ปัจจุบันเป็นพื้นฐาน</li>
                      <li>• วิเคราะห์ เชื่อมโยง ต่อเนื่อง ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์</li>
                      <li className="text-purple-300 font-medium">• เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 3: Use Edited Data (Recommended) */}
              <button
                type="button"
                onClick={() => handleRegenerateAllLocationDetails('edited')}
                disabled={isRegeneratingAllLocation}
                className="w-full text-left bg-gradient-to-br from-green-900/50 to-green-800/30 hover:from-green-800/60 hover:to-green-700/40 border-2 border-green-500/40 hover:border-green-400/60 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  แนะนำ
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📝</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ใช้ข้อมูลที่แก้ไข <span className="text-sm text-gray-400">(Use Edited Data)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Location Details ใหม่โดยรวมการแก้ไขของคุณเข้าไป
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• นำการแก้ไข, Scene Details, Location Details ข้อมูลปัจจุบัน ไปใช้</li>
                      <li>• สร้าง Location Details ใหม่ที่สอดคล้องคอนทินิวลกับที่แก้ไข</li>
                      <li className="text-green-300 font-medium">• เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Usage Tips */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-4 mt-4">
                <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                  <span>💡</span> คำแนะนำการใช้งาน:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• ถ้าไม่พอใจ Location Details เลย → <span className="text-cyan-300 font-medium">Fresh Start</span></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <span className="text-purple-300 font-medium">Refine Existing</span></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <span className="text-green-300 font-medium">Use Edited Data</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRegenerateLocationModalOpen(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Regenerate Shot List Modal */}
      {isRegenerateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Regenerate Shot List
              </h2>
              <p className="text-cyan-100 text-sm mt-1">เลือกวิธีการสร้าง Shot List</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Option 1: Fresh Start */}
              <button
                type="button"
                onClick={() => handleRegenerateShotListWithMode('fresh')}
                disabled={isRegeneratingAllShots}
                className="w-full text-left bg-gradient-to-br from-blue-900/50 to-blue-800/30 hover:from-blue-800/60 hover:to-blue-700/40 border-2 border-blue-500/30 hover:border-blue-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      เริ่มใหม่ทั้งหมด <span className="text-sm text-gray-400">(Fresh Start)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Shot List ใหม่ทั้งหมด ไม่อิงจาก Shot List เดิม
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details)</li>
                      <li>• ไม่นำข้อมูล Shot List เดิม มาพิจารณา</li>
                      <li className="text-cyan-300 font-medium">• เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 2: Refine Existing */}
              <button
                type="button"
                onClick={() => handleRegenerateShotListWithMode('refine')}
                disabled={isRegeneratingAllShots}
                className="w-full text-left bg-gradient-to-br from-purple-900/50 to-purple-800/30 hover:from-purple-800/60 hover:to-purple-700/40 border-2 border-purple-500/30 hover:border-purple-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✨</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ปรับปรุง Shot List เดิม <span className="text-sm text-gray-400">(Refine Existing)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      ปรับปรุงคุณภาพ Shot List เดิม โดยรักษาโครงสร้างหลัก
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้ Shot List, Scene Details ปัจจุบันเป็นพื้นฐาน</li>
                      <li>• วิเคราะห์ ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์</li>
                      <li className="text-purple-300 font-medium">• เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 3: Use Edited Data (Recommended) */}
              <button
                type="button"
                onClick={() => handleRegenerateShotListWithMode('edited')}
                disabled={isRegeneratingAllShots}
                className="w-full text-left bg-gradient-to-br from-green-900/50 to-green-800/30 hover:from-green-800/60 hover:to-green-700/40 border-2 border-green-500/40 hover:border-green-400/60 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  แนะนำ
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📝</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ใช้ข้อมูลที่แก้ไข <span className="text-sm text-gray-400">(Use Edited Data)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Shot List ใหม่โดยรวมการแก้ไขของคุณเข้าไป
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• นำการแก้ไข Shot List, Scene Details ข้อมูลปัจจุบัน ไปใช้</li>
                      <li>• สร้าง Shot List ใหม่ที่สอดคล้องกับที่แก้ไข</li>
                      <li className="text-green-300 font-medium">• เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Usage Tips */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <span>💡</span> คำแนะนำการใช้งาน:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• ถ้าไม่พอใจ Shot List เลย → <span className="text-blue-300">Fresh Start</span></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <span className="text-purple-300">Refine Existing</span></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <span className="text-green-300">Use Edited Data</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setIsRegenerateModalOpen(false)}
                disabled={isRegeneratingAllShots}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Regenerate Single Shot Modal */}
      {regenerateSingleShotModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                สร้าง Shot ใหม่
              </h2>
              <p className="text-cyan-100 text-sm mt-1">
                เลือกวิธีการสร้าง Shot #{regenerateSingleShotModal.shotIndex !== null ? regenerateSingleShotModal.shotIndex + 1 : '?'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Option 1: Fresh Start */}
              <button
                type="button"
                onClick={() => handleRegenerateSingleShotWithMode('fresh')}
                disabled={regeneratingShotListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-blue-900/50 to-blue-800/30 hover:from-blue-800/60 hover:to-blue-700/40 border-2 border-blue-500/30 hover:border-blue-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      เริ่มใหม่ทั้งหมด <span className="text-sm text-gray-400">(Fresh Start)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Shot ใหม่ทั้งหมด ไม่อิงจาก Shot เดิม
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details, Shot List)</li>
                      <li>• ไม่นำข้อมูล Shot เดิม มาพิจารณา</li>
                      <li className="text-cyan-300 font-medium">• เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 2: Refine Existing */}
              <button
                type="button"
                onClick={() => handleRegenerateSingleShotWithMode('refine')}
                disabled={regeneratingShotListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-purple-900/50 to-purple-800/30 hover:from-purple-800/60 hover:to-purple-700/40 border-2 border-purple-500/30 hover:border-purple-400/50 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✨</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ปรับปรุง Shot เดิม <span className="text-sm text-gray-400">(Refine Existing)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      ปรับปรุงคุณภาพ Shot เดิม โดยรักษาโครงสร้างหลัก
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้ Shot List, Scene Details ปัจจุบันเป็นพื้นฐาน</li>
                      <li>• วิเคราะห์ เชื่อมโยง ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์</li>
                      <li className="text-purple-300 font-medium">• เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 3: Use Edited Data */}
              <button
                type="button"
                onClick={() => handleRegenerateSingleShotWithMode('edited')}
                disabled={regeneratingShotListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-green-900/50 to-green-800/30 hover:from-green-800/60 hover:to-green-700/40 border-2 border-green-500/40 hover:border-green-400/60 rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  แนะนำ
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📝</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      ใช้ข้อมูลที่แก้ไข <span className="text-sm text-gray-400">(Use Edited Data)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Shot ใหม่โดยรวมการแก้ไขของคุณเข้าไป
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• นำการแก้ไข Shot List, Scene Details ข้อมูลปัจจุบัน ไปใช้</li>
                      <li>• สร้าง Shot ใหม่ที่สอดคล้องกับที่แก้ไข</li>
                      <li className="text-green-300 font-medium">• เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Usage Tips */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <span>💡</span> คำแนะนำการใช้งาน:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• ถ้าไม่พอใจ Shot เลย → <span className="text-blue-300">Fresh Start</span></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <span className="text-purple-300">Refine Existing</span></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <span className="text-green-300">Use Edited Data</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setRegenerateSingleShotModal({ isOpen: false, shotIndex: null })}
                disabled={regeneratingShotListIndex !== null}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Regenerate Prop List Modal */}
      {isRegeneratePropModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Regenerate Prop List
              </h2>
              <p className="text-cyan-100 text-sm mt-1">เลือกวิธีการสร้าง Prop List</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Option 1: Fresh Start */}
              <button
                type="button"
                onClick={() => handleRegenerateAllProps('fresh')}
                disabled={isRegeneratingAllProps}
                className="w-full text-left bg-gradient-to-br from-blue-900/40 to-blue-800/40 hover:from-blue-800/60 hover:to-blue-700/60 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      เริ่มใหม่ทั้งหมด <span className="text-sm text-gray-400">(Fresh Start)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Prop List ใหม่ทั้งหมด ไม่อิงจาก Prop List เดิม
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details, Shot List)</li>
                      <li>• ไม่นำข้อมูล Prop List เดิม มาพิจารณา</li>
                      <li className="text-blue-300 font-medium">• เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 2: Refine Existing */}
              <button
                type="button"
                onClick={() => handleRegenerateAllProps('refine')}
                disabled={isRegeneratingAllProps}
                className="w-full text-left bg-gradient-to-br from-purple-900/40 to-purple-800/40 hover:from-purple-800/60 hover:to-purple-700/60 border-2 border-purple-500/50 hover:border-purple-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✨</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      ปรับปรุง Prop List เดิม <span className="text-sm text-gray-400">(Refine Existing)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      ปรับปรุงคุณภาพ Prop List เดิม โดยรักษาโครงสร้างหลัก
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้ Shot List, Scene Details ปัจจุบันเป็นพื้นฐาน</li>
                      <li>• วิเคราะห์ เชื่อมโยง ต่อเนื่อง ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์</li>
                      <li className="text-purple-300 font-medium">• เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 3: Use Edited Data (Recommended) */}
              <button
                type="button"
                onClick={() => handleRegenerateAllProps('edited')}
                disabled={isRegeneratingAllProps}
                className="w-full text-left bg-gradient-to-br from-green-900/40 to-green-800/40 hover:from-green-800/60 hover:to-green-700/60 border-2 border-green-500/50 hover:border-green-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  แนะนำ
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📝</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      ใช้ข้อมูลที่แก้ไข <span className="text-sm text-gray-400">(Use Edited Data)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Prop List ใหม่โดยรวมการแก้ไขของคุณเข้าไป
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• นำการแก้ไข Shot List, Scene Details ข้อมูลปัจจุบัน ไปใช้</li>
                      <li>• สร้าง Prop List ใหม่ที่สอดคล้องคอนทินิวิตี้กับที่แก้ไข</li>
                      <li className="text-green-300 font-medium">• เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Usage Tips */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <span>💡</span> คำแนะนำการใช้งาน:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• ถ้าไม่พอใจ Prop List เลย → <span className="text-blue-300">Fresh Start</span></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <span className="text-purple-300">Refine Existing</span></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <span className="text-green-300">Use Edited Data</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setIsRegeneratePropModalOpen(false)}
                disabled={isRegeneratingAllProps}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Regenerate Single Prop Modal */}
      {regenerateSinglePropModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Regenerate Prop Art
              </h2>
              <p className="text-cyan-100 text-sm mt-1">เลือกวิธีการสร้าง Prop Art</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Option 1: Fresh Start */}
              <button
                type="button"
                onClick={() => handleRegenerateSinglePropWithMode('fresh')}
                disabled={regeneratingPropListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-blue-900/40 to-blue-800/40 hover:from-blue-800/60 hover:to-blue-700/60 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      เริ่มใหม่ทั้งหมด <span className="text-sm text-gray-400">(Fresh Start)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Prop Art ใหม่ทั้งหมด ไม่อิงจาก Prop Art เดิม
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้เฉพาะข้อมูลพื้นฐาน (Scene Details, Shot List, Prop List)</li>
                      <li>• ไม่นำข้อมูล Prop Art เดิม มาพิจารณา</li>
                      <li className="text-blue-300 font-medium">• เหมาะสำหรับ: ต้องการแนวทางใหม่ทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 2: Refine Existing */}
              <button
                type="button"
                onClick={() => handleRegenerateSinglePropWithMode('refine')}
                disabled={regeneratingPropListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-purple-900/40 to-purple-800/40 hover:from-purple-800/60 hover:to-purple-700/60 border-2 border-purple-500/50 hover:border-purple-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✨</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      ปรับปรุง Prop Art เดิม <span className="text-sm text-gray-400">(Refine Existing)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      ปรับปรุงคุณภาพ Prop Art เดิม โดยรักษาโครงสร้างหลัก
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• ใช้ Shot List, Scene Details, Prop List ปัจจุบันเป็นพื้นฐาน</li>
                      <li>• วิเคราะห์ เชื่อมโยง ต่อเนื่อง ปรับปรุง เพิ่มรายละเอียดที่เหมาะสมครบถ้วนสมบูรณ์</li>
                      <li className="text-purple-300 font-medium">• เหมาะสำหรับ: ชอบแนวทางแต่ต้องการคุณภาพดีขึ้น</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Option 3: Use Edited Data (Recommended) */}
              <button
                type="button"
                onClick={() => handleRegenerateSinglePropWithMode('edited')}
                disabled={regeneratingPropListIndex !== null}
                className="w-full text-left bg-gradient-to-br from-green-900/40 to-green-800/40 hover:from-green-800/60 hover:to-green-700/60 border-2 border-green-500/50 hover:border-green-400 rounded-xl p-5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  แนะนำ
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📝</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      ใช้ข้อมูลที่แก้ไข <span className="text-sm text-gray-400">(Use Edited Data)</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      สร้าง Prop Art ใหม่โดยรวมการแก้ไขของคุณเข้าไป
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• นำการแก้ไข Shot List, Scene Details, Prop List ข้อมูลปัจจุบัน ไปใช้</li>
                      <li>• สร้าง Prop Art ใหม่ที่สอดคล้องคอนทินิวิตี้กับที่แก้ไข</li>
                      <li className="text-green-300 font-medium">• เหมาะสำหรับ: แก้ไขแล้ว ต้องการ AI สร้างส่วนอื่นให้เข้ากัน</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Usage Tips */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <span>💡</span> คำแนะนำการใช้งาน:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• ถ้าไม่พอใจ Prop Art เลย → <span className="text-blue-300">Fresh Start</span></li>
                  <li>• ถ้าชอบแนวทางแต่ต้องการดีขึ้น → <span className="text-purple-300">Refine Existing</span></li>
                  <li>• ถ้าแก้ไขแล้วต้องการให้ AI ขยายความ → <span className="text-green-300">Use Edited Data</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setRegenerateSinglePropModal({ isOpen: false, propIndex: null })}
                disabled={regeneratingPropListIndex !== null}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-tabs Navigation (Level 2 - Inside Scene) */}
      <div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'design' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Scene Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shotlist')}
            className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'shotlist' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Shot List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proplist')}
            className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'proplist' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Prop List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storyboard')}
            className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'storyboard' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Storyboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'breakdown' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Breakdown
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors shadow-lg"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600/70 hover:bg-gray-600/80 text-white text-[9px] font-semibold py-0.5 px-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Regenerate All button - Only show when Shot List has data and in Shot List tab */}
              {activeTab === 'shotlist' && (editedScene.shotList?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRegenerateModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-1 shadow-lg"
                  title="Regenerate entire Shot List with different approaches"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  รีเจนทั้งหมด
                </button>
              )}
              {/* Regenerate All button - Only show when Prop List has data and in Prop List tab */}
              {activeTab === 'proplist' && (editedScene.propList?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRegeneratePropModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-1 shadow-lg"
                  title="Regenerate entire Prop List"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  รีเจนทั้งหมด
                </button>
              )}
              {/* Auto-Generate All button - Only show when Storyboard has shots and in Storyboard tab */}
              {activeTab === 'storyboard' && (editedScene.shotList?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateAllShots}
                  disabled={isGeneratingAll}
                  className="bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto-generate images for all shots without images"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isGeneratingAll ? 'กำลังสร้าง...' : 'สร้างภาพทั้งหมด'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-1 shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="prose prose-invert prose-sm max-w-none">
        {activeTab === 'design' && (
          <div className="space-y-4">
            {/* Modified Layout: Flex container for Header section */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Left Side: Scene Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-bold">
                    Scene Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedScene.sceneDesign.sceneName}
                      onChange={e => updateDesignField('sceneName', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500"
                    />
                  ) : (
                    <p className="font-bold text-white text-xl tracking-wide">
                      {editedScene.sceneDesign.sceneName}
                    </p>
                  )}
                </div>

                {/* REFACTORED CHARACTER SECTION - COMPACT LIST VIEW */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-wide">
                      Characters
                    </label>
                    {isEditing && (
                      <div className="relative">
                        <select
                          value=""
                          onChange={e => handleAddCharacterToScene(e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          disabled={availableCharactersToAdd.length === 0}
                        >
                          <option value="">Add...</option>
                          {availableCharactersToAdd.map(c => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={availableCharactersToAdd.length === 0}
                          className="text-[10px] bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 border border-cyan-800 rounded px-2 py-1 font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          + Add Character
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-900/40 rounded border border-gray-700 divide-y divide-gray-800">
                    {editedScene.sceneDesign.characters.length === 0 && (
                      <div className="p-3 text-center text-gray-500 text-xs italic">
                        No characters in scene.
                      </div>
                    )}
                    {editedScene.sceneDesign.characters.map(charName => {
                      // Flexible character matching - support both short and full names
                      const profile = allCharacters.find(c => 
                        c.name === charName || 
                        c.name.startsWith(charName) || 
                        charName.includes(c.name.split('(')[0].trim())
                      );
                      
                      // Debug logging
                      console.log('🔍 [Character Avatar Debug]', {
                        charName,
                        hasProfile: !!profile,
                        profileName: profile?.name,
                        hasImage: !!profile?.image,
                        imageUrl: profile?.image?.substring(0, 100),
                        allCharactersCount: allCharacters.length,
                        allCharacterNames: allCharacters.map(c => c.name),
                      });
                      
                      const outfits = profile?.outfitCollection || [];
                      const currentOutfitId = editedScene.characterOutfits?.[charName] || '';
                      const currentOutfitDesc =
                        outfits.find(o => o.id === currentOutfitId)?.description || 'Default Look';

                      return (
                        <div
                          key={charName}
                          className="flex items-center justify-between p-2 hover:bg-gray-800/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                              {profile?.image ? (
                                <img
                                  src={profile.image}
                                  alt={charName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.warn('🖼️ Failed to load character image:', {
                                      character: charName,
                                      imageUrl: profile.image?.substring(0, 100) + '...',
                                    });
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) {
                                      (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <span 
                                className="text-[10px] font-bold text-gray-500"
                                style={{ display: profile?.image ? 'none' : 'flex' }}
                              >
                                {charName.substring(0, 2).toUpperCase()}
                              </span>
                            </div>

                            {/* Name & Wardrobe */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                                  onClick={() =>
                                    onNavigateToCharacter &&
                                    onNavigateToCharacter(charName, 5, { pointTitle, sceneIndex })
                                  }
                                  title="Go to Profile"
                                >
                                  {charName}
                                </span>
                              </div>
                              {isEditing ? (
                                <select
                                  value={currentOutfitId}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => handleWardrobeChange(charName, e.target.value)}
                                  className="mt-0.5 w-full max-w-[200px] bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-[10px] text-gray-300 outline-none"
                                >
                                  <option value="">Default Look</option>
                                  {outfits.map((o, idx) => (
                                    <option key={o.id || idx} value={o.id}>
                                      {o.id ? `Outfit ${o.id}` : `Outfit ${idx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className="text-[10px] text-gray-500 block truncate"
                                  title={currentOutfitDesc}
                                >
                                  {currentOutfitId
                                    ? `Wearing: ${currentOutfitId}`
                                    : 'Default Wardrobe'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Remove Button */}
                          {isEditing && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleRemoveCharacterFromScene(charName);
                              }}
                              className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20"
                              title="Remove from Scene"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side: Context Column (Location + Mood) */}
              <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 animate-fade-in-scene">
                {/* Progress Bar for Location Details Regeneration */}
                {isRegeneratingAllLocation && (
                  <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        📍 กำลังสร้าง Location Details...
                      </span>
                      <span className="text-sm font-bold text-purple-400">
                        {Math.round(locationRegenerationProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-full transition-all duration-300"
                        style={{ width: `${locationRegenerationProgress}%` }}
                      >
                        {locationRegenerationProgress > 10 && (
                          <span className="text-[10px] font-bold text-white flex items-center justify-center h-full">
                            {Math.round(locationRegenerationProgress)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      โปรดรอสักครู่ ระบบกำลังสร้างรายละเอียดสถานที่
                    </p>
                  </div>
                )}

                {/* 1. Scene Header (Location Box) - Clickable */}
                <div 
                  className="bg-black/40 border border-cyan-900/50 rounded-lg overflow-hidden flex flex-col cursor-pointer hover:bg-black/50 transition-colors"
                  onClick={() => setIsLocationModalOpen(true)}
                  title="Click to view Location Details"
                >
                  <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                      Scene Header
                    </h4>
                    {/* Location Details Indicator */}
                    <div className="flex items-center gap-2">
                      {editedScene?.sceneDesign?.locationDetails && (
                        <span className="text-green-400 text-xs">✓ Details</span>
                      )}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-cyan-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div 
                    className="p-4 flex-1 flex flex-col justify-center"
                    onClick={(e) => {
                      if (isEditing) {
                        e.stopPropagation(); // Don't open modal when editing
                      }
                    }}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                            Int / Ext
                          </label>
                          <select
                            value={locPrefix}
                            onChange={e => setLocPrefix(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                          >
                            <option value="INT.">INT. (Indoor)</option>
                            <option value="EXT.">EXT. (Outdoor)</option>
                            <option value="INT./EXT.">INT./EXT.</option>
                            <option value="I/E.">I/E.</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={locName}
                            onChange={e => setLocName(e.target.value)}
                            placeholder="Location Name"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                            Time
                          </label>
                          <select
                            value={locTime}
                            onChange={e => setLocTime(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                          >
                            <option value="DAY">DAY</option>
                            <option value="NIGHT">NIGHT</option>
                            <option value="DAWN">DAWN</option>
                            <option value="DUSK">DUSK</option>
                            <option value="CONTINUOUS">CONTINUOUS</option>
                            <option value="LATER">LATER</option>
                            <option value="MORNING">MORNING</option>
                            <option value="EVENING">EVENING</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* View Mode: Single Row, 3 Columns */
                      <div className="flex items-center gap-1 text-center h-full">
                        <div className="flex-1 bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                          <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">
                            INT/EXT
                          </span>
                          <span className="font-mono text-xs font-bold text-white leading-tight">
                            {displayLocation.prefix}
                          </span>
                        </div>
                        <div className="flex-[2] bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex items-center gap-2">
                          {/* Location Image Thumbnail */}
                          {locationImageAlbum.length > 0 && selectedLocationImageId && (() => {
                            const selectedImage = locationImageAlbum.find(img => img.id === selectedLocationImageId);
                            return selectedImage ? (
                              <div className="relative w-16 h-12 flex-shrink-0 rounded overflow-hidden border border-indigo-500/50">
                                <img
                                  src={selectedImage.url}
                                  alt="Location"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : null;
                          })()}
                          {/* Location Text */}
                          <div className="flex-1 flex flex-col justify-center">
                            <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">
                              LOCATION
                            </span>
                            <span className="font-mono text-xs font-bold text-white break-words leading-tight">
                              {displayLocation.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                          <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">
                            TIME
                          </span>
                          <span className="font-mono text-xs font-bold text-white leading-tight">
                            {displayLocation.time}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Mood & Tone Box (Moved Here) */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col justify-center min-h-[80px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                    Mood & Tone
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedScene.sceneDesign.moodTone}
                      onChange={e => updateDesignField('moodTone', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 resize-none text-center"
                      rows={2}
                      placeholder="e.g. Tense, Dark, Humorous"
                    />
                  ) : (
                    <p className="text-gray-300 text-sm text-center italic">
                      {editedScene.sceneDesign.moodTone || 'Not specified'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="my-6 border-b border-gray-700"></div>

            {editedScene.sceneDesign.situations.map((sit, i) => (
              <div
                key={i}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 mb-4 shadow-sm hover:border-gray-500 transition-colors"
              >
                {/* Situation Header with Delete Button (Dedicated Row) */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 bg-gray-900/30 -mx-4 -mt-4 p-4 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-900/50 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-800">
                      {i + 1}
                    </div>
                    <label className="text-sm text-cyan-400 font-bold uppercase tracking-wider">
                      Situation
                    </label>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={e => handleRemoveSituation(i, e)}
                      className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs transition-all font-bold group ${
                        confirmDeleteSituationId === i
                          ? 'bg-red-600 text-white border-red-500 hover:bg-red-700'
                          : 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/60 hover:text-red-200'
                      }`}
                      title="Delete this situation"
                    >
                      {confirmDeleteSituationId === i ? (
                        <span>Click to Confirm Delete</span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={sit.description}
                      onChange={e => updateSituation(i, 'description', e.target.value)}
                      rows={3}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500"
                      placeholder="Describe what happens..."
                    />
                  ) : (
                    <p className="text-gray-200">{sit.description}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">
                    Character Thoughts
                  </label>
                  {isEditing ? (
                    <textarea
                      value={typeof sit.characterThoughts === 'string' ? sit.characterThoughts : ''}
                      onChange={e => updateSituation(i, 'characterThoughts', e.target.value)}
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500"
                      placeholder="Internal monologue..."
                    />
                  ) : (
                    <p className="italic text-gray-400 pl-2 border-l-2 border-gray-600">
                      {typeof sit.characterThoughts === 'string'
                        ? sit.characterThoughts
                        : Array.isArray(sit.characterThoughts)
                          ? (sit.characterThoughts as any[]).join(' ')
                          : sit.characterThoughts
                            ? JSON.stringify(sit.characterThoughts)
                            : ''}
                    </p>
                  )}
                </div>

                <div className="bg-gray-900/50 p-3 rounded-md">
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold text-center">
                    Dialogue
                  </label>
                  <div className="space-y-3">
                    {/* Updated Dialogue Loop using Array for Stable Keys and Reordering */}
                    {sit.dialogue.map((line, dIndex) => {
                      const isDropTarget =
                        dropIndicator?.sitIndex === i && dropIndicator?.dlgIndex === dIndex;
                      const isTop = isDropTarget && dropIndicator?.position === 'top';
                      const isBottom = isDropTarget && dropIndicator?.position === 'bottom';

                      return (
                        <div
                          key={line.id}
                          draggable={isEditing}
                          onDragStart={e => handleDragStart(e, i, dIndex)}
                          onDragOver={e => handleDragOver(e, i, dIndex)}
                          onDrop={e => handleDrop(e, i)}
                          className={`transition-all ${isEditing ? 'flex flex-col sm:flex-row gap-2 items-start p-2 rounded border border-transparent hover:bg-gray-800/50 cursor-move' : 'mb-2'} 
                                                    ${isTop ? 'border-t-2 border-t-cyan-500' : ''} 
                                                    ${isBottom ? 'border-b-2 border-b-cyan-500' : ''}
                                                `}
                        >
                          {isEditing ? (
                            <>
                              {/* Drag Handle */}
                              <div className="hidden sm:flex self-center text-gray-600 cursor-move hover:text-gray-400 px-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                                </svg>
                              </div>

                              <div className="sm:w-1/4 w-full">
                                <input
                                  type="text"
                                  value={line.character}
                                  onChange={e =>
                                    updateDialogue(i, line.id, 'character', e.target.value)
                                  }
                                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-cyan-400 font-bold text-sm text-center"
                                  placeholder="Speaker"
                                />
                              </div>
                              <div className="flex-1 w-full flex gap-2">
                                <textarea
                                  value={line.dialogue}
                                  onChange={e =>
                                    updateDialogue(i, line.id, 'dialogue', e.target.value)
                                  }
                                  rows={1}
                                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm resize-none"
                                  placeholder="Dialogue line"
                                />
                                {/* Apply Dialect Button */}
                                {(() => {
                                  const character = scriptData.characters.find(
                                    c => c.name === line.character
                                  );
                                  const hasSpeechPattern =
                                    character?.speechPattern &&
                                    (character.speechPattern.dialect !== 'standard' ||
                                      character.speechPattern.accent !== 'none');

                                  return hasSpeechPattern ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!character) return;
                                        try {
                                          const { convertDialogueToDialect } =
                                            await import('../services/geminiService');
                                          const converted = await convertDialogueToDialect(
                                            line.dialogue,
                                            character,
                                            scriptData
                                          );
                                          updateDialogue(i, line.id, 'dialogue', converted);
                                        } catch (error) {
                                          console.error('Failed to convert dialect:', error);
                                          setErrorModal({
                                            isOpen: true,
                                            title: 'Translation Failed',
                                            message: 'ไม่สามารถแปลงภาษาได้ กรุณาลองใหม่',
                                          });
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700 hover:border-cyan-500 rounded text-cyan-300 hover:text-white transition-all shrink-0 text-xs"
                                      title={`Apply ${character.speechPattern?.dialect} dialect`}
                                    >
                                      🔄
                                      <span className="hidden sm:inline">Dialect</span>
                                    </button>
                                  ) : null;
                                })()}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDialogue(i, line.id)}
                                  className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-red-900/30 border border-gray-600 hover:border-red-500 rounded text-gray-400 hover:text-red-400 transition-all shrink-0"
                                  title="Remove line"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-4">
                              <span className="text-cyan-400 font-bold min-w-[80px] text-right text-sm">
                                {line.character}
                              </span>
                              <span className="text-gray-300 text-sm">{line.dialogue}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleAddDialogue(i)}
                        className="w-full py-2 border-2 border-dashed border-gray-700 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 rounded text-xs font-bold transition-all mt-2"
                      >
                        + Add Dialogue Line
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditing && (
              <button
                type="button"
                onClick={handleAddSituation}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-cyan-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add New Situation
              </button>
            )}
          </div>
        )}
        {/* Fixed: Use standardized headers for Shot List to ensure all columns appear */}
        {activeTab === 'shotlist' && (
          <div className="space-y-4">
            {/* Progress Bar for Regeneration */}
            {isRegeneratingAllShots && (
              <div className="mb-8 bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    🎬 กำลังสร้าง Shot List ใหม่...
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {Math.round(regenerationProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${regenerationProgress}%` }}
                  >
                    {regenerationProgress > 10 && (
                      <span className="text-[10px] font-bold text-white drop-shadow-lg">
                        {Math.round(regenerationProgress)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  โปรดรอสักครู่ ระบบกำลังสร้าง Shot List ที่ละเอียดสำหรับการสร้างภาพและวีดีโอ
                </p>
              </div>
            )}
            
            {isEditing && (editedScene.shotList?.length || 0) > 0 && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleGenerateShotListAll}
                  disabled={isGeneratingShotList}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    isGeneratingShotList
                      ? 'bg-gray-700 text-gray-300 opacity-70'
                      : 'bg-gray-700 hover:bg-cyan-600 text-gray-300 hover:text-white'
                  }`}
                  title="Generate a complete Shot List for this scene"
                >
                  {isGeneratingShotList ? 'Generating…' : 'Generate Shot List'}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateAllShotList}
                  disabled={isRegeneratingAllShots || (editedScene.shotList?.length || 0) === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    isRegeneratingAllShots
                      ? 'bg-gray-700 text-gray-300 opacity-70 cursor-not-allowed'
                      : (editedScene.shotList?.length || 0) === 0
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Regenerate all shots with Continuity (costume, props, emotions)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isRegeneratingAllShots ? `Regenerating... (${editedScene.shotList?.length || 0} shots)` : 'Regenerate All Shots'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllShotList}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    confirmClearSection === 'shotlist'
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                  }`}
                  title={
                    confirmClearSection === 'shotlist'
                      ? 'Click again to confirm delete all'
                      : 'Clear all shots from list'
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {confirmClearSection === 'shotlist' ? 'Confirm Clear All?' : 'Clear All Shots'}
                </button>
              </div>
            )}
            {isEditing && (editedScene.shotList?.length || 0) === 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateShotListAll}
                  disabled={isGeneratingShotList}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    isGeneratingShotList
                      ? 'bg-gray-700 text-gray-300 opacity-70'
                      : 'bg-gray-700 hover:bg-cyan-600 text-gray-300 hover:text-white'
                  }`}
                  title="Generate a complete Shot List for this scene"
                >
                  {isGeneratingShotList ? 'Generating…' : 'Generate Shot List'}
                </button>
              </div>
            )}
            {(editedScene.shotList?.length || 0) > 0 || isEditing ? (
              renderEditableTable(SHOT_LIST_HEADERS, editedScene.shotList || [], 'shotList')
            ) : (
              <p className="text-gray-500 italic">
                No shot list available. Click Edit to start adding shots.
              </p>
            )}
          </div>
        )}

        {/* New Storyboard Tab */}
        {activeTab === 'storyboard' && (
          <div className="flex flex-col gap-6">
            {/* Progress Bar for Auto-Generate All */}
            {isGeneratingAll && (
              <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    🎨 กำลังสร้างภาพสตอรีบอร์ด...
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {generatingShotId !== null ? `Shot ${generatingShotId + 1} / ${editedScene.shotList?.length || 0}` : 'กำลังเตรียมการ...'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${progress}%` }}
                  >
                    {progress > 10 && (
                      <span className="text-[10px] font-bold text-white drop-shadow-lg">
                        {Math.round(progress)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  โปรดรอสักครู่ ระบบกำลังสร้างภาพสตอรีบอร์ดสำหรับทุก Shot
                </p>
              </div>
            )}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full sm:w-auto flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    SCENE VISUAL STYLE
                  </label>
                  <select
                    value={storyboardStyle}
                    onChange={e => setStoryboardStyle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    {CHARACTER_IMAGE_STYLES.map(style => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">IMAGE MODEL</label>
                  <select
                    value={storyboardModel}
                    onChange={e => setStoryboardModel(e.target.value)}
                    onFocus={() => void loadComfyBackendStatus()}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="auto">🤖 AUTO - Smart selection (with fallback)</option>
                    <optgroup label="🎁 FREE MODELS">
                      <option value="gemini-flash">⚡ Gemini 2.0 Flash (Fast, free quota)</option>
                      <option
                        value="comfyui-sdxl"
                        disabled={comfyBackendStatus ? !comfyBackendStatus.running : false}
                      >
                        🎨 ComfyUI + SDXL (Local)
                      </option>
                    </optgroup>
                    <optgroup label="💵 PAID MODELS">
                      <option value="gemini-pro">🌟 Gemini 2.5 Flash Image (Paid)</option>
                    </optgroup>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">VIDEO MODEL</label>
                  <select
                    value={preferredVideoModel}
                    onChange={e => setPreferredVideoModel(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="auto">🤖 AUTO - Smart Selection</option>
                    <optgroup label="🎁 FREE MODELS">
                      {Object.values(VIDEO_MODELS_CONFIG.FREE).map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} (
                          {model.costPerGen === 0 ? 'Free' : `${model.costPerGen} credits`})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="💵 BASIC MODELS">
                      {Object.values(VIDEO_MODELS_CONFIG.BASIC || {}).map(model => {
                        const hasAccess = hasAccessToModel(model.id, 'video');
                        return (
                          <option key={model.id} value={model.id} disabled={!hasAccess}>
                            {hasAccess ? '' : '🔒 '}
                            {model.name} ({model.costPerGen || 0} credits)
                            {!hasAccess && ' - Upgrade Required'}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="🚀 PRO MODELS">
                      {Object.values(VIDEO_MODELS_CONFIG.PRO || {}).map(model => {
                        const hasAccess = hasAccessToModel(model.id, 'video');
                        return (
                          <option key={model.id} value={model.id} disabled={!hasAccess}>
                            {hasAccess ? '' : '🔒 '}
                            {model.name} ({model.costPerGen || 0} credits)
                            {!hasAccess && ' - Upgrade Required'}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>
                {/* 🆕 Aspect Ratio Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    📐 ASPECT RATIO
                    <span className="ml-1 text-cyan-400 text-xs">
                      {videoAspectRatio === '16:9' && '(Landscape)'}
                      {videoAspectRatio === '9:16' && '(Portrait/TikTok)'}
                      {videoAspectRatio === '1:1' && '(Square/Instagram)'}
                      {videoAspectRatio === '4:3' && '(Standard)'}
                      {videoAspectRatio === 'custom' && `(${customWidth}x${customHeight})`}
                    </span>
                  </label>
                  <select
                    value={videoAspectRatio}
                    onChange={e => setVideoAspectRatio(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="16:9">🖥️ 16:9 - Widescreen (1024x576)</option>
                    <option value="9:16">📱 9:16 - Portrait/TikTok (576x1024)</option>
                    <option value="1:1">⬛ 1:1 - Square/Instagram (512x512)</option>
                    <option value="4:3">📺 4:3 - Standard (768x576)</option>
                    <option value="custom">⚙️ Custom Resolution</option>
                  </select>
                </div>
              </div>

              {/* 🆕 Advanced Video Settings */}
              <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Advanced Generation Settings
                  <span className="ml-auto text-[10px] font-mono text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                    v2.1-optimized
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* CFG Scale */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 flex justify-between">
                      <span>CFG Scale</span>
                      <span className="text-cyan-400">{videoCfg}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={videoCfg}
                      onChange={e => setVideoCfg(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Wan 2.1 optimal: 5-8. Higher = noisier.
                    </p>
                  </div>

                  {/* Steps */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 flex justify-between">
                      <span>Steps</span>
                      <span className="text-cyan-400">{videoSteps}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      step="1"
                      value={videoSteps}
                      onChange={e => setVideoSteps(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Wan 2.1 max: 30 steps. Recommended: 25-30.
                    </p>
                  </div>

                  {/* FPS */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 flex justify-between">
                      <span>FPS</span>
                      <span className="text-cyan-400">{videoFps}</span>
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="60"
                      step="1"
                      value={videoFps}
                      onChange={e => setVideoFps(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Frames per second. Standard is 24.
                    </p>
                  </div>

                  {/* Motion Strength */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 flex justify-between">
                      <span>Motion Strength</span>
                      <span className="text-cyan-400">{videoMotionStrength}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="255"
                      step="1"
                      value={videoMotionStrength}
                      onChange={e => setVideoMotionStrength(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Intensity of movement (1-255).</p>
                  </div>
                </div>
              </div>

              {/* 🆕 Custom Resolution Controls */}
              {videoAspectRatio === 'custom' && (
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 mb-1">WIDTH (px)</label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={e =>
                        setCustomWidth(
                          Math.max(256, Math.min(1920, parseInt(e.target.value) || 512))
                        )
                      }
                      min="256"
                      max="1920"
                      step="8"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      HEIGHT (px)
                    </label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={e =>
                        setCustomHeight(
                          Math.max(256, Math.min(1920, parseInt(e.target.value) || 512))
                        )
                      }
                      min="256"
                      max="1920"
                      step="8"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-none">
                    <p className="text-xs text-gray-400 mb-1">Presets:</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWidth(1280);
                          setCustomHeight(720);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                        title="720p HD"
                      >
                        720p
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWidth(1920);
                          setCustomHeight(1080);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                        title="1080p Full HD"
                      >
                        1080p
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWidth(720);
                          setCustomHeight(1280);
                        }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                        title="TikTok/Reels"
                      >
                        TikTok
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(editedScene.shotList?.length || 0) > 0 ? (
                (editedScene.shotList || []).map((shot, idx) => {
                  const shotImg = editedScene.storyboard?.find(s =>
                    isSameShotNumber(s.shot, shot.shot)
                  )?.image;
                  const shotVideo = editedScene.storyboard?.find(s =>
                    isSameShotNumber(s.shot, shot.shot)
                  )?.video;
                  const isGenerating = generatingShotId === idx;
                  const isGeneratingVideo = generatingVideoShotId === idx;

                  return (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col shadow-lg"
                    >
                      {/* Media Area */}
                      <div className="aspect-video bg-black/50 relative flex items-center justify-center overflow-hidden border-b border-gray-700 group">
                        {shotVideo ? (
                          // Check if it's a GIF (use img tag) or video (use video tag)
                          shotVideo.endsWith('.gif') || shotVideo.includes('.gif?') ? (
                            <img
                              src={shotVideo}
                              alt={`Shot ${shot.shot} video`}
                              className="w-full h-full object-cover"
                              onError={e => {
                                console.error(`❌ GIF load error for shot ${shot.shot}`);
                                console.error('📹 Full GIF URL:', shotVideo);
                                console.error('📹 URL length:', shotVideo.length);
                                console.error(
                                  '📹 Is Firebase Storage?',
                                  shotVideo.includes('firebasestorage')
                                );
                                console.error('📹 Has token?', shotVideo.includes('token='));
                                // Hide broken image element
                                e.currentTarget.style.display = 'none';
                                // Show error message
                                const errorDiv =
                                  e.currentTarget.parentElement?.querySelector(
                                    '.video-error-fallback'
                                  );
                                if (errorDiv) {
                                  (errorDiv as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          ) : (
                            <video
                              src={shotVideo}
                              controls
                              className="w-full h-full object-cover"
                              playsInline
                              onError={e => {
                                console.error(`❌ Video load error for shot ${shot.shot}`);
                                console.error('📹 Full video URL:', shotVideo);
                                console.error('📹 URL length:', shotVideo.length);
                                console.error('📹 URL starts with:', shotVideo.substring(0, 100));
                                console.error(
                                  '📹 Is Firebase Storage?',
                                  shotVideo.includes('firebasestorage')
                                );
                                console.error('📹 Has token?', shotVideo.includes('token='));
                                // Hide broken video element
                                e.currentTarget.style.display = 'none';
                                // Show error message
                                const errorDiv =
                                  e.currentTarget.parentElement?.querySelector(
                                    '.video-error-fallback'
                                  );
                                if (errorDiv) {
                                  (errorDiv as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          )
                        ) : shotImg ? (
                          <img
                            src={shotImg}
                            alt={`Shot ${shot.shot}`}
                            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                          />
                        ) : (
                          <div className="text-gray-600 flex flex-col items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-12 w-12 mb-2 opacity-50"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-xs">No media</span>
                          </div>
                        )}

                        {/* Video Error Fallback (hidden by default) */}
                        {shotVideo && (
                          <div
                            className="video-error-fallback absolute inset-0 bg-red-900/20 border-2 border-red-500/50 rounded-lg flex-col items-center justify-center text-center p-4"
                            style={{ display: 'none' }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-12 w-12 text-red-400 mb-2 mx-auto"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            <p className="text-red-400 font-semibold text-sm mb-1">
                              Video Link Expired
                            </p>
                            <p className="text-red-300 text-xs mb-3">
                              This video URL is no longer available. Please regenerate the video.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleGenerateShotVideo(idx, shot, true)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg font-semibold transition-colors"
                            >
                              🔄 Regenerate Video
                            </button>
                          </div>
                        )}

                        {/* Overlay Controls */}
                        {(shotImg || shotVideo) && (
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {/* Download Button - Only for Videos */}
                            {shotVideo && (
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = shotVideo;
                                  link.download = `Shot_${shot.shot}_${scriptData.title.replace(/\s+/g, '_')}.mp4`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="p-2 rounded-lg bg-black/70 hover:bg-green-600 backdrop-blur-sm text-white font-bold transition-all shadow-lg"
                                title="Download video file"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}

                            {/* Open in New Tab Button - Only for Videos */}
                            {shotVideo && (
                              <button
                                type="button"
                                onClick={() => window.open(shotVideo, '_blank')}
                                className="p-2 rounded-lg bg-black/70 hover:bg-blue-600 backdrop-blur-sm text-white font-bold transition-all shadow-lg"
                                title="Open video in new tab"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                </svg>
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteShotImage(shot.shot)}
                              className={`p-2 rounded-lg text-white font-bold transition-all shadow-lg ${
                                confirmDeleteShotId === shot.shot
                                  ? 'bg-red-600 hover:bg-red-700 animate-pulse scale-110'
                                  : 'bg-black/70 hover:bg-red-600 backdrop-blur-sm'
                              }`}
                              title={
                                confirmDeleteShotId === shot.shot
                                  ? '✓ Click again to confirm delete'
                                  : 'Delete storyboard media'
                              }
                            >
                              {confirmDeleteShotId === shot.shot ? (
                                <span className="text-xs px-1">Confirm?</span>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}

                        {(isGenerating || isGeneratingVideo) && (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-cyan-400 text-xs font-bold animate-pulse">
                              {generatingAudioForShot === idx
                                ? '🎙️ Generating Audio...'
                                : isGeneratingVideo
                                  ? 'Rendering Video...'
                                  : 'Painting...'}
                            </span>

                            {/* Video Progress */}
                            {progress > 0 && generatingAudioForShot !== idx && (
                              <>
                                <div className="w-3/4 h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-400 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-cyan-400 text-[10px] mt-1">
                                  Video: {Math.round(progress)}%
                                </span>
                              </>
                            )}

                            {/* Audio Progress */}
                            {audioProgress > 0 && generatingAudioForShot === idx && (
                              <>
                                <div className="w-3/4 h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full bg-purple-400 transition-all duration-300 ease-out"
                                    style={{ width: `${audioProgress}%` }}
                                  />
                                </div>
                                <span className="text-purple-400 text-[10px] mt-1">
                                  Audio: {Math.round(audioProgress)}%
                                </span>
                                <p className="text-purple-300 text-[9px] mt-1 text-center max-w-[80%]">
                                  {audioProgress < 30 && 'Analyzing dialogue...'}
                                  {audioProgress >= 30 && audioProgress < 70 && 'Cloning voices...'}
                                  {audioProgress >= 70 &&
                                    audioProgress < 90 &&
                                    'Merging with video...'}
                                  {audioProgress >= 90 && 'Finalizing...'}
                                </p>
                              </>
                            )}

                            {/* 🛑 Cancel Button - Enhanced Visibility */}
                            {isGeneratingVideo && currentVideoJobId && (
                              <button
                                type="button"
                                onClick={handleCancelVideoGeneration}
                                className="mt-2 px-1.5 py-0.5 bg-red-600/70 hover:bg-red-600/80 border border-red-500/60 hover:border-red-400/70 text-white text-[9px] font-semibold rounded transition-colors flex items-center justify-center gap-1 w-auto"
                                title="Cancel video generation"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info & Action Area */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold text-lg text-cyan-400">Shot {shot.shot}</h5>
                          <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300 border border-gray-600">
                            {shot.shotSize}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-3 flex-grow">
                          {shot.description}
                        </p>

                        <div className="mt-auto pt-3 border-t border-gray-700 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateShotImage(idx, shot)}
                            disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                            className={`col-span-2 py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                              shotImg
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {shotImg ? 'Regenerate Image' : 'Gen Image'}
                          </button>

                          {/* Text-to-Video Button (Always Available) */}
                          <button
                            type="button"
                            onClick={() => handleGenerateShotVideo(idx, shot, false)}
                            disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                            className={`py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            Vid (Txt)
                          </button>

                          {/* Image-to-Video Button (Only if image exists) */}
                          {shotImg ? (
                            <button
                              type="button"
                              onClick={() => handleGenerateShotVideo(idx, shot, true)}
                              disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                              className={`py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4z" />
                                <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                              </svg>
                              Vid (Img)
                            </button>
                          ) : (
                            // Placeholder to keep grid structure if no image
                            <div className="hidden"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/30">
                  <p className="text-gray-500 mb-2">No shots found in Shot List.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shotlist')}
                    className="text-cyan-400 hover:underline text-sm"
                  >
                    Go to Shot List to add shots first
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'proplist' && (
          <div className="space-y-4">
            {/* Progress Bar for Prop List Regeneration */}
            {isRegeneratingAllProps && (
              <div className="mb-8 bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    🎨 กำลังสร้าง Prop List ใหม่...
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {Math.round(regenerationProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${regenerationProgress}%` }}
                  >
                    {regenerationProgress > 10 && (
                      <span className="text-[10px] font-bold text-white drop-shadow-lg">
                        {Math.round(regenerationProgress)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  โปรดรอสักครู่ ระบบกำลังสร้าง Prop List ที่ละเอียดและเหมาะสมกับฉาก
                </p>
              </div>
            )}
            
            {isEditing && (editedScene.propList?.length || 0) > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearAllPropList}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    confirmClearSection === 'proplist'
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                  }`}
                  title={
                    confirmClearSection === 'proplist'
                      ? 'Click again to confirm delete all'
                      : 'Clear all props from list'
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {confirmClearSection === 'proplist' ? 'Confirm Clear All?' : 'Clear All Props'}
                </button>
              </div>
            )}
            {(editedScene.propList?.length || 0) > 0 ? (
              renderEditableTable(
                Object.keys(editedScene.propList?.[0] || {}),
                editedScene.propList || [],
                'propList'
              )
            ) : (
              <p className="text-gray-500 italic">No prop list available.</p>
            )}
          </div>
        )}
        {activeTab === 'breakdown' && (
          <div className="space-y-4">
            {/* Clear All Breakdown button */}
            {isEditing &&
              ((editedScene.breakdown?.part1?.length || 0) > 0 ||
                (editedScene.breakdown?.part2?.length || 0) > 0 ||
                (editedScene.breakdown?.part3?.length || 0) > 0) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleClearAllBreakdown}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                      confirmClearSection === 'breakdown'
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                    }`}
                    title={
                      confirmClearSection === 'breakdown'
                        ? 'Click again to confirm delete all'
                        : 'Clear all breakdown data (Part 1, 2, 3)'
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {confirmClearSection === 'breakdown'
                      ? 'Confirm Clear All?'
                      : 'Clear All Breakdown'}
                  </button>
                </div>
              )}
            <h4 className="font-bold text-cyan-400">Part 1: General Info</h4>
            {(editedScene.breakdown?.part1?.length || 0) > 0 ? (
              renderEditableTable(
                Object.keys(editedScene.breakdown.part1?.[0] || {}),
                editedScene.breakdown.part1 || [],
                'breakdown',
                'part1'
              )
            ) : (
              <p>No data</p>
            )}

            <h4 className="font-bold text-cyan-400 pt-4">Part 2: Scene Details</h4>
            {(editedScene.breakdown?.part2?.length || 0) > 0 ? (
              renderEditableTable(
                Object.keys(editedScene.breakdown.part2?.[0] || {}),
                editedScene.breakdown.part2 || [],
                'breakdown',
                'part2'
              )
            ) : (
              <p>No data</p>
            )}

            <h4 className="font-bold text-cyan-400 pt-4">Part 3: Requirements</h4>
            {(editedScene.breakdown?.part3?.length || 0) > 0 ? (
              renderEditableTable(
                Object.keys(editedScene.breakdown.part3?.[0] || {}),
                editedScene.breakdown.part3 || [],
                'breakdown',
                'part3'
              )
            ) : (
              <p>No data</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
// Collapsible Scene Wrapper
const SceneItem: React.FC<{
  sceneIndex: number;
  sceneNumber: number;
  isPart: boolean;
  status: 'pending' | 'loading' | 'done' | 'error' | undefined;
  sceneData: GeneratedScene | undefined;
  button: React.ReactNode;
  onUpdate: (scene: GeneratedScene) => void;
  onRegisterUndo?: () => void;
  _goToStep: (step: number) => void;
  onNavigateToCharacter?: (
    charName: string,
    fromStep?: number,
    sceneContext?: { pointTitle: string; sceneIndex: number }
  ) => void;
  pointTitle: string; // Needed for anchor ID
  onDelete?: () => void;
  canDelete?: boolean;
  scriptData: ScriptData; // Added for dialect conversion
  isRegenerateLocationModalOpen: boolean;
  setIsRegenerateLocationModalOpen: (value: boolean) => void;
  isRegeneratingAllLocation: boolean;
  locationRegenerationProgress: number;
  handleRegenerateAllLocationDetails: (mode: 'fresh' | 'refine' | 'edited') => Promise<void>;
  locationImageAlbum: Array<{
    url: string;
    timestamp: number;
    locationString: string;
    id: string;
  }>;
  selectedLocationImageId: string | null;
  isGeneratingLocationImage: boolean;
  onSelectLocationImage: (id: string) => void;
  onDeleteLocationImage: (id: string) => void;
  handleGenerateLocationImage: () => void;
}> = ({
  sceneIndex,
  sceneNumber,
  isPart,
  status,
  sceneData,
  button,
  onUpdate,
  onRegisterUndo,
  _goToStep,
  onNavigateToCharacter,
  pointTitle,
  onDelete,
  canDelete,
  scriptData,
  isRegenerateLocationModalOpen,
  setIsRegenerateLocationModalOpen,
  isRegeneratingAllLocation,
  locationRegenerationProgress,
  handleRegenerateAllLocationDetails,
  locationImageAlbum,
  selectedLocationImageId,
  isGeneratingLocationImage,
  onSelectLocationImage,
  onDeleteLocationImage,
  handleGenerateLocationImage,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="p-3 bg-gray-900/40 rounded-md border border-gray-700 transition-all duration-300">
      <div
        className="flex justify-between items-center cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-1 rounded-full transition-all duration-300 ${isExpanded ? 'bg-cyan-900 text-cyan-400 rotate-180' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <h4
            className={`font-semibold transition-colors ${isExpanded ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'}`}
          >
            Scene {sceneNumber} {isPart ? `(Part ${sceneIndex + 1})` : ''}
            {sceneData?.sceneDesign.sceneName && !isExpanded && (
              <span className="text-sm font-normal text-gray-500 ml-2 border-l border-gray-700 pl-2">
                {sceneData.sceneDesign.sceneName}
              </span>
            )}
          </h4>
        </div>
        <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
          <div className="text-sm font-mono w-20 text-right">
            {status === 'pending' && <span className="text-gray-500">Pending</span>}
            {status === 'done' && <span className="text-green-400">✓ Done</span>}
            {status === 'error' && <span className="text-red-400">✗ Error</span>}
          </div>
          <div className="w-32 h-6 text-center">{button}</div>
          {canDelete && onDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors flex items-center gap-1"
              title={`Delete Scene ${sceneNumber}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 animate-fade-in-scene border-t border-gray-700/50 pt-2">
          {sceneData ? (
            <SceneDisplay
              sceneData={sceneData}
              onSave={onUpdate}
              allCharacters={scriptData.characters || []}
              onRegisterUndo={onRegisterUndo}
              _goToStep={_goToStep}
              onNavigateToCharacter={onNavigateToCharacter}
              pointTitle={pointTitle}
              sceneIndex={sceneIndex}
              scriptData={scriptData}
              isRegenerateLocationModalOpen={isRegenerateLocationModalOpen}
              setIsRegenerateLocationModalOpen={setIsRegenerateLocationModalOpen}
              isRegeneratingAllLocation={isRegeneratingAllLocation}
              locationRegenerationProgress={locationRegenerationProgress}
              handleRegenerateAllLocationDetails={(mode) =>
                handleRegenerateAllLocationDetails(mode, pointTitle, sceneIndex, sceneData)
              }
              locationImageAlbum={locationImageAlbum}
              selectedLocationImageId={selectedLocationImageId}
              isGeneratingLocationImage={isGeneratingLocationImage}
              onSelectLocationImage={onSelectLocationImage}
              onDeleteLocationImage={onDeleteLocationImage}
              handleGenerateLocationImage={handleGenerateLocationImage}
            />
          ) : (
            <div className="mt-4 p-10 flex items-center justify-center bg-gray-900/20 rounded-lg border-2 border-dashed border-gray-700">
              <p className="text-gray-500 text-sm">
                {status === 'error'
                  ? 'Generation failed. Please try again.'
                  : 'Scene not generated yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Step5Output: React.FC<Step5OutputProps> = ({
  scriptData,
  setScriptData,
  prevStep,
  onRegisterUndo,
  _goToStep,
  onNavigateToCharacter,
  returnToScene,
  onResetReturnToScene,
  userRole = 'editor', // Default to editor if not specified
}) => {
  // i18n
  const { t } = useTranslation();
  type Status = 'pending' | 'loading' | 'done' | 'error';
  type GenerationStatus = Record<string, Record<number, Status>>;

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(() =>
    Object.fromEntries(
      scriptData.structure.map(p => [
        p.title,
        Object.fromEntries(
          Array.from({ length: scriptData.scenesPerPoint[p.title] || 1 }, (_, i) => [
            i,
            scriptData.generatedScenes[p.title]?.[i] ? 'done' : 'pending',
          ])
        ),
      ])
    )
  );
  const [sceneGenerationProgress, setSceneGenerationProgress] = useState<Record<string, number>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // 🎯 Main Tab Navigation (Step5 Level)
  const [mainTab, setMainTab] = useState<'sceneDesign' | 'simulation' | 'motionEditor'>(
    'sceneDesign'
  );
  const [editingShotIndex, setEditingShotIndex] = useState<number | null>(0); // Auto-select first shot
  const [showMotionEditorModal, setShowMotionEditorModal] = useState(false); // 🎬 Modal for full Motion Editor

  // 🎬 Motion Editor - Local state for image/video generation
  const [motionEditorGeneratingImage, setMotionEditorGeneratingImage] = useState(false);
  const [motionEditorGeneratingVideo, setMotionEditorGeneratingVideo] = useState(false);
  const [motionEditorProgress, setMotionEditorProgress] = useState(0);

  // 📍 Location Details Modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isGeneratingLocationDetails, setIsGeneratingLocationDetails] = useState(false);
  const [isRegenerateLocationModalOpen, setIsRegenerateLocationModalOpen] = useState(false);
  const [isRegeneratingAllLocation, setIsRegeneratingAllLocation] = useState(false);
  const [locationRegenerationProgress, setLocationRegenerationProgress] = useState(0);
  
  // 📸 Initialize Location Image Album from scriptData
  const initializeLocationImageAlbum = () => {
    const allImages: Array<{
      url: string;
      timestamp: number;
      locationString: string;
      id: string;
    }> = [];
    
    // Collect all location images from all scenes
    Object.entries(scriptData.generatedScenes).forEach(([pointTitle, scenes]) => {
      scenes.forEach((scene, sceneIndex) => {
        if (scene?.sceneDesign?.locationImageAlbum) {
          allImages.push(...scene.sceneDesign.locationImageAlbum);
        }
      });
    });
    
    // Sort by timestamp (newest first)
    return allImages.sort((a, b) => b.timestamp - a.timestamp);
  };
  
  const [locationImageAlbum, setLocationImageAlbum] = useState<Array<{
    url: string;
    timestamp: number;
    locationString: string;
    id: string;
  }>>(initializeLocationImageAlbum);
  
  const [selectedLocationImageId, setSelectedLocationImageId] = useState<string | null>(() => {
    // Try to get the selected image from the first scene that has one
    let savedSelection: string | null = null;
    
    Object.entries(scriptData.generatedScenes).forEach(([pointTitle, scenes]) => {
      scenes.forEach((scene) => {
        if (scene?.sceneDesign?.selectedLocationImageId && !savedSelection) {
          savedSelection = scene.sceneDesign.selectedLocationImageId;
        }
      });
    });
    
    // If no saved selection, use the most recent image
    if (!savedSelection) {
      const album = initializeLocationImageAlbum();
      return album.length > 0 ? album[0].id : null;
    }
    
    return savedSelection;
  });
  
  const [isGeneratingLocationImage, setIsGeneratingLocationImage] = useState(false);

  // � Modal States (Success/Error/Info)
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: Array<{ label: string; value: string }>;
    onClose?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // �🎬 Motion Editor - Generate Image Handler
  const handleMotionEditorGenerateImage = async (currentShot: any, sceneData: GeneratedScene) => {
    if (!currentShot || motionEditorGeneratingImage) return;
    if (onRegisterUndo) onRegisterUndo();

    const shotNumber = currentShot.shot.shot;
    setMotionEditorGeneratingImage(true);
    setMotionEditorProgress(0);

    try {
      // Build simple prompt from shot description
      const shotDesc = currentShot.shot.description || '';
      const location = sceneData.sceneDesign.location || '';
      const style = CHARACTER_IMAGE_STYLES[0] || 'Cinematic';
      const prompt = `Cinematic shot: ${shotDesc}. Location: ${location}. ${currentShot.shot.shotSize}. ${style}.`;

      const sceneCharacterNames = sceneData.sceneDesign?.characters || [];
      const sceneCharacters: Character[] = scriptData.characters.filter((c: Character) =>
        sceneCharacterNames.includes(c.name)
      );

      // 🆕 CONSISTENCY: Generate stable seed
      const shotIndex =
        sceneData.shotList?.findIndex(s => isSameShotNumber(s.shot, shotNumber)) ?? 0;
      const sceneKey = `${sceneData.sceneNumber || 'scene'}-${shotNumber}`;
      const sceneSeed =
        Math.abs(sceneKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000000;

      // 🆕 CONTINUITY: Get previous shot's image
      const previousShot = sceneData.shotList?.[shotIndex - 1];
      const previousShotNumber = previousShot?.shot;
      const previousShotImage = previousShotNumber
        ? sceneData.storyboard?.find(s => isSameShotNumber(s.shot, previousShotNumber))?.image
        : undefined;

      const base64Image = await generateStoryboardImage(
        prompt,
        sceneCharacters,
        p => setMotionEditorProgress(p),
        {
          seed: sceneSeed,
          previousShotImage: previousShotImage,
        }
      );

      const oldStoryboardItem =
        sceneData.storyboard?.find(s => isSameShotNumber(s.shot, shotNumber)) || {};
      const newItem = { ...oldStoryboardItem, shot: shotNumber, image: base64Image };
      const updatedStoryboard = [
        ...(sceneData.storyboard?.filter(s => !isSameShotNumber(s.shot, shotNumber)) || []),
        newItem,
      ];

      const updatedScene = { ...sceneData, storyboard: updatedStoryboard };

      // Update scriptData
      setScriptData(prev => {
        const scenes = prev.generatedScenes[currentShot.sceneTitle] || [];
        const updatedScenes = [...scenes];
        updatedScenes[currentShot.sceneIndex] = updatedScene;
        return {
          ...prev,
          generatedScenes: {
            ...prev.generatedScenes,
            [currentShot.sceneTitle]: updatedScenes,
          },
        };
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'Generation Failed',
        message: 'Failed to generate image. Please try again.',
      });
      console.error(error);
    } finally {
      setMotionEditorGeneratingImage(false);
      setMotionEditorProgress(0);
    }
  };

  // 🎥 Motion Editor - Generate Video Handler
  const handleMotionEditorGenerateVideo = async (currentShot: any, sceneData: GeneratedScene) => {
    if (!currentShot || motionEditorGeneratingVideo) return;
    if (onRegisterUndo) onRegisterUndo();

    const shotNumber = currentShot.shot.shot;
    setMotionEditorGeneratingVideo(true);
    setMotionEditorProgress(0);

    try {
      // Build video prompt
      const shotDesc = currentShot.shot.description || '';
      const movement = currentShot.shot.movement || 'Static';
      const duration = currentShot.shot.durationSec || 3;
      const location = sceneData.sceneDesign?.location || '';
      const inferTimeOfDay = (loc: string): string => {
        const t = (loc || '').toLowerCase();
        if (t.includes('กลางวัน') || t.includes('day')) return 'กลางวัน';
        if (t.includes('กลางคืน') || t.includes('night')) return 'กลางคืน';
        if (t.includes('dawn') || t.includes('morning') || t.includes('เช้า')) return 'เช้า';
        if (t.includes('evening') || t.includes('เย็น')) return 'เย็น';
        return '';
      };
      const timeOfDay = inferTimeOfDay(location);
      const prompt = `Cinematic video: ${shotDesc}. Location: ${location}.${timeOfDay ? ` Time: ${timeOfDay}.` : ''} Camera: ${movement}. Duration: ${duration}s. ${currentShot.shot.shotSize}.`;

      // Resolve characters for this scene/shot (continuity + Face ID)
      const sceneCharacterNames = (sceneData.sceneDesign?.characters || []).filter(Boolean);
      const sceneCharacters: Character[] = scriptData.characters.filter((c: Character) =>
        sceneCharacterNames.includes(c.name)
      );

      const normalizeCastToString = (castValue: unknown): string => {
        if (typeof castValue === 'string') return castValue;
        if (Array.isArray(castValue)) return castValue.filter(Boolean).join(', ');
        return '';
      };

      const castFromShot = normalizeCastToString((currentShot.shot as any)?.cast);
      const castString =
        castFromShot.trim().length > 0 ? castFromShot : sceneCharacterNames.join(', ');

      // Pick a lead character from cast if possible (buildVideoPrompt needs a Character)
      const castNames = castString
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const leadCharacter =
        scriptData.characters.find((c: Character) => castNames.includes(c.name)) ||
        sceneCharacters[0] ||
        scriptData.characters[0];

      const castCharacters = castNames
        .map(name => scriptData.characters.find((c: Character) => c.name === name))
        .filter((c): c is Character => !!c);

      const getCharacterFaceRef = (c?: Character) => c?.faceReferenceImage || c?.image;
      const allShotCharacters: Character[] = Array.from(
        new Map(
          [leadCharacter, ...castCharacters, ...sceneCharacters]
            .filter(Boolean)
            .map(c => [c.id || c.name, c] as const)
        ).values()
      );

      const rawCharacterImages = allShotCharacters
        .map(c => getCharacterFaceRef(c))
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      const characterImages = Array.from(new Set(rawCharacterImages));

      // Use existing image if available
      const existingImage = sceneData.storyboard?.find(s =>
        isSameShotNumber(s.shot, shotNumber)
      )?.image;

      // Continuity fallback: if no current shot image, use previous shot image as init
      const shotIndex =
        sceneData.shotList?.findIndex(s => isSameShotNumber(s.shot, shotNumber)) ?? 0;
      const previousShot = sceneData.shotList?.[shotIndex - 1];
      const previousShotNumber = previousShot?.shot;
      const previousShotImage = previousShotNumber
        ? sceneData.storyboard?.find(s => isSameShotNumber(s.shot, previousShotNumber))?.image
        : undefined;

      const initImage = existingImage || previousShotImage;

      const shotDataForVideo = {
        ...currentShot.shot,
        // Ensure cast is a non-empty string so motion engine doesn't treat it as "NO people"
        cast: castString,
      };

      const videoUri = await generateStoryboardVideo(
        prompt,
        initImage,
        p => setMotionEditorProgress(p),
        'auto', // Use auto model selection
        {
          character: leadCharacter,
          currentScene: sceneData,
          shotData: shotDataForVideo,
          aspectRatio: '16:9',
          width: undefined,
          height: undefined,
          characterImages: characterImages.length > 0 ? characterImages : undefined,
        }
      );

      const oldStoryboardItem = sceneData.storyboard?.find(s =>
        isSameShotNumber(s.shot, shotNumber)
      ) || {
        shot: shotNumber,
        image: '',
      };
      const newItem = {
        ...oldStoryboardItem,
        shot: shotNumber,
        image: oldStoryboardItem.image || '',
        video: videoUri,
      };
      const updatedStoryboard = [
        ...(sceneData.storyboard?.filter(s => !isSameShotNumber(s.shot, shotNumber)) || []),
        newItem,
      ];

      const updatedScene = { ...sceneData, storyboard: updatedStoryboard };

      // Update scriptData
      setScriptData(prev => {
        const scenes = prev.generatedScenes[currentShot.sceneTitle] || [];
        const updatedScenes = [...scenes];
        updatedScenes[currentShot.sceneIndex] = updatedScene;
        return {
          ...prev,
          generatedScenes: {
            ...prev.generatedScenes,
            [currentShot.sceneTitle]: updatedScenes,
          },
        };
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'Generation Failed',
        message: 'Failed to generate video. Please try again.',
      });
      console.error(error);
    } finally {
      setMotionEditorGeneratingVideo(false);
      setMotionEditorProgress(0);
    }
  };

  // � Handle regenerating ALL location details with mode selection
  const handleRegenerateAllLocationDetails = async (
    mode: 'fresh' | 'refine' | 'edited',
    pointTitle: string,
    sceneIndex: number,
    currentScene: GeneratedScene
  ) => {
    setIsRegenerateLocationModalOpen(false);
    setIsRegeneratingAllLocation(true);
    setLocationRegenerationProgress(0);

    const progressInterval = setInterval(() => {
      setLocationRegenerationProgress(prev => (prev >= 40 ? 40 : prev + Math.random() * 4));
    }, 400);

    try {
      const ai = getAI();
      
      let modeInstructions = '';
      if (mode === 'fresh') {
        modeInstructions =
          '🔄 FRESH START MODE: สร้าง Location Details ใหม่ทั้งหมด ไม่อิงจาก Location Details เดิม ใช้เฉพาะข้อมูล Scene Details เป็นพื้นฐาน';
      } else if (mode === 'refine') {
        modeInstructions =
          '✨ REFINE EXISTING MODE: ปรับปรุง Location Details เดิม โดยรักษาโครงสร้างหลักและเพิ่มรายละเอียดให้ครบถ้วนสมบูรณ์';
      } else if (mode === 'edited') {
        modeInstructions =
          '📝 USE EDITED DATA MODE: สร้าง Location Details ใหม่โดยรวมการแก้ไขของผู้ใช้เข้าไป';
      }

      const sceneContext = `
SCENE DETAILS:
- Scene Name: ${currentScene.sceneDesign.sceneName}
- Location: ${currentScene.sceneDesign.location}
- Time: ${currentScene.sceneDesign.time}
- Mood: ${currentScene.sceneDesign.mood}
- Characters: ${currentScene.sceneDesign.characters.join(', ')}
- Situations: ${currentScene.sceneDesign.situations.map((s: any) => s.description).join('; ')}
`;

      const currentLocationDetails =
        mode === 'fresh'
          ? ''
          : `

CURRENT LOCATION DETAILS (for reference):
${JSON.stringify(currentScene.sceneDesign?.locationDetails, null, 2)}`;

      // Parse location string
      const location = currentScene.sceneDesign.location;
      const locMatch = location.match(/^(INT\.|EXT\.)\s*(.+?)\s*-\s*(DAY|NIGHT|DAWN|DUSK|GOLDEN HOUR|กลางวัน|กลางคืน|เช้า|เย็น)/i);
      const locType = locMatch ? locMatch[1] : 'INT.';
      const locName = locMatch ? locMatch[2].trim() : location;
      const timeOfDay = locMatch ? locMatch[3] : 'DAY';

      const prompt = `${modeInstructions}

You are a professional location scout and production designer. Generate comprehensive location details for:

${sceneContext}${currentLocationDetails}

Output all descriptions in THAI language (ภาษาไทยเท่านั้น)

Create a detailed JSON with this EXACT structure (no additional fields):
{
  "locationType": "${locType}",
  "locationName": "${locName}",
  "timeOfDay": "${timeOfDay}",
  "environment": {
    "description": "คำอธิบายที่ครอบคลุม 3-4 ประโยค เกี่ยวกับลักษณะทางกายภาพของสถานที่ รูปแบบ และความรู้สึกโดยรวม",
    "architecture": "สถาปัตยกรรม วัสดุก่อสร้าง องค์ประกอบการออกแบบ (ถ้ามี)",
    "landscaping": "องค์ประกอบสิ่งแวดล้อมธรรมชาติหรือประดิษฐ์ พืช ลักษณะภูมิประเทศ",
    "dimensions": "ขนาดและมาตราส่วนโดยประมาณ (เช่น '20x30 เมตร, เพดานสูง 4 เมตร')",
    "capacity": "พื้นที่สามารถรองรับคนได้กี่คน"
  },
  "atmosphere": {
    "weather": "สภาพอากาศปัจจุบัน (แดดจัด, มีเมฆ, ฝนตก, ฯลฯ)",
    "temperature": "อุณหภูมิพร้อมหน่วย (เช่น '28°C อบอุ่นและชื้น', 'หนาว 15°C')",
    "humidity": "ระดับความชื้นพร้อมรายละเอียด (แห้g/ปานกลาง/ชื้น/ชื้นมาก)",
    "windSpeed": "สภาวะลม (สงบ/มีลมพัดเบา/ลมแรง/พายุ)",
    "visibility": "สภาพการมองเห็น (แจ่มใส/หมอกบาง/หมอกหนา)"
  },
  "sensory": {
    "smell": "กลิ่นเด่นและกลิ่นหอมในสถานที่ (2-3 กลิ่นเฉพาะเจาะจง)",
    "sounds": "เสียงโดยรอบและเสียงรบกวน (3-4 เสียงเฉพาะเจาะจง)",
    "lighting": "คุณภาพและลักษณะของแสง (ธรรมชาติ/ประดิษฐ์, ความเข้ม, อุณหภูมิสี)",
    "colors": "จานสีหลักและโทนสีที่มองเห็น (4-5 สีหลัก)"
  },
  "production": {
    "setDressing": "เฟอร์นิเจอร์หลัก ของตกแต่ง และองค์ประกอบฉาก (5-7 รายการเฉพาะเจาะจง)",
    "props": "อุปกรณ์ประกอบสำคัญที่ควรมี (4-6 รายการ)",
    "practicalLights": "แหล่งกำเนิดแสงที่มองเห็นในฉาก (โคมไฟ, หน้าต่าง, โคมไฟติดผนัง)",
    "specialRequirements": "ความต้องการพิเศษด้านการผลิตหรือข้อพิจารณาใดๆ"
  },
  "references": {
    "realWorldLocation": "สถานที่จริงหรือสถานที่ที่คล้ายกับนี้ในโลกจริง",
    "culturalContext": "บริบททางวัฒนธรรมหรือประวัติศาสตร์ที่เกี่ยวข้องกับสถานที่นี้"
  }
}

IMPORTANT GUIDELINES:
- Be EXTREMELY specific and detailed, avoid generic descriptions
- Consider the scene's mood (${currentScene.sceneDesign.mood}) when describing atmosphere
- Think about what would make this location feel authentic and lived-in
- Include sensory details that would help visualize the space
- เขียนรายละเอียดเป็นภาษาไทยที่สละสลวย มีความหมายชัดเจน
- ให้ข้อมูลที่เป็นประโยชน์สำหรับการผลิตภาพยนตร์
- คำนึงถึงบรรยากาศของฉากและตัวละครที่เกี่ยวข้อง
`;

      setLocationRegenerationProgress(50);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        systemInstruction:
          'You are a professional location scout and production designer with expertise in Thai film production. Generate comprehensive, detailed location information in Thai language.',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      setLocationRegenerationProgress(80);
      const text = response.text || '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const newLocationDetails = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        // Update scriptData with new location details
        setScriptData(prev => {
          const scenes = prev.generatedScenes[pointTitle] || [];
          const updatedScenes = [...scenes];
          updatedScenes[sceneIndex] = {
            ...currentScene,
            sceneDesign: {
              ...currentScene.sceneDesign,
              locationDetails: newLocationDetails,
            },
          };
          return {
            ...prev,
            generatedScenes: {
              ...prev.generatedScenes,
              [pointTitle]: updatedScenes,
            },
          };
        });

        setLocationRegenerationProgress(100);
        console.log('✅ Location Details regenerated successfully');
      }
    } catch (error) {
      console.error('❌ Location Details regeneration failed:', error);
      setErrorModal({
        isOpen: true,
        title: '⚠️ Regeneration Error',
        message: `Failed to regenerate Location Details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setLocationRegenerationProgress(0);
        setIsRegeneratingAllLocation(false);
      }, 500);
    }
  };

  // 🖼️ Handle Generate Location Image
  const handleGenerateLocationImage = async (
    locationDetails: any,
    locationString: string,
    pointTitle: string,
    sceneIndex: number
  ) => {
    if (!locationDetails) {
      setErrorModal({
        isOpen: true,
        title: '⚠️ Missing Location Details',
        message: 'กรุณาสร้าง Location Details ก่อนที่จะสร้างรูปภาพ',
      });
      return;
    }

    setIsGeneratingLocationImage(true);
    
    try {
      const imageUrl = await generateLocationImage(locationDetails, locationString);
      
      // Add to album with metadata
      const newImage = {
        url: imageUrl,
        timestamp: Date.now(),
        locationString,
        id: `loc-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // Update local state
      setLocationImageAlbum(prev => [newImage, ...prev]);
      setSelectedLocationImageId(newImage.id);
      
      // Save to scriptData
      setScriptData(prev => {
        const scenes = prev.generatedScenes[pointTitle] || [];
        const currentScene = scenes[sceneIndex];
        
        if (!currentScene) return prev;
        
        const updatedAlbum = [
          newImage,
          ...(currentScene.sceneDesign?.locationImageAlbum || [])
        ];
        
        const updatedScenes = [...scenes];
        updatedScenes[sceneIndex] = {
          ...currentScene,
          sceneDesign: {
            ...currentScene.sceneDesign,
            locationImageAlbum: updatedAlbum,
          },
        };
        
        return {
          ...prev,
          generatedScenes: {
            ...prev.generatedScenes,
            [pointTitle]: updatedScenes,
          },
        };
      });
      
      // Save the scene data (trigger undo registration)
      if (onRegisterUndo) {
        onRegisterUndo();
      }
      
      setSuccessModal({
        isOpen: true,
        title: '🎉 สร้างรูปภาพสำเร็จ',
        message: `สร้างรูปภาพโลเคชั่นจาก Location Details เสร็จสมบูรณ์\n📸 รูปภาพถูกเพิ่มเข้าอัลบั้มแล้ว (ทั้งหมด ${locationImageAlbum.length + 1} รูป)`,
      });
    } catch (error) {
      console.error('❌ Location image generation failed:', error);
      setErrorModal({
        isOpen: true,
        title: '⚠️ Image Generation Error',
        message: `Failed to generate location image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsGeneratingLocationImage(false);
    }
  };

  // 🔄 Helper: Convert shot to MotionEdit format
  const convertShotToMotionEdit = (shot: {
    description: string;
    shotSize: string;
    movement: string;
    perspective: string;
    equipment: string;
    durationSec: number;
    focalLength?: string;
    shot?: number;
  }): MotionEdit => {
    if (!shot) return DEFAULT_MOTION_EDIT;

    // Map shotSize to ShotType
    const getShotType = (size: string): any => {
      const sizeMap: Record<string, string> = {
        'Wide Shot': 'Wide Shot',
        'Medium Shot': 'Medium Shot',
        'Close-up': 'Close-up',
        'Extreme Close-up': 'Extreme Close-up',
        'Over-the-Shoulder': 'Over-the-Shoulder',
        'Two Shot': 'Two Shot',
        'Full Shot': 'Wide Shot',
        'Medium Close-up': 'Close-up',
      };
      return sizeMap[size] || 'Medium Shot';
    };

    return {
      shot_preview_generator_panel: {
        structure: '',
        prompt: shot.description || '',
        shot_type: getShotType(shot.shotSize),
        voiceover: '',
      },
      camera_control: {
        shot_prompt: shot.description || '',
        perspective: (shot.perspective || 'Neutral') as any,
        movement: (shot.movement || 'Static') as any,
        equipment: (shot.equipment || 'Tripod') as any,
        focal_length: (shot.focalLength || '50mm') as any,
      },
      frame_control: {
        foreground: '',
        object: shot.description || '',
        background: '',
      },
      lighting_design: {
        description: '',
        color_temperature: 'Neutral',
      },
      sounds: {
        auto_sfx: true,
        description: '',
      },
    };
  };

  // 💾 Helper: Save MotionEdit changes back to shot
  const handleMotionChange = useCallback(
    (sceneTitle: string, sceneIndex: number, shotIndex: number, updatedMotion: MotionEdit) => {
      if (onRegisterUndo) onRegisterUndo();

      setScriptData(prev => {
        const scenes = prev.generatedScenes[sceneTitle] || [];
        const updatedScenes = [...scenes];

        if (updatedScenes[sceneIndex] && updatedScenes[sceneIndex].shotList) {
          const shots = [...updatedScenes[sceneIndex].shotList];
          const camera = updatedMotion.camera_control;
          const preview = updatedMotion.shot_preview_generator_panel;

          shots[shotIndex] = {
            ...shots[shotIndex],
            shotSize: preview.shot_type,
            movement: camera.movement,
            perspective: camera.perspective,
            equipment: camera.equipment,
            focalLength: camera.focal_length,
            description: camera.shot_prompt || preview.prompt || shots[shotIndex].description,
          };

          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            shotList: shots,
          };
        }

        return {
          ...prev,
          generatedScenes: {
            ...prev.generatedScenes,
            [sceneTitle]: updatedScenes,
          },
        };
      });
    },
    [onRegisterUndo, setScriptData]
  );

  // ⌨️ Keyboard shortcuts for main tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setMainTab('sceneDesign');
            break;
          case '2':
            e.preventDefault();
            setMainTab('simulation');
            break;
          case '3':
            e.preventDefault();
            setMainTab('motionEditor');
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Regenerate Modal State
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    plotPoint: PlotPoint | null;
    sceneIndex: number;
  }>({
    isOpen: false,
    plotPoint: null,
    sceneIndex: -1,
  });

  // --- AUTO SCROLL EFFECT ---
  useEffect(() => {
    if (returnToScene && onResetReturnToScene) {
      // Slight delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const elementId = `scene-${returnToScene.pointTitle.replace(/\s+/g, '-')}-${returnToScene.sceneIndex}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a highlight effect
          element.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2', 'ring-offset-gray-900');
          setTimeout(
            () =>
              element.classList.remove(
                'ring-2',
                'ring-cyan-500',
                'ring-offset-2',
                'ring-offset-gray-900'
              ),
            2000
          );

          onResetReturnToScene();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [returnToScene, onResetReturnToScene]);

  const sceneNumberMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    let currentSceneNumber = 1;
    scriptData.structure.forEach(point => {
      map[point.title] = {};
      const sceneCount = scriptData.scenesPerPoint[point.title] ?? 1; // Default to 1 if undefined
      for (let i = 0; i < sceneCount; i++) {
        map[point.title][i] = currentSceneNumber++;
      }
    });
    return map;
  }, [scriptData.structure, scriptData.scenesPerPoint]);

  const handleGenerateSingle = useCallback(
    async (
      plotPoint: PlotPoint,
      sceneIndex: number,
      mode: 'fresh' | 'refine' | 'use-edited' = 'fresh'
    ) => {
      if (onRegisterUndo) onRegisterUndo();
      setGlobalError(null);
      setGenerationStatus(prev => ({
        ...prev,
        [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'loading' },
      }));
      
      // Start progress tracking
      const sceneKey = `${plotPoint.title}-${sceneIndex}`;
      setSceneGenerationProgress(prev => ({ ...prev, [sceneKey]: 0 }));
      
      const progressInterval = setInterval(() => {
        setSceneGenerationProgress(prev => ({
          ...prev,
          [sceneKey]: Math.min((prev[sceneKey] || 0) + Math.random() * 10, 90),
        }));
      }, 500);
      
      try {
        let sceneNumber = sceneNumberMap[plotPoint.title]?.[sceneIndex];
        
        // DEBUG: Check why sceneNumber might be undefined
        console.log('🔍 [DEBUG] sceneNumber calculation:', {
          plotPointTitle: plotPoint.title,
          sceneIndex,
          sceneNumber,
          hasPlotPointInMap: plotPoint.title in sceneNumberMap,
          mapForPlotPoint: sceneNumberMap[plotPoint.title],
          mapKeys: sceneNumberMap[plotPoint.title] ? Object.keys(sceneNumberMap[plotPoint.title]) : [],
          allPlotPointsInMap: Object.keys(sceneNumberMap),
          scenesPerPoint: scriptData.scenesPerPoint,
          currentPlotPointSceneCount: scriptData.scenesPerPoint[plotPoint.title],
        });
        
        // If sceneNumber is still undefined, calculate it manually as fallback
        if (sceneNumber === undefined) {
          console.error('❌ [CRITICAL] sceneNumber is undefined! Using fallback calculation.');
          let fallbackNumber = 1;
          for (const point of scriptData.structure) {
            if (point.title === plotPoint.title) {
              sceneNumber = fallbackNumber + sceneIndex;
              console.log('✅ Fallback sceneNumber calculated:', sceneNumber);
              break;
            }
            const count = scriptData.scenesPerPoint[point.title] ?? 1;
            fallbackNumber += count;
          }
        }
        
        const existingScene = scriptData.generatedScenes[plotPoint.title]?.[sceneIndex];

        let scene;

        // Import services dynamically
        const { generateScene, refineScene, regenerateWithEdits } =
          await import('../services/geminiService');

        // Choose generation method based on mode
        switch (mode) {
          case 'refine':
            if (!existingScene) {
              throw new Error('ไม่พบฉากเดิมสำหรับการปรับปรุง');
            }
            scene = await refineScene(
              scriptData,
              plotPoint,
              existingScene,
              sceneIndex,
              scriptData.scenesPerPoint[plotPoint.title],
              sceneNumber
            );
            break;

          case 'use-edited':
            if (!existingScene) {
              throw new Error('ไม่พบฉากที่แก้ไขแล้ว');
            }
            scene = await regenerateWithEdits(
              scriptData,
              plotPoint,
              existingScene,
              sceneIndex,
              scriptData.scenesPerPoint[plotPoint.title],
              sceneNumber
            );
            break;

          case 'fresh':
          default:
            scene = await generateScene(
              scriptData,
              plotPoint,
              sceneIndex,
              scriptData.scenesPerPoint[plotPoint.title],
              sceneNumber
            );
            break;
        }

        // --- PSYCHOLOGY UPDATE START ---
        const updatedTimelines = { ...(scriptData.psychologyTimelines || {}) };
        const updatedCharacters = [...scriptData.characters];

        // Find characters present in this scene
        const presentCharNames = scene.sceneDesign.characters;

        console.log(`🧠 [Psychology] Scene has characters:`, presentCharNames);
        console.log(
          `🧠 [Psychology] Available characters:`,
          updatedCharacters.map(c => ({ name: c.name, id: c.id }))
        );

        presentCharNames.forEach(charName => {
          // Normalize strings for matching (trim whitespace, normalize Unicode)
          const normalizedSceneName = charName.trim().normalize('NFC');
          
          // Try exact match first
          let charIndex = updatedCharacters.findIndex(c => 
            c.name.trim().normalize('NFC') === normalizedSceneName
          );
          
          // If exact match fails, try partial match (contains or is contained by)
          if (charIndex === -1) {
            charIndex = updatedCharacters.findIndex(c => {
              const normalizedChar = c.name.trim().normalize('NFC');
              // Check if one name contains the other (for cases like "ลินดา" vs "ลินดา พิชชากร")
              return normalizedChar.includes(normalizedSceneName) || 
                     normalizedSceneName.includes(normalizedChar);
            });
          }
          
          // If still no match, try matching just the first name
          if (charIndex === -1) {
            const firstName = normalizedSceneName.split(/\s+/)[0];
            charIndex = updatedCharacters.findIndex(c => {
              const charFirstName = c.name.trim().normalize('NFC').split(/\s+/)[0];
              return charFirstName === firstName;
            });
          }
          
          if (charIndex === -1) {
            console.warn(`⚠️ [Psychology] Character "${charName}" not found in characters list`);
            console.warn(`   Scene name (normalized): "${normalizedSceneName}"`);
            console.warn(`   Available names (normalized):`, 
              updatedCharacters.map(c => c.name.trim().normalize('NFC'))
            );
            return;
          }

          const character = updatedCharacters[charIndex];
          console.log(`🧠 [Psychology] Processing ${character.name} (ID: ${character.id})`);

          const timeline = updatedTimelines[character.id] || {
            characterId: character.id,
            characterName: character.name,
            snapshots: [] as PsychologySnapshot[],
            changes: [] as PsychologyChange[],
            summary: {
              total_kusala: 0,
              total_akusala: 0,
              net_progress: 0,
              dominant_pattern: 'สมดุล',
            },
            overallArc: {
              startingBalance: 0,
              endingBalance: 0,
              totalChange: 0,
              direction: 'คงที่' as const,
              interpretation: 'เริ่มเก็บข้อมูล',
            },
          };

          const result = updatePsychologyTimeline(timeline, character, scene, plotPoint.title, sceneNumber);

          console.log(`🧠 [Psychology] ✅ CREATED timeline for ${character.name}:`, {
            sceneNumber: sceneNumber, // Use the parameter, not scene.sceneNumber
            snapshotsCount: result.timeline.snapshots.length,
            changesCount: result.timeline.changes.length,
            latestSnapshot: result.timeline.snapshots.length > 0 ? {
              sceneNumber: result.timeline.snapshots[result.timeline.snapshots.length - 1]?.sceneNumber,
              mentalBalance: result.timeline.snapshots[result.timeline.snapshots.length - 1]?.mentalBalance,
            } : null,
            summary: result.timeline.summary,
          });

          updatedTimelines[character.id] = result.timeline;
          updatedCharacters[charIndex] = result.updatedCharacter;
        });

        console.log(`🧠 [Psychology] Final timelines:`, Object.keys(updatedTimelines));
        console.log(`🧠 [Psychology] 💾 SAVING to scriptData:`, {
          timelinesCount: Object.keys(updatedTimelines).length,
          characterIds: Object.keys(updatedTimelines),
          snapshotsPerCharacter: Object.entries(updatedTimelines).map(([id, tl]: [string, any]) => ({
            characterId: id,
            characterName: tl.characterName,
            snapshotsCount: tl.snapshots?.length || 0,
          })),
        });
        // --- PSYCHOLOGY UPDATE END ---

        // ✅ FIX: Add sceneNumber to scene object for later retrieval
        const sceneWithNumber = {
          ...scene,
          sceneNumber, // Store the scene number for psychology snapshot lookup
        };

        // Update progress to 95% before saving
        clearInterval(progressInterval);
        setSceneGenerationProgress(prev => ({ ...prev, [sceneKey]: 95 }));

        setScriptData(prev => {
          const newScenesForPoint = [...(prev.generatedScenes[plotPoint.title] || [])];
          newScenesForPoint[sceneIndex] = sceneWithNumber;
          return {
            ...prev,
            generatedScenes: { ...prev.generatedScenes, [plotPoint.title]: newScenesForPoint },
            psychologyTimelines: updatedTimelines,
            characters: updatedCharacters,
          };
        });
        
        // Update progress to 100%
        setSceneGenerationProgress(prev => ({ ...prev, [sceneKey]: 100 }));
        
        setGenerationStatus(prev => ({
          ...prev,
          [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'done' },
        }));
        
        // Clear progress after brief delay
        setTimeout(() => {
          setSceneGenerationProgress(prev => {
            const newPrev = { ...prev };
            delete newPrev[sceneKey];
            return newPrev;
          });
        }, 1000);
      } catch (e: any) {
        console.error('❌ Error generating scene:', e);
        clearInterval(progressInterval);
        setSceneGenerationProgress(prev => {
          const newPrev = { ...prev };
          delete newPrev[sceneKey];
          return newPrev;
        });
        setGenerationStatus(prev => ({
          ...prev,
          [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'error' },
        }));
        setGlobalError(
          `Failed to generate "${plotPoint.title}" scene ${sceneIndex + 1}: ${e.message || 'Unknown error'}`
        );
        throw e; // Re-throw to stop batch generation
      }
    },
    [scriptData, setScriptData, sceneNumberMap, onRegisterUndo]
  );

  const allTasks = useMemo(() => {
    const tasks: { point: PlotPoint; sceneIndex: number }[] = [];
    scriptData.structure.forEach(point => {
      for (let i = 0; i < (scriptData.scenesPerPoint[point.title] ?? 1); i++) {
        if (
          generationStatus[point.title]?.[i] === 'pending' ||
          generationStatus[point.title]?.[i] === 'error' ||
          generationStatus[point.title]?.[i] === undefined
        ) {
          tasks.push({ point, sceneIndex: i });
        }
      }
    });
    return tasks;
  }, [scriptData.structure, scriptData.scenesPerPoint, generationStatus]);

  const handleGenerateAll = useCallback(async () => {
    if (onRegisterUndo) onRegisterUndo();
    setGlobalError(null);
    for (const task of allTasks) {
      try {
        await handleGenerateSingle(task.point, task.sceneIndex);
      } catch (e) {
        setGlobalError(`Failed to generate scene for "${task.point.title}". Generation paused.`);
        break;
      }
    }
  }, [allTasks, handleGenerateSingle, onRegisterUndo]);

  const downloadShotList = () => {
    const csv = generateShotListCSV(scriptData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${scriptData.title.replace(/\s+/g, '_')}_ShotList.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStoryboard = () => {
    const html = generateStoryboardHTML(scriptData);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${scriptData.title.replace(/\s+/g, '_')}_Storyboard.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadScreenplay = () => {
    const text = generateScreenplayText(scriptData);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scriptData.title.replace(/\s+/g, '_')}_Screenplay.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadScreenplayPDF = () => {
    // Generate screenplay HTML for PDF
    // Note: generateScreenplayText() not used in PDF generation

    // Create HTML content styled like a screenplay
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${scriptData.title} - Screenplay</title>
  <style>
    @page {
      size: A4;
      margin: 1in 1.5in;
    }
    body {
      font-family: 'Courier', 'Courier New', monospace;
      font-size: 12pt;
      line-height: 1.5;
      max-width: 6in;
      margin: 0 auto;
      padding: 1in 0;
    }
    .title-page {
      text-align: center;
      page-break-after: always;
      padding-top: 3in;
    }
    .title {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 1em;
      text-transform: uppercase;
    }
    .author {
      font-size: 12pt;
      margin: 1em 0;
    }
    .info {
      font-size: 10pt;
      margin-top: 2em;
      text-align: left;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    .scene-heading {
      font-weight: bold;
      margin-top: 2em;
      margin-bottom: 1em;
      text-transform: uppercase;
    }
    .action {
      margin: 1em 0;
      white-space: pre-wrap;
    }
    .character {
      margin-top: 1em;
      margin-left: 2in;
      text-transform: uppercase;
    }
    .dialogue {
      margin-left: 1.5in;
      margin-right: 1in;
      margin-bottom: 1em;
      white-space: pre-wrap;
    }
    .parenthetical {
      margin-left: 1.8in;
      margin-right: 1.2in;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="title-page">
    <div class="title">${scriptData.title}</div>
    <div class="author">by<br>Peace Script AI</div>
    <div class="info">
      <p><strong>Genre:</strong> ${scriptData.mainGenre}</p>
      <p><strong>Logline:</strong> ${scriptData.logLine}</p>
    </div>
  </div>

  ${scriptData.structure
    .map(point => {
      const scenes = scriptData.generatedScenes[point.title] || [];
      return scenes
        .map(scene => {
          const location = (scene.sceneDesign.location || 'INT. UNKNOWN - DAY').toUpperCase();

          return `
  <div class="scene-heading">${location}</div>
  
  ${scene.sceneDesign.situations
    .map(
      sit => `
    <div class="action">${sit.description}</div>
    
    ${sit.dialogue
      .map(
        d => `
      <div class="character">${d.character.toUpperCase()}</div>
      <div class="dialogue">${d.dialogue}</div>
    `
      )
      .join('')}
  `
    )
    .join('')}
      `;
        })
        .join('');
    })
    .join('')}

</body>
</html>
    `;

    // Create blob and download as HTML (user can print to PDF from browser)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scriptData.title.replace(/\s+/g, '_')}_Screenplay.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show instructions
    setTimeout(() => {
      setInfoModal({
        isOpen: true,
        title: '📄 ดาวน์โหลดเสร็จสิ้น',
        message: 'ไฟล์ HTML ถูกดาวน์โหลดแล้ว!\n\n💡 วิธีแปลงเป็น PDF:\n1. เปิดไฟล์ HTML ในเบราว์เซอร์\n2. กด Ctrl+P (Windows) หรือ Cmd+P (Mac)\n3. เลือก "Save as PDF"\n4. กด Save',
      });
    }, 500);
  };

  const handleSceneUpdate = (
    pointTitle: string,
    sceneIndex: number,
    updatedScene: GeneratedScene
  ) => {
    setScriptData(prev => {
      const newScenes = [...(prev.generatedScenes[pointTitle] || [])];
      newScenes[sceneIndex] = updatedScene;
      return {
        ...prev,
        generatedScenes: {
          ...prev.generatedScenes,
          [pointTitle]: newScenes,
        },
      };
    });
  };

  const handleAddScene = (pointTitle: string) => {
    if (onRegisterUndo) onRegisterUndo();
    const currentCount = scriptData.scenesPerPoint[pointTitle] || 0;
    const newIndex = currentCount;

    setScriptData(prev => ({
      ...prev,
      scenesPerPoint: {
        ...prev.scenesPerPoint,
        [pointTitle]: currentCount + 1,
      },
    }));

    setGenerationStatus(prev => ({
      ...prev,
      [pointTitle]: {
        ...prev[pointTitle],
        [newIndex]: 'pending',
      },
    }));
  };

  const handleRemoveScene = (pointTitle: string, sceneIndex: number) => {
    // Use actual scene count from generatedScenes array instead of scenesPerPoint
    const actualScenes = scriptData.generatedScenes[pointTitle] || [];
    const actualCount = actualScenes.length;
    const recordedCount = scriptData.scenesPerPoint[pointTitle] || 0;
    const currentCount = Math.max(actualCount, recordedCount);

    console.log('🗑️ handleRemoveScene called:', {
      pointTitle,
      sceneIndex,
      recordedCount,
      actualCount,
      currentCount,
    });

    if (currentCount <= 0 || sceneIndex < 0 || sceneIndex >= currentCount) {
      console.warn('❌ Cannot delete - invalid index:', { currentCount, sceneIndex });
      return;
    }

    const hasData = scriptData.generatedScenes[pointTitle]?.[sceneIndex];
    console.log('📊 Scene has data:', hasData ? 'YES' : 'NO');

    // Register Undo
    if (onRegisterUndo) onRegisterUndo();

    if (hasData) {
      const sceneNumberOffset = scriptData.structure
        .slice(
          0,
          scriptData.structure.findIndex(p => p.title === pointTitle)
        )
        .reduce((sum, p) => sum + (scriptData.scenesPerPoint[p.title] || 1), 0);
      const continuousSceneNumber = sceneNumberOffset + sceneIndex + 1;

      if (
        !window.confirm(
          `Are you sure you want to delete Scene ${continuousSceneNumber} in "${pointTitle}"? This cannot be undone.`
        )
      ) {
        console.log('❌ User cancelled deletion');
        return;
      }
    }

    console.log('✅ Proceeding with deletion...');

    setScriptData(prev => {
      const newScenes = prev.generatedScenes[pointTitle]
        ? [...prev.generatedScenes[pointTitle]]
        : [];
      
      // Get the scene before deletion to know which sceneNumber to remove
      const deletedScene = newScenes[sceneIndex];
      const deletedSceneNumber = deletedScene?.sceneNumber;
      
      if (newScenes.length > sceneIndex) {
        newScenes.splice(sceneIndex, 1);
      }

      console.log('🔄 Updated scenes:', {
        before: prev.generatedScenes[pointTitle]?.length || 0,
        after: newScenes.length,
        deletedSceneNumber,
      });

      // CLEANUP PSYCHOLOGY SNAPSHOTS AND CHANGES for deleted scene
      const updatedTimelines = { ...(prev.psychologyTimelines || {}) };
      
      // If no scenes left at all, clear all timelines
      const totalScenesLeft = Object.values(prev.generatedScenes).reduce(
        (sum, scenes) => sum + (scenes?.length || 0), 
        0
      ) - 1; // -1 because we're deleting one
      
      if (totalScenesLeft === 0) {
        console.log('🗑️ No scenes left - clearing all psychology timelines');
        Object.keys(updatedTimelines).forEach(key => delete updatedTimelines[key]);
      } else if (deletedSceneNumber !== undefined) {
        let removedSnapshotsCount = 0;
        let removedChangesCount = 0;
        
        Object.keys(updatedTimelines).forEach(characterId => {
          const timeline = updatedTimelines[characterId];
          
          // Remove snapshots for this scene
          if (timeline?.snapshots) {
            const originalSnapshotsLength = timeline.snapshots.length;
            timeline.snapshots = timeline.snapshots.filter(
              snapshot => snapshot.sceneNumber !== deletedSceneNumber
            );
            const newSnapshotsLength = timeline.snapshots.length;
            if (newSnapshotsLength < originalSnapshotsLength) {
              removedSnapshotsCount++;
              console.log(`🧹 Removed snapshot for scene ${deletedSceneNumber} from character ${characterId}`);
            }
          }
          
          // Remove changes for this scene
          if (timeline?.changes) {
            const originalChangesLength = timeline.changes.length;
            timeline.changes = timeline.changes.filter(
              change => change.sceneNumber !== deletedSceneNumber
            );
            const newChangesLength = timeline.changes.length;
            if (newChangesLength < originalChangesLength) {
              removedChangesCount++;
              console.log(`🧹 Removed ${originalChangesLength - newChangesLength} change(s) for scene ${deletedSceneNumber} from character ${characterId}`);
            }
          }
          
          // Recalculate summary after cleanup
          if (timeline?.changes) {
            // Sum the actual consciousness/defilement changes, not just count them
            const totalKusala = timeline.changes
              .filter(c => c.karma_type === 'กุศลกรรม')
              .reduce((sum, change) => {
                const consciousnessDelta = Object.values(change.consciousness_delta).reduce((s, v) => s + Math.abs(v), 0);
                return sum + consciousnessDelta;
              }, 0);
            
            const totalAkusala = timeline.changes
              .filter(c => c.karma_type === 'อกุศลกรรม')
              .reduce((sum, change) => {
                const defilementDelta = Object.values(change.defilement_delta).reduce((s, v) => s + Math.abs(v), 0);
                return sum + defilementDelta;
              }, 0);
            
            timeline.summary = {
              total_kusala: Math.round(totalKusala),
              total_akusala: Math.round(totalAkusala),
              net_progress: Math.round(totalKusala - totalAkusala),
              dominant_pattern:
                totalKusala > totalAkusala
                  ? 'กุศลเด่น'
                  : totalAkusala > totalKusala
                    ? 'อกุศลเด่น'
                    : 'สมดุล',
            };
          }
        });
        
        // Remove empty timelines (no snapshots left)
        const timelinesBeforeCleanup = Object.keys(updatedTimelines).length;
        Object.keys(updatedTimelines).forEach(characterId => {
          const timeline = updatedTimelines[characterId];
          if (!timeline?.snapshots || timeline.snapshots.length === 0) {
            delete updatedTimelines[characterId];
            console.log(`🗑️ Removed empty timeline for character ${characterId}`);
          }
        });
        const timelinesAfterCleanup = Object.keys(updatedTimelines).length;
        
        if (removedSnapshotsCount > 0 || removedChangesCount > 0) {
          console.log(`✅ Cleaned up ${removedSnapshotsCount} snapshots and ${removedChangesCount} changes for scene ${deletedSceneNumber}`);
        }
        
        if (timelinesBeforeCleanup > timelinesAfterCleanup) {
          console.log(`🗑️ Removed ${timelinesBeforeCleanup - timelinesAfterCleanup} empty timeline(s)`);
        }
      }

      return {
        ...prev,
        scenesPerPoint: {
          ...prev.scenesPerPoint,
          [pointTitle]: Math.max(0, newScenes.length),
        },
        generatedScenes: {
          ...prev.generatedScenes,
          [pointTitle]: newScenes,
        },
        psychologyTimelines: updatedTimelines,
      };
    });

    // Reindex generation status
    setGenerationStatus(prev => {
      const oldStatusGroup = { ...(prev[pointTitle] || {}) };
      const newStatusGroup: Record<number, Status> = {};

      Object.keys(oldStatusGroup).forEach(key => {
        const idx = parseInt(key);
        if (idx < sceneIndex) {
          newStatusGroup[idx] = oldStatusGroup[idx];
        } else if (idx > sceneIndex) {
          newStatusGroup[idx - 1] = oldStatusGroup[idx];
        }
        // Skip sceneIndex (deleted scene)
      });

      return {
        ...prev,
        [pointTitle]: newStatusGroup,
      };
    });
  };

  const allDone = allTasks.length === 0;
  const isLoading = Object.values(generationStatus).some(pointStatus =>
    Object.values(pointStatus).includes('loading')
  );

  const getButtonForScene = (point: PlotPoint, sceneIndex: number) => {
    const status = generationStatus[point.title]?.[sceneIndex];
    const sceneKey = `${point.title}-${sceneIndex}`;
    const progress = sceneGenerationProgress[sceneKey];
    
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 font-semibold">Generating...</span>
              <span className="text-[10px] font-bold text-cyan-400">
                {Math.round(progress || 0)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress || 0}%` }}
              ></div>
            </div>
          </div>
        );
      case 'done':
        return (
          <button
            type="button"
            onClick={() => setRegenerateModal({ isOpen: true, plotPoint: point, sceneIndex })}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md"
          >
            Regenerate
          </button>
        );
      case 'error':
        return (
          <button
            type="button"
            onClick={() => {
              void handleGenerateSingle(point, sceneIndex, 'fresh').catch(() => {
                // Error already surfaced via globalError state.
              });
            }}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md"
          >
            Retry
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={() => {
              void handleGenerateSingle(point, sceneIndex, 'fresh').catch(() => {
                // Error already surfaced via globalError state.
              });
            }}
            className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded-md"
          >
            Generate
          </button>
        );
    }
  };

  // Check if scene has edits (simple check: compare with original)
  const hasSceneEdits = (point: PlotPoint, sceneIndex: number): boolean => {
    const scene = scriptData.generatedScenes[point.title]?.[sceneIndex];
    // For now, assume if scene exists, it might have edits
    // In the future, could track edit history
    return !!scene;
  };

  return (
    <div className="p-6 animate-fade-in pb-24">
      {/* 🎬 Advanced Motion Editor Modal - Full-featured editor with timeline */}
      {showMotionEditorModal &&
        editingShotIndex !== null &&
        (() => {
          // Get current shot data with FULL CONTEXT
          const allShots: Array<{
            shot: any;
            sceneTitle: string;
            sceneIndex: number;
            shotIndex: number;
            sceneData: GeneratedScene;
          }> = [];
          scriptData.structure.forEach(point => {
            const scenesInPoint = scriptData.scenesPerPoint[point.title] || 1;
            Array.from({ length: scenesInPoint }).forEach((_, sceneIndex) => {
              const sceneData = scriptData.generatedScenes[point.title]?.[sceneIndex];
              if (sceneData?.shotList) {
                sceneData.shotList.forEach((shot, shotIndex) => {
                  allShots.push({
                    shot,
                    sceneTitle: point.title,
                    sceneIndex,
                    shotIndex,
                    sceneData,
                  });
                });
              }
            });
          });

          const currentShot = allShots[editingShotIndex];

          return (
            <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm overflow-auto">
              <MotionEditorPage
                scriptData={scriptData}
                shotId={currentShot?.shot?.shot?.toString() || editingShotIndex.toString()}
                onSave={updatedShot => {
                  console.log('Shot updated:', updatedShot);
                  // TODO: Save updated shot data back to scriptData
                  setShowMotionEditorModal(false);
                }}
                onClose={() => setShowMotionEditorModal(false)}
              />
            </div>
          );
        })()}

      {/* Regenerate Options Modal */}
      <RegenerateOptionsModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal({ isOpen: false, plotPoint: null, sceneIndex: -1 })}
        onConfirm={(mode: RegenerationMode) => {
          if (regenerateModal.plotPoint) {
            void handleGenerateSingle(
              regenerateModal.plotPoint,
              regenerateModal.sceneIndex,
              mode
            ).catch(() => {
              // Error already surfaced via globalError state.
            });
          }
        }}
        sceneName={
          regenerateModal.plotPoint
            ? scriptData.generatedScenes[regenerateModal.plotPoint.title]?.[
                regenerateModal.sceneIndex
              ]?.sceneDesign?.sceneName ||
              `${regenerateModal.plotPoint.title} - Scene ${regenerateModal.sceneIndex + 1}`
            : 'Unknown Scene'
        }
        hasEdits={
          regenerateModal.plotPoint
            ? hasSceneEdits(regenerateModal.plotPoint, regenerateModal.sceneIndex)
            : false
        }
      />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            {t('step5.title')}
          </h2>
          <p className="text-gray-400 mt-1">{t('step5.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <PermissionGuard permission="canEdit" userRole={userRole}>
            {!allDone && (
              <button
                onClick={handleGenerateAll}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white px-6 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                {isLoading
                  ? t('step5.buttons.generating')
                  : `${t('step5.buttons.generateAll')} (${allTasks.length})`}
              </button>
            )}
          </PermissionGuard>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {showPreview ? t('step5.buttons.hidePreview') : t('step5.buttons.showPreview')}
          </button>

          <PermissionGuard permission="canExport" userRole={userRole}>
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2 font-bold"
              >
                <span>{t('step5.buttons.export')}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      downloadScreenplayPDF();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-200 text-sm border-b border-gray-700"
                  >
                    📄 Screenplay (PDF/HTML)
                  </button>
                  <button
                    onClick={() => {
                      downloadScreenplay();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-200 text-sm border-b border-gray-700"
                  >
                    📝 Screenplay (TXT)
                  </button>
                  <button
                    onClick={() => {
                      setInfoModal({
                        isOpen: true,
                        title: '🎬 Export Info',
                        message: t('step5.export.finalDraftNote'),
                      });
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-200 text-sm border-b border-gray-700"
                  >
                    🎬 Export as Final Draft (.fdx)
                  </button>
                  <button
                    onClick={() => {
                      downloadShotList();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-200 text-sm border-b border-gray-700"
                  >
                    📊 Export Shot List (.csv)
                  </button>
                  <button
                    onClick={() => {
                      downloadStoryboard();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-200 text-sm"
                  >
                    🎨 Export Storyboard (.html)
                  </button>
                </div>
              )}
            </div>
          </PermissionGuard>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {globalError}
        </div>
      )}

      {/* 🎯 Main Tabs Navigation (Step5 Level - Outside Equilibrium) */}
      <div className="mb-6 bg-gray-900/50 rounded-lg border border-gray-700 p-1">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMainTab('sceneDesign')}
            title="Scene organization and structure (Alt+1)"
            className={`flex-1 py-4 px-6 font-bold text-base transition-all relative group rounded-lg ${
              mainTab === 'sceneDesign'
                ? 'text-cyan-400 bg-gray-800/80 shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">📝 Scene Design</span>
            {mainTab === 'sceneDesign' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-b-lg"></div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('simulation')}
            title="Character psychology timeline (Alt+2)"
            className={`flex-1 py-4 px-6 font-bold text-base transition-all relative group rounded-lg ${
              mainTab === 'simulation'
                ? 'text-purple-400 bg-gray-800/80 shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">🎭 Simulation</span>
            {mainTab === 'simulation' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-lg"></div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('motionEditor')}
            title="Professional cinematic controls (Alt+3)"
            className={`flex-1 py-4 px-6 font-bold text-base transition-all relative group rounded-lg ${
              mainTab === 'motionEditor'
                ? 'text-green-400 bg-gray-800/80 shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">🎬 Motion Editor</span>
            {mainTab === 'motionEditor' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-teal-500 rounded-b-lg"></div>
            )}
          </button>
        </div>
      </div>

      {/* 📌 Scene Design Tab - Equilibrium Structure */}
      {mainTab === 'sceneDesign' && (
        <div className="space-y-8">
          {scriptData.structure.map((point, pointIndex) => {
            // Calculate continuous scene number
            let sceneNumberOffset = 0;
            for (let i = 0; i < pointIndex; i++) {
              sceneNumberOffset += scriptData.scenesPerPoint[scriptData.structure[i].title] || 1;
            }

            return (
              <div
                key={pointIndex}
                className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
              >
                <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    {point.title}
                  </h3>
                  <button
                    onClick={() => handleAddScene(point.title)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Add Scene
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {Array.from({ length: scriptData.scenesPerPoint[point.title] || 1 }).map(
                    (_, sceneIndex) => {
                      const sceneData = scriptData.generatedScenes[point.title]?.[sceneIndex];
                      const status = generationStatus[point.title]?.[sceneIndex] || 'pending';
                      const continuousSceneNumber = sceneNumberOffset + sceneIndex + 1;
                      const totalScenesInPoint = scriptData.scenesPerPoint[point.title] || 1;

                      return (
                        <div
                          key={sceneIndex}
                          id={`scene-${point.title.replace(/\s+/g, '-')}-${sceneIndex}`}
                          className="relative group"
                        >
                          <SceneItem
                            sceneIndex={sceneIndex}
                            sceneNumber={continuousSceneNumber}
                            isPart={totalScenesInPoint > 1}
                            status={status}
                            sceneData={sceneData}
                            button={getButtonForScene(point, sceneIndex)}
                            onUpdate={updated =>
                              handleSceneUpdate(point.title, sceneIndex, updated)
                            }
                            onRegisterUndo={onRegisterUndo}
                            _goToStep={_goToStep}
                            onNavigateToCharacter={onNavigateToCharacter}
                            pointTitle={point.title}
                            onDelete={() => handleRemoveScene(point.title, sceneIndex)}
                            canDelete={true}
                            scriptData={scriptData}
                            isRegenerateLocationModalOpen={isRegenerateLocationModalOpen}
                            setIsRegenerateLocationModalOpen={setIsRegenerateLocationModalOpen}
                            isRegeneratingAllLocation={isRegeneratingAllLocation}
                            locationRegenerationProgress={locationRegenerationProgress}
                            handleRegenerateAllLocationDetails={(mode) =>
                              handleRegenerateAllLocationDetails(mode, point.title, sceneIndex, sceneData!)
                            }
                            locationImageAlbum={locationImageAlbum}
                            selectedLocationImageId={selectedLocationImageId}
                            isGeneratingLocationImage={isGeneratingLocationImage}
                            onSelectLocationImage={(id) => {
                              setSelectedLocationImageId(id);
                              
                              // Optionally save selection to scriptData
                              setScriptData(prev => {
                                const scenes = prev.generatedScenes[point.title] || [];
                                const currentScene = scenes[sceneIndex];
                                
                                if (!currentScene) return prev;
                                
                                const updatedScenes = [...scenes];
                                updatedScenes[sceneIndex] = {
                                  ...currentScene,
                                  sceneDesign: {
                                    ...currentScene.sceneDesign,
                                    selectedLocationImageId: id,
                                  },
                                };
                                
                                return {
                                  ...prev,
                                  generatedScenes: {
                                    ...prev.generatedScenes,
                                    [point.title]: updatedScenes,
                                  },
                                };
                              });
                            }}
                            onDeleteLocationImage={(id) => {
                              // Update local state
                              setLocationImageAlbum(prev => prev.filter(img => img.id !== id));
                              if (selectedLocationImageId === id) {
                                const remaining = locationImageAlbum.filter(img => img.id !== id);
                                setSelectedLocationImageId(remaining[0]?.id || null);
                              }
                              
                              // Save to scriptData
                              setScriptData(prev => {
                                const scenes = prev.generatedScenes[point.title] || [];
                                const currentScene = scenes[sceneIndex];
                                
                                if (!currentScene) return prev;
                                
                                const updatedAlbum = (currentScene.sceneDesign?.locationImageAlbum || [])
                                  .filter(img => img.id !== id);
                                
                                const updatedScenes = [...scenes];
                                updatedScenes[sceneIndex] = {
                                  ...currentScene,
                                  sceneDesign: {
                                    ...currentScene.sceneDesign,
                                    locationImageAlbum: updatedAlbum,
                                  },
                                };
                                
                                return {
                                  ...prev,
                                  generatedScenes: {
                                    ...prev.generatedScenes,
                                    [point.title]: updatedScenes,
                                  },
                                };
                              });
                              
                              // Save the scene data
                              if (onRegisterUndo) {
                                onRegisterUndo();
                              }
                            }}
                            handleGenerateLocationImage={() => handleGenerateLocationImage(
                              sceneData?.sceneDesign?.locationDetails,
                              sceneData?.sceneDesign?.location || 'INT. UNKNOWN - DAY',
                              point.title,
                              sceneIndex
                            )}
                          />

                          {/* Psychology Timeline for this scene */}
                          {sceneData &&
                            sceneData.sceneDesign?.characters &&
                            sceneData.sceneDesign.characters.length > 0 && (
                              <div className="mt-4 bg-gray-900/30 rounded-lg border border-purple-500/20 p-4">
                                <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                                  <span>📈</span>
                                  <span>Character Psychology in This Scene</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {sceneData.sceneDesign.characters.map((charName, idx) => {
                                    try {
                                      if (!charName || typeof charName !== 'string') {
                                        console.warn(
                                          '[Psychology] Invalid character name:',
                                          charName
                                        );
                                        return null;
                                      }

                                      // Enhanced character matching: exact match or fuzzy match
                                      const character = scriptData.characters.find(
                                        c =>
                                          c.name === charName ||
                                          c.name.includes(charName) ||
                                          charName.includes(c.name)
                                      );
                                      if (!character) {
                                        // Silently skip characters not found (may be from old project data)
                                        return null;
                                      }

                                      const timeline =
                                        scriptData.psychologyTimelines?.[character.id] ||
                                        scriptData.psychologyTimelines?.[character.name];
                                      if (!timeline || typeof timeline !== 'object') {
                                        // Silently skip if no timeline data
                                        return null;
                                        return null;
                                      }
                                      if (
                                        !timeline.snapshots ||
                                        !Array.isArray(timeline.snapshots) ||
                                        timeline.snapshots.length === 0
                                      ) {
                                        console.warn(
                                          '[Psychology] No snapshots for:',
                                          character.name
                                        );
                                        return (
                                          <div
                                            key={idx}
                                            className="bg-gray-800/50 rounded-lg border border-purple-500/30 p-3"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              {character.image && (
                                                <img
                                                  src={character.image}
                                                  alt={character.name}
                                                  className="w-8 h-8 rounded-full object-cover border border-purple-400"
                                                />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-purple-300 truncate">
                                                  {character.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                  {character.role}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-xs text-center py-4 space-y-2">
                                              <div className="text-gray-400">
                                                🧠 ไม่พบข้อมูลจิตวิทยาสำหรับฉากนี้
                                              </div>
                                              <div className="text-gray-500 text-[10px]">
                                                กรุณาสร้างฉากใหม่เพื่ออัพเดทข้อมูลจิตวิทยา
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }

                                      // CRITICAL FIX: Use stored sceneNumber (from generation) with fallback to calculated continuousSceneNumber
                                      // Priority: sceneData.sceneNumber > continuousSceneNumber
                                      const actualSceneNumber = sceneData.sceneNumber ?? continuousSceneNumber;
                                      
                                      console.log('[Psychology] 🔍 SNAPSHOT SEARCH:', {
                                        character: character.name,
                                        actualSceneNumber,
                                        sceneDataHasSceneNumber: 'sceneNumber' in sceneData,
                                        storedSceneNumber: sceneData.sceneNumber,
                                        calculatedContinuousNumber: continuousSceneNumber,
                                        snapshotsCount: timeline.snapshots?.length || 0,
                                        timelineExists: !!timeline,
                                        availableSnapshots: (timeline.snapshots || []).map(s => ({
                                          sceneNumber: s?.sceneNumber,
                                          hasMentalBalance: typeof s?.mentalBalance === 'number',
                                        })),
                                      });

                                      const foundSnapshot = timeline.snapshots.find(
                                        s =>
                                          s &&
                                          typeof s === 'object' &&
                                          s.sceneNumber === actualSceneNumber &&
                                          typeof s.mentalBalance === 'number'
                                      );
                                      
                                      console.log('[Psychology] 🎯 FOUND SNAPSHOT:', foundSnapshot ? {
                                        sceneNumber: foundSnapshot.sceneNumber,
                                        mentalBalance: foundSnapshot.mentalBalance,
                                        hasData: !!foundSnapshot
                                      } : 'NOT FOUND');

                                      // CRITICAL: Create immutable references to prevent race conditions
                                      if (
                                        !foundSnapshot ||
                                        typeof foundSnapshot !== 'object' ||
                                        typeof foundSnapshot.mentalBalance !== 'number'
                                      ) {
                                        console.warn(
                                          '[Psychology] No valid snapshot found for scene',
                                          actualSceneNumber,
                                          '(continuous:',
                                          continuousSceneNumber,
                                          ') character',
                                          character.name
                                        );
                                        return (
                                          <div
                                            key={idx}
                                            className="bg-gray-800/50 rounded-lg border border-purple-500/30 p-3"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              {character.image && (
                                                <img
                                                  src={character.image}
                                                  alt={character.name}
                                                  className="w-8 h-8 rounded-full object-cover border border-purple-400"
                                                />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-purple-300 truncate">
                                                  {character.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                  {character.role}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-xs text-center py-4 space-y-2">
                                              <div className="text-yellow-400">
                                                ⚠️ ข้อมูลสำหรับฉากนี้ไม่พร้อม
                                              </div>
                                              <div className="text-gray-500 text-[10px]">
                                                Timeline: {timeline.snapshots?.length || 0} snapshots | Looking for scene #{actualSceneNumber}
                                              </div>
                                              <div className="text-gray-600 text-[9px]">
                                                ลอง: สร้างฉากใหม่ หรือ Regenerate ฉากนี้
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Create immutable snapshot reference
                                      const snapshot = {
                                        mentalBalance: foundSnapshot.mentalBalance,
                                        total_kusala_kamma: foundSnapshot.total_kusala_kamma,
                                        total_akusala_kamma: foundSnapshot.total_akusala_kamma,
                                        magga_stage: foundSnapshot.magga_stage,
                                      };

                                      return (
                                        <div
                                          key={idx}
                                          className="bg-gray-800/50 rounded-lg border border-purple-500/30 p-3"
                                        >
                                          <div className="flex items-center gap-2 mb-2">
                                            {character.image && (
                                              <img
                                                src={character.image}
                                                alt={character.name}
                                                className="w-8 h-8 rounded-full object-cover border border-purple-400"
                                              />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-bold text-purple-300 truncate">
                                                {character.name}
                                              </div>
                                              <div className="text-xs text-gray-500 truncate">
                                                {character.role}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Always show psychology data since we validated snapshot above */}
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-gray-400">
                                                Mental Balance
                                              </span>
                                              <span
                                                className={`text-sm font-bold ${
                                                  snapshot.mentalBalance >= 20
                                                    ? 'text-green-400'
                                                    : snapshot.mentalBalance >= 0
                                                      ? 'text-blue-400'
                                                      : snapshot.mentalBalance >= -20
                                                        ? 'text-yellow-400'
                                                        : 'text-red-400'
                                                }`}
                                              >
                                                {snapshot.mentalBalance}
                                              </span>
                                            </div>

                                            {(typeof snapshot.total_kusala_kamma === 'number' ||
                                              typeof snapshot.total_akusala_kamma === 'number') && (
                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-green-900/20 border border-green-500/30 rounded px-2 py-1 text-center">
                                                  <div className="text-green-400">
                                                    {snapshot.total_kusala_kamma || 0}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500">
                                                    Consciousness
                                                  </div>
                                                </div>
                                                <div className="bg-red-900/20 border border-red-500/30 rounded px-2 py-1 text-center">
                                                  <div className="text-red-400">
                                                    {snapshot.total_akusala_kamma || 0}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500">
                                                    Defilement
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {snapshot.magga_stage &&
                                              typeof snapshot.magga_stage === 'string' && (
                                                <div className="text-xs bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30 text-purple-300 text-center">
                                                  {snapshot.magga_stage}
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      );
                                    } catch (error) {
                                      console.error(
                                        'Error rendering scene psychology card:',
                                        error
                                      );
                                      return null;
                                    }
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🎭 Simulation Tab - Character Psychology Timeline */}
      {mainTab === 'simulation' && (
        <div className="p-6 bg-gray-900/30 rounded-lg border border-gray-700 min-h-[600px]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">
              🎭 Character Psychology Timeline
            </h2>
            <p className="text-gray-400 text-sm">
              Track psychological changes of all characters across scenes
            </p>
          </div>

          {/* Psychology Timeline Content */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
            {Object.keys(scriptData.psychologyTimelines || {}).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Psychology Data Yet</h3>
                <p className="text-gray-500">
                  Generate scenes to start tracking character psychology changes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(scriptData.psychologyTimelines || {}).map(
                  ([charId, timeline]: [string, any]) => {
                    try {
                      // Strict validation
                      if (!timeline || typeof timeline !== 'object') return null;
                      if (!timeline.snapshots || !Array.isArray(timeline.snapshots)) return null;
                      if (!timeline.summary || typeof timeline.summary !== 'object') return null;

                      // Create immutable references
                      const snapshots = (timeline.snapshots || []).filter(
                        (s: any) =>
                          s &&
                          typeof s === 'object' &&
                          typeof s.mentalBalance === 'number' &&
                          typeof s.sceneNumber === 'number'
                      );
                      const summary = timeline.summary;
                      const overallArc = timeline.overallArc;

                      const character = scriptData.characters.find(
                        (c: any) => c.id === charId || c.name === charId
                      );
                      if (!character) return null;

                      return (
                        <div
                          key={charId}
                          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-purple-500/30 overflow-hidden shadow-xl hover:shadow-purple-500/20 transition-all cursor-pointer hover:scale-105 hover:border-purple-400/50"
                          onClick={() => {
                            if (onNavigateToCharacter) {
                              onNavigateToCharacter(character.name, 5, undefined);
                            }
                          }}
                          title={`Click to view ${character.name}'s details`}
                        >
                          {/* Character Header */}
                          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 p-4 border-b border-purple-500/30">
                            <div className="flex items-center gap-3 mb-2">
                              {character.image && (
                                <img
                                  src={character.image}
                                  alt={character.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-lg"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-purple-300 truncate">
                                  {character.name}
                                </h3>
                                <p className="text-xs text-gray-400 truncate">{character.role}</p>
                              </div>
                            </div>
                            <div className="flex gap-4 text-center">
                              <div className="flex-1">
                                <div className="text-xs text-gray-500">Scenes</div>
                                <div className="text-xl font-bold text-cyan-400">
                                  {snapshots.length}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-500">Changes</div>
                                <div className="text-xl font-bold text-pink-400">
                                  {timeline.changes?.length || 0}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          {summary && (
                            <>
                              {console.log('[Timeline Display] Summary:', {
                                character: character.name,
                                total_kusala: summary.total_kusala,
                                total_akusala: summary.total_akusala,
                                net_progress: summary.net_progress,
                                dominant_pattern: summary.dominant_pattern,
                              })}
                              <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-700">
                                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 text-center">
                                  <div className="text-[10px] text-green-400 mb-1">Kusala Changes</div>
                                  <div className="text-lg font-bold text-green-300">
                                    {summary.total_kusala || 0}
                                  </div>
                                </div>
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-center">
                                  <div className="text-[10px] text-red-400 mb-1">Akusala Changes</div>
                                  <div className="text-lg font-bold text-red-300">
                                    {summary.total_akusala || 0}
                                  </div>
                                </div>
                                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-center">
                                  <div className="text-[10px] text-blue-400 mb-1">Net</div>
                                  <div
                                    className={`text-lg font-bold ${(summary.net_progress || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}
                                  >
                                    {(summary.net_progress || 0) >= 0 ? '+' : ''}
                                    {summary.net_progress || 0}
                                  </div>
                                </div>
                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2 text-center">
                                  <div className="text-[10px] text-purple-400 mb-1">Pattern</div>
                                  <div className="text-xs font-bold text-purple-300 truncate">
                                    {summary.dominant_pattern || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Overall Arc - Compact */}
                          {overallArc &&
                            overallArc.startingBalance !== undefined &&
                            overallArc.endingBalance !== undefined && (
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-gray-400">
                                    Character Arc
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                      overallArc.direction === 'กุศลขึ้น'
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        : overallArc.direction === 'กุศลลง'
                                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                    }`}
                                  >
                                    {overallArc.direction || 'N/A'}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-8 bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold z-10">
                                    <span className="text-gray-400">
                                      {overallArc.startingBalance}
                                    </span>
                                    <span className="text-cyan-300">→</span>
                                    <span className="text-white">{overallArc.endingBalance}</span>
                                  </div>
                                  <div
                                    className={`absolute left-0 top-0 h-full transition-all ${
                                      (overallArc.totalChange || 0) >= 0
                                        ? 'bg-gradient-to-r from-green-600/50 to-green-500/50'
                                        : 'bg-gradient-to-r from-red-600/50 to-red-500/50'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.abs((overallArc.endingBalance + 100) / 2))}%`,
                                    }}
                                  />
                                </div>

                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                  {overallArc.interpretation || 'No interpretation available'}
                                </p>
                              </div>
                            )}

                          {/* Mini Timeline Preview */}
                          {snapshots && snapshots.length > 0 && (
                            <div className="p-4 pt-0">
                              <div className="text-xs font-bold text-gray-400 mb-2">
                                Scene Journey
                              </div>
                              <div className="flex gap-1 overflow-x-auto pb-1">
                                {snapshots.map((snapshot: any, idx: number) => {
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex-shrink-0 w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold ${
                                        snapshot.mentalBalance >= 20
                                          ? 'bg-green-500/20 border-green-500 text-green-300'
                                          : snapshot.mentalBalance >= 0
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                            : snapshot.mentalBalance >= -20
                                              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                                              : 'bg-red-500/20 border-red-500 text-red-300'
                                      }`}
                                      title={`Scene ${snapshot.sceneNumber}: Balance ${snapshot.mentalBalance}`}
                                    >
                                      {snapshot.sceneNumber}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering psychology card:', error);
                      return null;
                    }
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎬 Motion Editor Tab - All Shots */}
      {mainTab === 'motionEditor' && (
        <div className="p-6 bg-gray-900/30 rounded-lg border border-gray-700 min-h-[600px]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-green-400 mb-2">🎬 Motion Editor</h2>
            <p className="text-gray-400 text-sm">
              Professional cinematic camera controls for all shots
            </p>
          </div>

          {(() => {
            // Collect all shots from all scenes with FULL CONTEXT
            const allShots: Array<{
              shot: any;
              sceneTitle: string;
              sceneIndex: number;
              shotIndex: number;
              sceneData: GeneratedScene; // 🎯 NEW: Full scene data for AI context
            }> = [];
            scriptData.structure.forEach(point => {
              const scenesInPoint = scriptData.scenesPerPoint[point.title] || 1;
              Array.from({ length: scenesInPoint }).forEach((_, sceneIndex) => {
                const sceneData = scriptData.generatedScenes[point.title]?.[sceneIndex];
                if (sceneData?.shotList) {
                  sceneData.shotList.forEach((shot, shotIndex) => {
                    allShots.push({
                      shot,
                      sceneTitle: point.title,
                      sceneIndex,
                      shotIndex,
                      sceneData,
                    });
                  });
                }
              });
            });

            return allShots.length > 0 ? (
              <>
                {/* Always show MotionEditor for current shot */}
                {allShots[editingShotIndex ?? 0] && (
                  <div>
                    {/* Header with Advanced Editor button */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-green-400">
                        {allShots[editingShotIndex ?? 0].sceneTitle} - Shot{' '}
                        {(editingShotIndex ?? 0) + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowMotionEditorModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
                        title="Full-featured motion editor with timeline, keyframes, and camera controls"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        🎬 Open Advanced Motion Editor
                      </button>
                    </div>

                    {/* Shot Info */}
                    <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
                      <p className="text-gray-400 text-sm mb-2">
                        <strong>Description:</strong>{' '}
                        {allShots[editingShotIndex ?? 0].shot.description}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                          <strong>Size:</strong> {allShots[editingShotIndex ?? 0].shot.shotSize}
                        </div>
                        <div>
                          <strong>Movement:</strong> {allShots[editingShotIndex ?? 0].shot.movement}
                        </div>
                        <div>
                          <strong>Duration:</strong>{' '}
                          {allShots[editingShotIndex ?? 0].shot.durationSec}s
                        </div>
                        <div>
                          <strong>Equipment:</strong>{' '}
                          {allShots[editingShotIndex ?? 0].shot.equipment}
                        </div>
                      </div>
                    </div>

                    {/* 🎨 Preview & Generate Section */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* Image Preview */}
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Image Preview
                        </h4>
                        {(() => {
                          const currentShot = allShots[editingShotIndex ?? 0];
                          const sceneData =
                            scriptData.generatedScenes[currentShot.sceneTitle]?.[
                              currentShot.sceneIndex
                            ];
                          const storyboardItem = sceneData?.storyboard?.find(s =>
                            isSameShotNumber(s.shot, currentShot.shot.shot)
                          );

                          return (
                            <>
                              {storyboardItem?.image ? (
                                <div className="mb-3">
                                  <img
                                    src={storyboardItem.image}
                                    alt={`Shot ${currentShot.shot.shot} preview`}
                                    className="w-full h-48 object-cover rounded-lg border border-gray-600"
                                  />
                                </div>
                              ) : (
                                <div className="mb-3 h-48 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                                  <p className="text-gray-500 text-sm">No image generated yet</p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const currentShot = allShots[editingShotIndex ?? 0];
                                  if (!currentShot) return;

                                  const sceneData =
                                    scriptData.generatedScenes[currentShot.sceneTitle]?.[
                                      currentShot.sceneIndex
                                    ];
                                  if (!sceneData) return;

                                  await handleMotionEditorGenerateImage(currentShot, sceneData);
                                }}
                                disabled={motionEditorGeneratingImage}
                                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate storyboard image for this shot using AI"
                              >
                                {motionEditorGeneratingImage ? (
                                  <>
                                    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Generating... {motionEditorProgress}%</span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    🎨 Generate Image
                                  </>
                                )}
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      {/* Video Preview */}
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Video Preview
                        </h4>
                        {(() => {
                          const currentShot = allShots[editingShotIndex ?? 0];
                          const sceneData =
                            scriptData.generatedScenes[currentShot.sceneTitle]?.[
                              currentShot.sceneIndex
                            ];
                          const storyboardItem = sceneData?.storyboard?.find(s =>
                            isSameShotNumber(s.shot, currentShot.shot.shot)
                          );

                          return (
                            <>
                              {storyboardItem?.video ? (
                                <div className="mb-3">
                                  <video
                                    src={storyboardItem.video}
                                    controls
                                    className="w-full h-48 object-cover rounded-lg border border-gray-600 bg-black"
                                  />
                                </div>
                              ) : (
                                <div className="mb-3 h-48 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                                  <p className="text-gray-500 text-sm">No video generated yet</p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const currentShot = allShots[editingShotIndex ?? 0];
                                  if (!currentShot) return;

                                  const sceneData =
                                    scriptData.generatedScenes[currentShot.sceneTitle]?.[
                                      currentShot.sceneIndex
                                    ];
                                  if (!sceneData) return;

                                  await handleMotionEditorGenerateVideo(currentShot, sceneData);
                                }}
                                disabled={motionEditorGeneratingVideo}
                                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate video for this shot using AI"
                              >
                                {motionEditorGeneratingVideo ? (
                                  <>
                                    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    🎥 Generate Video
                                  </>
                                )}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 🎯 Shot Navigation Bar - Below Preview for Easy Access */}
                    <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-green-400">
                          📍 Shot {editingShotIndex !== null ? editingShotIndex + 1 : 1} of{' '}
                          {allShots.length}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newIdx = Math.max(0, (editingShotIndex ?? 0) - 1);
                              setEditingShotIndex(newIdx);
                            }}
                            disabled={editingShotIndex === 0}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newIdx = Math.min(
                                allShots.length - 1,
                                (editingShotIndex ?? 0) + 1
                              );
                              setEditingShotIndex(newIdx);
                            }}
                            disabled={editingShotIndex === allShots.length - 1}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {allShots.map((item, globalIdx) => (
                          <button
                            key={globalIdx}
                            type="button"
                            onClick={() => {
                              setEditingShotIndex(globalIdx);
                            }}
                            className={`flex-shrink-0 w-12 h-12 rounded-lg font-bold text-sm transition-all ${
                              editingShotIndex === globalIdx
                                ? 'bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-lg scale-110 ring-2 ring-green-400'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                            }`}
                            title={`${item.sceneTitle} - Shot ${item.shotIndex + 1}`}
                          >
                            {globalIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ⚡ Quick Motion Edit - Inline Editor */}
                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-lg font-bold text-green-400">⚡ Quick Motion Edit</h4>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                          Basic camera controls
                        </span>
                      </div>
                      <MotionEditor
                        initialMotionEdit={convertShotToMotionEdit(
                          allShots[editingShotIndex ?? 0].shot
                        )}
                        shotData={allShots[editingShotIndex ?? 0].shot}
                        sceneTitle={allShots[editingShotIndex ?? 0].sceneTitle}
                        shotNumber={(editingShotIndex ?? 0) + 1}
                        propList={allShots[editingShotIndex ?? 0].sceneData.propList}
                        sceneDetails={allShots[editingShotIndex ?? 0].sceneData.sceneDesign}
                        characterPsychology={scriptData.psychologyTimelines}
                        allCharacters={scriptData.characters}
                        onMotionChange={updatedMotion => {
                          const idx = editingShotIndex ?? 0;
                          handleMotionChange(
                            allShots[idx].sceneTitle,
                            allShots[idx].sceneIndex,
                            allShots[idx].shotIndex,
                            updatedMotion
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No shots available</p>
                <p className="text-sm mt-2">Generate scenes first in Scene Design tab</p>
              </div>
            );
          })()}
        </div>
      )}

      <div className="mt-12 flex justify-between border-t border-gray-700 pt-8">
        <button
          onClick={prevStep}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Structure
        </button>
      </div>

      {/* Live Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6 bg-gray-800/80 p-6 rounded-lg border border-cyan-500/30">
                <div>
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                    📜 Screenplay Preview
                  </h2>
                  <p className="text-gray-400 mt-2">{scriptData.title} - Live Preview</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      downloadScreenplay();
                    }}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg transition-all shadow-lg flex items-center gap-2 font-bold"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>ดาวน์โหลด</span>
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-all shadow-lg"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                <div
                  className="p-12 font-mono text-black"
                  style={{ fontFamily: 'Courier, monospace' }}
                >
                  <div className="text-center mb-24">
                    <div className="h-32"></div>
                    <h1 className="text-4xl font-bold mb-6">{scriptData.title.toUpperCase()}</h1>
                    <p className="text-lg mb-4">by</p>
                    <p className="text-lg mb-8">Peace Script AI</p>
                    <div className="text-sm space-y-2 max-w-md mx-auto text-left">
                      <p>
                        <strong>Genre:</strong> {scriptData.mainGenre}
                      </p>
                      <p>
                        <strong>Logline:</strong> {scriptData.logLine}
                      </p>
                    </div>
                  </div>

                  {scriptData.structure.map((point, pointIndex) => {
                    const scenes = scriptData.generatedScenes[point.title] || [];
                    return scenes.map((scene, sceneIdx) => (
                      <div key={`${pointIndex}-${sceneIdx}`} className="mb-12">
                        <div className="font-bold mb-4 text-base">
                          {(scene.sceneDesign.location || 'INT. UNKNOWN - DAY').toUpperCase()}
                        </div>

                        {scene.sceneDesign.situations.map((sit, sitIdx) => (
                          <div key={sitIdx} className="mb-6">
                            <p className="mb-4 text-sm leading-relaxed whitespace-pre-wrap">
                              {sit.description}
                            </p>

                            {sit.dialogue.map((d, dIdx) => (
                              <div key={dIdx} className="mb-4">
                                <div className="text-center mb-1 font-bold text-sm">
                                  {d.character.toUpperCase()}
                                </div>
                                <div className="mx-auto max-w-lg text-sm leading-relaxed">
                                  {d.dialogue}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ));
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Psychology Timeline removed - now in Simulation tab */}

      {/* 🎨 Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-cyan-500/30 animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{successModal.title}</h3>
                  <p className="text-cyan-100 text-sm mt-1">Operation completed successfully</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-300 text-lg mb-6 leading-relaxed whitespace-pre-line">
                {successModal.message}
              </p>

              {successModal.details && successModal.details.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-cyan-500/20">
                  <div className="grid grid-cols-1 gap-3">
                    {successModal.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-cyan-400 font-semibold min-w-[120px]">
                          {detail.label}:
                        </span>
                        <span className="text-gray-300">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (successModal.onClose) {
                    successModal.onClose();
                  }
                  setSuccessModal({ isOpen: false, title: '', message: '' });
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
              >
                {t('common.ok') || 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-red-500/30 animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{errorModal.title}</h3>
                  <p className="text-red-100 text-sm mt-1">Please check and try again</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-300 text-lg mb-6 leading-relaxed whitespace-pre-line">
                {errorModal.message}
              </p>

              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105"
              >
                {t('common.close') || 'ปิด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 Info Modal */}
      {infoModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-blue-500/30 animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{infoModal.title}</h3>
                  <p className="text-blue-100 text-sm mt-1">Information</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-300 text-lg mb-6 leading-relaxed whitespace-pre-line">
                {infoModal.message}
              </p>

              <button
                onClick={() => setInfoModal({ isOpen: false, title: '', message: '' })}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 hover:scale-105"
              >
                {t('common.ok') || 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step5Output;

// Force refresh 2

