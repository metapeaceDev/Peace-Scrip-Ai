# Monitoring and Analytics Setup Guide

## Overview

Comprehensive monitoring for ComfyUI Hybrid System covering:
- 📊 Real-time metrics
- 🔍 Error tracking
- 💰 Cost analytics
- ⚡ Performance monitoring
- 🎯 User behavior tracking

## Monitoring Stack

### Core Components
1. **Health Checks**: Built-in endpoints
2. **Metrics**: Prometheus + Grafana
3. **Logs**: Winston + Cloud logging
4. **Errors**: Sentry
5. **Analytics**: Firebase Analytics

## 1. Health Check Endpoints

Already implemented in system:

### Backend Health
```bash
# Basic health
GET /health
Response: { status: 'ok', timestamp: '...' }

# Load balancer status
GET /api/loadbalancer/status
Response: {
  backends: [...],
  stats: { jobs, avgTime, totalCost },
  preferences: { ... }
}

# Cloud worker status
GET /api/cloud/status
Response: {
  pods: [...],
  serverless: { ... },
  statistics: { ... }
}

# Queue statistics
GET /api/queue/stats
Response: {
  waiting: 0,
  active: 2,
  completed: 156,
  failed: 3
}
```

### Uptime Monitoring
Use services like:
- **UptimeRobot**: Free, 5-minute intervals
- **StatusCake**: Free tier available
- **Pingdom**: 1-minute intervals

Configuration example:
```
URL: https://api.yourapp.com/health
Interval: 1 minute
Alert: Email + SMS
Expected: 200 status code
Timeout: 10 seconds
```

## 2. Prometheus Metrics

### Install Prometheus Client
```bash
cd comfyui-service
npm install prom-client
```

### Metrics Server
Create `comfyui-service/src/monitoring/metrics.ts`:

```typescript
import client from 'prom-client';

// Create registry
export const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const jobsTotal = new client.Counter({
  name: 'comfyui_jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['backend', 'status'],
  registers: [register],
});

export const jobDuration = new client.Histogram({
  name: 'comfyui_job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['backend'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

export const jobCost = new client.Gauge({
  name: 'comfyui_job_cost_dollars',
  help: 'Job processing cost in dollars',
  labelNames: ['backend'],
  registers: [register],
});

export const backendHealth = new client.Gauge({
  name: 'comfyui_backend_health',
  help: 'Backend health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['backend'],
  registers: [register],
});

export const queueSize = new client.Gauge({
  name: 'comfyui_queue_size',
  help: 'Current queue size',
  labelNames: ['status'],
  registers: [register],
});

export const cloudPodsActive = new client.Gauge({
  name: 'comfyui_cloud_pods_active',
  help: 'Number of active cloud pods',
  registers: [register],
});
```

### Expose Metrics Endpoint
Add to `comfyui-service/src/server.ts`:

```typescript
import { register } from './monitoring/metrics';

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Instrument Code
Update load balancer and worker manager:

```typescript
import { jobsTotal, jobDuration, jobCost, backendHealth } from './monitoring/metrics';

// When job completes
jobsTotal.inc({ backend: 'local', status: 'success' });
jobDuration.observe({ backend: 'local' }, durationSeconds);
jobCost.set({ backend: 'local' }, cost);

// When health check runs
backendHealth.set({ backend: 'local' }, isHealthy ? 1 : 0);
```

## 3. Grafana Dashboards

### Install Grafana
```bash
# Docker
docker run -d -p 3000:3000 grafana/grafana

# Or use Grafana Cloud (free tier)
# https://grafana.com/products/cloud/
```

### Configure Data Source
1. Open Grafana: http://localhost:3000
2. Add data source: Prometheus
3. URL: http://localhost:9090
4. Save & Test

### Import Dashboard
Create `comfyui-dashboard.json`:

```json
{
  "dashboard": {
    "title": "ComfyUI Hybrid System",
    "panels": [
      {
        "title": "Jobs per Minute",
        "targets": [{
          "expr": "rate(comfyui_jobs_total[1m])"
        }]
      },
      {
        "title": "Average Job Duration",
        "targets": [{
          "expr": "rate(comfyui_job_duration_seconds_sum[5m]) / rate(comfyui_job_duration_seconds_count[5m])"
        }]
      },
      {
        "title": "Cost per Hour",
        "targets": [{
          "expr": "sum(rate(comfyui_job_cost_dollars[1h]))"
        }]
      },
      {
        "title": "Backend Health",
        "targets": [{
          "expr": "comfyui_backend_health"
        }]
      },
      {
        "title": "Queue Size",
        "targets": [{
          "expr": "comfyui_queue_size"
        }]
      },
      {
        "title": "Active Cloud Pods",
        "targets": [{
          "expr": "comfyui_cloud_pods_active"
        }]
      }
    ]
  }
}
```

### Key Metrics to Monitor

**Performance**
- Jobs per minute
- Average job duration
- P95/P99 latency
- Queue wait time

**Reliability**
- Success rate
- Error rate by backend
- Backend health status
- Failover frequency

**Cost**
- Cost per hour
- Cost per job by backend
- Total daily/monthly cost
- Cost savings vs 100% cloud

**Capacity**
- Queue size
- Active workers
- CPU/Memory usage
- Network throughput

## 4. Error Tracking with Sentry

### Install Sentry
```bash
npm install @sentry/node @sentry/tracing
```

### Configure Sentry
Create `comfyui-service/src/monitoring/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: 1.0,
    
    // Profiling
    profilesSampleRate: 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },
  });
}

