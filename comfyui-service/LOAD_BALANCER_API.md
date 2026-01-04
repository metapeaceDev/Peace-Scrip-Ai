# Load Balancer API Documentation

## Overview

The Intelligent Load Balancer automatically routes video/image generation jobs to the optimal backend based on:

- **Cost** (prefer free local GPU)
- **Speed** (faster processing = better UX)
- **Availability** (health checks every 30s)
- **Queue length** (avoid overloaded backends)
- **User preferences** (manual backend selection)

## Backends

| Backend            | Priority     | Cost/Job | Speed | Notes                                 |
| ------------------ | ------------ | -------- | ----- | ------------------------------------- |
| **Local GPU**      | 1 (highest)  | $0       | ~10s  | RTX 5090 32GB, ComfyUI localhost:8188 |
| **Cloud (RunPod)** | 2            | $0.007   | ~20s  | Auto-scaling RTX 3090/4090 pods       |
| **Gemini AI**      | 3 (fallback) | $0.08    | ~5s   | Fast but expensive, image only        |

## API Endpoints

### GET /api/loadbalancer/status

Get load balancer status and statistics.

**Response:**

```json
{
  "success": true,
  "backends": [
    {
      "name": "local",
      "available": true,
      "healthy": true,
      "cost": 0,
      "speed": 10,
      "queue": 2,
      "jobs": 45,
      "totalCost": 0,
      "avgProcessingTime": 9.8
    },
    {
      "name": "cloud",
      "available": true,
      "healthy": true,
      "cost": 0.007,
      "speed": 20,
      "queue": 0,
      "jobs": 12,
      "totalCost": 0.084,
      "avgProcessingTime": 18.5
    },
    {
      "name": "gemini",
      "available": true,
      "healthy": true,
      "cost": 0.08,
      "speed": 5,
      "queue": 0,
      "jobs": 3,
      "totalCost": 0.24,
      "avgProcessingTime": 4.2
    }
  ],
  "preferences": {
    "preferredBackend": "auto",
    "maxCostPerJob": null,
    "prioritizeSpeed": false,
    "allowCloudFallback": true
  }
}
```

### POST /api/loadbalancer/select

