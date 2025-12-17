/**
 * QuotaMonitor Service Tests
 * Tests for API quota tracking and rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('quotaMonitor - Function Exports', () => {
  it('should export recordRequest', async () => {
    const module = await import('../quotaMonitor');
    expect(typeof module.recordRequest).toBe('function');
  });

  it('should export checkQuotaStatus', async () => {
    const module = await import('../quotaMonitor');
    expect(typeof module.checkQuotaStatus).toBe('function');
  });

  it('should export shouldWarnBeforeRequest', async () => {
    const module = await import('../quotaMonitor');
    expect(typeof module.shouldWarnBeforeRequest).toBe('function');
  });

  it('should export resetQuotas', async () => {
    const module = await import('../quotaMonitor');
    expect(typeof module.resetQuotas).toBe('function');
  });
});

describe('quotaMonitor - Request Recording', () => {
  it('should record gemini-2.5 requests', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.5');

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.used).toBe(1);
  });

  it('should record gemini-2.0 requests', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.0');

    const status = checkQuotaStatus('gemini-2.0');
    expect(status.used).toBe(1);
  });

  it('should track multiple requests', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.used).toBe(3);
  });
});

describe('quotaMonitor - Quota Status', () => {
  it('should return available quota', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.5');

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.available).toBe(status.limit - status.used);
  });

  it('should calculate percentage used', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5'); // 5 requests

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.percentage).toBe(50); // 5/10 = 50%
  });

  it('should have limit property', async () => {
    const { checkQuotaStatus } = await import('../quotaMonitor');

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.limit).toBe(10);
  });
});

describe('quotaMonitor - Warnings', () => {
  it('should show warning at 80% usage', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    // Record 8 requests (80%)
    for (let i = 0; i < 8; i++) {
      recordRequest('gemini-2.5');
    }

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.percentage).toBeGreaterThanOrEqual(80);
    expect(status.warning).toBeTruthy();
  });

  it('should show no warning below 80%', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.percentage).toBeLessThan(80);
    expect(status.warning).toBeNull();
  });
});

describe('quotaMonitor - Wait Recommendations', () => {
  it('should recommend waiting when quota full', async () => {
    const { recordRequest, shouldWarnBeforeRequest, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    // Fill quota (10 requests)
    for (let i = 0; i < 10; i++) {
      recordRequest('gemini-2.5');
    }

    const shouldWarn = shouldWarnBeforeRequest('gemini-2.5');
    expect(shouldWarn).toBeTruthy();
  });

  it('should not recommend waiting when quota available', async () => {
    const { shouldWarnBeforeRequest, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();

    const shouldWarn = shouldWarnBeforeRequest('gemini-2.5');
    expect(shouldWarn).toBeFalsy();
  });
});

describe('quotaMonitor - Reset Functionality', () => {
  it('should reset gemini-2.5 quota', async () => {
    const { recordRequest, resetQuotas, checkQuotaStatus } = await import('../quotaMonitor');

    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    resetQuotas();

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.used).toBe(0);
  });

  it('should reset gemini-2.0 quota', async () => {
    const { recordRequest, resetQuotas, checkQuotaStatus } = await import('../quotaMonitor');

    recordRequest('gemini-2.0');
    recordRequest('gemini-2.0');
    resetQuotas();

    const status = checkQuotaStatus('gemini-2.0');
    expect(status.used).toBe(0);
  });
});

describe('quotaMonitor - Edge Cases', () => {
  it('should handle rapid consecutive requests', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();

    // Record 20 requests rapidly (exceeds limit)
    for (let i = 0; i < 20; i++) {
      recordRequest('gemini-2.5');
    }

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.used).toBeGreaterThan(0);
  });

  it('should handle zero requests', async () => {
    const { checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();

    const status = checkQuotaStatus('gemini-2.5');
    expect(status.used).toBe(0);
    expect(status.available).toBe(status.limit);
  });

  it('should track independent quotas for different models', async () => {
    const { recordRequest, checkQuotaStatus, resetQuotas } = await import('../quotaMonitor');

    resetQuotas();
    resetQuotas();

    recordRequest('gemini-2.5');
    recordRequest('gemini-2.5');
    recordRequest('gemini-2.0');

    const status25 = checkQuotaStatus('gemini-2.5');
    const status20 = checkQuotaStatus('gemini-2.0');

    expect(status25.used).toBe(2);
    expect(status20.used).toBe(1);
  });
});
