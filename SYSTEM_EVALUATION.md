# 📊 Peace Script AI - System Evaluation & Roadmap

**วันที่:** 2 ธันวาคม 2568  
**เป้าหมาย:** ระบบสร้างหนังอัตโนมัติที่ใช้หลักธรรมในการออกแบบตัวละครให้มีชีวิตจิตใจ

---

## ✅ จุดแข็งปัจจุบัน (Current Strengths)

### 1. 🧠 **หลักธรรมในการออกแบบตัวละคร** ⭐⭐⭐⭐⭐

**สิ่งที่ดีเยี่ยม:**

```typescript
internal: {
  consciousness: {
    "สติ (Mindfulness)": 80,
    "ปัญญา (Wisdom)": 75,
    "ศรัทธา (Faith)": 85,
    "หิริ (Shame)": 80,
    "กรุณา (Compassion)": 90,
    "มุทิตา (Joy)": 70
  },
  defilement: {
    "โลภะ (Greed)": 30,
    "โทสะ (Anger)": 40,
    "โมหะ (Delusion)": 45,
    "มานะ (Arrogance)": 50,
    "ทิฏฐิ (Wrong View)": 55
  }
}
```

**ผลลัพธ์:**

- ตัวละครมีมิติทางจิตใจที่ซับซ้อน
- สอดคล้องกับหลักอภิธรรม (จิตตุปาทานะ)
- ช่วยสร้างความสมจริงในการกระทำ

---

### 2. 🎬 **โครงสร้างเรื่อง 9 จุด** ⭐⭐⭐⭐⭐

```
Equilibrium → Inciting Incident → Turning Point → Act Break →
Rising Action → Crisis → Falling Action → Climax → Ending
```

**ข้อดี:**

- ครอบคลุม Hero's Journey และ Three-Act Structure
- เหมาะกับทั้งหนัง ซีรีส์ และละครคุณธรรม
- มีระบบ Scene Generation แบบอัตโนมัติ

---

### 3. 🤖 **AI Multi-Provider System** ⭐⭐⭐⭐

**Providers:**

1. **Gemini 2.5 Flash** - Text generation (fast, high quality)
2. **Gemini Image** - Character portraits (realistic)
3. **ComfyUI Backend** - Advanced generation + LoRA (character consistency)
4. **Stable Diffusion** - Fallback (unlimited quota)

**Cascade Fallback:**

```
Gemini 2.5 → Gemini 2.0 → Stable Diffusion → ComfyUI
```

✅ **ผลลัพธ์:** ไม่มีวันหยุดทำงานเพราะ quota หมด

---

### 4. ☁️ **Firebase + Offline Hybrid** ⭐⭐⭐⭐⭐

**Architecture:**

- **Online Mode:** Firebase Auth + Firestore + Storage
- **Offline Mode:** IndexedDB (ไม่ต้องอินเทอร์เน็ต)
- **Auto-Sync:** เมื่อกลับมา online จะ sync ให้อัตโนมัติ

---

### 5. 👔 **Costume Design System** ⭐⭐⭐⭐

**Features:**

- **Face ID Matching:** ใช้รูปโปรไฟล์เป็น reference
- **Outfit Collection:** เก็บชุดหลายแบบต่อตัวละคร
- **Scene Costume Assignment:** กำหนดชุดต่อ scene ได้
- **LoRA Integration:** ใช้ AI model พิเศษสำหรับความสม่ำเสมอ

**ตัวอย่างการใช้งาน:**

```typescript
character.outfitCollection = [
  { id: 'OTF-A1B2', description: 'ชุดนักบวช', image: 'base64...' },
  { id: 'OTF-C3D4', description: 'ชุดสามัญชน', image: 'base64...' },
];

scene.characterOutfits = {
  พระยาราม: 'OTF-A1B2', // ใส่ชุดนักบวช
  นางสาว: 'OTF-C3D4', // ใส่ชุดสามัญชน
};
```

