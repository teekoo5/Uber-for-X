/**
 * Location REST Routes
 * 
 * HTTP endpoints for location operations as fallback/supplement
 * to WebSocket communication. Useful for:
 * - Initial driver discovery before WebSocket connection
 * - Admin dashboard queries
 * - Service-to-service communication
 */

import { Router, Request, Response } from 'express';
import { redisGeoService } from '../services/redis-geo.service.js';
import { logger } from '../utils/logger.js';
import { LocationUpdateSchema, NearbyDriversRequestSchema } from '../models/location.js';
import { config } from '../config/index.js';

export const locationRouter = Router();

/**
 * Get nearby drivers
 * GET /api/v1/location/nearby?lat=60.1699&lon=24.9384&radius=5000&tenantId=helsinki_001
 */
locationRouter.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius, tenantId, vehicleType, limit } = req.query;

    // Validate request
    const request = NearbyDriversRequestSchema.parse({
      latitude: parseFloat(lat as string),
      longitude: parseFloat(lon as string),
      radius: radius ? parseFloat(radius as string) : undefined,
      tenantId: tenantId as string,
      vehicleType: vehicleType as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // Find nearby drivers
    const drivers = await redisGeoService.findNearbyDrivers(
      request.tenantId,
      request.latitude,
      request.longitude,
      request.radius,
      request.limit
    );

    // Filter by vehicle type if specified
    const filteredDrivers = request.vehicleType
      ? drivers.filter((d) => d.vehicleType === request.vehicleType)
      : drivers;

    res.status(200).json({
      success: true,
      data: filteredDrivers,
      meta: {
        total: filteredDrivers.length,
        searchRadius: request.radius,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Nearby drivers query failed');
    res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
    });
  }
});

/**
 * Get specific driver location
 * GET /api/v1/location/driver/:driverId?tenantId=helsinki_001
 */
locationRouter.get('/driver/:driverId', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
      return;
    }

    const location = await redisGeoService.getDriverLocation(
      tenantId as string,
      driverId
    );

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Driver not found or offline',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    logger.error({ error }, 'Driver location query failed');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Update driver location (REST fallback)
 * POST /api/v1/location/update
 */
locationRouter.post('/update', async (req: Request, res: Response) => {
  try {
    const locationData = LocationUpdateSchema.parse(req.body);

    await redisGeoService.updateDriverLocation({
      ...locationData,
      timestamp: new Date(locationData.timestamp),
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      message: 'Location updated',
    });
  } catch (error) {
    logger.error({ error }, 'Location update failed');
    res.status(400).json({
      success: false,
      error: 'Invalid location data',
    });
  }
});

/**
 * Set driver availability
 * PATCH /api/v1/location/driver/:driverId/availability
 */
locationRouter.patch('/driver/:driverId/availability', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { tenantId, isAvailable } = req.body;

    if (!tenantId || typeof isAvailable !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'tenantId and isAvailable are required',
      });
      return;
    }

    await redisGeoService.setDriverAvailability(tenantId, driverId, isAvailable);

    res.status(200).json({
      success: true,
      message: `Driver availability set to ${isAvailable}`,
    });
  } catch (error) {
    logger.error({ error }, 'Availability update failed');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Remove driver from tracking
 * DELETE /api/v1/location/driver/:driverId?tenantId=helsinki_001
 */
locationRouter.delete('/driver/:driverId', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'tenantId is required',
      });
      return;
    }

    await redisGeoService.removeDriver(tenantId as string, driverId);

    res.status(200).json({
      success: true,
      message: 'Driver removed from tracking',
    });
  } catch (error) {
    logger.error({ error }, 'Driver removal failed');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
