export const PLACE_CATEGORIES = ["RESTAURANT", "CAFE", "TRAVEL", "ETC"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

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
