import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { HOME_CATEGORY_PLACE_LIMIT, MVP_PLACE_CATEGORIES } from "@/lib/places/constants";
import { readOperatingHours, type OperatingHours } from "@/lib/places/operating-hours";
import { readPolicyDetails, type PolicyDetailsRead } from "@/lib/places/policy-details";
import type {
  CategoryFilterValue,
  CategoryPlacesResult,
  PlaceDetail,
  PlaceListItem,
} from "@/types/place";


// MVP 카테고리 탭은 음식점·카페·여행지만 다룬다. `전체` 범위는 MVP_PLACE_CATEGORIES가 정한다.
const CATEGORY_FILTER_TO_ENUM = {
  restaurant: "RESTAURANT",
  cafe: "CAFE",
  travel: "TRAVEL",
} as const;

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
    case "NOT_REQUIRED": return "not_required";
    case "REQUIRED_INDOOR": return "required_indoor";
    case "REQUIRED_ALWAYS": return "required_always";
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

export function mapVaccinationCertificatePolicy(
  policy: string,
): "required" | "not_required" | "unknown" {
  switch (policy) {
    case "REQUIRED": return "required";
    case "NOT_REQUIRED": return "not_required";
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

// Shared so favorites (and other list views) map places identically via toPlaceListItem.
export const placeListSelect = {
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
      breedRestrictions: true,
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
} satisfies Prisma.PlaceSelect;

/**
 * 사용자 화면에 내보낼 수 있는 장소의 조건 (결정 D-07).
 *
 * `VISIBLE`인 것만으로는 부족하다. 확인 방법과 확인일이 담긴 검증 이력이 최소 1건 있어야
 * 공개한다. 검증 이력이 없는 장소는 조회에서 빠질 뿐이며, 공개 상태를 유지하려고 임시
 * 확인일을 만들어 넣지 않는다.
 */
const PUBLIC_PLACE_WHERE = {
  visibility: "VISIBLE",
  verifications: { some: {} },
} as const satisfies Prisma.PlaceWhereInput;

async function findPlaces() {
  return prisma.place.findMany({
    // 홈 `전체` 탭과 결과 범위를 맞춘다. ETC는 목록 카테고리 칩이 없으므로 여기서도 제외한다.
    where: { ...PUBLIC_PLACE_WHERE, category: { in: [...MVP_PLACE_CATEGORIES] } },
    select: placeListSelect,
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
    breedRestrictions: row.condition?.breedRestrictions ?? null,
    caution: row.condition?.cautions ?? null,
    latestVerifiedAt: latestVerification
      ? formatVerifiedAt(latestVerification.verifiedAt)
      : null,
    verificationMethod: latestVerification
      ? mapVerificationMethod(String(latestVerification.method))
      : null,
  };
}

/**
 * 홈 카테고리 탭용 조회.
 * 선택한 카테고리를 DB에서 걸러 필요한 카드 수만 가져온다. 전체 장소를 내려받아 클라이언트에서 거르지 않는다.
 */
export async function getCategoryPlaces(
  category: CategoryFilterValue,
): Promise<CategoryPlacesResult> {
  const where: Prisma.PlaceWhereInput = {
    ...PUBLIC_PLACE_WHERE,
    category:
      category === "all"
        ? { in: [...MVP_PLACE_CATEGORIES] }
        : CATEGORY_FILTER_TO_ENUM[category],
  };

  const [rows, totalCount] = await Promise.all([
    prisma.place.findMany({
      where,
      select: placeListSelect,
      orderBy: { updatedAt: "desc" },
      take: HOME_CATEGORY_PLACE_LIMIT,
    }),
    prisma.place.count({ where }),
  ]);

  return { places: rows.map((row) => toPlaceListItem(row)), totalCount };
}

/**
 * 깨진 JSON을 "조건 없음"으로 조용히 넘기지 않는다.
 * 표시에서는 미확인으로 떨어지되 어느 장소가 잘못됐는지는 로그에 남겨 고칠 수 있게 한다.
 */
function readPolicyDetailsOrWarn(placeId: string, value: unknown) {
  const read = readPolicyDetails(value);
  if (read.status === "invalid") {
    console.warn(
      `[places] policyDetails 형식 오류 place=${placeId}: ${read.issues.join(", ")}`,
    );
  }
  return read.value;
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
      hours: true,
      hoursNote: true,
      visibility: true,
      condition: {
        select: {
          indoor: true,
          carrierStrollerPolicy: true,
          maxDogSize: true,
          leash: true,
          muzzle: true,
          vaccinationCertificatePolicy: true,
          breedRestrictions: true,
          requiredItems: true,
          cautions: true,
          policyDetails: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
          method: true,
          note: true,
          rawPolicyText: true,
          sourceLanguages: true,
          sourceUrl: true,
        },
      },
    },
  });

  // `findUnique`는 관계 조건을 받지 못하므로, 이미 조회한 검증 이력으로 같은 규칙을 적용한다.
  const isPublic =
    place != null &&
    place.visibility === "VISIBLE" &&
    place.verifications.length > 0;

  if (!isPublic) return null;

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
    // 형식이 깨진 값은 null로 내린다. 화면에서 "입력 없음"과 같이 보이지만, 깨진 값을
    // 억지로 렌더해 잘못된 영업시간을 보여주는 것보다 낫다.
    hours: readOperatingHours(place.hours).value,
    hoursNote: place.hoursNote ?? null,
    condition: place.condition
      ? {
          indoor: mapIndoorPolicy(String(place.condition.indoor)),
          carrierStrollerPolicy: mapCarrierStrollerPolicy(
            String(place.condition.carrierStrollerPolicy),
          ),
          maxDogSize: mapMaxDogSize(String(place.condition.maxDogSize)),
          leash: mapLeashPolicy(String(place.condition.leash)),
          muzzle: mapMuzzlePolicy(String(place.condition.muzzle)),
          vaccinationCertificatePolicy: mapVaccinationCertificatePolicy(
            String(place.condition.vaccinationCertificatePolicy),
          ),
          breedRestrictions: place.condition.breedRestrictions ?? null,
          requiredItems: place.condition.requiredItems as string[],
          cautions: place.condition.cautions ?? null,
          policyDetails: readPolicyDetailsOrWarn(place.id, place.condition.policyDetails),
        }
      : null,
    latestVerification: latestVerification
      ? {
          verifiedAt: formatVerifiedAt(latestVerification.verifiedAt),
          method: mapVerificationMethod(String(latestVerification.method)),
          note: latestVerification.note ?? null,
          rawPolicyText: latestVerification.rawPolicyText ?? null,
          sourceLanguages: latestVerification.sourceLanguages,
          sourceUrl: latestVerification.sourceUrl ?? null,
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
  /** 형식이 깨졌으면 null. 편집기가 깨진 값을 조용히 덮어쓰지 않도록 읽기에서 걸러 낸다. */
  hours: OperatingHours | null;
  hoursNote: string | null;
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
    vaccinationCertificatePolicy: string;
    breedRestrictions: string | null;
    requiredItems: string[];
    cautions: string | null;
    /**
     * 구조화된 상세 조건 읽기 결과.
     * empty·ok·invalid를 구분해 넘긴다 — 깨진 값을 편집기가 조용히 빈 값으로 덮어쓰지 않게.
     */
    policyDetails: PolicyDetailsRead;
  } | null;
  latestVerification: {
    method: string;
    verifiedAt: string;
    note: string | null;
    verifiedBy: string;
    /** 확인 당시의 안내문 원문. 폼에 다시 채워 넣어 수정 이력을 이어붙인다. */
    rawPolicyText: string | null;
    sourceLanguages: string[];
    sourceUrl: string | null;
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
      hours: true,
      hoursNote: true,
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
          vaccinationCertificatePolicy: true,
          breedRestrictions: true,
          requiredItems: true,
          cautions: true,
          policyDetails: true,
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
          rawPolicyText: true,
          sourceLanguages: true,
          sourceUrl: true,
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
    hours: readOperatingHours(place.hours).value,
    hoursNote: place.hoursNote ?? null,
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
          vaccinationCertificatePolicy: String(place.condition.vaccinationCertificatePolicy),
          breedRestrictions: place.condition.breedRestrictions ?? null,
          requiredItems: place.condition.requiredItems as string[],
          cautions: place.condition.cautions ?? null,
          policyDetails: readPolicyDetails(place.condition.policyDetails),
        }
      : null,
    latestVerification: latestVerification
      ? {
          method: String(latestVerification.method),
          verifiedAt: formatDateForInput(latestVerification.verifiedAt),
          note: latestVerification.note ?? null,
          verifiedBy: latestVerification.verifiedBy,
          rawPolicyText: latestVerification.rawPolicyText ?? null,
          sourceLanguages: latestVerification.sourceLanguages,
          sourceUrl: latestVerification.sourceUrl ?? null,
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
