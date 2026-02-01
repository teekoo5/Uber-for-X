/**
 * Haversine Formula Implementation
 * 
 * Calculates the great-circle distance between two points on a sphere
 * using the Haversine formula. Used for initial proximity filtering
 * before calling routing APIs for accurate ETA calculation.
 * 
 * Formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1-a))
 * d = R * c
 * 
 * Where:
 * - φ is latitude
 * - λ is longitude  
 * - R is Earth's radius (6,371 km)
 */

// Earth's radius in meters
const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate initial bearing from point 1 to point 2
 * 
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = toDegrees(Math.atan2(y, x));

  // Normalize to 0-360
  return (bearing + 360) % 360;
}

/**
 * Calculate destination point given start point, bearing, and distance
 * 
 * @param lat - Starting latitude in degrees
 * @param lon - Starting longitude in degrees
 * @param bearing - Bearing in degrees
 * @param distance - Distance in meters
 * @returns Destination coordinates [latitude, longitude]
 */
export function destinationPoint(
  lat: number,
  lon: number,
  bearing: number,
  distance: number
): [number, number] {
  const φ1 = toRadians(lat);
  const λ1 = toRadians(lon);
  const θ = toRadians(bearing);
  const δ = distance / EARTH_RADIUS_METERS;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return [toDegrees(φ2), toDegrees(λ2)];
}

/**
 * Generate a bounding box around a point
 * Useful for quick database filtering before Haversine calculation
 * 
 * @param lat - Center latitude in degrees
 * @param lon - Center longitude in degrees
 * @param radiusMeters - Radius in meters
 * @returns Bounding box { minLat, maxLat, minLon, maxLon }
 */
export function boundingBox(
  lat: number,
  lon: number,
  radiusMeters: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  // Angular radius in degrees
  const angularRadius = toDegrees(radiusMeters / EARTH_RADIUS_METERS);

  // Latitude bounds
  const minLat = lat - angularRadius;
  const maxLat = lat + angularRadius;

  // Longitude bounds (adjusted for latitude)
  const latRadians = toRadians(lat);
  const lonAngularRadius = angularRadius / Math.cos(latRadians);
  const minLon = lon - lonAngularRadius;
  const maxLon = lon + lonAngularRadius;

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Check if a point is within a circular region
 * 
 * @param pointLat - Point latitude
 * @param pointLon - Point longitude
 * @param centerLat - Center latitude
 * @param centerLon - Center longitude
 * @param radiusMeters - Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  return haversineDistance(pointLat, pointLon, centerLat, centerLon) <= radiusMeters;
}

/**
 * Sort locations by distance from a reference point
 * 
 * @param locations - Array of locations with lat/lon
 * @param refLat - Reference latitude
 * @param refLon - Reference longitude
 * @returns Sorted array with distance property added
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  locations: T[],
  refLat: number,
  refLon: number
): (T & { distance: number })[] {
  return locations
    .map((loc) => ({
      ...loc,
      distance: haversineDistance(loc.latitude, loc.longitude, refLat, refLon),
    }))
    .sort((a, b) => a.distance - b.distance);
}
