import type { ImageAttributionDisplay } from "@/lib/places/image-attribution";
import type { OperatingHours } from "@/lib/places/operating-hours";
import type { PolicyDetails } from "@/lib/places/policy-details";

export type ConditionStatus = "good" | "warning" | "bad" | "neutral";

export type PlaceCategory = "cafe" | "restaurant" | "travel";
export type CategoryFilterValue = "all" | PlaceCategory;

export type IndoorFilter = "all" | "indoor" | "outdoor" | "partial-area";
export type CarrierFilter = "all" | "not-required";
export type DogSizeFilter = "all" | "small" | "medium" | "large";
export type RecentFilter = "all" | "90days";
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
  /**
   * 공개해도 되는 대표 이미지. 출처 표시가 필요한데 근거가 없으면 조회에서 이미 null이다
   * (`publicImageFields`). 화면은 이 값만 보고 사진 자리를 만든다.
   */
  thumbnailUrl: string | null;
  /** 이미지에 붙는 출처. 출처 조건이 없는 이미지는 null이다. */
  imageAttribution: ImageAttributionDisplay | null;
  indoor: "allowed" | "outdoor_only" | "partial_area" | "not_allowed" | "unknown" | null;
  carrierStrollerPolicy: "not_required" | "required_indoor" | "required_always" | "unknown" | null;
  maxDogSize: "small" | "medium" | "large" | "unknown" | null;
  leash: "required" | "not_required" | "partial_area" | "unknown" | null;
  muzzle: "required" | "not_required" | "conditional" | "unknown" | null;
  /** 자유 텍스트. 반려견 판정에서는 "확인 필요" 신호로만 쓴다. */
  breedRestrictions: string | null;
  /**
   * 구조화된 상세 조건. 요약 컬럼만으로는 `실내 불가 · 야외 미확인`을 표현할 수 없어
   * 목록에서도 함께 읽는다. 형식이 깨졌거나 아직 구조화되지 않은 장소는 null이다(상세와 같다).
   */
  policyDetails: PolicyDetails | null;
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
  /** 목록과 같은 판정을 거친 값이다. 출처 근거가 없는 이미지는 여기서도 null이다. */
  thumbnailUrl: string | null;
  imageAttribution: ImageAttributionDisplay | null;
  location: { lat: number; lng: number } | null;
  /** 형식이 깨졌거나 아직 입력되지 않은 장소는 null이다(결정 D-04). */
  hours: OperatingHours | null;
  hoursNote: string | null;
  /**
   * 장소 소개. **언어별로 나눠 둔다.** 한국어 원문을 영어 UI에 그대로 내보내면
   * 영문 설명이 있는 것처럼 보인다. 화면은 없는 쪽을 만들어 내지 않는다.
   */
  descriptionKr: string | null;
  descriptionEn: string | null;
  /** `unknown`은 "주차 불가"가 아니라 "확인되지 않음"이다. */
  parking: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  parkingNote: string | null;
  /** `hours`로 옮길 수 없는 운영·이용 안내. 범위(계절·시설)를 지우지 않고 그대로 둔다. */
  usageGuideKr: string | null;
  usageGuideEn: string | null;
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