Get backend recommendation for a job (preview only, doesn't process).

**Request Body:**

```json
{
  "jobType": "video",
  "options": {
    "preferredBackend": "auto",
    "maxCostPerJob": 0.01,
    "prioritizeSpeed": false
  }
}
```

**Response:**

```json
{
  "success": true,
  "selection": {
    "backend": "local",
    "reason": "Local GPU available (highest priority)",
    "score": 95,
    "estimatedCost": 0,
    "estimatedTime": 10,
    "queue": 2
  }
}
```

### GET /api/loadbalancer/recommendations

Get recommendations based on workload.

**Query Parameters:**

- `jobCount` - Number of jobs to process (default: 1)
- `maxBudget` - Maximum total budget (optional)
- `needsFast` - Prioritize speed over cost (default: false)

**Example:**

```
GET /api/loadbalancer/recommendations?jobCount=100&maxBudget=1.00&needsFast=false
```

**Response:**

```json
{
  "success": true,
  "recommendations": [
    {
      "backend": "local",
      "jobCount": 85,
      "cost": 0,
      "time": 850,
      "reason": "Free local GPU, use for bulk processing"
    },
    {
      "backend": "cloud",
      "jobCount": 15,
      "cost": 0.105,
      "time": 300,
      "reason": "Cloud for overflow when local queue is full"
    },
    {
      "backend": "gemini",
      "jobCount": 0,
      "cost": 0,
      "time": 0,
      "reason": "Too expensive for bulk work"
    }
  ],
  "totalCost": 0.105,
  "totalTime": 850,
  "avgCostPerJob": 0.00105
}
```

### POST /api/loadbalancer/estimate

Calculate cost estimate for jobs.

**Request Body:**

```json
{
  "jobCount": 1000,
  "backend": "local" // optional, defaults to auto-selection
}
```

**Response:**

```json
{
  "success": true,
  "estimate": {
    "backend": "local",
    "jobCount": 1000,
    "totalCost": 0,
    "avgCostPerJob": 0,
    "estimatedTime": 10000,
    "breakdown": {
      "local": { "jobs": 850, "cost": 0 },
      "cloud": { "jobs": 150, "cost": 1.05 }
    }
  }
}
```

### PUT /api/loadbalancer/preferences

Update user preferences.

**Request Body:**

```json
{
  "preferredBackend": "cloud", // "auto", "local", "cloud", "gemini"
  "maxCostPerJob": 0.01, // Max cost per job (USD)
  "prioritizeSpeed": true, // Speed over cost
  "allowCloudFallback": true // Allow fallback to cloud if local fails
}
```

**Response:**

```json
{
  "success": true,
  "preferences": {
    "preferredBackend": "cloud",
    "maxCostPerJob": 0.01,
    "prioritizeSpeed": true,
    "allowCloudFallback": true
  }
}
```

### GET /api/loadbalancer/backends

Get all backend information.

**Response:**

```json
{
  "success": true,
  "backends": [
    {
      "name": "local",
      "available": true,
      "healthy": true,
      "cost": 0,
      "speed": 10,
      "queue": 2,
      "jobs": 45,
      "totalCost": 0,
      "avgProcessingTime": 9.8
    }
  ]
}
```

## Scoring Algorithm

The load balancer uses a 0-100 point scoring system:

```
Score = Priority(40%) + Cost(30%) + Speed(20%) + Queue(10%)
```

### Priority Score (40 points max)

- Priority 1 (local): 40 points
- Priority 2 (cloud): 26.7 points
- Priority 3 (gemini): 13.3 points

### Cost Score (30 points max)

- $0 (local): 30 points
- $0.007 (cloud): 27.4 points
- $0.08 (gemini): 0 points

### Speed Score (20 points max)

- 5s (gemini): 20 points
- 10s (local): 10 points
- 20s (cloud): 0 points

### Queue Score (10 points max)

- 0 jobs: 10 points
- 5 jobs: 5 points
- 10+ jobs: 0 points

## Auto-Failover

If a backend fails, the load balancer automatically retries with the next best backend:

1. **Attempt 1:** Selected backend (e.g., local)
2. **Attempt 2:** Next best backend (e.g., cloud) - wait 1s
3. **Attempt 3:** Fallback backend (e.g., gemini) - wait 3s

Total retry attempts: **3** with exponential backoff.

## Usage Examples

### Example 1: Auto Mode (Default)

```javascript
// Job automatically routed to best backend
const job = await queue.add({
  prompt: 'Beautiful landscape',
  userId: 'user123',
});

// Load balancer selects:
// - Local if available (score: 95)
// - Cloud if local busy (score: 54)
// - Gemini if all fail (score: 33)
```

### Example 2: Cost-Conscious Mode

```javascript
// Force cheap backends only
const job = await queue.add({
  prompt: 'Portrait photo',
  userId: 'user123',
  userPreferences: {
    maxCostPerJob: 0.01, // Max $0.01 per job
    allowCloudFallback: true, // Allow cloud if local fails
  },
});

// Load balancer selects:
// - Local (free) ✓
// - Cloud ($0.007) ✓
// - Gemini ($0.08) ✗ (too expensive)
```

### Example 3: Speed Mode

```javascript
// Prioritize fast processing
const job = await queue.add({
  prompt: 'Quick sketch',
  userId: 'user123',
  userPreferences: {
    prioritizeSpeed: true,
    allowCloudFallback: true,
  },
});

// Load balancer adjusts scoring:
// Speed weight: 20% → 40%
// Cost weight: 30% → 10%
// May prefer Gemini (5s) over local (10s) if budget allows
```

### Example 4: Force Specific Backend

```javascript
// Manual backend selection
const job = await queue.add({
  prompt: 'Test image',
  userId: 'user123',
  userPreferences: {
    preferredBackend: 'cloud', // Force cloud usage
  },
});

// Load balancer always uses cloud (unless health check fails)
```

## Cost Optimization Tips

1. **Use Auto Mode:** Let load balancer optimize costs automatically
2. **Set Budget Limits:** Use `maxCostPerJob` to prevent expensive fallbacks
3. **Batch Processing:** Process multiple jobs during off-peak hours on local GPU
4. **Monitor Costs:** Check `/api/loadbalancer/status` for real-time cost tracking
5. **Hybrid Strategy:**
   - Free tier: 100% local GPU (0 cost)
   - Low-budget tier: Local + Cloud fallback ($0.007/video)
   - Premium tier: All backends with speed priority

## Health Monitoring

The load balancer checks backend health every **30 seconds**:

- **Local GPU:** Ping localhost:8188
- **Cloud Worker:** Check RunPod pod status
- **Gemini API:** Test API key validity

Unhealthy backends are automatically excluded from routing.

## Integration with Queue Service

The load balancer is automatically integrated with the queue service:

```javascript
// Queue service automatically uses load balancer
imageQueue.process(async job => {
  // Internally calls: processImageGenerationSmart(job)
  // Which uses: loadBalancer.selectBackend() + failover
});

videoQueue.process(async job => {
  // Internally calls: processVideoGenerationSmart(job)
  // Which uses: loadBalancer.selectBackend() + failover
});
```

No manual integration needed - just start the server!

## Environment Variables

```bash
# Load balancer is enabled by default
# No additional configuration required

# Backend availability controlled by existing vars:
COMFYUI_WORKERS=http://localhost:8188  # Local GPU
RUNPOD_API_KEY=your-key                # Cloud workers
GEMINI_API_KEY=your-key                 # Gemini fallback
```

## Testing

Test load balancer endpoints:

```bash
# Get status
curl http://localhost:8000/api/loadbalancer/status

# Get recommendations for 100 jobs
curl "http://localhost:8000/api/loadbalancer/recommendations?jobCount=100&maxBudget=1.00"

# Calculate cost estimate
curl -X POST http://localhost:8000/api/loadbalancer/estimate \
  -H "Content-Type: application/json" \
  -d '{"jobCount": 1000, "backend": "auto"}'

# Update preferences
curl -X PUT http://localhost:8000/api/loadbalancer/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "preferredBackend": "local",
    "maxCostPerJob": 0.01,
    "prioritizeSpeed": false,
    "allowCloudFallback": true
  }'
```

## Performance Metrics

Expected performance with hybrid setup:

| Metric           | Local Only       | Hybrid (Local + Cloud) |
| ---------------- | ---------------- | ---------------------- |
| **Throughput**   | 6 videos/min     | 15-50 videos/min       |
| **Cost**         | $0               | $0.007/video avg       |
| **Availability** | 95% (single GPU) | 99.9% (auto-scaling)   |
| **Failover**     | Manual           | Automatic              |

## Troubleshooting

**Backend not available:**

- Check health status: `GET /api/loadbalancer/status`
- Verify backend config: Local GPU running? Cloud API key valid?
- Check backend health endpoint directly

**High costs:**

- Set `maxCostPerJob` limit
- Prefer local GPU: `preferredBackend: "local"`
- Monitor costs: `GET /api/cloud/cost`

**Slow processing:**

- Enable speed mode: `prioritizeSpeed: true`
- Scale cloud workers: `POST /api/cloud/spawn`
- Check queue length: `GET /api/loadbalancer/status`

**Failover not working:**

- Verify `allowCloudFallback: true`
- Check retry count in logs
- Test manual backend switch
