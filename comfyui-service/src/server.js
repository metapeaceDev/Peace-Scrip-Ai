/**
 * ComfyUI Service - Main Server
 *
 * Purpose: Backend service for managing ComfyUI + LoRA image generation
 * Features:
 * - Queue-based job processing (Bull + Redis)
 * - Multiple ComfyUI worker support (GPU pool)
 * - Firebase integration for job storage
 * - WebSocket for real-time progress
 * - Auto-scaling and load balancing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import comfyuiRoutes from './routes/comfyui.js';
import healthRoutes from './routes/health.js';
import queueRoutes from './routes/queue.js';
import videoRoutes from './routes/video.js';
import cloudRoutes from './routes/cloud.js';
import loadbalancerRoutes from './routes/loadbalancer.js';
import debugRoutes from './routes/debug.js';
import imageRoutes from './routes/image.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeFirebase } from './config/firebase.js';
import { initializeQueue, enableSmartRouting } from './services/queueService.js';
import { startWorkerManager, getWorkerManager } from './services/workerManager.js';
import IntelligentLoadBalancer from './services/loadBalancer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize services
await initializeFirebase();
await initializeQueue();
const workerManager = await startWorkerManager();

// Initialize load balancer
const loadBalancer = new IntelligentLoadBalancer(workerManager);
// await loadBalancer.initialize(); // Method doesn't exist - loadBalancer auto-initializes in constructor

// Enable smart routing in queue service
enableSmartRouting(loadBalancer);

// Store services in app.locals for route access
app.locals.workerManager = workerManager;
app.locals.loadBalancer = loadBalancer;

// Security
app.use(helmet());

// CORS Configuration - Allow both local development and production
const allowedOrigins = [
  'http://localhost:5173',           // Local development (Vite default)
  'http://localhost:5176',           // Local development (Vite alternate)
  'http://localhost:3000',           // Alternative local port
  'https://peace-script-ai.web.app', // Firebase Hosting
  'https://peace-script-ai.firebaseapp.com', // Firebase alternative domain
  process.env.CORS_ORIGIN            // Custom origin from env
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow local file:// pages during development (Origin: "null")
      if (origin === 'null' && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list or if wildcard is enabled
      if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
        callback(null, true);
      } else {
        console.warn(`[WARN] CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser only
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// TEST ROUTE
app.post('/api/test', (req, res) => {
  console.log('TEST ROUTE HIT!');
  res.json({ success: true, message: 'Test works' });
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/comfyui', comfyuiRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/loadbalancer', loadbalancerRoutes);
app.use('/debug', debugRoutes);
app.use('/', imageRoutes); // Image proxy at root level

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  const cloudAvailable = workerManager.getCloudManager().isAvailable();
  const lbStats = loadBalancer.getStats();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          ComfyUI Service - Peace Script AI                ║
╚═══════════════════════════════════════════════════════════╝

[OK] Server running on port ${PORT}
[OK] Environment: ${process.env.NODE_ENV}
[OK] Queue: ${process.env.REDIS_URL ? 'Redis' : 'In-memory'}
[OK] Local Workers: ${process.env.COMFYUI_WORKERS?.split(',').length || 1} instances
[CLOUD] Cloud Workers: ${cloudAvailable ? 'Available (RunPod)' : 'Not configured'}
[LB] Load Balancer: Active (${lbStats.backends.length} backends)

[API] API Endpoints:
   → http://localhost:${PORT}/health
   → http://localhost:${PORT}/api/comfyui/generate
   → http://localhost:${PORT}/api/video/generate/animatediff
   → http://localhost:${PORT}/api/video/generate/svd
   → http://localhost:${PORT}/api/queue/status
   → http://localhost:${PORT}/api/cloud/status
   → http://localhost:${PORT}/api/cloud/cost
   → http://localhost:${PORT}/api/loadbalancer/status
   → http://localhost:${PORT}/api/loadbalancer/recommendations

[READY] ComfyUI Service is ready! ${cloudAvailable ? '[CLOUD] Hybrid cloud/local mode' : '[LOCAL] Local mode'}
  `);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Shutdown load balancer (if shutdown method exists)
    if (loadBalancer && typeof loadBalancer.shutdown === 'function') {
      await loadBalancer.shutdown();
    }
    
    // Shutdown worker manager (terminates cloud pods)
    await workerManager.shutdown();
    
    console.log('[OK] Shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

