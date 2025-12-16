# 🎯 Video Extension + Buddhist Psychology - Complete Integration Plan

**วันที่:** 15 ธันวาคม 2568  
**Status:** 📋 Implementation Plan Ready

---

## 📊 Current Status Summary

### ✅ มีอยู่แล้ว และทำงาน:
1. **Buddhist Psychology System** - ครบถ้วนสมบูรณ์
2. **Video Extension API** - extractLastFrame(), sequential generation
3. **Character Emotion Tracking** - emotionalState, psychologyEvolution
4. **Motion Intelligence** - videoMotionEngine, buildMotionContext()
5. **Integration in geminiService** - ใช้ character psychology ในการสร้าง video

### ⚠️ Gap ที่พบ:
1. **videoGenerationService.ts** ไม่ได้ส่ง `character` parameter
2. **generateSceneVideos()** batch processing ไม่ update emotional state ระหว่าง shots
3. **buildVideoPrompt()** ใน videoGenerationService ไม่ใช้ psychology

---

## 🛠️ Implementation Plan

### Phase 1: เพิ่ม Character Support ใน videoGenerationService

#### 1.1 Update VideoGenerationOptions Interface

**File:** `src/services/videoGenerationService.ts`

**Changes:**
```typescript
export interface VideoGenerationOptions {
  quality?: '480p' | '720p' | '1080p' | '4K';
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
  preferredModel?: 'gemini-veo' | 'comfyui-svd' | 'comfyui-animatediff' | 'auto';
  fps?: number;
  duration?: number;
  frameCount?: number;
  motionStrength?: number;
  
  // VIDEO EXTENSION: Sequential Generation
  previousVideo?: string;
  endFrameInfluence?: number;
  transitionType?: 'seamless' | 'smooth' | 'creative';
  
  // CHARACTER CONSISTENCY: Face ID & LoRA
  characterReference?: {
    faceImage?: string;
    loraPath?: string;
    loraStrength?: number;
  };
  
  // 🆕 ADD: Buddhist Psychology Integration
  character?: Character;           // Character with psychology data
  currentScene?: GeneratedScene;   // Scene context for emotion tracking
}
```

---

#### 1.2 Update generateShotVideo() - Add Psychology

**Location:** Lines 142-210

**Current Code:**
```typescript
export async function generateShotVideo(
  shot: VideoShot,
  baseImage?: string,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  // ...
  
  // ❌ Build prompt WITHOUT psychology
  const prompt = buildVideoPrompt(shot);
  
  // ...
  
  // ❌ Pass to geminiService without character
  const videoUrl = await generateStoryboardVideo(
    prompt,
    initImage,
    onProgress,
    options.preferredModel || 'auto',
    generationOptions  // ❌ No character/scene data
  );
}
```

