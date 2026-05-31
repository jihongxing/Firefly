/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Apply coordinate masking for privacy (add random offset)
 * @param lat Original latitude
 * @param lng Original longitude
 * @param offsetMeters Offset distance in meters (default 100-500m)
 * @returns Masked coordinates
 */
export function maskCoordinates(
  lat: number,
  lng: number,
  offsetMeters: number = 300
): { lat: number; lng: number } {
  const offsetLat = (offsetMeters / 111320) * (Math.random() - 0.5) * 2;
  const offsetLng =
    (offsetMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
    (Math.random() - 0.5) *
    2;

  return {
    lat: lat + offsetLat,
    lng: lng + offsetLng,
  };
}

/**
 * Generate fingerprint from IP and user agent
 */
export function generateFingerprint(ip: string, userAgent: string): string {
  const data = `${ip}-${userAgent}-${Date.now()}`;
  return Buffer.from(data).toString('base64').substring(0, 32);
}
