# 🔍 Psychology Timeline Debugging Guide

## ปัญหาที่พบ: Timeline ไม่แสดงข้อมูลการเปลี่ยนแปลง

### สาเหตุที่เป็นไปได้

1. **ยังไม่ได้สร้างฉาก** - Timeline จะมีข้อมูลเฉพาะ initial state
2. **Psychology timelines ไม่ถูก initialize** - scriptData.psychologyTimelines เป็น undefined
3. **updatePsychologyAfterScene ไม่ถูกเรียก** - Scene generation ไม่ trigger update
4. **Character name mismatch** - ชื่อตัวละครในฉากไม่ตรงกับ character data

---

## 🔬 วิธีตรวจสอบ (Debugging Steps)

### ขั้นตอนที่ 1: ตรวจสอบ Console Log

เปิด Browser Console (F12 หรือ Cmd+Option+I) และดูข้อความต่อไปนี้:

**เมื่อเปิด Psychology Timeline:**

```
🧠 Opening Psychology Timeline
📊 Available characters: ["แทน", "ดอกไม้"]
📊 Psychology timelines: { char-id-1: {...}, char-id-2: {...} }
📊 Selected character ID: char-id-1
📊 Timeline data: { characterName: "แทน", snapshots: [...], ... }
```

**เมื่อสร้างฉาก:**

```
🧠 Analyzing scene actions...
กาย: ["วิ่งหนี", "ต่อสู้"]
วาจา: ["ตะโกน", "ขอร้อง"]
ใจ: ["กลัว", "โกรธ"]
Karma Type: อกุศลกรรม
✅ Psychology updated for แทน in Scene 1
   Balance: 65.5
   Change: ตัวละครแสดงอารมณ์โกรธ...
💾 Auto-saving after scene generation...
✅ Scene saved successfully
```

**ใน PsychologyTimeline Component:**

```
📊 PsychologyTimeline received: {
  timeline: { characterName: "แทน", snapshots: [2], changes: [1], ... },
  hasSnapshots: 2,
  hasChanges: 1,
  overallArc: { direction: "กุศลลง", totalChange: -2.7, ... }
}
```

---

## ✅ การทดสอบแบบละเอียด

### Test 1: ตรวจสอบ Initial State

```javascript
// ใน Browser Console
console.log('Psychology Timelines:', scriptData.psychologyTimelines);
console.log('Character:', scriptData.characters[0]);
```

**Expected Output:**

```javascript
{
  "char-id-1": {
    characterId: "char-id-1",
    characterName: "แทน",
    snapshots: [{
      sceneNumber: 0,
      plotPoint: "เริ่มต้น",
      mentalBalance: 68.2,
      consciousness: { Mindfulness: 8, Wisdom: 9, ... },
      defilement: { Anger: 2, Greed: 1, ... }
    }],
    changes: [],
    overallArc: {
      startingBalance: 68.2,
      endingBalance: 68.2,
      totalChange: 0,
      direction: "คงที่",
      interpretation: "ยังไม่มีการเปลี่ยนแปลง"
    }
  }
}
```

### Test 2: สร้างฉากและตรวจสอบการอัปเดต

1. **สร้างฉากที่มีตัวละคร**
   - ไปที่ Step 5: Production Output
   - เลือก scene ที่มี "แทน" ใน characters list
   - คลิก "Generate" หรือ "Regenerate"

2. **ตรวจสอบ Console**

   ```
   ✅ Psychology updated for แทน
   ```

3. **ตรวจสอบข้อมูล**

   ```javascript
   // Check snapshots length - should increase
   console.log(scriptData.psychologyTimelines['char-id-1'].snapshots.length); // Should be > 1

   // Check changes
   console.log(scriptData.psychologyTimelines['char-id-1'].changes);
   ```

### Test 3: ตรวจสอบการแสดงผล

1. คลิกปุ่ม "🧠 Psychology"
2. ดู Console log:

   ```
   📊 PsychologyTimeline received: {...}
   hasSnapshots: 2  // ต้อง > 1
   hasChanges: 1    // ต้อง > 0
   ```

3. UI ควรแสดง:
   - Overall Arc: "กุศลขึ้น", "กุศลลง", หรือ "คงที่"
   - Mental Balance Graph: มีเส้นกราฟ
   - Scene Cards: แสดงฉากที่สร้างแล้ว

---

## 🐛 การแก้ปัญหา

