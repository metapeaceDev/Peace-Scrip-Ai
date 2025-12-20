/**
 * Performance Monitor Service
 * 
 * Tracks and reports performance metrics
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private readonly maxMetrics = 100; // Keep last 100 metrics

  /**
   * Start tracking an operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End tracking and calculate duration
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ No metric found for: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`⏱️ ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata || '');

    // Keep only recent metrics
    if (this.metrics.size > this.maxMetrics) {
      const firstKey = this.metrics.keys().next().value;
      if (firstKey) {
        this.metrics.delete(firstKey);
      }
    }

    return metric.duration;
  }

  /**
   * Measure async operation
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  /**
   * Get average duration for operation type
   */
  getAverage(namePattern: string): number {
    const matching = this.getAllMetrics().filter(m => 
      m.name.includes(namePattern) && m.duration !== undefined
    );

    if (matching.length === 0) return 0;

    const total = matching.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / matching.length;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const all = this.getAllMetrics();
    
    if (all.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0
      };
    }

    const durations = all.map(m => m.duration || 0);

    return {
      count: all.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      slowest: all.reduce((prev, curr) => 
        (curr.duration || 0) > (prev.duration || 0) ? curr : prev
      ).name
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.getAllMetrics(), null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Browser Performance API helpers
export const BrowserPerf = {
  /**
   * Get First Contentful Paint
   */
  getFCP(): number | null {
    const perfEntries = performance.getEntriesByType('paint');
    const fcp = perfEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  },

  /**
   * Get Largest Contentful Paint
   */
  getLCP(): Promise<number> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        resolve(lastEntry.renderTime || lastEntry.loadTime);
        observer.disconnect();
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // Timeout after 10s
      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 10000);
    });
  },

  /**
   * Get Time to Interactive (approximation)
   */
  getTTI(): number {
    return performance.timing.domInteractive - performance.timing.navigationStart;
  },

  /**
   * Get page load time
   */
  getPageLoadTime(): number {
    return performance.timing.loadEventEnd - performance.timing.navigationStart;
  },

  /**
   * Get all performance metrics
   */
  getAllMetrics(): Record<string, number | null> {
    return {
      fcp: BrowserPerf.getFCP(),
      tti: BrowserPerf.getTTI(),
      pageLoad: BrowserPerf.getPageLoadTime(),
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    };
  }
};
