# 🚀 FLUX.1 Configuration Guide

## ✅ สถานะปัจจุบัน (2 ธันวาคม 2568)

### Models ที่ติดตั้ง:

#### **Checkpoint Models** (~/Desktop/ComfyUI/models/checkpoints/)

| Model                              | Size  | Type       | Status         |
| ---------------------------------- | ----- | ---------- | -------------- |
| `flux_dev.safetensors`             | 16GB  | FLUX.1-dev | ✅ **DEFAULT** |
| `sd_xl_base_1.0.safetensors`       | 6.5GB | SDXL Base  | ✅ Available   |
| `sd_xl_turbo_1.0_fp16.safetensors` | 6.5GB | SDXL Turbo | ✅ Available   |

#### **LoRA Models** (~/Desktop/ComfyUI/models/loras/)

| Model                       | Size | Compatible With | Status              |
| --------------------------- | ---- | --------------- | ------------------- |
| `add-detail-xl.safetensors` | 45MB | SDXL only       | ✅ Available        |
| `Hunt3.safetensors`         | 36MB | SD 1.5 only     | ❌ **INCOMPATIBLE** |

---

## 🎯 การทำงาน

### **Default Workflow: FLUX.1-dev**

```typescript
// src/services/geminiService.ts (line ~607)
const comfyImage = await generateImageWithComfyUI(prompt, {
  useFlux: true, // ✅ ใช้ FLUX.1-dev (16GB)
  lora: undefined, // ❌ ไม่ใช้ LoRA
  steps: 20, // FLUX optimal: 20-30 steps
  cfg: 3.5, // FLUX optimal: 3-4 CFG
  negativePrompt: '...',
  onProgress: p => {},
});
```

### **Workflow Selection Logic:**

```
Frontend Request
    ↓
generateImageWithComfyUI()
    ↓
┌─────────────────────────────┐
│ useFlux: true (DEFAULT)     │
│ → buildFluxWorkflow()       │
│ → flux_dev.safetensors      │
│ → No LoRA                   │
└─────────────────────────────┘
    ↓
ComfyUI Backend
    ↓
FLUX.1-dev Generation (20 steps, CFG 3.5)
    ↓
High-Quality Result (1024x1024)
```

---

## ⚙️ Configuration Files

### **1. Frontend (src/services/geminiService.ts)**

```typescript
// Line 34-48: Model Definitions
const SDXL_LORA_MODELS = {
  CHARACTER_CONSISTENCY: "add-detail-xl.safetensors", // ✅ SDXL LoRA
  DETAIL_ENHANCER: "add-detail-xl.safetensors",
};

const CHECKPOINT_MODELS = {
  FLUX_DEV: "flux_dev.safetensors",                   // ✅ Default
  SDXL_BASE: "sd_xl_base_1.0.safetensors",
  SDXL_TURBO: "sd_xl_turbo_1.0_fp16.safetensors",
};

// Line 607-618: Generation Call
useFlux: true,              // ✅ Enable FLUX workflow
lora: undefined,            // ❌ Disable LoRA (Hunt3 incompatible)
steps: 20,                  // FLUX optimal
cfg: 3.5,                   // FLUX optimal
```

### **2. Workflow Builder (src/services/comfyuiWorkflowBuilder.ts)**

```typescript
// Line 165-250: buildFluxWorkflow()
export function buildFluxWorkflow(prompt, options) {
  const workflow = {
    '4': {
      inputs: {
        ckpt_name: 'flux_dev.safetensors', // ✅ FLUX Checkpoint
      },
      class_type: 'CheckpointLoaderSimple',
    },
    '3': {
      inputs: {
        steps: 20, // ✅ FLUX steps
        cfg: 3.5, // ✅ FLUX CFG
        sampler_name: 'euler',
        scheduler: 'simple',
      },
      class_type: 'KSampler',
    },
  };

  // LoRA support (optional, currently disabled)
  if (lora) {
    workflow['10'] = {
      inputs: {
        lora_name: lora,
        strength_model: loraStrength,
      },
      class_type: 'LoraLoader',
    };
  }

  return workflow;
}
```

### **3. Backend Client (src/services/comfyuiBackendClient.ts)**

```typescript
// Line 285-305: Workflow Selection
const useFlux = options.useFlux || false;

if (useFlux) {
  console.log('🚀 Using FLUX.1 workflow (flux_dev.safetensors)');
  workflow = buildFluxWorkflow(prompt, options);
} else {
  console.log('🎨 Using SDXL workflow (sd_xl_base_1.0.safetensors)');
  workflow = buildWorkflow(prompt, options);
}
```

---

## 🔧 การแก้ไขปัญหา

### **ปัญหาที่พบ:**

