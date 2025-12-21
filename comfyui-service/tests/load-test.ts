/**
 * Load Testing Script
 * 
 * Test system with 100+ concurrent jobs
 * Measure throughput, latency, and cost
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const COMFYUI_SERVICE_URL = process.env.COMFYUI_SERVICE_URL || 'http://localhost:8000';
const CONCURRENT_JOBS = parseInt(process.env.CONCURRENT_JOBS || '100');
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION_MS || '60000'); // 1 minute

interface JobResult {
  jobId: string;
  startTime: number;
  endTime: number;
  duration: number;
  backend: string;
  cost: number;
  success: boolean;
  error?: string;
}

interface LoadTestResults {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalDuration: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // jobs per second
  totalCost: number;
  avgCostPerJob: number;
  backendDistribution: Record<string, number>;
  errors: string[];
}

/**
 * Generate test video job
 */
function createTestJob(index: number) {
  return {
    prompt: `Test video ${index}: Beautiful landscape with mountains`,
    workflow: 'animatediff',
    metadata: {
      numFrames: 16,
      fps: 8,
      width: 512,
      height: 512,
    },
    userId: `load-test-user-${index % 10}`,
  };
}

/**
 * Submit job to queue
 */
async function submitJob(jobData: any): Promise<JobResult> {
  const startTime = performance.now();
  
  try {
    // Submit job
    const submitResponse = await axios.post(
      `${COMFYUI_SERVICE_URL}/api/video/generate/animatediff`,
      jobData,
      { timeout: 5000 }
    );

    const jobId = submitResponse.data.jobId;

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(
        `${COMFYUI_SERVICE_URL}/api/queue/job/${jobId}`,
        { timeout: 5000 }
      );

      const status = statusResponse.data.status;
      
      if (status === 'completed') {
        completed = true;
      } else if (status === 'failed') {
        throw new Error('Job failed');
      }
      
      attempts++;
    }

    if (!completed) {
      throw new Error('Job timeout');
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Get job details to extract backend and cost
    const detailsResponse = await axios.get(
      `${COMFYUI_SERVICE_URL}/api/queue/job/${jobId}`,
      { timeout: 5000 }
    );

    const result = detailsResponse.data.result || {};

    return {
      jobId,
      startTime,
      endTime,
      duration,
      backend: result.backend || 'unknown',
      cost: result.cost || 0,
      success: true,
    };
  } catch (error: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      jobId: 'failed',
      startTime,
      endTime,
      duration,
      backend: 'none',
      cost: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Calculate percentile
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

/**
 * Analyze results
 */
function analyzeResults(results: JobResult[]): LoadTestResults {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const durations = successful.map(r => r.duration);
  const totalDuration = Math.max(...results.map(r => r.endTime)) - Math.min(...results.map(r => r.startTime));

  // Backend distribution
  const backendDistribution: Record<string, number> = {};
  successful.forEach(r => {
    backendDistribution[r.backend] = (backendDistribution[r.backend] || 0) + 1;
  });

  // Cost calculation
  const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);

  return {
    totalJobs: results.length,
    successfulJobs: successful.length,
    failedJobs: failed.length,
    totalDuration,
    avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
    minLatency: Math.min(...durations),
    maxLatency: Math.max(...durations),
    p50Latency: percentile(durations, 50),
    p95Latency: percentile(durations, 95),
    p99Latency: percentile(durations, 99),
    throughput: (successful.length / totalDuration) * 1000, // jobs per second
    totalCost,
    avgCostPerJob: totalCost / successful.length || 0,
    backendDistribution,
    errors: failed.map(r => r.error || 'Unknown error'),
  };
}

/**
 * Print results
 */
function printResults(results: LoadTestResults) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║               LOAD TEST RESULTS                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Job Statistics:');
  console.log(`   Total Jobs:      ${results.totalJobs}`);
  console.log(`   Successful:      ${results.successfulJobs} (${((results.successfulJobs / results.totalJobs) * 100).toFixed(1)}%)`);
  console.log(`   Failed:          ${results.failedJobs} (${((results.failedJobs / results.totalJobs) * 100).toFixed(1)}%)`);
  console.log('');

  console.log('⚡ Performance:');
  console.log(`   Avg Latency:     ${(results.avgLatency / 1000).toFixed(2)}s`);
  console.log(`   Min Latency:     ${(results.minLatency / 1000).toFixed(2)}s`);
  console.log(`   Max Latency:     ${(results.maxLatency / 1000).toFixed(2)}s`);
  console.log(`   P50 Latency:     ${(results.p50Latency / 1000).toFixed(2)}s`);
  console.log(`   P95 Latency:     ${(results.p95Latency / 1000).toFixed(2)}s`);
  console.log(`   P99 Latency:     ${(results.p99Latency / 1000).toFixed(2)}s`);
  console.log(`   Throughput:      ${results.throughput.toFixed(2)} jobs/sec`);
  console.log('');

  console.log('💰 Cost Analysis:');
  console.log(`   Total Cost:      $${results.totalCost.toFixed(4)}`);
  console.log(`   Avg Cost/Job:    $${results.avgCostPerJob.toFixed(4)}`);
  console.log('');

  console.log('🎯 Backend Distribution:');
  Object.entries(results.backendDistribution).forEach(([backend, count]) => {
    const percentage = (count / results.successfulJobs) * 100;
    console.log(`   ${backend.padEnd(10)} ${count.toString().padStart(4)} jobs (${percentage.toFixed(1)}%)`);
  });
  console.log('');

  if (results.errors.length > 0) {
    console.log('❌ Errors:');
    const errorCounts: Record<string, number> = {};
    results.errors.forEach(err => {
      errorCounts[err] = (errorCounts[err] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${error}: ${count} times`);
    });
    console.log('');
  }
}

/**
 * Main load test
 */
async function runLoadTest() {
  console.log('🚀 Starting Load Test...');
  console.log(`   Target: ${COMFYUI_SERVICE_URL}`);
  console.log(`   Concurrent Jobs: ${CONCURRENT_JOBS}`);
  console.log(`   Duration: ${TEST_DURATION_MS / 1000}s`);
  console.log('');

  // Check service health
  try {
    await axios.get(`${COMFYUI_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('✅ ComfyUI Service is online\n');
  } catch (error) {
    console.error('❌ ComfyUI Service is offline. Please start it first.');
    process.exit(1);
  }

  // Get initial load balancer status
  try {
    const lbStatus = await axios.get(`${COMFYUI_SERVICE_URL}/api/loadbalancer/status`);
    console.log('📊 Initial Backend Status:');
    lbStatus.data.backends.forEach((backend: any) => {
      console.log(`   ${backend.name}: ${backend.healthy ? '✅' : '❌'} (queue: ${backend.queue})`);
    });
    console.log('');
  } catch (error) {
    console.warn('⚠️  Could not get load balancer status\n');
  }

  console.log('⏳ Submitting jobs...\n');

  const results: JobResult[] = [];
  const batchSize = 10; // Submit in batches to avoid overwhelming the system

  for (let i = 0; i < CONCURRENT_JOBS; i += batchSize) {
    const batch = [];
    
    for (let j = 0; j < batchSize && i + j < CONCURRENT_JOBS; j++) {
      const jobData = createTestJob(i + j);
      batch.push(submitJob(jobData));
    }

    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          jobId: 'failed',
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          backend: 'none',
          cost: 0,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }

      const jobNumber = i + index + 1;
      const status = result.status === 'fulfilled' && result.value.success ? '✅' : '❌';
      process.stdout.write(`\r   ${status} ${jobNumber}/${CONCURRENT_JOBS} jobs processed`);
    });

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n⏳ Analyzing results...\n');

  const analysis = analyzeResults(results);
  printResults(analysis);

  // Get final load balancer status
  try {
    const lbStatus = await axios.get(`${COMFYUI_SERVICE_URL}/api/loadbalancer/status`);
    console.log('📊 Final Backend Status:');
    lbStatus.data.backends.forEach((backend: any) => {
      console.log(`   ${backend.name}: Jobs=${backend.jobs}, Cost=$${backend.totalCost.toFixed(4)}, Avg Time=${backend.avgProcessingTime.toFixed(1)}s`);
    });
    console.log('');
  } catch (error) {
    // Ignore
  }

  console.log('✅ Load test complete!\n');
}

// Run test
runLoadTest().catch(error => {
  console.error('❌ Load test failed:', error);
  process.exit(1);
});
