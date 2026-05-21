export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const PLACE_CATEGORIES = ["RESTAURANT", "CAFE", "TRAVEL", "ETC"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const DOG_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

export const REQUIRED_ITEMS = ["LEASH", "POOP_BAG", "CARRIER", "STROLLER", "MUZZLE"] as const;
export type RequiredItem = (typeof REQUIRED_ITEMS)[number];

export const INDOOR_POLICIES = ["ALLOWED", "OUTDOOR_ONLY", "NOT_ALLOWED", "UNKNOWN"] as const;
export type IndoorPolicy = (typeof INDOOR_POLICIES)[number];

export const CARRIER_POLICIES = ["NOT_REQUIRED", "REQUIRED", "OPTIONAL", "UNKNOWN"] as const;
export type CarrierPolicy = (typeof CARRIER_POLICIES)[number];

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