1. ❌ **Hunt3.safetensors shape mismatch**
   - Hunt3 = SD 1.5 LoRA (640 dimensions)
   - FLUX/SDXL = 2048 dimensions
   - **วิธีแก้:** ปิดการใช้ LoRA (`lora: undefined`)

2. ❌ **add-detail-xl.safetensors อยู่ใน checkpoints/**
   - **วิธีแก้:** ย้ายไป `loras/` (เสร็จแล้ว ✅)

3. ❌ **Default ใช้ SDXL แทน FLUX**
   - **วิธีแก้:** เปลี่ยน `useFlux: true` (เสร็จแล้ว ✅)

### **Error Logs ที่เคยพบ:**

```
ERROR lora diffusion_model.output_blocks.3.1.transformer_blocks.0.attn2.to_v.weight
shape '[640, 2048]' is invalid for input of size 983040
```

**สาเหตุ:** Hunt3.safetensors (SD 1.5) incompatible กับ SDXL/FLUX  
**วิธีแก้:** ปิด LoRA ✅

---

## 📊 Performance Comparison

| Model          | Size  | Steps | CFG | Generation Time | Quality    |
| -------------- | ----- | ----- | --- | --------------- | ---------- |
| **FLUX.1-dev** | 16GB  | 20-30 | 3-4 | ~45s (MPS)      | ⭐⭐⭐⭐⭐ |
| SDXL Base      | 6.5GB | 25-35 | 7-8 | ~30s (MPS)      | ⭐⭐⭐⭐   |
| SDXL Turbo     | 6.5GB | 4-8   | 2-3 | ~8s (MPS)       | ⭐⭐⭐     |

**อุปกรณ์ทดสอบ:**

- Mac with MPS (Metal Performance Shaders)
- VRAM: 19GB total, ~13GB free
- PyTorch 2.8.0

---

## 🎨 ตัวอย่างการใช้งาน

### **1. Basic FLUX Generation (Default)**

```typescript
const image = await generateSceneImage(prompt, {
  // ไม่ต้องระบุอะไร - ใช้ FLUX.1-dev อัตโนมัติ
});
```

### **2. Custom Parameters**

```typescript
const image = await generateImageWithComfyUI(prompt, {
  useFlux: true,
  steps: 25,
  cfg: 3.8,
  seed: 12345,
  negativePrompt: 'low quality, blurry, distorted',
  onProgress: progress => console.log(`${progress}%`),
});
```

### **3. Switch to SDXL (ถ้าต้องการ)**

```typescript
const image = await generateImageWithComfyUI(prompt, {
  useFlux: false, // ✅ ใช้ SDXL แทน
  lora: 'add-detail-xl.safetensors', // ✅ SDXL compatible
  loraStrength: 0.8,
  steps: 30,
  cfg: 7.5,
});
```

---

## ✅ Checklist การตั้งค่า

- [x] FLUX model installed (16GB)
- [x] ComfyUI รองรับ FLUX workflow
- [x] Default workflow = FLUX (`useFlux: true`)
- [x] LoRA ปิดใช้งาน (`lora: undefined`)
- [x] Optimal parameters (steps: 20, cfg: 3.5)
- [x] Backend authentication เป็น optional
- [x] Redis queue cleaned
- [x] File structure ถูกต้อง (checkpoints vs loras)

---

## 🚦 การทดสอบ

### **1. Start Services:**

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "
./start-comfyui-full.sh
```

### **2. Test Generation:**

- เปิด Frontend (http://localhost:5173)
- Login ด้วย Google
- สร้าง Character/Scene ใหม่
- Generate Image → ควรใช้ FLUX workflow

### **3. Monitor Logs:**

```bash
# ComfyUI log
tail -f /tmp/peace-comfyui.log

# Backend log
tail -f /tmp/peace-backend.log

# Frontend console:
🚀 Using FLUX.1-dev (flux_dev.safetensors) - 16GB model
🎯 LoRA: Disabled (FLUX workflow doesn't require LoRA)
✅ Tier 1 Success: ComfyUI Backend + LoRA
```

---

## 📝 Notes

1. **Hunt3.safetensors** ยังคงอยู่ใน `loras/` แต่ไม่ถูกใช้งาน (SD 1.5 only)
2. **add-detail-xl.safetensors** สามารถใช้กับ SDXL ได้ถ้า switch workflow
3. **FLUX ไม่จำเป็นต้องใช้ LoRA** - base model คุณภาพสูงอยู่แล้ว
4. **CFG ต่ำ (3-4)** เหมาะกับ FLUX มากกว่า SDXL (7-8)

---

**Last Updated:** 2 ธันวาคม 2568  
**Status:** ✅ Ready for Production
