/**
 * Connection Pool Service
 * 
 * Manages persistent connections to backends
 * Reduces connection overhead and improves performance
 */

interface PooledConnection {
  url: string;
  lastUsed: number;
  useCount: number;
  controller: AbortController;
}

class ConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval = 60 * 1000; // 1 minute

  constructor() {
    // Auto cleanup idle connections
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Get or create connection for URL
   */
  getConnection(url: string): AbortController {
    const existing = this.connections.get(url);
    const now = Date.now();

    // Reuse existing connection if fresh
    if (existing && (now - existing.lastUsed) < this.maxIdleTime) {
      existing.lastUsed = now;
      existing.useCount++;
      console.log(`🔗 Reusing connection to ${url} (used ${existing.useCount} times)`);
      return existing.controller;
    }

    // Create new connection
    const controller = new AbortController();
    this.connections.set(url, {
      url,
      lastUsed: now,
      useCount: 1,
      controller
    });

    console.log(`🆕 New connection to ${url}`);
    return controller;
  }

  /**
   * Release connection (keep in pool)
   */
  releaseConnection(url: string): void {
    const conn = this.connections.get(url);
    if (conn) {
      conn.lastUsed = Date.now();
    }
  }

  /**
   * Close specific connection
   */
  closeConnection(url: string): void {
    const conn = this.connections.get(url);
    if (conn) {
      conn.controller.abort();
      this.connections.delete(url);
      console.log(`❌ Closed connection to ${url}`);
    }
  }

  /**
   * Cleanup idle connections
   */
  private cleanup(): void {
    const now = Date.now();
    let closed = 0;

    for (const [url, conn] of this.connections.entries()) {
      if (now - conn.lastUsed > this.maxIdleTime) {
        conn.controller.abort();
        this.connections.delete(url);
        closed++;
      }
    }

    if (closed > 0) {
      console.log(`🧹 Closed ${closed} idle connections`);
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const conn of this.connections.values()) {
      conn.controller.abort();
    }
    this.connections.clear();
    console.log('❌ Closed all connections');
  }

  /**
   * Get pool stats
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      totalRequests: Array.from(this.connections.values())
        .reduce((sum, conn) => sum + conn.useCount, 0)
    };
  }
}

// Singleton instance
export const connectionPool = new ConnectionPool();

export default connectionPool;

/**
 * Fetch wrapper with connection pooling
 */
export async function pooledFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = connectionPool.getConnection(url);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    connectionPool.releaseConnection(url);
    return response;

  } catch (error) {
    // Don't close connection on error - might be temporary
    connectionPool.releaseConnection(url);
    throw error;
  }
}
