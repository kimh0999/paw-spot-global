import { getPlaces } from "@/lib/places/queries";
import type { CategoryFilterValue } from "@/types/place";
import PlacesClient from "./PlacesClient";

interface PlacesPageProps {
  searchParams: { lat?: string; lng?: string; sort?: string; category?: string; q?: string };
}

function parseCoord(
  value: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

function parseCategory(value: string | undefined): CategoryFilterValue {
  if (value === "cafe" || value === "restaurant" || value === "travel") return value;
  return "all";
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const lat = parseCoord(searchParams.lat, -90, 90);
  const lng = parseCoord(searchParams.lng, -180, 180);

  const userLocation =
    lat != null && lng != null ? { lat, lng } : null;

  const places = await getPlaces({ lat, lng, sort: searchParams.sort });
  const initialCategory = parseCategory(searchParams.category);
  const initialSearchQuery = searchParams.q ?? "";

  return (
    <PlacesClient
      initialPlaces={places}
      userLocation={userLocation}
      initialCategory={initialCategory}
      initialSearchQuery={initialSearchQuery}
    />
  );
}
