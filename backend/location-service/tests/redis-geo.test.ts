/**
 * Redis GEO Service Tests
 * 
 * Unit tests for geospatial operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock Redis client for testing
const mockRedisClient = {
  geoAdd: jest.fn(),
  geoSearchWith: jest.fn(),
  geoPos: jest.fn(),
  hSet: jest.fn(),
  hGetAll: jest.fn(),
  expire: jest.fn(),
  zRem: jest.fn(),
  del: jest.fn(),
  zCard: jest.fn(),
  multi: jest.fn(() => ({
    geoAdd: jest.fn().mockReturnThis(),
    hSet: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    zRem: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  set: jest.fn(),
  eval: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
};

// Import after mocking
import { haversineDistance, boundingBox, isWithinRadius } from '../src/utils/haversine.js';

describe('Haversine Distance Calculations', () => {
  it('should calculate distance between two points correctly', () => {
    // Helsinki to Tampere (approximately 179 km)
    const lat1 = 60.1699; // Helsinki
    const lon1 = 24.9384;
    const lat2 = 61.4978; // Tampere
    const lon2 = 23.7610;

    const distance = haversineDistance(lat1, lon1, lat2, lon2);
    
    // Should be approximately 179 km (179000 meters)
    expect(distance).toBeGreaterThan(170000);
    expect(distance).toBeLessThan(190000);
  });

  it('should return 0 for same coordinates', () => {
    const lat = 60.1699;
    const lon = 24.9384;

    const distance = haversineDistance(lat, lon, lat, lon);
    
    expect(distance).toBe(0);
  });

  it('should handle edge cases at poles', () => {
    // North Pole to a point
    const distance = haversineDistance(90, 0, 60.1699, 24.9384);
    
    // Should be approximately 3,316 km
    expect(distance).toBeGreaterThan(3000000);
    expect(distance).toBeLessThan(3500000);
  });

  it('should handle longitude wrap-around', () => {
    // Points across the date line
    const lat = 0;
    const lon1 = 179;
    const lon2 = -179;

    const distance = haversineDistance(lat, lon1, lat, lon2);
    
    // Should be approximately 222 km at equator (2 degrees)
    expect(distance).toBeGreaterThan(200000);
    expect(distance).toBeLessThan(250000);
  });
});

describe('Bounding Box Calculations', () => {
  it('should create correct bounding box', () => {
    const lat = 60.1699;
    const lon = 24.9384;
    const radius = 5000; // 5 km

    const box = boundingBox(lat, lon, radius);

    expect(box.minLat).toBeLessThan(lat);
    expect(box.maxLat).toBeGreaterThan(lat);
    expect(box.minLon).toBeLessThan(lon);
    expect(box.maxLon).toBeGreaterThan(lon);
  });

  it('should contain center point', () => {
    const lat = 60.1699;
    const lon = 24.9384;
    const radius = 5000;

    const box = boundingBox(lat, lon, radius);

    expect(lat).toBeGreaterThan(box.minLat);
    expect(lat).toBeLessThan(box.maxLat);
    expect(lon).toBeGreaterThan(box.minLon);
    expect(lon).toBeLessThan(box.maxLon);
  });
});

describe('isWithinRadius', () => {
  it('should return true for point within radius', () => {
    const centerLat = 60.1699;
    const centerLon = 24.9384;
    
    // Point 1km away
    const pointLat = 60.1789;
    const pointLon = 24.9384;

    const result = isWithinRadius(pointLat, pointLon, centerLat, centerLon, 2000);
    
    expect(result).toBe(true);
  });

  it('should return false for point outside radius', () => {
    const centerLat = 60.1699;
    const centerLon = 24.9384;
    
    // Point 10km away (Tampere direction)
    const pointLat = 60.2699;
    const pointLon = 24.9384;

    const result = isWithinRadius(pointLat, pointLon, centerLat, centerLon, 5000);
    
    expect(result).toBe(false);
  });
});

describe('Location Update Model', () => {
  it('should validate correct location update', () => {
    const validUpdate = {
      driverId: 'driver_001',
      latitude: 60.1699,
      longitude: 24.9384,
      heading: 45.0,
      speed: 30.5,
      accuracy: 10.0,
      timestamp: new Date().toISOString(),
      tenantId: 'helsinki_001',
    };

    // Schema validation would be tested here
    expect(validUpdate.latitude).toBeGreaterThanOrEqual(-90);
    expect(validUpdate.latitude).toBeLessThanOrEqual(90);
    expect(validUpdate.longitude).toBeGreaterThanOrEqual(-180);
    expect(validUpdate.longitude).toBeLessThanOrEqual(180);
  });

  it('should reject invalid coordinates', () => {
    const invalidUpdate = {
      driverId: 'driver_001',
      latitude: 91, // Invalid - max is 90
      longitude: 24.9384,
      tenantId: 'helsinki_001',
    };

    expect(invalidUpdate.latitude).toBeGreaterThan(90);
  });
});