### ปัญหา 1: `psychologyTimelines` เป็น undefined

**สาเหตุ:** โปรเจกต์เก่าที่สร้างก่อนมีระบบนี้

**วิธีแก้:**

1. เปิดโปรเจกต์
2. ระบบจะ auto-initialize ใน `handleOpenProject`
3. ตรวจสอบ console:

   ```
   🧠 Initializing psychology timelines...
   ✅ Psychology timelines initialized
   ```

4. ถ้ายังไม่มี ให้ปิดและเปิดโปรเจกต์ใหม่

### ปัญหา 2: Timeline ไม่อัปเดตหลังสร้างฉาก

**สาเหตุ:** `updatePsychologyAfterScene` ไม่ถูกเรียก

**วิธีตรวจสอบ:**

```javascript
// ใน src/components/Step5Output.tsx line ~1630
// ต้องมี code นี้:
try {
  updatedData = updatePsychologyAfterScene(updatedData, scene, plotPoint);
  console.log('✅ Psychology updated');
} catch (psychError) {
  console.error('⚠️ Psychology update failed:', psychError);
}
```

**วิธีแก้:**

- Re-deploy application: `npm run build && firebase deploy --only hosting`
- Hard refresh browser: Cmd+Shift+R (Mac) หรือ Ctrl+Shift+R (Windows)

### ปัญหา 3: Character name mismatch

**สาเหตุ:** ชื่อในฉากไม่ตรงกับชื่อในฐานข้อมูล

**วิธีตรวจสอบ:**

```javascript
// Check scene characters
console.log('Scene characters:', scene.sceneDesign.characters);

// Check actual character names
console.log(
  'Project characters:',
  scriptData.characters.map(c => c.name)
);
```

**ต้องตรงกันทุกตัวอักษร** (case-sensitive)

### ปัญหา 4: กราฟไม่แสดง

**สาเหตุ:** มีข้อมูลเพียง 1 snapshot (initial state เท่านั้น)

**วิธีแก้:**

1. สร้างฉากอย่างน้อย 1 ฉาก
2. ตรวจสอบว่าตัวละครอยู่ใน scene.sceneDesign.characters
3. Regenerate ฉากถ้า timeline ยังไม่อัปเดต

---

## 🧪 Manual Test Script

### สร้างโปรเจกต์ทดสอบใหม่

1. **Create Project**

   ```
   Title: "Psychology Test"
   Type: Feature Film
   ```

2. **Create Character** (Step 3)

   ```
   Name: "Hero"
   High Consciousness:
     - Mindfulness: 8
     - Wisdom: 9
     - Compassion: 8
   Low Defilement:
     - Anger: 2
     - Greed: 1
     - Delusion: 2
   ```

3. **Create Structure** (Step 4)

   ```
   Act I: Setup (1 scene)
   Act II: Confrontation (1 scene)
   Act III: Resolution (1 scene)
   ```

4. **Generate Scenes** (Step 5)
   - Generate "Act I: Setup - Scene 1"
   - Wait for completion
   - Check console for psychology update
   - Generate "Act II: Confrontation - Scene 1"
   - Generate "Act III: Resolution - Scene 1"

5. **View Timeline**
   - Click "🧠 Psychology" button
   - Verify:
     - Initial snapshot (Scene 0)
     - 3 additional snapshots (Scene 1, 2, 3)
     - 3 changes
     - Overall arc direction
     - Mental balance graph with 4 points

---

## 📊 Expected Data Structure

### Initial Timeline (Before any scenes)

```javascript
{
  characterId: "abc123",
  characterName: "Hero",
  snapshots: [
    {
      sceneNumber: 0,
      plotPoint: "เริ่มต้น",
      consciousness: { Mindfulness: 8, Wisdom: 9, ... },
      defilement: { Anger: 2, Greed: 1, ... },
      mentalBalance: 68.2,
      dominantEmotion: "peaceful"
    }
  ],
  changes: [],
  overallArc: {
    startingBalance: 68.2,
    endingBalance: 68.2,
    totalChange: 0,
    direction: "คงที่",
    interpretation: "ยังไม่มีการเปลี่ยนแปลง"
  }
}
```

### After First Scene (Wholesome actions)

