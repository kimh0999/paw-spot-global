import type {
  CarrierFilter,
  CategoryFilterValue,
  DogSizeFilter,
  IndoorFilter,
  PlaceFilters,
  RecentFilter,
  SortOption,
} from "@/types/place";

/**
 * 장소 목록 화면의 URL 상태 — 카테고리·검색어·필터·정렬.
 *
 * `src/CLAUDE.md` §14.3이 URL에 남기라고 정한 항목이다. 주소만으로 같은 결과를 복원할 수
 * 있어야 새로고침·공유·뒤로가기가 모두 성립한다.
 *
 * 위치(`lat`/`lng`)와 반려견 선택(`dogId`/`dogIds`/`match`)은 각자 다른 곳에서 관리하므로
 * 이 모듈은 건드리지 않는다. `serializePlaceListParams`가 그 값들을 그대로 넘긴다.
 */
export interface PlaceListParams {
  category: CategoryFilterValue;
  searchQuery: string;
  filters: PlaceFilters;
  sortOption: SortOption;
}

/** URL 파라미터 이름. 화면 상태 필드명과 분리해 둔다. */
const PARAM = {
  category: "category",
  searchQuery: "q",
  indoor: "indoor",
  carrier: "carrier",
  dogSize: "size",
  recent: "recent",
  sortOption: "sort",
} as const;

const CATEGORY_VALUES = ["all", "cafe", "restaurant", "travel"] as const;
const INDOOR_VALUES = ["all", "indoor", "outdoor", "partial-area"] as const;
const CARRIER_VALUES = ["all", "not-required"] as const;
const DOG_SIZE_VALUES = ["all", "small", "medium", "large"] as const;
const RECENT_VALUES = ["all", "90days"] as const;
const SORT_VALUES = [
  "distance",
  "recent",
  "indoor-first",
  "no-carrier-first",
] as const;

export const DEFAULT_PLACE_LIST_PARAMS: PlaceListParams = {
  category: "all",
  searchQuery: "",
  filters: {
    indoor: "all",
    carrier: "all",
    dogSize: "all",
    recent: "all",
  },
  sortOption: "recent",
};

/**
 * 허용 목록에 없는 값은 기본값으로 되돌린다.
 *
 * 손으로 고친 주소, 오래된 링크(예: 삭제된 `indoor=exclude-unknown`), 같은 이름이 여러 번
 * 붙은 주소가 모두 여기로 들어온다. 오류를 띄우지 않고 조용히 기본값을 쓴다 — 목록 화면이
 * 안 뜨는 것보다 필터가 풀린 채 뜨는 편이 낫다.
 *
 * 같은 이름이 여러 번 있으면 `URLSearchParams.get()`이 첫 번째 값을 준다. 그 값만 본다.
 */
function parseEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parsePlaceListParams(params: URLSearchParams): PlaceListParams {
  return {
    category: parseEnumParam<CategoryFilterValue>(
      params.get(PARAM.category),
      CATEGORY_VALUES,
      DEFAULT_PLACE_LIST_PARAMS.category,
    ),
    searchQuery: params.get(PARAM.searchQuery) ?? "",
    filters: {
      indoor: parseEnumParam<IndoorFilter>(
        params.get(PARAM.indoor),
        INDOOR_VALUES,
        DEFAULT_PLACE_LIST_PARAMS.filters.indoor,
      ),
      carrier: parseEnumParam<CarrierFilter>(
        params.get(PARAM.carrier),
        CARRIER_VALUES,
        DEFAULT_PLACE_LIST_PARAMS.filters.carrier,
      ),
      dogSize: parseEnumParam<DogSizeFilter>(
        params.get(PARAM.dogSize),
        DOG_SIZE_VALUES,
        DEFAULT_PLACE_LIST_PARAMS.filters.dogSize,
      ),
      recent: parseEnumParam<RecentFilter>(
        params.get(PARAM.recent),
        RECENT_VALUES,
        DEFAULT_PLACE_LIST_PARAMS.filters.recent,
      ),
    },
    sortOption: parseEnumParam<SortOption>(
      params.get(PARAM.sortOption),
      SORT_VALUES,
      DEFAULT_PLACE_LIST_PARAMS.sortOption,
    ),
  };
}

/** 기본값이면 파라미터를 지우고, 아니면 하나만 남긴다. `set`이 중복도 함께 정리한다. */
function applyParam(
  params: URLSearchParams,
  name: string,
  value: string,
  defaultValue: string,
): void {
  if (value === defaultValue) params.delete(name);
  else params.set(name, value);
}

/**
 * 바꿀 항목만 담긴 `patch`를 기존 주소에 얹어 새 쿼리 문자열을 만든다.
 *
 * `base`에 있던 다른 파라미터(위치·반려견 선택 등)는 그대로 둔다. 기본값은 주소에서 빼기
 * 때문에 아무 조건도 걸지 않은 목록은 파라미터 없는 깨끗한 주소가 된다.
 */
export function serializePlaceListParams(
  base: URLSearchParams,
  patch: Partial<PlaceListParams>,
): string {
  const params = new URLSearchParams(base.toString());

  if (patch.category !== undefined) {
    applyParam(
      params,
      PARAM.category,
      patch.category,
      DEFAULT_PLACE_LIST_PARAMS.category,
    );
  }

  if (patch.searchQuery !== undefined) {
    applyParam(
      params,
      PARAM.searchQuery,
      patch.searchQuery.trim(),
      DEFAULT_PLACE_LIST_PARAMS.searchQuery,
    );
  }

  if (patch.sortOption !== undefined) {
    applyParam(
      params,
      PARAM.sortOption,
      patch.sortOption,
      DEFAULT_PLACE_LIST_PARAMS.sortOption,
    );
  }

  if (patch.filters !== undefined) {
    const { filters } = patch;
    const defaults = DEFAULT_PLACE_LIST_PARAMS.filters;
    applyParam(params, PARAM.indoor, filters.indoor, defaults.indoor);
    applyParam(params, PARAM.carrier, filters.carrier, defaults.carrier);
    applyParam(params, PARAM.dogSize, filters.dogSize, defaults.dogSize);
    applyParam(params, PARAM.recent, filters.recent, defaults.recent);
  }

  return params.toString();
}
