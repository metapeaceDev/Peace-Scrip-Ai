/**
 * Feature Flags for Gradual Rollout
 * Enable/disable features without code changes
 * 
 * Supports:
 * - Global feature flags
 * - Beta user allowlist  
 * - Gradual rollout by percentage
 * 
 * Usage:
 *   import { isFeatureEnabled } from './config/featureFlags';
 *   if (isFeatureEnabled('JAVANA_DECISION_ENGINE', userId)) { ... }
 */

import { logger } from '../utils/logger';

export const FEATURE_FLAGS = {
  // Phase 1: Core Psychology Enhancements
  JAVANA_DECISION_ENGINE: false as boolean,
  PARAMI_SYNERGY_MATRIX: false as boolean,
  ADVANCED_ANUSAYA_TRACKING: false as boolean,
  CITTA_VITHI_GENERATOR: false as boolean,

  // Phase 2: UI Enhancements
  KAMMA_TIMELINE_VIEW: false as boolean,
  PSYCHOLOGY_DASHBOARD: false as boolean,
  PARAMI_VISUALIZATION: false as boolean,

  // Phase 3: Advanced UI Components (New!)
  CITTA_MOMENT_VISUALIZATION: false as boolean,
  ANUSAYA_STRENGTH_DISPLAY: false as boolean,
  KARMA_TIMELINE_VIEW: false as boolean,
  PSYCHOLOGY_DASHBOARD_V2: false as boolean,

  // Phase 4: Advanced Features
  KAMMA_VIPAKA_EXPLORER: false as boolean,
  SIMULATION_SYSTEM: false as boolean,
  DREAM_ENGINE: false as boolean,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Beta users who get early access to all features
 * Add user IDs here to enable features for specific users
 */
const BETA_USER_IDS: string[] = [
  // Example: 'user-12345',
  // Add beta user IDs from Firebase Auth
];

/**
 * Rollout percentage (0-100)
 * Controls what percentage of users get access to features
 * Can be set via environment variable: VITE_FEATURE_ROLLOUT_PERCENTAGE
 */
const ROLLOUT_PERCENTAGE = parseInt(
  import.meta.env.VITE_FEATURE_ROLLOUT_PERCENTAGE || '0',
  10
);

/**
 * Simple hash function for consistent user bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if user is in rollout percentage
 */
function isUserInRollout(userId: string): boolean {
  if (ROLLOUT_PERCENTAGE === 0) return false;
  if (ROLLOUT_PERCENTAGE >= 100) return true;
  
  const hash = simpleHash(userId);
  return (hash % 100) < ROLLOUT_PERCENTAGE;
}

/**
 * Check if a feature is enabled
 * @param feature - Feature flag name
 * @param userId - Optional user ID for beta testing and gradual rollout
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(feature: FeatureFlag, userId?: string): boolean {
  // Global flag override - if enabled globally, everyone gets it
  if (FEATURE_FLAGS[feature]) {
    return true;
  }
  
  // No user ID provided, use global flag only
  if (!userId) {
    return FEATURE_FLAGS[feature];
  }
  
  // Beta users get all features
  if (BETA_USER_IDS.includes(userId)) {
    return true;
  }
  
  // Check if user is in gradual rollout
  if (ROLLOUT_PERCENTAGE > 0 && isUserInRollout(userId)) {
    return true;
  }
  
  return false;
}

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(
    key => FEATURE_FLAGS[key] === true
  );
}

/**
 * For development: Enable a feature temporarily
 * Only works in development mode
 */
export function enableFeatureForDev(feature: FeatureFlag): void {
  if (import.meta.env.DEV) {
    // Allow mutation in dev mode only
    (FEATURE_FLAGS as Record<FeatureFlag, boolean>)[feature] = true;
    logger.debug(`Enabled ${feature} for development`);
  } else {
    logger.warn(`Cannot enable ${feature} in production`);
  }
}
