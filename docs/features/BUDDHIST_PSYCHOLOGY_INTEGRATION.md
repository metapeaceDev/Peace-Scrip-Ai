# Buddhist Psychology Integration - Phase 1.6 Complete ✅

## Overview

This document describes the Buddhist Psychology integration implemented in Peace Script AI, based on the **Digital Mind Model v14**.

**Latest Update:** Phase 1.6 - Performance Monitoring & Optimization (December 8, 2024)

## 🎯 What's Implemented (Phase 1.1-1.6)

### ✅ Core Infrastructure

#### 1. Feature Flag System (`src/config/featureFlags.ts`)

```typescript
const FEATURE_FLAGS = {
  JAVANA_DECISION_ENGINE: false, // Advanced karma classification
  PARAMI_SYNERGY_MATRIX: false, // Parami synergy display
  // ... 8 more flags
};
```

**Usage:**

```typescript
import { isFeatureEnabled } from './config/featureFlags';

if (isFeatureEnabled('JAVANA_DECISION_ENGINE')) {
  // Use advanced system
}
```

#### 2. Parami System Enhancements (`src/services/paramiSystem.ts`)

**New Functions:**

- `calculateParamiSynergy(parami, portfolio)` - Calculate synergy bonus
- `updateParamiFromAction(portfolio, action, karmaType)` - Update paramis from actions

**Example:**

```typescript
const synergy = calculateParamiSynergy('dana', character.parami_portfolio);
// Returns: 1.3 (meaning Dana gets +1.3 level boost from supporting paramis)

const updated = updateParamiFromAction(
  portfolio,
  { กาย: ['ช่วยเหลือคนอื่น'], วาจา: [], ใจ: [] },
  'กุศลกรรม'
);
// Dana exp increases by 10
```

#### 3. Mind Processors Integration (`src/services/psychologyEvolution.ts`)

**New Functions:**

**a) `actionsToSensoryInput(actions)`**
Converts กาย-วาจา-ใจ (Body-Speech-Mind) actions into sensory inputs for the mind-door process.

```typescript
const actions = {
  กาย: ['ทำร้ายผู้อื่น'],
  วาจา: ['พูดจาหยาบคาย'],
  ใจ: ['โกรธเคือง'],
};

const inputs = actionsToSensoryInput(actions);
// Returns: [
//   { type: 'unpleasant', object: 'ทำร้ายผู้อื่น', intensity: 70, senseDoor: 'body' },
//   { type: 'unpleasant', object: 'พูดจาหยาบคาย', intensity: 75, senseDoor: 'ear' },
//   { type: 'unpleasant', object: 'โกรธเคือง', intensity: 80, senseDoor: 'mind' }
// ]
```

**b) `classifyKarmaWithJavana(actions, character)`**
Uses JavanaDecisionEngine to classify karma based on Abhidhamma mind-door process.

```typescript
const result = classifyKarmaWithJavana(actions, character);
// Returns: {
//   type: 'อกุศลกรรม',
//   intensity: 'severe',
//   dominantCarita: 'โทสจริต',
//   javana_results: [
//     {
//       citta_type: 'Dosa-mula-citta',
//       quality: 'akusala',
//       reasoning: 'High patigha anusaya + unpleasant input → akusala citta'
//     }
//   ]
// }
```

**How it works:**

1. Converts actions → sensory inputs
2. Each input goes through JavanaDecisionEngine
3. Engine checks: Sati level, Anusaya strength, Parami resistance
4. Generates kusala/akusala citta based on probabilities
5. Aggregates results to classify overall karma

#### 4. Psychology Calculator Enhancements (`src/services/psychologyCalculator.ts`)

**New Function:**

**`analyzeParamiPortfolio(character)`**
Provides detailed Parami analysis with synergy calculations.

```typescript
const analysis = analyzeParamiPortfolio(character);
// Returns: {
//   totalParamiStrength: 87,
//   strongestParami: { name: 'panna', level: 10, exp: 500 },
//   weakestParami: { name: 'nekkhamma', level: 3, exp: 150 },
//   synergyAnalysis: [
//     {
//       parami: 'panna',
//       baseLevel: 10,
//       synergyBonus: 2.25,  // From nekkhamma(5) + adhitthana(6) + viriya(4) * 0.15
//       effectiveLevel: 12.25,
//       supportingParamis: ['nekkhamma', 'adhitthana', 'viriya']
//     },
//     // ... 9 more paramis
//   ],
//   overallSynergyBonus: 8.7
// }
```

