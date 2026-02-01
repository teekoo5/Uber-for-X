/**
 * Location Models
 * 
 * Type definitions for location data, driver tracking,
 * and geospatial operations in the mobility platform.
 */

import { z } from 'zod';

/**
 * Location update from a driver
 */
export const LocationUpdateSchema = z.object({
  driverId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional().default(0),
  speed: z.number().min(0).optional().default(0),
  accuracy: z.number().min(0).optional().default(0),
  timestamp: z.string().datetime().or(z.date()),
  tenantId: z.string().min(1),
});

export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;

/**
 * Driver location with additional metadata
 */
export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
  timestamp: Date;
  tenantId: string;
  // Optional enriched data
  distance?: number;
  eta?: number;
  vehicleType?: VehicleType;
  rating?: number;
  isAvailable?: boolean;
}

/**
 * Nearby drivers request
 */
export const NearbyDriversRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).optional().default(5000),
  tenantId: z.string().min(1),
  vehicleType: z.enum(['standard', 'premium', 'accessible', 'large', 'electric']).optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

export type NearbyDriversRequest = z.infer<typeof NearbyDriversRequestSchema>;

/**
 * Vehicle types for Finnish taxi market
 */
export enum VehicleType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ACCESSIBLE = 'accessible',
  LARGE = 'large',
  ELECTRIC = 'electric',
}

/**
 * WebSocket message types
 */
export enum MessageType {
  // Client -> Server
  LOCATION_UPDATE = 'location_update',
  NEARBY_DRIVERS = 'nearby_drivers',
  SUBSCRIBE_DRIVER = 'subscribe_driver',
  UNSUBSCRIBE_DRIVER = 'unsubscribe_driver',
  PING = 'ping',
  
  // Server -> Client
  NEARBY_DRIVERS_RESPONSE = 'nearby_drivers',
  DRIVER_LOCATION = 'driver_location',
  PONG = 'pong',
  ERROR = 'error',
  CONNECTED = 'connected',
}

/**
 * WebSocket message envelope
 */
export interface WebSocketMessage<T = unknown> {
  type: MessageType | string;
  payload: T;
  timestamp?: string;
  requestId?: string;
}

/**
 * WebSocket client info
 */
export interface ClientInfo {
  userId: string;
  userType: 'driver' | 'rider' | 'admin';
  tenantId: string;
  connectedAt: Date;
  lastPing?: Date;
  subscriptions: Set<string>;
}

/**
 * Redis GEO member data
 */
export interface GeoMember {
  memberId: string;
  longitude: number;
  latitude: number;
  data?: Record<string, unknown>;
}

/**
 * Haversine formula result
 */
export interface DistanceResult {
  distance: number; // meters
  bearing: number;  // degrees
}

/**
 * ETA calculation result
 */
export interface ETAResult {
  distanceMeters: number;
  durationSeconds: number;
  trafficFactor?: number;
}

/**
 * Finnish market specific: Taximeter data
 */
export interface TaximeterData {
  fareAmount: number;
  distance: number;
  duration: number;
  vatAmount: number;
  vatRate: number; // 13.5% as of 2026
  startTime: Date;
  endTime?: Date;
  meterId: string; // MID-compliant meter ID
}

/**
 * Distributed lock info for driver assignment
 */
export interface DriverLock {
  driverId: string;
  lockId: string;
  acquiredAt: Date;
  expiresAt: Date;
  ownerId: string;
}