---

## ⚠️ จุดที่ยังขาด (Missing Features)

### 1. ❌ **การเชื่อมโยงหลักธรรมกับการกระทำ** (Critical)

**ปัญหา:**

```typescript
// ✅ มีข้อมูลจิตใจ
character.internal.defilement['โลภะ'] = 80;

// ❌ แต่ AI ไม่ได้ใช้ตอน Generate Scene
await generateScene(plotPoint, characters);
// → AI ไม่รู้ว่าตัวละครโลภะสูง ควรทำอะไร
```

**ผลกระทบ:**

- ตัวละครอาจกระทำไม่สอดคล้องกับบุคลิก
- เรื่องอาจไม่สมเหตุสมผล
- ขาดความเป็นจริงทางจิตวิทยา

**แก้ไข:**

```typescript
// geminiService.ts - ปรับ prompt
const characterPsychology = characters
  .map(
    c => `
${c.name}:
- สติ: ${c.internal.consciousness['สติ']}/100
- โลภะ: ${c.internal.defilement['โลภะ']}/100
- ตีความ: ${
      c.internal.defilement['โลภะ'] > 70 ? 'มักเห็นแก่ตัว แสวงหาผลประโยชน์' : 'พอเพียง มีเมตตา'
    }

→ พฤติกรรมในฉากนี้ควร: ${suggestBehavior(c)}
`
  )
  .join('\n');
```

---

### 2. ❌ **Character Arc Tracking** (High Priority)

**ที่ขาด:**

- ไม่มีระบบติดตาม "การเปลี่ยนแปลงจิตใจ" ตลอดเรื่อง
- ตัวละครควรมี "จุดเปลี่ยน" ที่ชัดเจน

**ควรมี:**

```typescript
interface CharacterArc {
  sceneNumber: number;
  consciousness: Record<string, number>;
  defilement: Record<string, number>;
  triggerEvent: string;
  insight?: string; // ความตรัสรู้
}

character.arc = [
  {
    scene: 1,
    consciousness: { สติ: 30, ปัญญา: 20 },
    defilement: { โลภะ: 80, โทสะ: 70 },
    triggerEvent: 'เห็นคนยากจนขอทาน แต่ไม่ให้',
    insight: null,
  },
  {
    scene: 5,
    consciousness: { สติ: 50, ปัญญา: 40 },
    defilement: { โลภะ: 60, โทสะ: 50 },
    triggerEvent: 'พบพระสงฆ์ ได้รับคำสอน',
    insight: 'ความโลภนำมาซึ่งทุกข์',
  },
  {
    scene: 9,
    consciousness: { สติ: 90, ปัญญา: 85 },
    defilement: { โลภะ: 10, โทสะ: 5 },
    triggerEvent: 'บรรลุธรรม',
    insight: 'ความพอเพียงคือสุขที่แท้จริง',
  },
];
```

**UI ควรมี:**

- กราฟแสดงการเปลี่ยนแปลงจิตใจตลอดเรื่อง
- Timeline ของ Trigger Events
- Validation: ตรวจสอบว่า Arc มีความต่อเนื่องหรือไม่

---

### 3. ❌ **Moral Consistency Checker** (Medium Priority)

**ควรมี:**

```typescript
const validateDialogue = (
  character: Character,
  dialogue: string,
  situation: string
): ValidationResult => {
  // ตัวอย่าง: ตัวละครมี "หิริ" สูง
  if (character.internal.consciousness['หิริ'] > 80) {
    if (dialogue.includes('โกหก') || dialogue.includes('หลอกลวง')) {
      return {
        valid: false,
        severity: 'error',
        message: `${character.name} มีหิริสูง ไม่น่าจะโกหกง่ายๆ`,
        suggestion: 'ควรแสดงความลังเลหรือความรู้สึกผิด',
      };
    }
  }

  // ตัวอย่าง: ตัวละครมี "โทสะ" สูง
  if (character.internal.defilement['โทสะ'] > 70) {
    if (!situation.includes('ถูกยั่ว') && dialogue.includes('ขอโทษ')) {
      return {
        valid: false,
        severity: 'warning',
        message: `${character.name} มีโทสะสูง ไม่น่าจะขอโทษง่าย`,
        suggestion: 'ควรแสดงความดื้อรั้นหรือหาเหตุผลแก้ตัว',
      };
    }
  }

  return { valid: true };
};
```