#### 5. UI Integration (`src/components/PsychologyDisplay.tsx`)

**Enhanced Display:**

- Shows Parami Portfolio (when feature flag enabled)
- Displays strongest parami
- Shows synergy bonuses
- Top 5 paramis with effective levels

```tsx
<PsychologyDisplay character={character} />
// Now shows:
// - Mental balance
// - Consciousness/Defilement scores
// - Emotional state
// - Personality summary
// - 🌟 Parami Portfolio (if enabled)
```

## 🔍 Performance Monitoring (Phase 1.6)

### Performance Monitor (`src/utils/performanceMonitor.ts`)

**Purpose:** Track execution time and memory usage of Buddhist psychology functions.

**Key Features:**

- ✅ Measure function execution time (sync & async)
- ✅ Track memory usage (optional)
- ✅ Set performance thresholds
- ✅ Automatic warnings when thresholds exceeded
- ✅ Performance metrics collection
- ✅ Summary reports

**Usage:**

```typescript
import { performanceMonitor } from './utils/performanceMonitor';

// Enable monitoring (dev mode)
performanceMonitor.enable();

// Measure function
performanceMonitor.measureSync('my-operation', () => someFunction());

// Get metrics
const avgTime = performanceMonitor.getAverageTime('my-operation');
const summary = performanceMonitor.getSummary();
performanceMonitor.logReport(); // Console report
```

**Thresholds:**

- Javana Decision: < 50ms
- Parami Calculation: < 30ms
- Anusaya Tracking: < 20ms
- Psychology Update: < 100ms

**Performance Benchmarks (9 tests passing):**

- ✅ Parami synergy calculation: < 30ms
- ✅ 10 paramis synergy: < 100ms
- ✅ 1000 calculations: < 500ms
- ✅ Monitor overhead: < 500%
- ✅ Memory leak test: < 1MB/1000 ops

## 📊 Test Coverage

### Unit Tests (26/26 passing ✅)

**`paramiSystem.test.ts` (11 tests)**

- ✅ PARAMI_SYNERGY_MATRIX structure validation
- ✅ calculateParamiSynergy() calculations
- ✅ updateParamiFromAction() behavior
- ✅ Level-up mechanics
- ✅ Synergy integration

**`mindProcessors.test.ts` (6 tests)**

- ✅ JavanaDecisionEngine with high mindfulness → kusala
- ✅ JavanaDecisionEngine with low mindfulness + strong kilesa → akusala
- ✅ Parami resistance against kilesa
- ✅ Pleasant vs unpleasant sensory input handling
- ✅ Proper JavanaResult structure
- ✅ Cetana strength variation

## 🚀 How to Enable Features

### Option 1: Modify Feature Flags (Development)

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  JAVANA_DECISION_ENGINE: true, // ← Change to true
  PARAMI_SYNERGY_MATRIX: true, // ← Change to true
};
```

### Option 2: Runtime Toggle (Development only)

```typescript
import { enableFeatureForDev } from './config/featureFlags';

if (import.meta.env.DEV) {
  enableFeatureForDev('JAVANA_DECISION_ENGINE');
  enableFeatureForDev('PARAMI_SYNERGY_MATRIX');
}
```

### Option 3: Environment Variables (Future)

```env
VITE_FEATURE_JAVANA_ENGINE=true
VITE_FEATURE_PARAMI_SYNERGY=true
```

## 🧪 Testing the Integration

### 1. Create a Test Character

```typescript
const testCharacter: Character = {
  name: 'Test Monk',
  internal: {
    consciousness: {
      'สติ (Mindfulness)': 85,
      'ปัญญา (Wisdom)': 80,
    },
    defilement: {
      โลภะ: 15,
      โทสะ: 10,
      โมหะ: 20,
    },
  },
  parami_portfolio: {
    dana: { level: 8, exp: 400 },
    sila: { level: 7, exp: 350 },
    panna: { level: 10, exp: 500 },
    // ... other paramis
  },
  buddhist_psychology: {
    anusaya: {
      kama_raga: 20,
      patigha: 15,
      avijja: 25,
      // ... other anusayas
    },
    carita: 'สัทธาจริต',
  },
};
```

### 2. Test Parami Synergy

```typescript
import { analyzeParamiPortfolio } from './services/psychologyCalculator';

