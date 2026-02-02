/**
 * Rides Routes
 * 
 * Handles ride requests, tracking, and management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { dispatchService, DispatchError } from '../services/dispatch.service.js';
import { paymentService, PaymentError } from '../services/payment.service.js';
import { 
  authenticate, 
  requireUserType, 
  enforceTenantIsolation 
} from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { db, rides } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';

export const ridesRouter = Router();

// Validation schemas
const createRideSchema = z.object({
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  pickupAddress: z.string().min(1).max(500),
  pickupPlaceId: z.string().optional(),
  dropoffLatitude: z.number().min(-90).max(90),
  dropoffLongitude: z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1).max(500),
  dropoffPlaceId: z.string().optional(),
  vehicleType: z.enum(['standard', 'comfort', 'xl', 'accessible', 'electric']).optional(),
  scheduledPickupTime: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  requiresChildSeat: z.boolean().optional(),
  requiresWheelchairAccess: z.boolean().optional(),
  numberOfPassengers: z.number().int().min(1).max(10).optional(),
  paymentMethod: z.enum(['card', 'mobilepay', 'cash']).optional(),
});

const fareEstimateSchema = z.object({
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  dropoffLatitude: z.number().min(-90).max(90),
  dropoffLongitude: z.number().min(-180).max(180),
  vehicleType: z.enum(['standard', 'comfort', 'xl', 'accessible', 'electric']).optional(),
});

const cancelRideSchema = z.object({
  reason: z.string().max(500).optional(),
});

const completeRideSchema = z.object({
  actualDistanceMeters: z.number().int().min(0),
  actualDurationSeconds: z.number().int().min(0),
  taximeterFare: z.number().min(0).optional(),
});

const updateRideStatusSchema = z.object({
  status: z.enum([
    'driver_arriving',
    'arrived',
    'in_progress',
    'completed',
  ]),
});

// POST /rides/estimate - Get fare estimate
ridesRouter.post('/estimate', authenticate, async (req: Request, res: Response) => {
  try {
    const data = fareEstimateSchema.parse(req.body);
    
    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(db.tenants.id, req.user!.tenantId),
    });

    if (!tenant) {
      res.status(400).json({
        error: 'Invalid tenant',
        code: 'INVALID_TENANT',
      });
      return;
    }

    const estimate = await dispatchService.calculateFare(
      tenant,
      data.pickupLatitude,
      data.pickupLongitude,
      data.dropoffLatitude,
      data.dropoffLongitude,
      data.vehicleType || 'standard'
    );

    res.json({
      success: true,
      data: estimate,
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

    logger.error({ err }, 'Failed to calculate fare estimate');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate fare estimate',
    });
  }
});

// POST /rides - Create a new ride request
ridesRouter.post('/', authenticate, requireUserType('rider'), async (req: Request, res: Response) => {
  try {
    const data = createRideSchema.parse(req.body);
    
    const result = await dispatchService.createRideRequest({
      ...data,
      tenantId: req.user!.tenantId,
      riderId: req.user!.userId,
      scheduledPickupTime: data.scheduledPickupTime 
        ? new Date(data.scheduledPickupTime) 
        : undefined,
    });

    res.status(201).json({
      success: true,
      data: {
        ride: result.ride,
        fareEstimate: result.fareEstimate,
      },
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

    if (err instanceof DispatchError) {
      res.status(400).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to create ride request');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create ride request',
    });
  }
});

// GET /rides - Get ride history
ridesRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = db.query.rides.findMany({
      where: and(
        eq(rides.tenantId, req.user!.tenantId),
        req.user!.userType === 'rider' 
          ? eq(rides.riderId, req.user!.userId)
          : eq(rides.driverId, req.user!.userId),
        status ? eq(rides.status, status as typeof rides.$inferSelect['status']) : undefined
      ),
      orderBy: desc(rides.requestedAt),
      limit,
      offset,
      with: {
        rider: true,
        driver: true,
        vehicle: true,
      },
    });

    const ridesList = await query;

    res.json({
      success: true,
      data: ridesList,
      pagination: {
        limit,
        offset,
        hasMore: ridesList.length === limit,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get rides');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get rides',
    });
  }
});

// GET /rides/:id - Get specific ride
ridesRouter.get('/:id', authenticate, enforceTenantIsolation, async (req: Request, res: Response) => {
  try {
    const ride = await db.query.rides.findFirst({
      where: and(
        eq(rides.id, req.params.id),
        eq(rides.tenantId, req.user!.tenantId)
      ),
      with: {
        rider: true,
        driver: true,
        vehicle: true,
        payments: true,
        rating: true,
      },
    });

    if (!ride) {
      res.status(404).json({
        error: 'Ride not found',
        code: 'RIDE_NOT_FOUND',
      });
      return;
    }

    // Ensure user has access to this ride
    if (ride.riderId !== req.user!.userId && ride.driverId !== req.user!.userId) {
      if (!['admin', 'dispatcher'].includes(req.user!.userType)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this ride',
          code: 'ACCESS_DENIED',
        });
        return;
      }
    }

    res.json({
      success: true,
      data: ride,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get ride');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get ride',
    });
  }
});

// POST /rides/:id/cancel - Cancel a ride
ridesRouter.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const data = cancelRideSchema.parse(req.body);
    
    const cancelledBy = req.user!.userType === 'rider' ? 'rider' : 'driver';
    
    const ride = await dispatchService.cancelRide(
      req.params.id,
      req.user!.tenantId,
      cancelledBy,
      data.reason
    );

    res.json({
      success: true,
      data: ride,
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

    if (err instanceof DispatchError) {
      res.status(404).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to cancel ride');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel ride',
    });
  }
});

// PATCH /rides/:id/status - Update ride status (driver only)
ridesRouter.patch('/:id/status', authenticate, requireUserType('driver'), async (req: Request, res: Response) => {
  try {
    const data = updateRideStatusSchema.parse(req.body);
    
    const updates: Record<string, unknown> = {};
    
    switch (data.status) {
      case 'arrived':
        updates.driverArrivedAt = new Date();
        break;
      case 'in_progress':
        updates.rideStartedAt = new Date();
        break;
    }

    const ride = await dispatchService.updateRideStatus(
      req.params.id,
      req.user!.tenantId,
      data.status,
      updates
    );

    res.json({
      success: true,
      data: ride,
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

    if (err instanceof DispatchError) {
      res.status(404).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to update ride status');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update ride status',
    });
  }
});

// POST /rides/:id/complete - Complete a ride (driver only)
ridesRouter.post('/:id/complete', authenticate, requireUserType('driver'), async (req: Request, res: Response) => {
  try {
    const data = completeRideSchema.parse(req.body);
    
    const ride = await dispatchService.completeRide(
      req.params.id,
      req.user!.tenantId,
      data.actualDistanceMeters,
      data.actualDurationSeconds,
      data.taximeterFare
    );

    res.json({
      success: true,
      data: ride,
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

    if (err instanceof DispatchError) {
      res.status(404).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to complete ride');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete ride',
    });
  }
});

// POST /rides/:id/pay - Initialize payment for a ride
ridesRouter.post('/:id/pay', authenticate, requireUserType('rider'), async (req: Request, res: Response) => {
  try {
    // Get ride
    const ride = await db.query.rides.findFirst({
      where: and(
        eq(rides.id, req.params.id),
        eq(rides.tenantId, req.user!.tenantId),
        eq(rides.riderId, req.user!.userId)
      ),
    });

    if (!ride) {
      res.status(404).json({
        error: 'Ride not found',
        code: 'RIDE_NOT_FOUND',
      });
      return;
    }

    if (ride.status !== 'completed') {
      res.status(400).json({
        error: 'Ride not completed',
        message: 'Payment can only be initiated for completed rides',
        code: 'RIDE_NOT_COMPLETED',
      });
      return;
    }

    const amount = parseFloat(ride.finalFare || ride.estimatedFare || '0');

    const result = await paymentService.createPaymentIntent({
      tenantId: req.user!.tenantId,
      rideId: ride.id,
      riderId: req.user!.userId,
      amount,
      paymentMethod: ride.paymentMethod === 'mobilepay' ? 'mobilepay' : 'card',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(400).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    logger.error({ err }, 'Failed to create payment');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create payment',
    });
  }
});

// GET /rides/nearby-drivers - Get nearby available drivers
ridesRouter.get('/nearby-drivers', authenticate, async (req: Request, res: Response) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const vehicleType = (req.query.vehicleType as string) || 'standard';

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'latitude and longitude are required',
      });
      return;
    }

    const drivers = await dispatchService.findNearbyDrivers(
      req.user!.tenantId,
      latitude,
      longitude,
      vehicleType
    );

    res.json({
      success: true,
      data: drivers,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to find nearby drivers');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find nearby drivers',
    });
  }
});
