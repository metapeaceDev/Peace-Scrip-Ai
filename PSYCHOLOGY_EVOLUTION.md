# 📊 Psychology Evolution Tracking System

## 🎯 Overview

ระบบติดตามการเปลี่ยนแปลงทางจิตใจของตัวละครตลอดเรื่อง โดยอิงตามหลักธรรมพุทธ ระบบวิเคราะห์กาย-วาจา-ใจ ในแต่ละฉาก และอัปเดตค่า consciousness/defilement อัตโนมัติ

## ✨ Features

### 1. **กาย-วาจา-ใจ Analysis (Body-Speech-Mind)**

- **กาย**: วิเคราะห์การกระทำทางกายภาพจาก scene descriptions
- **วาจา**: วิเคราะห์รูปแบบการพูดจาก dialogue
- **ใจ**: วิเคราะห์สภาพจิตใจจาก character thoughts

### 2. **Buddhist Karma Classification**

- **กุศลกรรม** (Wholesome): การกระทำที่ดี → เพิ่ม consciousness, ลด defilement
- **อกุศลกรรม** (Unwholesome): การกระทำที่ไม่ดี → เพิ่ม defilement, ลด consciousness
- **เฉยๆ** (Neutral): การกระทำที่เป็นกลาง → ไม่มีผลเปลี่ยนแปลงมาก

### 3. **Automatic Psychology Updates**

- อัปเดตค่า consciousness และ defilement หลังสร้างแต่ละฉาก
- สร้าง timeline แสดงการเปลี่ยนแปลงตลอดเรื่อง
- คำนวณ Mental Balance (-100 ถึง +100)

### 4. **Character Arc Validation**

- ตรวจสอบว่าการเปลี่ยนแปลงสอดคล้องกับหลักกรรม
- แจ้งเตือนหากมีการเปลี่ยนแปลงรุนแรงเกินไป
- แนะนำการปรับปรุงตามหลักธรรม

### 5. **Visual Timeline Component**

- กราฟแสดง Mental Balance ตลอดเรื่อง
- รายละเอียดการเปลี่ยนแปลงแต่ละฉาก
- ข้อมูลกาย-วาจา-ใจ ในแต่ละ scene

## 📁 File Structure

```
src/
├── services/
│   ├── psychologyCalculator.ts      # คำนวณ profile และ reaction (เดิม)
│   ├── psychologyEvolution.ts       # 🆕 ติดตามการเปลี่ยนแปลง
│   └── psychologyIntegration.ts     # 🆕 Integration กับ scene generation
├── components/
│   ├── PsychologyTestPanel.tsx      # ทดสอบ reaction ของตัวละคร (เดิม)
│   └── PsychologyTimeline.tsx       # 🆕 แสดงกราฟการเปลี่ยนแปลง
└── types.ts                          # 🆕 เพิ่ม interfaces สำหรับ timeline
```

## 🔧 Core Functions

### `psychologyEvolution.ts`

#### `analyzeSceneActions()`

```typescript
// วิเคราะห์กาย-วาจา-ใจ ในฉาก
const actions = analyzeSceneActions(scene, characterName);
// Returns: { กาย: string[], วาจา: string[], ใจ: string[] }
```

#### `calculatePsychologyChanges()`

```typescript
// คำนวณการเปลี่ยนแปลง consciousness/defilement
const change = calculatePsychologyChanges(character, scene, plotPoint);
// Returns: PsychologyChange with reasoning based on Buddhist principles
```

#### `applyPsychologyChanges()`

```typescript
// ใช้การเปลี่ยนแปลงกับตัวละคร (immutable)
const updatedCharacter = applyPsychologyChanges(character, change);
```

#### `updatePsychologyTimeline()`

```typescript
// อัปเดต timeline หลังสร้างฉาก
const { timeline, updatedCharacter } = updatePsychologyTimeline(
  timeline,
  character,
  scene,
  plotPoint
);
```

#### `validateCharacterArc()`

```typescript
// ตรวจสอบว่า arc สอดคล้องกับหลักธรรม
const validation = validateCharacterArc(timeline);
// Returns: { valid, warnings, recommendations }
```

### `psychologyIntegration.ts`

#### `initializeProjectPsychology()`

```typescript
// สร้าง timeline เริ่มต้นสำหรับทุกตัวละคร
const scriptDataWithTimelines = initializeProjectPsychology(scriptData);
```