---

### 4. ❌ **Theme Validation System** (Medium Priority)

**ปัญหา:**

```typescript
// ✅ มี theme
scriptData.theme = 'ความโลภนำมาซึ่งความทุกข์';

// ❌ แต่ไม่มีระบบตรวจสอบว่า scenes ที่ generate ตอบ theme หรือไม่
```

**ควรมี:**

```typescript
const analyzeThemeConsistency = async (
  theme: string,
  scenes: GeneratedScene[]
): Promise<ThemeAnalysis> => {
  const prompt = `
  Theme: ${theme}
  
  Scenes:
  ${scenes.map(s => s.sceneDesign.situations.map(sit => sit.description).join('\n')).join('\n\n')}
  
  วิเคราะห์:
  1. ฉากไหนสอดคล้องกับ theme (0-10 คะแนน)
  2. ฉากไหนขัดแย้งกับ theme
  3. ข้อเสนอแนะการปรับปรุง
  
  Return JSON.
  `;

  const analysis = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(analysis.text);
};
```

**UI:**

```
📊 Theme Consistency Score: 7.5/10

✅ Scenes aligned with theme:
- Scene 3: โปรตากอนิสต์โลภ ทำให้สูญเสียครอบครัว (9/10)
- Scene 7: ตัวละครได้เรียนรู้ความพอเพียง (8/10)

⚠️ Scenes needing improvement:
- Scene 5: ตัวละครรวยแล้วมีความสุข (3/10)
  → แนะนำ: เพิ่มผลกรรมของความโลภ
```

---

### 5. ❌ **Karma System** (Advanced Feature)

**แนวคิด:**

```typescript
interface KarmaEvent {
  sceneNumber: number;
  character: string;
  action: string; // การกระทำ
  intention: string; // เจตนา (ดี/ชั่ว/เฉย)
  consequence?: string; // ผลกรรม (เกิดในอนาคต)
  karmaSeed: number; // คะแนนกรรม (-100 ถึง +100)
}

const karmaTracker: KarmaEvent[] = [
  {
    scene: 2,
    character: 'นายโลภ',
    action: 'ขโมยเงินคนยากจน',
    intention: 'ชั่ว (โลภะ)',
    karmaSeed: -80,
    consequence: null, // ยังไม่เกิด
  },
  {
    scene: 8,
    character: 'นายโลภ',
    action: 'สูญเสียทุกอย่าง',
    intention: null,
    karmaSeed: 0,
    consequence: 'ผลกรรมจาก Scene 2', // ⭐ เชื่อมโยง!
  },
];
```

**AI Prompt:**

```
ตัวละครมี Karma Debt = -80
→ ควรมีเหตุการณ์ที่ทำให้สูญเสีย/ลำบากในอนาคต
→ แต่ต้องไม่ใช่ "ทันทีทันใด" ต้องมีระยะเวลาผ่านไป
→ สอดคล้องหลักกรรม: "กรรมดีได้ดี กรรมชั่วได้ชั่ว"
```

---

## 🎯 Roadmap สู่ความสมบูรณ์

### **Phase 1: Core Psychology Integration** (2-3 สัปดาห์)

#### ✅ Task 1.1: ปรับ `generateScene()` ให้ใช้ข้อมูลจิตใจ

```typescript
// geminiService.ts
export async function generateScene(
  plotPoint: PlotPoint,
  characters: Character[],
  // ⭐ NEW
  theme: string,
  previousScenes: GeneratedScene[]
): Promise<GeneratedScene> {
  // สร้าง Character Psychology Profile
  const psychologyPrompt = characters
    .map(
      c => `
