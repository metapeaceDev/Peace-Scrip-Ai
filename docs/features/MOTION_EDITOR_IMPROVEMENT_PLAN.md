# 🎬 แผนปรับปรุง Professional Motion Editor

**วันที่**: 14 มกราคม 2026  
**สถานะ**: ✅ วิเคราะห์เสร็จสมบูรณ์ - พร้อมดำเนินการ

---

## 📋 ปัญหาที่พบ

### 1. ปัญหาหลัก: Motion Editor แสดงวีดีโอเพียงคลิปเดียว

**สถานะปัจจุบัน**:
```typescript
// ใน MotionEditorPage.tsx (บรรทัด 64-71)
const storyboardItem = useMemo(() => {
  if (!currentScene || !shotId) return null;
  return currentScene.storyboard?.find(s => s.shot?.toString() === shotId);
}, [currentScene, shotId]);

const videoUrl = storyboardItem?.video || null;  // ❌ เอาแค่ video เดียว
const imageUrl = storyboardItem?.image || null;
```

**ปัญหา**:
- ❌ แสดงเฉพาะ `storyboardItem.video` (legacy single video)
- ❌ **ไม่ได้ใช้ `videoAlbum`** ที่เก็บวีดีโอหลายเวอร์ชัน
- ❌ **ไม่ได้ใช้ `selectedVideoId`** ที่ user เลือกไว้
- ❌ ไม่แสดงวีดีโอเรียงตามซีน-ช็อต

### 2. ข้อมูลที่มีอยู่แล้วแต่ไม่ได้ใช้

ระบบมี **Video Versioning** อยู่แล้ว (ใน [Step5Output.tsx](peace-script-basic-v1/src/components/Step5Output.tsx)):

```typescript
// ใน types/index.ts
interface StoryboardItem {
  shot: number;
  video?: string;  // Legacy single video
  
  // ✅ New multi-version system (มีอยู่แล้ว!)
  videoAlbum?: Array<{
    id: string;
    url: string;
    timestamp: string;
    metadata?: {
      requestPrompt?: string;
      requestNegativePrompt?: string;
      cameraBlocks?: any[];
      motion_strength?: number;
      fps?: number;
    };
  }>;
  selectedVideoId?: string | null;  // ✅ ID ของวีดีโอที่เลือก
}
```

**Helper Functions ที่มีอยู่แล้ว**:
```typescript
// src/components/Step5Output.tsx (บรรทัด 250-310)
const normalizeVideoAlbum = (item: any): VideoAlbumEntry[] => { ... }
const getSelectedVideoIdForItem = (item: any): string | null => { ... }
const applySelectedVideoIdToItem = (item: any, selectedId: string): any => { ... }
```

---

## 🎯 เป้าหมายการปรับปรุง

### Phase 1: แก้ Motion Editor ให้ใช้ Video Versioning
1. ✅ รองรับ `videoAlbum` แทน `video` เดียว
2. ✅ ใช้ `selectedVideoId` เป็นค่าเริ่มต้น
3. ✅ เพิ่ม dropdown เลือกเวอร์ชันวีดีโอในแต่ละช็อต

### Phase 2: Timeline แสดงวีดีโอหลายซีน
1. ✅ แสดงวีดีโอเรียงตามซีน → ช็อต
2. ✅ แต่ละช็อตแสดง selected video version
3. ✅ สามารถคลิกเข้าไปเลือกเวอร์ชันอื่นได้

### Phase 3: จัดระบบไฟล์ (File Organization)
1. ✅ ตรวจสอบโครงสร้างโปรเจคปัจจุบัน
2. ✅ ย้ายไฟล์ที่ไม่เกี่ยวข้องออกจาก root
3. ✅ จัดกลุ่ม docs, scripts, tools ให้เป็นระเบียบ

---

## 🔍 การตรวจสอบโครงสร้างโปรเจค

