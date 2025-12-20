# Peace Script AI - API Documentation

**Complete Reference for All Services, Components, and Hooks**

---

## 📚 Table of Contents

1. [Core Services](#core-services)
2. [React Components](#react-components)
3. [React Hooks](#react-hooks)
4. [Utilities](#utilities)
5. [Type Definitions](#type-definitions)
6. [Examples](#examples)

---

## Core Services

### requestCache

**Purpose**: In-memory caching with TTL for API requests

**Location**: `src/services/requestCache.ts`

#### API Reference

##### `requestCache.get<T>(key: string): T | undefined`

Retrieve cached data by key.

```typescript
const data = requestCache.get<SystemResources>('systemResources');
if (data) {
  console.log('Cache hit:', data);
}
```

**Parameters**:

- `key`: Cache key (string)

**Returns**: Cached data or `undefined` if not found/expired

---

##### `requestCache.set<T>(key: string, data: T, ttl?: number): void`

Store data in cache with expiration.

```typescript
requestCache.set('systemResources', gpuData, 30000); // 30 seconds
```

**Parameters**:

- `key`: Cache key
- `data`: Data to cache (any type)
- `ttl`: Time to live in milliseconds (default: 5 minutes)

---

##### `requestCache.cached<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>`

Wrapper for async functions with automatic caching.

```typescript
const getSystemInfo = async () => {
  return requestCache.cached(
    CacheKeys.systemResources(),
    async () => {
      const response = await fetch('/api/system');
      return response.json();
    },
    CacheTTL.short // 30 seconds
  );
};
```

**Parameters**:

- `key`: Cache key
- `fn`: Async function to execute if cache miss
- `ttl`: Time to live (milliseconds)

**Returns**: Promise resolving to cached or fresh data

**Flow**:

1. Check cache with key
2. If found and not expired → return cached
3. If not found or expired → execute fn
4. Cache result
5. Return result

---

##### `requestCache.clear(pattern?: string): void`

Clear cache entries.

```typescript
// Clear all cache
requestCache.clear();

// Clear specific pattern
requestCache.clear('comfyui_'); // Clears all keys starting with 'comfyui_'
```

**Parameters**:

- `pattern`: Optional regex pattern to match keys

---

##### `requestCache.has(key: string): boolean`

Check if key exists in cache (and not expired).

```typescript
if (requestCache.has('systemResources')) {
  console.log('Data is cached');
}
```

---

##### `requestCache.getStats(): CacheStats`

Get cache statistics.

```typescript
const stats = requestCache.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Total entries: ${stats.size}`);
```

**Returns**:

```typescript
{
  size: number; // Total entries
  hits: number; // Cache hits
  misses: number; // Cache misses
  hitRate: number; // Percentage (0-100)
}
```

---

#### Cache Keys (Constants)

```typescript
export const CacheKeys = {
  systemResources: () => 'system_resources',
  comfyUIHealth: () => 'comfyui_health',
  deviceDetection: () => 'device_detection',
  videoGeneration: (id: string) => `video_generation_${id}`,
  modelList: () => 'model_list',
};
```

#### Cache TTL (Time to Live)

```typescript
export const CacheTTL = {
  short: 30 * 1000, // 30 seconds
  medium: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
  hour: 60 * 60 * 1000, // 1 hour
  day: 24 * 60 * 60 * 1000, // 24 hours
};
```

#### Auto Cleanup

Cache automatically cleans up expired entries every 5 minutes.

---

### connectionPool

**Purpose**: HTTP connection pooling and reuse

**Location**: `src/services/connectionPool.ts`

#### API Reference

##### `getConnection(url: string): PooledConnection | undefined`

Get an existing pooled connection.

```typescript
const conn = getConnection('https://api.example.com');
if (conn) {
  console.log('Reusing connection');
}
```

---

##### `releaseConnection(url: string): void`

Release a connection back to the pool.

```typescript
releaseConnection('https://api.example.com');
```

---

##### `pooledFetch(url: string, options?: RequestInit): Promise<Response>`

**Main API** - Fetch with automatic connection pooling.

```typescript
// Simple GET
const response = await pooledFetch('https://api.example.com/data');
const data = await response.json();

// POST with options
const response = await pooledFetch('https://api.example.com/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Test' }),
});
```

**Parameters**:

- `url`: Request URL
- `options`: Standard Fetch API options

**Returns**: Promise<Response>

**Features**:

- Automatic connection reuse
- AbortController for timeout
- Auto cleanup of idle connections (5 min)
- Reduces connection overhead ~90%

---

##### `closeConnection(url: string): void`

Manually close a connection.

```typescript
closeConnection('https://api.example.com');
```

---

##### `closeAllConnections(): void`

Close all pooled connections.

```typescript
// On app shutdown
closeAllConnections();
```

---

##### `getPoolStats(): PoolStats`

Get connection pool statistics.

```typescript
const stats = getPoolStats();
console.log(`Active connections: ${stats.active}`);
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Reuse rate: ${stats.reuseRate}%`);
```

**Returns**:

```typescript
{
  active: number; // Active connections
  idle: number; // Idle connections
  totalRequests: number; // Total requests made
  reusedConnections: number; // Connections reused
  reuseRate: number; // Percentage (0-100)
}
```

---

#### Connection Lifecycle

```typescript
// 1. First request - creates new connection
await pooledFetch('https://api.example.com/data');

// 2. Second request - reuses connection
await pooledFetch('https://api.example.com/other');

// 3. After 5 minutes of idle - auto cleanup
// Connection removed from pool

// 4. Next request - creates new connection
await pooledFetch('https://api.example.com/data');
```

---

### performanceMonitor

**Purpose**: Track and measure operation performance

**Location**: `src/services/performanceMonitor.ts`

#### API Reference

##### `PerformanceMonitor.start(name: string, metadata?: Record<string, any>): void`

Start timing an operation.

```typescript
PerformanceMonitor.start('videoGeneration', {
  prompt: 'Buddhist monk',
  resolution: '720p',
});
```

---

##### `PerformanceMonitor.end(name: string): number`

End timing and calculate duration.

```typescript
const duration = PerformanceMonitor.end('videoGeneration');
console.log(`Generation took ${duration}ms`);
```

**Returns**: Duration in milliseconds

---

##### `PerformanceMonitor.measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>`

**Main API** - Measure async function execution.

```typescript
const result = await PerformanceMonitor.measure(
  'fetchSystemInfo',
  async () => {
    const response = await fetch('/api/system');
    return response.json();
  },
  { endpoint: '/api/system' }
);

console.log('Result:', result);
// Automatically tracked: duration, success/failure, metadata
```

**Parameters**:

- `name`: Operation name
- `fn`: Async function to measure
- `metadata`: Optional context data

**Returns**: Promise resolving to function result

**Auto-tracked**:

- Duration (ms)
- Success/failure status
- Error details (if failed)
- Timestamp
- Metadata

---

##### `PerformanceMonitor.getMetric(name: string): PerformanceMetric | undefined`

Get latest metric for an operation.

```typescript
const metric = PerformanceMonitor.getMetric('videoGeneration');
if (metric) {
  console.log(`Last duration: ${metric.duration}ms`);
  console.log(`Metadata:`, metric.metadata);
}
```

**Returns**:

```typescript
{
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
}
```

---

##### `PerformanceMonitor.getAllMetrics(): PerformanceMetric[]`

Get all tracked metrics.

```typescript
const allMetrics = PerformanceMonitor.getAllMetrics();
console.log(`Total operations tracked: ${allMetrics.length}`);
```

---

##### `PerformanceMonitor.getAverage(namePattern: string): number | null`

Calculate average duration for operations matching pattern.

```typescript
// Average of all video generations
const avg = PerformanceMonitor.getAverage('videoGeneration');
console.log(`Average video generation: ${avg}ms`);

// Pattern matching
const apiAvg = PerformanceMonitor.getAverage('api_.*'); // All API calls
```

---

##### `PerformanceMonitor.getSummary(): PerformanceSummary`

Get comprehensive performance summary.

```typescript
const summary = PerformanceMonitor.getSummary();
console.log('Performance Summary:', summary);
```

**Returns**:

```typescript
{
  totalOperations: number;
  successRate: number; // Percentage
  failureRate: number; // Percentage
  averageDuration: number; // ms
  slowestOperation: {
    name: string;
    duration: number;
  }
  fastestOperation: {
    name: string;
    duration: number;
  }
  operationsByName: Map<
    string,
    {
      count: number;
      averageDuration: number;
      successRate: number;
    }
  >;
}
```

---

##### `PerformanceMonitor.clear(namePattern?: string): void`

Clear metrics.

```typescript
// Clear all
PerformanceMonitor.clear();

// Clear specific pattern
PerformanceMonitor.clear('videoGeneration');
```

---

##### `PerformanceMonitor.exportMetrics(): string`

Export metrics as JSON string.

```typescript
const json = PerformanceMonitor.exportMetrics();
// Save to file or send to analytics service
localStorage.setItem('performanceMetrics', json);
```

---

#### Browser Performance API

##### `BrowserPerf.getFCP(): number | null`

Get First Contentful Paint time.

```typescript
const fcp = BrowserPerf.getFCP();
console.log(`FCP: ${fcp}ms`);
```

---

##### `BrowserPerf.getLCP(): number | null`

Get Largest Contentful Paint time.

```typescript
const lcp = BrowserPerf.getLCP();
console.log(`LCP: ${lcp}ms`);
```

---

##### `BrowserPerf.getTTI(): number | null`

Get Time to Interactive.

```typescript
const tti = BrowserPerf.getTTI();
console.log(`TTI: ${tti}ms`);
```

---

##### `BrowserPerf.getPageLoadTime(): number | null`

Get total page load time.

```typescript
const loadTime = BrowserPerf.getPageLoadTime();
console.log(`Page loaded in ${loadTime}ms`);
```

---

##### `BrowserPerf.getAllMetrics(): BrowserMetrics`

Get all browser performance metrics.

```typescript
const metrics = BrowserPerf.getAllMetrics();
console.log('Browser Metrics:', {
  FCP: metrics.fcp,
  LCP: metrics.lcp,
  TTI: metrics.tti,
  pageLoad: metrics.pageLoadTime,
});
```

---

### deviceManager

**Purpose**: System resource and GPU detection

**Location**: `src/services/deviceManager.ts`

#### API Reference

##### `detectSystemResources(): Promise<SystemResources>`

Detect GPU, CPU, memory with automatic caching (30s TTL).

```typescript
const resources = await detectSystemResources();
console.log('Device:', resources.device);
console.log('GPU:', resources.gpu);
console.log('Memory:', `${resources.memory}GB`);
```

**Returns**:

```typescript
{
  device: 'cuda' | 'mps' | 'directml' | 'cpu';
  gpu: string;          // GPU name
  memory: number;       // Total RAM in GB
  vram?: number;        // GPU VRAM in GB
  cpuCores: number;
  platform: string;     // OS name
}
```

**Caching**: Auto-cached for 30 seconds to reduce overhead.

---

##### `checkComfyUIHealth(url: string): Promise<HealthStatus>`

Check if ComfyUI backend is healthy.

```typescript
const health = await checkComfyUIHealth('http://localhost:8188');
if (health.status === 'healthy') {
  console.log('ComfyUI is running');
  console.log('Queue size:', health.queueSize);
}
```

**Returns**:

```typescript
{
  status: 'healthy' | 'unhealthy' | 'unknown';
  queueSize?: number;
  activeGenerations?: number;
  responseTime?: number; // ms
  error?: string;
}
```

---

##### `getRecommendedBackend(resources: SystemResources): BackendType`

Get AI-recommended backend based on system.

```typescript
const resources = await detectSystemResources();
const backend = getRecommendedBackend(resources);
console.log(`Recommended: ${backend}`);
```

**Returns**: `'local' | 'cloud' | 'replicate' | 'gemini'`

**Logic**:

- CUDA with 8+ GB VRAM → Local
- MPS (Apple Silicon) → Local
- No GPU or <6 GB VRAM → Gemini or Cloud
- DirectML → Cloud (experimental local)

---

### errorHandler

**Purpose**: Centralized error handling with retries

**Location**: `src/services/errorHandler.ts`

#### API Reference

##### `handleError(error: any, context?: ErrorContext): ErrorResponse`

Process and categorize errors.

```typescript
try {
  await fetch('/api/data');
} catch (error) {
  const handled = handleError(error, {
    operation: 'fetchData',
    userMessage: 'Failed to load data',
    retryable: true,
  });

  console.error(handled.message);
  if (handled.retryable) {
    // Show retry button
  }
}
```

**Parameters**:

- `error`: Error object
- `context`: Optional error context

**Returns**:

```typescript
{
  type: 'network' | 'validation' | 'comfyui' | 'api' | 'unknown';
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError: any;
}
```

---

##### `retryOperation<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`

Retry an async operation with exponential backoff.

```typescript
const data = await retryOperation(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API error');
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}:`, error.message);
    },
  }
);
```

**Parameters**:

- `fn`: Async function to retry
- `options`: Retry configuration

**Options**:

```typescript
{
  maxRetries?: number;      // Default: 3
  initialDelay?: number;    // Default: 1000ms
  maxDelay?: number;        // Default: 10000ms
  backoffMultiplier?: number; // Default: 2
  onRetry?: (attempt: number, error: Error) => void;
}
```

**Backoff**: Exponential (1s → 2s → 4s → 8s)

---

## React Components

### LoadingFallback

**Purpose**: Loading UI for lazy-loaded components

**Location**: `src/components/LoadingFallback.tsx`

```typescript
import { LoadingFallback } from '@/components/LoadingFallback';

