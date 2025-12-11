# 🎬 Timeline Video/Image Integration - System Analysis

## 📊 ปัญหาที่พบ

### 1. MotionEditorPage ไม่แสดง Storyboard Media
**ตำแหน่ง**: `src/pages/MotionEditorPage.tsx`

**ปัญหา**:
- ✅ รับ `scriptData` (props)
- ✅ รับ `shotId` (props)
- ❌ **ไม่ได้ดึงข้อมูล storyboard จาก scriptData**
- ❌ **ไม่มี video/image track ใน multitrack timeline**
- ❌ **ไม่มี preview display สำหรับ media**

### 2. KeyframeTimeline เป็นเพียง Animation Controller
**ตำแหน่ง**: `src/components/KeyframeTimeline.tsx`

**ลักษณะปัจจุบัน**:
- ✅ Keyframe management (add/remove/drag)
- ✅ Interpolation curves
- ✅ Playback control
- ❌ **ไม่มีการแสดง video/image thumbnails**
- ❌ **ไม่ได้เชื่อมต่อกับ storyboard data**

### 3. Multi-track Timeline ขาดข้อมูล Media
**ตำแหน่ง**: `src/pages/MotionEditorPage.tsx` Lines 107-114

**Track ปัจจุบัน**:
```typescript
const [tracks, setTracks] = useState([
  { id: 1, name: '🔊 SFX', clips: [...] },      // ✅ มี
  { id: 2, name: '💬 Dialogue', clips: [...] }, // ✅ มี
  { id: 3, name: '🎭 Actions', clips: [...] }   // ✅ มี
]);
```

**Track ที่ขาดหายไป**:
```typescript
❌ { id: 4, name: '🎬 Video', clips: [...] }    // ไม่มี
❌ { id: 5, name: '🖼️ Images', clips: [...] }  // ไม่มี
```

---

## 🎯 สาเหตุหลัก

### 1. Data Flow ไม่เชื่อมต่อ
```
Storyboard (Step5Output.tsx)
  ├─ scene.storyboard = [
  │    { shot: 1, image: "base64...", video: "url..." },
  │    { shot: 2, image: "base64...", video: "url..." }
  │  ]
  ↓
MotionEditorPage.tsx
  ├─ scriptData (รับมา) ✅
  ├─ shotId (รับมา) ✅
  └─ storyboard data (ไม่ได้ดึงออกมาใช้) ❌
```

### 2. ขาด Video/Image Preview Component
- ไม่มี component สำหรับแสดง video player
- ไม่มี thumbnail view สำหรับ images
- ไม่มี scrubbing control (เลื่อนดูวีดีโอ)

### 3. Timeline Track ไม่ครบ
- SFX, Dialogue, Actions มีแล้ว ✅
- Video track ไม่มี ❌
- Image track ไม่มี ❌

---

## ✅ แผนการแก้ไข (Systematic Fix)

### Phase 1: เพิ่ม Video/Image Track
**ไฟล์**: `src/pages/MotionEditorPage.tsx`

**งาน**:
1. ดึงข้อมูล storyboard จาก scriptData
2. สร้าง Video track จาก storyboard videos
3. สร้าง Image track จาก storyboard images
4. แสดง thumbnail ใน timeline clips

### Phase 2: เพิ่ม Preview Display
**ไฟล์**: `src/pages/MotionEditorPage.tsx`

**งาน**:
1. สร้าง Video Preview component
2. สร้าง Image Preview component
3. Sync playback กับ timeline currentTime
4. เพิ่ม scrubbing control

### Phase 3: เชื่อม Keyframe Timeline
**ไฟล์**: `src/components/KeyframeTimeline.tsx`

**งาน**:
1. เพิ่ม thumbnail display ใน keyframe markers
2. แสดง video frame ตาม currentTime
3. Sync animation กับ video playback

### Phase 4: Multi-track Improvements
**ไฟล์**: `src/pages/MotionEditorPage.tsx`

**งาน**:
1. เพิ่ม Video track (🎬)
2. เพิ่ม Image track (🖼️)
3. แสดง thumbnail ใน clips
4. Drag & drop สำหรับจัดเรียง clips

---

## 🔧 Implementation Details

### 1. ดึงข้อมูล Storyboard
```typescript
// ใน MotionEditorPage.tsx

// Get current scene and shot data
const currentScene = useMemo(() => {
  if (!scriptData || !shotId) return null;
  
  // Find scene containing this shot
  for (const plotPoint of scriptData.structure) {
    const scenes = scriptData.generatedScenes[plotPoint.title] || [];
    for (const scene of scenes) {
      if (scene.shotList?.some(s => s.shot.toString() === shotId)) {
        return scene;
      }
    }
  }
  return null;
}, [scriptData, shotId]);

// Get storyboard item for current shot
const storyboardItem = useMemo(() => {
  if (!currentScene || !shotId) return null;
  return currentScene.storyboard?.find(s => s.shot.toString() === shotId);
}, [currentScene, shotId]);

// Extract video and image
const videoUrl = storyboardItem?.video;
const imageUrl = storyboardItem?.image;
```

