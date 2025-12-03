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
import { errorHandler } from './middleware/errorHandler.js';
import { initializeFirebase } from './config/firebase.js';
import { initializeQueue } from './services/queueService.js';
import { startWorkerManager } from './services/workerManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize services
await initializeFirebase();
await initializeQueue();
await startWorkerManager();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit for local development (was 100)
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/comfyui', comfyuiRoutes);
app.use('/api/queue', queueRoutes);

// Error handling
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          🎨 ComfyUI Service - Peace Script AI                ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV}
✅ Queue: ${process.env.REDIS_URL ? 'Redis' : 'In-memory'}
✅ Workers: ${process.env.COMFYUI_WORKERS || 1} ComfyUI instances

📡 API Endpoints:
   → http://localhost:${PORT}/health
   → http://localhost:${PORT}/api/comfyui/generate
   → http://localhost:${PORT}/api/queue/status

🎬 ComfyUI Service is ready!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