### โฟลเดอร์หลักปัจจุบัน
```
peace-script-basic-v1/
├── src/                       ✅ Source code หลัก
│   ├── components/            ✅ React components
│   ├── pages/                 ✅ Page components (MotionEditorPage อยู่ที่นี่)
│   ├── services/              ✅ Business logic
│   ├── types/                 ✅ TypeScript type definitions
│   └── utils/                 ✅ Helper utilities
│
├── comfyui-service/           ✅ Backend service (Node.js)
├── backend/                   ✅ Legacy backend (อาจจะไม่ใช้แล้ว?)
├── comfyui-backend/           ⚠️ ซ้ำกับ comfyui-service?
├── comfy-backend/             ⚠️ ซ้ำกับ comfyui-service?
│
├── docs/                      ✅ เอกสารโปรเจค
├── docs-archive/              ⚠️ เอกสารเก่า (ควรย้ายไป archive/)
├── scripts/                   ✅ Scripts ต่าง ๆ
├── tools/                     ✅ Command-line tools
├── tests/                     ✅ Test files
│
├── archive/                   ✅ ไฟล์เก่าที่ไม่ใช้แล้ว
├── planning_documents/        ✅ เอกสารวางแผน
│
├── public/                    ✅ Static assets
├── dist/                      ⚠️ Build output (อยู่ใน .gitignore?)
├── coverage/                  ⚠️ Test coverage (อยู่ใน .gitignore?)
├── node_modules/              ✅ Dependencies (ใน .gitignore)
├── .venv/                     ✅ Python venv (ใน .gitignore)
│
└── [Root files - 60+ files]   ⚠️ ไฟล์มากเกินไป ควรจัดกลุ่ม!
```

### ⚠️ ปัญหาโครงสร้างที่พบ

#### 1. Root Directory ยุ่งเกินไป (60+ files)
```
ANIMATEDIFF_STYLE_LIMITATION.md
CHANGELOG.md
CHARACTER_PROFILE_FIX.md
CHECKPOINT_UPGRADE_COMPLETE.md
CETASIKA_52_ANALYSIS.md
COMMIT_GUIDE.md
COMPLETION_REPORT.md
DEPLOYMENT_CHECKLIST.md
DOCS_ORGANIZATION_PLAN.md
EXPORT_FIX_SUMMARY.md
FACE_ID_3_TIER_STATUS.md
FACE_ID_COMPLETE_SUMMARY.md
FACE_ID_FINAL_REPORT.md
FACE_ID_INSTALLATION_COMPLETE.md
FACE_ID_SYSTEM_STATUS.md
FACEID_SPEED_FIX_COMPLETE.md
FINAL_SETUP_COMPLETE.md
FINAL_SUMMARY.md
FIND_FIREBASE_CONFIG_DETAILED.md
HOW_TO_ADD_API_KEYS.md
IMAGE_TO_VIDEO_QUALITY_FIX.md
INSTANTID_FIX_PLAN.md
LORA_QUICK_GUIDE.md
LORA_TRAINING_SETUP.md
MODEL_INSTALLATION_SUMMARY.md
ORGANIZATION_REPORT.md
PRODUCTION_FIX_GUIDE.md
PROJECT_ORGANIZATION_ANALYSIS.md
PROJECT_ORGANIZATION_SUMMARY.md
QUICK_ACTION_GUIDE.md
QUICK_START_LORA_FACESWAP.md
QUICK_START_VIDEO_VOICE.md
READY_TO_COMMIT.md
SECURITY_SUMMARY.md
SESSION_STATE.md
SPEECH_PATTERN_FALLBACK_COMPLETE.md
STORYBOARD_CONSISTENCY_FIX.md
STORYBOARD_STYLE_CHARACTER_FIX.md
VFX_FIELD_IMPLEMENTATION.md
... และอีกเยอะมาก
```