#### `updatePsychologyAfterScene()`

```typescript
// อัปเดต psychology หลังสร้างฉาก (เรียกอัตโนมัติ)
const updatedScriptData = updatePsychologyAfterScene(scriptData, scene, plotPoint);
```

#### `validateProjectPsychology()`

```typescript
// ตรวจสอบ arc ของทุกตัวละครในโครงการ
const validation = validateProjectPsychology(scriptData);
```

## 📊 Data Structure

### `PsychologyChange`

```typescript
{
  sceneNumber: number;
  plotPoint: string;
  actions: {
    กาย: string[];   // Physical actions
    วาจา: string[];  // Speech patterns
    ใจ: string[];    // Mental states
  };
  consciousnessChanges: Record<string, number>;  // virtue → delta
  defilementChanges: Record<string, number>;     // defilement → delta
  reasoning: string;  // Buddhist interpretation
  karmaType: 'กุศลกรรม' | 'อกุศลกรรม' | 'เฉยๆ';
}
```

### `PsychologySnapshot`

```typescript
{
  sceneNumber: number;
  plotPoint: string;
  consciousness: Record<string, number>; // Current values
  defilement: Record<string, number>; // Current values
  mentalBalance: number; // -100 to +100
  dominantEmotion: 'peaceful' | 'joyful' | 'angry' | 'confused' | 'fearful' | 'neutral';
}
```

### `CharacterPsychologyTimeline`

```typescript
{
  characterId: string;
  characterName: string;
  snapshots: PsychologySnapshot[];  // State at each scene
  changes: PsychologyChange[];      // What changed and why
  overallArc: {
    startingBalance: number;
    endingBalance: number;
    totalChange: number;
    direction: 'กุศลขึ้น' | 'กุศลลง' | 'คงที่';
    interpretation: string;  // Buddhist interpretation
  };
}
```

## 🎯 Integration Workflow

### 1. Initialize (เมื่อเริ่มโครงการ)

```typescript
import { initializeProjectPsychology } from './services/psychologyIntegration';

// เรียกครั้งเดียวตอนเริ่มต้น
scriptData = initializeProjectPsychology(scriptData);
```

### 2. Auto-Update (หลังสร้างแต่ละฉาก)

```typescript
import { updatePsychologyAfterScene } from './services/psychologyIntegration';

// เรียกอัตโนมัติหลัง generateScene()
const scene = await generateScene(...);
scriptData = updatePsychologyAfterScene(scriptData, scene, plotPoint);
```

### 3. Validation (เมื่อสร้างครบทุกฉาก)

```typescript
import { validateProjectPsychology } from './services/psychologyIntegration';

const validation = validateProjectPsychology(scriptData);
console.log(validation.overallSummary);

Object.values(validation.characterResults).forEach(result => {
  console.log(`${result.characterName}:`, result.warnings);
});
```

### 4. Display Timeline

```typescript
import { PsychologyTimeline } from './components/PsychologyTimeline';

const timeline = scriptData.psychologyTimelines[character.id];

<PsychologyTimeline
  timeline={timeline}
  onClose={() => setShowTimeline(false)}
/>
```

## 🔍 Buddhist Principles Validation

### กุศลกรรม → ความสุข (Wholesome → Happiness)

- ตัวละครที่ทำกุศลกรรมมากกว่า ควรมี Mental Balance เพิ่มขึ้น
- Consciousness values เพิ่มขึ้น (Mindfulness, Wisdom, Compassion)
- Defilement values ลดลง (Anger, Greed, Delusion)

### อกุศลกรรม → ทุกข์ (Unwholesome → Suffering)

- ตัวละครที่ทำอกุศลกรรมมากกว่า ควรมี Mental Balance ลดลง
- Defilement values เพิ่มขึ้น
- Consciousness values ลดลง

### การเปลี่ยนแปลงค่อยเป็นค่อยไป

- Mental Balance ไม่ควรเปลี่ยนเกิน ±20 ในฉากเดียว
- การพัฒนาหรือเสื่อมควรเป็นไปอย่างสมเหตุสมผล
- มีจุดเปลี่ยนสำคัญ (turning points) ที่ชัดเจน

## 📈 Example Output

### Character Arc Interpretation

