import { haversineDistance } from "@/lib/geo/distance";

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

/** 서비스 범위 반경. 임계값 자체는 개발명세서 v2 §7-2의 권장값을 그대로 쓴다. */
export const SERVICE_AREA_RADIUS_METERS = 50_000;

/**
 * 사용자가 서비스 범위 밖에 있는가.
 *
 * 기준은 **`SERVICE_AREA_CENTER`로부터의 거리**다. 명세서 §7-2는 "공개 장소 중 최단 거리"로
 * 적고 있으나 그 방식은 채택하지 않았다 — 대전 밖 장소가 실수로 공개되면 그 장소를 기준으로
 * 서비스 범위가 조용히 넓어진다. 실제로 공개 장소 하나가 대전시청에서 341km 떨어진 좌표를
 * 갖고 있었다. 범위는 데이터 상태와 무관하게 고정돼야 한다.
 *
 * 위치를 모르면 판정하지 않는다(`false`). 위치 권한이 없는 것과 멀리 있는 것은 다른 상태고,
 * 화면에서 보여줄 안내도 다르다.
 */
export function isOutsideServiceArea(
  userLocation: { lat: number; lng: number } | null | undefined,
): boolean {
  if (!userLocation) return false;

  const distance = haversineDistance(
    userLocation.lat,
    userLocation.lng,
    SERVICE_AREA_CENTER.lat,
    SERVICE_AREA_CENTER.lng,
  );

  return distance > SERVICE_AREA_RADIUS_METERS;
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
