# 🔄 ComfyUI Workflow Switching Guide

## ภาพรวม

ระบบรองรับ **2 workflows** ที่สามารถสลับได้:

| Workflow       | Model Size | Device Support       | Quality    | Speed | LoRA             |
| -------------- | ---------- | -------------------- | ---------- | ----- | ---------------- |
| **FLUX.1-dev** | 16GB       | NVIDIA/CUDA only     | ⭐⭐⭐⭐⭐ | ~45s  | ❌ Not needed    |
| **SDXL Base**  | 6.5GB      | Mac/MPS, NVIDIA, CPU | ⭐⭐⭐⭐   | ~30s  | ✅ add-detail-xl |

---

## 🎯 การตั้งค่า

### **1. Auto Mode (แนะนำ)**

```bash
# .env.local
VITE_COMFYUI_WORKFLOW=auto
```

**การทำงาน:**

- ✅ **Mac/MPS** → ใช้ SDXL อัตโนมัติ (FLUX ไม่รองรับ Float8 บน MPS)
- ✅ **Windows/Linux** → ใช้ FLUX อัตโนมัติ (สมมติว่ามี NVIDIA GPU)

**Console Output:**

```
🛠️  Workflow Selection: Auto: Mac/MPS detected → SDXL (FLUX Float8 not supported on MPS)
🎨 Using SDXL (sd_xl_base_1.0.safetensors) - 6.5GB model
🎯 Using LoRA: add-detail-xl.safetensors (detail enhancer)
```

---

### **2. Force SDXL Mode**

```bash
# .env.local
VITE_COMFYUI_WORKFLOW=sdxl
```

**เหมาะสำหรับ:**

- Mac users (MPS backend)
- ต้องการความเร็วสูง
- ต้องการใช้ LoRA (add-detail-xl)
- VRAM/RAM จำกัด (< 10GB)

**Specifications:**

```
Model: sd_xl_base_1.0.safetensors (6.5GB)
LoRA: add-detail-xl.safetensors (0.75 strength)
Steps: 25
CFG Scale: 7.5
Resolution: 1024x1024
```

**Console Output:**

```
🛠️  Workflow Selection: Manual: SDXL (compatible with all devices)
🎨 Using SDXL (sd_xl_base_1.0.safetensors) - 6.5GB model
🎯 Using LoRA: add-detail-xl.safetensors (detail enhancer)
```

---

### **3. Force FLUX Mode**

```bash
# .env.local
VITE_COMFYUI_WORKFLOW=flux
```

**⚠️ ข้อกำหนด:**

- ✅ NVIDIA GPU with CUDA
- ✅ VRAM ≥ 16GB
- ❌ **ใช้ไม่ได้บน Mac/MPS** (Float8 not supported)

**Specifications:**

```
Model: flux_dev.safetensors (16GB)
LoRA: None (base model is high quality)
Steps: 20
CFG Scale: 3.5
Resolution: 1024x1024
```

**Console Output:**

```
🛠️  Workflow Selection: Manual: FLUX (ensure CUDA/NVIDIA GPU)
🚀 Using FLUX.1-dev (flux_dev.safetensors) - 16GB model
🎯 LoRA: Disabled (FLUX base model is high quality)
```

**Error ถ้าใช้บน Mac:**

```
TypeError: Trying to convert Float8_e4m3fn to the MPS backend
but it does not have support for that dtype.
```

---

## 🛠️ วิธีสลับ Workflow

### **Option 1: แก้ไข .env.local (แนะนำ)**

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "

# เปิดไฟล์
nano .env.local

# เปลี่ยนค่า
VITE_COMFYUI_WORKFLOW=sdxl  # หรือ flux, auto

# บันทึก (Ctrl+O, Enter, Ctrl+X)

# Restart services
./stop-comfyui-full.sh
./start-comfyui-full.sh
```

### **Option 2: ใช้ Command Line**

```bash
# สลับไป SDXL
echo 'VITE_COMFYUI_WORKFLOW=sdxl' >> .env.local

# สลับไป FLUX
echo 'VITE_COMFYUI_WORKFLOW=flux' >> .env.local

# Auto mode
echo 'VITE_COMFYUI_WORKFLOW=auto' >> .env.local

