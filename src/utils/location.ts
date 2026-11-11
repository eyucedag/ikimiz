export interface Coordinates {
  latitude: number;
  longitude: number;
}
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const value =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, value))));
}
export function bearingBetween(from: Coordinates, to: Coordinates): number {
  const rad = Math.PI / 180;
  const lat1 = from.latitude * rad;
  const lat2 = to.latitude * rad;
  const deltaLon = (to.longitude - from.longitude) * rad;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
export function locationIsFresh(updatedAt: string, now = Date.now(), maxAge = 120_000): boolean {
  const age = now - new Date(updatedAt).getTime();
  return Number.isFinite(age) && age >= -30_000 && age <= maxAge;
}
