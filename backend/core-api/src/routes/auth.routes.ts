/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService, AuthError } from '../services/auth.service.js';
import { authenticate, extractTenant } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  userType: z.enum(['rider', 'driver']),
  tenantId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.string().uuid().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  avatarUrl: z.string().url().optional(),
  preferredLanguage: z.string().max(10).optional(),
  fcmToken: z.string().optional(),
  apnsToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

// POST /auth/register
authRouter.post('/register', extractTenant, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const tenantId = data.tenantId || req.tenantId!;

    const result = await authService.register({
      ...data,
      tenantId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: err.errors,
      });
      return;
    }

    if (err instanceof AuthError) {
      const status = err.code === 'USER_EXISTS' ? 409 : 400;
      res.status(status).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Registration failed');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
});

// POST /auth/login
authRouter.post('/login', extractTenant, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const tenantId = data.tenantId || req.tenantId!;

    const result = await authService.login({
      ...data,
      tenantId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: err.errors,
      });
      return;
    }

    if (err instanceof AuthError) {
      const status = err.code === 'INVALID_CREDENTIALS' ? 401 : 
                     err.code === 'ACCOUNT_SUSPENDED' ? 403 : 400;
      res.status(status).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Login failed');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const data = refreshSchema.parse(req.body);
    const tokens = await authService.refreshTokens(data.refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
      });
      return;
    }

    if (err instanceof AuthError) {
      res.status(401).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_TOKEN',
    });
  }
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId, req.user!.tenantId);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get user profile');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user profile',
    });
  }
});

// PATCH /auth/me
authRouter.patch('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const updates = updateProfileSchema.parse(req.body);
    
    const user = await authService.updateProfile(
      req.user!.userId,
      req.user!.tenantId,
      updates
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: err.errors,
      });
      return;
    }

    if (err instanceof AuthError) {
      res.status(404).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to update profile');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
});

// POST /auth/change-password
authRouter.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    
    await authService.changePassword(
      req.user!.userId,
      req.user!.tenantId,
      data.currentPassword,
      data.newPassword
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: err.errors,
      });
      return;
    }

    if (err instanceof AuthError) {
      const status = err.code === 'INVALID_CREDENTIALS' ? 400 : 404;
      res.status(status).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to change password');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password',
    });
  }
});
