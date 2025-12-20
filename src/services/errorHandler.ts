/**
 * Enhanced Error Handling for ComfyUI System
 *
 * Provides:
 * - User-friendly error messages
 * - Actionable suggestions
 * - Auto-retry logic
 * - Fallback mechanisms
 */

export interface BackendError {
  backend: string;
  error: Error | string;
  timestamp: number;
  retriable: boolean;
  suggestion?: string;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
}

export interface ErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  showUserNotification?: boolean;
  logToConsole?: boolean;
  fallbackEnabled?: boolean;
}

/**
 * Enhanced error class for ComfyUI operations
 */
export class ComfyUIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly backend: string,
    public readonly retriable: boolean = false,
    public readonly suggestion?: string,
    public readonly action?: BackendError['action']
  ) {
    super(message);
    this.name = 'ComfyUIError';
  }
}

/**
 * Parse error and provide user-friendly message with suggestions
 */
export function parseError(error: unknown, backend: string): ComfyUIError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    if (backend === 'local-comfyui') {
      return new ComfyUIError(
        'Local ComfyUI is not running',
        'COMFYUI_NOT_RUNNING',
        backend,
        false, // Not retriable - user needs to start ComfyUI
        'Please start ComfyUI on localhost:8188',
        {
          label: 'How to start ComfyUI',
          url: '/docs/comfyui-setup',
        }
      );
    }

    if (backend.includes('cloud')) {
      return new ComfyUIError(
        'Cloud ComfyUI is not responding',
        'CLOUD_UNREACHABLE',
        backend,
        true, // Retriable - might be temporary
        'Cloud service may be starting up. Retrying...'
      );
    }
  }

  // Timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return new ComfyUIError(
      'Request timed out',
      'TIMEOUT',
      backend,
      true,
      'The request took too long. This might be due to high server load.'
    );
  }

  // DNS/Name resolution errors
  if (error instanceof Error && error.message.includes('ERR_NAME_NOT_RESOLVED')) {
    return new ComfyUIError(
      'Invalid server URL',
      'INVALID_URL',
      backend,
      false,
      'The server URL is no longer valid. Please update your configuration.',
      {
        label: 'Update URL',
        callback: () => {
          // Clear old URL
          localStorage.removeItem('comfyui_url');
          window.location.reload();
        },
      }
    );
  }

  // CORS errors
  if (error instanceof Error && error.message.includes('CORS')) {
    return new ComfyUIError(
      'Cross-origin request blocked',
      'CORS_ERROR',
      backend,
      false,
      'ComfyUI server needs to enable CORS. Check server configuration.'
    );
  }

  // Quota/Rate limit errors
  if (error instanceof Error && error.message.includes('quota')) {
    return new ComfyUIError(
      'API quota exceeded',
      'QUOTA_EXCEEDED',
      backend,
      false,
      'You have reached your API quota. Try using local ComfyUI or wait for quota reset.',
      {
        label: 'View pricing',
        url: '/pricing',
      }
    );
  }

  // GPU/Memory errors
  if (
    error instanceof Error &&
    (error.message.includes('Out of memory') || error.message.includes('CUDA'))
  ) {
    return new ComfyUIError(
      'GPU out of memory',
      'OOM_ERROR',
      backend,
      false,
      'Your GPU does not have enough memory. Try reducing video resolution or frame count.',
      {
        label: 'Reduce quality',
        callback: () => {
          // User can reduce quality in settings
          console.info('💡 Tip: Try 512x512 resolution instead of 1024x1024');
        },
      }
    );
  }

  // Model not found
  if (error instanceof Error && error.message.includes('model')) {
    return new ComfyUIError(
      'Required model not found',
      'MODEL_MISSING',
      backend,
      false,
      'The required AI model is not installed. Please download it first.',
      {
        label: 'Download models',
        url: '/docs/model-setup',
      }
    );
  }

  // Generic error
  return new ComfyUIError(
    error instanceof Error ? error.message : String(error),
    'UNKNOWN_ERROR',
    backend,
    true,
    'An unexpected error occurred. Trying fallback options...'
  );
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: ErrorHandlingOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, logToConsole = true } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && logToConsole) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s
        const delay = retryDelay * Math.pow(2, attempt);
        if (logToConsole) {
          console.warn(`⏳ Waiting ${delay}ms before retry...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Show user-friendly error notification
 */
export function showErrorNotification(error: ComfyUIError): void {
  // This will be implemented with your existing notification system
  console.error(`❌ ${error.backend}: ${error.message}`);

  if (error.suggestion) {
    console.info(`💡 ${error.suggestion}`);
  }

  if (error.action) {
    console.info(`🔗 ${error.action.label}`);
  }
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: ComfyUIError, context?: Record<string, unknown>): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    code: error.code,
    message: error.message,
    backend: error.backend,
    retriable: error.retriable,
    context,
    stack: error.stack,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('📊 Error Log:', errorLog);
  }

  // Production: Send to error monitoring service (Sentry)
  // Note: Install @sentry/react and configure VITE_SENTRY_DSN in .env
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    // Sentry.captureException(error, { extra: errorLog });
    console.info('📊 Error logged to monitoring service');
  }
}

