import { describe, expect, it } from "vitest";

import {
  SERVICE_AREA_CENTER,
  SERVICE_AREA_RADIUS_METERS,
  isOutsideServiceArea,
  resolveListEmptyReason,
} from "./service-area";

const EARTH_RADIUS_M = 6_371_000;

/**
 * 중심에서 정북으로 `meters`만큼 떨어진 지점.
 *
 * 자오선 위에서는 haversine이 `R * dLat`으로 정확히 떨어지므로, 임계 거리 경계를
 * 어림값 없이 만들 수 있다.
 */
function northOfCenter(meters: number) {
  const dLatDeg = (meters / EARTH_RADIUS_M) * (180 / Math.PI);
  return { lat: SERVICE_AREA_CENTER.lat + dLatDeg, lng: SERVICE_AREA_CENTER.lng };
}

describe("isOutsideServiceArea", () => {
  it("위치를 모르면 판정하지 않는다", () => {
    // 위치 권한이 없는 것과 멀리 있는 것은 다른 상태다.
    expect(isOutsideServiceArea(null)).toBe(false);
    expect(isOutsideServiceArea(undefined)).toBe(false);
  });

  it("서비스 지역 중심은 범위 안이다", () => {
    expect(isOutsideServiceArea(SERVICE_AREA_CENTER)).toBe(false);
  });

  it("대전 시내는 범위 안이다", () => {
    // 유성구 원신흥동 · 동구 충정로 — 실제 공개 장소의 좌표.
    expect(isOutsideServiceArea({ lat: 36.3357615, lng: 127.3366611 })).toBe(false);
    expect(isOutsideServiceArea({ lat: 36.3484101, lng: 127.4552585 })).toBe(false);
  });

  it("서울·부산은 범위 밖이다", () => {
    expect(isOutsideServiceArea({ lat: 37.5665, lng: 126.978 })).toBe(true);
    expect(isOutsideServiceArea({ lat: 35.1796, lng: 129.0756 })).toBe(true);
  });

  it("정확히 임계 거리면 범위 안으로 본다", () => {
    expect(isOutsideServiceArea(northOfCenter(SERVICE_AREA_RADIUS_METERS))).toBe(false);
    expect(isOutsideServiceArea(northOfCenter(SERVICE_AREA_RADIUS_METERS - 100))).toBe(false);
    expect(isOutsideServiceArea(northOfCenter(SERVICE_AREA_RADIUS_METERS + 100))).toBe(true);
  });

  it("공개 장소가 어디에 있든 범위는 움직이지 않는다", () => {
    // 대전 밖 장소가 실수로 공개돼도 범위가 넓어지면 안 된다. 판정은 사용자 위치만 본다.
    // (실제로 대전시청에서 341km 떨어진 좌표를 가진 공개 장소가 있었다.)
    const seoulUser = { lat: 37.5665, lng: 126.978 };
    expect(isOutsideServiceArea(seoulUser)).toBe(true);
  });
});

describe("resolveListEmptyReason", () => {
  it("범위 밖이면 필터가 걸려 있어도 범위 밖을 우선한다", () => {
    // 필터를 다 풀어도 0건인 상황이라 `필터 초기화`를 권하면 헛돌게 된다.
    expect(
      resolveListEmptyReason({
        outsideServiceArea: true,
        hasNarrowedConditions: true,
      }),
    ).toBe("out-of-service-area");
  });

  it("범위 안에서 조건을 좁혔으면 필터 결과 0건이다", () => {
    expect(
      resolveListEmptyReason({
        outsideServiceArea: false,
        hasNarrowedConditions: true,
      }),
    ).toBe("filtered-out");
  });

  it("조건을 좁히지 않았는데 0건이면 공개된 장소가 없는 것이다", () => {
    // 지울 필터가 없으므로 `필터 초기화` 버튼을 주면 아무 일도 하지 않는다.
    expect(
      resolveListEmptyReason({
        outsideServiceArea: false,
        hasNarrowedConditions: false,
      }),
    ).toBe("no-places");
  });
});
