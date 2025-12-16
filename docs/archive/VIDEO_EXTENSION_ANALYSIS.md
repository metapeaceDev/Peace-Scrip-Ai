# 🎬 Video Extension & Character Consistency - การวิเคราะห์และแผนการแก้ไข

**วันที่:** 15 ธันวาคม 2568  
**ผู้วิเคราะห์:** GitHub Copilot AI Assistant  
**สถานะ:** 📋 Planning Complete

---

## 📊 สรุปปัญหาที่พบทั้งหมด

### 1. ⚠️ Progress Bar Non-Monotonic Bug
**ปัญหา:** ตัวเลข progress ขยับขึ้นแล้วลดลงย้อนกลับ

**สาเหตุ:**
```typescript
// replicateService.ts: waitForPrediction()
const elapsed = Date.now() - startTime;
const estimatedTotal = 45000; // 45s average
const progress = Math.min((elapsed / estimatedTotal) * 100, 95);
onProgress(progress);  // ❌ คำนวณใหม่ทุกครั้ง อาจน้อยกว่าค่าเก่า
```

**ผลกระทบ:** UX แย่ ผู้ใช้สับสน

---

### 2. ✅ Image-to-Video (I2V) Support
**สถานะ:** ✅ **มีอยู่แล้วและทำงานได้**

**หลักฐาน:**
```typescript
// generateAnimateDiffVideo()
if (image) {
  input.image = `data:image/png;base64,${image}`;  // ✅ รับ base64
}

// generateSVDVideo()
input = {
  image: image,  // ✅ REQUIRED for SVD
  num_frames: 14,
  motion_bucket_id: 127
};
```

**ข้อสรุป:** ไม่ต้องแก้ไข รองรับอยู่แล้ว

---

### 3. ⚠️ Video Extension (Sequential Generation)
**ปัญหา:** ยังไม่มี API สำหรับการนำ last frame ของวิดีโอก่อนหน้ามาเป็น first frame ของวิดีโอถัดไป

**ที่ต้องทำ:**
- เพิ่ม `previousVideo` parameter ใน `generateShotVideo()`
- Extract last frame จาก previous video
- ส่งเป็น `baseImage` ให้ I2V models
- รองรับทั้ง Replicate (AnimateDiff, SVD) และ ComfyUI

---

### 4. ⚠️ Character Consistency
**ปัญหา:** ใบหน้าตัวละครไม่คงที่ระหว่างฉาก

**สาเหตุ:** ยังไม่มี Face ID/LoRA integration ใน video pipeline

**ที่ต้องทำ:**
- เพิ่ม Face ID support (InstantID/IP-Adapter)
- เพิ่ม Character LoRA selection
- Apply LoRA ใน video generation workflow

---

### 5. ⚠️ Pixel-perfect Continuity
**ปัญหา:** ต้องการ last frame เหมือน first frame แบบ pixel-perfect

**วิธีแก้:**
- Extract last frame จาก video ด้วย Canvas API (client-side)
- หรือ FFmpeg (server-side)
- ส่ง frame เป็น init_image ให้ I2V model
- ตั้ง `denoise_strength = 0.3-0.5` เพื่อรักษา composition

---

## 🎯 แผนการแก้ไขตามลำดับความสำคัญ

### Priority 1: Fix Progress Bar (CRITICAL) 🔴
**เวลา:** 30 นาที  
**ผลกระทบ:** UX ทันที

**การแก้ไข:**
```typescript
// replicateService.ts
let lastProgress = 0;  // ✅ เก็บค่าสูงสุด

async function waitForPrediction(...) {
  while (true) {
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedTotal) * 100, 95);
      
      // ✅ Monotonic: เพิ่มได้อย่างเดียว
      if (progress > lastProgress) {
        lastProgress = progress;
        onProgress(lastProgress);
      }
    }
  }
}
```

---

### Priority 2: Add Video Extension API 🟡
**เวลา:** 2 ชั่วโมง  
**ผลกระทบ:** Feature ใหม่ สำคัญมาก

**Interface:**
```typescript
export interface VideoGenerationOptions {
  // ...existing options
  
  // 🆕 Video Extension
  previousVideo?: string;  // URL ของวิดีโอก่อนหน้า
  endFrameInfluence?: number;  // 0-1, ความแข็งแกร่งของ last frame (default: 0.7)
  transitionType?: 'seamless' | 'smooth' | 'creative';
}

// 🆕 Helper: Extract last frame from video
export async function extractLastFrame(videoUrl: string): Promise<string> {
  // Implementation using Canvas API
}

// ✅ Updated generateShotVideo()
export async function generateShotVideo(
  shot: VideoShot,
  baseImage?: string,
  options: VideoGenerationOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  // 🆕 Extract last frame if previousVideo provided
  let initImage = baseImage;
  if (options.previousVideo) {
    initImage = await extractLastFrame(options.previousVideo);
  }
  
  // ใช้ initImage ตามปกติ
  const videoUrl = await generateStoryboardVideo(
    prompt,
    initImage,  // ✅ Last frame from previous video
    onProgress,
    ...
  );
}
```

**Helper Function:**
```typescript
/**
 * Extract last frame from video URL
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      // Seek to last frame
      video.currentTime = video.duration - 0.1;
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(video, 0, 0);
      
      // Convert to base64
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(base64);
    };
    
    video.onerror = reject;
  });
}
```