${c.name} (${c.role}):

🧠 จิตสำนึก:
${Object.entries(c.internal.consciousness)
  .map(([k, v]) => `- ${k}: ${v}/100 ${v > 70 ? '(แข็งแรง)' : v > 40 ? '(ปานกลาง)' : '(อ่อนแอ)'}`)
  .join('\n')}

😈 กิเลส:
${Object.entries(c.internal.defilement)
  .map(([k, v]) => `- ${k}: ${v}/100 ${v > 70 ? '(รุนแรง)' : v > 40 ? '(ปานกลาง)' : '(เบาบาง)'}`)
  .join('\n')}

🎯 เป้าหมาย: ${c.goals.objective}
⚔️ ความขัดแย้ง: ${c.goals.conflict}

📊 ตีความ:
${interpretPsychology(c)}
  `
    )
    .join('\n---\n');

  const prompt = `
Theme: ${theme}

${plotPoint.title} - ${plotPoint.description}

ตัวละคร:
${psychologyPrompt}

Previous Scenes Summary:
${previousScenes.map(s => `Scene ${s.sceneNumber}: ${s.sceneDesign.sceneName}`).join('\n')}

🎬 สร้างฉากที่:
1. ตัวละครกระทำสอดคล้องกับบุคลิกทางจิตใจ
2. แสดงการต่อสู้ระหว่าง "จิตสำนึก" กับ "กิเลส"
3. สะท้อน theme ของเรื่อง
4. มีผลต่อเนื่องจาก previous scenes

Return JSON.
  `;

  // ... rest of code
}
```

#### ✅ Task 1.2: สร้าง `interpretPsychology()` helper

```typescript
const interpretPsychology = (char: Character): string => {
  const interpretations: string[] = [];

  // Consciousness Analysis
  const mindfulness = char.internal.consciousness['สติ (Mindfulness)'] || 0;
  const wisdom = char.internal.consciousness['ปัญญา (Wisdom)'] || 0;

  if (mindfulness > 70 && wisdom > 70) {
    interpretations.push('✅ มีสติปัญญาสูง รู้เท่าทันอารมณ์ ตัดสินใจด้วยเหตุผล');
  } else if (mindfulness < 30) {
    interpretations.push('⚠️ ขาดสติ ง่ายต่อการกระทำตามอารมณ์');
  }

  // Defilement Analysis
  const greed = char.internal.defilement['โลภะ (Greed)'] || 0;
  const anger = char.internal.defilement['โทสะ (Anger)'] || 0;

  if (greed > 70) {
    interpretations.push('💰 โลภะรุนแรง มักเห็นแก่ตัว แสวงหาผลประโยชน์');
  }
  if (anger > 70) {
    interpretations.push('😡 โทสะรุนแรง ระเบิดอารมณ์ง่าย มักใช้ความรุนแรง');
  }

  // Combined Effects
  if (greed > 60 && anger > 60) {
    interpretations.push('⚡ อันตราย! โลภและโทสะสูง อาจทำร้ายผู้อื่นเพื่อผลประโยชน์');
  }

  return interpretations.join('\n');
};
```

#### ✅ Task 1.3: Validation System

