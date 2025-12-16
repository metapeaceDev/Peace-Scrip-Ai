# 🎬 Motion Editor - Complete Implementation Guide

## 📋 Overview

**Motion Editor** is a professional cinematic control system based on Peace Script Model v1.4's motion_edit structure. It provides comprehensive control over video generation with:

- **5 Control Panels**: Shot Preview, Camera, Frame Composition, Lighting, Sound
- **AI Director**: Auto-suggestions based on character psychology
- **Manual Override**: Full manual control when needed
- **AnimateDiff Integration**: Seamless connection with psychology-driven motion system

## 🏗️ Architecture

### Files Created

```
src/
├── types/
│   └── motionEdit.ts (350+ lines)
│       - TypeScript interfaces for all motion edit types
│       - Enums for shot types, camera movements, etc.
│       - Presets and default configurations
│
├── services/
│   └── motionEditorService.ts (300+ lines)
│       - AI suggestion generator
│       - MotionEdit → AnimateDiff parameter converter
│       - Validation and helper functions
│
└── components/
    └── MotionEditor.tsx (600+ lines)
        - Main Motion Editor component
        - 5 sub-panel components
        - AI/Manual toggle system
```

### Integration Points

```typescript
// geminiService.ts - Enhanced with MotionEdit support
generateStoryboardVideo(
  prompt: string,
  base64Image?: string,
  onProgress?: (progress: number) => void,
  preferredModel: string = 'auto',
  options?: {
    // ... existing options
    motionEdit?: MotionEdit; // 🆕 NEW
  }
): Promise<string>
```

## 🎨 5 Control Panels

### 1. Shot Preview Generator Panel

**Purpose**: Define basic shot configuration

**Fields**:
- `structure` (string) - Character name
- `prompt` (string) - Scene description ⭐ Required
- `extra` (string) - Additional details
- `shot_type` (ShotType) - Wide/Medium/Close-up/etc.
- `voiceover` (string) - Narration text

**Shot Types Available**:
- Wide Shot (24mm lens, establish environment)
- Medium Shot (35mm lens, character + context)
- Close-up (85mm lens, emphasize emotions)
- Extreme Close-up (135mm lens, specific details)
- Over-the-Shoulder (50mm lens, interaction)
- Two Shot (35mm lens, conversation)

### 2. Camera Control Panel

**Purpose**: Control camera angles, movements, and equipment

**Fields**:
- `shot_prompt` (string) - Camera description
- `perspective` (CameraPerspective) - Neutral/High/Low/POV/etc.
- `movement` (CameraMovement) - Static/Pan/Dolly/Track/etc.
- `equipment` (Equipment) - Tripod/Handheld/Gimbal/etc.
- `focal_length` (FocalLength) - 14mm to 200mm

**Camera Movements**:
```typescript
'Static'      // No movement - stable, calm
'Pan'         // Left-right - follow action
'Tilt'        // Up-down - reveal height
'Dolly'       // In-out - create depth
'Track'       // Follow character - dynamic
'Zoom'        // Zoom in-out - change focus
'Handheld'    // Handheld - realistic, raw
'Crane'       // Crane shot - high angles
'Steadicam'   // Smooth movement - follow flow
```

### 3. Frame Composition Panel (3-Layer System)

**Purpose**: Define foreground, main object, and background

**Fields**:
- `foreground` (string) - Front layer (create depth)
- `object` (string) - Main subject ⭐ Required
- `background` (string) - Back layer (context)

**Example**:
```typescript
{
  foreground: "Coffee cup on desk, soft bokeh blur",
  object: "Character sitting at computer, focused expression",
  background: "Soft-colored walls, window with daylight streaming in"
}
```

### 4. Lighting Design Panel

**Purpose**: Define lighting setup and mood

**Fields**:
- `description` (string) - Lighting description ⭐ Required
- `color_temperature` (ColorTemperature) - Warm/Neutral/Cool
- `mood` (optional) - Bright/Dim/Dark/Dramatic

**Color Temperatures**:
- Warm (3000K) - Cozy, intimate scenes
- Neutral (5500K) - Natural daylight
- Cool (6500K) - Clinical, sad scenes

### 5. Sound Design Panel

**Purpose**: Define audio and sound effects

**Fields**:
- `auto_sfx` (boolean) - Enable auto sound effects
- `description` (string) - Sound description
- `ambient` (string) - Ambient sound layer

**Example**:
```typescript
{
  auto_sfx: true,
  description: "Soft keyboard typing, air conditioner hum",
  ambient: "City traffic in distance"
}
```

## 🤖 AI Director System

### Auto-Suggestions