// Error boundary for async functions
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
    throw error;
  }
}
```

### Use in Code
```typescript
import { withErrorTracking } from './monitoring/sentry';

// Wrap async operations
const result = await withErrorTracking(
  () => cloudWorkerManager.processJob(job),
  { jobId: job.id, backend: 'cloud' }
);

// Manual error capture
try {
  await someOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'load-balancer' },
    extra: { jobData: job },
  });
  throw error;
}
```

## 5. Structured Logging

### Install Winston
```bash
npm install winston winston-daily-rotate-file
```

### Configure Logger
Create `comfyui-service/src/monitoring/logger.ts`:

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
    }),
    
    // Combined logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
    }),
    
    // Console (production)
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Helper functions
export function logJobStart(jobId: string, backend: string) {
  logger.info('Job started', { jobId, backend, event: 'job_start' });
}

export function logJobComplete(jobId: string, backend: string, duration: number, cost: number) {
  logger.info('Job completed', {
    jobId,
    backend,
    duration,
    cost,
    event: 'job_complete',
  });
}

export function logJobFailed(jobId: string, backend: string, error: string) {
  logger.error('Job failed', { jobId, backend, error, event: 'job_failed' });
}

export function logBackendFailover(from: string, to: string, reason: string) {
  logger.warn('Backend failover', { from, to, reason, event: 'failover' });
}
```

### Use in Code
```typescript
import { logger, logJobStart, logJobComplete } from './monitoring/logger';

// Job lifecycle
logJobStart(job.id, 'local');
const result = await processJob(job);
logJobComplete(job.id, 'local', duration, cost);

// General logging
logger.info('Cloud pod started', { podId, gpuType });
logger.warn('Queue size high', { queueSize, threshold });
logger.error('Backend unhealthy', { backend, error });
```

## 6. Cost Analytics

### Cost Tracking API
Already implemented in load balancer. Add dashboard endpoint:

```typescript
// GET /api/analytics/costs
app.get('/api/analytics/costs', async (req, res) => {
  const { period = '24h' } = req.query;
  
  const stats = await loadBalancer.getStats();
  const costs = {
    total: stats.backends.reduce((sum, b) => sum + b.totalCost, 0),
    byBackend: stats.backends.map(b => ({
      name: b.name,
      cost: b.totalCost,
      jobs: b.jobs,
      avgCostPerJob: b.totalCost / b.jobs,
    })),
    savings: calculateSavings(stats),
    trend: await getCostTrend(period),
  };
  
  res.json(costs);
});

function calculateSavings(stats: any) {
  const actualCost = stats.backends.reduce((sum, b) => sum + b.totalCost, 0);
  const totalJobs = stats.backends.reduce((sum, b) => sum + b.jobs, 0);
  const geminiOnlyCost = totalJobs * 0.08; // $0.08 per video
  
  return {
    amount: geminiOnlyCost - actualCost,
    percentage: ((geminiOnlyCost - actualCost) / geminiOnlyCost) * 100,
  };
}
```

### Cost Alerts
```typescript
// Check costs every hour
setInterval(async () => {
  const stats = await loadBalancer.getStats();
  const dailyCost = stats.backends.reduce((sum, b) => sum + b.totalCost, 0);
  
  // Alert if exceeded threshold
  if (dailyCost > parseFloat(process.env.DAILY_COST_THRESHOLD || '10')) {
    await sendCostAlert({
      currentCost: dailyCost,
      threshold: parseFloat(process.env.DAILY_COST_THRESHOLD || '10'),
      breakdown: stats.backends.map(b => ({
        backend: b.name,
        cost: b.totalCost,
        jobs: b.jobs,
      })),
    });
  }
}, 3600000); // Every hour
```

## 7. User Analytics

### Firebase Analytics (Frontend)
Already configured in app. Track key events:

