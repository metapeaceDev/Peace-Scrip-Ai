/**
 * Performance Monitor for Buddhist Psychology System
 * 
 * Tracks execution time and memory usage of:
 * - Javana Decision Engine
 * - Parami Synergy Calculations
 * - Anusaya Tracking
 * - Psychology Evolution
 * 
 * @module performanceMonitor
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PerformanceMetric {
  name: string;
  executionTime: number; // milliseconds
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  javanaDecision: number; // ms
  paramiCalculation: number; // ms
  anusayaTracking: number; // ms
  psychologyUpdate: number; // ms
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics
  private enabled = false;

  private thresholds: PerformanceThresholds = {
    javanaDecision: 50, // Should complete in < 50ms
    paramiCalculation: 30, // Should complete in < 30ms
    anusayaTracking: 20, // Should complete in < 20ms
    psychologyUpdate: 100, // Should complete in < 100ms
  };

  /**
   * Enable performance monitoring (dev mode only)
   */
  enable(): void {
    this.enabled = true;
    console.log('🔍 Performance monitoring enabled');
  }

  /**
   * Disable performance monitoring
   */
  disable(): void {
    this.enabled = false;
    this.metrics = [];
    console.log('🔍 Performance monitoring disabled');
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;

    try {
      const result = await fn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        executionTime,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          memoryDelta:
            startMemory && (performance as any).memory?.usedJSHeapSize
              ? (performance as any).memory.usedJSHeapSize - startMemory
              : undefined,
        },
      };

      this.recordMetric(metric);
      this.checkThreshold(metric);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      this.recordMetric({
        name: `${name} (error)`,
        executionTime,
        timestamp: Date.now(),
        metadata: { ...metadata, error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Measure synchronous function
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;

    try {
      const result = fn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        executionTime,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          memoryDelta:
            startMemory && (performance as any).memory?.usedJSHeapSize
              ? (performance as any).memory.usedJSHeapSize - startMemory
              : undefined,
        },
      };

      this.recordMetric(metric);
      this.checkThreshold(metric);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      this.recordMetric({
        name: `${name} (error)`,
        executionTime,
        timestamp: Date.now(),
        metadata: { ...metadata, error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Check if execution time exceeds threshold
   */
  private checkThreshold(metric: PerformanceMetric): void {
    let threshold = 0;
    let category = '';

    if (metric.name.includes('javana')) {
      threshold = this.thresholds.javanaDecision;
      category = 'Javana Decision';
    } else if (metric.name.includes('parami')) {
      threshold = this.thresholds.paramiCalculation;
      category = 'Parami Calculation';
    } else if (metric.name.includes('anusaya')) {
      threshold = this.thresholds.anusayaTracking;
      category = 'Anusaya Tracking';
    } else if (metric.name.includes('psychology')) {
      threshold = this.thresholds.psychologyUpdate;
      category = 'Psychology Update';
    }

    if (threshold > 0 && metric.executionTime > threshold) {
      console.warn(
        `⚠️ ${category} slow: ${metric.executionTime.toFixed(2)}ms (threshold: ${threshold}ms)`,
        metric
      );
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByName(pattern: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name.includes(pattern));
  }

  /**
   * Get average execution time for a metric
   */
  getAverageTime(pattern: string): number {
    const metrics = this.getMetricsByName(pattern);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.executionTime, 0);
    return total / metrics.length;
  }

  /**
   * Get min/max execution times
   */
  getMinMaxTime(pattern: string): { min: number; max: number } {
    const metrics = this.getMetricsByName(pattern);
    if (metrics.length === 0) return { min: 0, max: 0 };

    const times = metrics.map((m) => m.executionTime);
    return {
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, any> {
    const categories = [
      'javana',
      'parami',
      'anusaya',
      'psychology',
    ];

    const summary: Record<string, any> = {};

    for (const category of categories) {
      const metrics = this.getMetricsByName(category);
      if (metrics.length === 0) continue;

      const times = metrics.map((m) => m.executionTime);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;

      summary[category] = {
        count: metrics.length,
        avgTime: Number(avg.toFixed(2)),
        minTime: Number(Math.min(...times).toFixed(2)),
        maxTime: Number(Math.max(...times).toFixed(2)),
        threshold: this.thresholds[`${category}Decision` as keyof PerformanceThresholds] ||
                   this.thresholds[`${category}Calculation` as keyof PerformanceThresholds] ||
                   this.thresholds[`${category}Tracking` as keyof PerformanceThresholds] ||
                   this.thresholds[`${category}Update` as keyof PerformanceThresholds] ||
                   0,
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    console.log('🔍 Performance metrics cleared');
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('🔍 Performance thresholds updated', this.thresholds);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
        timestamp: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    if (!this.enabled) {
      console.log('🔍 Performance monitoring is disabled');
      return;
    }

    console.group('📊 Performance Report');
    console.log('Total metrics:', this.metrics.length);
    console.table(this.getSummary());
    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Development helper
if (import.meta.env.DEV) {
  (window as any).performanceMonitor = performanceMonitor;
}

/**
 * Decorator for measuring method performance
 * 
 * @example
 * class MyService {
 *   @measured('myMethod')
 *   myMethod() { ... }
 * }
 */
export function measured(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureSync(
        name || `${target.constructor.name}.${propertyKey}`,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