**แนวทางแก้**:
- ย้าย status/fix reports ไปที่ `docs/reports/`
- ย้าย quick guides ไปที่ `docs/getting-started/`
- ย้าย installation guides ไปที่ `docs/installation/`
- เก็บใน root แค่: `README.md`, `package.json`, config files

#### 2. Backend Folders ซ้ำกัน
```
├── backend/                   (legacy?)
├── comfyui-backend/           (ซ้ำ?)
├── comfy-backend/             (ซ้ำ?)
└── comfyui-service/           (ใช้งานจริง)
```

**ต้องตรวจสอบ**:
- Backend ไหนใช้งานจริง?
- Folders อื่นสามารถลบหรือ archive ได้ไหม?

#### 3. Docs Scattered Everywhere
```
├── docs/                      (เอกสารหลัก)
├── docs-archive/              (เอกสารเก่า)
└── [Root - 30+ MD files]      (ควรอยู่ใน docs/)
```

**แนวทางแก้**:
- ย้าย markdown files จาก root ไป `docs/`
- แบ่งหมวดหมู่: reports/, features/, installation/, troubleshooting/

---

## 📊 แผนจัดระบบไฟล์

### ขั้นตอนที่ 1: สำรวจและตรวจสอบ

```powershell
# 1. ตรวจสอบ backend folders ว่าใช้อันไหนอยู่
Get-ChildItem -Path backend/, comfyui-backend/, comfy-backend/, comfyui-service/ -Recurse | 
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddMonths(-1) } | 
  Select-Object FullName, LastWriteTime

# 2. ตรวจสอบ markdown files ใน root
Get-ChildItem -Path . -Filter "*.md" -File | 
  Select-Object Name, LastWriteTime | 
  Sort-Object LastWriteTime -Descending

# 3. ตรวจสอบว่า docs-archive/ มีอะไรบ้าง
Get-ChildItem -Path docs-archive/ -Recurse | Measure-Object
```

### ขั้นตอนที่ 2: จัดกลุ่มเอกสาร

**เสนอโครงสร้างใหม่**:
```
docs/
├── README.md                  (Index หลัก)
├── getting-started/
│   ├── QUICK_START.md
│   ├── QUICK_START_LORA_FACESWAP.md
│   ├── QUICK_START_VIDEO_VOICE.md
│   └── QUICK_ACTION_GUIDE.md
│
├── installation/
│   ├── FACE_ID_INSTALLATION_GUIDE.md
│   ├── LORA_TRAINING_SETUP.md
│   └── MODEL_INSTALLATION_SUMMARY.md
│
├── features/
│   ├── ANIMATEDIFF_STYLE_LIMITATION.md
│   ├── CETASIKA_52_ANALYSIS.md
│   ├── IMAGE_TO_VIDEO_QUALITY_FIX.md
│   ├── STORYBOARD_CONSISTENCY_FIX.md
│   └── VFX_FIELD_IMPLEMENTATION.md
│
├── reports/
│   ├── status/
│   │   ├── FACE_ID_SYSTEM_STATUS.md
│   │   ├── SESSION_STATE.md
│   │   └── PROJECT_ORGANIZATION_SUMMARY.md
│   │
│   ├── completion/
│   │   ├── COMPLETION_REPORT.md
│   │   ├── FINAL_SUMMARY.md
│   │   ├── FACE_ID_COMPLETE_SUMMARY.md
│   │   └── FACEID_SPEED_FIX_COMPLETE.md
│   │
│   └── fixes/
│       ├── CHARACTER_PROFILE_FIX.md
│       ├── EXPORT_FIX_SUMMARY.md
│       └── STORYBOARD_STYLE_CHARACTER_FIX.md
│
├── guides/
│   ├── COMMIT_GUIDE.md
│   ├── PRODUCTION_FIX_GUIDE.md
│   └── HOW_TO_ADD_API_KEYS.md
│
├── deployment/
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── SECURITY_SUMMARY.md
│   └── READY_TO_COMMIT.md
│
└── archive/                   (เอกสารเก่าที่ไม่ใช้แล้ว)
    └── docs-archive/
```

