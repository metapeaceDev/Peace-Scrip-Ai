# Psychology Evolution System - Enhanced v2.0

## ✅ สิ่งที่ปรับปรุงแล้ว

### 1. **เพิ่ม Buddhist Psychology Framework**

- ✅ **Anusaya Profile (อนุสัย 7 ประการ)** - Latent tendencies ที่เป็นรากเหง้าของกิเลส
  - kama_raga (กามราคะ), patigha (ปฏิฆะ), mana (มานะ)
  - ditthi (ทิฏฐิ), vicikiccha (วิจิกิจฉา)
  - bhava_raga (ภวราคะ), avijja (อวิชชา)

- ✅ **Carita Types (จริต 6 ประเภท)** - Character temperament
  - ราคจริต (Lustful), โทสจริต (Hateful), โมหจริต (Deluded)
  - สัทธาจริต (Faithful), พุทธิจริต (Intelligent), วิตกจริต (Speculative)

### 2. **ปรับปรุง Karma Classification**

- ✅ เพิ่ม **Keywords จาก ~40 → 100+ คำ**
- ✅ เพิ่ม **Intensity Levels**: mild, moderate, severe, extreme
- ✅ เพิ่ม **Context-aware analysis** - พิจารณา character's anusaya
- ✅ แยก categories: generosity, patience, wisdom, anger, greed, etc.

### 3. **Dynamic Change Calculation**

- ✅ **Intensity-based multiplier**:
  - Mild: ×1.0
  - Moderate: ×2.0
  - Severe: ×4.0
  - Extreme: ×8.0

- ✅ **Anusaya Updates** (latent tendency changes):
  - ค่อยๆ เปลี่ยน (10-15% ของการเปลี่ยนแปลงหลัก)
  - เป็นการเปลี่ยนแปลงที่ถาวรกว่า
  - สะท้อนการ "ฝึกฝน" หรือ "เสื่อมถอย" ที่แท้จริง

### 4. **Helper Functions**

- ✅ `initializeAnusayaFromDefilement()` - Auto-init from existing data
- ✅ `determineCaritaFromProfile()` - Determine temperament
- ✅ `ensureBuddhistPsychology()` - Ensure profile exists
- ✅ `getRecommendedMeditation()` - Get practice recommendations
- ✅ `getAnusayaStrength()` - Analyze tendency strength

---

## 📊 ตัวอย่างการทำงาน

### ก่อน (Simple):

```
Action: "ช่วยเหลือคนอื่น"
Result: +2 consciousness, -2 defilement
```

### หลัง (Enhanced):

```
Action: "เสียสละชีวิตเพื่อปกป้องผู้อื่น"
Analysis:
  - Detected: extreme generosity, sacrifice
  - Intensity: EXTREME (×8 multiplier)
  - Character Carita: สัทธาจริต (enhances wholesome tendency)

Result:
  - Consciousness: +16 points
  - Defilement (greed): -16 points
  - Anusaya.kama_raga: -2.4 points (permanent reduction)
  - Reasoning: "กุศลกรรม (extreme): การกระทำที่เสียสละสูงสุด..."
```

---

## 🎯 ผลที่ได้

### ความแม่นยำสูงขึ้น

- ✅ คำนวณละเอียดกว่าเดิม 4-8 เท่า (ขึ้นกับ intensity)
- ✅ พิจารณา context และ character background
- ✅ สะท้อนการเปลี่ยนแปลงแบบ gradual และ realistic

### เข้ากับ Digital Mind Model v14

- ✅ ใช้หลัก Anusaya (latent tendencies)
- ✅ ใช้หลัก Carita (temperament)
- ✅ รองรับการพัฒนาต่อยอดในอนาคต (บารมี, ฌาน, มรรคผล)

### Backward Compatible

- ✅ ใช้งานกับ Character เดิมได้ (auto-initialize)
- ✅ UI เดิมยังใช้ได้ (จะเพิ่ม features ทีหลัง)
- ✅ ไม่ต้อง migrate data

---

## 🚀 การใช้งาน

### 1. Character จะ Auto-Initialize

```typescript
// System จะสร้าง anusaya และ carita อัตโนมัติ
// จาก consciousness และ defilement ที่มีอยู่แล้ว
```

### 2. Scene Generation จะใช้ระบบใหม่โดยอัตโนมัติ

```typescript
// แต่ละฉากจะถูกวิเคราะห์ด้วย:
// - Enhanced keyword matching (100+ words)
// - Intensity detection (mild → extreme)
// - Character temperament consideration
// - Anusaya (latent tendency) influence
```

### 3. Timeline แสดงผล

```
Character Arc: กุศลขึ้น
เปลี่ยนแปลง: +15.2 คะแนน (จาก 68.2 → 83.4)

กุศลกรรม (severe): การให้อภัยผู้ทำร้าย ลดปฏิฆะ (aversion)
  - Consciousness +10
  - Defilement -10
  - Anusaya.patigha -1.5 (latent tendency improved)
```

---

## 📝 Next Steps (Optional)

### Phase 2 (ถ้าต้องการ):

- เพิ่ม **Parami Tracking** (บารมี 10 ทัศ)
- เพิ่ม **UI Enhancement** - แสดง anusaya, carita, intensity
- เพิ่ม **Validation Rules** - แนะนำ scene ถัดไป

### Phase 3 (Advanced):

- เพิ่ม **Jhana Tracking** (ฌานสมาบัติ)
- เพิ่ม **Character Status** (ปุถุชน → อริยบุคคล)
- เพิ่ม **Vipaka System** (ผลกรรม)

---

## ✅ Status: **READY FOR USE**

ระบบสามารถใช้งานได้ทันที โดย:

- ✅ Build สำเร็จ (no errors)
- ✅ Backward compatible
- ✅ Auto-initialization
- ✅ Enhanced accuracy
- ✅ Ready for deployment

---

**Created:** 5 ธ.ค. 2568  
**Version:** 2.0 - Enhanced with Digital Mind Model v14 principles
