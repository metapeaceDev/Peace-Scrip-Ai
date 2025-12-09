/**
 * Sentry Initialization for Peace Script AI
 * 
 * This file initializes Sentry for error tracking in production.
 * Sentry helps capture and report runtime errors, performance issues,
 * and user feedback.
 * 
 * To enable Sentry:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new project for "React"
 * 3. Copy your DSN (Data Source Name)
 * 4. Set VITE_SENTRY_DSN in your .env file
 * 5. Install Sentry SDK: npm install @sentry/react
 */

declare global {
  interface Window {
    Sentry?: {
      init: (options: SentryOptions) => void;
      captureException: (error: Error, context?: SentryContext) => void;
      captureMessage: (message: string, level?: string) => void;
      setUser: (user: SentryUser | null) => void;
      setContext: (name: string, context: Record<string, unknown>) => void;
      addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
    };
  }
}

interface SentryOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  integrations?: unknown[];
  beforeSend?: (event: Record<string, unknown>) => Record<string, unknown> | null;
  ignoreErrors?: string[];
}

interface SentryContext {
  contexts?: {
    react?: {
      componentStack?: string;
    };
  };
  tags?: Record<string, string>;
  level?: string;
}

interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
}

interface SentryBreadcrumb {
  message: string;
  category?: string;
  level?: string;
  data?: Record<string, unknown>;
}

interface SentryModule {
  init: (options: SentryOptions) => void;
  captureException: (error: Error, context?: SentryContext) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: SentryUser | null) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
  reactRouterV6BrowserTracingIntegration?: (config: unknown) => unknown;
  replayIntegration?: (config: unknown) => unknown;
}

/**
 * Initialize Sentry if DSN is provided
 * Call this function early in your application lifecycle
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  // Only initialize if DSN is provided and we're not in development
  if (!dsn) {
    console.info(
      '📊 Sentry not initialized: VITE_SENTRY_DSN not found in environment variables'
    );
    return;
  }

  // Note: Sentry SDK needs to be installed separately
  // Run: npm install @sentry/react
  // For now, this is a placeholder that will work once Sentry is installed
  
  console.info('📊 Sentry configuration found but SDK not installed');
  console.info('   To enable error tracking, run: npm install @sentry/react');
  console.info(`   Environment: ${environment}`);
  console.info(`   DSN configured: ${dsn.substring(0, 20)}...`);

  // TODO: Uncomment when @sentry/react is installed
  /*
  import('@sentry/react')
    .then((Sentry: SentryModule) => {
      Sentry.init({
        dsn,
        environment,
        release: `peace-script@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        ignoreErrors: [
          'top.GLOBALS',
          'canvas.contentDocument',
          'NetworkError',
          'Failed to fetch',
          'atomicFindClose',
          'Can\'t find variable: ZiteReader',
          'jigsaw is not defined',
          'ComboSearch is not defined',
          'ResizeObserver loop limit exceeded',
        ],
        beforeSend(event: Record<string, unknown>) {
          if (environment === 'development' && !import.meta.env.VITE_SENTRY_DEV) {
            return null;
          }
          const message = event.message as string | undefined;
          if (message?.includes('password') || message?.includes('token')) {
            return null;
          }
          return event;
        },
        integrations: [
          ...(Sentry.reactRouterV6BrowserTracingIntegration
            ? [Sentry.reactRouterV6BrowserTracingIntegration({ useEffect: React.useEffect })]
            : []),
          ...(Sentry.replayIntegration
            ? [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]
            : []),
        ],
      });
      window.Sentry = Sentry;
      console.info('✅ Sentry initialized successfully');
    })
    .catch((error) => {
      console.warn('Failed to initialize Sentry:', error);
    });
  */
}

/**
 * Set the current user in Sentry for better error tracking
 */
export function setSentryUser(user: { uid: string; email?: string | null }): void {
  if (window.Sentry) {
    window.Sentry.setUser({
      id: user.uid,
      email: user.email || undefined,
    });
  }
}

/**
 * Clear the current user from Sentry (on logout)
 */
export function clearSentryUser(): void {
  if (window.Sentry) {
    window.Sentry.setUser(null);
  }
}

/**
 * Add custom context to Sentry events
 */
export function setSentryContext(
  name: string,
  context: Record<string, unknown>
): void {
  if (window.Sentry) {
    window.Sentry.setContext(name, context);
  }
}

/**
 * Add a breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>
): void {
  if (window.Sentry) {
    window.Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: 'info',
      data,
    });
  }
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: SentryContext): void {
  if (window.Sentry) {
    window.Sentry.captureException(error, context);
  } else {
    console.error('Sentry not initialized, error not captured:', error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: string = 'info'): void {
  if (window.Sentry) {
    window.Sentry.captureMessage(message, level);
  } else {
    console.log('Sentry not initialized, message not captured:', message);
  }
}

// Type guard for React import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const React = (globalThis as any).React || { useEffect: () => {} };