### ขั้นตอนที่ 3: สคริปต์ย้ายไฟล์อัตโนมัติ

```powershell
# organize-docs.ps1
$rootPath = "C:\Users\USER\Desktop\peace-script-basic-v1\peace-script-basic-v1"

# กำหนดหมวดหมู่
$categories = @{
  'getting-started' = @('QUICK_START*', 'QUICK_ACTION*')
  'installation' = @('*INSTALLATION*', '*SETUP*', 'LORA_TRAINING*')
  'features' = @('*LIMITATION*', 'CETASIKA*', '*_FIX.md', 'VFX*')
  'reports/status' = @('*STATUS*', 'SESSION_STATE*', '*ORGANIZATION*')
  'reports/completion' = @('COMPLETION*', 'FINAL_SUMMARY*', '*COMPLETE*')
  'guides' = @('*GUIDE*', 'COMMIT_GUIDE*', 'PRODUCTION*')
  'deployment' = @('DEPLOYMENT*', 'SECURITY*', 'READY_TO_COMMIT*')
}

# ย้ายไฟล์
foreach ($category in $categories.Keys) {
  $targetDir = Join-Path $rootPath "docs\$category"
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  
  foreach ($pattern in $categories[$category]) {
    Get-ChildItem -Path $rootPath -Filter $pattern -File | ForEach-Object {
      Write-Host "Moving $($_.Name) → docs/$category/"
      Move-Item $_.FullName -Destination $targetDir -Force
    }
  }
}
```

---

## 💻 แผนแก้ไข Motion Editor

### Phase 1: เพิ่มการรองรับ Video Album

**ไฟล์ที่ต้องแก้**: `src/pages/MotionEditorPage.tsx`

#### 1. เพิ่ม import helper functions
```typescript
// เพิ่มใกล้บรรทัด 22
import type { ScriptData, GeneratedScene, StoryboardItem } from '../types';

// เพิ่ม helper functions จาก Step5Output
type VideoAlbumEntry = NonNullable<StoryboardItem['videoAlbum']>[number];

const normalizeVideoAlbum = (item: StoryboardItem): VideoAlbumEntry[] => {
  const existing: VideoAlbumEntry[] = Array.isArray(item?.videoAlbum) ? item.videoAlbum : [];
  
  // Add legacy video as first entry if exists
  const legacyEntry: VideoAlbumEntry | null =
    item?.video && !existing.some(e => e.url === item.video)
      ? {
          id: item.selectedVideoId || `legacy_${Date.now()}`,
          url: item.video,
          timestamp: new Date().toISOString(),
          metadata: {},
        }
      : null;
  
  return legacyEntry ? [legacyEntry, ...existing] : existing;
};

const getSelectedVideoIdForItem = (item: StoryboardItem): string | null => {
  const selected = typeof item?.selectedVideoId === 'string' ? item.selectedVideoId : null;
  const album = normalizeVideoAlbum(item);
  return selected && album.some(e => e.id === selected) ? selected : album[0]?.id || null;
};
```

#### 2. แก้การดึงข้อมูลวีดีโอ (บรรทัด 63-71)
```typescript
// แทนที่:
const videoUrl = storyboardItem?.video || null;
const imageUrl = storyboardItem?.image || null;

// ด้วย:
const videoAlbum = useMemo(() => {
  if (!storyboardItem) return [];
  return normalizeVideoAlbum(storyboardItem);
}, [storyboardItem]);

const selectedVideoId = useMemo(() => {
  if (!storyboardItem) return null;
  return getSelectedVideoIdForItem(storyboardItem);
}, [storyboardItem]);

const selectedVideo = useMemo(() => {
  if (!selectedVideoId || videoAlbum.length === 0) return null;
  return videoAlbum.find(v => v.id === selectedVideoId) || videoAlbum[0];
}, [videoAlbum, selectedVideoId]);

const videoUrl = selectedVideo?.url || null;
const imageUrl = storyboardItem?.image || null;
```

