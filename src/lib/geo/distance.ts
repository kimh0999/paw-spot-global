const EARTH_RADIUS_M = 6_371_000;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function formatDistance(
  meters: number | null | undefined,
  locale: "en" | "ko",
): string {
  if (meters == null) return "";
  if (meters === 0) return locale === "ko" ? "근처" : "Nearby";
  if (meters < 1000) {
    const m = Math.round(meters);
    return locale === "ko" ? `${m}m` : `${m} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return locale === "ko" ? `${km}km` : `${km} km`;
}
