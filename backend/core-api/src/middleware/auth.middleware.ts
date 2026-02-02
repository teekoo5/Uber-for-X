/**
 * Authentication Middleware
 * 
 * Handles JWT token validation and tenant context extraction.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload, AuthError } from '../services/auth.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: string;
    }
  }
}

/**
 * Extract and validate JWT token from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
      code: 'MISSING_TOKEN',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Authentication error');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
  } catch {
    // Ignore errors for optional auth
  }

  next();
}

/**
 * Require specific user type(s)
 */
export function requireUserType(...types: ('rider' | 'driver' | 'admin' | 'dispatcher')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    if (!types.includes(req.user.userType)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires ${types.join(' or ')} role`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
}

/**
 * Extract tenant ID from header or authenticated user
 */
export function extractTenant(req: Request, res: Response, next: NextFunction): void {
  // Priority: 1. From authenticated user, 2. From X-Tenant-ID header, 3. Default
  const headerTenantId = req.headers['x-tenant-id'] as string;
  
  if (req.user) {
    req.tenantId = req.user.tenantId;
  } else if (headerTenantId) {
    req.tenantId = headerTenantId;
  } else {
    req.tenantId = config.tenant.defaultTenantId;
  }

  next();
}

/**
 * Enforce tenant isolation - ensures authenticated user can only access their tenant's data
 */
export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!config.tenant.enableIsolation) {
    next();
    return;
  }

  const requestTenantId = req.params.tenantId || req.body?.tenantId || req.query.tenantId;
  
  if (requestTenantId && req.user && requestTenantId !== req.user.tenantId) {
    logger.warn({
      userId: req.user.userId,
      userTenant: req.user.tenantId,
      requestedTenant: requestTenantId,
    }, 'Tenant isolation violation attempt');

    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied to requested tenant',
      code: 'TENANT_ISOLATION_VIOLATION',
    });
    return;
  }

  next();
}

/**
 * Rate limiting by user (simple in-memory implementation)
 * In production, use Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.user?.userId || req.ip || 'anonymous';
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }
  
  next();
}
