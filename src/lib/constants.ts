export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export {
  CARRIER_STROLLER_POLICIES,
  INDOOR_POLICIES,
  LEASH_POLICIES,
  MAX_DOG_SIZES,
  MUZZLE_POLICIES,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
} from "@/lib/places/constants";
export type {
  CarrierStrollerPolicy,
  IndoorPolicy,
  LeashPolicy,
  MaxDogSize,
  MuzzlePolicy,
  PlaceCategory,
  PlaceVisibilityType,
  RequiredItem,
} from "@/lib/places/constants";

// Used for Dog.size — do NOT add UNKNOWN here
export const DOG_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

export const VERIFICATION_METHODS = ["PHONE", "DM", "WEBSITE", "ON_SITE", "USER_REPORT"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const REPORT_REASONS = ["WRONG_INFO", "PERMANENTLY_CLOSED", "POLICY_CHANGED", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUS = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatusType = (typeof REPORT_STATUS)[number];

// Type-only sanity checks
const _localeCheck: SupportedLocale = DEFAULT_LOCALE;
void _localeCheck;
