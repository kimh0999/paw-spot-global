export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const PLACE_CATEGORIES = ["RESTAURANT", "CAFE", "TRAVEL", "ETC"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

// Used for Dog.size — do NOT add UNKNOWN here
export const DOG_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

// Used for PlaceCondition.maxDogSize (max allowed dog size at a place)
export const MAX_DOG_SIZES = ["SMALL", "MEDIUM", "LARGE", "UNKNOWN"] as const;
export type MaxDogSize = (typeof MAX_DOG_SIZES)[number];

export const INDOOR_POLICIES = ["ALLOWED", "OUTDOOR_ONLY", "PARTIAL_AREA", "NOT_ALLOWED", "UNKNOWN"] as const;
export type IndoorPolicy = (typeof INDOOR_POLICIES)[number];

export const CARRIER_STROLLER_POLICIES = ["REQUIRED", "NOT_REQUIRED", "UNKNOWN"] as const;
export type CarrierStrollerPolicy = (typeof CARRIER_STROLLER_POLICIES)[number];

export const LEASH_POLICIES = ["REQUIRED", "NOT_REQUIRED", "PARTIAL_AREA", "UNKNOWN"] as const;
export type LeashPolicy = (typeof LEASH_POLICIES)[number];

export const MUZZLE_POLICIES = ["REQUIRED", "NOT_REQUIRED", "CONDITIONAL", "UNKNOWN"] as const;
export type MuzzlePolicy = (typeof MUZZLE_POLICIES)[number];

// CARRIER, STROLLER, LEASH, MUZZLE removed — now covered by dedicated enum fields
export const REQUIRED_ITEMS = ["POOP_BAG"] as const;
export type RequiredItem = (typeof REQUIRED_ITEMS)[number];

export const VERIFICATION_METHODS = ["PHONE", "DM", "WEBSITE", "ON_SITE", "USER_REPORT"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const PLACE_VISIBILITY = ["VISIBLE", "HIDDEN", "DRAFT"] as const;
export type PlaceVisibilityType = (typeof PLACE_VISIBILITY)[number];

export const REPORT_REASONS = ["WRONG_INFO", "PERMANENTLY_CLOSED", "POLICY_CHANGED", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUS = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatusType = (typeof REPORT_STATUS)[number];

// Type-only sanity checks
const _localeCheck: SupportedLocale = DEFAULT_LOCALE;
const _categoryCheck: PlaceCategory = "CAFE";
void _localeCheck;
void _categoryCheck;
