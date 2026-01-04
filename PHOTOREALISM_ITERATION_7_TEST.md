# 🧪 Photorealism Iteration 7 - Test Report

**Date:** 2026-01-04  
**Status:** Ready for Testing  
**Changes:** CFG 7.2, LoRA 0.40, Steps 42

---

## 🎯 Iteration 7 Settings

### Parameters

```typescript
{
  cfg: 7.2,        // ⬆️ +0.4 from 6.8 (enforce photorealistic prompts stronger)
  loraStrength: 0.40,  // ⬇️ -0.08 from 0.48 (avoid over-stylization)
  steps: 42,       // ⬆️ +2 from 40 (maximum quality)
  lora: 'add-detail-xl.safetensors',
  noise: 0.15      // (maintain pore detail without blur)
}
```

### Rationale

- **CFG 7.2:** บังคับให้ตาม photorealistic keywords แรงขึ้น
- **LoRA 0.40:** ลดอิทธิพล stylization จาก LoRA เพื่อให้ SDXL base model ทำงานมากขึ้น
- **Steps 42:** เพิ่มรายละเอียดสูงสุด (ช้ากว่าแต่คุณภาพดีขึ้น)

---

## 📝 Previous Iterations Summary

| Iteration | CFG     | LoRA     | Steps  | Result                             |
| --------- | ------- | -------- | ------ | ---------------------------------- |
| 1         | 5.1     | 0.80     | 35     | ภาพสว่างแต่ยังดูเหมือนการ์ตูน      |
| 2         | 6.0     | 0.70     | 35     | ลดการ์ตูนแต่ยังมี stylization      |
| 3         | 6.5     | 0.60     | 38     | ดีขึ้นแต่ยังไม่เสมือนจริง          |
| 4         | 6.8     | 0.55     | 40     | ใกล้เคียงแต่ยังมีเค้าวาด           |
| 5         | 6.8     | 0.50     | 40     | ลด stylization แต่ detail ลดลง     |
| 6         | 6.8     | 0.48     | 40     | Balance ดีแต่ยัง cartoony เล็กน้อย |
| **7**     | **7.2** | **0.40** | **42** | **⏳ Awaiting Test**               |

---

## 🧪 Test Methodology

### Test Cases

#### Test Case 1: Portrait (Head & Shoulders)

```typescript
imageType: 'portrait'
resolution: 896x1152 (3:4 ratio)
expected: Photorealistic headshot with visible pores
```

#### Test Case 2: Full Body (Standing)

```typescript
imageType: 'full-body'
resolution: 768x1408 (11:18 ratio)
expected: Photorealistic full body with natural proportions
```

### Evaluation Criteria

1. **Photorealism Score (0-10)**
   - 0-3: Obvious cartoon/illustration
   - 4-6: Semi-realistic but stylized
   - 7-8: Realistic with minor artifacts
   - 9-10: Photorealistic (indistinguishable from photo)

2. **Skin Texture Quality**
   - ✅ Visible pores
   - ✅ Natural skin imperfections
   - ✅ Realistic skin tones
   - ❌ Smooth/plastic skin
   - ❌ Over-airbrushed

3. **Detail Preservation**
   - ✅ Sharp focus on face
   - ✅ Individual hair strands
   - ✅ Natural lighting
   - ❌ Soft focus/blur
   - ❌ Artificial lighting

---

## ✅ Backend Status

```
Service: comfyui-service
Port: 8000
Status: ✅ HEALTHY
Uptime: Running
Fix Applied: Added getDelayedCount() to MockQueue
```

---

## 🚀 How to Test

### Method 1: Via Frontend UI

1. เปิด http://localhost:5173
2. ไปที่ Step 3: Character Creation
3. อัพโหลดรูปหน้าอ้างอิง (Face Reference)
4. กด "Generate Portrait" หรือ "Generate Outfit (Face ID)"
5. เลือก Generation Mode: QUALITY (25 steps)
6. รอสร้างเสร็จ (~5-10 นาที)

### Method 2: Direct API Call

```bash
# Test InstantID workflow directly
curl -X POST http://localhost:8000/api/comfyui/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "photorealistic portrait, professional photography, natural skin texture",
    "workflow": "instantid",
    "referenceImage": "data:image/png;base64,<BASE64_HERE>",
    "settings": {
      "cfg": 7.2,
      "loraStrength": 0.40,
      "steps": 42
    }
  }'
```

---

## 📊 Expected Outcomes

### Success Criteria

- [ ] Photorealism Score >= 8/10
- [ ] Visible skin pores/texture
- [ ] Natural proportions (no elongated neck)
- [ ] No cartoon/illustration style
- [ ] Sharp focus on face
- [ ] Natural colors (not desaturated/monochrome)

### If Test Fails

1. **Still looks like cartoon:** Try iteration 8
   - Increase CFG to 7.5
   - Disable LoRA completely (loraStrength: 0)
   - Add refiner stage

2. **Too dark/desaturated:** Adjust negative prompts
   - Increase "(dark skin:1.7)" weight
   - Add more color keywords

3. **Over-stylized:** Lower LoRA further
   - Try loraStrength: 0.30 or 0.20

---

## 📝 Test Results (To be filled after testing)

### Test Date: **\*\***\_**\*\***

### Test Case 1: Portrait

- Photorealism Score: \_\_\_\_ / 10
- Skin Texture: ✅/❌
- Detail Quality: ✅/❌
- Comments: ****\*\*\*\*****\_\_\_****\*\*\*\*****

### Test Case 2: Full Body

- Photorealism Score: \_\_\_\_ / 10
- Body Proportions: ✅/❌
- Face Similarity: ✅/❌ (if using Face ID)
- Comments: ****\*\*\*\*****\_\_\_****\*\*\*\*****

### Overall Assessment

- ✅ PASS - Ready for production
- ⚠️ PARTIAL - Needs minor adjustments
- ❌ FAIL - Major issues remain

### Next Steps

---

---

## 🔗 Related Files

- Settings: [comfyuiWorkflowBuilder.ts](../src/services/comfyuiWorkflowBuilder.ts#L342-L352)
- Backend: [queueService.js](../comfyui-service/src/services/queueService.js)
- Frontend: [Step3Character.tsx](../src/components/Step3Character.tsx)

---

**Generated by:** GitHub Copilot  
**Backend Fix:** ✅ getDelayedCount() added to MockQueue (line 88)
