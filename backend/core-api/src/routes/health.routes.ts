/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { testConnection } from '../db/index.js';

export const healthRouter = Router();

// GET /health
healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await testConnection();

  const status = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'core-api',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  };

  res.status(dbHealthy ? 200 : 503).json(status);
});

// GET /ready
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const dbHealthy = await testConnection();

  if (dbHealthy) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'Database not connected' });
  }
});

// GET /live
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({ live: true });
});
