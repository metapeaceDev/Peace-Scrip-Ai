# Peace Script AI - Development Guide

**Complete guide for developers contributing to Peace Script AI**

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Architecture](#project-architecture)
3. [Code Standards](#code-standards)
4. [Testing Guidelines](#testing-guidelines)
5. [Git Workflow](#git-workflow)
6. [Feature Development](#feature-development)
7. [Performance Optimization](#performance-optimization)
8. [Debugging](#debugging)
9. [Common Tasks](#common-tasks)
10. [CI/CD Pipeline](#cicd-pipeline)

---

## Development Environment Setup

### Prerequisites

```bash
# Required versions
node -v    # >= 18.0.0
npm -v     # >= 9.0.0
git --version

# Recommended tools
code --version  # VS Code
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
cd Peace-Scrip-Ai

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Verify setup
npm test -- --run
# Should see: ✓ 1,945 tests passing

# 5. Start development server
npm run dev
```

### VS Code Extensions

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "vitest.enable": true
}
```

---

## Project Architecture

### Directory Structure

```
peace-script-basic-v1/
├── src/
│   ├── components/          # React components
│   │   ├── common/         # Reusable UI components
│   │   ├── script/         # Script-related components
│   │   ├── video/          # Video generation components
│   │   └── auth/           # Authentication components
│   │
│   ├── services/            # Business logic & APIs
│   │   ├── scriptGenerator.ts      # Script generation
│   │   ├── videoGenerator.ts       # Video generation
│   │   ├── backendManager.ts       # Backend orchestration
│   │   ├── requestQueue.ts         # Request queue system
│   │   ├── loadBalancer.ts         # Auto-scaling load balancer
│   │   ├── runpod.ts              # RunPod integration
│   │   ├── geminiAPI.ts           # Google Gemini API
│   │   └── firebase/              # Firebase services
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useScript.ts
│   │   ├── useVideo.ts
│   │   └── useAuth.ts
│   │
│   ├── store/               # State management (Zustand)
│   │   ├── scriptStore.ts
│   │   ├── videoStore.ts
│   │   └── authStore.ts
│   │
│   ├── types/               # TypeScript definitions
│   │   ├── script.ts
│   │   ├── video.ts
│   │   └── api.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   │
│   └── __tests__/           # Test files
│       ├── components/
│       ├── services/
│       ├── hooks/
│       └── utils/
│
├── public/                  # Static assets
├── docs/                    # Documentation
├── scripts/                 # Build & deployment scripts
└── config/                  # Configuration files
```

### Core Services Architecture

```typescript
// High-level service flow
User Input
    ↓
ScriptGenerator (Gemini API)
    ↓
Script Object
    ↓
VideoGenerator
    ↓
BackendManager
    ↓
┌─────────────┬─────────────┬─────────────┐
│   Local     │   Cloud     │   AI API    │
│  ComfyUI    │   RunPod    │   Gemini    │
└─────────────┴─────────────┴─────────────┘
    ↓
RequestQueue (Priority-based)
    ↓
LoadBalancer (Auto-scaling)
    ↓
Video Output
```

### State Management

We use **Zustand** for state management:

```typescript
// Example store structure
interface ScriptStore {
  // State
  scripts: Script[];
  currentScript: Script | null;
  isGenerating: boolean;
  
  // Actions
  generateScript: (params: ScriptParams) => Promise<void>;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  
  // Computed
  getScriptById: (id: string) => Script | undefined;
}

// Usage in components
const { scripts, generateScript } = useScriptStore();
```

---

## Code Standards

### TypeScript

```typescript
// ✅ Good: Explicit types
interface ScriptParams {
  topic: string;
  style: string;
  length: 'short' | 'medium' | 'long';
  buddhistPrinciple?: string;
}

function generateScript(params: ScriptParams): Promise<Script> {
  // Implementation
}

// ❌ Bad: Any types
function generateScript(params: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good: Functional component with TypeScript
interface ScriptEditorProps {
  script: Script;
  onSave: (script: Script) => void;
  readonly?: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onSave,
  readonly = false
}) => {
  const [localScript, setLocalScript] = useState(script);
  
  const handleSave = useCallback(() => {
    onSave(localScript);
  }, [localScript, onSave]);
  
  return (
    <div className="script-editor">
      {/* Implementation */}
    </div>
  );
};

// ❌ Bad: Class component without types
export class ScriptEditor extends React.Component {
  render() {
    return <div>{this.props.script}</div>;
  }
}
```

### File Naming

```
✅ Good:
- scriptGenerator.ts (camelCase for files)
- ScriptEditor.tsx (PascalCase for React components)
- useScript.ts (camelCase for hooks)
- script.test.ts (*.test.ts for tests)

❌ Bad:
- ScriptGenerator.ts
- script_editor.tsx
- use-script.ts
- script.spec.ts
```

### Import Order

```typescript
// 1. External dependencies
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// 2. Internal absolute imports
import { ScriptGenerator } from '@/services/scriptGenerator';
import { useScriptStore } from '@/store/scriptStore';

// 3. Types
import type { Script, ScriptParams } from '@/types/script';

// 4. Relative imports
import { validateScript } from './utils';

// 5. Styles (if any)
import './styles.css';
```

### Naming Conventions

```typescript
// Variables & Functions: camelCase
const scriptCount = 10;
function generateScript() {}

// Constants: UPPER_SNAKE_CASE
const MAX_SCRIPT_LENGTH = 5000;
const API_ENDPOINT = 'https://api.example.com';

// Types & Interfaces: PascalCase
interface ScriptParams {}
type ScriptStatus = 'draft' | 'published';

// React Components: PascalCase
const ScriptEditor = () => {};

// Private functions: _camelCase (optional)
function _internalHelper() {}
```

---

## Testing Guidelines

### Test Structure

```typescript
// src/__tests__/services/scriptGenerator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptGenerator } from '@/services/scriptGenerator';

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator;
  
  beforeEach(() => {
    generator = new ScriptGenerator();
  });
  
  describe('generateScript', () => {
    it('should generate script with valid parameters', async () => {
      // Arrange
      const params = {
        topic: 'Gratitude',
        style: 'Drama',
        length: 'medium' as const
      };
      
      // Act
      const result = await generator.generate(params);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeTruthy();
      expect(result.scenes.length).toBeGreaterThan(0);
    });
    
    it('should throw error with invalid parameters', async () => {
      // Arrange
      const params = {
        topic: '',
        style: 'Drama',
        length: 'medium' as const
      };
      
      // Act & Assert
      await expect(generator.generate(params)).rejects.toThrow();
    });
  });
});
```

### Test Coverage Requirements

```bash
# Minimum coverage thresholds
Statements: 80%
Branches: 75%
Functions: 80%
Lines: 80%

# Check coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Mocking

```typescript
// Mock external services
vi.mock('@/services/geminiAPI', () => ({
  GeminiAPI: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue({
      text: 'Mock response'
    })
  }))
}));

// Mock Firebase
vi.mock('@/services/firebase', () => ({
  auth: {
    signInWithEmailAndPassword: vi.fn()
  },
  firestore: {
    collection: vi.fn()
  }
}));
```

### Test Best Practices

```typescript
// ✅ Good: Descriptive test names
it('should auto-scale up when queue length exceeds threshold', async () => {
  // Test implementation
});

// ❌ Bad: Vague test names
it('should work', async () => {
  // Test implementation
});

// ✅ Good: Test one thing
it('should validate email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});

it('should reject invalid email', () => {
  expect(isValidEmail('invalid')).toBe(false);
});

// ❌ Bad: Test multiple things
it('should validate email and password', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidPassword('password123')).toBe(true);
});
```

---

## Git Workflow

### Branch Strategy

```bash
main              # Production-ready code
  ↓
develop           # Development branch
  ↓
feature/xxx       # New features
bugfix/xxx        # Bug fixes
hotfix/xxx        # Production hotfixes
release/xxx       # Release preparation
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code style (no logic change)
refactor: Code refactoring
test:     Adding/updating tests
chore:    Maintenance tasks

# Examples
feat(script): add Buddhist psychology integration
fix(video): resolve RunPod connection timeout
docs(readme): update installation instructions
test(services): add load balancer tests
refactor(queue): improve request queue performance
```

### Pull Request Process

```bash
# 1. Create feature branch
git checkout -b feature/new-feature develop

# 2. Make changes and commit
git add .
git commit -m "feat(scope): description"

# 3. Push to remote
git push origin feature/new-feature

# 4. Create Pull Request on GitHub
# - Title: Clear, descriptive
# - Description: What, why, how
# - Link related issues
# - Request reviewers

# 5. Address review comments
git add .
git commit -m "fix: address review comments"
git push

# 6. Merge after approval
# Use "Squash and merge" for clean history
```

### Code Review Checklist

**Before Requesting Review:**
- [ ] All tests passing
- [ ] Code formatted (Prettier)
- [ ] No linting errors (ESLint)
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Changelog updated

**Reviewer Checklist:**
- [ ] Code follows project standards
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Performance considerations
- [ ] Documentation is clear
- [ ] Breaking changes noted

---

## Feature Development

### Step-by-Step Guide

#### 1. Plan Feature

```markdown
## Feature: Buddhist Psychology Integration

### Goal
Integrate Buddhist psychology principles into script generation

### Requirements
- [ ] Support 37 Buddhist principles
- [ ] Depth levels: basic/intermediate/advanced
- [ ] Natural integration into narratives
- [ ] Educational value

### Technical Design
- Service: `buddhistPsychology.ts`
- Types: `BuddhistPrinciple`, `PsychologyDepth`
- Integration: Modify `scriptGenerator.ts`
```

#### 2. Create Types

```typescript
// src/types/buddhist.ts
export interface BuddhistPrinciple {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: 'ethics' | 'meditation' | 'wisdom';
}

export type PsychologyDepth = 'basic' | 'intermediate' | 'advanced';

export interface PsychologyIntegration {
  principles: string[];
  depth: PsychologyDepth;
  context: string;
}
```

#### 3. Implement Service

```typescript
// src/services/buddhistPsychology.ts
import type { BuddhistPrinciple, PsychologyIntegration } from '@/types/buddhist';

export class BuddhistPsychologyService {
  private principles: Map<string, BuddhistPrinciple> = new Map();
  
  constructor() {
    this.loadPrinciples();
  }
  
  async integrate(params: PsychologyIntegration): Promise<string> {
    // Implementation
  }
  
  private loadPrinciples(): void {
    // Load 37 principles
  }
}
```

#### 4. Write Tests

```typescript
// src/__tests__/services/buddhistPsychology.test.ts
import { describe, it, expect } from 'vitest';
import { BuddhistPsychologyService } from '@/services/buddhistPsychology';

describe('BuddhistPsychologyService', () => {
  it('should integrate principles at basic level', async () => {
    const service = new BuddhistPsychologyService();
    const result = await service.integrate({
      principles: ['กตัญญูกตเวที'],
      depth: 'basic',
      context: 'A story about gratitude'
    });
    
    expect(result).toContain('gratitude');
  });
});
```

#### 5. Update Components

```typescript
// src/components/script/ScriptWizard.tsx
import { BuddhistPsychologyService } from '@/services/buddhistPsychology';

export const ScriptWizard: React.FC = () => {
  const [selectedPrinciple, setSelectedPrinciple] = useState('');
  const [depth, setDepth] = useState<PsychologyDepth>('basic');
  
  // Implementation
};
```

#### 6. Add Documentation

```markdown
# Buddhist Psychology Integration

## Overview
This feature allows integrating Buddhist psychology principles into scripts.

## Usage
\`\`\`typescript
const script = await scriptGenerator.generate({
  topic: "Overcoming Fear",
  buddhistPrinciples: ["สติ-สัมปชัญญะ"],
  psychologyDepth: "advanced"
});
\`\`\`

## Supported Principles
- กตัญญูกตเวที (Gratitude)
- สติ-สัมปชัญญะ (Mindfulness)
- ... (35 more)
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const ScriptEditor = lazy(() => import('@/components/script/ScriptEditor'));
const VideoGenerator = lazy(() => import('@/components/video/VideoGenerator'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ScriptEditor />
</Suspense>
```

### Memoization

```typescript
// useMemo for expensive computations
const sortedScripts = useMemo(() => {
  return scripts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [scripts]);

// useCallback for functions
const handleSave = useCallback((script: Script) => {
  updateScript(script.id, script);
}, [updateScript]);
```

### Bundle Size Optimization

```bash
# Analyze bundle
npm run build
npm run analyze

# Check for large dependencies
npx vite-bundle-analyzer

# Optimize imports
# ❌ Bad: Import entire library
import _ from 'lodash';

# ✅ Good: Import specific functions
import debounce from 'lodash/debounce';
```

---

## Debugging

### VS Code Debugging

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug React App",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Console Debugging

```typescript
// Development-only logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// Performance measurement
console.time('generateScript');
await scriptGenerator.generate(params);
console.timeEnd('generateScript');

// Table output
console.table(scripts.map(s => ({
  id: s.id,
  title: s.title,
  status: s.status
})));
```

### React DevTools

```bash
# Install React DevTools extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

# Use Profiler to find performance issues
# Components > Profiler > Record
```

---

## Common Tasks

### Add New Service

```bash
# 1. Create service file
touch src/services/newService.ts

# 2. Create type definitions
touch src/types/newService.ts

# 3. Create tests
touch src/__tests__/services/newService.test.ts

# 4. Implement service
# 5. Write tests
# 6. Update documentation
```

### Add New Component

```bash
# 1. Create component file
touch src/components/category/NewComponent.tsx

# 2. Create styles (if needed)
touch src/components/category/NewComponent.module.css

# 3. Create tests
touch src/__tests__/components/category/NewComponent.test.tsx

# 4. Export from index
echo "export { NewComponent } from './NewComponent';" >> src/components/category/index.ts
```

### Update Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages (careful!)
npm update

# Update major versions
npx npm-check-updates -u
npm install

# Test after updates
npm test -- --run
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --run
      
      - name: Build
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

`.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm test -- --run
```

---

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)

### Internal Docs
- [Project Completion Report](../PROJECT_COMPLETION_REPORT.md)
- [API Documentation](./API.md)
- [Architecture Decisions](./ARCHITECTURE.md)

---

**Happy Coding! 🚀**

**Last Updated:** December 18, 2024  
**Version:** 1.0
