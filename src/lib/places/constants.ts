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

/**
 * 이미지 이용 조건 (결정 D-22).
 * 공공누리 네 유형은 **모두 출처 표시를 요구한다**. UNKNOWN은 "제한 없음"이 아니라
 * "확인되지 않음"이며, 확인되지 않은 이미지는 공개 화면에 나가지 않는다.
 */
export const IMAGE_LICENSE_TYPES = [
  "KOGL_TYPE1",
  "KOGL_TYPE2",
  "KOGL_TYPE3",
  "KOGL_TYPE4",
  "UNKNOWN",
] as const;
export type ImageLicenseTypeValue = (typeof IMAGE_LICENSE_TYPES)[number];

/**
 * 주차 가능 여부. `UNKNOWN`은 "주차 불가"가 아니라 **"확인되지 않음"**이다.
 * 요금·대수 같은 세부는 코드로 닫을 수 없어 `parkingNote` 한 줄이 받는다.
 */
export const PARKING_AVAILABILITY = ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"] as const;
export type ParkingAvailabilityValue = (typeof PARKING_AVAILABILITY)[number];

/** `Place.parkingNote` 최대 길이. 주차 가능 여부 본체를 대신하는 용도가 아니다. */
export const PARKING_NOTE_MAX_LENGTH = 100;

/** `Place.descriptionKr` / `descriptionEn` 최대 길이. */
export const DESCRIPTION_MAX_LENGTH = 2000;

/** `Place.usageGuideKr` / `usageGuideEn` 최대 길이. 운영·이용 안내 원문을 담는다. */
export const USAGE_GUIDE_MAX_LENGTH = 2000;

export const PLACE_VISIBILITY = ["VISIBLE", "HIDDEN", "DRAFT"] as const;
export type PlaceVisibilityType = (typeof PLACE_VISIBILITY)[number];
