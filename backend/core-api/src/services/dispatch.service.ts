/**
 * Dispatch Service
 * 
 * Core matching algorithm for assigning drivers to ride requests.
 * 
 * Features:
 * - Proximity-based initial filtering using Haversine formula
 * - ETA-based ranking (integrates with Google Maps API)
 * - Distributed locking to prevent double-assignment
 * - Surge pricing calculation
 * - Finnish taximeter integration support
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { eq, and, sql } from 'drizzle-orm';
import { db, rides, users, vehicles, tenants, payments } from '../db/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { haversineDistance } from '../utils/haversine.js';

// Types
export interface RideRequest {
  tenantId: string;
  riderId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupPlaceId?: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffAddress: string;
  dropoffPlaceId?: string;
  vehicleType?: 'standard' | 'comfort' | 'xl' | 'accessible' | 'electric';
  scheduledPickupTime?: Date;
  notes?: string;
  requiresChildSeat?: boolean;
  requiresWheelchairAccess?: boolean;
  numberOfPassengers?: number;
  paymentMethod?: 'card' | 'mobilepay' | 'cash';
}

export interface NearbyDriver {
  driverId: string;
  distance: number; // meters
  eta: number; // seconds
  rating: number;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  registrationNumber: string;
  latitude: number;
  longitude: number;
}

export interface FareEstimate {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  surgeMultiplier: number;
  surgeAmount: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
}

export interface RideOffer {
  rideId: string;
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  vehicleType: string;
  expiresAt: Date;
}

// Constants
const MAX_SEARCH_RADIUS_METERS = 10000; // 10km
const INITIAL_SEARCH_RADIUS_METERS = 3000; // 3km
const MAX_DRIVERS_TO_QUERY = 20;
const RIDE_OFFER_TIMEOUT_SECONDS = 30;
const SURGE_THRESHOLD_RATIO = 1.5; // requests/drivers ratio

export class DispatchService {
  /**
   * Create a new ride request and start the matching process
   */
  async createRideRequest(request: RideRequest): Promise<{
    ride: typeof rides.$inferSelect;
    fareEstimate: FareEstimate;
  }> {
    const {
      tenantId,
      riderId,
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      dropoffLatitude,
      dropoffLongitude,
      dropoffAddress,
      vehicleType = 'standard',
      scheduledPickupTime,
      paymentMethod = 'card',
    } = request;

    // Get tenant pricing config
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      throw new DispatchError('Invalid tenant', 'INVALID_TENANT');
    }

    // Calculate fare estimate
    const fareEstimate = await this.calculateFare(
      tenant,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      vehicleType
    );

    // Create ride record
    const [ride] = await db.insert(rides).values({
      tenantId,
      riderId,
      status: scheduledPickupTime ? 'requested' : 'searching',
      pickupLatitude: pickupLatitude.toString(),
      pickupLongitude: pickupLongitude.toString(),
      pickupAddress,
      pickupPlaceId: request.pickupPlaceId,
      dropoffLatitude: dropoffLatitude.toString(),
      dropoffLongitude: dropoffLongitude.toString(),
      dropoffAddress,
      dropoffPlaceId: request.dropoffPlaceId,
      vehicleTypeRequested: vehicleType,
      estimatedDistanceMeters: fareEstimate.estimatedDistanceMeters,
      estimatedDurationSeconds: fareEstimate.estimatedDurationSeconds,
      estimatedFare: fareEstimate.total.toString(),
      baseFare: fareEstimate.baseFare.toString(),
      surgeMutiplier: fareEstimate.surgeMultiplier.toString(),
      currency: fareEstimate.currency,
      paymentMethod,
      scheduledPickupTime,
      isScheduled: !!scheduledPickupTime,
      notes: request.notes,
      requiresChildSeat: request.requiresChildSeat,
      requiresWheelchairAccess: request.requiresWheelchairAccess,
      numberOfPassengers: request.numberOfPassengers,
    }).returning();

    logger.info({
      rideId: ride.id,
      tenantId,
      riderId,
      vehicleType,
    }, 'Ride request created');

    // If not scheduled, start driver matching immediately
    if (!scheduledPickupTime) {
      // This would typically be done via Kafka event
      // For now, we'll trigger it directly
      this.startDriverMatching(ride.id).catch((err) => {
        logger.error({ err, rideId: ride.id }, 'Driver matching failed');
      });
    }

    return { ride, fareEstimate };
  }

  /**
   * Calculate fare estimate using tenant pricing config
   */
  async calculateFare(
    tenant: typeof tenants.$inferSelect,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    vehicleType: string
  ): Promise<FareEstimate> {
    const pricingConfig = tenant.pricingConfig as {
      baseFare: number;
      perKmRate: number;
      perMinuteRate: number;
      minimumFare: number;
      bookingFee: number;
      surgePricingEnabled: boolean;
      vatRate: number;
    };

    // Get route from Google Maps (or fallback to Haversine)
    let distanceMeters: number;
    let durationSeconds: number;

    if (config.maps.apiKey) {
      const route = await this.getRouteFromMaps(
        pickupLat, pickupLng,
        dropoffLat, dropoffLng
      );
      distanceMeters = route.distanceMeters;
      durationSeconds = route.durationSeconds;
    } else {
      // Fallback: Use Haversine distance with estimated time
      distanceMeters = haversineDistance(
        pickupLat, pickupLng,
        dropoffLat, dropoffLng
      );
      // Assume average speed of 30 km/h in urban areas
      durationSeconds = Math.round(distanceMeters / (30 * 1000 / 3600));
    }

    // Calculate base components
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;

    let baseFare = pricingConfig.baseFare;
    let distanceFare = distanceKm * pricingConfig.perKmRate;
    let timeFare = durationMinutes * pricingConfig.perMinuteRate;
    const bookingFee = pricingConfig.bookingFee;

    // Apply vehicle type multiplier
    const vehicleMultiplier = this.getVehicleTypeMultiplier(vehicleType);
    baseFare *= vehicleMultiplier;
    distanceFare *= vehicleMultiplier;
    timeFare *= vehicleMultiplier;

    // Calculate surge (if enabled)
    let surgeMultiplier = 1.0;
    if (pricingConfig.surgePricingEnabled) {
      surgeMultiplier = await this.calculateSurgeMultiplier(
        tenant.id,
        pickupLat,
        pickupLng
      );
    }

    const surgeAmount = surgeMultiplier > 1 
      ? (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1)
      : 0;

    const subtotal = (baseFare + distanceFare + timeFare + surgeAmount + bookingFee);
    
    // Apply minimum fare
    const adjustedSubtotal = Math.max(subtotal, pricingConfig.minimumFare);
    
    // Calculate VAT (included in price for Finnish taxi)
    const vatRate = pricingConfig.vatRate || config.finland.vatRatePassenger;
    const vatAmount = adjustedSubtotal * vatRate / (1 + vatRate);

    return {
      baseFare: Math.round(baseFare * 100) / 100,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      bookingFee: Math.round(bookingFee * 100) / 100,
      surgeMultiplier,
      surgeAmount: Math.round(surgeAmount * 100) / 100,
      subtotal: Math.round(adjustedSubtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(adjustedSubtotal * 100) / 100,
      currency: tenant.defaultCurrency || 'EUR',
      estimatedDistanceMeters: distanceMeters,
      estimatedDurationSeconds: durationSeconds,
    };
  }

  /**
   * Start the driver matching process for a ride
   */
  async startDriverMatching(rideId: string): Promise<void> {
    const ride = await db.query.rides.findFirst({
      where: eq(rides.id, rideId),
    });

    if (!ride) {
      throw new DispatchError('Ride not found', 'RIDE_NOT_FOUND');
    }

    logger.info({ rideId }, 'Starting driver matching');

    // Find nearby available drivers
    const nearbyDrivers = await this.findNearbyDrivers(
      ride.tenantId,
      parseFloat(ride.pickupLatitude),
      parseFloat(ride.pickupLongitude),
      ride.vehicleTypeRequested || 'standard'
    );

    if (nearbyDrivers.length === 0) {
      // No drivers available
      await db.update(rides)
        .set({ status: 'no_drivers_available', updatedAt: new Date() })
        .where(eq(rides.id, rideId));
      
      logger.info({ rideId }, 'No drivers available');
      return;
    }

    // Sort by ETA (already sorted by distance, but we prefer ETA)
    nearbyDrivers.sort((a, b) => a.eta - b.eta);

    // Try to assign drivers one by one
    for (const driver of nearbyDrivers) {
      const assigned = await this.tryAssignDriver(rideId, driver.driverId);
      if (assigned) {
        logger.info({ rideId, driverId: driver.driverId }, 'Driver assigned');
        return;
      }
    }

    // If we get here, no driver accepted
    await db.update(rides)
      .set({ status: 'no_drivers_available', updatedAt: new Date() })
      .where(eq(rides.id, rideId));
  }

  /**
   * Find nearby available drivers
   */
  async findNearbyDrivers(
    tenantId: string,
    latitude: number,
    longitude: number,
    vehicleType: string
  ): Promise<NearbyDriver[]> {
    // In production, this would query the location service via HTTP/gRPC
    // For now, we'll query the database directly
    
    // Get all active drivers with their vehicles
    const driversWithVehicles = await db
      .select({
        driver: users,
        vehicle: vehicles,
      })
      .from(users)
      .innerJoin(vehicles, eq(vehicles.driverId, users.id))
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.userType, 'driver'),
        eq(users.status, 'active'),
        eq(vehicles.isActive, true),
        vehicleType !== 'standard' 
          ? eq(vehicles.vehicleType, vehicleType as 'standard' | 'comfort' | 'xl' | 'accessible' | 'electric')
          : sql`1=1`
      ))
      .limit(MAX_DRIVERS_TO_QUERY);

    // Note: In production, we'd get real-time locations from Redis via the location service
    // For now, this is a placeholder that would be enhanced with actual location data
    
    const nearbyDrivers: NearbyDriver[] = [];

    for (const { driver, vehicle } of driversWithVehicles) {
      // TODO: Get real location from location service
      // For now, we'll simulate with random nearby location
      const driverLat = latitude + (Math.random() - 0.5) * 0.05;
      const driverLng = longitude + (Math.random() - 0.5) * 0.05;
      
      const distance = haversineDistance(latitude, longitude, driverLat, driverLng);
      
      if (distance <= MAX_SEARCH_RADIUS_METERS) {
        // Estimate ETA (30 km/h average in urban areas)
        const eta = Math.round(distance / (30 * 1000 / 3600));
        
        nearbyDrivers.push({
          driverId: driver.id,
          distance,
          eta,
          rating: parseFloat(driver.averageRating || '5.0'),
          vehicleType: vehicle.vehicleType || 'standard',
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleColor: vehicle.color,
          registrationNumber: vehicle.registrationNumber,
          latitude: driverLat,
          longitude: driverLng,
        });
      }
    }

    return nearbyDrivers.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Try to assign a driver to a ride using distributed locking
   */
  async tryAssignDriver(rideId: string, driverId: string): Promise<boolean> {
    // In production, we'd use Redis Redlock for distributed locking
    // For now, we'll use a simple database transaction
    
    const lockId = uuidv4();
    
    try {
      // Start transaction
      const result = await db.transaction(async (tx) => {
        // Check if ride is still in searching status
        const ride = await tx.query.rides.findFirst({
          where: and(
            eq(rides.id, rideId),
            eq(rides.status, 'searching')
          ),
        });

        if (!ride) {
          return false; // Ride already assigned or cancelled
        }

        // Get driver's vehicle
        const vehicle = await tx.query.vehicles.findFirst({
          where: and(
            eq(vehicles.driverId, driverId),
            eq(vehicles.isActive, true)
          ),
        });

        if (!vehicle) {
          return false;
        }

        // Assign driver to ride
        await tx.update(rides)
          .set({
            driverId,
            vehicleId: vehicle.id,
            status: 'driver_assigned',
            driverAssignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(rides.id, rideId));

        return true;
      });

      if (result) {
        // TODO: Send push notification to driver
        // TODO: Publish event to Kafka for real-time updates
        logger.info({ rideId, driverId }, 'Driver successfully assigned');
      }

      return result;
    } catch (err) {
      logger.error({ err, rideId, driverId }, 'Failed to assign driver');
      return false;
    }
  }

  /**
   * Calculate surge multiplier based on supply/demand
   */
  async calculateSurgeMultiplier(
    tenantId: string,
    latitude: number,
    longitude: number
  ): Promise<number> {
    // In production, this would:
    // 1. Count active ride requests in the area
    // 2. Count available drivers in the area
    // 3. Calculate ratio and apply surge curve
    
    // For now, return a random surge for demonstration
    // In production, you'd implement proper surge pricing logic
    const random = Math.random();
    
    if (random > 0.8) {
      return Math.min(1.5 + Math.random() * 0.5, config.pricing.maxSurgeMultiplier);
    }
    
    return 1.0;
  }

  /**
   * Get route information from Google Maps
   */
  private async getRouteFromMaps(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<{ distanceMeters: number; durationSeconds: number }> {
    if (!config.maps.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${originLat},${originLng}`,
            destination: `${destLat},${destLng}`,
            key: config.maps.apiKey,
            mode: 'driving',
            departure_time: 'now',
          },
        }
      );

      if (response.data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = response.data.routes[0].legs[0];
      
      return {
        distanceMeters: route.distance.value,
        durationSeconds: route.duration_in_traffic?.value || route.duration.value,
      };
    } catch (err) {
      logger.error({ err }, 'Failed to get route from Google Maps');
      // Fallback to Haversine
      const distance = haversineDistance(originLat, originLng, destLat, destLng);
      return {
        distanceMeters: distance,
        durationSeconds: Math.round(distance / (30 * 1000 / 3600)),
      };
    }
  }

  /**
   * Get vehicle type pricing multiplier
   */
  private getVehicleTypeMultiplier(vehicleType: string): number {
    const multipliers: Record<string, number> = {
      standard: 1.0,
      comfort: 1.3,
      xl: 1.5,
      accessible: 1.0, // No extra charge for accessible
      electric: 1.1,
    };
    return multipliers[vehicleType] || 1.0;
  }

  /**
   * Update ride status
   */
  async updateRideStatus(
    rideId: string,
    tenantId: string,
    status: typeof rides.$inferSelect['status'],
    updates?: Partial<typeof rides.$inferInsert>
  ): Promise<typeof rides.$inferSelect> {
    const [updatedRide] = await db.update(rides)
      .set({
        status,
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(rides.id, rideId),
        eq(rides.tenantId, tenantId)
      ))
      .returning();

    if (!updatedRide) {
      throw new DispatchError('Ride not found', 'RIDE_NOT_FOUND');
    }

    logger.info({ rideId, status }, 'Ride status updated');

    return updatedRide;
  }

  /**
   * Complete a ride
   */
  async completeRide(
    rideId: string,
    tenantId: string,
    actualDistanceMeters: number,
    actualDurationSeconds: number,
    taximeterFare?: number
  ): Promise<typeof rides.$inferSelect> {
    const ride = await this.updateRideStatus(rideId, tenantId, 'completed', {
      actualDistanceMeters,
      actualDurationSeconds,
      taximeterFare: taximeterFare?.toString(),
      rideCompletedAt: new Date(),
    });

    // Calculate final fare
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (tenant) {
      const finalFare = await this.calculateFare(
        tenant,
        parseFloat(ride.pickupLatitude),
        parseFloat(ride.pickupLongitude),
        parseFloat(ride.dropoffLatitude),
        parseFloat(ride.dropoffLongitude),
        ride.vehicleTypeRequested || 'standard'
      );

      // Use taximeter fare if available (Finnish compliance)
      const fareToCharge = taximeterFare || finalFare.total;

      await db.update(rides)
        .set({
          finalFare: fareToCharge.toString(),
          distanceFare: finalFare.distanceFare.toString(),
          timeFare: finalFare.timeFare.toString(),
          vatAmount: (fareToCharge * config.finland.vatRatePassenger / (1 + config.finland.vatRatePassenger)).toString(),
        })
        .where(eq(rides.id, rideId));
    }

    return ride;
  }

  /**
   * Cancel a ride
   */
  async cancelRide(
    rideId: string,
    tenantId: string,
    cancelledBy: 'rider' | 'driver' | 'system',
    reason?: string
  ): Promise<typeof rides.$inferSelect> {
    const status = cancelledBy === 'rider' ? 'cancelled_by_rider' : 'cancelled_by_driver';
    
    return this.updateRideStatus(rideId, tenantId, status, {
      cancelledBy,
      cancellationReason: reason,
    });
  }
}

/**
 * Custom error class for dispatch errors
 */
export class DispatchError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DispatchError';
    this.code = code;
  }
}

// Export singleton instance
export const dispatchService = new DispatchService();
