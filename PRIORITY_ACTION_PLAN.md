# 🎯 Priority Action Plan - Peace Script AI

**วันที่:** 10 ธันวาคม 2568  
**สถานะ:** ระบบสุขภาพ 91/100 - ดีมาก แต่มีจุดปรับปรุง  
**เป้าหมาย:** ยกระดับเป็น 98/100 ภายใน 1 เดือน

---

## 📋 Quick Reference Checklist

### ⚡ Day 1-2 (Quick Wins - 6 hours)
- [ ] Fix geminiService import paths (30 min)
- [ ] Fix backend test port conflicts (1 hr)
- [ ] Clean up unused imports (1 hr)
- [ ] Add .env validation (2 hrs)
- [ ] Document current architecture (1.5 hrs)

### 🔴 Week 1 (Critical - 15 hours)
- [ ] Replace all `any` types with proper types (4 hrs)
- [ ] Add comprehensive error boundaries (3 hrs)
- [ ] Fix all test failures → 97/97 passing (4 hrs)
- [ ] Setup Sentry error tracking (2 hrs)
- [ ] Review and update Firebase security rules (2 hrs)

### 🟡 Week 2-3 (High Priority - 25 hours)
- [ ] Refactor Step5Output.tsx into 6 components (8 hrs)
- [ ] Refactor Step3Character.tsx into 7 components (8 hrs)
- [ ] Add JSDoc to all services (4 hrs)
- [ ] Improve test coverage to 80% (5 hrs)

### 🟢 Week 4 (Medium Priority - 18 hours)
- [ ] Setup CI/CD with GitHub Actions (6 hrs)
- [ ] Add E2E tests with Playwright (8 hrs)
- [ ] Setup monitoring dashboard (4 hrs)

---

## 🔴 CRITICAL - ทำก่อน (Week 1)

### 1. Fix Import Path Issues ⏱️ 30 min

**Problem:**
```typescript
// /services/geminiService.ts (wrong location)
import { selectProvider } from './providerSelector';  // ❌ Not found
import { getAIProviderSettings } from '../components/ProviderSettings';  // ❌ Wrong path
```

**Solution:**
```bash
# Option 1: Move file to correct location
cd /Users/surasak.peace/Desktop/peace-script-basic-v1\ 
mv services/geminiService.ts src/services/geminiService.ts
mv services/psychologyTTSService.ts src/services/psychologyTTSService.ts
mv services/hybridTTSService.ts src/services/hybridTTSService.ts

# Option 2: Fix imports (if moving is risky)
# Update geminiService.ts lines 13-14:
# from './providerSelector' 
# to '../src/services/providerSelector'
```

**Verification:**
```bash
npm run type-check  # Should pass
npm run lint        # Errors should decrease
```

**Expected Result:** 
- ❌ Before: ~600 ESLint errors
- ✅ After: ~580 errors (remove import errors)

---

### 2. Fix Test Port Conflicts ⏱️ 1 hour

**Problem:**
```
Error: listen EADDRINUSE: address already in use :::5000
- backend/tests/auth.test.js
- backend/tests/projects.test.js
```

**Root Cause:**
- Backend server starts on port 5000 in tests
- Multiple test files try to start server simultaneously
- No cleanup between tests

**Solution:**

```javascript
// backend/src/server.js
// Before:
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// After:
const PORT = process.env.PORT || (process.env.NODE_ENV === 'test' ? 0 : 5000);

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for testing
module.exports = { app, server };
```

```javascript
// backend/tests/auth.test.js
const request = require('supertest');
const { app } = require('../src/server');

describe('Auth API', () => {
  let server;
  
  beforeAll(() => {
    server = app.listen(0); // Random available port
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  it('should register user', async () => {
    // ... tests
  });
});
```

**Verification:**
```bash
npm test -- --run
# Expected: 97/97 tests passing
```

---

### 3. Replace `any` Types ⏱️ 4 hours

**Priority Files:**

#### A. App.tsx (8 occurrences)

```typescript
// Line 90 - BEFORE
const sanitizeScriptData = (raw: any): ScriptData => {
  // ...
}

// AFTER
const sanitizeScriptData = (raw: unknown): ScriptData => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid script data');
  }
  
  const data = raw as Partial<ScriptData>;
  
  return {
    title: data.title || '',
    genre: data.genre || '',
    // ... rest with proper validation
  };
}
```