AI automatically suggests camera, lighting, and sound based on:
- Character's current mood
- Character's energy level
- Scene location
- Emotional intensity

```typescript
// Generate AI suggestions
const suggestions = generateCinematicSuggestions(character, currentScene);

// Example output:
{
  suggested_camera: "Handheld camera with 85mm lens...",
  suggested_lighting: "Dramatic low-key lighting...",
  suggested_sound: "Heavy breathing, tense silence",
  suggested_movement: "Handheld",
  suggested_focal_length: "85mm",
  confidence: 0.85 // 85% confidence
}
```

### Manual Override

Users can override AI suggestions at any time:

```typescript
const overrides: CinematicOverrides = {
  camera_prompt: "Force static shot on tripod, no movement",
  lighting_prompt: "Bright, even lighting regardless of mood",
  sound_prompt: "Complete silence",
  override_all: true // Disable all AI
};
```

## 📝 Usage Examples

### Example 1: Basic Usage

```typescript
import { MotionEditor } from '../components/MotionEditor';
import { generateCinematicSuggestions } from '../services/motionEditorService';

function MyComponent() {
  const [motionEdit, setMotionEdit] = useState<MotionEdit | null>(null);
  const aiSuggestions = generateCinematicSuggestions(character, currentScene);

  return (
    <MotionEditor
      character={character}
      initialMotionEdit={DEFAULT_MOTION_EDIT}
      onMotionChange={(motion) => setMotionEdit(motion)}
      aiSuggestions={aiSuggestions}
    />
  );
}
```

### Example 2: Generate Video with Motion Editor

```typescript
import { generateStoryboardVideo } from '../services/geminiService';
import { MotionEdit } from '../types/motionEdit';

async function generateVideoWithMotion(
  motionEdit: MotionEdit,
  character: Character,
  scene: GeneratedScene,
  baseImage?: string
) {
  const videoUrl = await generateStoryboardVideo(
    "Generate cinematic video",
    baseImage,
    (progress) => console.log(`Progress: ${progress}%`),
    'comfyui-animatediff',
    {
      character,
      currentScene: scene,
      motionEdit: motionEdit, // 🎬 Motion Editor data
      useAnimateDiff: true
    }
  );

  return videoUrl;
}
```

### Example 3: Create Preset with AI

```typescript
import { createMotionEditPreset } from '../services/motionEditorService';

// Create preset for "Close-up" shot with AI suggestions
const preset = createMotionEditPreset('Close-up', character, currentScene);

// Preset includes:
// - Shot type: Close-up
// - AI-suggested camera movement
// - AI-suggested focal length (85mm)
// - AI-suggested lighting
// - AI-suggested sound
```

### Example 4: Validate Motion Edit

```typescript
import { validateMotionEdit } from '../services/motionEditorService';

const validation = validateMotionEdit(motionEdit);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  // ["Scene prompt is required", "Main object in frame is required"]
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
  // ["Consider adding foreground elements for depth"]
}
```

## 🔗 Integration Workflow

### Complete Flow: From Motion Editor → Video

```
1. User opens Motion Editor
   ↓
2. AI suggests camera/lighting/sound based on character psychology
   ↓
3. User edits/overrides settings in 5 panels
   ↓
4. User clicks "Generate Video"
   ↓
5. motionEditToAnimateDiffParams() converts to AnimateDiff params
   ↓
6. buildVideoPromptWithMotion() builds comprehensive prompt
   ↓
7. generateStoryboardVideo() generates video with:
   - Enhanced prompt from Motion Editor
   - Camera movement from Motion Editor
   - Lighting context from Motion Editor
   - Sound context from Motion Editor
   - Motion strength from videoMotionEngine
   - FPS from videoMotionEngine
   - Frame count from videoMotionEngine
   ↓
8. ComfyUI + AnimateDiff produces final video
```

## 🎯 Key Features

### Psychology-Driven Defaults

```typescript
// High energy character (energyLevel: 80)
// AI suggests:
- Camera: Handheld (dynamic)
- Focal: 50mm (natural)
- Movement: Track (follow action)
- Lighting: Bright, high contrast
- Sound: Rapid heartbeat, quick footsteps

// Low energy character (energyLevel: 20)
// AI suggests:
- Camera: Static (calm)
- Focal: 24mm (wide, isolated)
- Movement: Static or slow dolly
- Lighting: Soft, muted
- Sound: Ambient silence, slow breathing
```

### Shot Type Presets

Each shot type comes with optimized defaults:

```typescript
SHOT_PRESETS['Wide Shot'] = {
  camera_control: {
    focal_length: '24mm',
    equipment: 'Tripod',
    movement: 'Static',
    perspective: 'Neutral'
  }
};

SHOT_PRESETS['Close-up'] = {
  camera_control: {
    focal_length: '85mm',
    equipment: 'Handheld',
    movement: 'Static',
    perspective: 'Neutral'
  }
};
```

### Mood-to-Lighting Mapping

```typescript
MOOD_LIGHTING_MAP = {
  'joyful': {
    description: 'Bright, even lighting with soft shadows',
    color_temperature: 'Warm',
    mood: 'Bright'
  },
  'sad': {
    description: 'Soft, low-key lighting with deep shadows',
    color_temperature: 'Cool',
    mood: 'Dim'
  },
  'angry': {
    description: 'Hard, dramatic lighting with strong contrast',
    color_temperature: 'Warm',
    mood: 'Dramatic'
  }
};
```

## 📊 Data Flow Diagram

```
Character Psychology (videoMotionEngine)
  ↓
  ├─→ AI Suggestions (motionEditorService)
  │     ├─→ suggested_camera
  │     ├─→ suggested_lighting
  │     ├─→ suggested_sound
  │     ├─→ suggested_movement
  │     └─→ suggested_focal_length
  ↓
Motion Editor UI (5 Panels)
  ├─→ Panel 1: Shot Preview
  ├─→ Panel 2: Camera Control
  ├─→ Panel 3: Frame Composition
  ├─→ Panel 4: Lighting Design
  └─→ Panel 5: Sound Design
  ↓
MotionEdit Object (complete configuration)
  ↓
motionEditToAnimateDiffParams()
  ├─→ motion_strength (from psychology)
  ├─→ fps (from psychology)
  ├─→ frame_count (from psychology)
  ├─→ camera_movement (from Motion Editor)
  ├─→ lighting_context (from Motion Editor)
  └─→ sound_context (from Motion Editor)
  ↓
generateStoryboardVideo()
  ├─→ buildVideoPromptWithMotion()
  │     └─→ Comprehensive prompt with all layers
  └─→ ComfyUI + AnimateDiff
        └─→ Final Video Output
```

## ✅ Validation Rules

### Required Fields
- ✅ `shot_preview_generator_panel.prompt` - Scene description
- ✅ `frame_control.object` - Main subject
- ✅ `lighting_design.description` - Lighting setup

### Optional but Recommended
- ⚠️ `frame_control.foreground` - For depth
- ⚠️ `frame_control.background` - For context
- ⚠️ `sounds.description` - If auto_sfx is disabled

## 🚀 Performance Considerations

### AI Suggestion Generation
- Fast (<100ms)
- Based on character psychology
- Cached when possible

### Motion Edit Conversion
- Instant conversion to AnimateDiff params
- No API calls
- Pure function transformation

### Video Generation
- Time depends on model:
  - Gemini Veo: 20-60 seconds
  - ComfyUI + AnimateDiff: 2-5 minutes
  - Depends on frame count and FPS

## 🎓 Best Practices

1. **Start with AI Suggestions**
   - Let AI generate initial setup
   - Review and refine as needed

2. **Use Shot Type Presets**
   - Quick starting point
   - Industry-standard configurations

3. **Layer Frame Composition**
   - Always define foreground for depth
   - Clear main object focus
   - Contextual background

4. **Match Lighting to Mood**
   - Warm for intimate/happy scenes
   - Cool for sad/clinical scenes
   - Dramatic for intense moments

5. **Sound Enhances Immersion**
   - Enable auto_sfx for convenience
   - Add specific sounds for key moments
   - Consider ambient layer

## 📚 Type Reference

See `src/types/motionEdit.ts` for complete TypeScript definitions:

- `ShotType` - 6 shot types
- `CameraMovement` - 9 movement types
- `CameraPerspective` - 7 perspective types
- `Equipment` - 6 equipment types
- `FocalLength` - 7 focal lengths (14mm-200mm)
- `ColorTemperature` - 3 temperatures
- `MotionEdit` - Complete motion configuration
- `CinematicSuggestions` - AI suggestions
- `CinematicOverrides` - Manual overrides

## 🔮 Future Enhancements

Planned features:
- [ ] Motion Editor templates library
- [ ] Export/Import motion presets
- [ ] Real-time preview rendering
- [ ] Advanced camera path animation
- [ ] Multi-shot sequence editor
- [ ] Collaborative editing
- [ ] Analytics on AI vs Manual usage

---

**Created**: 2025-01-XX
**Version**: 1.0.0
**Based on**: Peace Script Model v1.4 motion_edit structure
**Integration**: AnimateDiff + Psychology-Driven Motion System