<Suspense fallback={<LoadingFallback message="Loading settings..." />}>
  <ComfyUISettings />
</Suspense>
```

**Props**:

```typescript
{
  message?: string; // Default: "Loading..."
}
```

---

### GPUStatus

**Purpose**: Display GPU info and backend selection

**Location**: `src/components/GPUStatus.tsx`

```typescript
import { GPUStatus } from '@/components/GPUStatus';

<GPUStatus />
```

**Features**:

- Real-time device detection
- Backend status badge
- Quick backend switching
- System recommendations

**No props** - fully self-contained

---

### SystemHealthDashboard

**Purpose**: Comprehensive system monitoring

**Location**: `src/components/SystemHealthDashboard.tsx`

```typescript
import { SystemHealthDashboard } from '@/components/SystemHealthDashboard';

<SystemHealthDashboard />
```

**Features**:

- CPU/Memory/GPU usage
- ComfyUI health
- Performance metrics
- Real-time updates (every 5s)

**Props**:

```typescript
{
  refreshInterval?: number; // ms, default: 5000
}
```

---

### CostCalculator

**Purpose**: Compare backend costs

**Location**: `src/components/CostCalculator.tsx`

```typescript
import { CostCalculator } from '@/components/CostCalculator';

<CostCalculator />
```

**Features**:

- Monthly cost projections
- Backend comparison
- ROI calculation
- Interactive budget planner

**Props**: None

---

### ComfyUISettings

**Purpose**: ComfyUI configuration panel

**Location**: `src/components/ComfyUISettings.tsx` (lazy loaded)

```typescript
import { ComfyUISettings } from '@/lazyComponents';

