import type { PolicyDetails } from "@/lib/places/policy-details";

export type ConditionStatus = "good" | "warning" | "bad" | "neutral";

export type PlaceCategory = "cafe" | "restaurant" | "travel";
export type CategoryFilterValue = "all" | PlaceCategory;

export type IndoorFilter = "all" | "indoor" | "outdoor" | "partial-area";
export type CarrierFilter = "all" | "not-required" | "can-bring";
export type DogSizeFilter = "all" | "small" | "medium" | "large";
export type RecentFilter = "all" | "30days" | "90days";
export type SortOption = "distance" | "recent" | "indoor-first" | "no-carrier-first";

export interface PlaceFilters {
  indoor: IndoorFilter;
  carrier: CarrierFilter;
  dogSize: DogSizeFilter;
  recent: RecentFilter;
}

export interface PlaceListItem {
  id: string;
  nameKr: string;
  nameEn: string | null;
  category: "cafe" | "restaurant" | "travel" | "etc";
  address: string;
  phone: string | null;
  location: { lat: number; lng: number } | null;
  distanceMeters: number | null;
  thumbnailUrl: string | null;
  indoor: "allowed" | "outdoor_only" | "partial_area" | "not_allowed" | "unknown" | null;
  carrierStrollerPolicy: "not_required" | "required_indoor" | "required_always" | "unknown" | null;
  maxDogSize: "small" | "medium" | "large" | "unknown" | null;
  leash: "required" | "not_required" | "partial_area" | "unknown" | null;
  muzzle: "required" | "not_required" | "conditional" | "unknown" | null;
  /** 자유 텍스트. 반려견 판정에서는 "확인 필요" 신호로만 쓴다. */
  breedRestrictions: string | null;
  caution: string | null;
  latestVerifiedAt: string | null;
  verificationMethod: string | null;
}

export interface CategoryPlacesResult {
  places: PlaceListItem[];
  /** 해당 카테고리의 전체 공개 장소 수. places는 조회 limit 만큼만 담는다. */
  totalCount: number;
}

export interface PlaceDetail {
  id: string;
  nameKr: string;
  nameEn: string | null;
  category: "cafe" | "restaurant" | "travel" | "etc";
  address: string;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  thumbnailUrl: string | null;
  location: { lat: number; lng: number } | null;
  condition: {
    indoor: PlaceListItem["indoor"];
    carrierStrollerPolicy: PlaceListItem["carrierStrollerPolicy"];
    maxDogSize: PlaceListItem["maxDogSize"];
    leash: PlaceListItem["leash"];
    muzzle: PlaceListItem["muzzle"];
    vaccinationCertificatePolicy: "required" | "not_required" | "unknown" | null;
    breedRestrictions: string | null;
    requiredItems: string[];
    cautions: string | null;
    /** 스키마와 맞지 않거나 아직 구조화되지 않은 장소는 null이다. */
    policyDetails: PolicyDetails | null;
  } | null;
  latestVerification: {
    verifiedAt: string;
    method: string;
    note: string | null;
    /** 확인 당시의 안내문 원문. 표시용 문구가 아니라 근거 자료다. */
    rawPolicyText: string | null;
    sourceLanguages: string[];
    sourceUrl: string | null;
  } | null;
}
