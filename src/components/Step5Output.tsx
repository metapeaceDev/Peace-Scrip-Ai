import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  ScriptData,
  GeneratedScene,
  PlotPoint,
  Character,
  DialogueLine,
  PsychologySnapshot,
  PsychologyChange,
} from '../types';
import { useTranslation } from './LanguageSwitcher';
import {
  generateStoryboardImage,
  generateStoryboardVideo,
  VIDEO_MODELS_CONFIG,
} from '../services/geminiService';
import { updatePsychologyTimeline } from '../services/psychologyEvolution';
import { CHARACTER_IMAGE_STYLES } from '../constants';
import { hasAccessToModel } from '../services/userStore';
import { RegenerateOptionsModal, type RegenerationMode } from './RegenerateOptionsModal';
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
};

// Fixed headers to ensure all columns are shown even if data is missing
const SHOT_LIST_HEADERS = [
  'shot',
  'cast',
  'costume',
  'set',
  'description',
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
          `"${(shot.costume || '').replace(/"/g, '""')}"`,
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
        const shotInfo = scene.shotList.find(s => s.shot === sb.shot);
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
}> = ({
  sceneData,
  onSave,
  allCharacters,
  onRegisterUndo,
  onNavigateToCharacter,
  pointTitle,
  sceneIndex,
  scriptData,
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
  const [preferredVideoModel, setPreferredVideoModel] = useState<string>('auto');
  const [progress, setProgress] = useState(0);

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

    // 4. Override style for Video Generation (Realism) vs Image Generation (Selected Style)
    const styleInstruction = isVideo
      ? 'Cinematic, Photorealistic, 4K, High Quality, Motion'
      : storyboardStyle;

    // 5. Construct Rich Prompt with Psychology Enhancement
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
CAMERA SPECS: ${shotData.shotSize} Shot, ${shotData.perspective} Angle.
LIGHTING/MOOD: ${shotData.lightingDesign || 'Neutral'}, ${currentScene.sceneDesign.moodTone}.

IMPORTANT: Show the character's emotional and psychological state through facial expressions, body language, and overall presence. Ensure character consistency with physical and psychological descriptions.`;

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

      // Get characters involved in this scene
      const sceneCharacterNames = editedScene.sceneDesign?.characters || [];
      const sceneCharacters: Character[] = allCharacters.filter((c: Character) =>
        sceneCharacterNames.includes(c.name)
      );

      const base64Image = await generateStoryboardImage(prompt, sceneCharacters, p =>
        setProgress(p)
      );

      const oldStoryboardItem = editedScene.storyboard?.find(s => s.shot === shotNumber) || {};
      const newItem = { ...oldStoryboardItem, shot: shotNumber, image: base64Image };

      const updatedStoryboard = [
        ...(editedScene.storyboard?.filter(s => s.shot !== shotNumber) || []),
        newItem,
      ];

      const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
      setEditedScene(updatedScene);

      // Immediate Save
      if (!isEditing) onSave(updatedScene);
    } catch (error) {
      alert('Failed to generate image. Please try again.');
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
      alert('❌ ข้อมูลไม่ครบถ้วน: Shot description is required for video generation');
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

    setGeneratingVideoShotId(shotIndex);
    setCurrentVideoJobId(null); // Reset job ID
    setProgress(0);
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
        durationSec: shotData.durationSec
      });

      // Use existing image as base ONLY if useImage is true and image exists
      const existingImage = useImage
        ? editedScene.storyboard?.find(s => s.shot === shotNumber)?.image
        : undefined;

      // 🆕 Continuity: automatically use previous shot video (if available)
      const previousVideo =
        shotNumber > 1
          ? editedScene.storyboard?.find(s => s.shot === shotNumber - 1)?.video
          : undefined;

      // 🆕 Continuity: also pass previous shot metadata for prompt anchors
      const previousShot =
        shotNumber > 1
          ? editedScene.shotList?.find(s => s.shot === shotNumber - 1)
          : undefined;

      console.warn('  Has Base Image:', !!existingImage);
      console.warn('  Has Previous Video:', !!previousVideo);

      const { generateShotVideo } = await import('../services/videoGenerationService');

      const videoUri = await generateShotVideo(
        shotData,
        existingImage,
        {
          preferredModel: preferredVideoModel,
          previousVideo: typeof previousVideo === 'string' ? previousVideo : undefined,
          previousShot: previousShot as any,
          transitionType: 'smooth',
          character: scriptData.characters[0],
          currentScene: editedScene,
          // Pass aspect ratio / resolution through to downstream ComfyUI calls
          aspectRatio: videoAspectRatio,
          width: videoAspectRatio === 'custom' ? customWidth : undefined,
          height: videoAspectRatio === 'custom' ? customHeight : undefined,
        },
        p => {
          console.log(`🎬 UI Progress Update: ${Math.round(p)}%`);
          setProgress(p);
        }
      );

      // 🔍 DEBUG: Check video URL before saving
      console.warn('🎬 Step5Output - Video Result:', videoUri);
      console.warn('🎬 Step5Output - Type:', typeof videoUri);
      console.warn('🎬 Step5Output - Length:', videoUri?.length);

      const oldStoryboardItem = editedScene.storyboard?.find(s => s.shot === shotNumber) || {
        shot: shotNumber,
        image: '',
      };
      const newItem = { ...oldStoryboardItem, video: videoUri };

      const updatedStoryboard = [
        ...(editedScene.storyboard?.filter(s => s.shot !== shotNumber) || []),
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

      alert(`Failed to generate video: ${errorMessage}`);
    } finally {
      setGeneratingVideoShotId(null);
      setCurrentVideoJobId(null);
      setProgress(0);
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
        alert('✅ Video generation cancelled successfully');
        console.log('✅ Cancellation result:', result);
      } else {
        alert(`⚠️ Cancellation result: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to cancel video job:', error);
      alert(`❌ Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      alert('No shots available to generate images for.');
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
      if (currentSceneState.storyboard?.some(s => s.shot === shotNumber)) continue;

      setGeneratingShotId(i); // Update UI to show which shot is generating
      setProgress(0);
      try {
        const prompt = buildPrompt(shot, currentSceneState, false);

        // Get characters involved in this scene
        const sceneCharacterNames = currentSceneState.sceneDesign?.characters || [];
        const sceneCharacters: Character[] = allCharacters.filter((c: Character) =>
          sceneCharacterNames.includes(c.name)
        );

        const base64Image = await generateStoryboardImage(prompt, sceneCharacters, p =>
          setProgress(p)
        );

        // Update local accumulation object
        const oldItem = currentSceneState.storyboard?.find(s => s.shot === shotNumber) || {};
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
      alert('Auto-generation stopped by user.');
    } else {
      alert('Batch generation complete!');
    }
  };

  const handleDeleteShotImage = (shotNumber: number) => {
    if (confirmDeleteShotId === shotNumber) {
      if (onRegisterUndo) onRegisterUndo();
      setEditedScene(prev => {
        const newStoryboard = (prev.storyboard || []).filter(s => s.shot !== shotNumber);
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
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
          <tr>
            {headers.map(h => (
              <th key={h} scope="col" className="px-4 py-3 min-w-[150px] whitespace-nowrap">
                {h.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
            {/* Add Actions column for Shot List, Prop List, and Breakdown */}
            {(section === 'shotList' || section === 'propList' || section === 'breakdown') &&
              isEditing && (
                <th scope="col" className="px-4 py-3 min-w-[100px] whitespace-nowrap text-center">
                  Actions
                </th>
              )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-t border-gray-700 hover:bg-gray-800/50 even:bg-gray-800/30"
            >
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
              {/* Delete button for Shot List, Prop List, and Breakdown */}
              {(section === 'shotList' || section === 'propList' || section === 'breakdown') &&
                isEditing && (
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (section === 'shotList') {
                          handleDeleteShotListItem(i);
                        } else if (section === 'propList') {
                          handleDeletePropListItem(i);
                        } else if (section === 'breakdown' && subSection) {
                          handleDeleteBreakdownItem(subSection, i);
                        }
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        (section === 'shotList' && confirmDeleteShotListId === i) ||
                        (section === 'propList' && confirmDeletePropId === i) ||
                        (section === 'breakdown' &&
                          confirmDeleteBreakdownId?.part === subSection &&
                          confirmDeleteBreakdownId?.index === i)
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                      }`}
                      title={
                        (section === 'shotList' && confirmDeleteShotListId === i) ||
                        (section === 'propList' && confirmDeletePropId === i) ||
                        (section === 'breakdown' &&
                          confirmDeleteBreakdownId?.part === subSection &&
                          confirmDeleteBreakdownId?.index === i)
                          ? 'Click again to confirm'
                          : 'Delete item'
                      }
                    >
                      {(section === 'shotList' && confirmDeleteShotListId === i) ||
                      (section === 'propList' && confirmDeletePropId === i) ||
                      (section === 'breakdown' &&
                        confirmDeleteBreakdownId?.part === subSection &&
                        confirmDeleteBreakdownId?.index === i) ? (
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
                  </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // List of characters available in the project but NOT yet in the scene
  const availableCharactersToAdd = allCharacters.filter(
    c => !editedScene.sceneDesign.characters.includes(c.name)
  );

  return (
    <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600 fade-in-scene relative">
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
                className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
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
                      const profile = allCharacters.find(c => c.name === charName);
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
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-500">
                                  {charName.substring(0, 2).toUpperCase()}
                                </span>
                              )}
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
                {/* 1. Scene Header (Location Box) */}
                <div className="bg-black/40 border border-cyan-900/50 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-700">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest text-center">
                      Scene Header
                    </h4>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center">
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
                        <div className="flex-[2] bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                          <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">
                            LOCATION
                          </span>
                          <span className="font-mono text-xs font-bold text-white break-words leading-tight">
                            {displayLocation.name}
                          </span>
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
                                          alert('ไม่สามารถแปลงภาษาได้ กรุณาลองใหม่');
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
            {isEditing && (editedScene.shotList?.length || 0) > 0 && (
              <div className="flex justify-end">
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

              <div className="flex gap-2 w-full sm:w-auto">
                {/* Clear All Storyboard button */}
                {(editedScene.storyboard?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllStoryboard}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                      confirmClearSection === 'storyboard'
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                    }`}
                    title={
                      confirmClearSection === 'storyboard'
                        ? 'Click again to confirm'
                        : 'Clear all storyboard images/videos'
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
                    {confirmClearSection === 'storyboard' ? 'Confirm?' : 'Clear All'}
                  </button>
                )}
                {isGeneratingAll ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    STOP GENERATION
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateAllShots}
                    disabled={isGeneratingAll}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Auto-Generate All Missing Shots
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(editedScene.shotList?.length || 0) > 0 ? (
                (editedScene.shotList || []).map((shot, idx) => {
                  const shotImg = editedScene.storyboard?.find(s => s.shot === shot.shot)?.image;
                  const shotVideo = editedScene.storyboard?.find(s => s.shot === shot.shot)?.video;
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
                              {isGeneratingVideo ? 'Rendering Video...' : 'Painting...'}
                            </span>
                            {progress > 0 && (
                              <div className="w-3/4 h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400 transition-all duration-300 ease-out"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                            {progress > 0 && (
                              <span className="text-cyan-400 text-[10px] mt-1">
                                {Math.round(progress)}%
                              </span>
                            )}
                            {/* 🆕 Minimal Cancel Button */}
                            {isGeneratingVideo && currentVideoJobId && (
                              <button
                                type="button"
                                onClick={handleCancelVideoGeneration}
                                className="mt-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 text-[10px] font-medium rounded transition-all backdrop-blur-sm"
                                title="Cancel video generation"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 inline-block mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Cancel
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
  allCharacters: Character[];
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
}> = ({
  sceneIndex,
  sceneNumber,
  isPart,
  status,
  sceneData,
  button,
  onUpdate,
  allCharacters,
  onRegisterUndo,
  _goToStep,
  onNavigateToCharacter,
  pointTitle,
  onDelete,
  canDelete,
  scriptData,
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
          <div className="w-24 h-6 text-center">{button}</div>
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
              allCharacters={allCharacters}
              onRegisterUndo={onRegisterUndo}
              _goToStep={_goToStep}
              onNavigateToCharacter={onNavigateToCharacter}
              pointTitle={pointTitle}
              sceneIndex={sceneIndex}
              scriptData={scriptData}
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

  // 🎬 Motion Editor - Generate Image Handler
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

      const base64Image = await generateStoryboardImage(prompt, sceneCharacters, p =>
        setMotionEditorProgress(p)
      );

      const oldStoryboardItem = sceneData.storyboard?.find(s => s.shot === shotNumber) || {};
      const newItem = { ...oldStoryboardItem, shot: shotNumber, image: base64Image };
      const updatedStoryboard = [
        ...(sceneData.storyboard?.filter(s => s.shot !== shotNumber) || []),
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
      alert('Failed to generate image. Please try again.');
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
      const prompt = `Cinematic video: ${shotDesc}. Camera: ${movement}. Duration: ${duration}s. ${currentShot.shot.shotSize}.`;

      // Use existing image if available
      const existingImage = sceneData.storyboard?.find(s => s.shot === shotNumber)?.image;

      const videoUri = await generateStoryboardVideo(
        prompt,
        existingImage,
        p => setMotionEditorProgress(p),
        'auto', // Use auto model selection
        {
          character: scriptData.characters[0],
          currentScene: sceneData,
          shotData: currentShot.shot,
          aspectRatio: '16:9',
          width: undefined,
          height: undefined,
        }
      );

      const oldStoryboardItem = sceneData.storyboard?.find(s => s.shot === shotNumber) || {
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
        ...(sceneData.storyboard?.filter(s => s.shot !== shotNumber) || []),
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
      alert('Failed to generate video. Please try again.');
      console.error(error);
    } finally {
      setMotionEditorGeneratingVideo(false);
      setMotionEditorProgress(0);
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
      try {
        const sceneNumber = sceneNumberMap[plotPoint.title][sceneIndex];
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
          const charIndex = updatedCharacters.findIndex(c => c.name === charName);
          if (charIndex === -1) {
            console.warn(`⚠️ [Psychology] Character "${charName}" not found in characters list`);
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

          const result = updatePsychologyTimeline(timeline, character, scene, plotPoint.title);

          console.log(`🧠 [Psychology] Updated timeline for ${character.name}:`, {
            snapshots: result.timeline.snapshots.length,
            changes: result.timeline.changes.length,
            summary: result.timeline.summary,
          });

          updatedTimelines[character.id] = result.timeline;
          updatedCharacters[charIndex] = result.updatedCharacter;
        });

        console.log(`🧠 [Psychology] Final timelines:`, Object.keys(updatedTimelines));
        // --- PSYCHOLOGY UPDATE END ---

        setScriptData(prev => {
          const newScenesForPoint = [...(prev.generatedScenes[plotPoint.title] || [])];
          newScenesForPoint[sceneIndex] = scene;
          return {
            ...prev,
            generatedScenes: { ...prev.generatedScenes, [plotPoint.title]: newScenesForPoint },
            psychologyTimelines: updatedTimelines,
            characters: updatedCharacters,
          };
        });
        setGenerationStatus(prev => ({
          ...prev,
          [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'done' },
        }));
      } catch (e: any) {
        console.error('❌ Error generating scene:', e);
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
      alert(
        '📄 ไฟล์ HTML ถูกดาวน์โหลดแล้ว!\n\n💡 วิธีแปลงเป็น PDF:\n1. เปิดไฟล์ HTML ในเบราว์เซอร์\n2. กด Ctrl+P (Windows) หรือ Cmd+P (Mac)\n3. เลือก "Save as PDF"\n4. กด Save'
      );
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
      if (newScenes.length > sceneIndex) {
        newScenes.splice(sceneIndex, 1);
      }

      console.log('🔄 Updated scenes:', {
        before: prev.generatedScenes[pointTitle]?.length || 0,
        after: newScenes.length,
      });

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
    switch (status) {
      case 'loading':
        return <LoadingSpinner />;
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
            void handleGenerateSingle(regenerateModal.plotPoint, regenerateModal.sceneIndex, mode).catch(() => {
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
                      alert(t('step5.export.finalDraftNote'));
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
                            allCharacters={scriptData.characters}
                            onRegisterUndo={onRegisterUndo}
                            _goToStep={_goToStep}
                            onNavigateToCharacter={onNavigateToCharacter}
                            pointTitle={point.title}
                            onDelete={() => handleRemoveScene(point.title, sceneIndex)}
                            canDelete={true}
                            scriptData={scriptData}
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
                                            <div className="text-xs text-gray-500 text-center py-2">
                                              No psychology data
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Use continuousSceneNumber directly instead of sceneNumberMap
                                      console.debug('[Psychology] Looking for snapshot:', {
                                        character: character.name,
                                        currentSceneNumber: continuousSceneNumber,
                                        snapshotsCount: timeline.snapshots?.length || 0,
                                        availableSnapshots: (timeline.snapshots || []).map(s => ({
                                          sceneNumber: s?.sceneNumber,
                                          hasMentalBalance: typeof s?.mentalBalance === 'number',
                                        })),
                                      });

                                      const foundSnapshot = timeline.snapshots.find(
                                        s =>
                                          s &&
                                          typeof s === 'object' &&
                                          s.sceneNumber === continuousSceneNumber &&
                                          typeof s.mentalBalance === 'number'
                                      );

                                      // CRITICAL: Create immutable references to prevent race conditions
                                      if (
                                        !foundSnapshot ||
                                        typeof foundSnapshot !== 'object' ||
                                        typeof foundSnapshot.mentalBalance !== 'number'
                                      ) {
                                        console.warn(
                                          '[Psychology] No valid snapshot found for scene',
                                          continuousSceneNumber,
                                          'character',
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
                                            <div className="text-xs text-gray-500 text-center py-2">
                                              No data for this scene
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
                                                    +{snapshot.total_kusala_kamma || 0}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500">
                                                    Kusala
                                                  </div>
                                                </div>
                                                <div className="bg-red-900/20 border border-red-500/30 rounded px-2 py-1 text-center">
                                                  <div className="text-red-400">
                                                    -{snapshot.total_akusala_kamma || 0}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500">
                                                    Akusala
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
                            <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-700">
                              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-green-400 mb-1">Kusala</div>
                                <div className="text-lg font-bold text-green-300">
                                  +{summary.total_kusala || 0}
                                </div>
                              </div>
                              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-red-400 mb-1">Akusala</div>
                                <div className="text-lg font-bold text-red-300">
                                  -{summary.total_akusala || 0}
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
                          const storyboardItem = sceneData?.storyboard?.find(
                            s => s.shot === currentShot.shot.shot
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
                          const storyboardItem = sceneData?.storyboard?.find(
                            s => s.shot === currentShot.shot.shot
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
    </div>
  );
};

export default Step5Output;

