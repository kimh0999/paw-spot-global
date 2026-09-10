import { describe, expect, it } from "vitest";

import {
  DEFAULT_VET_LIST_PARAMS,
  getVetClinics,
  parseVetListParams,
  type VetListParams,
} from "./filtering";
import type { VetClinicListItem } from "./types";
import { resolveVetItem, type VetVerificationRecord } from "./verification";

const NOW = new Date("2026-09-10T00:00:00Z");

function evidence(
  target: VetVerificationRecord["target"],
  value: string,
  daysAgo = 3,
): VetVerificationRecord {
  return {
    target,
    method: "PHONE",
    verifiedAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    sourceUrl: null,
    note: null,
    verifiedValue: value,
  };
}

function clinic(overrides: Partial<VetClinicListItem> = {}): VetClinicListItem {
  const base: VetClinicListItem = {
    id: "c1",
    nameKr: "테스트동물병원",
    nameEn: null,
    district: "seo",
    address: "대전 서구 둔산동 1",
    phone: "042-000-0000",
    website: null,
    location: { lat: 36.35, lng: 127.38 },
    distanceMeters: null,
    hours: null,
    hoursNote: null,
    englishSupport: "UNKNOWN",
    englishSupportCondition: null,
    afterHours: "UNKNOWN",
    afterHoursCondition: null,
    collectedAt: null,
    updatedAt: NOW.toISOString(),
    verification: {
      basic: resolveVetItem("BASIC", null, [], NOW),
      hours: resolveVetItem("HOURS", null, [], NOW),
      englishSupport: resolveVetItem("ENGLISH_SUPPORT", null, [], NOW),
      afterHours: resolveVetItem("AFTER_HOURS", null, [], NOW),
    },
  };
  return { ...base, ...overrides };
}

/** 영어 응대가 확인된 병원 하나를 만든다. */
function withConfirmedEnglish(
  id: string,
  status: VetClinicListItem["englishSupport"],
  daysAgo = 3,
): VetClinicListItem {
  const snapshot = status === "CONDITIONAL" ? `${status}평일 오전만` : status;
  return clinic({
    id,
    englishSupport: status,
    englishSupportCondition: status === "CONDITIONAL" ? "평일 오전만" : null,
    verification: {
      ...clinic().verification,
      englishSupport: resolveVetItem(
        "ENGLISH_SUPPORT",
        snapshot,
        [evidence("ENGLISH_SUPPORT", snapshot, daysAgo)],
        NOW,
      ),
    },
  });
}

function run(clinics: VetClinicListItem[], overrides: Partial<VetListParams> = {}) {
  return getVetClinics(clinics, { ...DEFAULT_VET_LIST_PARAMS, ...overrides }).map((c) => c.id);
}

describe("parseVetListParams", () => {
  it("잘못된 값은 오류가 아니라 기본값으로 떨어진다", () => {
    expect(parseVetListParams({ district: "nowhere", sort: "weird" })).toEqual(
      DEFAULT_VET_LIST_PARAMS,
    );
  });

  it("URL 쿼리를 그대로 읽는다 — 언어 전환에서 상태가 보존되는 근거다", () => {
    expect(
      parseVetListParams({ q: " 24시 ", district: "yuseong", english: "confirmed", sort: "distance" }),
    ).toEqual({
      query: "24시",
      district: "yuseong",
      englishConfirmed: true,
      afterHoursConfirmed: false,
      sort: "distance",
    });
  });
});

describe("검색과 구 선택", () => {
  const clinics = [
    clinic({ id: "a", nameKr: "행복동물병원", district: "seo" }),
    clinic({ id: "b", nameKr: "24시연합동물병원", nameEn: "24H Union Animal Hospital", district: "yuseong" }),
    clinic({ id: "c", nameKr: "대덕동물의료센터", address: "대전 대덕구 오정동 3", district: "daedeok" }),
  ];

  it("한국어 병원명으로 찾는다", () => {
    expect(run(clinics, { query: "행복" })).toEqual(["a"]);
  });

  it("영문명으로도 찾는다", () => {
    expect(run(clinics, { query: "union" })).toEqual(["b"]);
  });

  it("주소로도 찾는다", () => {
    expect(run(clinics, { query: "오정동" })).toEqual(["c"]);
  });

  it("구를 고르면 그 구만 남는다", () => {
    expect(run(clinics, { district: "yuseong" })).toEqual(["b"]);
  });

  it("검색과 구를 함께 걸면 둘 다 적용된다", () => {
    expect(run(clinics, { query: "동물병원", district: "seo" })).toEqual(["a"]);
  });
});

describe("안내 확인 필터 (D-19)", () => {
  it("가능·조건부는 유효한 근거가 있으면 통과한다", () => {
    const clinics = [
      withConfirmedEnglish("available", "AVAILABLE"),
      withConfirmedEnglish("conditional", "CONDITIONAL"),
    ];
    expect(run(clinics, { englishConfirmed: true })).toEqual(
      expect.arrayContaining(["available", "conditional"]),
    );
  });

  it("불가·미확인은 제외한다", () => {
    const clinics = [
      clinic({ id: "unavailable", englishSupport: "UNAVAILABLE" }),
      clinic({ id: "unknown", englishSupport: "UNKNOWN" }),
    ];
    expect(run(clinics, { englishConfirmed: true })).toEqual([]);
  });

  it("재확인 기한이 지난 병원은 필터에서 빠진다", () => {
    const clinics = [withConfirmedEnglish("overdue", "AVAILABLE", 40)];
    expect(run(clinics, { englishConfirmed: true })).toEqual([]);
  });

  it("근거가 없는 가능은 통과하지 않는다", () => {
    const clinics = [clinic({ id: "claimed", englishSupport: "AVAILABLE" })];
    expect(run(clinics, { englishConfirmed: true })).toEqual([]);
  });

  it("필터를 걸지 않으면 재확인 기한이 지난 병원도 목록에 남는다", () => {
    // 재확인 필요만으로 병원을 자동으로 숨기지 않는다 (D-18).
    const clinics = [withConfirmedEnglish("overdue", "AVAILABLE", 40)];
    expect(run(clinics)).toEqual(["overdue"]);
  });

  it("영어 필터는 야간 진료 필터로 번지지 않는다", () => {
    const clinics = [withConfirmedEnglish("englishOnly", "AVAILABLE")];
    expect(run(clinics, { englishConfirmed: true })).toEqual(["englishOnly"]);
    expect(run(clinics, { afterHoursConfirmed: true })).toEqual([]);
  });
});

describe("정렬", () => {
  it("최근 확인순은 확인 시각이 늦은 병원을 앞에 둔다", () => {
    const clinics = [
      withConfirmedEnglish("old", "AVAILABLE", 20),
      withConfirmedEnglish("new", "AVAILABLE", 1),
    ];
    expect(run(clinics, { sort: "recent" })).toEqual(["new", "old"]);
  });

  it("거리순은 좌표가 없는 병원을 뒤로 보낸다", () => {
    const clinics = [
      clinic({ id: "noCoord", location: null, distanceMeters: null }),
      clinic({ id: "far", distanceMeters: 5000 }),
      clinic({ id: "near", distanceMeters: 100 }),
    ];
    expect(run(clinics, { sort: "distance" })).toEqual(["near", "far", "noCoord"]);
  });

  it("좌표가 없으면 거리를 만들지 않는다", () => {
    const noCoord = clinic({ id: "noCoord", location: null });
    expect(noCoord.distanceMeters).toBeNull();
  });
});
