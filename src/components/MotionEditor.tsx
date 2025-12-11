/**
 * MotionEditor Component
 * Professional motion control panel based on Peace Script Model v1.4
 * Features:
 * - 5 control panels (Shot Preview, Camera, Frame, Lighting, Sound)
 * - AI Director with auto-suggestions
 * - Manual override capability
 * - Integration with videoMotionEngine
 */

import React, { useState, useEffect } from 'react';
import { 
  MotionEdit, 
  CinematicSuggestions,
  CinematicOverrides,
  ShotType,
  CameraMovement,
  CameraPerspective,
  Equipment,
  FocalLength,
  ColorTemperature,
  DEFAULT_MOTION_EDIT,
  SHOT_PRESETS,
  CAMERA_MOVEMENT_DESCRIPTIONS
} from '../types/motionEdit';
import type { Character } from '../../types';

interface MotionEditorProps {
  character?: Character;
  initialMotionEdit?: MotionEdit;
  onMotionChange: (motion: MotionEdit) => void;
  aiSuggestions?: CinematicSuggestions;
  shotData?: any; // Shot data from scene (description, shotSize, movement, cast, costume, set)
  sceneTitle?: string;
  shotNumber?: number;
  // 🎯 NEW: Rich context data for AI generation
  propList?: { propArt: string; sceneSetDetails: string }[];
  sceneDetails?: {
    characters: string[];
    location: string;
    situations: { description: string; characterThoughts: string; dialogue: any[] }[];
    moodTone: string;
  };
  characterPsychology?: any; // Psychology timeline data for the character
  allCharacters?: Character[]; // All characters for context
}