```typescript
import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

// Job creation
logEvent(analytics, 'job_created', {
  backend: selectedBackend,
  workflow: workflowType,
  cost_estimate: estimatedCost,
});

// Backend switch
logEvent(analytics, 'backend_switched', {
  from: previousBackend,
  to: newBackend,
  reason: 'user_preference',
});

// Cost calculation
logEvent(analytics, 'cost_calculated', {
  job_count: jobCount,
  total_cost: totalCost,
  selected_backends: backends.join(','),
});

// Installation
logEvent(analytics, 'comfyui_installed', {
  platform: detectedPlatform,
  duration: installationDuration,
  success: installationSuccess,
});
```

### Custom Events Dashboard
Create dashboard in Firebase Console:
- Job creation rate
- Backend usage distribution
- Cost calculation frequency
- Installation success rate
- User retention

## 8. Alert Configuration

### Alerting Rules
Create `alert-rules.yml`:

```yaml
groups:
  - name: comfyui_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(comfyui_jobs_total{status="failed"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: High job failure rate

      # Backend unhealthy
      - alert: BackendUnhealthy
        expr: comfyui_backend_health == 0
        for: 2m
        annotations:
          summary: Backend {{ $labels.backend }} is unhealthy

      # High queue size
      - alert: HighQueueSize
        expr: comfyui_queue_size{status="waiting"} > 50
        for: 10m
        annotations:
          summary: Queue size exceeds 50 jobs

      # High costs
      - alert: HighDailyCost
        expr: sum(increase(comfyui_job_cost_dollars[24h])) > 10
        annotations:
          summary: Daily cost exceeds $10

      # Slow processing
      - alert: SlowProcessing
        expr: rate(comfyui_job_duration_seconds_sum[5m]) / rate(comfyui_job_duration_seconds_count[5m]) > 60
        for: 10m
        annotations:
          summary: Average job duration exceeds 60 seconds
```

### Alert Channels
Configure notification channels:

```typescript
// Email alerts
import nodemailer from 'nodemailer';

async function sendEmailAlert(alert: Alert) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL,
      pass: process.env.ALERT_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: `[ALERT] ${alert.title}`,
    html: `
      <h2>${alert.title}</h2>
      <p>${alert.description}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `,
  });
}

// Slack alerts
import { WebClient } from '@slack/web-api';

async function sendSlackAlert(alert: Alert) {
  const slack = new WebClient(process.env.SLACK_TOKEN);
  
  await slack.chat.postMessage({
    channel: process.env.SLACK_CHANNEL || '#alerts',
    text: `⚠️ *${alert.title}*\n${alert.description}`,
  });
}
```

## 9. Performance Monitoring

### Request Tracing
```typescript
import { performance } from 'perf_hooks';

// Middleware to track request duration
app.use((req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
    
    // Track metric
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status: res.statusCode },
      duration / 1000
    );
  });
  
  next();
});
```

### Database Query Performance
```typescript
// Track Redis operation time
const redisTimer = jobDuration.startTimer({ operation: 'redis_get' });
const data = await redis.get(key);
redisTimer();

// Track Firestore query time
const firestoreTimer = jobDuration.startTimer({ operation: 'firestore_query' });
const docs = await db.collection('jobs').where('status', '==', 'completed').get();
firestoreTimer();
```

## 10. Dashboard Setup

### Create Admin Dashboard
Add to frontend: `src/pages/AdminDashboard.tsx`

```typescript
export function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const [status, costs, queue] = await Promise.all([
        loadBalancerClient.getStatus(),
        fetch('/api/analytics/costs').then(r => r.json()),
        fetch('/api/queue/stats').then(r => r.json()),
      ]);
      setMetrics({ status, costs, queue });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">System Dashboard</h1>
      
      {/* Backend Status */}
      <BackendStatusCards backends={metrics?.status.backends} />
      
      {/* Cost Analytics */}
      <CostAnalyticsChart data={metrics?.costs} />
      
      {/* Queue Statistics */}
      <QueueStatistics stats={metrics?.queue} />
      
      {/* Real-time Jobs */}
      <ActiveJobsList />
    </div>
  );
}
```

## Monitoring Checklist

- [ ] Health check endpoints working
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboard imported
- [ ] Sentry error tracking configured
- [ ] Winston logging setup
- [ ] Cost tracking enabled
- [ ] Firebase Analytics configured
- [ ] Alert rules defined
- [ ] Alert channels configured (email/Slack)
- [ ] Admin dashboard deployed
- [ ] Uptime monitoring configured
- [ ] Log retention policies set
- [ ] Backup monitoring enabled

## Best Practices

1. **Set up alerts before issues occur**
2. **Monitor costs daily**
3. **Review error logs weekly**
4. **Test alert channels regularly**
5. **Keep dashboards up-to-date**
6. **Set appropriate log retention**
7. **Monitor third-party APIs (RunPod, Gemini)**
8. **Track SLA metrics (uptime, latency)**
9. **Create runbooks for common issues**
10. **Schedule regular monitoring reviews**

---

**Monitoring is essential for production readiness. Start with basics (health checks + logs), then add metrics and alerts as needed.**