```typescript
// validators/characterConsistency.ts
export const validateCharacterAction = (
  character: Character,
  action: string,
  dialogue: string
): ValidationResult => {
  const issues: Issue[] = [];

  // Check Greed
  const greed = character.internal.defilement['โลภะ (Greed)'] || 0;
  if (greed < 30 && (action.includes('ขโมย') || action.includes('ฉ้อโกง'))) {
    issues.push({
      severity: 'error',
      message: `${character.name} มีโลภะต่ำ (${greed}/100) ไม่ควรขโมยหรือฉ้อโกง`,
      suggestion: 'ปรับให้หาทางได้มาอย่างสุจริต หรือเพิ่มค่าโลภะ',
    });
  }

  // Check Shame (Hiri)
  const shame = character.internal.consciousness['หิริ (Shame of sin)'] || 0;
  if (shame > 70 && dialogue.includes('โกหก') && !action.includes('ลังเล')) {
    issues.push({
      severity: 'warning',
      message: `${character.name} มีหิริสูง (${shame}/100) ไม่ควรโกหกโดยไม่มีความลังเล`,
      suggestion: 'เพิ่มบทบาทแสดงความรู้สึกผิด การต่อสู้ภายใน หรือหาเหตุผลกับตัวเอง',
    });
  }

  // Check Compassion
  const compassion = character.internal.consciousness['กรุณา (Compassion)'] || 0;
  if (compassion > 80 && action.includes('ทำร้าย') && !action.includes('จำเป็น')) {
    issues.push({
      severity: 'error',
      message: `${character.name} มีกรุณาสูง (${compassion}/100) ไม่ควรทำร้ายผู้อื่นโดยไม่จำเป็น`,
      suggestion: 'หาทางแก้ปัญหาโดยไม่ใช้ความรุนแรง หรือแสดงความเจ็บปวดภายใน',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
```

---

### **Phase 2: Character Arc System** (1-2 สัปดาห์)

#### ✅ Task 2.1: เพิ่ม `CharacterArc` type

```typescript
// types.ts
export interface CharacterArcPoint {
  sceneNumber: number;
  consciousness: Record<string, number>;
  defilement: Record<string, number>;
  triggerEvent: string;
  insight?: string;
  emotionalState: string;
}

export interface Character {
  // ... existing fields
  arc?: CharacterArcPoint[]; // ⭐ NEW
}
```

#### ✅ Task 2.2: UI Component สำหรับ Arc Tracking

```tsx
// components/CharacterArcViewer.tsx
const CharacterArcViewer: React.FC<{ character: Character }> = ({ character }) => {
  const arc = character.arc || [];

  return (
    <div className="character-arc">
      <h3>Character Development Arc</h3>

      {/* Timeline */}
      <div className="timeline">
        {arc.map((point, idx) => (
          <div key={idx} className="arc-point">
            <div className="scene-marker">Scene {point.sceneNumber}</div>
            <div className="event">{point.triggerEvent}</div>
            {point.insight && <div className="insight">💡 {point.insight}</div>}

            {/* Psychology Changes */}
            <div className="changes">
              {idx > 0 && (
                <>
                  <div className="stat-change">
                    สติ: {arc[idx - 1].consciousness['สติ']} → {point.consciousness['สติ']}
                    <span
                      className={getDelta(
                        arc[idx - 1].consciousness['สติ'],
                        point.consciousness['สติ']
                      )}
                    ></span>
                  </div>
                  <div className="stat-change">
                    โลภะ: {arc[idx - 1].defilement['โลภะ']} → {point.defilement['โลภะ']}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Graph */}
      <LineChart data={arc} />
    </div>
  );
};
```

#### ✅ Task 2.3: Auto-Arc Suggestion

