/**
 * Environment Variable Validation
 *
 * This utility validates required environment variables at application startup.
 * It helps catch configuration errors early before they cause runtime issues.
 *
 * Usage:
 * - Import and call validateEnv() at the start of your application
 * - It will throw an error if required variables are missing
 * - It will warn about missing optional variables
 */

import { logger } from './logger';

interface EnvVariable {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  validationError?: string;
}

/**
 * Environment variable configuration
 * Add new environment variables here as your app grows
 */
const ENV_VARIABLES: EnvVariable[] = [
  // Firebase Configuration (Required for authentication)
  {
    name: 'VITE_FIREBASE_API_KEY',
    required: true,
    description: 'Firebase API Key for authentication',
  },
  {
    name: 'VITE_FIREBASE_AUTH_DOMAIN',
    required: true,
    description: 'Firebase Auth Domain',
  },
  {
    name: 'VITE_FIREBASE_PROJECT_ID',
    required: true,
    description: 'Firebase Project ID',
  },
  {
    name: 'VITE_FIREBASE_STORAGE_BUCKET',
    required: true,
    description: 'Firebase Storage Bucket',
  },
  {
    name: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    required: true,
    description: 'Firebase Messaging Sender ID',
  },
  {
    name: 'VITE_FIREBASE_APP_ID',
    required: true,
    description: 'Firebase App ID',
  },

  // API Configuration (Required)
  {
    name: 'VITE_GEMINI_API_KEY',
    required: true,
    description: 'Google Gemini API Key for AI script generation',
  },

  // Backend API (Required)
  {
    name: 'VITE_API_URL',
    required: true,
    description: 'Backend API URL',
    defaultValue: 'http://localhost:5000',
    validator: value => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    validationError: 'Must be a valid URL',
  },

  // ComfyUI Configuration (Optional)
  {
    name: 'VITE_COMFYUI_URL',
    required: false,
    description: 'ComfyUI API URL for image generation',
    defaultValue: 'http://127.0.0.1:8188',
  },

  // Stripe Configuration (Optional for payments)
  {
    name: 'VITE_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe Publishable Key for payment processing',
  },

  // Sentry Configuration (Optional for error tracking)
  {
    name: 'VITE_SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
  },

  // App Configuration (Optional)
  {
    name: 'VITE_APP_VERSION',
    required: false,
    description: 'Application version',
    defaultValue: '1.0.0',
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Validate all environment variables
 * @throws Error if required variables are missing
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  ENV_VARIABLES.forEach(envVar => {
    const value = import.meta.env[envVar.name];

    // Check if variable exists
    if (!value || value === '') {
      if (envVar.required) {
        missingRequired.push(envVar.name);
        errors.push(
          `❌ Missing required environment variable: ${envVar.name}\n   Description: ${envVar.description}${envVar.defaultValue ? `\n   Default: ${envVar.defaultValue}` : ''}`
        );
      } else {
        missingOptional.push(envVar.name);
        warnings.push(
          `⚠️  Missing optional environment variable: ${envVar.name}\n   Description: ${envVar.description}${envVar.defaultValue ? `\n   Using default: ${envVar.defaultValue}` : ''}`
        );
      }
      return;
    }

    // Validate value if validator is provided
    if (envVar.validator && !envVar.validator(value)) {
      const errorMsg = `❌ Invalid value for ${envVar.name}: ${envVar.validationError || 'Validation failed'}\n   Current value: ${value}`;

      if (envVar.required) {
        errors.push(errorMsg);
      } else {
        warnings.push(errorMsg);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingRequired,
    missingOptional,
  };
}

/**
 * Log validation results to console
 */
export function logValidationResults(result: ValidationResult): void {
  logger.info('🔍 Environment Variable Validation');

  if (result.valid) {
    logger.info('✅ All required environment variables are configured correctly!');
  } else {
    logger.error('❌ Environment validation failed!');
    logger.error('Validation Errors', { errors: result.errors });
  }

  if (result.warnings.length > 0) {
    logger.warn('Validation Warnings', { warnings: result.warnings });
  }

  // Summary
  const totalVars = ENV_VARIABLES.length;
  const configuredVars = totalVars - result.missingRequired.length - result.missingOptional.length;

  logger.info('📊 Validation Summary', { configured: configuredVars, total: totalVars });

  if (result.missingRequired.length > 0) {
    logger.error('Missing Required Variables', { missing: result.missingRequired });
  }

  if (result.missingOptional.length > 0) {
    logger.warn('Missing Optional Variables', { missing: result.missingOptional });
  }

  console.groupEnd();
}

/**
 * Validate environment and throw error if invalid
 * Use this at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();
  logValidationResults(result);

  if (!result.valid) {
    throw new Error(
      `Environment validation failed. Missing required variables:\n${result.missingRequired.join(', ')}\n\nPlease check your .env file.`
    );
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  if (!value && fallback !== undefined) {
    return fallback;
  }
  return value || '';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return import.meta.env.MODE === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return import.meta.env.MODE === 'development';
}

/**
 * Get current environment
 */
export function getEnvironment(): string {
  return import.meta.env.MODE;
}