```typescript
// Line 134 - BEFORE
const found = raw.structure.find((p: any) => p.title === defaultPoint.title);

// AFTER
const found = raw.structure.find((p: PlotPoint) => p.title === defaultPoint.title);
```

```typescript
// Line 140 - BEFORE
const sanitizedPsychologyTimelines: Record<string, any> = {};

// AFTER
type TimelineEntry = {
  scene: string;
  citta: string;
  cetasika: string[];
  // ... other properties
};
const sanitizedPsychologyTimelines: Record<string, TimelineEntry> = {};
```

#### B. geminiService.ts (7 occurrences)

```typescript
// Line 440, 500 - BEFORE
const parts: any[] = [];

// AFTER
type Part = {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
};
const parts: Part[] = [];
```

```typescript
// Line 302 - BEFORE
delete (result as any).characterGoals;

// AFTER
type ResultWithOptionalGoals = ScriptData & { characterGoals?: unknown };
delete (result as ResultWithOptionalGoals).characterGoals;
```

**Verification:**
```bash
npm run lint | grep "Unexpected any"
# Expected: 0 results
```

---

### 4. Add Error Boundaries ⏱️ 3 hours

**Step 1: Update ErrorBoundary.tsx**

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Send to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
    
    // Custom handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
            <h2 className="text-red-400 text-xl font-bold mb-2">
              เกิดข้อผิดพลาด
            </h2>
            <p className="text-gray-300 mb-4">
              ขออภัย มีข้อผิดพลาดเกิดขึ้น กรุณารีเฟรชหน้าเว็บหรือติดต่อทีมสนับสนุน
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              รีเฟรชหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap App with Error Boundaries**

```typescript
// App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ErrorBoundary fallback={<RouteErrorFallback />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/" element={
              <ErrorBoundary fallback={<StudioErrorFallback />}>
                <Studio />
              </ErrorBoundary>
            } />
          </Routes>
        </ErrorBoundary>
      </Router>
    </ErrorBoundary>
  );
}
```

**Step 3: Add Custom Fallbacks**

```typescript
// src/components/ErrorFallbacks.tsx
export const RouteErrorFallback = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl text-red-400 mb-4">404</h1>
      <p className="text-gray-300">ไม่พบหน้าที่คุณต้องการ</p>
    </div>
  </div>
);

export const StudioErrorFallback = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl text-red-400 mb-4">เกิดข้อผิดพลาดในระบบ Studio</h1>
      <p className="text-gray-300">กรุณาลองใหม่อีกครั้ง</p>
    </div>
  </div>
);
```

---

### 5. Setup Sentry ⏱️ 2 hours

**Step 1: Install**
```bash
npm install @sentry/react @sentry/vite-plugin
```

**Step 2: Configure Vite**
```typescript
// vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'peace-script-ai',
      project: 'frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true, // Required for Sentry
  },
});
```

**Step 3: Initialize Sentry**
```typescript
// src/services/errorTracking.ts
import * as Sentry from '@sentry/react';

export const initSentry = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        new Sentry.BrowserTracing({
          // Set sampling rate for performance monitoring
          tracePropagationTargets: [
            'localhost',
            'https://peace-script-ai.web.app',
          ],
        }),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 1.0, // 100% of transactions
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of errors
      
      beforeSend(event, hint) {
        // Filter out non-errors
        if (event.level === 'info') return null;
        return event;
      },
    });
  }
};
```

**Step 4: Use in App**
```typescript
// main.tsx
import { initSentry } from './services/errorTracking';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Add to .env**
```env
# .env.local
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
```

---

## 🟡 HIGH PRIORITY (Week 2-3)

### 6. Refactor Step5Output.tsx ⏱️ 8 hours

**Current:** 4,288 lines 🔴  
**Target:** 7 files × ~300 lines ✅

**Structure:**
```
src/components/Step5/
├── Step5Output.tsx              (300 lines) - Main container
├── ScreenplayPreview.tsx        (200 lines) - Live preview modal
├── ExportMenu.tsx               (150 lines) - Export dropdown
├── SceneDisplay.tsx             (250 lines) - Scene rendering
├── StoryboardDisplay.tsx        (300 lines) - Storyboard grid
├── ShotListDisplay.tsx          (250 lines) - Shot list table
└── utils/
    ├── exportHelpers.ts         (200 lines) - Export functions
    └── formatters.ts            (100 lines) - Text formatting