```typescript
// services/arcAnalyzer.ts
export const suggestArcPoints = (
  character: Character,
  structure: PlotPoint[]
): CharacterArcPoint[] => {
  const suggestions: CharacterArcPoint[] = [];

  // Initial State (Equilibrium)
  suggestions.push({
    sceneNumber: 1,
    consciousness: character.internal.consciousness,
    defilement: character.internal.defilement,
    triggerEvent: 'สภาวะเริ่มต้น',
    emotionalState: 'ปกติ',
  });

  // Turning Point (ควรเริ่มมีการเปลี่ยนแปลง)
  const turningPoint = structure.find(p => p.title === 'Turning Point');
  if (turningPoint) {
    suggestions.push({
      sceneNumber: 3,
      consciousness: adjustValues(character.internal.consciousness, +10),
      defilement: adjustValues(character.internal.defilement, -5),
      triggerEvent: 'เหตุการณ์สำคัญที่เปิดโลกทัศน์',
      emotionalState: 'สับสน กังวล',
    });
  }

  // Crisis (จุดต่ำสุด)
  suggestions.push({
    sceneNumber: 6,
    consciousness: adjustValues(character.internal.consciousness, -20),
    defilement: adjustValues(character.internal.defilement, +30),
    triggerEvent: 'วิกฤตครั้งใหญ่ สูญเสียทุกอย่าง',
    emotionalState: 'สิ้นหวัง ท้อแท้',
  });

  // Climax (ตรัสรู้)
  suggestions.push({
    sceneNumber: 8,
    consciousness: adjustValues(character.internal.consciousness, +50),
    defilement: adjustValues(character.internal.defilement, -50),
    triggerEvent: 'ได้รับการตรัสรู้ เข้าใจความจริง',
    insight: 'ความทุกข์เกิดจากกิเลส การปล่อยวางคือทางสู่อิสรภาพ',
    emotionalState: 'สงบ เข้าใจ',
  });

  return suggestions;
};
```

---

### **Phase 3: Theme & Karma Validation** (1 สัปดาห์)

#### ✅ Task 3.1: Theme Analyzer

```typescript
// services/themeAnalyzer.ts
export const analyzeThemeConsistency = async (
  theme: string,
  premise: string,
  scenes: GeneratedScene[]
): Promise<ThemeAnalysis> => {
  const prompt = `
Theme: "${theme}"
Premise: "${premise}"

Scenes:
${scenes
  .map(
    (s, i) => `
Scene ${i + 1}: ${s.sceneDesign.sceneName}
${s.sceneDesign.situations.map(sit => sit.description).join('\n')}
`
  )
  .join('\n---\n')}

Analyze:
1. Each scene's alignment with theme (0-10)
2. Overall theme consistency score
3. Suggestions for improvement

Return JSON:
{
  "overallScore": number,
  "scenes": [
    {
      "sceneNumber": number,
      "score": number,
      "alignment": "strong" | "moderate" | "weak",
      "reason": string,
      "suggestion": string
    }
  ]
}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text);
};
```

#### ✅ Task 3.2: Karma Tracker

```typescript
// types.ts
export interface KarmaEvent {
  id: string;
  sceneNumber: number;
  character: string;
  action: string;
  intention: 'good' | 'neutral' | 'bad';
  karmaSeed: number; // -100 to +100
  consequence?: {
    sceneNumber: number;
    description: string;
  };
}

// services/karmaTracker.ts
export const trackKarma = (scenes: GeneratedScene[]): KarmaEvent[] => {
  const events: KarmaEvent[] = [];

  scenes.forEach(scene => {
    scene.sceneDesign.situations.forEach(sit => {
      // ใช้ AI วิเคราะห์การกระทำว่าเป็นกรรมดีหรือชั่ว
      const analysis = analyzeAction(sit.description);

      if (analysis.hasKarmaImpact) {
        events.push({
          id: `karma-${Date.now()}`,
          sceneNumber: scene.sceneNumber,
          character: analysis.character,
          action: analysis.action,
          intention: analysis.intention,
          karmaSeed: analysis.karmaSeed,
        });
      }
    });
  });

  return events;
};