export const MotionEditor: React.FC<MotionEditorProps> = ({
  character,
  initialMotionEdit,
  onMotionChange,
  aiSuggestions,
  shotData,
  sceneTitle,
  shotNumber,
  propList,
  sceneDetails,
  characterPsychology,
  allCharacters
}) => {
  const [motionEdit, setMotionEdit] = useState<MotionEdit>(
    initialMotionEdit || DEFAULT_MOTION_EDIT
  );
  const [useAI, setUseAI] = useState(true);
  const [activePanel, setActivePanel] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 📊 Analytics State
  const [analytics, setAnalytics] = useState({
    cameraMovementChanges: 0,
    lightingChanges: 0,
    aiSuggestionAccepted: 0,
    manualOverrides: 0,
    panelSwitches: 0,
    totalEdits: 0
  });

  // 🤖 AI Director - Generate missing fields with RICH CONTEXT
  const generateMissingFields = async () => {
    if (!shotData || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const missingFields = [];
      
      // Check which fields are empty
      if (!motionEdit.shot_preview_generator_panel.structure) missingFields.push('structure');
      if (!motionEdit.shot_preview_generator_panel.voiceover) missingFields.push('voiceover');
      if (!motionEdit.frame_control.foreground) missingFields.push('foreground');
      if (!motionEdit.frame_control.background) missingFields.push('background');
      if (!motionEdit.lighting_design.description) missingFields.push('lighting');
      if (!motionEdit.sounds.description) missingFields.push('sound');
      
      if (missingFields.length === 0) {
        alert('✅ All fields are already filled!');
        return;
      }
      
      // 🎯 Generate AI suggestions with FULL CONTEXT from Shot List, Prop List, Psychology, Timeline, Scene Details
      const aiGenerated = {
        structure: generateStructure(),
        voiceover: generateVoiceover(),
        foreground: generateForeground(shotData),
        background: generateBackground(shotData),
        lighting: generateLighting(shotData),
        sound: generateSound(shotData)
      };
      
      // Update motion edit with AI suggestions
      setMotionEdit(prev => ({
        ...prev,
        shot_preview_generator_panel: {
          ...prev.shot_preview_generator_panel,
          structure: prev.shot_preview_generator_panel.structure || aiGenerated.structure,
          voiceover: prev.shot_preview_generator_panel.voiceover || aiGenerated.voiceover
        },
        frame_control: {
          ...prev.frame_control,
          foreground: prev.frame_control.foreground || aiGenerated.foreground,
          background: prev.frame_control.background || aiGenerated.background
        },
        lighting_design: {
          ...prev.lighting_design,
          description: prev.lighting_design.description || aiGenerated.lighting
        },
        sounds: {
          ...prev.sounds,
          description: prev.sounds.description || aiGenerated.sound
        }
      }));
      
      trackAnalytics('ai_accepted');
      
      // 📊 Show detailed generation report
      const report = `✨ AI Director generated ${missingFields.length} fields:\n\n` +
        `📋 Context Used:\n` +
        `• Shot: ${shotData.shotSize} - ${shotData.movement}\n` +
        `• Scene: ${sceneTitle || 'Unknown'}\n` +
        `• Location: ${sceneDetails?.location || 'N/A'}\n` +
        `• Mood: ${sceneDetails?.moodTone || 'N/A'}\n` +
        `• Props: ${propList?.length || 0} items\n` +
        `• Characters: ${sceneDetails?.characters?.length || 0}\n\n` +
        `✅ Generated Fields: ${missingFields.join(', ')}`;
      
      alert(report);
    } catch (error) {
      console.error('AI generation error:', error);
      alert('❌ AI Director encountered an error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 🎭 Generate Structure based on cast and characters
  const generateStructure = (): string => {
    if (shotData.cast) {
      return shotData.cast;
    } else if (sceneDetails?.characters && sceneDetails.characters.length > 0) {
      return sceneDetails.characters.join(', ');
    } else if (character?.name) {
      return character.name;
    }
    return 'Main character';
  };
  
  // 🗣️ Generate Voiceover from situation descriptions
  const generateVoiceover = (): string => {
    if (sceneDetails?.situations && sceneDetails.situations.length > 0) {
      const thoughts = sceneDetails.situations[0].characterThoughts;
      if (thoughts) return thoughts;
      
      const dialogues = sceneDetails.situations[0].dialogue;
      if (dialogues && dialogues.length > 0) {
        return dialogues[0].text || shotData.description;
      }
    }
    return shotData.description || 'Scene narration';
  };
  
  // 🎯 Enhanced AI Generation Functions using ALL available context
  const generateForeground = (shot: any): string => {
    const shotSize = shot.shotSize || 'Medium Shot';
    let foreground = '';
    
    // Base on shot size
    if (shotSize.includes('Close') || shotSize.includes('CU')) {
      foreground = 'Subtle depth elements in soft focus';
    } else if (shotSize.includes('Wide') || shotSize.includes('LS') || shotSize.includes('EST')) {
      foreground = 'Environmental elements framing the scene';
    } else {
      foreground = 'Natural foreground elements adding depth';
    }
    
    // 📦 Enhance with Prop List details
    if (propList && propList.length > 0) {
      const props = propList[0];
      if (props.propArt) {
        foreground += `, ${props.propArt.split(',')[0] || 'props'} in foreground`;
      }
    }
    
    // 🎭 Enhance with Scene mood
    if (sceneDetails?.moodTone) {
      const mood = sceneDetails.moodTone.toLowerCase();
      if (mood.includes('tense') || mood.includes('suspense')) {
        foreground += ', creating tension with strategic shadows';
      } else if (mood.includes('peaceful') || mood.includes('calm')) {
        foreground += ', soft natural elements for tranquility';
      }
    }
    
    return foreground;
  };
  
  const generateBackground = (shot: any): string => {
    const perspective = shot.perspective || 'Neutral';
    let background = '';
    
    // Base on perspective
    if (perspective.includes('High')) {
      background = 'Expansive background visible from elevated angle';
    } else if (perspective.includes('Low') || perspective.includes('Worm')) {
      background = 'Dramatic sky or ceiling dominating background';
    } else {
      background = 'Well-composed background providing context';
    }
    
    // 📍 Enhance with Scene Location
    if (sceneDetails?.location) {
      const location = sceneDetails.location;
      if (location.includes('INT')) {
        // Interior scene
        if (propList && propList[0]?.sceneSetDetails) {
          background = `${propList[0].sceneSetDetails} in background`;
        } else {
          background += `, interior ${location.split('.')[1] || 'room'} details`;
        }
      } else if (location.includes('EXT')) {
        // Exterior scene
        background += `, outdoor ${location.split('.')[1] || 'environment'}`;
        if (location.includes('DAY')) {
          background += ' with natural daylight atmosphere';
        } else if (location.includes('NIGHT')) {
          background += ' with night ambiance';
        }
      }
    }
    
    // 🎨 Enhance with Set Details from Shot
    if (shot.set) {
      background += `, ${shot.set}`;
    }
    
    return background;
  };
  
  const generateLighting = (shot: any): string => {
    const shotSize = shot.shotSize || 'Medium Shot';
    let lighting = '';
    
    // Base on shot size
    if (shotSize.includes('Close') || shotSize.includes('CU')) {
      lighting = 'Soft directional lighting emphasizing facial features';
    } else if (shotSize.includes('Wide') || shotSize.includes('LS') || shotSize.includes('EST')) {
      lighting = 'Natural ambient lighting establishing the environment';
    } else {
      lighting = 'Balanced three-point lighting with natural shadows';
    }
    
    // 🌅 Enhance with Time of Day from Location
    if (sceneDetails?.location) {
      const loc = sceneDetails.location.toUpperCase();
      if (loc.includes('DAY') || loc.includes('MORNING')) {
        lighting += ', warm daylight color temperature (5500K)';
      } else if (loc.includes('NIGHT') || loc.includes('EVENING')) {
        lighting += ', cool night lighting (3200K) with practical lights';
      } else if (loc.includes('DAWN') || loc.includes('DUSK')) {
        lighting += ', golden hour warm tones (3500K)';
      }
    }
    
    // 🎭 Enhance with Scene Mood
    if (sceneDetails?.moodTone) {
      const mood = sceneDetails.moodTone.toLowerCase();
      if (mood.includes('tense') || mood.includes('dark') || mood.includes('suspense')) {
        lighting += ', high contrast with dramatic shadows';
      } else if (mood.includes('happy') || mood.includes('joyful') || mood.includes('light')) {
        lighting += ', bright and evenly distributed';
      } else if (mood.includes('sad') || mood.includes('melancholy')) {
        lighting += ', low-key with soft shadows';
      } else if (mood.includes('romantic') || mood.includes('intimate')) {
        lighting += ', warm soft key with gentle fill';
      }
    }
    
    // 🧠 Enhance with Character Psychology
    if (characterPsychology && character) {
      const defilements = character.internal?.defilement;
      if (defilements) {
        const anger = defilements['โทสะ (Dosa - Anger)'] || 0;
        const confusion = defilements['โมหะ (Moha - Delusion)'] || 0;
        if (anger > 60) lighting += ', intense red-tinted practicals for inner turmoil';
        if (confusion > 60) lighting += ', diffused hazy atmosphere for mental state';
      }
    }
    
    return lighting;
  };
  
  const generateSound = (shot: any): string => {
    const movement = shot.movement || 'Static';
    let sound = '';
    
    // Base on camera movement
    if (movement === 'Handheld') {
      sound = 'Raw, immersive ambient sounds with subtle movement rustles';
    } else if (movement.includes('Dolly') || movement.includes('Track')) {
      sound = 'Smooth ambient sounds with gradual spatial audio shifts';
    } else if (movement.includes('Pan') || movement.includes('Tilt')) {
      sound = 'Directional ambient sound following camera movement';
    } else {
      sound = 'Clear ambient atmosphere with appropriate environmental sounds';
    }
    
    // 📍 Enhance with Location Environment
    if (sceneDetails?.location) {
      const loc = sceneDetails.location.toUpperCase();
      if (loc.includes('OFFICE') || loc.includes('ROOM')) {
        sound += ', keyboard typing, air conditioner hum';
      } else if (loc.includes('OUTDOOR') || loc.includes('PARK') || loc.includes('EXT')) {
        sound += ', birds chirping, wind rustling leaves, distant traffic';
      } else if (loc.includes('RESTAURANT') || loc.includes('CAFE')) {
        sound += ', crowd ambience, dishes clattering, background conversations';
      } else if (loc.includes('STREET') || loc.includes('CITY')) {
        sound += ', urban traffic, footsteps, city ambience';
      } else if (loc.includes('BEACH') || loc.includes('OCEAN')) {
        sound += ', waves crashing, seagulls, wind';
      }
    }
    
    // 🎬 Enhance with Scene Situation Actions
    if (sceneDetails?.situations && sceneDetails.situations.length > 0) {
      const situation = sceneDetails.situations[0].description.toLowerCase();
      if (situation.includes('fight') || situation.includes('action')) {
        sound += ', impact sounds, movement SFX';
      } else if (situation.includes('talk') || situation.includes('conversation')) {
        sound += ', clear dialogue space with minimal reverb';
      } else if (situation.includes('walk') || situation.includes('running')) {
        sound += ', footstep details matching surface';
      } else if (situation.includes('car') || situation.includes('vehicle')) {
        sound += ', engine sounds, road noise';
      }
    }
    
    // 📦 Enhance with Prop List
    if (propList && propList.length > 0 && propList[0].propArt) {
      const props = propList[0].propArt.toLowerCase();
      if (props.includes('phone')) sound += ', phone notification tones';
      if (props.includes('door')) sound += ', door opening/closing';
      if (props.includes('glass') || props.includes('cup')) sound += ', glass/ceramic handling';
      if (props.includes('paper') || props.includes('book')) sound += ', paper rustling';
    }
    
    // 🎭 Enhance with Mood for soundscape
    if (sceneDetails?.moodTone) {
      const mood = sceneDetails.moodTone.toLowerCase();
      if (mood.includes('tense') || mood.includes('suspense')) {
        sound += ', subtle tension drones';
      } else if (mood.includes('peaceful')) {
        sound += ', gentle calming tones';
      }
    }
    
    return sound;
  };

  // Track analytics
  const trackAnalytics = (action: string) => {
    setAnalytics(prev => {
      const updated = { ...prev, totalEdits: prev.totalEdits + 1 };
      
      switch(action) {
        case 'camera_movement':
          updated.cameraMovementChanges++;
          break;
        case 'lighting':
          updated.lightingChanges++;
          break;
        case 'ai_accepted':
          updated.aiSuggestionAccepted++;
          break;
        case 'manual_override':
          updated.manualOverrides++;
          break;
        case 'panel_switch':
          updated.panelSwitches++;
          break;
      }
      
      return updated;
    });
  };

  // Notify parent when motion changes
  useEffect(() => {
    onMotionChange(motionEdit);
  }, [motionEdit, onMotionChange]);

  // Apply AI suggestions when toggled
  useEffect(() => {
    if (useAI && aiSuggestions) {
      applyAISuggestions();
    }
  }, [useAI, aiSuggestions]);

  const applyAISuggestions = () => {
    if (!aiSuggestions) return;
    
    trackAnalytics('ai_accepted'); // 📊 Track AI usage
    
    setMotionEdit(prev => ({
      ...prev,
      camera_control: {
        ...prev.camera_control,
        movement: aiSuggestions.suggested_movement,
        focal_length: aiSuggestions.suggested_focal_length
      }
    }));
  };

  const handleShotTypeChange = (shotType: ShotType) => {
    trackAnalytics('manual_override'); // 📊 Track manual edit
    
    const preset = SHOT_PRESETS[shotType];
    setMotionEdit(prev => ({
      ...prev,
      shot_preview_generator_panel: {
        ...prev.shot_preview_generator_panel,
        shot_type: shotType
      },
      camera_control: {
        ...prev.camera_control,
        ...(preset?.camera_control || {})
      }
    }));
  };

  // Track panel switches
  const handlePanelChange = (panelId: number) => {
    trackAnalytics('panel_switch');
    setActivePanel(panelId);
  };

  const panels = [
    {
      id: 0,
      title: '🎬 Shot Preview',
      icon: '📸',
      description: 'Basic shot configuration',
      tooltip: 'Configure shot type and basic parameters'
    },
    {
      id: 1,
      title: '📹 Camera Control',
      icon: '🎥',
      description: 'Camera angles and movements',
      tooltip: 'Set camera movement, perspective, and equipment'
    },
    {
      id: 2,
      title: '🖼️ Frame Composition',
      icon: '🎨',
      description: '3-layer frame structure',
      tooltip: 'Define foreground, main object, and background layers'
    },
    {
      id: 3,
      title: '💡 Lighting Design',
      icon: '🔆',
      description: 'Lighting setup and mood',
      tooltip: 'Set lighting color temperature and mood'
    },
    {
      id: 4,
      title: '🔊 Sound Design',
      icon: '🎵',
      description: 'Audio and SFX',
      tooltip: 'Configure sound effects and ambient audio'
    }
  ];

  return (
    <div className="motion-editor bg-gray-900 text-white rounded-xl shadow-2xl">
      {/* Header with AI Toggle & Analytics */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-bold">Motion Editor</h2>
          <p className="text-gray-400 text-sm mt-1">
            Professional cinematic control
            {character && ` • ${character.name}`}
          </p>
        </div>
        
        {/* AI Director Toggle & Stats */}
        <div className="flex items-center gap-4">
          {/* 📊 Analytics Display */}
          {analytics.totalEdits > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-xs">
                <span className="text-gray-500">Edits: </span>
                <span className="text-cyan-400 font-bold">{analytics.totalEdits}</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">AI: </span>
                <span className="text-purple-400 font-bold">{analytics.aiSuggestionAccepted}</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Manual: </span>
                <span className="text-green-400 font-bold">{analytics.manualOverrides}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              setUseAI(!useAI);
              trackAnalytics(useAI ? 'manual_override' : 'ai_accepted');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              useAI 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {useAI ? '🤖 AI Director' : '✋ Manual Control'}
          </button>
          
          {/* 🎯 Generate All Fields Button - New AI Director Feature */}
          {useAI && (
            <button
              onClick={generateMissingFields}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isGenerating
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate All</span>
                </>
              )}
            </button>
          )}
          
          {useAI && aiSuggestions && (
            <div className="text-xs text-gray-400">
              Confidence: {(aiSuggestions.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Panel Navigation with Tooltips */}
      <div className="flex border-b border-gray-700 overflow-x-auto relative">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => handlePanelChange(panel.id)}
            onMouseEnter={() => setShowTooltip(panel.tooltip || '')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`flex-1 min-w-[150px] px-4 py-3 text-sm font-medium transition-all relative ${
              activePanel === panel.id
                ? 'bg-gray-800 text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
            title={panel.tooltip}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">{panel.icon}</span>
              <span className="hidden md:inline">{panel.title}</span>
            </div>
          </button>
        ))}
        
        {/* Floating Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-950 border border-purple-500/50 rounded-lg text-xs text-gray-300 whitespace-nowrap z-50 shadow-lg">
            {showTooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-950"></div>
          </div>
        )}
      </div>

      {/* Panel Content */}
      <div className="p-6 min-h-[400px]">
        {/* Panel 1: Shot Preview */}
        {activePanel === 0 && (
          <ShotPreviewPanel
            data={motionEdit.shot_preview_generator_panel}
            character={character}
            onChange={(data) => setMotionEdit(prev => ({
              ...prev,
              shot_preview_generator_panel: data
            }))}
            onShotTypeChange={handleShotTypeChange}
          />
        )}

        {/* Panel 2: Camera Control */}
        {activePanel === 1 && (
          <CameraControlPanel
            data={motionEdit.camera_control}
            useAI={useAI}
            aiSuggestion={aiSuggestions?.suggested_camera}
            onChange={(data) => {
              trackAnalytics('camera_movement');
              setMotionEdit(prev => ({
                ...prev,
                camera_control: data
              }));
            }}
          />
        )}

        {/* Panel 3: Frame Composition */}
        {activePanel === 2 && (
          <FrameCompositionPanel
            data={motionEdit.frame_control}
            onChange={(data) => setMotionEdit(prev => ({
              ...prev,
              frame_control: data
            }))}
          />
        )}

        {/* Panel 4: Lighting Design */}
        {activePanel === 3 && (
          <LightingDesignPanel
            data={motionEdit.lighting_design}
            useAI={useAI}
            aiSuggestion={aiSuggestions?.suggested_lighting}
            onChange={(data) => {
              trackAnalytics('lighting');
              setMotionEdit(prev => ({
                ...prev,
                lighting_design: data
              }));
            }}
          />
        )}

        {/* Panel 5: Sound Design */}
        {activePanel === 4 && (
          <SoundDesignPanel
            data={motionEdit.sounds}
            useAI={useAI}
            aiSuggestion={aiSuggestions?.suggested_sound}
            onChange={(data) => setMotionEdit(prev => ({
              ...prev,
              sounds: data
            }))}
          />
        )}
      </div>

      {/* Footer with Preview */}
      <div className="border-t border-gray-700 p-4 bg-gray-800/50">
        <div className="text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">Current Setup:</span>
            <span>{motionEdit.shot_preview_generator_panel.shot_type}</span>
            <span>•</span>
            <span>{motionEdit.camera_control.movement}</span>
            <span>•</span>
            <span>{motionEdit.camera_control.focal_length}</span>
            <span>•</span>
            <span>{motionEdit.lighting_design.color_temperature}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SUB-PANELS
// ============================================

interface ShotPreviewPanelProps {
  data: MotionEdit['shot_preview_generator_panel'];
  character?: Character;
  onChange: (data: MotionEdit['shot_preview_generator_panel']) => void;
  onShotTypeChange: (shotType: ShotType) => void;
}

const ShotPreviewPanel: React.FC<ShotPreviewPanelProps> = ({
  data,
  character,
  onChange,
  onShotTypeChange
}) => {
  const shotTypes: ShotType[] = [
    'Wide Shot',
    'Medium Shot',
    'Close-up',
    'Extreme Close-up',
    'Over-the-Shoulder',
    'Two Shot'
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Shot Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shotTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                onChange({ ...data, shot_type: type });
                onShotTypeChange(type);
              }}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                data.shot_type === type
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Character/Structure
        </label>
        <input
          type="text"
          value={data.structure}
          onChange={(e) => onChange({ ...data, structure: e.target.value })}
          placeholder={character?.name || 'Enter character name'}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Scene Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.prompt}
          onChange={(e) => onChange({ ...data, prompt: e.target.value })}
          placeholder="Describe what's happening in this shot..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Voiceover/Narration (Optional)
        </label>
        <textarea
          value={data.voiceover || ''}
          onChange={(e) => onChange({ ...data, voiceover: e.target.value })}
          placeholder="Enter voiceover text or leave empty..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
};

interface CameraControlPanelProps {
  data: MotionEdit['camera_control'];
  useAI: boolean;
  aiSuggestion?: string;
  onChange: (data: MotionEdit['camera_control']) => void;
}

const CameraControlPanel: React.FC<CameraControlPanelProps> = ({
  data,
  useAI,
  aiSuggestion,
  onChange
}) => {
  const perspectives: CameraPerspective[] = ['Neutral', 'High Angle', 'Low Angle', 'Bird Eye', 'Worm Eye', 'Dutch Angle', 'POV'];
  const movements: CameraMovement[] = ['Static', 'Pan', 'Tilt', 'Dolly', 'Track', 'Zoom', 'Handheld', 'Crane', 'Steadicam'];
  const equipments: Equipment[] = ['Tripod', 'Handheld', 'Dolly', 'Gimbal', 'Crane', 'Drone'];
  const focalLengths: FocalLength[] = ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm'];

  return (
    <div className="space-y-6">
      {/* AI Suggestion Banner */}
      {useAI && aiSuggestion && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <div className="font-medium text-purple-300 mb-1">AI Director Suggestion</div>
              <div className="text-sm text-gray-300">{aiSuggestion}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          Shot Description
        </label>
        <textarea
          value={data.shot_prompt}
          onChange={(e) => onChange({ ...data, shot_prompt: e.target.value })}
          placeholder="Describe how the camera captures this shot..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Perspective</label>
          <select
            value={data.perspective}
            onChange={(e) => onChange({ ...data, perspective: e.target.value as CameraPerspective })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {perspectives.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Equipment</label>
          <select
            value={data.equipment}
            onChange={(e) => onChange({ ...data, equipment: e.target.value as Equipment })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {equipments.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Camera Movement
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {movements.map((movement) => (
            <button
              key={movement}
              onClick={() => onChange({ ...data, movement })}
              title={CAMERA_MOVEMENT_DESCRIPTIONS[movement]}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                data.movement === movement
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {movement}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {CAMERA_MOVEMENT_DESCRIPTIONS[data.movement]}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Focal Length
        </label>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {focalLengths.map((focal) => (
            <button
              key={focal}
              onClick={() => onChange({ ...data, focal_length: focal })}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                data.focal_length === focal
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {focal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FrameCompositionPanelProps {
  data: MotionEdit['frame_control'];
  onChange: (data: MotionEdit['frame_control']) => void;
}

const FrameCompositionPanel: React.FC<FrameCompositionPanelProps> = ({
  data,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-300">
          <p className="font-medium mb-2">3-Layer Frame Structure:</p>
          <ul className="space-y-1 text-xs">
            <li>• <span className="text-purple-400">Foreground</span> - วัตถุหน้าเฟรม สร้างความลึก</li>
            <li>• <span className="text-purple-400">Main Object</span> - วัตถุหลัก จุดโฟกัส</li>
            <li>• <span className="text-purple-400">Background</span> - พื้นหลัง สร้างบริบท</li>
          </ul>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          🎭 Foreground (Layer 1)
        </label>
        <textarea
          value={data.foreground}
          onChange={(e) => onChange({ ...data, foreground: e.target.value })}
          placeholder="e.g., Coffee cup on desk, blurred window frame..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          🎯 Main Object (Layer 2) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.object}
          onChange={(e) => onChange({ ...data, object: e.target.value })}
          placeholder="e.g., Character sitting at computer, focused expression..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          🌄 Background (Layer 3)
        </label>
        <textarea
          value={data.background}
          onChange={(e) => onChange({ ...data, background: e.target.value })}
          placeholder="e.g., Soft-colored walls, window with daylight streaming in..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
};

interface LightingDesignPanelProps {
  data: MotionEdit['lighting_design'];
  useAI: boolean;
  aiSuggestion?: string;
  onChange: (data: MotionEdit['lighting_design']) => void;
}

const LightingDesignPanel: React.FC<LightingDesignPanelProps> = ({
  data,
  useAI,
  aiSuggestion,
  onChange
}) => {
  const colorTemps: ColorTemperature[] = ['Warm', 'Neutral', 'Cool'];
  const moods = ['Bright', 'Dim', 'Dark', 'Dramatic'] as const;

  return (
    <div className="space-y-6">
      {useAI && aiSuggestion && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <div className="font-medium text-purple-300 mb-1">AI Lighting Suggestion</div>
              <div className="text-sm text-gray-300">{aiSuggestion}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          Lighting Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="e.g., Natural light from window on the side, creating soft shadows..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Color Temperature</label>
          <div className="grid grid-cols-3 gap-2">
            {colorTemps.map((temp) => (
              <button
                key={temp}
                onClick={() => onChange({ ...data, color_temperature: temp })}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  data.color_temperature === temp
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {temp}
                <div className="text-xs opacity-70 mt-1">
                  {temp === 'Warm' && '3000K'}
                  {temp === 'Neutral' && '5500K'}
                  {temp === 'Cool' && '6500K'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mood</label>
          <div className="grid grid-cols-2 gap-2">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => onChange({ ...data, mood })}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  data.mood === mood
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SoundDesignPanelProps {
  data: MotionEdit['sounds'];
  useAI: boolean;
  aiSuggestion?: string;
  onChange: (data: MotionEdit['sounds']) => void;
}

const SoundDesignPanel: React.FC<SoundDesignPanelProps> = ({
  data,
  useAI,
  aiSuggestion,
  onChange
}) => {
  return (
    <div className="space-y-6">
      {useAI && aiSuggestion && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <div className="font-medium text-purple-300 mb-1">AI Sound Suggestion</div>
              <div className="text-sm text-gray-300">{aiSuggestion}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-lg p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.auto_sfx}
            onChange={(e) => onChange({ ...data, auto_sfx: e.target.checked })}
            className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-2 focus:ring-purple-500"
          />
          <div>
            <div className="font-medium">Enable Auto SFX</div>
            <div className="text-xs text-gray-400">
              Automatically generate sound effects based on scene context
            </div>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Sound Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="e.g., Soft keyboard typing, air conditioner hum in background..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Ambient Sound (Optional)
        </label>
        <input
          type="text"
          value={data.ambient || ''}
          onChange={(e) => onChange({ ...data, ambient: e.target.value })}
          placeholder="e.g., City traffic, rain, silence..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default MotionEditor;
