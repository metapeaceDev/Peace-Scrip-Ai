/**
 * Monitoring and Analytics Utilities
 * Integrates performance monitoring, error tracking, and analytics
 */

import { logger } from './logger';

// Performance Monitoring
export const measurePerformance = (metricName: string) => {
  const startTime = performance.now();

  return {
    end: () => {
      const duration = performance.now() - startTime;
      logger.debug('[Performance]', { metric: metricName, duration: `${duration.toFixed(2)}ms` });

      // Send to analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'timing_complete', {
          name: metricName,
          value: Math.round(duration),
          event_category: 'Performance',
        });
      }

      return duration;
    },
  };
};

// Error Tracking
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(`[Error] ${error.message}`, context);

  // Send to error tracking service (Sentry)
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      extra: context,
    });
  }
};

// User Analytics
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  logger.debug(`[Analytics] ${eventName}`, properties);

  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }

  // Custom analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => logger.warn('Analytics failed', { error: err }));
  }
};

// Page View Tracking
export const trackPageView = (pageName: string) => {
  trackEvent('page_view', {
    page_name: pageName,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
};

// AI Usage Tracking
export const trackAIUsage = (action: string, metadata?: Record<string, any>) => {
  trackEvent('ai_usage', {
    action,
    ...metadata,
  });
};

// Export Tracking
export const trackExport = (format: string, itemCount: number) => {
  trackEvent('export', {
    format,
    item_count: itemCount,
  });
};

// Session Tracking
export const startSession = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);

  trackEvent('session_start', {
    session_id: sessionId,
  });

  return sessionId;
};

// Web Vitals Monitoring
export const reportWebVitals = (metric: any) => {
  logger.debug('[Web Vitals]', { name: metric.name, value: metric.value });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
};

// Bundle Size Monitoring
export const reportBundleLoad = (bundleName: string, size: number) => {
  trackEvent('bundle_loaded', {
    bundle_name: bundleName,
    size_bytes: size,
    size_kb: Math.round(size / 1024),
  });
};