export const suggestKarmaConsequences = (
  events: KarmaEvent[],
  futureScenes: number
): KarmaEvent[] => {
  return events.map(event => {
    if (event.karmaSeed < -50 && !event.consequence) {
      // กรรมชั่วรุนแรง ควรมีผลกรรม
      const targetScene = event.sceneNumber + Math.floor(futureScenes / 2);
      return {
        ...event,
        consequence: {
          sceneNumber: targetScene,
          description: suggestConsequence(event),
        },
      };
    }
    return event;
  });
};
```

---

### **Phase 4: Advanced Features** (Optional, 2-4 สัปดาห์)

#### ✅ Task 4.1: AI Director Mode

```typescript
// "AI ผู้กำกับ" ที่คอยแนะนำและแก้ไขเรื่อง
export const getDirectorAdvice = async (scriptData: ScriptData): Promise<DirectorAdvice> => {
  const analysis = await Promise.all([
    analyzeThemeConsistency(scriptData.theme, scriptData.premise, scriptData.generatedScenes),
    validateAllCharacterArcs(scriptData.characters),
    trackKarma(scriptData.generatedScenes),
  ]);

  return {
    themeScore: analysis[0].overallScore,
    characterIssues: analysis[1].issues,
    karmaBalance: analysis[2].balance,
    recommendations: generateRecommendations(analysis),
    urgentFixes: getUrgentFixes(analysis),
  };
};
```

#### ✅ Task 4.2: Buddhist Philosophy Validator

```typescript
// ตรวจสอบว่าเรื่องสอดคล้องกับหลักธรรมหรือไม่
export const validateBuddhistPhilosophy = (scriptData: ScriptData): PhilosophyValidation => {
  const checks = [
    checkKarmaLaw(), // กฎแห่งกรรม
    checkImpermanence(), // อนิจจัง
    checkNonSelf(), // อนัตตา
    checkSuffering(), // ทุกข์
    checkMiddlePath(), // มัชฌิมาปฏิปทา
    checkCompassion(), // เมตตากรุณา
  ];

  return {
    overall: calculateOverallScore(checks),
    details: checks,
    suggestions: generatePhilosophySuggestions(checks),
  };
};
```

#### ✅ Task 4.3: Multi-Language Moral Teaching

```typescript
// สร้างบทเรียนคุณธรรมจากเรื่อง (สำหรับละครคุณธรรม)
export const generateMoralLesson = async (
  scriptData: ScriptData,
  language: 'Thai' | 'English'
): Promise<MoralLesson> => {
  const prompt = `
Based on this story:
Theme: ${scriptData.theme}
Premise: ${scriptData.premise}
Character Arcs: ${summarizeArcs(scriptData.characters)}

Generate a moral lesson in ${language} that:
1. Summarizes the main teaching
2. Explains how characters learned/failed to learn
3. Provides practical application for viewers
4. Connects to Buddhist principles

Return JSON with: summary, explanation, application, buddhistConnection
  `;

  // ... AI generation
};
```

---

## 📋 Priority Matrix

| Feature                 | Priority    | Impact     | Effort | Timeline |
| ----------------------- | ----------- | ---------- | ------ | -------- |
| Psychology in Scene Gen | 🔴 Critical | ⭐⭐⭐⭐⭐ | Medium | Week 1-2 |
| Character Arc System    | 🟠 High     | ⭐⭐⭐⭐   | Medium | Week 3   |
| Moral Consistency Check | 🟡 Medium   | ⭐⭐⭐⭐   | Low    | Week 4   |
| Theme Validation        | 🟡 Medium   | ⭐⭐⭐     | Low    | Week 4   |
| Karma Tracker           | 🟢 Low      | ⭐⭐⭐     | Medium | Week 5-6 |
| AI Director Mode        | 🔵 Optional | ⭐⭐⭐⭐   | High   | Future   |
| Buddhist Validator      | 🔵 Optional | ⭐⭐⭐⭐⭐ | High   | Future   |

---

## 🎬 Example: Before & After

### **Before (Current)**

```typescript
// AI generates scene without psychology
const scene = await generateScene(plotPoint, characters);

// Result:
{
  description: "นายโลภขโมยเงิน",
  dialogue: [
    { character: "นายโลภ", dialogue: "ฉันต้องการเงิน!" }
  ]
}

// ❌ ปัญหา: ไม่มีความลึก ไม่สะท้อนจิตใจ
```

### **After (With Psychology)**

```typescript
// AI receives full psychology profile
const scene = await generateScene(plotPoint, characters, theme, previousScenes);

