export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export {
  CARRIER_STROLLER_POLICIES,
  IMAGE_LICENSE_TYPES,
  INDOOR_POLICIES,
  LEASH_POLICIES,
  MAX_DOG_SIZES,
  MUZZLE_POLICIES,
  DESCRIPTION_MAX_LENGTH,
  PARKING_AVAILABILITY,
  PARKING_NOTE_MAX_LENGTH,
  USAGE_GUIDE_MAX_LENGTH,
  PLACE_CATEGORIES,
  PLACE_VISIBILITY,
  REQUIRED_ITEMS,
  VACCINATION_CERTIFICATE_POLICIES,
} from "@/lib/places/constants";
export type {
  CarrierStrollerPolicy,
  ImageLicenseTypeValue,
  IndoorPolicy,
  LeashPolicy,
  MaxDogSize,
  MuzzlePolicy,
  ParkingAvailabilityValue,
  PlaceCategory,
  PlaceVisibilityType,
  RequiredItem,
  VaccinationCertificatePolicy,
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
