/**
 * MotionEditorPage.tsx
 *
 * Professional Motion Editor - Standalone Page
 * Based on Peace Script Model v1.4
 *
 * Features:
 * - Style presets (Grit, Cinematic, Anime, Documentary, Abstract)
 * - Camera controls (Shot type, Movement, Angle)
 * - Lighting controls (Type, Time of day)
 * - AI settings (Model, Quality, Style)
 * - Visual prompts editor
 * - Motion parameters (8-axis control)
 * - Real-time preview
 * - Video generation
 *
 * @version 3.0.0 - TypeScript + Tailwind CSS
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { ScriptData, GeneratedScene } from '../../types';
import KeyframeTimeline from '../components/KeyframeTimeline';

interface MotionEditorPageProps {
  scriptData?: ScriptData;
  shotId?: string;
  onSave?: (updatedShot: any) => void;
  onClose?: () => void;
}

interface TimelineClip {
  id: string;
  start: number;
  end: number;
  label: string;
  color: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
}

export const MotionEditorPage: React.FC<MotionEditorPageProps> = ({
  scriptData,
  shotId,
  onSave,
  onClose,
}) => {
  // 🎬 PHASE 1: Extract Storyboard Data from ScriptData
  const currentScene = useMemo<GeneratedScene | null>(() => {
    if (!scriptData || !shotId) return null;

    // Find scene containing this shot
    for (const plotPoint of scriptData.structure) {
      const scenes = scriptData.generatedScenes[plotPoint.title] || [];
      for (const scene of scenes) {
        if (scene.shotList?.some(s => s.shot?.toString() === shotId)) {
          return scene;
        }
      }
    }
    return null;
  }, [scriptData, shotId]);

  // Get storyboard item for current shot
  const storyboardItem = useMemo(() => {
    if (!currentScene || !shotId) return null;
    return currentScene.storyboard?.find(s => s.shot?.toString() === shotId);
  }, [currentScene, shotId]);

  // Extract media URLs
  const videoUrl = storyboardItem?.video || null;
  const imageUrl = storyboardItem?.image || null;

  console.log('🎬 MotionEditor - Media Data:', {
    shotId,
    hasScene: !!currentScene,
    hasStoryboard: !!storyboardItem,
    hasVideo: !!videoUrl,
    hasImage: !!imageUrl,
    videoUrl: videoUrl?.substring(0, 50) + '...',
    imageUrl: imageUrl?.substring(0, 50) + '...',
  });

  // State
  const [stylePreset, setStylePreset] = useState('neutral');
  const [shotTitle] = useState('Shot 1');

  // Camera Settings
  const [cameraSettings, setCameraSettings] = useState({
    shotType: 'Close-up',
    movement: 'Dolly In',
    angle: 'Eye Level',
  });

  // Lighting Settings
  const [lightingSettings, setLightingSettings] = useState({
    type: 'Natural',
    time: 'Overcast',
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    model: 'v4-cinema',
    quality: 'High (1080p)',
    style: 'Realistic',
  });

  // Motion Parameters (8 params)
  const [motionParameters, setMotionParameters] = useState({
    zoom_in: 0.3,
    zoom_out: 0.0,
    pan_left: 0.0,
    pan_right: 0.2,
    tilt_up: 0.0,
    tilt_down: 0.0,
    rotate_cw: 0.0,
    rotate_ccw: 0.0,
    motion_speed: 0.5,
  });

  // Left Panel Tab State
  const [leftPanelTab, setLeftPanelTab] = useState<
    'prompts' | 'info' | 'characters' | 'dialogue' | 'setart' | 'props'
  >('prompts');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Timeline State
  const [duration, setDuration] = useState(5.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineMode, setTimelineMode] = useState<'keyframe' | 'multitrack'>('multitrack');
  const [timelineZoom, setTimelineZoom] = useState(1.0);

  // Keyframes for animation
  const [keyframes, setKeyframes] = useState<
    Array<{
      id: string;
      time: number;
      parameters?: Record<string, unknown>;
      interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
    }>
  >([]);

  // Auto-generate keyframes from motion parameters and video/image
  useEffect(() => {
    // Only auto-generate if keyframes are empty
    if (keyframes.length === 0 && (videoUrl || imageUrl)) {
      const initialKeyframes = [
        {
          id: 'kf_start',
          time: 0,
          parameters: { ...motionParameters },
          interpolation: 'linear' as const,
        },
        {
          id: 'kf_mid',
          time: duration / 2,
          parameters: { ...motionParameters },
          interpolation: 'ease-in-out' as const,
        },
        {
          id: 'kf_end',
          time: duration,
          parameters: { ...motionParameters },
          interpolation: 'ease-out' as const,
        },
      ];
      setKeyframes(initialKeyframes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, imageUrl, duration]);

  // Tracks for Multi-track Timeline
  const [tracks, setTracks] = useState([
    {
      id: 1,
      name: '🎬 Video',
      clips: videoUrl
        ? [
            {
              id: 'video_main',
              start: 0,
              end: duration,
              label: `Shot ${shotId}`,
              color: '#ef4444',
              mediaUrl: videoUrl,
              mediaType: 'video' as const,
            },
          ]
        : [],
    },
    {
      id: 2,
      name: '🖼️ Image',
      clips:
        imageUrl && !videoUrl
          ? [
              {
                id: 'image_main',
                start: 0,
                end: duration,
                label: `Shot ${shotId}`,
                color: '#8b5cf6',
                mediaUrl: imageUrl,
                mediaType: 'image' as const,
              },
            ]
          : [],
    },
    {
      id: 3,
      name: '🔊 SFX',
      clips: [
        { id: 'sfx1', start: 0, end: 2, label: 'Wind', color: '#10b981' },
        { id: 'sfx2', start: 2.5, end: 4, label: 'Footsteps', color: '#10b981' },
      ],
    },
    {
      id: 4,
      name: '💬 Dialogue',
      clips: [{ id: 'dlg1', start: 1.2, end: 2.5, label: 'Speech', color: '#3b82f6' }],
    },
    {
      id: 5,
      name: '🎭 Actions',
      clips: [{ id: 'act1', start: 0, end: 5, label: 'Movement', color: '#8b5cf6' }],
    },
  ]);

  // 🎬 Update tracks when media changes
  useEffect(() => {
    setTracks(prev => {
      const newTracks = [...prev];

      // Update Video track
      newTracks[0] = {
        id: 1,
        name: '🎬 Video',
        clips: videoUrl
          ? [
              {
                id: 'video_main',
                start: 0,
                end: duration,
                label: `Shot ${shotId}`,
                color: '#ef4444',
                mediaUrl: videoUrl,
                mediaType: 'video' as const,
              },
            ]
          : [],
      };

      // Update Image track
      newTracks[1] = {
        id: 2,
        name: '🖼️ Image',
        clips:
          imageUrl && !videoUrl
            ? [
                {
                  id: 'image_main',
                  start: 0,
                  end: duration,
                  label: `Shot ${shotId}`,
                  color: '#8b5cf6',
                  mediaUrl: imageUrl,
                  mediaType: 'image' as const,
                },
              ]
            : [],
      };

      return newTracks;
    });
  }, [videoUrl, imageUrl, shotId, duration]);

  // Prompts
  const [prompts, setPrompts] = useState([
    { id: 1, text: 'A worn warrior stands alert in a misty forest clearing', enabled: true },
    {
      id: 2,
      text: 'Trees tower overhead, their branches creating natural archways',
      enabled: true,
    },
    { id: 3, text: 'Foggy atmosphere with rays of light filtering through leaves', enabled: true },
  ]);

  // Characters
  const [characters, setCharacters] = useState([
    {
      id: 1,
      name: 'Main Character',
      description: 'Worn warrior with battle scars',
      age: '30s',
      role: 'Protagonist',
    },
    { id: 2, name: 'Supporting', description: 'Mysterious guide', age: '40s', role: 'Mentor' },
  ]);

  // Dialogue
  const [dialogues, setDialogues] = useState([
    { id: 1, character: 'Main Character', text: 'The forest holds many secrets...', time: '0:00' },
    { id: 2, character: 'Supporting', text: 'Follow me, but stay close.', time: '0:05' },
  ]);

  // Set/Art
  const [setArt, setSetArt] = useState({
    location: 'Misty Forest',
    timeOfDay: 'Dawn',
    weather: 'Foggy',
    atmosphere: 'Mysterious and tense',
    colorPalette: 'Cool tones with warm light rays',
  });

  // Props
  const [props, setProps] = useState([
    { id: 1, name: 'Sword', description: 'Battle-worn blade', quantity: 1, importance: 'High' },
    {
      id: 2,
      name: 'Lantern',
      description: 'Dim glowing lantern',
      quantity: 1,
      importance: 'Medium',
    },
    { id: 3, name: 'Map', description: 'Old weathered map', quantity: 1, importance: 'Low' },
  ]);

  // Video Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Video Player Controls
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16'>('16:9');

  // Style Presets
  const stylePresets = ['Neutral', 'Grit', 'Cinematic', 'Anime', 'Documentary', 'Abstract'];
  const shotTypes = ['Close-up', 'Medium', 'Wide', 'Extreme Close-up', 'Full Shot', 'Two Shot'];
  const movements = ['Static', 'Pan', 'Tilt', 'Dolly In', 'Dolly Out', 'Zoom', 'Handheld', 'Crane'];
  const angles = ['Eye Level', 'High', 'Low', "Bird's Eye", "Worm's Eye", 'Dutch'];
  const lightingTypes = ['Natural', 'Studio', 'Dramatic', 'Soft', 'Hard'];
  const timeOfDay = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night', 'Overcast'];
  const aiModels = ['v4-cinema', 'v4-anime', 'v3-realistic', 'v3-stylized'];
  const qualities = ['Low (480p)', 'Medium (720p)', 'High (1080p)', 'Ultra (4K)'];
  const styles = ['Realistic', 'Stylized', 'Painterly', 'Cartoon'];

  // Handlers
  const togglePrompt = (id: number) => {
    setPrompts(prompts.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const addPrompt = () => {
    const newPrompt = {
      id: Date.now(),
      text: 'New prompt...',
      enabled: true,
    };
    setPrompts([...prompts, newPrompt]);
  };

  const updatePromptText = (id: number, text: string) => {
    setPrompts(prompts.map(p => (p.id === id ? { ...p, text } : p)));
  };

  const deletePrompt = (id: number) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  const updateMotionParameter = (param: string, value: number) => {
    setMotionParameters({ ...motionParameters, [param]: value });

    // Update keyframes with new parameter values
    if (keyframes.length > 0) {
      const updatedKeyframes = keyframes.map(kf => ({
        ...kf,
        parameters: {
          ...kf.parameters,
          [param]: value,
        },
      }));
      setKeyframes(updatedKeyframes);
    }
  };

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate video generation
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          // Video URL is now from storyboard data
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        id: shotId,
        title: shotTitle,
        stylePreset,
        cameraSettings,
        lightingSettings,
        aiSettings,
        motionParameters,
        prompts: prompts.filter(p => p.enabled),
      });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-sm z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onClose && onClose()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-green-400">🎬 Professional Motion Editor</h1>
              <p className="text-sm text-gray-400">Shot ID: {shotId || 'New Shot'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Keyboard Shortcuts"
            >
              ⌨️
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
            >
              💾 Save Changes
            </button>
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isGenerating ? `Generating ${generationProgress}%...` : '🎥 Generate Video'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-400">⌨️ Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Save</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Generate</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+G</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Add Prompt</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+P</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Play/Pause</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Space</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Undo</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Redo</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Delete</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Del</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Toggle Timeline</span>
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono text-xs">Ctrl+T</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area - Fixed height with internal scrolling */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1920px] mx-auto h-full p-6">
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Right Panel - Controls (Scrollable) */}
            <div
              className="col-span-4 space-y-6 overflow-y-auto pl-2 order-3"
              style={{ maxHeight: '100%' }}
            >
              {/* Style Presets */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-green-400 mb-3">🎨 Style Preset</h3>
                <div className="grid grid-cols-2 gap-2">
                  {stylePresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setStylePreset(preset.toLowerCase())}
                      className={`py-2 px-3 rounded-lg font-semibold transition-all ${
                        stylePreset === preset.toLowerCase()
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Settings */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-400 mb-3">🎥 Camera Settings</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Shot Type
                    </label>
                    <select
                      value={cameraSettings.shotType}
                      onChange={e =>
                        setCameraSettings({ ...cameraSettings, shotType: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {shotTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Movement
                    </label>
                    <select
                      value={cameraSettings.movement}
                      onChange={e =>
                        setCameraSettings({ ...cameraSettings, movement: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {movements.map(movement => (
                        <option key={movement} value={movement}>
                          {movement}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Angle</label>
                    <select
                      value={cameraSettings.angle}
                      onChange={e =>
                        setCameraSettings({ ...cameraSettings, angle: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {angles.map(angle => (
                        <option key={angle} value={angle}>
                          {angle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lighting Settings */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-yellow-400 mb-3">💡 Lighting</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Type</label>
                    <select
                      value={lightingSettings.type}
                      onChange={e =>
                        setLightingSettings({ ...lightingSettings, type: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {lightingTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Time of Day
                    </label>
                    <select
                      value={lightingSettings.time}
                      onChange={e =>
                        setLightingSettings({ ...lightingSettings, time: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {timeOfDay.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Settings */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-purple-400 mb-3">🤖 AI Settings</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Model</label>
                    <select
                      value={aiSettings.model}
                      onChange={e => setAiSettings({ ...aiSettings, model: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {aiModels.map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Quality
                    </label>
                    <select
                      value={aiSettings.quality}
                      onChange={e => setAiSettings({ ...aiSettings, quality: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {qualities.map(quality => (
                        <option key={quality} value={quality}>
                          {quality}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Style</label>
                    <select
                      value={aiSettings.style}
                      onChange={e => setAiSettings({ ...aiSettings, style: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      {styles.map(style => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Motion Parameters */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">🎯 Motion Parameters</h3>

                <div className="space-y-3">
                  {Object.entries(motionParameters).map(([param, value]) => (
                    <div key={param}>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        {param.replace(/_/g, ' ').toUpperCase()}:{' '}
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value}
                        onChange={e => updateMotionParameter(param, parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Panel - Preview Only */}
            <div className="col-span-5 space-y-6 order-2">
              {/* Preview */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-orange-400">👁️ Preview</h3>
                  {(videoUrl || imageUrl) && (
                    <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                      {videoUrl ? '🎬 Video Ready' : '🖼️ Image Ready'}
                    </span>
                  )}
                </div>

                <div
                  className={`bg-black rounded-lg flex items-center justify-center border-2 border-gray-600 ${
                    aspectRatio === '16:9'
                      ? 'aspect-video'
                      : aspectRatio === '4:3'
                        ? 'aspect-[4/3]'
                        : aspectRatio === '1:1'
                          ? 'aspect-square'
                          : 'aspect-[9/16]'
                  }`}
                >
                  {videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full rounded-lg object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      onTimeUpdate={e => {
                        // Sync timeline with video playback
                        setCurrentTime(e.currentTarget.currentTime);
                      }}
                      onError={e => {
                        console.warn('Video load error:', e);
                      }}
                    >
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={imageUrl}
                        alt={`Shot ${shotId}`}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={e => {
                          console.warn('Image load error');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <svg
                        className="w-24 h-24 mx-auto mb-4"
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
                      <p className="text-lg font-semibold">No preview available</p>
                      <p className="text-sm mt-2">Generate video or image in Storyboard</p>
                      <p className="text-xs text-gray-600 mt-1">Shot ID: {shotId || 'Unknown'}</p>
                    </div>
                  )}
                </div>

                {/* Video Controls - Always Visible */}
                <div className="mt-4 space-y-3">
                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.max(
                            0,
                            videoRef.current.currentTime - 5
                          );
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-sm text-gray-300 font-medium transition-colors border border-gray-600/50"
                      title="Rewind 5s"
                    >
                      ⏪
                    </button>

                    <button
                      onClick={() => {
                        // Control both video and timeline
                        setIsPlaying(!isPlaying);
                        if (videoRef.current) {
                          if (isPlaying) {
                            videoRef.current.pause();
                          } else {
                            videoRef.current.play();
                          }
                        }
                      }}
                      className="px-4 py-1.5 bg-gray-700/70 hover:bg-gray-600/70 rounded text-sm text-white font-semibold transition-colors border border-gray-600/50"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.min(
                            videoRef.current.duration,
                            videoRef.current.currentTime + 5
                          );
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded text-sm text-gray-300 font-medium transition-colors border border-gray-600/50"
                      title="Forward 5s"
                    >
                      ⏩
                    </button>
                  </div>

                  {/* Aspect Ratio Selector */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Aspect Ratio:</span>
                    <div className="flex gap-1.5">
                      {(['16:9', '4:3', '1:1', '9:16'] as const).map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${
                            aspectRatio === ratio
                              ? 'bg-gray-600/60 text-white border-gray-500/60'
                              : 'bg-gray-700/40 hover:bg-gray-600/40 text-gray-400 border-gray-600/40'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isGenerating && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Generating video...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Left Panel - Tabbed Interface (Scrollable) */}
            <div
              className="col-span-3 space-y-4 overflow-y-auto pr-2 order-1"
              style={{ maxHeight: '100%' }}
            >
              {/* Tab Navigation */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLeftPanelTab('prompts')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'prompts'
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    📝 Prompts
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('info')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'info'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    ℹ️ Info
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('characters')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'characters'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    👥 Characters
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('dialogue')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'dialogue'
                        ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    💬 Dialogue
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('setart')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'setart'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    🎨 Set/Art
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('props')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      leftPanelTab === 'props'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    📦 Props
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                {/* Visual Prompts Tab */}
                {leftPanelTab === 'prompts' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-lg font-bold text-pink-400">📝 Visual Prompts</h3>
                      <button
                        onClick={addPrompt}
                        className="px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        + Add
                      </button>
                    </div>

                    <div
                      className="space-y-2 overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      {prompts.map(prompt => (
                        <div
                          key={prompt.id}
                          className="flex items-start gap-2 p-2 bg-gray-700/50 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={prompt.enabled}
                            onChange={() => togglePrompt(prompt.id)}
                            className="mt-1"
                          />
                          <textarea
                            value={prompt.text}
                            onChange={e => updatePromptText(prompt.id, e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => deletePrompt(prompt.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shot Info Tab */}
                {leftPanelTab === 'info' && (
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-blue-400 mb-3 flex-shrink-0">
                      ℹ️ Shot Information
                    </h3>

                    <div
                      className="space-y-2 text-sm overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shot ID:</span>
                        <span className="font-mono text-gray-300">{shotId || 'New'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Style:</span>
                        <span className="font-semibold text-green-400">{stylePreset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shot Type:</span>
                        <span className="text-gray-300">{cameraSettings.shotType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Movement:</span>
                        <span className="text-gray-300">{cameraSettings.movement}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Angle:</span>
                        <span className="text-gray-300">{cameraSettings.angle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lighting:</span>
                        <span className="text-gray-300">{lightingSettings.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time:</span>
                        <span className="text-gray-300">{lightingSettings.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Model:</span>
                        <span className="text-gray-300">{aiSettings.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Quality:</span>
                        <span className="text-gray-300">{aiSettings.quality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Prompts:</span>
                        <span className="font-bold text-pink-400">
                          {prompts.filter(p => p.enabled).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-gray-300">{duration}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Characters Tab */}
                {leftPanelTab === 'characters' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-lg font-bold text-purple-400">👥 Characters</h3>
                      <button
                        onClick={() => {
                          const newChar = {
                            id: Date.now(),
                            name: 'New Character',
                            description: '',
                            age: '',
                            role: '',
                          };
                          setCharacters([...characters, newChar]);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        + Add
                      </button>
                    </div>

                    <div
                      className="space-y-3 overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      {characters.map(char => (
                        <div key={char.id} className="p-3 bg-gray-700/50 rounded-lg">
                          <input
                            type="text"
                            value={char.name}
                            onChange={e =>
                              setCharacters(
                                characters.map(c =>
                                  c.id === char.id ? { ...c, name: e.target.value } : c
                                )
                              )
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm font-bold text-white mb-2"
                            placeholder="Character Name"
                          />
                          <input
                            type="text"
                            value={char.description}
                            onChange={e =>
                              setCharacters(
                                characters.map(c =>
                                  c.id === char.id ? { ...c, description: e.target.value } : c
                                )
                              )
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-2"
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={char.age}
                              onChange={e =>
                                setCharacters(
                                  characters.map(c =>
                                    c.id === char.id ? { ...c, age: e.target.value } : c
                                  )
                                )
                              }
                              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                              placeholder="Age"
                            />
                            <input
                              type="text"
                              value={char.role}
                              onChange={e =>
                                setCharacters(
                                  characters.map(c =>
                                    c.id === char.id ? { ...c, role: e.target.value } : c
                                  )
                                )
                              }
                              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                              placeholder="Role"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dialogue Tab */}
                {leftPanelTab === 'dialogue' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-lg font-bold text-green-400">💬 Dialogue</h3>
                      <button
                        onClick={() => {
                          const newDialogue = {
                            id: Date.now(),
                            character: 'Character',
                            text: '',
                            time: '0:00',
                          };
                          setDialogues([...dialogues, newDialogue]);
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        + Add
                      </button>
                    </div>

                    <div
                      className="space-y-3 overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      {dialogues.map(dlg => (
                        <div key={dlg.id} className="p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={dlg.character}
                              onChange={e =>
                                setDialogues(
                                  dialogues.map(d =>
                                    d.id === dlg.id ? { ...d, character: e.target.value } : d
                                  )
                                )
                              }
                              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-bold text-white"
                              placeholder="Character"
                            />
                            <input
                              type="text"
                              value={dlg.time}
                              onChange={e =>
                                setDialogues(
                                  dialogues.map(d =>
                                    d.id === dlg.id ? { ...d, time: e.target.value } : d
                                  )
                                )
                              }
                              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                              placeholder="0:00"
                            />
                          </div>
                          <textarea
                            value={dlg.text}
                            onChange={e =>
                              setDialogues(
                                dialogues.map(d =>
                                  d.id === dlg.id ? { ...d, text: e.target.value } : d
                                )
                              )
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
                            rows={2}
                            placeholder="Dialogue text..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Set/Art Tab */}
                {leftPanelTab === 'setart' && (
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-orange-400 mb-3 flex-shrink-0">
                      🎨 Set & Art Direction
                    </h3>

                    <div
                      className="space-y-3 overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={setArt.location}
                          onChange={e => setSetArt({ ...setArt, location: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Time of Day
                        </label>
                        <input
                          type="text"
                          value={setArt.timeOfDay}
                          onChange={e => setSetArt({ ...setArt, timeOfDay: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Weather
                        </label>
                        <input
                          type="text"
                          value={setArt.weather}
                          onChange={e => setSetArt({ ...setArt, weather: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Atmosphere
                        </label>
                        <textarea
                          value={setArt.atmosphere}
                          onChange={e => setSetArt({ ...setArt, atmosphere: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Color Palette
                        </label>
                        <textarea
                          value={setArt.colorPalette}
                          onChange={e => setSetArt({ ...setArt, colorPalette: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Props Tab */}
                {leftPanelTab === 'props' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-lg font-bold text-red-400">📦 Props</h3>
                      <button
                        onClick={() => {
                          const newProp = {
                            id: Date.now(),
                            name: 'New Prop',
                            description: '',
                            quantity: 1,
                            importance: 'Low',
                          };
                          setProps([...props, newProp]);
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        + Add
                      </button>
                    </div>

                    <div
                      className="space-y-3 overflow-y-auto flex-1"
                      style={{ maxHeight: 'calc(100vh - 450px)' }}
                    >
                      {props.map(prop => (
                        <div key={prop.id} className="p-3 bg-gray-700/50 rounded-lg">
                          <input
                            type="text"
                            value={prop.name}
                            onChange={e =>
                              setProps(
                                props.map(p =>
                                  p.id === prop.id ? { ...p, name: e.target.value } : p
                                )
                              )
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm font-bold text-white mb-2"
                            placeholder="Prop Name"
                          />
                          <input
                            type="text"
                            value={prop.description}
                            onChange={e =>
                              setProps(
                                props.map(p =>
                                  p.id === prop.id ? { ...p, description: e.target.value } : p
                                )
                              )
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-2"
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={prop.quantity}
                              onChange={e =>
                                setProps(
                                  props.map(p =>
                                    p.id === prop.id
                                      ? { ...p, quantity: parseInt(e.target.value) || 1 }
                                      : p
                                  )
                                )
                              }
                              className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                              placeholder="Qty"
                              min="1"
                            />
                            <select
                              value={prop.importance}
                              onChange={e =>
                                setProps(
                                  props.map(p =>
                                    p.id === prop.id ? { ...p, importance: e.target.value } : p
                                  )
                                )
                              }
                              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎬 Professional Timeline - Bottom Section */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 shadow-2xl z-50">
        {/* Timeline Mode Toggle & Quick Actions */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-700/50 bg-gray-800/30">
          <div className="flex gap-1.5">
            <button
              onClick={() => setTimelineMode('multitrack')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                timelineMode === 'multitrack'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
              }`}
            >
              🎬 Multi-track
            </button>
            <button
              onClick={() => setTimelineMode('keyframe')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                timelineMode === 'keyframe'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
              }`}
            >
              📊 Keyframe
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1.5">
            <button className="px-2 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs font-semibold transition-colors">
              📷
            </button>
            <button className="px-2 py-1 bg-green-600/80 hover:bg-green-600 rounded text-xs font-semibold transition-colors">
              🎬
            </button>
            <button className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 rounded text-xs font-semibold transition-colors">
              🔄
            </button>
            <button className="px-2 py-1 bg-orange-600/80 hover:bg-orange-600 rounded text-xs font-semibold transition-colors">
              📤
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="px-4 py-2">
          {timelineMode === 'keyframe' && (
            <div>
              {/* Keyframe Controls */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">⏱️ Keyframes:</span>
                  <span className="text-xs text-blue-400 font-mono">{keyframes.length} frames</span>
                  {videoUrl && <span className="text-xs text-green-400">🎬 Video</span>}
                  {imageUrl && !videoUrl && (
                    <span className="text-xs text-purple-400">🖼️ Image</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newKf = {
                        id: `kf_${Date.now()}`,
                        time: currentTime,
                        parameters: { ...motionParameters },
                        interpolation: 'linear' as const,
                      };
                      const updated = [...keyframes, newKf].sort((a, b) => a.time - b.time);
                      setKeyframes(updated);
                    }}
                    className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>➕</span>
                    <span>Add Keyframe</span>
                  </button>
                  <button
                    onClick={() => setKeyframes([])}
                    disabled={keyframes.length === 0}
                    className="px-3 py-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <KeyframeTimeline
                duration={duration}
                keyframes={keyframes}
                onKeyframesChange={setKeyframes}
                parameters={motionParameters}
                onTimeChange={setCurrentTime}
                playing={isPlaying}
                onPlayingChange={setIsPlaying}
              />

              {/* Keyframe Info */}
              {keyframes.length === 0 && (
                <div className="mt-3 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
                  <div className="text-4xl mb-2">⏱️</div>
                  <p className="text-sm text-gray-400 mb-2">No keyframes yet</p>
                  <p className="text-xs text-gray-500">
                    Click &quot;Add Keyframe&quot; to create animation points
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Keyframes control motion parameters over time
                  </p>
                </div>
              )}
            </div>
          )}

          {timelineMode === 'multitrack' && (
            <div>
              {/* Playback Controls - Removed Play button, keeping time display and controls */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-mono">
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Zoom</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={timelineZoom}
                    onChange={e => setTimelineZoom(parseFloat(e.target.value))}
                    className="w-16 h-1"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">
                    {timelineZoom.toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Duration</span>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={duration}
                    onChange={e => setDuration(parseFloat(e.target.value))}
                    className="w-16 h-1"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">
                    {duration.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Timeline Content */}
              <div className="overflow-auto" style={{ maxHeight: '150px' }}>
                <div className="space-y-1.5">
                  {tracks.map(track => (
                    <div key={track.id} className="flex items-center gap-2">
                      <div className="w-24 text-xs font-semibold text-gray-400 flex-shrink-0">
                        {track.name}
                      </div>
                      <div className="flex-1 relative h-8 bg-gray-800/50 rounded border border-gray-700/50">
                        {/* Timeline Grid */}
                        <div className="absolute inset-0 flex">
                          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 border-r border-gray-700/30"
                              style={{ minWidth: `${100 / duration}%` }}
                            >
                              <span className="text-[8px] text-gray-600 ml-0.5">{i}s</span>
                            </div>
                          ))}
                        </div>

                        {/* Clips */}
                        {track.clips.map(clip => {
                          const timelineClip = clip as TimelineClip;
                          return (
                            <div
                              key={clip.id}
                              className="absolute top-0.5 bottom-0.5 rounded px-1.5 flex items-center gap-1 text-[10px] font-semibold text-white shadow cursor-move hover:opacity-90 transition-opacity overflow-hidden"
                              style={{
                                left: `${(clip.start / duration) * 100}%`,
                                width: `${((clip.end - clip.start) / duration) * 100}%`,
                                backgroundColor: clip.color,
                                minWidth: '40px',
                              }}
                            >
                              {/* Thumbnail for Video/Image clips */}
                              {timelineClip.mediaUrl && timelineClip.mediaType === 'video' && (
                                <div className="flex-shrink-0 w-6 h-6 bg-gray-900 rounded overflow-hidden">
                                  <video
                                    src={timelineClip.mediaUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                  />
                                </div>
                              )}
                              {timelineClip.mediaUrl && timelineClip.mediaType === 'image' && (
                                <div className="flex-shrink-0 w-6 h-6 bg-gray-900 rounded overflow-hidden">
                                  <img
                                    src={timelineClip.mediaUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <span className="truncate">{clip.label}</span>
                            </div>
                          );
                        })}

                        {/* Playhead */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                          style={{ left: `${(currentTime / duration) * 100}%` }}
                        >
                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Track Button */}
                <button
                  onClick={() => {
                    const newTrack = {
                      id: tracks.length + 1,
                      name: `Track ${tracks.length + 1}`,
                      clips: [] as Array<{
                        id: string;
                        start: number;
                        end: number;
                        label: string;
                        color: string;
                      }>,
                    };
                    setTracks([...tracks, newTrack]);
                  }}
                  className="mt-2 px-3 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded text-xs font-semibold transition-colors"
                >
                  + Track
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotionEditorPage;
