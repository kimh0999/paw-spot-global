import { prisma } from "@/lib/db/prisma";
import type {
  HomePlaceItem,
  PlaceDetail,
  PlaceListItem,
} from "@/types/place";

const HOME_PLACE_LIMIT = 6;

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

export async function getHomePlaces(): Promise<HomePlaceItem[]> {
  const rows = await prisma.place.findMany({
    where: { visibility: "VISIBLE" },
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      thumbnailUrl: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: HOME_PLACE_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    nameKr: row.nameKr,
    nameEn: row.nameEn ?? null,
    category: mapCategory(String(row.category)),
    address: row.address,
    thumbnailUrl: row.thumbnailUrl ?? null,
    indoor: row.condition
      ? mapIndoorPolicy(String(row.condition.indoor))
      : null,
    carrierStrollerPolicy: row.condition
      ? mapCarrierStrollerPolicy(String(row.condition.carrierStrollerPolicy))
      : null,
    maxDogSize: row.condition
      ? mapMaxDogSize(String(row.condition.maxDogSize))
      : null,
    latestVerifiedAt: row.verifications[0]
      ? formatVerifiedAt(row.verifications[0].verifiedAt)
      : null,
  }));
}

export async function getPlaceById(id: string): Promise<PlaceDetail | null> {
  const place = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      phone: true,
      website: true,
      instagram: true,
      thumbnailUrl: true,
      visibility: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
          leash: true,
          muzzle: true,
          breedRestrictions: true,
          requiredItems: true,
          cautions: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
          method: true,
          note: true,
        },
      },
    },
  });

  if (!place || place.visibility !== "VISIBLE") return null;

  const coords = await prisma.$queryRaw<
    Array<{ id: string; lat: unknown; lng: unknown }>
  >`
    SELECT
      id,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM "Place"
    WHERE id = ${id}
  `;
  const coord = coords[0];
  const lat = toNumberOrNull(coord?.lat);
  const lng = toNumberOrNull(coord?.lng);

  const latestVerification = place.verifications[0] ?? null;

  return {
    id: place.id,
    nameKr: place.nameKr,
    nameEn: place.nameEn ?? null,
    category: mapCategory(String(place.category)),
    address: place.address,
    phone: place.phone ?? null,
    website: place.website ?? null,
    instagram: place.instagram ?? null,
    thumbnailUrl: place.thumbnailUrl ?? null,
    location: lat != null && lng != null ? { lat, lng } : null,
    condition: place.condition
      ? {
          indoor: mapIndoorPolicy(String(place.condition.indoor)),
          carrierStrollerPolicy: mapCarrierStrollerPolicy(
            String(place.condition.carrierStrollerPolicy),
          ),
          maxDogSize: mapMaxDogSize(String(place.condition.maxDogSize)),
          leash: mapLeashPolicy(String(place.condition.leash)),
          muzzle: mapMuzzlePolicy(String(place.condition.muzzle)),
          breedRestrictions: place.condition.breedRestrictions ?? null,
          requiredItems: place.condition.requiredItems as string[],
          cautions: place.condition.cautions ?? null,
        }
      : null,
    latestVerification: latestVerification
      ? {
          verifiedAt: formatVerifiedAt(latestVerification.verifiedAt),
          method: mapVerificationMethod(String(latestVerification.method)),
          note: latestVerification.note ?? null,
        }
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

export interface AdminPlaceRow {
  id: string;
  nameKr: string;
  nameEn: string | null;
  category: string;
  address: string;
  visibility: string;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  condition: {
    indoor: string;
    carrierStrollerPolicy: string;
    maxDogSize: string;
  } | null;
  latestVerification: {
    verifiedAt: string;
    method: string;
    note: string | null;
  } | null;
}

function formatDateForInput(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface AdminPlaceDetail {
  id: string;
  nameKr: string;
  nameEn: string | null;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  thumbnailUrl: string | null;
  tourApiId: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  condition: {
    indoor: string;
    carrierStrollerPolicy: string;
    maxDogSize: string;
    leash: string;
    muzzle: string;
    breedRestrictions: string | null;
    requiredItems: string[];
    cautions: string | null;
  } | null;
  latestVerification: {
    method: string;
    verifiedAt: string;
    note: string | null;
    verifiedBy: string;
  } | null;
}

export async function getAdminPlaceById(id: string): Promise<AdminPlaceDetail | null> {
  const place = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      phone: true,
      website: true,
      instagram: true,
      thumbnailUrl: true,
      tourApiId: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
          leash: true,
          muzzle: true,
          breedRestrictions: true,
          requiredItems: true,
          cautions: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          method: true,
          verifiedAt: true,
          note: true,
          verifiedBy: true,
        },
      },
    },
  });

  if (!place) return null;

  const coords = await prisma.$queryRaw<Array<{ id: string; lat: unknown; lng: unknown }>>`
    SELECT
      id,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM "Place"
    WHERE id = ${id}
  `;
  const coord = coords[0];
  const lat = toNumberOrNull(coord?.lat);
  const lng = toNumberOrNull(coord?.lng);

  const latestVerification = place.verifications[0] ?? null;

  return {
    id: place.id,
    nameKr: place.nameKr,
    nameEn: place.nameEn ?? null,
    category: String(place.category),
    address: place.address,
    lat,
    lng,
    phone: place.phone ?? null,
    website: place.website ?? null,
    instagram: place.instagram ?? null,
    thumbnailUrl: place.thumbnailUrl ?? null,
    tourApiId: place.tourApiId ?? null,
    visibility: String(place.visibility),
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    condition: place.condition
      ? {
          indoor: String(place.condition.indoor),
          carrierStrollerPolicy: String(place.condition.carrierStrollerPolicy),
          maxDogSize: String(place.condition.maxDogSize),
          leash: String(place.condition.leash),
          muzzle: String(place.condition.muzzle),
          breedRestrictions: place.condition.breedRestrictions ?? null,
          requiredItems: place.condition.requiredItems as string[],
          cautions: place.condition.cautions ?? null,
        }
      : null,
    latestVerification: latestVerification
      ? {
          method: String(latestVerification.method),
          verifiedAt: formatDateForInput(latestVerification.verifiedAt),
          note: latestVerification.note ?? null,
          verifiedBy: latestVerification.verifiedBy,
        }
      : null,
  };
}

export async function getAdminPlaces(): Promise<AdminPlaceRow[]> {
  const rows = await prisma.place.findMany({
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      visibility: true,
      thumbnailUrl: true,
      createdAt: true,
      updatedAt: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
          method: true,
          note: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    nameKr: row.nameKr,
    nameEn: row.nameEn ?? null,
    category: String(row.category),
    address: row.address,
    visibility: String(row.visibility),
    thumbnailUrl: row.thumbnailUrl ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    condition: row.condition
      ? {
          indoor: String(row.condition.indoor),
          carrierStrollerPolicy: String(row.condition.carrierStrollerPolicy),
          maxDogSize: String(row.condition.maxDogSize),
        }
      : null,
    latestVerification: row.verifications[0]
      ? {
          verifiedAt: formatVerifiedAt(row.verifications[0].verifiedAt),
          method: mapVerificationMethod(String(row.verifications[0].method)),
          note: row.verifications[0].note ?? null,
        }
      : null,
  }));
}
