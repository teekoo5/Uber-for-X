/**
 * Haversine Distance Calculation
 * 
 * Calculates the great-circle distance between two points on a sphere
 * using the Haversine formula.
 * 
 * Formula:
 * d = 2r * arcsin(sqrt(sin²((φ₂-φ₁)/2) + cos(φ₁) * cos(φ₂) * sin²((λ₂-λ₁)/2)))
 * 
 * Where:
 * - φ is latitude
 * - λ is longitude
 * - r is the radius of the Earth (6,371 km)
 */

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the Haversine distance between two points
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

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate the bearing from point 1 to point 2
 * 
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Bearing in degrees (0-360, where 0 = North)
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
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  
  // Convert to degrees and normalize to 0-360
  return (θ * 180 / Math.PI + 360) % 360;
}

/**
 * Calculate a destination point given start point, bearing, and distance
 * 
 * @param lat - Starting latitude in degrees
 * @param lon - Starting longitude in degrees
 * @param bearing - Bearing in degrees
 * @param distance - Distance in meters
 * @returns Object with latitude and longitude of destination point
 */
export function destinationPoint(
  lat: number,
  lon: number,
  bearing: number,
  distance: number
): { latitude: number; longitude: number } {
  const φ1 = toRadians(lat);
  const λ1 = toRadians(lon);
  const θ = toRadians(bearing);
  const δ = distance / EARTH_RADIUS_METERS; // Angular distance

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    latitude: φ2 * 180 / Math.PI,
    longitude: ((λ2 * 180 / Math.PI) + 540) % 360 - 180, // Normalize to -180 to 180
  };
}

/**
 * Check if a point is within a circular geofence
 * 
 * @param pointLat - Latitude of the point to check
 * @param pointLon - Longitude of the point to check
 * @param centerLat - Latitude of the geofence center
 * @param centerLon - Longitude of the geofence center
 * @param radiusMeters - Radius of the geofence in meters
 * @returns True if the point is within the geofence
 */
export function isWithinRadius(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(pointLat, pointLon, centerLat, centerLon);
  return distance <= radiusMeters;
}

/**
 * Calculate the midpoint between two coordinates
 */
export function midpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { latitude: number; longitude: number } {
  const φ1 = toRadians(lat1);
  const λ1 = toRadians(lon1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const Bx = Math.cos(φ2) * Math.cos(Δλ);
  const By = Math.cos(φ2) * Math.sin(Δλ);

  const φ3 = Math.atan2(
    Math.sin(φ1) + Math.sin(φ2),
    Math.sqrt((Math.cos(φ1) + Bx) * (Math.cos(φ1) + Bx) + By * By)
  );

  const λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);

  return {
    latitude: φ3 * 180 / Math.PI,
    longitude: ((λ3 * 180 / Math.PI) + 540) % 360 - 180,
  };
}
