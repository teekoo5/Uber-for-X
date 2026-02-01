/**
 * Location Service Entry Point
 * 
 * Real-time location tracking service for the white-labeled mobility platform.
 * 
 * Features:
 * - WebSocket connections for bi-directional real-time communication
 * - Redis GEO for geospatial indexing and proximity searches
 * - Multi-tenant isolation via key prefixes and tenant validation
 * - REST API fallback for non-real-time operations
 * 
 * Architecture:
 * - Receives driver location updates via WebSocket
 * - Stores locations in Redis GEO sorted sets (GEOADD)
 * - Responds to nearby driver queries (GEOSEARCH)
 * - Broadcasts driver locations to subscribed riders
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { redisGeoService } from './services/redis-geo.service.js';
import { websocketService } from './services/websocket.service.js';
import { healthRouter } from './routes/health.js';
import { locationRouter } from './routes/location.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? ['https://*.mobility.app'] 
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// Body parsing
app.use(express.json());

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
    });
  });
  next();
});

// Routes
app.use('/', healthRouter);
app.use('/api/v1/location', locationRouter);

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

// Create HTTP server
const server = createServer(app);

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  // Close WebSocket connections
  await websocketService.shutdown();

  // Close Redis connection
  await redisGeoService.disconnect();

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start(): Promise<void> {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisGeoService.connect();

    // Initialize WebSocket server
    logger.info('Initializing WebSocket server...');
    websocketService.initialize(server);

    // Start HTTP server
    server.listen(config.port, config.host, () => {
      logger.info({
        port: config.port,
        host: config.host,
        env: config.nodeEnv,
        wsPath: config.ws.path,
      }, 'Location Service started');

      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                    LOCATION SERVICE                           ║
╠═══════════════════════════════════════════════════════════════╣
║  HTTP Server:     http://${config.host}:${config.port}                      ║
║  WebSocket:       ws://${config.host}:${config.port}${config.ws.path}                 ║
║  Health Check:    http://${config.host}:${config.port}/health               ║
║  Environment:     ${config.nodeEnv.padEnd(43)}║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start Location Service');
    process.exit(1);
  }
}

// Start the service
start();
