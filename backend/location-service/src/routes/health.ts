/**
 * Health Check Routes
 * 
 * Provides endpoints for Kubernetes liveness and readiness probes,
 * as well as service statistics.
 */

import { Router, Request, Response } from 'express';
import { redisGeoService } from '../services/redis-geo.service.js';
import { websocketService } from '../services/websocket.service.js';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

/**
 * Liveness probe - basic service health
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'location-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks dependencies
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check Redis connection
    const redisHealthy = await checkRedisHealth();

    if (!redisHealthy) {
      res.status(503).json({
        status: 'not ready',
        reason: 'Redis connection unavailable',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      dependencies: {
        redis: 'healthy',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({
      status: 'not ready',
      reason: 'Health check error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Service statistics
 */
healthRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const wsStats = websocketService.getStats();

    res.status(200).json({
      websocket: wsStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Stats retrieval failed');
    res.status(500).json({
      error: 'Failed to retrieve stats',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get active driver count for a tenant
 */
healthRouter.get('/stats/drivers/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const count = await redisGeoService.getActiveDriverCount(tenantId);

    res.status(200).json({
      tenantId,
      activeDrivers: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Driver count retrieval failed');
    res.status(500).json({
      error: 'Failed to retrieve driver count',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Check Redis health
 */
async function checkRedisHealth(): Promise<boolean> {
  try {
    // Try a simple operation
    const count = await redisGeoService.getActiveDriverCount('_health_check');
    return count >= 0; // Will be 0 for non-existent key
  } catch {
    return false;
  }
}