### 2. สร้าง Video/Image Tracks
```typescript
// Add to tracks state
const [tracks, setTracks] = useState([
  { 
    id: 1, 
    name: '🎬 Video', 
    clips: videoUrl ? [{
      id: 'video_main',
      start: 0,
      end: duration,
      label: `Shot ${shotId}`,
      color: '#ef4444',
      mediaUrl: videoUrl,
      mediaType: 'video'
    }] : []
  },
  { 
    id: 2, 
    name: '🖼️ Images', 
    clips: imageUrl ? [{
      id: 'image_main',
      start: 0,
      end: duration,
      label: `Shot ${shotId}`,
      color: '#8b5cf6',
      mediaUrl: imageUrl,
      mediaType: 'image'
    }] : []
  },
  {  id: 3, name: '🔊 SFX', clips: [...] },
  {  id: 4, name: '💬 Dialogue', clips: [...] },
  {  id: 5, name: '🎭 Actions', clips: [...] }
]);
```

### 3. Preview Component
```typescript
// Video Preview
{videoUrl && (
  <div className="video-preview">
    <video
      ref={videoRef}
      src={videoUrl}
      currentTime={currentTime}
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      controls
      className="w-full h-auto rounded-lg"
    />
  </div>
)}

// Image Preview
{imageUrl && !videoUrl && (
  <div className="image-preview">
    <img
      src={imageUrl}
      alt={`Shot ${shotId}`}
      className="w-full h-auto rounded-lg"
    />
  </div>
)}
```

### 4. Thumbnail ใน Timeline Clips
```typescript
{track.clips.map(clip => (
  <div
    key={clip.id}
    className="clip-with-thumbnail"
    style={{...}}
  >
    {/* Thumbnail */}
    {clip.mediaType === 'video' && (
      <video
        src={clip.mediaUrl}
        className="clip-thumbnail"
        currentTime={clip.start}
      />
    )}
    {clip.mediaType === 'image' && (
      <img
        src={clip.mediaUrl}
        className="clip-thumbnail"
      />
    )}
    
    {/* Label */}
    <span className="clip-label">{clip.label}</span>
  </div>
))}
```

---

## 📋 Implementation Checklist

### Phase 1: Data Integration (30 min)
- [ ] เพิ่ม useMemo สำหรับดึง currentScene
- [ ] เพิ่ม useMemo สำหรับดึง storyboardItem
- [ ] Extract videoUrl และ imageUrl
- [ ] สร้าง Video track
- [ ] สร้าง Image track

### Phase 2: Preview Display (45 min)
- [ ] สร้าง VideoPreview component
- [ ] สร้าง ImagePreview component
- [ ] เพิ่ม video controls (play/pause/scrub)
- [ ] Sync currentTime กับ timeline
- [ ] เพิ่ม thumbnail hover preview

### Phase 3: Timeline Enhancement (30 min)
- [ ] แสดง thumbnail ใน track clips
- [ ] เพิ่ม video scrubbing
- [ ] Sync video playback กับ timeline
- [ ] เพิ่ม visual feedback

### Phase 4: Testing (15 min)
- [ ] ทดสอบ video playback
- [ ] ทดสอบ image display
- [ ] ทดสอบ timeline sync
- [ ] ทดสอบ scrubbing
- [ ] ทดสอบ performance

**Total Time**: ~2 hours

---

## 🎯 Expected Result

### Before (ปัจจุบัน)
```
Timeline
├─ 🔊 SFX Track
├─ 💬 Dialogue Track
└─ 🎭 Actions Track

Preview: [Empty or placeholder]
```

### After (หลังแก้ไข)
```
Timeline
├─ 🎬 Video Track (with video thumbnail)
├─ 🖼️ Images Track (with image thumbnail)
├─ 🔊 SFX Track
├─ 💬 Dialogue Track
└─ 🎭 Actions Track

Preview: 
┌─────────────────────┐
│  [Video Player]     │
│  Playing: Shot 1    │
│  00:02 / 00:05      │
│  [▶ ⏸ ⏮ ⏭]        │
└─────────────────────┘
```

---

## 🔍 Files to Modify

1. **src/pages/MotionEditorPage.tsx** (PRIMARY)
   - Add data extraction logic
   - Add Video/Image tracks
   - Add preview components
   - Update multitrack display

2. **src/components/KeyframeTimeline.tsx** (OPTIONAL)
   - Add thumbnail support
   - Add video frame display
   - Improve visual feedback

3. **types.ts** (IF NEEDED)
   - Extend Track interface
   - Add MediaClip type

---

## 🚀 Priority

**HIGH PRIORITY** - User cannot see generated content
- ✅ Critical for UX
- ✅ Core functionality missing
- ✅ Quick win (2 hours)

---

**Status**: 📝 PLANNED
**Next Step**: 🔨 IMPLEMENT PHASE 1