#### 3. เพิ่ม Video Version Selector (หลังบรรทัด 440)
```typescript
{/* Video Version Selector */}
{videoAlbum.length > 1 && (
  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
    <h3 className="text-lg font-bold mb-3">🎞️ Video Versions ({videoAlbum.length})</h3>
    <select
      value={selectedVideoId || ''}
      onChange={(e) => {
        const newId = e.target.value;
        if (onSave && storyboardItem) {
          onSave({
            ...storyboardItem,
            selectedVideoId: newId,
          });
        }
      }}
      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
    >
      {videoAlbum.map((video, idx) => (
        <option key={video.id} value={video.id}>
          Version {idx + 1} - {new Date(video.timestamp).toLocaleString('th-TH')}
          {video.metadata?.motion_strength && ` (Motion: ${video.metadata.motion_strength})`}
        </option>
      ))}
    </select>
    
    {/* Metadata Preview */}
    {selectedVideo?.metadata && (
      <div className="mt-3 text-sm text-gray-400 space-y-1">
        {selectedVideo.metadata.motion_strength && (
          <div>• Motion Strength: {selectedVideo.metadata.motion_strength}</div>
        )}
        {selectedVideo.metadata.fps && (
          <div>• FPS: {selectedVideo.metadata.fps}</div>
        )}
        {selectedVideo.metadata.cameraBlocks && (
          <div>• Camera Blocks: {selectedVideo.metadata.cameraBlocks.length}</div>
        )}
      </div>
    )}
  </div>
)}
```

### Phase 2: แสดงวีดีโอหลายซีน (Timeline View)

**เพิ่ม Multi-Scene Timeline Component**:

```typescript
// เพิ่มหลังบรรทัด 48 (หลัง currentScene useMemo)

// Get ALL scenes and shots for timeline
const allSceneShotVideos = useMemo(() => {
  if (!scriptData) return [];
  
  const result: Array<{
    sceneTitle: string;
    sceneNumber: number;
    shotId: string;
    shotNumber: number;
    videoUrl: string | null;
    imageUrl: string | null;
    selectedVersion: VideoAlbumEntry | null;
    allVersions: VideoAlbumEntry[];
  }> = [];
  
  scriptData.structure.forEach((plotPoint, sceneIdx) => {
    const scenes = scriptData.generatedScenes[plotPoint.title] || [];
    scenes.forEach((scene) => {
      scene.storyboard?.forEach((item) => {
        const album = normalizeVideoAlbum(item);
        const selectedId = getSelectedVideoIdForItem(item);
        const selectedVer = album.find(v => v.id === selectedId) || album[0] || null;
        
        result.push({
          sceneTitle: plotPoint.title,
          sceneNumber: sceneIdx + 1,
          shotId: item.shot?.toString() || '',
          shotNumber: item.shot || 0,
          videoUrl: selectedVer?.url || null,
          imageUrl: item.image || null,
          selectedVersion: selectedVer,
          allVersions: album,
        });
      });
    });
  });
  
  return result;
}, [scriptData]);
```

