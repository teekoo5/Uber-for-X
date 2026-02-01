/**
 * Redis GEO Service
 * 
 * Handles geospatial operations using Redis GEO commands for:
 * - Storing driver locations with GEOADD
 * - Finding nearby drivers with GEORADIUS/GEOSEARCH
 * - Multi-tenant data isolation via key prefixes
 * 
 * Redis GEO uses Geohashing internally for efficient proximity searches.
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { DriverLocation, GeoMember } from '../models/location.js';

export class RedisGeoService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private readonly keyPrefix: string;

  constructor() {
    this.keyPrefix = config.redis.keyPrefix;
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * Get the Redis key for driver locations (tenant-isolated)
   */
  private getDriversKey(tenantId: string): string {
    return `${this.keyPrefix}drivers:${tenantId}:locations`;
  }

  /**
   * Get the Redis key for driver metadata
   */
  private getDriverMetaKey(tenantId: string, driverId: string): string {
    return `${this.keyPrefix}drivers:${tenantId}:meta:${driverId}`;
  }

  /**
   * Update driver location using GEOADD
   * 
   * GEOADD key longitude latitude member
   * This adds the driver to a sorted set with their geospatial coordinates.
   */
  async updateDriverLocation(location: DriverLocation): Promise<void> {
    const key = this.getDriversKey(location.tenantId);
    const metaKey = this.getDriverMetaKey(location.tenantId, location.driverId);

    try {
      // Use multi/exec for atomic operations
      const multi = this.client.multi();

      // Add/update driver location in GEO set
      // GEOADD returns 1 for new members, 0 for updates
      multi.geoAdd(key, {
        longitude: location.longitude,
        latitude: location.latitude,
        member: location.driverId,
      });

      // Store driver metadata with TTL
      const metadata = {
        driverId: location.driverId,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        timestamp: location.timestamp.toISOString(),
        vehicleType: location.vehicleType || 'standard',
        rating: location.rating || 0,
        isAvailable: location.isAvailable ?? true,
      };

      multi.hSet(metaKey, metadata as Record<string, string>);
      multi.expire(metaKey, config.location.driverTtlSeconds);

      await multi.exec();

      logger.debug(
        { driverId: location.driverId, tenantId: location.tenantId },
        'Driver location updated'
      );
    } catch (err) {
      logger.error({ err, location }, 'Failed to update driver location');
      throw err;
    }
  }

  /**
   * Find nearby drivers using GEOSEARCH (Redis 6.2+)
   * 
   * GEOSEARCH key FROMMEMBER|FROMLONLAT BYRADIUS|BYBOX ASC|DESC COUNT
   * Returns drivers within the specified radius, sorted by distance.
   */
  async findNearbyDrivers(
    tenantId: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = config.location.defaultSearchRadius,
    limit: number = 20
  ): Promise<DriverLocation[]> {
    const key = this.getDriversKey(tenantId);

    try {
      // Use GEOSEARCH with FROMLONLAT for searching from a point
      const results = await this.client.geoSearchWith(
        key,
        { longitude, latitude },
        { radius: radiusMeters, unit: 'm' },
        ['WITHDIST', 'WITHCOORD'],
        { SORT: 'ASC', COUNT: limit }
      );

      if (!results || results.length === 0) {
        return [];
      }

      // Enrich results with driver metadata
      const drivers: DriverLocation[] = [];

      for (const result of results) {
        const driverId = result.member;
        const metaKey = this.getDriverMetaKey(tenantId, driverId);
        const metadata = await this.client.hGetAll(metaKey);

        if (metadata && Object.keys(metadata).length > 0) {
          drivers.push({
            driverId,
            latitude: result.coordinates?.latitude || 0,
            longitude: result.coordinates?.longitude || 0,
            heading: parseFloat(metadata.heading) || 0,
            speed: parseFloat(metadata.speed) || 0,
            accuracy: parseFloat(metadata.accuracy) || 0,
            timestamp: new Date(metadata.timestamp || Date.now()),
            tenantId,
            distance: result.distance || 0,
            vehicleType: metadata.vehicleType as DriverLocation['vehicleType'],
            rating: parseFloat(metadata.rating) || 0,
            isAvailable: metadata.isAvailable === 'true',
            // ETA will be calculated separately with routing API
            eta: this.estimateETA(result.distance || 0),
          });
        }
      }

      logger.debug(
        { tenantId, latitude, longitude, radius: radiusMeters, count: drivers.length },
        'Found nearby drivers'
      );

      return drivers;
    } catch (err) {
      logger.error({ err, tenantId, latitude, longitude }, 'Failed to find nearby drivers');
      throw err;
    }
  }

  /**
   * Get a specific driver's location
   */
  async getDriverLocation(tenantId: string, driverId: string): Promise<DriverLocation | null> {
    const key = this.getDriversKey(tenantId);
    const metaKey = this.getDriverMetaKey(tenantId, driverId);

    try {
      // Get position from GEO set
      const positions = await this.client.geoPos(key, driverId);
      
      if (!positions || !positions[0]) {
        return null;
      }

      const [position] = positions;
      
      // Get metadata
      const metadata = await this.client.hGetAll(metaKey);

      return {
        driverId,
        latitude: position.latitude,
        longitude: position.longitude,
        heading: parseFloat(metadata.heading) || 0,
        speed: parseFloat(metadata.speed) || 0,
        accuracy: parseFloat(metadata.accuracy) || 0,
        timestamp: new Date(metadata.timestamp || Date.now()),
        tenantId,
        vehicleType: metadata.vehicleType as DriverLocation['vehicleType'],
        rating: parseFloat(metadata.rating) || 0,
        isAvailable: metadata.isAvailable === 'true',
      };
    } catch (err) {
      logger.error({ err, tenantId, driverId }, 'Failed to get driver location');
      throw err;
    }
  }

  /**
   * Remove driver from location tracking
   */
  async removeDriver(tenantId: string, driverId: string): Promise<void> {
    const key = this.getDriversKey(tenantId);
    const metaKey = this.getDriverMetaKey(tenantId, driverId);

    try {
      const multi = this.client.multi();
      multi.zRem(key, driverId);
      multi.del(metaKey);
      await multi.exec();

      logger.debug({ driverId, tenantId }, 'Driver removed from location tracking');
    } catch (err) {
      logger.error({ err, tenantId, driverId }, 'Failed to remove driver');
      throw err;
    }
  }

  /**
   * Set driver availability status
   */
  async setDriverAvailability(
    tenantId: string,
    driverId: string,
    isAvailable: boolean
  ): Promise<void> {
    const metaKey = this.getDriverMetaKey(tenantId, driverId);

    try {
      await this.client.hSet(metaKey, 'isAvailable', isAvailable.toString());
    } catch (err) {
      logger.error({ err, tenantId, driverId, isAvailable }, 'Failed to set driver availability');
      throw err;
    }
  }

  /**
   * Calculate distance between two points using Redis GEODIST
   */
  async getDistance(
    tenantId: string,
    driverId1: string,
    driverId2: string
  ): Promise<number | null> {
    const key = this.getDriversKey(tenantId);

    try {
      const distance = await this.client.geoDist(key, driverId1, driverId2, 'm');
      return distance;
    } catch (err) {
      logger.error({ err }, 'Failed to calculate distance');
      return null;
    }
  }

  /**
   * Simple ETA estimation based on distance
   * In production, this should call a routing API (Google Maps, Mapbox, Radar)
   */
  private estimateETA(distanceMeters: number): number {
    // Assume average speed of 30 km/h in urban areas
    const averageSpeedMps = 30 * 1000 / 3600; // meters per second
    return Math.round(distanceMeters / averageSpeedMps);
  }

  /**
   * Acquire distributed lock for driver assignment (Redlock pattern)
   */
  async acquireDriverLock(
    tenantId: string,
    driverId: string,
    lockId: string,
    ttlMs: number = 10000
  ): Promise<boolean> {
    const lockKey = `${this.keyPrefix}locks:${tenantId}:driver:${driverId}`;

    try {
      // SET NX with expiry for atomic lock acquisition
      const result = await this.client.set(lockKey, lockId, {
        NX: true,
        PX: ttlMs,
      });

      return result === 'OK';
    } catch (err) {
      logger.error({ err, driverId, lockId }, 'Failed to acquire driver lock');
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseDriverLock(
    tenantId: string,
    driverId: string,
    lockId: string
  ): Promise<boolean> {
    const lockKey = `${this.keyPrefix}locks:${tenantId}:driver:${driverId}`;

    try {
      // Only release if we own the lock (Lua script for atomicity)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [lockId],
      });

      return result === 1;
    } catch (err) {
      logger.error({ err, driverId, lockId }, 'Failed to release driver lock');
      return false;
    }
  }

  /**
   * Get count of active drivers for a tenant
   */
  async getActiveDriverCount(tenantId: string): Promise<number> {
    const key = this.getDriversKey(tenantId);

    try {
      return await this.client.zCard(key);
    } catch (err) {
      logger.error({ err, tenantId }, 'Failed to get active driver count');
      return 0;
    }
  }

  /**
   * Clean up stale driver entries (for maintenance)
   */
  async cleanupStaleDrivers(tenantId: string, maxAgeSeconds: number): Promise<number> {
    const key = this.getDriversKey(tenantId);
    let removedCount = 0;

    try {
      // Get all drivers
      const members = await this.client.zRange(key, 0, -1);

      for (const driverId of members) {
        const metaKey = this.getDriverMetaKey(tenantId, driverId);
        const timestamp = await this.client.hGet(metaKey, 'timestamp');

        if (timestamp) {
          const age = (Date.now() - new Date(timestamp).getTime()) / 1000;
          
          if (age > maxAgeSeconds) {
            await this.removeDriver(tenantId, driverId);
            removedCount++;
          }
        }
      }

      logger.info({ tenantId, removedCount }, 'Cleaned up stale drivers');
      return removedCount;
    } catch (err) {
      logger.error({ err, tenantId }, 'Failed to cleanup stale drivers');
      return 0;
    }
  }
}

// Export singleton instance
export const redisGeoService = new RedisGeoService();