// Result:
{
  description: "นายโลภเห็นเงินบนโต๊ะ จิตใจต่อสู้ระหว่างความโลภ (80/100) กับหิริ (70/100)",
  dialogue: [
    {
      character: "นายโลภ",
      dialogue: "(มองเงินอย่างโลภ) เงินเยอะแค่นี้... ไม่มีใครเห็น..."
    },
    {
      character: "นายโลภ (ภายใน)",
      dialogue: "(เสียงใจ) แต่นี่เป็นเงินของพระ... ฉันจะทำแบบนี้ได้หรือ?"
    },
    {
      character: "นายโลภ",
      dialogue: "(ความโลภมีชัย) ไม่เป็นไร สักครั้งเดียว! (หยิบเงินอย่างรวดเร็ว มือสั่น)"
    }
  ],
  internalConflict: "ความโลภชนะหิริ แต่ความรู้สึกผิดยังคงอยู่",
  foreshadowing: "ความรู้สึกผิดนี้จะกลับมาหลอกหลนในภายหลัง"
}

// ✅ มีความลึก สมจริง สะท้อนหลักธรรม
```

---

## 💡 ข้อเสนอแนะเพิ่มเติม

### 1. **เพิ่ม Tutorial Mode**

```typescript
// สำหรับผู้ใช้ใหม่
const tutorialSteps = [
  'เข้าใจหลักธรรมพื้นฐาน (โลภะ โทสะ โมหะ)',
  'ออกแบบตัวละครด้วยจิตวิทยาพุทธ',
  'สร้างเรื่องที่สอดคล้องกับ Character Arc',
  'ตรวจสอบความสมเหตุสมผลด้วย AI',
];
```

### 2. **Template Library**

```typescript
// Templates สำหรับละครคุณธรรม
const moralDramaTemplates = [
  {
    title: 'จากความโลภสู่ความพอเพียง',
    theme: 'ความโลภนำมาซึ่งทุกข์',
    arcTemplate: [
      /* ... */
    ],
  },
  {
    title: 'การให้อภัย',
    theme: 'เมตตากรุณาคือทางสู่สันติ',
    arcTemplate: [
      /* ... */
    ],
  },
];
```

### 3. **Export to Multiple Formats**

- ✅ Screenplay (TXT)
- ✅ Shot List (CSV)
- ✅ Storyboard (HTML)
- ⭐ **NEW: Moral Teaching PDF** (บทเรียนคุณธรรม)
- ⭐ **NEW: Character Psychology Report** (รายงานจิตวิทยา)

---

## 🏆 สรุป: จากดีไปสู่ยอดเยี่ยม

### **ปัจจุบัน (80% Complete)**

- ✅ มีโครงสร้างที่แข็งแรง
- ✅ มีหลักธรรมในตัวละคร
- ✅ มี AI Multi-Provider
- ✅ มี Cloud + Offline Sync

### **ยังขาด (20%)**

- ❌ เชื่อมโยงหลักธรรมกับการกระทำ
- ❌ Character Arc Tracking
- ❌ Moral Consistency Validation
- ❌ Theme Coherence Check

### **เป้าหมายต่อไป (100% Vision)**

```
Peace Script AI = Professional Screenwriting Tool
                + Buddhist Psychology Engine
                + Moral Consistency Validator
                + Character Development Tracker
                + Theme Analysis System
                + Karma Tracker
                -----------------------------------
                = ระบบสร้างหนังที่ไม่เพียงสมจริง
                  แต่ยังมีคุณค่าทางจิตวิญญาณ
```

---

**เริ่มจาก Phase 1 ก่อนครับ** (Psychology Integration)  
**Estimated Time:** 2-3 สัปดาห์  
**Impact:** ⭐⭐⭐⭐⭐ (จะทำให้ตัวละครมีชีวิตขึ้นมาทันที)

พร้อมเริ่มพัฒนาต่อเมื่อไหร่ครับ? 🚀
