/**
 * Core API Entry Point
 * 
 * Main API server for the white-labeled mobility platform.
 * Handles authentication, rides, payments, and fleet management.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { testConnection, closePool } from './db/index.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { ridesRouter } from './routes/rides.routes.js';
import { rateLimit, extractTenant } from './middleware/auth.middleware.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production',
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? ['https://*.mobility.app', 'https://*.helsinkitaxi.fi']
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      tenantId: req.tenantId,
      userId: req.user?.userId,
    });
  });
  next();
});

// Extract tenant from all requests
app.use(extractTenant);

// Rate limiting
app.use(rateLimit);

// Health routes (no auth required)
app.use('/', healthRouter);

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/rides', ridesRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  // Close database pool
  await closePool();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start(): Promise<void> {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.warn('Database not connected, starting anyway...');
    }

    // Start HTTP server
    app.listen(config.port, config.host, () => {
      logger.info({
        port: config.port,
        host: config.host,
        env: config.nodeEnv,
      }, 'Core API started');

      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                       CORE API                                ║
╠═══════════════════════════════════════════════════════════════╣
║  HTTP Server:     http://${config.host}:${config.port}                      ║
║  Health Check:    http://${config.host}:${config.port}/health               ║
║  API Base:        http://${config.host}:${config.port}/api/v1               ║
║  Environment:     ${config.nodeEnv.padEnd(43)}║
║  Database:        ${dbConnected ? 'Connected'.padEnd(43) : 'Disconnected'.padEnd(43)}║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start Core API');
    process.exit(1);
  }
}

// Start the service
start();