# Restart
./stop-comfyui-full.sh && ./start-comfyui-full.sh
```

---

## 📊 Performance Comparison

### **Mac M-Series (MPS Backend)**

| Workflow | Works? | Time | Quality  | Notes                |
| -------- | ------ | ---- | -------- | -------------------- |
| SDXL     | ✅ Yes | ~30s | ⭐⭐⭐⭐ | Recommended          |
| FLUX     | ❌ No  | -    | -        | Float8 not supported |

### **NVIDIA RTX 3090 (24GB VRAM)**

| Workflow | Works? | Time | Quality    | Notes        |
| -------- | ------ | ---- | ---------- | ------------ |
| SDXL     | ✅ Yes | ~15s | ⭐⭐⭐⭐   | Fast         |
| FLUX     | ✅ Yes | ~25s | ⭐⭐⭐⭐⭐ | Best quality |

### **CPU Only (16GB RAM)**

| Workflow | Works?   | Time   | Quality    | Notes          |
| -------- | -------- | ------ | ---------- | -------------- |
| SDXL     | ✅ Yes   | ~5min  | ⭐⭐⭐⭐   | Slow but works |
| FLUX     | ⚠️ Maybe | ~10min | ⭐⭐⭐⭐⭐ | Very slow      |

---

## 🔍 Troubleshooting

### **Problem 1: FLUX fails on Mac**

**Error:**

```
TypeError: Trying to convert Float8_e4m3fn to the MPS backend
```

**วิธีแก้:**

```bash
# 1. เปลี่ยนไป SDXL
echo 'VITE_COMFYUI_WORKFLOW=sdxl' >> .env.local

# 2. Restart
./stop-comfyui-full.sh && ./start-comfyui-full.sh

# 3. Clear browser cache and reload
```

---

### **Problem 2: LoRA shape mismatch**

**Error:**

```
ERROR lora shape '[640, 2048]' is invalid for input of size 983040
```

**สาเหตุ:**

- ใช้ SD 1.5 LoRA (Hunt3.safetensors) กับ SDXL/FLUX

**วิธีแก้:**

- SDXL: ใช้ `add-detail-xl.safetensors` ✅
- FLUX: ไม่ใช้ LoRA (`lora: undefined`) ✅

---

### **Problem 3: Auto-detection ผิด**

**วิธีแก้:**

```bash
# บังคับเลือก workflow ที่ต้องการ
VITE_COMFYUI_WORKFLOW=sdxl  # หรือ flux
```

---

## 📝 Code Reference

### **Workflow Selection Logic**

```typescript
// src/services/geminiService.ts (line 56-93)
function selectWorkflow(preferredWorkflow: string = PREFERRED_WORKFLOW) {
  // Force FLUX
  if (preferredWorkflow === 'flux') {
    return { useFlux: true, reason: 'Manual: FLUX' };
  }

  // Force SDXL
  if (preferredWorkflow === 'sdxl') {
    return { useFlux: false, reason: 'Manual: SDXL' };
  }

  // Auto-detect
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (isMac) {
    return {
      useFlux: false,
      reason: 'Auto: Mac/MPS → SDXL',
    };
  }

  return {
    useFlux: true,
    reason: 'Auto: Non-Mac → FLUX',
  };
}
```

### **Workflow Configuration**

```typescript
// FLUX Configuration
if (workflowSelection.useFlux) {
  selectedLora = undefined;
  steps = 20;
  cfg = 3.5;
}

// SDXL Configuration
else {
  selectedLora = 'add-detail-xl.safetensors';
  loraStrength = 0.75;
  steps = 25;
  cfg = 7.5;
}
```

---

## ✅ Checklist

**สำหรับ Mac Users:**

- [ ] Set `VITE_COMFYUI_WORKFLOW=sdxl` or `auto`
- [ ] Never use `flux` (will fail)
- [ ] Verify `add-detail-xl.safetensors` exists in `~/Desktop/ComfyUI/models/loras/`

**สำหรับ NVIDIA/Windows Users:**

- [ ] Set `VITE_COMFYUI_WORKFLOW=flux` or `auto`
- [ ] Ensure CUDA is installed
- [ ] Verify `flux_dev.safetensors` exists (16GB)

**ทุกคน:**

- [ ] Restart services after changing `.env.local`
- [ ] Clear browser cache if needed
- [ ] Check console logs for workflow confirmation

---

## 🎬 Quick Start

**Mac (แนะนำ):**

```bash
echo 'VITE_COMFYUI_WORKFLOW=sdxl' >> .env.local
./start-comfyui-full.sh
```

**Windows/Linux NVIDIA:**

```bash
echo 'VITE_COMFYUI_WORKFLOW=flux' >> .env.local
./start-comfyui-full.sh
```

**Auto (ปล่อยให้ระบบเลือก):**

```bash
echo 'VITE_COMFYUI_WORKFLOW=auto' >> .env.local
./start-comfyui-full.sh
```

---

**Last Updated:** 2 ธันวาคม 2568  
**Status:** ✅ Dual-Workflow System Active
