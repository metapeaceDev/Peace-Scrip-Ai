/**
 * Logging Utility for Peace Script AI
 *
 * Replaces console.log with structured logging
 * Automatically disabled in production unless explicitly enabled
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Payment failed', { error: err.message });
 *   logger.debug('Request payload', { data });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private enableProductionLogs: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
    this.enableProductionLogs = import.meta.env.VITE_ENABLE_PRODUCTION_LOGS === 'true';
  }

  /**
   * Should we log this message?
   */
  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true;

    // In development, log everything
    if (this.isDevelopment) return true;

    // In production, only log if explicitly enabled
    if (this.isProduction && this.enableProductionLogs) return true;

    // Otherwise, don't log
    return false;
  }

  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  /**
   * Send logs to external service (e.g., Sentry, Firebase)
   */
  private async sendToExternalService(logEntry: LogEntry): Promise<void> {
    // Only send errors to external service in production
    if (this.isProduction && logEntry.level === 'error') {
      try {
        // Send to Firebase Analytics or Sentry
        // Example: Sentry.captureException(new Error(logEntry.message));

        // For now, we'll just use console.error as fallback
        if (typeof window !== 'undefined' && window.console) {
          console.error('[Logger]', logEntry);
        }
      } catch (err) {
        // Silently fail - don't break the app because of logging
      }
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    // const logEntry = this.formatLog('debug', message, context);

    if (this.isDevelopment) {
      console.log(`🔍 [DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    // const logEntry = this.formatLog('info', message, context);

    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, context || '');
    } else if (this.enableProductionLogs) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    // const logEntry = this.formatLog('warn', message, context);

    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context || '');
    } else if (this.enableProductionLogs) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  /**
   * Log error message (always logged)
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const logEntry = this.formatLog('error', message, {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });

    // Always log errors to console
    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${message}`, error, context || '');
    } else {
      console.error(`[ERROR] ${message}`, error, context || '');
    }

    // Send to external service
    this.sendToExternalService(logEntry);
  }

  /**
   * Performance timing
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logs together (development only)
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log table (development only)
   */
  table(data: unknown): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for TypeScript
export type { LogLevel, LogEntry };