---

### Priority 3: Character Consistency 🟢
**เวลา:** 3 ชั่วโมง  
**ผลกระทบ:** คุณภาพ

**การแก้ไข:**

1. **เพิ่ม Face Reference Support:**
```typescript
export interface VideoGenerationOptions {
  // ...existing
  
  // 🆕 Character Consistency
  characterReference?: {
    faceImage: string;  // Face ID reference
    loraPath?: string;  // Custom LoRA model
    loraStrength?: number;  // 0-1 (default: 0.8)
  };
}
```

2. **Update Workflow:**
```typescript
// geminiService.ts: generateVideoWithComfyUI()
async function generateVideoWithComfyUI(options) {
  // ...
  
  // 🆕 Add IP-Adapter for Face ID
  if (options.characterReference?.faceImage) {
    workflow['ip_adapter'] = {
      inputs: {
        model: ['1', 0],
        clip_vision: ['clip_vision_loader', 0],
        image: options.characterReference.faceImage,
        weight: 0.9,
        noise: 0.0
      },
      class_type: 'IPAdapterApply'
    };
  }
  
  // 🆕 Add LoRA if provided
  if (options.characterReference?.loraPath) {
    workflow['lora'] = {
      inputs: {
        lora_name: options.characterReference.loraPath,
        strength_model: options.characterReference.loraStrength || 0.8,
        model: ['1', 0]
      },
      class_type: 'LoraLoader'
    };
  }
}
```

---

### Priority 4: Pixel-perfect Continuity 🟢
**เวลา:** 1 ชั่วโมง  
**ผลกระทบ:** คุณภาพสูง

**การแก้ไข:**
```typescript
// ComfyUI: Use lower denoising for better continuity
if (options.previousVideo) {
  workflow['sampler']['inputs']['denoise'] = 0.4;  // ✅ Keep 60% of original
}

// Replicate: Use higher cond_aug for SVD
const svdOptions = {
  cond_aug: 0.01,  // ✅ Less noise = more faithful to input
  motion_bucket_id: 100  // ✅ Moderate motion
};
```

---

## 📝 Implementation Checklist

### Phase 1: Fix Progress Bar (30 min) ✅
- [ ] แก้ไข `waitForPrediction()` ให้ monotonic
- [ ] ทดสอบกับ single shot generation
- [ ] ทดสอบกับ batch generation
- [ ] ตรวจสอบว่าไม่มี progress ลดลง

### Phase 2: Video Extension API (2 hours)
- [ ] เพิ่ม `previousVideo` parameter ใน `VideoGenerationOptions`
- [ ] Implement `extractLastFrame()` helper
- [ ] Update `generateShotVideo()` ให้รองรับ sequential
- [ ] เพิ่ม UI controls ใน Step5Output
- [ ] ทดสอบ shot 1 → shot 2 → shot 3 continuity

### Phase 3: Character Consistency (3 hours)
- [ ] เพิ่ม `characterReference` parameter
- [ ] Integrate IP-Adapter workflow
- [ ] Support LoRA selection
- [ ] Update `generateStoryboardVideo()` flow
- [ ] ทดสอบกับตัวละครหลายคน

### Phase 4: Pixel-perfect Continuity (1 hour)
- [ ] Adjust denoise parameters
- [ ] Fine-tune motion strength
- [ ] ทดสอบ frame matching quality
- [ ] เปรียบเทียบ before/after

---

## 🎓 Technical Notes

### Video Extension Workflow:
```
Shot 1: Generate normally
  ↓
Extract last frame (Canvas API)
  ↓
Shot 2: Use last frame as init_image
  ↓ (denoise = 0.4, preserve 60%)
Generate with continuity
  ↓
Extract last frame again
  ↓
Shot 3: Continue...
```

### Character Consistency Workflow:
```
Character Face Image
  ↓
IP-Adapter (Face Embedding)
  ↓
+ Custom LoRA (if available)
  ↓
Video Generation
  ↓
✅ Consistent Face across all shots
```

---

## 🚀 Expected Results

### After Priority 1 (Progress Fix):
- ✅ Progress bar เพิ่มขึ้นเรื่อยๆ ไม่ลดลง
- ✅ UX ดีขึ้น ไม่สับสน

### After Priority 2 (Video Extension):
- ✅ Shot ต่อเนื่องกันอย่างลื่นไหล
- ✅ Last frame → First frame seamless
- ✅ ไม่มี jump cut ที่ชัดเจน

### After Priority 3 (Character Consistency):
- ✅ ใบหน้าตัวละครคงที่ทุกฉาก
- ✅ เอกลักษณ์ไม่เปลี่ยน
- ✅ ใช้ LoRA ได้

### After Priority 4 (Pixel-perfect):
- ✅ Frame ต่อกันแบบ pixel-level match
- ✅ ไม่มี flicker ระหว่างฉาก
- ✅ คุณภาพสูงสุด

---

**ประมาณเวลารวม:** 6.5 ชั่วโมง  
**ลำดับการทำ:** 1 → 2 → 3 → 4

---

*เอกสารโดย: GitHub Copilot AI Assistant*  
*สถานะ: พร้อม Implement*
