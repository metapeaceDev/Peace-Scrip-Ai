# 🍎 FLUX on Mac Guide

## ปัญหา: FLUX ไม่ทำงานบน Mac

**Error:**

```
TypeError: Trying to convert Float8_e4m3fn to the MPS backend
but it does not have support for that dtype.
```

**สาเหตุ:**

- FLUX ใช้ **Float8 precision** (fp8)
- Apple MPS (Metal Performance Shaders) **ไม่รองรับ Float8**
- รองรับเฉพาะ Float32, Float16, BFloat16

---

## ✅ วิธีแก้ปัญหา (3 ทางเลือก)

### **Option 1: ใช้ SDXL แทน (แนะนำ ⭐⭐⭐⭐⭐)**

```bash
# .env.local
VITE_COMFYUI_WORKFLOW=sdxl
```

**ข้อดี:**

- ✅ รองรับ MPS (Mac GPU)
- ✅ เร็ว ~30s per image
- ✅ คุณภาพสูง ⭐⭐⭐⭐
- ✅ รองรับ LoRA (add-detail-xl)
- ✅ ใช้ VRAM น้อยกว่า (6.5GB vs 16GB)

**ข้อเสีย:**

- ⚠️ คุณภาพต่ำกว่า FLUX เล็กน้อย

---

### **Option 2: ใช้ FLUX บน CPU (ใช้ได้แต่ช้า ⭐⭐)**

```bash
# .env.local
VITE_COMFYUI_WORKFLOW=flux-cpu
```

**ข้อดี:**

- ✅ ใช้ FLUX ได้บน Mac
- ✅ คุณภาพสูงสุด ⭐⭐⭐⭐⭐
- ✅ ไม่ต้อง Float8 support

**ข้อเสีย:**

- ❌ **ช้ามาก** ~5-10 นาที per image (vs 30s SDXL)
- ❌ ใช้ RAM มาก (~20-30GB)
- ❌ CPU ร้อนมาก

**วิธีเปิดใช้:**

1. **แก้ .env.local:**

```bash
VITE_COMFYUI_WORKFLOW=flux-cpu
```

2. **Restart services:**

```bash
./stop-comfyui-full.sh
./start-comfyui-full.sh
```

**Console Output:**

```
🍎 Mac detected: Enabling CPU mode for FLUX (Float8 workaround)
⚠️  FLUX-CPU mode: Very slow (~5-10 minutes per image)
🛠️  Workflow Selection: Manual: FLUX on CPU (slow but works on Mac)
🚀 Using FLUX.1-dev (flux_dev.safetensors) - 16GB model
🎯 LoRA: Disabled (FLUX base model is high quality)
```

---

### **Option 3: ดาวน์โหลด FLUX FP16 (ยังไม่รองรับ ⭐)**

**FLUX-FP16** ยังไม่ released อย่างเป็นทางการ

ถ้ามี:

- ✅ รองรับ MPS
- ✅ เร็วกว่า CPU (~1-2 นาที)
- ⚠️ คุณภาพต่ำกว่า FLUX-FP8 เล็กน้อย

---

## 📊 Performance Comparison (Mac M2 Max)

| Workflow | Mode      | Time     | Quality    | VRAM/RAM  | Recommended         |
| -------- | --------- | -------- | ---------- | --------- | ------------------- |
| **SDXL** | MPS (GPU) | ~30s     | ⭐⭐⭐⭐   | ~8GB      | ✅ **YES**          |
| **FLUX** | CPU       | ~5-10min | ⭐⭐⭐⭐⭐ | ~25GB RAM | ⚠️ If you have time |
| **FLUX** | MPS (GPU) | ❌ Fails | -          | -         | ❌ NO               |

---

## 🎯 แนะนำสำหรับ Mac Users

### **สำหรับงานทั่วไป:**

```bash
VITE_COMFYUI_WORKFLOW=auto  # หรือ sdxl
```

- ใช้ SDXL + add-detail-xl LoRA
- เร็ว, คุณภาพดี, ประหยัด VRAM

### **สำหรับงานคุณภาพสูงสุด:**

```bash
VITE_COMFYUI_WORKFLOW=flux-cpu
```

- ใช้ FLUX บน CPU
- ช้ามาก แต่คุณภาพสูงสุด
- **แนะนำ:** Generate ก่อนนอน ⏰

---

## 🔧 Configuration Files

### **1. .env.local**

```bash
# Auto mode (recommended)
VITE_COMFYUI_WORKFLOW=auto

# Force SDXL (fast on Mac)
VITE_COMFYUI_WORKFLOW=sdxl

# Force FLUX on CPU (slow but works)
VITE_COMFYUI_WORKFLOW=flux-cpu
```

### **2. start-comfyui-full.sh**

```bash
# Auto-detects Mac and enables CPU mode for FLUX
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f "$COMFYUI_DIR/models/checkpoints/flux_dev.safetensors" ]; then
        echo "🍎 Mac detected: Enabling CPU mode for FLUX"
        COMFYUI_ARGS="$COMFYUI_ARGS --cpu"
    fi
fi
```

---

## 🐛 Troubleshooting

### **Problem: FLUX still fails on Mac**

**Check logs:**

```bash
tail -100 /tmp/peace-comfyui.log | grep -i "error\|float8"
```

**Solution:**

```bash
# 1. Make sure using SDXL or flux-cpu
cat .env.local | grep WORKFLOW

# 2. Restart services
./stop-comfyui-full.sh
./start-comfyui-full.sh

# 3. Clear Redis queue
redis-cli FLUSHDB
```

---

### **Problem: FLUX-CPU too slow**

**Workarounds:**

1. **ลด steps:**

```typescript
// src/services/geminiService.ts
steps: 15,  // จาก 20
```

2. **ลด resolution:**

```typescript
// src/services/comfyuiWorkflowBuilder.ts
width: 768,   // จาก 1024
height: 768,
```

3. **ใช้ SDXL แทน:**

```bash
VITE_COMFYUI_WORKFLOW=sdxl
```

---

### **Problem: Out of Memory (RAM)**

**Error:**

```
RuntimeError: [enforce fail at alloc_cpu.cpp:114] err == 0.
DefaultCPUAllocator: not enough memory
```

**Solution:**

```bash
# 1. ปิดโปรแกรมอื่นๆ
# 2. ใช้ SDXL แทน
VITE_COMFYUI_WORKFLOW=sdxl

# 3. Reduce batch size
# src/services/comfyuiWorkflowBuilder.ts
batch_size: 1
```

---

## 📈 Future Solutions

### **Waiting for:**

1. **FLUX-FP16 Release**
   - รองรับ MPS
   - เร็วกว่า CPU
   - Expected: Q1 2025

2. **Apple MPS Float8 Support**
   - รอ Apple อัพเดท Metal
   - ต้องรอ macOS update

3. **ComfyUI Optimization**
   - Auto-convert Float8 → Float16 on MPS
   - กำลังพัฒนา

---

## ✅ Summary

| Need                         | Recommendation                |
| ---------------------------- | ----------------------------- |
| **Fast + Good Quality**      | SDXL (auto/sdxl) ✅           |
| **Best Quality (have time)** | FLUX-CPU (flux-cpu) ⏰        |
| **Best Quality (no time)**   | Use Windows/Linux + NVIDIA 🖥️ |

**Default for Mac:**

```bash
VITE_COMFYUI_WORKFLOW=auto
# → Auto-selects SDXL on Mac
```

---

**Last Updated:** 2 ธันวาคม 2568  
**Status:** ✅ Mac Support via SDXL (recommended) or FLUX-CPU (slow)
