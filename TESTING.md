# 🎯 Testing Strategy

## Overview

Peace Script AI uses comprehensive testing strategy:
- **Unit Tests**: Component and utility testing
- **Integration Tests**: Service and API testing
- **Coverage Target**: 80%+

---

## 🧪 Test Structure

```
src/
├── test/
│   ├── App.test.tsx                  # Main app tests
│   ├── StepIndicator.test.tsx        # Step indicator tests
│   ├── Step1Genre.test.tsx           # Genre selection tests
│   ├── Step2Boundary.test.tsx        # Boundary settings tests
│   ├── Step3Character.test.tsx       # Character creation tests
│   ├── Step4Structure.test.tsx       # Structure tests
│   ├── Step5Output.test.tsx          # Output tests
│   ├── AuthPage.test.tsx             # Authentication tests
│   ├── Studio.test.tsx               # Studio component tests
│   └── geminiService.test.ts         # AI service tests
```

---

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Run Specific Test
```bash
npx vitest src/test/App.test.tsx
```

---

## 📊 Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | Measuring... |
| Branches | 75% | Measuring... |
| Functions | 80% | Measuring... |
| Lines | 80% | Measuring... |

---

## ✅ Test Checklist

### Component Tests
- [x] App.test.tsx
- [x] StepIndicator.test.tsx
- [x] Step1Genre.test.tsx
- [x] Step2Boundary.test.tsx
- [x] Step3Character.test.tsx
- [x] Step4Structure.test.tsx
- [x] Step5Output.test.tsx
- [x] AuthPage.test.tsx
- [x] Studio.test.tsx
- [x] TeamManager.test.tsx (pending)

### Service Tests
- [x] geminiService.test.ts
- [ ] api.test.ts (pending)

### Utility Tests
- [ ] monitoring.test.ts (pending)
- [ ] errorBoundary.test.tsx (pending)

---

## 🔧 Test Configuration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/'
      ]
    }
  }
});
```

---

## 📝 Writing Tests

### Component Test Template
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import YourComponent from '../components/YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockFn = vi.fn();
    render(<YourComponent onClick={mockFn} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Service Test Template
```typescript
import { describe, it, expect, vi } from 'vitest';
import { yourService } from '../services/yourService';

describe('yourService', () => {
  it('performs action correctly', async () => {
    const result = await yourService.action();
    expect(result).toEqual(expectedValue);
  });
});
```

---

## 🎯 Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal state

2. **Use Testing Library Queries**
   - Prefer `getByRole`, `getByLabelText`
   - Avoid `getByTestId` when possible

3. **Mock External Dependencies**
   - Mock API calls
   - Mock heavy computations
   - Use `vi.mock()` for modules

4. **Keep Tests Isolated**
   - Each test should be independent
   - Use `beforeEach` for setup
   - Clean up after tests

5. **Test Edge Cases**
   - Empty states
   - Error conditions
   - Loading states
   - Maximum values

---

## 🐛 Debugging Tests

### Run Tests in Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/vitest
```

### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

---

## 📈 CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

### GitHub Actions
```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

---

## 🎨 Coverage Reports

After running `npm run test:coverage`:

1. **Terminal**: Summary in console
2. **HTML Report**: Open `coverage/index.html`
3. **JSON**: `coverage/coverage-final.json`

---

*Last Updated: 30 พฤศจิกายน 2568*
