export type PlaceCategory = "cafe" | "restaurant" | "travel";
export type ConditionStatus = "good" | "warning" | "bad";
export type DogSize = "small" | "medium" | "large";
export type VerificationMethod = "DM" | "전화" | "방문 확인" | "홈페이지";

export type CategoryFilterValue = "all" | PlaceCategory;
export type IndoorFilter = "all" | "indoor" | "outdoor" | "exclude-unknown";
export type CarrierFilter = "all" | "not-required" | "required" | "stroller-ok";
export type RecentFilter = "all" | "30days" | "90days";
export type SortOption = "distance" | "recent" | "indoor-first" | "no-carrier-first";

export interface PlaceFilters {
  indoor: IndoorFilter;
  carrier: CarrierFilter;
  dogSizes: DogSize[];
  recent: RecentFilter;
}

export interface Place {
  id: number;
  name: string;
  category: PlaceCategory;
  area: string;
  address: string;
  distanceKm: number;
  indoorAllowed: boolean | null;
  carrierRequired: boolean | null;
  dogSizesAllowed: DogSize[];
  caution: string | null;
  verifiedAt: string;
  verificationMethod: VerificationMethod;
  lat: number;
  lng: number;
}

export interface PlaceListItem {
  id: string;
  nameKr: string;
  nameEn: string | null;
  category: "cafe" | "restaurant" | "travel" | "etc";
  address: string;
  thumbnailUrl: string | null;
  indoorAllowed: boolean | null;
  carrierRequired: boolean | null;
  strollerAllowed: boolean | null;
  dogSizesAllowed: DogSize[];
  caution: string | null;
  latestVerifiedAt: string | null;
  verificationMethod: string | null;
}
