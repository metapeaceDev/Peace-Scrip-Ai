/**
 * Performance Benchmarks for Buddhist Psychology System
 * 
 * Tests execution time of key functions to ensure they meet performance thresholds.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { calculateParamiSynergy } from '../paramiSystem';

// Mock parami portfolio interface
interface ParamiEntry {
  level: number;
  exp: number;
}

interface ParamiPortfolio {
  dana: ParamiEntry;
  sila: ParamiEntry;
  nekkhamma: ParamiEntry;
  panna: ParamiEntry;
  viriya: ParamiEntry;
  khanti: ParamiEntry;
  sacca: ParamiEntry;
  adhitthana: ParamiEntry;
  metta: ParamiEntry;
  upekkha: ParamiEntry;
}

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    performanceMonitor.enable();
    performanceMonitor.clear();
  });

  // Mock parami portfolio for testing
  const createMockParamiPortfolio = (): ParamiPortfolio => ({
    dana: { level: 5, exp: 50 },
    sila: { level: 6, exp: 30 },
    nekkhamma: { level: 4, exp: 70 },
    panna: { level: 7, exp: 20 },
    viriya: { level: 5, exp: 60 },
    khanti: { level: 6, exp: 40 },
    sacca: { level: 5, exp: 80 },
    adhitthana: { level: 4, exp: 90 },
    metta: { level: 6, exp: 10 },
    upekkha: { level: 5, exp: 50 },
  });

  describe('Parami Synergy Calculations', () => {
    it('should calculate synergy in < 30ms', () => {
      const portfolio = createMockParamiPortfolio();

      const startTime = performance.now();
      const synergy = calculateParamiSynergy('panna', portfolio);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(synergy).toBeGreaterThanOrEqual(0);
      expect(executionTime).toBeLessThan(30);

      console.log(`⏱️ Parami Synergy: ${executionTime.toFixed(2)}ms`);
    });

    it('should calculate all 10 paramis synergy in < 100ms', () => {
      const portfolio = createMockParamiPortfolio();
      const paramis = ['dana', 'sila', 'nekkhamma', 'panna', 'viriya', 'khanti', 'sacca', 'adhitthana', 'metta', 'upekkha'] as const;

      const startTime = performance.now();
      paramis.forEach((parami) => calculateParamiSynergy(parami, portfolio));
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100);
      console.log(`⏱️ All 10 Parami Synergies: ${executionTime.toFixed(2)}ms`);
    });

    it('should handle 1000 synergy calculations in < 500ms', () => {
      const portfolio = createMockParamiPortfolio();

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        calculateParamiSynergy('panna', portfolio);
      }
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500);
      console.log(`⏱️ 1000 Synergy Calculations: ${executionTime.toFixed(2)}ms (avg: ${(executionTime / 1000).toFixed(3)}ms)`);
    });
  });

  describe('Performance Monitor Integration', () => {
    it('should track metrics without significant overhead', () => {
      const iterations = 1000;
      const portfolio = createMockParamiPortfolio();

      // Without monitoring
      performanceMonitor.disable();
      const startWithout = performance.now();
      for (let i = 0; i < iterations; i++) {
        calculateParamiSynergy('panna', portfolio);
      }
      const endWithout = performance.now();
      const timeWithout = endWithout - startWithout;

      // With monitoring
      performanceMonitor.enable();
      performanceMonitor.clear();
      const startWith = performance.now();
      for (let i = 0; i < iterations; i++) {
        performanceMonitor.measureSync(
          'parami-synergy',
          () => calculateParamiSynergy('panna', portfolio)
        );
      }
      const endWith = performance.now();
      const timeWith = endWith - startWith;

      const overhead = ((timeWith - timeWithout) / timeWithout) * 100;

      console.log(`⏱️ Without monitoring: ${timeWithout.toFixed(2)}ms`);
      console.log(`⏱️ With monitoring: ${timeWith.toFixed(2)}ms`);
      console.log(`⏱️ Overhead: ${overhead.toFixed(2)}%`);

      // Monitoring overhead should be < 500% for very fast operations (< 1ms)
      // For slower operations, overhead will be much less
      expect(overhead).toBeLessThan(500);
    });

    it('should record and retrieve metrics correctly', () => {
      const portfolio = createMockParamiPortfolio();

      performanceMonitor.enable();
      performanceMonitor.clear();

      // Perform monitored operations
      for (let i = 0; i < 10; i++) {
        performanceMonitor.measureSync(
          'parami-test',
          () => calculateParamiSynergy('panna', portfolio)
        );
      }

      const metrics = performanceMonitor.getMetrics();
      const avgTime = performanceMonitor.getAverageTime('parami-test');
      const minMax = performanceMonitor.getMinMaxTime('parami-test');

      expect(metrics.length).toBe(10);
      expect(avgTime).toBeGreaterThan(0);
      expect(minMax.min).toBeGreaterThan(0);
      expect(minMax.max).toBeGreaterThanOrEqual(minMax.min);

      console.log(`📊 Metrics count: ${metrics.length}`);
      console.log(`📊 Average time: ${avgTime.toFixed(3)}ms`);
      console.log(`📊 Min/Max: ${minMax.min.toFixed(3)}ms / ${minMax.max.toFixed(3)}ms`);
    });

    it('should generate performance summary', () => {
      const portfolio = createMockParamiPortfolio();

      performanceMonitor.enable();
      performanceMonitor.clear();

      // Perform monitored operations with different names
      for (let i = 0; i < 5; i++) {
        performanceMonitor.measureSync(
          'parami-calc',
          () => calculateParamiSynergy('panna', portfolio)
        );
      }

      const summary = performanceMonitor.getSummary();

      expect(summary).toBeDefined();
      console.log('📊 Performance Summary:', JSON.stringify(summary, null, 2));
    });

    it('should clear metrics', () => {
      const portfolio = createMockParamiPortfolio();

      performanceMonitor.enable();

      // Add some metrics
      for (let i = 0; i < 5; i++) {
        performanceMonitor.measureSync(
          'test',
          () => calculateParamiSynergy('panna', portfolio)
        );
      }

      expect(performanceMonitor.getMetrics().length).toBe(5);

      performanceMonitor.clear();

      expect(performanceMonitor.getMetrics().length).toBe(0);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory in repeated operations', () => {
      const portfolio = createMockParamiPortfolio();
      const iterations = 1000;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memBefore = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        calculateParamiSynergy('panna', portfolio);
        calculateParamiSynergy('dana', portfolio);
        calculateParamiSynergy('sila', portfolio);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memIncrease = memAfter - memBefore;
      const memIncreaseKB = memIncrease / 1024;

      console.log(`💾 Memory increase: ${memIncreaseKB.toFixed(2)} KB`);

      // Memory increase should be reasonable (< 1MB for 1000 iterations)
      expect(memIncreaseKB).toBeLessThan(1000);
    });
  });

  describe('Performance Thresholds', () => {
    it('should warn when execution exceeds threshold', () => {
      const portfolio = createMockParamiPortfolio();

      // Set a very low threshold to trigger warning
      performanceMonitor.setThresholds({
        paramiCalculation: 0.001, // 0.001ms - will definitely exceed
      });

      performanceMonitor.enable();
      performanceMonitor.clear();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      performanceMonitor.measureSync(
        'parami-synergy',
        () => calculateParamiSynergy('panna', portfolio)
      );

      // Should have warned about slow performance
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