<Suspense fallback={<LoadingFallback />}>
  <ComfyUISettings />
</Suspense>
```

**Features**:

- 4 tabs: Overview, Backend, Cost, Advanced
- Device detection
- Backend configuration
- Cost analysis
- Debug mode

**Props**: None

---

## React Hooks

### useDeviceDetection

**Purpose**: Real-time GPU and system detection

**Location**: `src/hooks/useDeviceDetection.ts`

```typescript
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

function MyComponent() {
  const { device, gpu, isLoading, error, refresh } = useDeviceDetection();

  if (isLoading) return <LoadingFallback />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Device: {device}</p>
      <p>GPU: {gpu}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

**Returns**:

```typescript
{
  device: 'cuda' | 'mps' | 'directml' | 'cpu';
  gpu: string;
  memory: number;       // GB
  vram?: number;        // GB
  cpuCores: number;
  platform: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Features**:

- Auto-detects on mount
- Cached results (30s)
- Manual refresh
- Error handling

---

### usePerformanceTracking

**Purpose**: Track component performance

**Location**: `src/hooks/usePerformanceTracking.ts`

```typescript
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';

function VideoGenerator() {
  const { measureAsync, getMetrics } = usePerformanceTracking('VideoGenerator');

  const handleGenerate = async () => {
    await measureAsync('generation', async () => {
      // Your generation logic
      await generateVideo();
    });

    const metrics = getMetrics();
    console.log('Average generation time:', metrics.average);
  };

  return <button onClick={handleGenerate}>Generate</button>;
}
```

**Returns**:

```typescript
{
  measure: (name: string, fn: () => T) => T;
  measureAsync: (name: string, fn: () => Promise<T>) => Promise<T>;
  getMetrics: () => ComponentMetrics;
  reset: () => void;
}
```

---

### useRequestCache

**Purpose**: React wrapper for requestCache

**Location**: `src/hooks/useRequestCache.ts`

```typescript
import { useRequestCache } from '@/hooks/useRequestCache';

function DataComponent() {
  const { data, isLoading, error, refetch } = useRequestCache(
    'systemData',
    async () => {
      const response = await fetch('/api/system');
      return response.json();
    },
    { ttl: CacheTTL.medium }
  );

  if (isLoading) return <LoadingFallback />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**Parameters**:

- `key`: Cache key
- `fn`: Data fetching function
- `options`: `{ ttl?: number; enabled?: boolean }`

**Returns**:

```typescript
{
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

---

## Utilities

### Lazy Components

**Location**: `src/lazyComponents.ts`

```typescript
import {
  ComfyUISettings,
  DeviceSettings,
  VideoGenerationTestPage,
  MotionEditorPage,
  Step5Output,
  LoadingFallback,
} from '@/lazyComponents';

// Usage
<Suspense fallback={<LoadingFallback />}>
  <ComfyUISettings />
</Suspense>
```

**Benefits**:

- Reduces initial bundle size
- Faster page load
- Auto code-splitting

---

### Cache Keys & TTL

```typescript
import { CacheKeys, CacheTTL } from '@/services/requestCache';

// Predefined keys
const key = CacheKeys.systemResources();
const ttl = CacheTTL.short;

// Custom keys
const customKey = CacheKeys.videoGeneration('video-123');
```

---

## Type Definitions

### SystemResources

```typescript
interface SystemResources {
  device: 'cuda' | 'mps' | 'directml' | 'cpu';
  gpu: string;
  memory: number;
  vram?: number;
  cpuCores: number;
  platform: string;
}
```

---

### HealthStatus

```typescript
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  queueSize?: number;
  activeGenerations?: number;
  responseTime?: number;
  error?: string;
}
```

---

### PerformanceMetric

```typescript
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
}
```

---

### ErrorResponse

```typescript
interface ErrorResponse {
  type: 'network' | 'validation' | 'comfyui' | 'api' | 'unknown';
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError: any;
}
```

---

### BackendType

```typescript
type BackendType = 'local' | 'cloud' | 'replicate' | 'gemini';
```

---

## Examples

### Example 1: Cached API Request

```typescript
import { requestCache, CacheKeys, CacheTTL } from '@/services/requestCache';

