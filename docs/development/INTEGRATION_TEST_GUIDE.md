# Integration Test Guide for Psychology Evolution System

## ✅ Integration Completed

The Psychology Evolution System has been successfully integrated into the Peace Script application. This guide provides step-by-step instructions for testing the complete workflow.

---

## 🔗 Integration Points

### 1. **Imports Added** (`Step5Output.tsx`)

```typescript
import { updatePsychologyAfterScene } from '../services/psychologyIntegration';
import PsychologyTimeline from './PsychologyTimeline';
```

### 2. **Automatic Psychology Updates** (`Step5Output.tsx` - Line ~1616)

```typescript
const handleGenerateSingle = useCallback(async (plotPoint: PlotPoint, sceneIndex: number) => {
  // ... scene generation ...
  const scene = await generateScene(...);

  let updatedData = {
    ...scriptData,
    generatedScenes: { /* ... */ }
  };

  // 🧠 Update character psychology based on scene actions
  try {
    updatedData = updatePsychologyAfterScene(updatedData, scene, plotPoint);
    console.log('✅ Psychology updated for scene:', plotPoint.title);
  } catch (psychError) {
    console.error('⚠️ Psychology update failed:', psychError);
  }

  setScriptData(updatedData);
  // ... save ...
});
```

### 3. **Psychology Timeline Button** (`Step5Output.tsx` - Line ~1820)

```typescript
{/* 🧠 Psychology Timeline Button */}
{scriptData.characters && scriptData.characters.length > 0 && (
  <button onClick={() => {
    setSelectedCharacterForTimeline(scriptData.characters[0].id);
    setShowPsychologyTimeline(true);
  }}>
    <span>🧠</span>
    <span>Psychology</span>
  </button>
)}
```

### 4. **Timeline Modal** (`Step5Output.tsx` - Line ~1950)

```typescript
{showPsychologyTimeline && selectedCharacterForTimeline &&
 scriptData.psychologyTimelines?.[selectedCharacterForTimeline] && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
    <PsychologyTimeline
      timeline={scriptData.psychologyTimelines[selectedCharacterForTimeline]}
      onClose={() => setShowPsychologyTimeline(false)}
    />
  </div>
)}
```

### 5. **Project Initialization** (`App.tsx` - Line ~551)

```typescript
const handleCreateProject = async (title: string, type: ProjectType) => {
  let newData: ScriptData = { ...INITIAL_SCRIPT_DATA, title, projectType: type };

  // 🧠 Initialize psychology timelines for new project
  console.log('🧠 Initializing psychology timelines for new project...');
  newData = initializeProjectPsychology(newData);

  // ... save and continue ...
};
```

### 6. **Project Loading** (`App.tsx` - Line ~608)

```typescript
const handleOpenProject = async (id: string) => {
  // ... load data ...
  let sanitized = sanitizeScriptData(data);

  // 🧠 Initialize psychology timelines if not present
  if (!sanitized.psychologyTimelines) {
    console.log('🧠 Initializing psychology timelines...');
    sanitized = initializeProjectPsychology(sanitized);
    console.log('✅ Psychology timelines initialized');
  }

  setScriptData(sanitized);
  // ... continue ...
};
```

---

## 🧪 Manual Integration Testing

### Test 1: New Project Flow

1. **Create New Project**

   ```
   1. Start application
   2. Click "Create New Project"
   3. Enter title: "Psychology Test"
   4. Select type: "Feature Film"
   ```

2. **Verify Initialization**
   - Open browser console
   - Look for: `🧠 Initializing psychology timelines for new project...`
   - Expected: No errors

3. **Create Character**

   ```
   1. Go to Step 3: Character
   2. Create character "Hero" with:
      - High consciousness (Wisdom: 8, Mindfulness: 9)
      - Low defilement (Anger: 2, Greed: 1)
   ```

4. **Check Initial Timeline**
   - Character should have initial psychology snapshot
   - Timeline should be empty (no scenes yet)

### Test 2: Scene Generation Flow

1. **Setup Structure** (Step 4)

   ```
   1. Keep default structure or simplify:
      - Act I: Setup (1 scene)
      - Act II: Confrontation (1 scene)
      - Act III: Resolution (1 scene)
   ```

2. **Generate First Scene** (Step 5)

   ```
   1. Go to Step 5: Production Output
   2. Click "Generate" for "Act I: Setup - Scene 1"
   3. Wait for scene generation
   ```

3. **Verify Psychology Update**
   - Open browser console
   - Look for: `✅ Psychology updated for scene: Act I: Setup`
   - Check console for กาย-วาจา-ใจ analysis:
     ```
     🧠 Psychology Update:
     กาย: [actions extracted]
     วาจา: [speech extracted]
     ใจ: [thoughts extracted]
     Karma: กุศลกรรม/อกุศลกรรม/เฉยๆ
     Changes: { consciousness: {...}, defilement: {...} }
     ```

4. **Generate More Scenes**
   ```
   1. Generate Act II scene (should have conflict → อกุศลกรรม)
   2. Generate Act III scene (should have resolution → กุศลกรรม)
   ```

### Test 3: Psychology Timeline UI

1. **Open Timeline**

   ```
   1. In Step 5, click "🧠 Psychology" button (top-right)
   2. Timeline modal should appear
   ```

