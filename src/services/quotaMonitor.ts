/**
 * Quota Monitor Service
 *
 * Tracks API usage for Gemini APIs to prevent quota exhaustion
 * Provides warnings and suggestions before hitting limits
 */

interface QuotaTracker {
  requests: number[];
  lastReset: number;
}

const QUOTA_LIMITS = {
  'gemini-2.5': 10, // requests per minute
  'gemini-2.0': 10, // requests per minute
  window: 60000, // 1 minute in milliseconds
};

// In-memory storage (resets on page reload)
const quotaTrackers: Record<string, QuotaTracker> = {
  'gemini-2.5': { requests: [], lastReset: Date.now() },
  'gemini-2.0': { requests: [], lastReset: Date.now() },
};

/**
 * Record an API request
 */
export function recordRequest(model: 'gemini-2.5' | 'gemini-2.0'): void {
  const tracker = quotaTrackers[model];
  const now = Date.now();

  // Clean up requests older than 1 minute
  tracker.requests = tracker.requests.filter(timestamp => now - timestamp < QUOTA_LIMITS.window);

  // Add new request
  tracker.requests.push(now);

  // Note: This only tracks requests from this session, not global quota
  console.log(
    `📊 ${model} - Requests this session: ${tracker.requests.length}/${QUOTA_LIMITS[model]} (Note: May have quota from previous usage)`
  );
}

/**
 * Check if we're approaching quota limit
 */
export function checkQuotaStatus(model: 'gemini-2.5' | 'gemini-2.0'): {
  available: number;
  used: number;
  limit: number;
  percentage: number;
  warning: string | null;
} {
  const tracker = quotaTrackers[model];
  const now = Date.now();

  // Clean up old requests
  tracker.requests = tracker.requests.filter(timestamp => now - timestamp < QUOTA_LIMITS.window);

  const used = tracker.requests.length;
  const limit = QUOTA_LIMITS[model];
  const available = limit - used;
  const percentage = (used / limit) * 100;

  let warning: string | null = null;

  if (percentage >= 90) {
    const resetIn = Math.ceil((QUOTA_LIMITS.window - (now - tracker.requests[0])) / 1000);
    warning = `⚠️ ${model} quota at ${percentage.toFixed(0)}%! Quota resets in ${resetIn}s. Consider enabling ComfyUI.`;
  } else if (percentage >= 70) {
    warning = `⚡ ${model} quota at ${percentage.toFixed(0)}%. Approaching limit.`;
  }

  return { available, used, limit, percentage, warning };
}

/**
 * Get time until quota reset
 */
export function getTimeUntilReset(model: 'gemini-2.5' | 'gemini-2.0'): number {
  const tracker = quotaTrackers[model];
  if (tracker.requests.length === 0) return 0;

  const oldestRequest = tracker.requests[0];
  const resetTime = oldestRequest + QUOTA_LIMITS.window;
  const now = Date.now();

  return Math.max(0, Math.ceil((resetTime - now) / 1000)); // seconds
}

/**
 * Check if we should warn user before making a request
 */
export function shouldWarnBeforeRequest(model: 'gemini-2.5' | 'gemini-2.0'): boolean {
  const status = checkQuotaStatus(model);
  return status.percentage >= 80; // Warn at 80% usage
}

/**
 * Get quota summary for all models
 */
export function getQuotaSummary(): string {
  const gem25 = checkQuotaStatus('gemini-2.5');
  const gem20 = checkQuotaStatus('gemini-2.0');

  return `
📊 API Quota Status:
  Gemini 2.5: ${gem25.used}/${gem25.limit} (${gem25.percentage.toFixed(0)}%)
  Gemini 2.0: ${gem20.used}/${gem20.limit} (${gem20.percentage.toFixed(0)}%)
  
💡 Enable ComfyUI for unlimited generation!
  `.trim();
}

/**
 * Reset quota trackers (for testing)
 */
export function resetQuotas(): void {
  quotaTrackers['gemini-2.5'].requests = [];
  quotaTrackers['gemini-2.0'].requests = [];
  console.log('✅ Quota trackers reset');
}