async function fetchUserData(userId: string) {
  return requestCache.cached(
    `user_${userId}`,
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    CacheTTL.medium // 5 minutes
  );
}

// First call: fetches from API
const user1 = await fetchUserData('123');

// Second call within 5 minutes: returns cached
const user2 = await fetchUserData('123'); // Instant!
```

---

### Example 2: Pooled Fetch

```typescript
import { pooledFetch } from '@/services/connectionPool';

async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('video', file);

  const response = await pooledFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

// Connection reused across multiple uploads
for (const file of files) {
  await uploadVideo(file); // Faster after first upload
}
```

---

### Example 3: Performance Tracking

```typescript
import { PerformanceMonitor } from '@/services/performanceMonitor';

async function generateVideo(prompt: string) {
  return PerformanceMonitor.measure(
    'videoGeneration',
    async () => {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      return response.json();
    },
    { prompt, timestamp: Date.now() }
  );
}

// Later, analyze performance
const avgTime = PerformanceMonitor.getAverage('videoGeneration');
console.log(`Average generation time: ${avgTime}ms`);

const summary = PerformanceMonitor.getSummary();
console.log(`Success rate: ${summary.successRate}%`);
```

---

### Example 4: Retry with Backoff

```typescript
import { retryOperation } from '@/services/errorHandler';

