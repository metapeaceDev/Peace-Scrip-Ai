/**
 * Request Cache Service
 *
 * In-memory cache with TTL for API requests
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  /**
   * Set cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    return {
      totalEntries: this.cache.size,
      validEntries: entries.filter(([_, entry]) => now - entry.timestamp <= entry.ttl).length,
      expiredEntries: entries.filter(([_, entry]) => now - entry.timestamp > entry.ttl).length,
      totalSize: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Wrap async function with caching
   */
  async cached<T>(key: string, fn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    console.log(`⚡ Cache MISS: ${key} - fetching...`);
    const data = await fn();

    // Store in cache
    this.set(key, data, ttl);

    return data;
  }
}

// Singleton instance
export const requestCache = new RequestCache();

// Auto cleanup every 5 minutes
setInterval(
  () => {
    requestCache.cleanup();
  },
  5 * 60 * 1000
);

export default requestCache;

/**
 * Cache key generators for common use cases
 */
export const CacheKeys = {
  systemResources: () => 'system:resources',
  comfyUIHealth: () => 'comfyui:health',
  deviceDetection: () => 'device:detection',
  videoGeneration: (shotId: string) => `video:${shotId}`,
  sceneGeneration: (sceneId: string) => `scene:${sceneId}`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  modelList: () => 'models:list',
};

/**
 * Cache TTL presets (in milliseconds)
 */
export const CacheTTL = {
  short: 30 * 1000, // 30 seconds
  medium: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
  hour: 60 * 60 * 1000, // 1 hour
  day: 24 * 60 * 60 * 1000, // 24 hours
};