**New Code:**
```typescript
export async function generateShotVideo(
  shot: VideoShot,
  baseImage?: string,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`🎬 Generating video for shot: ${shot.shotType || shot.shotSize || 'Unknown'}`);

    // SEQUENTIAL GENERATION: Extract last frame
    let initImage = baseImage;
    if (options.previousVideo && !baseImage) {
      console.log('🔗 Sequential generation: Extracting last frame...');
      try {
        initImage = await extractLastFrame(options.previousVideo);
        console.log('✅ Last frame extracted successfully');
      } catch (error) {
        console.warn('⚠️ Failed to extract last frame:', error);
      }
    }

    // 🆕 Build psychology-aware prompt
    let prompt: string;
    if (options.character && options.currentScene) {
      // ✅ Import videoMotionEngine
      const { buildMotionContext } = await import('./videoMotionEngine');
      
      // ✅ Build comprehensive prompt with psychology
      const basePrompt = buildVideoPrompt(shot);
      const motionContext = buildMotionContext(
        options.character,
        shot.description || basePrompt
      );
      
      prompt = `${basePrompt}\n\n${motionContext}`;
      console.log('🧠 Psychology-driven prompt enhanced');
    } else {
      // Fallback to basic prompt
      prompt = buildVideoPrompt(shot);
    }

    const duration = options.duration || shot.duration || shot.durationSec || 3;

    // Adjust parameters for sequential continuity
    const generationOptions: Record<string, unknown> = {
      fps: options.fps || 24,
      duration: duration,
      motionStrength: options.motionStrength || 0.7,
    };

    // Sequential transition adjustments
    if (options.previousVideo && initImage) {
      if (options.transitionType === 'seamless') {
        generationOptions.motionStrength = 0.5;
      } else if (options.transitionType === 'smooth') {
        generationOptions.motionStrength = 0.6;
      }
      console.log(`🎨 Continuity mode: ${options.transitionType || 'smooth'}`);
    }

    // Character consistency (LoRA)
    if (options.characterReference) {
      generationOptions.lora = options.characterReference.loraPath;
      generationOptions.loraStrength = options.characterReference.loraStrength || 0.8;
      console.log(`👤 Character consistency enabled`);
    }

    // 🆕 Pass to geminiService WITH character/scene
    const videoUrl = await generateStoryboardVideo(
      prompt,
      initImage,
      onProgress,
      options.preferredModel || 'auto',
      {
        ...generationOptions,
        character: options.character,      // ✅ Pass character
        currentScene: options.currentScene, // ✅ Pass scene
        shotData: shot,                     // ✅ Pass shot data
      }
    );

    console.log(`✅ Video generated successfully`);
    return videoUrl;
  } catch (error) {
    console.error('❌ Failed to generate shot video:', error);
    throw error;
  }
}
```

---

#### 1.3 Update generateSceneVideos() - Add Emotion Updates

**Location:** Lines 217-300

**Current Code:**
```typescript
export async function generateSceneVideos(
  scene: GeneratedScene,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<BatchVideoResult> {
  // ...
  
  let lastVideoUrl: string | undefined;

  for (let i = 0; i < shots.length; i++) {
    // ❌ No emotion update between shots
    
    const shotOptions = {
      ...options,
      previousVideo: i > 0 ? lastVideoUrl : undefined,
    };

    const videoUrl = await generateShotVideo(shot, storyboardImage, shotOptions, ...);
    lastVideoUrl = videoUrl;
  }
}
```

