/**
 * 1단계 서비스 지역 — 대전 (기획서 v3 §9, 결정 D-08·D-11).
 *
 * 지역 필드를 만들지 않는다(기획서 v3 §9-5). 공개 대상 제한은 운영 규칙이고,
 * 코드가 하는 일은 **사용자에게 현재 범위를 알리는 것**뿐이다.
 */

/** 지도 fallback 중심 — 대전시청. 위치 권한이 없거나 거부됐을 때 쓴다. */
export const SERVICE_AREA_CENTER = { lat: 36.3504, lng: 127.3845 } as const;

/**
 * fallback 중심에서 쓰는 zoom.
 *
 * 장소를 하나 골라 확대한 상태가 아니라 "여기가 서비스 범위"를 보여주는 화면이므로,
 * 장소 중심 기본값(14)보다 넓게 잡아 대전 전역이 한 화면에 들어오게 한다.
 */
export const SERVICE_AREA_ZOOM = 12;

/**
 * 서비스 범위 밖 판정 임계 거리 (개발명세서 v2 §7-2 권장값).
 *
 * 대전 경계가 아니라 **공개 장소까지의 거리**로 잰다. 장소가 대전 밖으로 확장돼도
 * 이 판정은 그대로 따라온다.
 */
export const SERVICE_AREA_RADIUS_METERS = 50_000;

type WithDistance = { distanceMeters: number | null };

/**
 * 사용자가 서비스 범위 밖에 있는가.
 *
 * `distanceMeters`는 사용자 위치가 있을 때만 서버가 채운다(PostGIS). 그래서 위치를 모르면
 * 자연히 `false`가 되고, 별도로 위치 유무를 받지 않는다.
 *
 * **필터를 거치지 않은 전체 공개 장소**를 넘겨야 한다. 필터로 결과가 0건이 된 것은
 * 사용자가 범위 밖으로 나간 것이 아니다.
 *
 * 거리를 아는 장소가 하나도 없으면 판정하지 않는다(`false`). 공개 장소가 0건인 상태는
 * "사용자가 멀리 있다"가 아니라 "보여줄 데이터가 없다"이고, 안내 문구가 달라야 한다.
 */
export function isOutsideServiceArea(places: WithDistance[]): boolean {
  let nearest = Number.POSITIVE_INFINITY;

  for (const place of places) {
    if (place.distanceMeters == null) continue;
    if (place.distanceMeters < nearest) nearest = place.distanceMeters;
  }

  if (!Number.isFinite(nearest)) return false;
  return nearest > SERVICE_AREA_RADIUS_METERS;
}

/** 목록이 비었을 때 화면이 말해야 하는 원인. 원인마다 다음 행동이 다르다. */
export type ListEmptyReason =
  | "out-of-service-area"
  | "filtered-out"
  | "no-places";

/**
 * 빈 목록의 원인을 하나 고른다 (D-11).
 *
 * 범위 밖이 **필터보다 앞선다.** 두 조건이 함께 성립할 때 `필터 초기화`를 권하면
 * 필터를 다 풀어도 여전히 0건이라 사용자를 헛돌게 한다.
 *
 * 조건을 좁히지도 않았는데 0건이면 공개된 장소 자체가 없는 것이다. 이때 `필터 초기화`를
 * 내놓으면 지울 필터가 없어 버튼이 아무 일도 하지 않는다.
 */
export function resolveListEmptyReason(options: {
  outsideServiceArea: boolean;
  hasNarrowedConditions: boolean;
}): ListEmptyReason {
  if (options.outsideServiceArea) return "out-of-service-area";
  if (options.hasNarrowedConditions) return "filtered-out";
  return "no-places";
}