**เพิ่ม Timeline View UI**:
```typescript
{/* Multi-Scene Timeline (เพิ่มใหม่) */}
<div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
  <h3 className="text-lg font-bold mb-3">🎬 Full Project Timeline</h3>
  
  <div className="space-y-4 max-h-64 overflow-y-auto">
    {allSceneShotVideos.map((shot, idx) => (
      <div
        key={`${shot.sceneNumber}-${shot.shotNumber}`}
        className={`p-3 rounded border cursor-pointer transition-colors ${
          shot.shotId === shotId
            ? 'bg-purple-900/50 border-purple-500'
            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
        }`}
        onClick={() => {
          // Navigate to this shot
          if (onSave) {
            onSave({ shotId: shot.shotId });
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-green-400">
              Scene {shot.sceneNumber} - Shot {shot.shotNumber}
            </div>
            <div className="text-xs text-gray-400">{shot.sceneTitle}</div>
          </div>
          
          <div className="flex items-center gap-2">
            {shot.videoUrl && (
              <span className="text-xs bg-red-600 px-2 py-1 rounded">
                📹 Video
              </span>
            )}
            {shot.imageUrl && (
              <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                🖼️ Image
              </span>
            )}
            {shot.allVersions.length > 1 && (
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                {shot.allVersions.length} versions
              </span>
            )}
          </div>
        </div>
        
        {/* Version selector for this shot */}
        {shot.allVersions.length > 1 && (
          <select
            value={shot.selectedVersion?.id || ''}
            onChange={(e) => {
              e.stopPropagation();
              // Update selected version for this shot
              // ... (implement version change logic)
            }}
            className="mt-2 w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {shot.allVersions.map((ver, vIdx) => (
              <option key={ver.id} value={ver.id}>
                V{vIdx + 1} - {new Date(ver.timestamp).toLocaleString('th-TH', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </option>
            ))}
          </select>
        )}
      </div>
    ))}
  </div>
</div>
```

---

## 📈 สรุปและลำดับการดำเนินการ

### ✅ สิ่งที่ต้องทำก่อน (Prerequisites)
1. **ตรวจสอบ Backend Folders**: ดูว่า backend/, comfyui-backend/, comfy-backend/ ใช้อันไหนอยู่
2. **Backup ข้อมูล**: สำรองไฟล์ก่อนจัดระบบ
3. **ทดสอบระบบปัจจุบัน**: รันทดสอบให้แน่ใจว่าทุกอย่างยังทำงานได้

### 🔨 ลำดับการดำเนินการ

#### Phase 1: จัดระบบไฟล์ (1-2 ชม.)
1. ✅ สำรวจและจัดหมวดหมู่ markdown files
2. ✅ สร้างโครงสร้างโฟลเดอร์ใน `docs/`
3. ✅ ย้ายไฟล์ด้วยสคริปต์ `organize-docs.ps1`
4. ✅ ตรวจสอบว่าไม่มีอะไรพัง

#### Phase 2: แก้ Motion Editor - Video Album Support (2-3 ชม.)
1. ✅ เพิ่ม helper functions (normalizeVideoAlbum, getSelectedVideoIdForItem)
2. ✅ แก้การดึงข้อมูลวีดีโอให้ใช้ videoAlbum
3. ✅ เพิ่ม Video Version Selector dropdown
4. ✅ ทดสอบการสลับเวอร์ชัน

#### Phase 3: เพิ่ม Multi-Scene Timeline (2-3 ชม.)
1. ✅ สร้าง `allSceneShotVideos` useMemo
2. ✅ เพิ่ม Timeline View component
3. ✅ เชื่อมโยงการคลิกเพื่อเปลี่ยนช็อต
4. ✅ เพิ่ม version selector ในแต่ละช็อต

#### Phase 4: Testing & Polish (1-2 ชม.)
1. ✅ ทดสอบกับโปรเจคจริง
2. ✅ ตรวจสอบ responsive design
3. ✅ เพิ่ม loading states
4. ✅ ปรับปรุง UX/UI

**เวลาทั้งหมด**: 6-10 ชั่วโมง

---

## 🎯 Next Steps

ต้องการให้เริ่มจาก:
1. **จัดระบบไฟล์ก่อน** (สร้างสคริปต์ organize-docs.ps1)?
2. **แก้ Motion Editor ทันที** (เริ่มที่ videoAlbum support)?
3. **ตรวจสอบ Backend ก่อน** (ดูว่า folders ไหนใช้งานจริง)?

บอกมาได้เลยครับ! 🚀
