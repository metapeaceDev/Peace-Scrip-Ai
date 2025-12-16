# 📊 Production Monitoring Guide

## Overview

Peace Script AI includes comprehensive monitoring for production environments:

- ✅ Performance monitoring
- ✅ Error tracking
- ✅ User analytics
- ✅ Web vitals reporting

---

## 🚨 Error Tracking with Sentry

### Setup

1. **Create Sentry Account**

   ```
   https://sentry.io/signup/
   ```

2. **Create Project**
   - Project name: `peace-script-ai`
   - Platform: `React`

3. **Get DSN**
   - Copy your DSN from Sentry dashboard
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

4. **Install Sentry**

   ```bash
   npm install @sentry/react @sentry/vite-plugin
   ```

5. **Configure Environment Variable**

   ```env
   VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

6. **Initialize in App** (Add to `index.tsx`)

   ```typescript
   import * as Sentry from '@sentry/react';

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
     tracesSampleRate: 1.0,
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   });
   ```

---

## 📈 Google Analytics 4

### Setup

1. **Create GA4 Property**

   ```
   https://analytics.google.com/
   ```

2. **Get Measurement ID**
   - Format: `G-XXXXXXXXXX`

3. **Add to HTML** (in `index.html`)

   ```html
   <!-- Google tag (gtag.js) -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag() {
       dataLayer.push(arguments);
     }
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

4. **Track Events**

   ```typescript
   import { trackEvent } from './utils/monitoring';

   // Character generation
   trackEvent('character_generated', {
     genre: 'Drama',
     role: 'protagonist',
   });

   // Export
   trackEvent('script_exported', {
     format: 'txt',
     scene_count: 25,
   });
   ```

---

## ⚡ Performance Monitoring

### Core Web Vitals

The app automatically tracks:

- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)

### Manual Performance Tracking

```typescript
import { measurePerformance } from './utils/monitoring';

const perf = measurePerformance('ai_character_generation');
// ... do work ...
const duration = perf.end(); // Logs and reports
```

---

## 🔍 Custom Monitoring

### Track AI Usage

```typescript
import { trackAIUsage } from './utils/monitoring';

trackAIUsage('character_generation', {
  genre: 'Drama',
  success: true,
  duration_ms: 1250,
});
```

### Track Exports

```typescript
import { trackExport } from './utils/monitoring';

trackExport('txt', 25); // format, scene count
```

### Page Views

```typescript
import { trackPageView } from './utils/monitoring';

trackPageView('Step 3: Character Creation');
```

---

## 🛡️ Error Boundary

Wrap your app with ErrorBoundary:

```typescript
import { ErrorBoundary } from './utils/errorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

All errors will be:

1. Displayed to users gracefully
2. Logged to console (development)
3. Sent to Sentry (production)

---

## 📊 Monitoring Dashboard Setup

### 1. Sentry Dashboard

Track:

- Error frequency
- Affected users
- Error stack traces
- Performance issues
- Session replays

### 2. Google Analytics Dashboard

Track:

- User sessions
- Page views
- Event conversions
- User demographics
- Traffic sources

### 3. Vercel/Netlify Analytics

Built-in tracking for:

- Page load times
- Bandwidth usage
- Geographic distribution
- Device types

---

## 🚀 Deployment Checklist

Before deploying:

- [ ] Set `VITE_SENTRY_DSN` environment variable
- [ ] Configure GA4 tracking code
- [ ] Test error boundary in production build
- [ ] Verify analytics events fire correctly
- [ ] Set up Sentry alerts for critical errors
- [ ] Configure performance budgets

---

## 📈 Key Metrics to Monitor

### Performance

- Bundle size: <600KB ✅
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

### Errors

- Error rate: <0.1%
- Crash-free sessions: >99.9%

### User Engagement

- Session duration
- AI feature usage
- Export conversions
- Bounce rate

### AI Operations

- Character generation success rate
- Scene generation time
- Image generation failures
- API quota usage

---

## 🔔 Alert Configuration

### Sentry Alerts

Set up alerts for:

1. **Critical Errors**: >10 errors/hour
2. **Performance Issues**: LCP >3s
3. **API Failures**: >5% error rate

### Email Notifications

Configure in Sentry → Alerts:

```
Alert Name: Critical Production Error
Condition: Issue is first seen
Action: Send email to team@peacescript.ai
```

---

## 📝 Privacy Compliance

### GDPR/Privacy

- ✅ No PII sent to analytics by default
- ✅ User consent for cookies (add banner)
- ✅ Data retention: 90 days
- ✅ Anonymized IP addresses

### Analytics Privacy

```typescript
// In GA4 config
gtag('config', 'G-XXXXXXXXXX', {
  anonymize_ip: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
});
```

---

## 🧪 Testing Monitoring

### Test Error Tracking

```typescript
// Add temporary button in dev
<button onClick={() => {
  throw new Error('Test error for Sentry');
}}>
  Test Error
</button>
```

### Test Analytics

```typescript
// Verify in browser console
window.gtag('event', 'test_event', {
  test: true,
});
```

Check in GA4 → Reports → Realtime

---

## 📚 Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [GA4 Events Reference](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Web Vitals Guide](https://web.dev/vitals/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

## ✅ Quick Start Commands

```bash
# Install monitoring dependencies
npm install @sentry/react @sentry/vite-plugin

# Test production build with monitoring
npm run build
npm run preview

# Check bundle size
npm run build -- --report
```

---

_Last Updated: 30 พฤศจิกายน 2568_
