import { describe, expect, it } from "vitest";

import {
  SERVICE_AREA_RADIUS_METERS,
  isOutsideServiceArea,
  resolveListEmptyReason,
} from "./service-area";

const at = (...distances: (number | null)[]) =>
  distances.map((distanceMeters) => ({ distanceMeters }));

describe("isOutsideServiceArea", () => {
  it("가장 가까운 장소가 임계 거리보다 멀면 범위 밖이다", () => {
    expect(isOutsideServiceArea(at(80_000, 120_000))).toBe(true);
  });

  it("가장 가까운 장소가 임계 거리 안이면 범위 안이다", () => {
    // 먼 장소가 섞여 있어도 최단 거리만 본다.
    expect(isOutsideServiceArea(at(3_000, 200_000))).toBe(false);
  });

  it("정확히 임계 거리면 범위 안으로 본다", () => {
    expect(isOutsideServiceArea(at(SERVICE_AREA_RADIUS_METERS))).toBe(false);
    expect(isOutsideServiceArea(at(SERVICE_AREA_RADIUS_METERS + 1))).toBe(true);
  });

  it("거리를 모르면 판정하지 않는다 — 위치 권한이 없는 상태", () => {
    expect(isOutsideServiceArea(at(null, null))).toBe(false);
  });

  it("공개 장소가 0건이면 판정하지 않는다", () => {
    // 데이터가 없는 것이지 사용자가 멀리 있는 것이 아니다. 안내 문구가 달라야 한다.
    expect(isOutsideServiceArea([])).toBe(false);
  });

  it("거리를 아는 장소가 하나라도 있으면 그것만으로 판정한다", () => {
    expect(isOutsideServiceArea(at(null, 300_000))).toBe(true);
    expect(isOutsideServiceArea(at(null, 1_000))).toBe(false);
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