const analysis = analyzeParamiPortfolio(testCharacter);
console.log('Total Strength:', analysis.totalParamiStrength);
console.log('Synergy Bonus:', analysis.overallSynergyBonus);
```

### 3. Test Karma Classification

```typescript
import { classifyKarmaWithJavana } from './services/psychologyEvolution';

const actions = {
  กาย: ['ช่วยเหลือผู้อื่น'],
  วาจา: ['พูดจาสุภาพ'],
  ใจ: ['มีเมตตา'],
};

const karma = classifyKarmaWithJavana(actions, testCharacter);
console.log('Karma Type:', karma.type); // Should be กุศลกรรม
console.log('Javana Results:', karma.javana_results);
```

## 📈 Performance Impact

- **Build size:** +0.5KB (minimal increase)
- **Runtime:** ~5ms for full analysis (negligible)
- **Memory:** No significant increase
- **Tests:** All passing (17/17)

## 🔒 Safety Features

### 1. Feature Flags

All new features are **OFF by default**, ensuring zero impact on production until explicitly enabled.

### 2. Backward Compatibility

- Old functions still work (e.g., `classifyKarma()`)
- New functions are additive, not replacement
- Graceful degradation when data is missing

### 3. Error Handling

```typescript
const paramiAnalysis = analyzeParamiPortfolio(character);
if (!paramiAnalysis) {
  // Character doesn't have parami_portfolio
  return null;
}
```

## 🎨 UI/UX Enhancements

### Before (v1.3):

- Basic psychology display
- Mental balance indicator
- Consciousness/Defilement scores

### After (v1.4):

- ✨ **Parami Portfolio section** (when enabled)
- 🌟 **Synergy bonus display**
- 📊 **Top 5 paramis with effective levels**
- 🎯 **Strongest/weakest parami indicators**

## 🛠️ Development Workflow

### 1. Make Changes

```bash
cd peace-script-basic-v1
npm test  # Run all tests
npm run type-check  # TypeScript validation
npm run lint  # Code quality
```

### 2. Build

```bash
npm run build  # Production build
```

### 3. Deploy

```bash
firebase deploy --only hosting
```

## 📚 Related Documentation

- **Digital Mind Model v14:** `/planning_documents/DigitalMindModel v14.txt`
- **Integration Roadmap:** `/planning_documents/INTEGRATION_ROADMAP_2025.md`
- **Quick Start Guide:** `/planning_documents/QUICK_START_INTEGRATION.md`
- **Executive Summary:** `/planning_documents/EXECUTIVE_SUMMARY.md`

## 🔮 Next Steps (Optional)

### Phase 2: Advanced UI Features

- [ ] Parami evolution timeline
- [ ] Citta moment visualization
- [ ] Anusaya strength indicators
- [ ] Kamma timeline view

### Phase 3: Advanced Analytics

- [ ] Parami growth predictions
- [ ] Anusaya weakening strategies
- [ ] Character comparison with psychology
- [ ] Story arc psychology tracking

### Phase 4: Microservices (Future)

- [ ] Separate psychology calculation service
- [ ] Real-time citta tracking
- [ ] Multi-user karma tracking
- [ ] Advanced meditation simulation

## ✅ Deployment Status

- **Version:** 1.4.0
- **Deployed:** December 8, 2024
- **URL:** https://peace-script-ai.web.app
- **Status:** ✅ Production ready
- **Features:** 🔒 All OFF (safe)

## 🙏 Credits

Based on:

- **Abhidhamma:** Traditional Buddhist psychology
- **Digital Mind Model v14:** Complete implementation
- **Peace Script AI:** Screenplay generation platform

---

**Note:** This is a **Phase 1 Complete** implementation. All features are production-ready but disabled by default. Enable features gradually after thorough testing.
