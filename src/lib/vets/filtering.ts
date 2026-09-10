import { isVetDistrict, type VetDistrict } from "./constants";
import type { VetClinicListItem } from "./types";
import { isServiceConfirmed } from "./verification";

/**
 * 목록의 검색·구 선택·필터·정렬. 화면은 이 함수만 쓰고 판정을 복제하지 않는다.
 */

export type VetSort = "recent" | "distance";

export interface VetListParams {
  /** 병원명(한/영)·주소 검색어 */
  query: string;
  district: VetDistrict | "all";
  /** `안내 확인` 필터 (D-19) */
  englishConfirmed: boolean;
  afterHoursConfirmed: boolean;
  sort: VetSort;
}

export const DEFAULT_VET_LIST_PARAMS: VetListParams = {
  query: "",
  district: "all",
  englishConfirmed: false,
  afterHoursConfirmed: false,
  sort: "recent",
};

/** URL 쿼리 → 파라미터. 잘못된 값은 오류가 아니라 기본값으로 떨어진다. */
export function parseVetListParams(
  searchParams: Record<string, string | string[] | undefined>,
): VetListParams {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const district = first(searchParams.district);
  const sort = first(searchParams.sort);

  return {
    query: (first(searchParams.q) ?? "").trim(),
    district: district && isVetDistrict(district) ? district : "all",
    englishConfirmed: first(searchParams.english) === "confirmed",
    afterHoursConfirmed: first(searchParams.night) === "confirmed",
    // 거리순은 위치가 있어야 쓸 수 있다. 위치 없는 거리순 요청은 최근 확인순으로 떨어진다.
    sort: sort === "distance" ? "distance" : "recent",
  };
}

function matchesQuery(clinic: VetClinicListItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    clinic.nameKr.toLowerCase().includes(q) ||
    (clinic.nameEn?.toLowerCase().includes(q) ?? false) ||
    clinic.address.toLowerCase().includes(q)
  );
}

/**
 * 가장 최근 확인 시각. 정렬 기준을 화면이 명시할 수 있도록 **항목을 가리지 않고**
 * 네 항목 중 가장 최근 값을 쓴다.
 */
export function latestVerifiedAt(clinic: VetClinicListItem): number {
  const times = [
    clinic.verification.basic,
    clinic.verification.hours,
    clinic.verification.englishSupport,
    clinic.verification.afterHours,
  ]
    .map((item) => item.evidence?.verifiedAt.getTime())
    .filter((time): time is number => time != null);

  return times.length > 0 ? Math.max(...times) : 0;
}

export function filterVetClinics(
  clinics: readonly VetClinicListItem[],
  params: VetListParams,
): VetClinicListItem[] {
  return clinics.filter((clinic) => {
    if (!matchesQuery(clinic, params.query)) return false;
    if (params.district !== "all" && clinic.district !== params.district) return false;

    // D-19 — 유효한 근거가 있는 가능·조건부만 통과한다.
    if (
      params.englishConfirmed &&
      !isServiceConfirmed(clinic.englishSupport, clinic.verification.englishSupport)
    ) {
      return false;
    }
    if (
      params.afterHoursConfirmed &&
      !isServiceConfirmed(clinic.afterHours, clinic.verification.afterHours)
    ) {
      return false;
    }

    return true;
  });
}

export function sortVetClinics(
  clinics: readonly VetClinicListItem[],
  sort: VetSort,
): VetClinicListItem[] {
  const sorted = [...clinics];

  if (sort === "distance") {
    // 좌표가 없으면 거리를 만들지 않는다. 거리순에서는 위치가 확인된 병원 뒤에 둔다.
    return sorted.sort((a, b) => {
      if (a.distanceMeters != null && b.distanceMeters != null) {
        return a.distanceMeters - b.distanceMeters;
      }
      if (a.distanceMeters != null) return -1;
      if (b.distanceMeters != null) return 1;
      return latestVerifiedAt(b) - latestVerifiedAt(a);
    });
  }

  return sorted.sort((a, b) => latestVerifiedAt(b) - latestVerifiedAt(a));
}

export function getVetClinics(
  clinics: readonly VetClinicListItem[],
  params: VetListParams,
): VetClinicListItem[] {
  return sortVetClinics(filterVetClinics(clinics, params), params.sort);
}

export function getActiveVetFilterCount(params: VetListParams): number {
  return (
    (params.district !== "all" ? 1 : 0) +
    (params.englishConfirmed ? 1 : 0) +
    (params.afterHoursConfirmed ? 1 : 0)
  );
}
