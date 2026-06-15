export type ConditionStatus = "good" | "warning" | "bad" | "neutral";

export type PlaceCategory = "cafe" | "restaurant" | "travel";
export type CategoryFilterValue = "all" | PlaceCategory;

export type IndoorFilter = "all" | "indoor" | "outdoor" | "partial-area" | "exclude-unknown";
export type CarrierFilter = "all" | "required" | "not-required";
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
  carrierStrollerPolicy: "required" | "not_required" | "unknown" | null;
  maxDogSize: "small" | "medium" | "large" | "unknown" | null;
  leash: "required" | "not_required" | "partial_area" | "unknown" | null;
  muzzle: "required" | "not_required" | "conditional" | "unknown" | null;
  caution: string | null;
  latestVerifiedAt: string | null;
  verificationMethod: string | null;
}

export type HomePlaceItem = Pick<
  PlaceListItem,
  | "id"
  | "nameKr"
  | "nameEn"
  | "category"
  | "address"
  | "thumbnailUrl"
  | "indoor"
  | "carrierStrollerPolicy"
  | "maxDogSize"
  | "latestVerifiedAt"
>;

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
    breedRestrictions: string | null;
    requiredItems: string[];
    cautions: string | null;
  } | null;
  latestVerification: {
    verifiedAt: string;
    method: string;
    note: string | null;
  } | null;
}