2. **Verify Timeline Content**
   - **Header**: Shows character name "Hero"
   - **Overall Arc Summary**: Displays interpretation
     ```
     Example: "แนวโน้ม: เป็นบวก - สะสม กุศลกรรม มากกว่า อกุศลกรรม..."
     ```
   - **Mental Balance Graph**: SVG line chart with data points
   - **Scene Cards**: One card per generated scene with:
     - Scene title
     - กาย/วาจา/ใจ analysis
     - Karma classification badge
     - Psychology changes
     - New mental balance score

3. **Test Interactivity**
   - Scroll through timeline
   - Close modal (X button)
   - Reopen to verify persistence

### Test 4: Validation System

1. **Create Conflicting Character**

   ```
   1. Create "Villain" with:
      - Low consciousness (Wisdom: 2, Mindfulness: 1)
      - High defilement (Anger: 9, Greed: 8)
   ```

2. **Generate Scene with Villain**

   ```
   1. Add villain to scene character list
   2. Generate scene with violent/harmful actions
   ```

3. **Check Validation Warnings**
   - Console should show warnings if:
     - Karma inconsistent with actions
     - Psychology changes too drastic (>10 points/scene)
     - Character development illogical

### Test 5: Data Persistence

1. **Save Project**

   ```
   1. Generate 2-3 scenes
   2. Auto-save should trigger after each scene
   3. Manually save (if available)
   ```

2. **Reload Project**

   ```
   1. Return to Studio
   2. Reopen project
   3. Go to Step 5
   4. Click "🧠 Psychology" button
   ```

3. **Verify Persistence**
   - All scene psychology changes should be preserved
   - Timeline should show all previous scenes
   - Mental balance graph should match previous state

### Test 6: Edge Cases

1. **Empty Project**
   - Create project without characters
   - Go to Step 5
   - Psychology button should NOT appear

2. **No Generated Scenes**
   - Create project with characters
   - Go to Step 5 without generating scenes
   - Psychology button should appear
   - Timeline should show "No scenes generated yet" message

3. **Multiple Characters**
   - Create 3+ characters
   - Generate scenes involving different characters
   - Each character should have independent timeline
   - (Note: Current implementation shows first character; future enhancement needed for character selection)

---

## 🔍 Console Debugging

### Expected Console Output

**On Project Creation:**

```
🧠 Initializing psychology timelines for new project...
✅ Psychology timelines initialized for 2 characters
```

**On Scene Generation:**

```
🧠 Analyzing scene actions...
กาย: ["วิ่งหนี", "ต่อสู้"]
วาจา: ["ตะโกน", "ขอร้อง"]
ใจ: ["กลัว", "โกรธ"]
Karma Type: อกุศลกรรม
✅ Psychology updated for scene: Act II: Confrontation
💾 Auto-saving after scene generation...
✅ Scene saved successfully
```

**On Timeline Display:**

```
📊 Timeline Data: {
  characterId: "...",
  snapshots: [...],
  changes: [...],
  overallArc: {...}
}
```

### Error Indicators

**❌ Integration Failures:**

```
⚠️ Psychology update failed: [error details]
❌ Timeline data not found for character
⚠️ Validation warning: Karma inconsistent with actions
```

---

## 🎯 Success Criteria

### Integration Complete When:

- ✅ **Auto-Update**: Psychology updates automatically after every scene generation
- ✅ **UI Access**: Psychology button appears when characters exist
- ✅ **Timeline Display**: Modal shows complete timeline with graph and scene analysis
- ✅ **Data Persistence**: Psychology timelines save/load correctly
- ✅ **Validation**: Console shows karma classification and validation warnings
- ✅ **No Crashes**: No TypeScript errors, no runtime crashes
- ✅ **Build Success**: `npm run build` completes without errors

---

## 🐛 Troubleshooting

### Issue: Timeline Button Not Visible

**Solution**: Check that `scriptData.characters.length > 0`

### Issue: Timeline Shows "No data"

**Solution**: Verify `scriptData.psychologyTimelines` exists and has character ID

### Issue: Psychology Not Updating

**Solution**:

1. Check console for errors in `updatePsychologyAfterScene`
2. Verify scene has dialogue/situations with actions
3. Check that `setScriptData(updatedData)` is called

### Issue: Build Fails

**Solution**:

1. Check TypeScript errors: `npm run build`
2. Verify all imports are correct
3. Check PsychologyTimeline component props

---

## 📝 Next Steps After Testing

1. **Deploy to Production**

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **User Testing**
   - Create realistic project with multiple characters
   - Generate complete 3-act screenplay
   - Analyze character arcs in timeline

3. **Performance Testing**
   - Test with 10+ characters
   - Test with 50+ scenes
   - Verify no lag in timeline rendering

4. **Future Enhancements**
   - Character selection dropdown (if multiple characters)
   - Export timeline as PDF/image
   - AI-powered arc suggestions based on timeline
   - Compare multiple character timelines side-by-side

---

## ✅ Integration Checklist

- [x] Import psychologyIntegration functions
- [x] Import PsychologyTimeline component
- [x] Add state for timeline modal
- [x] Call updatePsychologyAfterScene in scene generation
- [x] Add Psychology button to UI
- [x] Create timeline modal with PsychologyTimeline
- [x] Initialize timelines on project creation
- [x] Initialize timelines on project load
- [x] Build successfully
- [ ] Manual testing complete
- [ ] Deploy to production
- [ ] User testing feedback

---

**Integration Status**: ✅ COMPLETE - Ready for Testing

**Last Updated**: 2024 (after successful build)
