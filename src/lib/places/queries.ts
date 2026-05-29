import { prisma } from "@/lib/db/prisma";
import type { PlaceListItem } from "@/types/place";

export interface GetPlacesOptions {
  lat?: number;
  lng?: number;
  sort?: string;
}

export function mapIndoorPolicy(indoor: string): PlaceListItem["indoor"] {
  switch (indoor) {
    case "ALLOWED": return "allowed";
    case "OUTDOOR_ONLY": return "outdoor_only";
    case "PARTIAL_AREA": return "partial_area";
    case "NOT_ALLOWED": return "not_allowed";
    default: return "unknown";
  }
}

export function mapCarrierStrollerPolicy(policy: string): PlaceListItem["carrierStrollerPolicy"] {
  switch (policy) {
    case "REQUIRED": return "required";
    case "NOT_REQUIRED": return "not_required";
    default: return "unknown";
  }
}

export function mapMaxDogSize(size: string): PlaceListItem["maxDogSize"] {
  switch (size) {
    case "SMALL": return "small";
    case "MEDIUM": return "medium";
    case "LARGE": return "large";
    default: return "unknown";
  }
}

export function mapLeashPolicy(policy: string): PlaceListItem["leash"] {
  switch (policy) {
    case "REQUIRED": return "required";
    case "NOT_REQUIRED": return "not_required";
    case "PARTIAL_AREA": return "partial_area";
    default: return "unknown";
  }
}

export function mapMuzzlePolicy(policy: string): PlaceListItem["muzzle"] {
  switch (policy) {
    case "REQUIRED": return "required";
    case "NOT_REQUIRED": return "not_required";
    case "CONDITIONAL": return "conditional";
    default: return "unknown";
  }
}

export function mapCategory(
  cat: string,
): "cafe" | "restaurant" | "travel" | "etc" {
  if (cat === "CAFE") return "cafe";
  if (cat === "RESTAURANT") return "restaurant";
  if (cat === "TRAVEL") return "travel";
  return "etc";
}

export function mapVerificationMethod(method: string): string {
  switch (method) {
    case "PHONE": return "Phone";
    case "DM": return "DM";
    case "WEBSITE": return "Website";
    case "ON_SITE": return "On-site";
    case "USER_REPORT": return "User report";
    default: return method;
  }
}

function formatVerifiedAt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function findPlaces() {
  return prisma.place.findMany({
    where: { visibility: "VISIBLE" },
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      phone: true,
      thumbnailUrl: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
          leash: true,
          muzzle: true,
          cautions: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
          method: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

type CoordQueryRow = {
  id: string;
  lat: unknown;
  lng: unknown;
  distanceMeters: unknown;
};

async function findPlaceCoordinates(
  userLat?: number,
  userLng?: number,
): Promise<CoordQueryRow[]> {
  if (userLat != null && userLng != null) {
    return prisma.$queryRaw<CoordQueryRow[]>`
      SELECT
        id,
        ST_Y(location::geometry)  AS lat,
        ST_X(location::geometry)  AS lng,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
        )                         AS "distanceMeters"
      FROM "Place"
      WHERE visibility::text = 'VISIBLE'
    `;
  }
  return prisma.$queryRaw<CoordQueryRow[]>`
    SELECT
      id,
      ST_Y(location::geometry)  AS lat,
      ST_X(location::geometry)  AS lng,
      NULL::numeric              AS "distanceMeters"
    FROM "Place"
    WHERE visibility::text = 'VISIBLE'
  `;
}

type RawPlace = Awaited<ReturnType<typeof findPlaces>>[number];

export function toPlaceListItem(row: RawPlace, coord?: CoordQueryRow): PlaceListItem {
  const latestVerification = row.verifications[0] ?? null;

  const lat = toNumberOrNull(coord?.lat);
  const lng = toNumberOrNull(coord?.lng);
  const distanceMeters = toNumberOrNull(coord?.distanceMeters);

  return {
    id: row.id,
    nameKr: row.nameKr,
    nameEn: row.nameEn,
    category: mapCategory(String(row.category)),
    address: row.address,
    phone: row.phone ?? null,
    location: lat != null && lng != null ? { lat, lng } : null,
    distanceMeters,
    thumbnailUrl: row.thumbnailUrl,
    indoor: row.condition
      ? mapIndoorPolicy(String(row.condition.indoor))
      : null,
    carrierStrollerPolicy: row.condition
      ? mapCarrierStrollerPolicy(String(row.condition.carrierStrollerPolicy))
      : null,
    maxDogSize: row.condition
      ? mapMaxDogSize(String(row.condition.maxDogSize))
      : null,
    leash: row.condition
      ? mapLeashPolicy(String(row.condition.leash))
      : null,
    muzzle: row.condition
      ? mapMuzzlePolicy(String(row.condition.muzzle))
      : null,
    caution: row.condition?.cautions ?? null,
    latestVerifiedAt: latestVerification
      ? formatVerifiedAt(latestVerification.verifiedAt)
      : null,
    verificationMethod: latestVerification
      ? mapVerificationMethod(String(latestVerification.method))
      : null,
  };
}

export async function getPlaces(options: GetPlacesOptions = {}): Promise<PlaceListItem[]> {
  const { lat, lng, sort } = options;

  const [rows, coords] = await Promise.all([
    findPlaces(),
    findPlaceCoordinates(lat, lng),
  ]);

  const coordMap = new Map(coords.map((c) => [c.id, c]));
  const items = rows.map((row) => toPlaceListItem(row, coordMap.get(row.id)));

  if (sort === "distance" && lat != null && lng != null) {
    return items.sort(
      (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
    );
  }

  return items;
}
