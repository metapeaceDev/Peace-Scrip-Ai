# Peace Script Psychology System - Phase 1 Integration

## 🎯 Overview

Phase 1 successfully integrates psychological depth into Peace Script by connecting the Character Psychology System (consciousness + defilement) with AI-generated content. This creates characters that behave consistently with their inner psychological profiles.

## ✅ Completed Features

### 1. **Psychology Calculator System** (`psychologyCalculator.ts`)

A comprehensive calculation engine that transforms raw character data into actionable psychological insights:

**Core Functions:**

- `calculatePsychologyProfile(character)` - Analyzes consciousness/defilement scores
- `calculateReaction(character, event, intensity)` - Simulates character reactions
- `formatPsychologyForPrompt(character)` - Generates AI-ready descriptions
- `updateEmotionalState(character)` - Tracks mood changes per scene

**Psychology Profile Output:**

```typescript
{
  consciousnessScore: number; // 0-100
  defilementScore: number; // 0-100
  mentalBalance: number; // -100 to +100
  dominantEmotion: string; // peaceful, joyful, angry, etc.
  strongestVirtue: string;
  strongestDefilement: string;
  personalityDescription: string; // Natural language for AI
  emotionalTendency: string; // Behavioral tendency
}
```

### 2. **Enhanced AI Integration**

**geminiService.ts Updates:**

- ✅ `generateScene()` now includes full psychological profiles for ALL characters
- ✅ `generateStoryboardImage()` accepts character array for emotion-aware visuals
- ✅ Psychology data embedded in prompts ensures consistent characterization

**Step5Output.tsx Updates:**

- ✅ Storyboard generation passes scene characters to image generator
- ✅ Both single-shot and batch generation include psychology context

### 3. **Character Type Updates**

**New `emotionalState` field in Character interface:**

```typescript
emotionalState?: {
  currentMood: 'peaceful' | 'joyful' | 'angry' | 'confused' | 'fearful' | 'neutral';
  energyLevel: number;          // 0-100
  mentalBalance: number;         // -100 to +100
  lastUpdated?: string;          // Scene context
}
```

### 4. **Visual Psychology Display**

New `PsychologyDisplay` component (`PsychologyDisplay.tsx`):

- Real-time psychology metrics visualization
- Color-coded mental balance indicator
- Emotional state with emoji icons
- Compact and full display modes

### 5. **Test Suite**

Comprehensive test file (`psychologyTest.ts`) with:

- **Test Character 1:** Virtuous Monk (High Consciousness: 91.3, Low Defilement: 6.9)
- **Test Character 2:** Corrupt Politician (Low Consciousness: 16.2, High Defilement: 76.3)
- Demonstrates how identical events produce vastly different reactions

## 🚀 How It Works

### Character Psychology → AI Generation Flow

```
1. User creates Character with consciousness/defilement sliders
   ↓
2. psychologyCalculator analyzes the values
   ↓
3. Profile generated: personality, emotions, tendencies
   ↓
4. Profile embedded in AI prompts (scene generation & images)
   ↓
5. AI creates content matching the psychological profile
   ↓
6. Consistent character behavior throughout the movie
```

### Example: Same Event, Different Reactions

**Event:** "Someone publicly insults the character and tries to provoke a fight"

**พระอรุณ (Virtuous Monk):**

- Mental Balance: +84.4 (highly virtuous)
- Reaction: `wholesome` - "calm and composed"
- AI generates: Dialogue showing compassion, peaceful body language, understanding response

**นายพลอุดม (Corrupt Politician):**

- Mental Balance: -60.1 (highly troubled)
- Reaction: `unwholesome` - "irritated and aggressive"
- AI generates: Angry dialogue, aggressive posture, vindictive response

## 📊 Psychology Calculation Formula

### Mental Balance

```
Mental Balance = Average(Consciousness) - Average(Defilement)

Ranges:
  > +30  → Virtuous (peaceful/joyful emotions)
  0 to +30 → Slightly positive (neutral-calm)
  0 to -30 → Slightly negative (neutral-conflicted)
  < -30  → Troubled (angry/confused/fearful)
```

### Reaction Calculation

```
Reaction Type =
  IF mentalBalance > (eventIntensity * 10) → WHOLESOME
  ELSE IF mentalBalance < -(eventIntensity * 10) → UNWHOLESOME
  ELSE → NEUTRAL (internal conflict)
```

## 🎬 Usage in Peace Script

### In Scene Generation (Step 4)

When you generate scenes, the AI now receives:

```
=== CHARACTER PSYCHOLOGY PROFILES ===

PSYCHOLOGICAL PROFILE for พระอรุณ:
- Mental State: a highly virtuous and mindful person, especially deeply compassionate
- Emotional Tendency: very calm and serene
- Core Virtue: Karuna (Compassion, knowing suffering) (98.0/100)
- Main Weakness: Mana (arrogance) (12.0/100)
- Current Dominant Emotion: peaceful (91.3/100)
- Mental Balance: +84.4 (Virtuous)

IMPORTANT: Portray this character's behavior, dialogue, and reactions
consistent with this psychological profile.
```

### In Storyboard Generation (Step 5)

Images include emotional context:

```
Prompt: "Close-up of พระอรุณ speaking to the crowd"
+ Character Emotions: "พระอรุณ: very calm and serene, peaceful expression"

Result: AI generates image with serene facial expression, calm posture
```

## 🧪 Testing the System

### Run the Test Suite (Browser Console)

```typescript
import { runPsychologyTests } from './src/test/psychologyTest';
runPsychologyTests();
```

### Create Test Characters in Peace Script

1. Go to Step 3 (Character)
2. Create two characters with extreme profiles:
   - **Character A:** All consciousness sliders at 90+, all defilement sliders at 10-
   - **Character B:** All consciousness sliders at 15-, all defilement sliders at 85+
3. Generate scenes with both characters
4. Compare the dialogue, actions, and reactions → Should be dramatically different!

## 📈 Next Steps (Phase 2 & 3)

### Phase 2: Light DigitalMindModel Integration (1-2 months)

- [ ] Create API middleware layer
- [ ] SimplifiedDigitalMind interface
- [ ] Character evolution across scenes (learning/development)
- [ ] Karma tracking (actions → consequences)

### Phase 3: Full DigitalMindModel Integration (3-6 months)

- [ ] Complete CoreProfile mapping
- [ ] MindOS processors (Reaction, Consequence, Virtue Development)
- [ ] Rebirth system (optional for advanced users)
- [ ] Full Buddhist psychology simulation

## 🎉 Impact Summary

**Before Phase 1:**

- Characters had psychology sliders but AI ignored them
- All characters sounded/behaved the same
- No connection between internal state and external portrayal

**After Phase 1:**

- AI-generated content reflects character psychology
- Each character has unique voice and behavior patterns
- Consistent characterization throughout the entire script
- Foundation laid for deeper DigitalMindModel integration

---

## 🛠️ Technical Details

### Files Modified

- `src/services/geminiService.ts` - AI prompt enhancement
- `src/components/Step5Output.tsx` - Character data passing
- `types.ts` - Added emotionalState field

### Files Created

- `src/services/psychologyCalculator.ts` - Core calculation engine
- `src/components/PsychologyDisplay.tsx` - UI component
- `src/test/psychologyTest.ts` - Test suite

### Dependencies

No new npm packages required! Pure TypeScript/React implementation.

---

**Version:** Peace Script v1.1 (Phase 1 Complete)
**Date:** December 2024
**Status:** ✅ Production Ready
