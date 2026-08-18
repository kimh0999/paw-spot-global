import { MAX_DOGS_PER_USER } from "@/lib/dogs/constants";

export type DogSelectionSearchParams = {
  dogId?: string | string[];
  dogIds?: string | string[];
  match?: string | string[];
};

export type DogSelection = {
  /** 형식이 유효한 id만 남긴 목록. 소유 여부는 서버 조회에서 다시 확인한다. */
  dogIds: string[];
  /** `match=all`이 함께 온 여러 마리 선택인지. */
  matchAll: boolean;
};

/** cuid 형태만 통과시킨다. 그 밖의 값은 조용히 버린다 — 오류를 띄우지 않는다. */
const DOG_ID_PATTERN = /^[a-z0-9]{20,32}$/i;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 장소 목록 URL에서 반려견 선택을 읽는다.
 *
 * 잘못된 값은 오류가 아니라 "선택 없음"으로 떨어진다. 삭제된 반려견이 남은
 * 북마크나 공유 URL에서도 전체 장소가 그대로 보여야 하기 때문이다.
 */
export function parseDogSelection(
  searchParams: DogSelectionSearchParams,
): DogSelection {
  const matchAll = first(searchParams.match) === "all";
  const rawIds = first(searchParams.dogIds);
  const rawId = first(searchParams.dogId);

  const candidates = rawIds
    ? rawIds.split(",")
    : rawId
      ? [rawId]
      : [];

  const dogIds = Array.from(
    new Set(
      candidates
        .map((id) => id.trim())
        .filter((id) => DOG_ID_PATTERN.test(id)),
    ),
  ).slice(0, MAX_DOGS_PER_USER);

  return { dogIds, matchAll };
}

/**
 * 반려견 선택 파라미터만 걷어낸 경로.
 * 확인되지 않은 id가 섞여 있을 때 URL을 정리하는 데 쓴다.
 */
export function stripDogSelectionFromUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("dogId");
  params.delete("dogIds");
  params.delete("match");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** 반려견 카드의 "맞춤 장소 보기" 링크. */
export function buildDogPlacesHref(dogIds: readonly string[]): string {
  if (dogIds.length === 0) return "/places";
  if (dogIds.length === 1) return `/places?dogId=${dogIds[0]}`;
  return `/places?dogIds=${dogIds.join(",")}&match=all`;
}