async function reliableFetch(url: string) {
  return retryOperation(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    {
      maxRetries: 5,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}: ${error.message}`);
      },
    }
  );
}

// Will retry up to 5 times with exponential backoff
const data = await reliableFetch('/api/flaky-endpoint');
```

---

### Example 5: Full Video Generation

```typescript
import { requestCache, pooledFetch, PerformanceMonitor } from '@/services';

async function generateVideoWithOptimizations(prompt: string) {
  // 1. Measure performance
  return PerformanceMonitor.measure(
    'fullVideoGeneration',
    async () => {
      // 2. Check cache for recent similar prompts
      const cacheKey = `video_${hashPrompt(prompt)}`;
      const cached = requestCache.get(cacheKey);
      if (cached) {
        console.log('Returning cached video');
        return cached;
      }

      // 3. Use pooled fetch for API call
      const response = await pooledFetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();

      // 4. Cache result for 1 hour
      requestCache.set(cacheKey, result, CacheTTL.hour);

      return result;
    },
    { prompt }
  );
}

// Usage
const video = await generateVideoWithOptimizations('Buddhist monk meditating');
```

---

### Example 6: React Component with All Features

```typescript
import { useDeviceDetection, usePerformanceTracking, useRequestCache } from '@/hooks';
import { LoadingFallback } from '@/components/LoadingFallback';
import { PerformanceMonitor } from '@/services/performanceMonitor';

function OptimizedVideoGenerator() {
  // 1. Device detection
  const { device, gpu, isLoading: deviceLoading } = useDeviceDetection();

  // 2. Performance tracking
  const { measureAsync } = usePerformanceTracking('VideoGenerator');

  // 3. Cached data
  const { data: systemInfo, isLoading: dataLoading } = useRequestCache(
    'systemInfo',
    fetchSystemInfo,
    { ttl: 30000 }
  );

  const handleGenerate = async (prompt: string) => {
    await measureAsync('generation', async () => {
      // Your generation logic
    });

    // Show summary
    const summary = PerformanceMonitor.getSummary();
    alert(`Success rate: ${summary.successRate}%`);
  };

  if (deviceLoading || dataLoading) {
    return <LoadingFallback message="Initializing..." />;
  }

  return (
    <div>
      <p>Device: {device}</p>
      <p>GPU: {gpu}</p>
      <p>System: {JSON.stringify(systemInfo)}</p>
      <button onClick={() => handleGenerate('test')}>
        Generate
      </button>
    </div>
  );
}
```

---

## Migration Guide

### From Manual Fetch to Pooled Fetch

**Before**:

```typescript
const response = await fetch(url);
```

**After**:

```typescript
import { pooledFetch } from '@/services/connectionPool';
const response = await pooledFetch(url);
```

---

### From No Caching to Cached

**Before**:

```typescript
async function getData() {
  const response = await fetch('/api/data');
  return response.json();
}
```

**After**:

```typescript
import { requestCache, CacheKeys, CacheTTL } from '@/services/requestCache';

async function getData() {
  return requestCache.cached(
    CacheKeys.systemResources(),
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    CacheTTL.medium
  );
}
```

---

### From No Tracking to Performance Monitoring

**Before**:

```typescript
async function process() {
  // Do work
  await doWork();
}
```

**After**:

```typescript
import { PerformanceMonitor } from '@/services/performanceMonitor';

async function process() {
  await PerformanceMonitor.measure('processing', doWork);
}

// Later
const avg = PerformanceMonitor.getAverage('processing');
```

---

## Best Practices

1. **Always use pooledFetch** instead of native fetch
2. **Cache expensive operations** with appropriate TTL
3. **Track performance** for critical operations
4. **Use lazy loading** for heavy components
5. **Handle errors** with retryOperation
6. **Clear cache** on logout or major state changes
7. **Monitor metrics** in production
8. **Use TypeScript** for type safety

---

**Last Updated**: December 18, 2025
**Version**: 1.0
**Status**: Complete