```
**พระอรุณ**: กุศลขึ้น (+25.3 คะแนน)
ตัวละครพัฒนาไปในทางที่ดีขึ้น เพิ่มสติปัญญา ลดกิเลส

ตลอดเรื่อง: กุศลกรรม 8 ครั้ง, อกุศลกรรม 2 ครั้ง

ตามหลักธรรม: ตัวละครนี้แสดงให้เห็นถึงการพัฒนาจิตใจ
ผ่านการกระทำที่ถูกต้อง (สัมมากัมมันตะ) และการเจริญสติปัญญา
```

### Scene Analysis

```
Scene 5: Rising Action
Karma Type: กุศลกรรม ✨

กาย (Physical):
• พระอรุณช่วยคนป่วย ดูแลอย่างเอาใจใส่

วาจา (Speech):
• "ผมจะช่วยคุณให้หายเป็นปกติ"
• "ไม่เป็นไร ค่อยๆ ทำไป"

ใจ (Mental):
• 💭 ผมต้องใช้ความรู้ที่มีเพื่อช่วยผู้อื่น

Psychology Reasoning:
กุศลกรรม: การกระทำทางกาย-วาจา-ใจที่ดี เพิ่มสติปัญญา ลดกิเลส

Consciousness Changes:
• Karuna (Compassion): +2
• Mindfulness: +2

Defilement Changes:
• Lobha (Greed): -2
```

## 🎨 UI Components

### PsychologyTimeline

- แสดงกราฟ Mental Balance ตลอดเรื่อง
- คลิก data point เพื่อดูรายละเอียดฉาก
- แสดงกาย-วาจา-ใจ ในแต่ละฉาก
- แสดง Overall Arc Summary

### Integration Points

```typescript
// ใน Step5Output.tsx หรือ Studio.tsx
const [showTimeline, setShowTimeline] = useState(false);
const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

// ปุ่มเปิด Timeline
<button onClick={() => {
  setSelectedCharacter(character);
  setShowTimeline(true);
}}>
  📈 ดู Psychology Timeline
</button>

// Modal
{showTimeline && selectedCharacter && (
  <PsychologyTimeline
    timeline={scriptData.psychologyTimelines[selectedCharacter.id]}
    onClose={() => setShowTimeline(false)}
  />
)}
```

## ⚡ Performance Considerations

- **Immutable Updates**: ใช้ spread operator เพื่อไม่ให้กระทบข้อมูลเดิม
- **Lazy Initialization**: สร้าง timeline เมื่อจำเป็น
- **Memoization**: Component ควร memoize calculated values
- **Data Size**: Timeline เติบโตตามจำนวนฉาก (~1KB per scene)

## 🔮 Future Enhancements

1. **AI-Driven Suggestions**
   - AI แนะนำการแก้ไข arc ให้สมจริงขึ้น
   - Suggest scenes to improve character development

2. **Comparative Analysis**
   - เปรียบเทียบ arc ของตัวละครหลายตัว
   - แสดงความสัมพันธ์ระหว่างตัวละคร

3. **Export Timeline**
   - Export เป็น PDF/Image
   - Include in production package

4. **Real-time Prediction**
   - ทำนายผลกระทบของฉากต่อไปก่อนสร้าง
   - แนะนำ karma type ที่เหมาะสม

## 📚 Buddhist References

ระบบนี้อิงตามหลักธรรมพุทธ:

1. **ไตรสิขขา** (Three Trainings):
   - ศีล (Morality) → การกระทำที่ถูกต้อง
   - สมาธิ (Concentration) → สติและความสงบ
   - ปัญญา (Wisdom) → การรู้เท่าทันความจริง

2. **กรรม** (Karma):
   - กุศลกรรม → ผลดี
   - อกุศลกรรม → ผลเสีย
   - อัพยากฤตกรรม → เป็นกลาง

3. **กิเลส** (Defilements):
   - โลภะ (Lobha - Greed)
   - โทสะ (Dosa - Anger)
   - โมหะ (Moha - Delusion)

4. **ทางสายกลาง** (Middle Path):
   - การพัฒนาควรสมดุล ไม่สุดโต่ง
   - ค่อยเป็นค่อยไป มีความต่อเนื่อง

---

**Last Updated**: 5 ธันวาคม 2568
**Version**: 1.0.0
**Status**: ✅ Implemented and Ready for Testing