**New Code:**
```typescript
export async function generateSceneVideos(
  scene: GeneratedScene,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<BatchVideoResult> {
  const results: BatchVideoResult = {
    success: true,
    videos: [],
    totalDuration: 0,
    failedCount: 0,
  };

  const shots = scene.shotList || [];
  console.log(`🎬 Starting batch video generation for ${shots.length} shots`);

  let lastVideoUrl: string | undefined;
  
  // 🆕 Track character state across shots
  let currentCharacter = options.character;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];

    try {
      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 0,
          status: 'generating',
        });
      }

      // 🆕 Update character emotion for this shot
      if (currentCharacter && options.currentScene) {
        const { updateEmotionalState } = await import('./psychologyCalculator');
        currentCharacter = updateEmotionalState(
          currentCharacter,
          `scene-${scene.sceneNumber}-shot-${i + 1}`
        );
        console.log(`🎭 Character emotion updated for shot ${i + 1}:`, 
          currentCharacter.emotionalState?.currentMood,
          `(energy: ${currentCharacter.emotionalState?.energyLevel})`
        );
      }

      const storyboardImage = scene.storyboard?.[i]?.image;

      const shotOptions: VideoGenerationOptions = {
        ...options,
        previousVideo: i > 0 ? lastVideoUrl : undefined,
        transitionType: options.transitionType || 'smooth',
        character: currentCharacter,          // ✅ Pass updated character
        currentScene: options.currentScene,   // ✅ Pass scene
      };

      const videoUrl = await generateShotVideo(
        shot,
        storyboardImage,
        shotOptions,
        (progress) => {
          if (onProgress) {
            onProgress({
              shotIndex: i,
              totalShots: shots.length,
              currentProgress: progress,
              status: 'generating',
            });
          }
        }
      );

      lastVideoUrl = videoUrl;

      results.videos.push({
        shotId: `${shot.scene}-shot-${shot.shot}`,
        videoUrl: videoUrl,
        duration: shot.durationSec,
      });

      results.totalDuration += shot.durationSec;

      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 100,
          status: 'completed',
          videoUrl: videoUrl,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to generate video for shot ${i + 1}:`, error);
      
      results.videos.push({
        shotId: `${shot.scene}-shot-${shot.shot}`,
        videoUrl: '',
        duration: shot.durationSec,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      results.failedCount++;

      if (onProgress) {
        onProgress({
          shotIndex: i,
          totalShots: shots.length,
          currentProgress: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  results.success = results.failedCount === 0;
  
  console.log(`🎬 Batch generation complete: ${results.videos.length - results.failedCount}/${shots.length} successful`);
  
  return results;
}
```

---

### Phase 2: Update UI Integration

#### 2.1 Update Step5Output.tsx - Pass Character

**File:** `src/components/Step5Output.tsx`  
**Function:** `handleGenerateShotVideo()`  
**Location:** Lines 1370-1430

**Current Code:**
```typescript
const videoUri = await generateStoryboardVideo(
  prompt,
  existingImage,
  p => setProgress(p),
  preferredVideoModel,
  {
    character: scriptData.characters[0],
    currentScene: editedScene,
    shotData: shotData,
    aspectRatio: videoAspectRatio,
    // ...
  }
);
```

**New Code (if using videoGenerationService):**
```typescript
// ✅ Option 1: Use generateShotVideo() wrapper
import { generateShotVideo } from '../services/videoGenerationService';

const videoUri = await generateShotVideo(
  shotData,
  existingImage,  // baseImage
  {
    character: scriptData.characters[0],      // ✅ Pass character
    currentScene: editedScene,                // ✅ Pass scene
    preferredModel: preferredVideoModel,
    aspectRatio: videoAspectRatio,
    width: videoAspectRatio === 'custom' ? customWidth : undefined,
    height: videoAspectRatio === 'custom' ? customHeight : undefined,
  },
  p => setProgress(p)  // onProgress
);

// OR

// ✅ Option 2: Keep using geminiService directly (current approach)
// No changes needed - already passes character
```

---

#### 2.2 Add Batch Video Generation UI

**File:** `src/components/Step5Output.tsx`

**New Function:**
```typescript
const handleGenerateAllShotVideos = async () => {
  if (!window.confirm(
    'สร้างวิดีโอทั้งหมดสำหรับฉากนี้ (Sequential Generation)?\n' +
    'วิดีโอแต่ละช็อตจะต่อเนื่องกันโดยอัตโนมัติ'
  )) {
    return;
  }

  if (onRegisterUndo) onRegisterUndo();

  setIsGeneratingAll(true);
  abortGenerationRef.current = false;

  try {
    const { generateSceneVideos } = await import('../services/videoGenerationService');

    const result = await generateSceneVideos(
      editedScene,
      {
        character: scriptData.characters[0],    // ✅ Pass character
        currentScene: editedScene,              // ✅ Pass scene
        preferredModel: preferredVideoModel,
        transitionType: 'smooth',               // Default transition
        aspectRatio: videoAspectRatio,
      },
      (progress) => {
        // Update UI progress
        setProgress(progress.currentProgress);
        
        // Update storyboard with generated videos
        if (progress.status === 'completed' && progress.videoUrl) {
          const shotNumber = editedScene.shotList?.[progress.shotIndex]?.shot;
          if (shotNumber) {
            const oldItem = editedScene.storyboard?.find(s => s.shot === shotNumber) || {
              shot: shotNumber,
              image: '',
            };
            const newItem = { ...oldItem, video: progress.videoUrl };
            
            const updatedStoryboard = [
              ...(editedScene.storyboard?.filter(s => s.shot !== shotNumber) || []),
              newItem,
            ];
            
            const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
            setEditedScene(updatedScene);
          }
        }
      }
    );

    if (result.success) {
      alert(`✅ สร้างวิดีโอสำเร็จทั้งหมด ${result.videos.length} ช็อต`);
    } else {
      alert(`⚠️ สร้างวิดีโอสำเร็จ ${result.videos.length - result.failedCount}/${result.videos.length} ช็อต`);
    }

    if (!isEditing) onSave(editedScene);
  } catch (error) {
    alert('Failed to generate videos: ' + (error instanceof Error ? error.message : 'Unknown error'));
    console.error(error);
  } finally {
    setIsGeneratingAll(false);
    setProgress(0);
  }
};
```

**Add Button:**
```tsx
<button
  onClick={handleGenerateAllShotVideos}
  disabled={isGeneratingAll || !editedScene.shotList || editedScene.shotList.length === 0}
  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
>
  {isGeneratingAll ? '⏳ กำลังสร้างวิดีโอทั้งหมด...' : '🎬 สร้างวิดีโอทั้งหมด (Sequential)'}
</button>
```

---

## 📊 Testing Plan

### Test Case 1: Single Shot with Psychology
```typescript
// Character: โกรธมาก (Very Angry)
const character: Character = {
  name: 'Test Character',
  emotionalState: {
    currentMood: 'angry',
    energyLevel: 90,
    mentalBalance: 15
  },
  buddhist_psychology: {
    carita: 'โทสจริต',
    anusaya: { /* ... */ }
  }
};

const videoUrl = await generateShotVideo(
  { description: 'walking towards camera' },
  undefined,
  { character, currentScene }
);

// Expected:
// - Fast, agitated movement
// - Tense body language
// - Sharp, aggressive mannerisms
```

---

### Test Case 2: Sequential with Emotion Evolution
```typescript
// Shot 1: Angry (energy: 85)
// Shot 2: Calming (energy: 60) - after meditation
// Shot 3: Peaceful (energy: 40)

const result = await generateSceneVideos(scene, {
  character: angryCharacter,
  currentScene: scene,
  transitionType: 'smooth'
});

// Expected:
// - Shot 1: Fast movement, tense
// - Shot 2: Moderate movement, balanced (seamless transition from shot 1)
// - Shot 3: Slow movement, relaxed (seamless transition from shot 2)
// - Each shot uses last frame of previous shot
```

---

### Test Case 3: Character Consistency + Psychology
```typescript
const result = await generateShotVideo(shot, undefined, {
  character: peacefulMonk,
  characterReference: {
    loraPath: 'monk-character.safetensors',
    loraStrength: 0.85
  },
  previousVideo: shot1Url,
  transitionType: 'seamless'
});

// Expected:
// - Same face throughout (LoRA)
// - Peaceful, slow movement (psychology)
// - Pixel-perfect continuation (previousVideo)
```

---

## 🎯 Benefits Summary

### Before Implementation:
- ❌ videoGenerationService ไม่ใช้ character psychology
- ❌ Batch generation ไม่ track emotion changes
- ❌ UI ต้องเรียก geminiService ตรงๆ

### After Implementation:
- ✅ videoGenerationService รองรับ character psychology
- ✅ Batch generation auto-update emotions per shot
- ✅ UI สามารถใช้ wrapper functions ง่ายขึ้น
- ✅ Consistent character behavior across all shots
- ✅ Seamless transitions (physical + emotional)

---

## 📝 File Changes Summary

| File | Changes | Lines Added | Impact |
|------|---------|-------------|--------|
| videoGenerationService.ts | Add character/scene parameters | ~80 | High |
| Step5Output.tsx | Add batch video generation UI | ~60 | Medium |
| types.ts | Update VideoGenerationOptions | ~5 | Low |

**Total Estimated Time:** 2-3 hours

---

## ✅ Checklist

- [ ] Update `VideoGenerationOptions` interface
- [ ] Modify `generateShotVideo()` to use character psychology
- [ ] Modify `generateSceneVideos()` to update emotions per shot
- [ ] Add `handleGenerateAllShotVideos()` to Step5Output
- [ ] Add UI button for batch generation
- [ ] Test single shot with psychology
- [ ] Test sequential generation with emotion evolution
- [ ] Test character consistency + psychology
- [ ] Update documentation
- [ ] Git commit

---

**Priority:** Medium  
**Impact:** High (improves character continuity and consistency)  
**Risk:** Low (additive changes, no breaking changes)

---

**Created:** 15 ธันวาคม 2568, 03:40  
**Status:** 📋 Ready for Implementation
