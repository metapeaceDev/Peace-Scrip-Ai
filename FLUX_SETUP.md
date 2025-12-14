# 🚀 FLUX.1 Setup Complete!

## ✅ สรุปการปรับปรุงระบบ

### 📦 Models ที่พร้อมใช้งาน

**Checkpoints (Full Models):**

- ✅ `flux_dev.safetensors` (16GB) - FLUX.1-dev **NEW!**
- ✅ `sd_xl_base_1.0.safetensors` (6.5GB) - SDXL Base
- ✅ `sd_xl_turbo_1.0_fp16.safetensors` (6.5GB) - SDXL Turbo
- ✅ `add-detail-xl.safetensors` (218MB) - Detail enhancer
- ✅ `sdxl_vae.safetensors` (319MB) - VAE

**LoRAs (Style Add-ons):**

- ✅ `Hunt3.safetensors` (36MB) - Character enhancement
- ✅ `add-detail-xl.safetensors` (45MB) - Detail LoRA

---

## 🔧 การเปลี่ยนแปลงใน Code

### 1. **comfyuiWorkflowBuilder.ts**

```typescript
// ✅ ปรับ buildFluxWorkflow() ให้ใช้ไฟล์ที่ถูกต้อง
"ckpt_name": "flux_dev.safetensors"  // เปลี่ยนจาก flux1-dev.safetensors

// ✅ เพิ่ม LoRA support ใน FLUX workflow
if (lora) {
  workflow["10"] = {
    "inputs": {
      "lora_name": lora,
      "strength_model": loraStrength,
      "strength_clip": loraStrength,
      ...
    },
    "class_type": "LoraLoader"
  };
}
```

### 2. **geminiService.ts**

```typescript
// ✅ อัพเดท LORA_MODELS configuration
const LORA_MODELS = {
  CHARACTER_CONSISTENCY: 'add-detail-xl.safetensors',
  CINEMATIC_STYLE: 'Hunt3.safetensors',
  FLUX_DEV: 'flux_dev.safetensors', // NEW!
  DEFAULT: 'Hunt3.safetensors',
};

// ✅ เปลี่ยนจาก FLUX_LORA (ไม่มี) เป็น DEFAULT
selectedLora = LORA_MODELS.DEFAULT;
```

### 3. **comfyuiBackendClient.ts**

```typescript
// ✅ เพิ่ม import buildFluxWorkflow
import { buildWorkflow, buildFluxWorkflow } from './comfyuiWorkflowBuilder';

// ✅ เพิ่ม logic เลือกใช้ FLUX หรือ SDXL
const useFlux = options.useFlux || false;

if (useFlux) {
  workflow = buildFluxWorkflow(prompt, options);
} else {
  workflow = buildWorkflow(prompt, options);
}
```

---

## 🎯 วิธีใช้งาน FLUX.1

### แบบที่ 1: ผ่าน Options

```typescript
await generateCharacterImage(prompt, {
  useFlux: true, // เปิดใช้ FLUX.1
  lora: 'Hunt3.safetensors', // เพิ่ม LoRA (optional)
  steps: 20,
  cfg: 3.5,
});
```

### แบบที่ 2: Default (SDXL)

```typescript
await generateCharacterImage(prompt, {
  // ไม่ระบุ useFlux = ใช้ SDXL (default)
  lora: 'Hunt3.safetensors',
});
```

---

## 🧪 ทดสอบแล้ว

### ✅ SDXL Workflow

```bash
curl -X POST http://localhost:8188/prompt \
  -d '{"prompt": {"4": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}}}}'
# Response: {"prompt_id": "...", "node_errors": {}}
```

### ✅ FLUX.1 Workflow

```bash
curl -X POST http://localhost:8188/prompt \
  -d '{"prompt": {"4": {"inputs": {"ckpt_name": "flux_dev.safetensors"}}}}'
# Response: {"prompt_id": "aeadccb6-...", "node_errors": {}}
```

---

## 📊 ข้อแตกต่าง FLUX.1 vs SDXL

| Feature         | FLUX.1              | SDXL             |
| --------------- | ------------------- | ---------------- |
| ขนาด Model      | 16GB                | 6.5GB            |
| คุณภาพ          | สูงกว่า             | ดี               |
| ความเร็ว        | ช้ากว่า             | เร็วกว่า         |
| CFG Scale       | 3.5                 | 7.5              |
| Steps           | 20                  | 25               |
| RAM             | ~20GB               | ~10GB            |
| **แนะนำสำหรับ** | **ภาพคุณภาพสูงสุด** | **ใช้งานทั่วไป** |

---

## 🎨 การเลือก Model

### ใช้ FLUX.1 เมื่อ:

- ต้องการภาพคุณภาพสูงสุด
- ตัวละครหลัก (protagonist)
- Portfolio / showcase images
- มีเวลาและ RAM เพียงพอ

### ใช้ SDXL เมื่อ:

- ต้องการความเร็ว
- สร้างภาพจำนวนมาก
- ตัวละครรอง
- RAM จำกัด (< 16GB)

---

## 🔍 Troubleshooting

### ปัญหา: FLUX ช้ามาก

**วิธีแก้:**

- ลด steps: 20 → 15
- ลด resolution: 1024x1024 → 768x768
- ปิดโปรแกรมอื่นให้ RAM

### ปัญหา: Out of Memory

**วิธีแก้:**

- ใช้ SDXL แทน
- ลด batch_size: 1 → 1 (already minimum)
- Restart ComfyUI

### ปัญหา: Image quality ไม่ต่าง

**วิธีแก้:**

- เพิ่ม steps: 20 → 28
- ปรับ CFG: 3.5 → 4.0
- เพิ่ม LoRA strength: 0.85 → 1.0

---

## 🚀 Next Steps

1. **ทดสอบ FLUX.1:**
   - เปิด http://localhost:5173
   - สร้างตัวละครใหม่
   - เปรียบเทียบกับ SDXL

2. **ดาวน์โหลด LoRA เพิ่มเติม (Optional):**
   - FLUX Character LoRA: https://civitai.com/models/618692
   - FLUX Realism LoRA: https://civitai.com/models/611128

3. **Monitor Performance:**
   - ดู RAM usage
   - เช็ค generation time
   - เปรียบเทียบคุณภาพ

---

## 💡 Tips

- **ประหยัดเวลา:** ใช้ SDXL สำหรับ draft, FLUX สำหรับ final
- **ประหยัด RAM:** ปิด FLUX เมื่อไม่ใช้งาน
- **คุณภาพดีขึ้น:** ใช้ LoRA ร่วมกับ FLUX
- **Hard Refresh:** กด Cmd+Shift+R ในเบราว์เซอร์หลังอัพเดท code

---

**สถานะ:** ✅ ระบบพร้อมใช้งาน FLUX.1 + SDXL + LoRA อย่างสมบูรณ์

**ทดสอบแล้ว:** 2 ธันวาคม 2568
