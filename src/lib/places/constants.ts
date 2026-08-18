export const PLACE_CATEGORIES = ["RESTAURANT", "CAFE", "TRAVEL", "ETC"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

/**
 * MVP에서 `전체`가 뜻하는 카테고리.
 * 홈 카테고리 탭과 /places 목록이 같은 범위를 보도록 두 조회가 이 값을 공유한다.
 * ETC는 어느 쪽에도 탭·칩이 없으므로 `전체`에서 제외한다.
 */
export const MVP_PLACE_CATEGORIES = [
  "RESTAURANT",
  "CAFE",
  "TRAVEL",
] as const satisfies readonly PlaceCategory[];

/** 홈 카테고리 탭이 한 번에 보여주는 카드 수 (데스크톱 4열 × 2줄) */
export const HOME_CATEGORY_PLACE_LIMIT = 8;

// Used for PlaceCondition.maxDogSize (max allowed dog size at a place)
export const MAX_DOG_SIZES = ["SMALL", "MEDIUM", "LARGE", "UNKNOWN"] as const;
export type MaxDogSize = (typeof MAX_DOG_SIZES)[number];

export const INDOOR_POLICIES = ["ALLOWED", "OUTDOOR_ONLY", "PARTIAL_AREA", "NOT_ALLOWED", "UNKNOWN"] as const;
export type IndoorPolicy = (typeof INDOOR_POLICIES)[number];

export const CARRIER_STROLLER_POLICIES = ["NOT_REQUIRED", "REQUIRED_INDOOR", "REQUIRED_ALWAYS", "UNKNOWN"] as const;
export type CarrierStrollerPolicy = (typeof CARRIER_STROLLER_POLICIES)[number];

export const LEASH_POLICIES = ["REQUIRED", "NOT_REQUIRED", "PARTIAL_AREA", "UNKNOWN"] as const;
export type LeashPolicy = (typeof LEASH_POLICIES)[number];

export const MUZZLE_POLICIES = ["REQUIRED", "NOT_REQUIRED", "CONDITIONAL", "UNKNOWN"] as const;
export type MuzzlePolicy = (typeof MUZZLE_POLICIES)[number];

export const VACCINATION_CERTIFICATE_POLICIES = ["REQUIRED", "NOT_REQUIRED", "UNKNOWN"] as const;
export type VaccinationCertificatePolicy = (typeof VACCINATION_CERTIFICATE_POLICIES)[number];

// CARRIER, STROLLER, LEASH, MUZZLE removed — now covered by dedicated enum fields
export const REQUIRED_ITEMS = ["POOP_BAG"] as const;
export type RequiredItem = (typeof REQUIRED_ITEMS)[number];

export const PLACE_VISIBILITY = ["VISIBLE", "HIDDEN", "DRAFT"] as const;
export type PlaceVisibilityType = (typeof PLACE_VISIBILITY)[number];