```

**Implementation Plan:**

**Phase 1:** Extract Export Functions (2 hours)
```typescript
// src/components/Step5/utils/exportHelpers.ts
export const generateScreenplayText = (scriptData: ScriptData): string => {
  // Move from Step5Output.tsx
};

export const generateShotListCSV = (scriptData: ScriptData): string => {
  // Move from Step5Output.tsx
};

export const generateStoryboardHTML = (scriptData: ScriptData): string => {
  // Move from Step5Output.tsx
};

export const downloadScreenplay = (scriptData: ScriptData): void => {
  const text = generateScreenplayText(scriptData);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${scriptData.title.replace(/\s+/g, '_')}_Screenplay.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

// ... more functions
```

**Phase 2:** Extract Components (4 hours)

```typescript
// src/components/Step5/ScreenplayPreview.tsx
interface Props {
  scriptData: ScriptData;
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenplayPreview: React.FC<Props> = ({ scriptData, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      {/* Preview content */}
    </div>
  );
};
```

```typescript
// src/components/Step5/ExportMenu.tsx
interface Props {
  scriptData: ScriptData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportMenu: React.FC<Props> = ({ scriptData, isOpen, onClose }) => {
  const handleExportText = () => {
    downloadScreenplay(scriptData);
    onClose();
  };
  
  // ... more handlers
  
  return (
    <div className={`absolute ... ${isOpen ? 'block' : 'hidden'}`}>
      {/* Export buttons */}
    </div>
  );
};
```

**Phase 3:** Update Main Component (2 hours)

```typescript
// src/components/Step5/Step5Output.tsx (now 300 lines)
import { ScreenplayPreview } from './ScreenplayPreview';
import { ExportMenu } from './ExportMenu';
import { SceneDisplay } from './SceneDisplay';
import { StoryboardDisplay } from './StoryboardDisplay';
import { ShotListDisplay } from './ShotListDisplay';

const Step5Output: React.FC<Props> = ({ scriptData, onUpdate, onBack }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  return (
    <div className="p-6">
      <header>
        {/* Header buttons */}
        <button onClick={() => setShowPreview(true)}>Preview</button>
        <button onClick={() => setShowExportMenu(true)}>Export</button>
      </header>
      
      <SceneDisplay scenes={scriptData.generatedScenes} />
      <ShotListDisplay shots={getAllShots(scriptData)} />
      <StoryboardDisplay storyboards={scriptData.storyboards} />
      
      <ScreenplayPreview 
        scriptData={scriptData}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
      
      <ExportMenu
        scriptData={scriptData}
        isOpen={showExportMenu}
        onClose={() => setShowExportMenu(false)}
      />
    </div>
  );
};
```

---

### 7. Refactor Step3Character.tsx ⏱️ 8 hours

**Current:** 3,110 lines 🔴  
**Target:** 8 files × ~300 lines ✅

**Structure:**
```
src/components/Step3/
├── Step3Character.tsx           (300 lines) - Main container
├── CharacterForm.tsx            (400 lines) - Form fields
├── CharacterList.tsx            (250 lines) - Character cards
├── CharacterPreviewModal.tsx    (200 lines) - Preview modal
├── PsychologyTimeline.tsx       (300 lines) - Timeline viz
├── CharacterComparison.tsx      (250 lines) - Comparison view
├── BuddhistPsychologyPanel.tsx  (400 lines) - Psychology UI
└── utils/
    ├── characterHelpers.ts      (200 lines) - Character logic
    └── psychologyHelpers.ts     (150 lines) - Psychology calc
```

**Similar refactoring process as Step5**

---

### 8. Add JSDoc Documentation ⏱️ 4 hours

**Target Services:**
- geminiService.ts
- firestoreService.ts
- providerSelector.ts
- psychologyIntegration.ts
- imageStorageService.ts

**Template:**
```typescript
/**
 * Generates a complete screenplay scene with Buddhist Psychology integration.
 * 
 * @param sceneContext - Context about the scene (plot point, characters involved)
 * @param characters - Array of character objects with psychology profiles
 * @param previousScenes - Previously generated scenes for continuity
 * @param apiKey - Google Gemini API key
 * 
 * @returns Promise resolving to GeneratedScene object
 * 
 * @throws {Error} If AI generation fails after retries
 * @throws {Error} If JSON parsing fails
 * 
 * @example
 * ```typescript
 * const scene = await generateSceneWithPsychology(
 *   { plotPoint: 'Inciting Incident', setting: 'Café' },
 *   [mainCharacter, antagonist],
 *   [],
 *   process.env.VITE_GEMINI_API_KEY
 * );
 * ```
 * 
 * @see {@link GeneratedScene} for return type structure
 * @see {@link Character} for character object structure
 */
export async function generateSceneWithPsychology(
  sceneContext: SceneContext,
  characters: Character[],
  previousScenes: GeneratedScene[],
  apiKey: string
): Promise<GeneratedScene> {
  // Implementation
}
```

---

## 🟢 MEDIUM PRIORITY (Week 4)

### 9. Setup CI/CD Pipeline ⏱️ 6 hours

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Test job
  test:
    name: Test & Build
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --run
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
          retention-days: 7
  
  # Deploy job (only on main branch)
  deploy:
    name: Deploy to Firebase
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: peace-script-ai
  
  # Preview deployment for PRs
  preview:
    name: Preview Deployment
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy preview
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          expires: 7d
          projectId: peace-script-ai
```

**Setup Secrets:**
1. Go to GitHub repo → Settings → Secrets → Actions
2. Add `FIREBASE_SERVICE_ACCOUNT` (from Firebase Console)

---

### 10. Add E2E Tests ⏱️ 8 hours

**Install Playwright:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Create tests:**
```typescript
// e2e/complete-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Script Creation Workflow', () => {
  test('should create script from genre to output', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('http://localhost:5173');
    
    // 2. Login (or skip auth in test mode)
    await page.click('text=เริ่มต้นใช้งาน');
    
    // 3. Step 1: Select Genre
    await page.click('[data-testid="genre-action"]');
    await page.fill('[data-testid="title-input"]', 'Test Action Movie');
    await page.click('text=ถัดไป');
    
    // 4. Step 2: Set Boundaries
    await page.fill('[data-testid="location-input"]', 'Bangkok');
    await page.fill('[data-testid="budget-input"]', '10000000');
    await page.click('text=ถัดไป');
    
    // 5. Step 3: Create Characters
    await page.click('[data-testid="add-character-btn"]');
    await page.fill('[data-testid="character-name"]', 'Hero');
    await page.fill('[data-testid="character-role"]', 'Protagonist');
    await page.click('text=สร้างตัวละคร');
    await expect(page.locator('text=Hero')).toBeVisible();
    await page.click('text=ถัดไป');
    
    // 6. Step 4: Structure
    await page.click('text=สร้างฉากทั้งหมด');
    await expect(page.locator('text=กำลังสร้าง...')).toBeVisible();
    await expect(page.locator('text=สร้างเสร็จแล้ว')).toBeVisible({ timeout: 60000 });
    await page.click('text=ถัดไป');
    
    // 7. Step 5: Output
    await expect(page.locator('text=บทภาพยนตร์')).toBeVisible();
    
    // 8. Export
    await page.click('[data-testid="export-btn"]');
    await page.click('text=Export as Text');
    
    // 9. Verify download (mock)
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('Test_Action_Movie');
  });
});
```

---

## 📊 Progress Tracking

### Week 1 Progress
- [ ] Day 1-2: Quick wins (6 hrs)
- [ ] Day 3-4: Fix `any` types (4 hrs)
- [ ] Day 5: Error boundaries + Sentry (5 hrs)

**Expected Result:**
- Errors: 600 → 0
- Tests: 56/97 → 97/97
- Code Quality: 82 → 88

### Week 2-3 Progress
- [ ] Week 2: Refactor Step5Output (8 hrs)
- [ ] Week 3: Refactor Step3Character (8 hrs)
- [ ] Add JSDoc (4 hrs)
- [ ] Improve test coverage (5 hrs)

**Expected Result:**
- Maintainability: Significantly improved
- Code Quality: 88 → 92

### Week 4 Progress
- [ ] CI/CD setup (6 hrs)
- [ ] E2E tests (8 hrs)
- [ ] Monitoring (4 hrs)

**Expected Result:**
- System Score: 91 → 98
- Production Ready++

---

## ✅ Success Criteria

### Technical
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ 100% test pass rate (97/97)
- ✅ 80%+ code coverage
- ✅ All files < 500 lines
- ✅ CI/CD automated

### Quality
- ✅ JSDoc on all public APIs
- ✅ Error tracking in production
- ✅ Monitoring dashboard active
- ✅ E2E tests covering main flows

### Performance
- ✅ Build < 1MB
- ✅ Page load < 3s
- ✅ Zero runtime errors

---

**Next Action:** เริ่มจาก Quick Wins (Day 1-2) ตามลำดับ ✨