```javascript
{
  characterId: "abc123",
  characterName: "Hero",
  snapshots: [
    { sceneNumber: 0, mentalBalance: 68.2, ... },
    { sceneNumber: 1, mentalBalance: 70.5, ... } // +2.3 from wholesome karma
  ],
  changes: [
    {
      sceneTitle: "Act I: Setup",
      actions: {
        กาย: ["ช่วยเหลือคนอื่น", "ปกป้องผู้อ่อนแอ"],
        วาจา: ["ให้กำลังใจ", "สัญญา"],
        ใจ: ["เมตตา", "เสียสละ"]
      },
      karmaType: "กุศลกรรม",
      consciousnessChange: { Mindfulness: +2, Wisdom: +1, ... },
      defilementChange: { Anger: -1, Greed: -1, ... },
      reasoning: "ตัวละครแสดงเมตตา ช่วยเหลือผู้อื่น..."
    }
  ],
  overallArc: {
    startingBalance: 68.2,
    endingBalance: 70.5,
    totalChange: 2.3,
    direction: "กุศลขึ้น",
    interpretation: "ตัวละครพัฒนาไปในทางที่ดีขึ้น..."
  }
}
```

---

## 🔧 Force Refresh Steps

### ถ้า Timeline ยังไม่แสดงข้อมูล:

1. **Clear Browser Cache**

   ```
   Chrome: Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
   Select: "Cached images and files"
   Time range: "All time"
   ```

2. **Hard Reload**

   ```
   Chrome: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
   Safari: Cmd+Option+E then Cmd+R
   ```

3. **Check Network Tab**
   - Open DevTools > Network
   - Look for `index-*.js` file
   - Verify it's the latest version (check timestamp)

4. **Verify Deployment**

   ```bash
   # Check Firebase hosting
   firebase hosting:channel:list

   # Check last deploy time
   firebase deploy:list
   ```

---

## ✅ Success Indicators

### เมื่อระบบทำงานถูกต้อง คุณจะเห็น:

**In Console:**

- ✅ `🧠 Initializing psychology timelines for new project...`
- ✅ `✅ Psychology updated for [character] in Scene [N]`
- ✅ `📊 PsychologyTimeline received: { hasSnapshots: 2, hasChanges: 1 }`

**In UI:**

- ✅ ปุ่ม "🧠 Psychology" แสดงเมื่อมีตัวละคร
- ✅ Modal เปิดได้เมื่อคลิก
- ✅ แสดง Character Arc direction ("กุศลขึ้น", "กุศลลง", "คงที่")
- ✅ กราฟ Mental Balance แสดงเส้นโค้ง
- ✅ Scene cards แสดง กาย-วาจา-ใจ analysis
- ✅ Karma badges แสดงสี (green/red/gray)

**In Data:**

- ✅ `snapshots.length > 1` (มีข้อมูลมากกว่า initial state)
- ✅ `changes.length > 0` (มีการเปลี่ยนแปลงบันทึกไว้)
- ✅ `overallArc.totalChange !== 0` (มีการเปลี่ยนแปลงรวม)

---

## 🚨 Known Issues & Workarounds

### Issue 1: Old Projects Don't Have Timelines

**Workaround:**

- Close and reopen project
- Auto-initialization will trigger
- Or manually regenerate scenes

### Issue 2: Timeline Shows Only Initial State

**Cause:** No scenes generated yet OR character not in scene

**Solution:**

- Generate at least one scene with the character
- Verify character name in scene.sceneDesign.characters

### Issue 3: Mental Balance Doesn't Change

**Cause:** All actions classified as neutral (เฉยๆ)

**Solution:**

- Scenes need more dramatic actions (wholesome or unwholesome)
- Check karma classification keywords in psychologyEvolution.ts
- Add dialogue or actions that trigger karma classification

---

## 📝 Reporting Issues

### ถ้าพบปัญหา กรุณาให้ข้อมูล:

1. **Browser Console Logs** (screenshot หรือ copy/paste)
2. **Timeline Data**
   ```javascript
   JSON.stringify(scriptData.psychologyTimelines, null, 2);
   ```
3. **Character Data**
   ```javascript
   JSON.stringify(scriptData.characters, null, 2);
   ```
4. **Generated Scene Sample**
   ```javascript
   JSON.stringify(scene.sceneDesign, null, 2);
   ```
5. **Steps to Reproduce** - รายละเอียดขั้นตอนที่ทำก่อนเกิดปัญหา

---

**Last Updated**: 5 ธันวาคม 2568  
**Version**: 1.0  
**Status**: Production (https://peace-script-ai.web.app)
