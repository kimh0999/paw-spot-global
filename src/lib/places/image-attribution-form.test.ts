import { describe, expect, it } from "vitest";

import {
  attributionReviewTarget,
  publishBlockedByImageAttribution,
  resolveImageAttributionWrite,
  resolveReviewFields,
  type ImageAttributionFormInput,
} from "./image-attribution-form";

/**
 * 결정 D-22 — 관리자 폼이 보내는 출처 입력의 규칙.
 *
 * 확인하지 못한 항목은 비워 둔다. 검토는 승계되지 않는다.
 * 공개 전환은 근거가 갖춰졌을 때만 통과한다.
 */

const KTO_IMAGE = "https://tong.visitkorea.or.kr/cms/resource/42/fixture_image2_1.jpg";
const NOW = new Date("2026-09-18T00:00:00Z");

/** 공공누리 표시 항목이 모두 채워진 입력. 값은 픽스처이며 실제 저작물 정보가 아니다. */
function form(overrides: Partial<ImageAttributionFormInput> = {}): ImageAttributionFormInput {
  return {
    provider: "한국관광공사",
    copyrightHolder: "확인된 작성자",
    workTitle: "확인된 저작물명",
    createdYear: "2019",
    sourceUrl: "https://kto.visitkorea.or.kr",
    licenseType: "KOGL_TYPE1",
    licenseUrl: "https://www.kogl.or.kr/info/licenseType1.do",
    reviewed: false,
    clear: false,
    ...overrides,
  };
}

function upsert(thumbnailUrl: string | null, input = form()) {
  const result = resolveImageAttributionWrite(thumbnailUrl, input);
  if ("error" in result) throw new Error(`예상치 못한 오류: ${result.error}`);
  return result.write;
}

describe("폼 입력 → 저장 지시", () => {
  it("이미지와 출처가 있으면 upsert다", () => {
    const write = upsert(KTO_IMAGE);
    expect(write.action).toBe("upsert");
    if (write.action !== "upsert") return;
    expect(write.data.imageUrl).toBe(KTO_IMAGE);
    expect(write.data.licenseType).toBe("KOGL_TYPE1");
  });

  it("비워 둔 항목을 지어내지 않는다", () => {
    const write = upsert(KTO_IMAGE, form({ copyrightHolder: "", workTitle: "", createdYear: "" }));
    if (write.action !== "upsert") throw new Error("upsert여야 한다");
    expect(write.data.copyrightHolder).toBeNull();
    expect(write.data.workTitle).toBeNull();
    expect(write.data.createdYear).toBeNull();
  });

  it("항목이 비어도 저장 자체는 막지 않는다 — 채워 가는 중에 보류할 수 있어야 한다", () => {
    const partial = form({ copyrightHolder: "", workTitle: "", createdYear: "" });
    expect(resolveImageAttributionWrite(KTO_IMAGE, partial)).not.toHaveProperty("error");
  });

  it("이미지가 없으면 출처도 지운다", () => {
    expect(upsert(null).action).toBe("delete");
  });

  it("지우기 표시는 다른 입력보다 우선한다", () => {
    expect(upsert(KTO_IMAGE, form({ clear: true })).action).toBe("delete");
  });

  it("입력이 전부 비면 빈 기록을 남기지 않고 지운다", () => {
    const empty = form({
      provider: "", sourceUrl: "", licenseType: "", licenseUrl: "",
      copyrightHolder: "", workTitle: "", createdYear: "",
    });
    expect(upsert(KTO_IMAGE, empty).action).toBe("delete");
  });

  it("일부만 비우면 지우기가 아니라 오류다 — 지우려면 지우기 표시를 쓴다", () => {
    const partial = form({ provider: "", sourceUrl: "" });
    expect(resolveImageAttributionWrite(KTO_IMAGE, partial)).toEqual({ error: "providerRequired" });
  });

  it.each([
    [form({ provider: "" }), "providerRequired"],
    [form({ sourceUrl: "" }), "sourceUrlRequired"],
    [form({ sourceUrl: "javascript:alert(1)" }), "invalidSourceUrl"],
    [form({ licenseUrl: "not-a-url" }), "invalidLicenseUrl"],
    [form({ licenseType: "MADE_UP" }), "invalidLicenseType"],
    [form({ createdYear: "올해" }), "invalidCreatedYear"],
    [form({ createdYear: "1799" }), "invalidCreatedYear"],
  ])("잘못된 입력을 거른다 → %#", (input, expected) => {
    const result = resolveImageAttributionWrite(KTO_IMAGE, input);
    expect(result).toEqual({ error: expected });
  });

  it("확인된 작성연도는 숫자로 저장한다", () => {
    const write = upsert(KTO_IMAGE, form({ createdYear: "2019" }));
    if (write.action !== "upsert") throw new Error("upsert여야 한다");
    expect(write.data.createdYear).toBe(2019);
  });
});

describe("검토 기록은 승계되지 않는다", () => {
  const write = () => {
    const result = upsert(KTO_IMAGE, form({ reviewed: true }));
    if (result.action !== "upsert") throw new Error("upsert여야 한다");
    return result;
  };

  it("확인 표시가 없으면 검토 기록을 비운다", () => {
    const unchecked = upsert(KTO_IMAGE, form({ reviewed: false }));
    if (unchecked.action !== "upsert") throw new Error("upsert여야 한다");
    expect(resolveReviewFields(unchecked, null, "admin@example.test", NOW)).toEqual({
      reviewedBy: null,
      reviewedAt: null,
    });
  });

  it("처음 확인하면 지금이 검토 시각이다", () => {
    expect(resolveReviewFields(write(), null, "admin@example.test", NOW)).toEqual({
      reviewedBy: "admin@example.test",
      reviewedAt: NOW,
    });
  });

  it("같은 대상을 다시 저장해도 검토 시각을 갱신하지 않는다", () => {
    const current = write();
    const earlier = new Date("2026-09-01T00:00:00Z");
    const kept = resolveReviewFields(
      current,
      {
        reviewedBy: "first@example.test",
        reviewedAt: earlier,
        target: attributionReviewTarget(current.data),
      },
      "admin@example.test",
      NOW,
    );
    expect(kept).toEqual({ reviewedBy: "first@example.test", reviewedAt: earlier });
  });

  it("이미지를 바꾸면 이전 검토 기록을 잇지 않는다", () => {
    const current = write();
    const other = upsert("https://tong.visitkorea.or.kr/cms/resource/42/other_image2_1.jpg", form({ reviewed: true }));
    if (other.action !== "upsert") throw new Error("upsert여야 한다");

    const result = resolveReviewFields(
      other,
      {
        reviewedBy: "first@example.test",
        reviewedAt: new Date("2026-09-01T00:00:00Z"),
        target: attributionReviewTarget(current.data),
      },
      "admin@example.test",
      NOW,
    );
    expect(result).toEqual({ reviewedBy: "admin@example.test", reviewedAt: NOW });
  });

  it("출처 내용만 고쳐도 이전 검토는 그 내용을 확인한 것이 아니다", () => {
    const current = write();
    const edited = upsert(KTO_IMAGE, form({ reviewed: true, copyrightHolder: "새로 확인한 작성자" }));
    if (edited.action !== "upsert") throw new Error("upsert여야 한다");

    const result = resolveReviewFields(
      edited,
      {
        reviewedBy: "first@example.test",
        reviewedAt: new Date("2026-09-01T00:00:00Z"),
        target: attributionReviewTarget(current.data),
      },
      "admin@example.test",
      NOW,
    );
    expect(result.reviewedAt).toEqual(NOW);
  });
});

describe("공개 전환 보완 요구", () => {
  it("검토 표시가 없으면 공개를 막는다", () => {
    const write = upsert(KTO_IMAGE, form({ reviewed: false }));
    expect(publishBlockedByImageAttribution(KTO_IMAGE, write, NOW).blocked).toBe(true);
  });

  it("표시 항목이 모두 채워지고 검토 표시가 있으면 통과한다", () => {
    const write = upsert(KTO_IMAGE, form({ reviewed: true }));
    expect(publishBlockedByImageAttribution(KTO_IMAGE, write, NOW)).toEqual({ blocked: false });
  });

  it("검토 체크만 하고 표시 항목이 비면 막고, 무엇이 비었는지 알려 준다", () => {
    const write = upsert(
      KTO_IMAGE,
      form({ reviewed: true, copyrightHolder: "", workTitle: "", createdYear: "" }),
    );
    const result = publishBlockedByImageAttribution(KTO_IMAGE, write, NOW);
    expect(result.blocked).toBe(true);
    if (!result.blocked) return;
    expect(result.missing.sort()).toEqual(["copyrightHolder", "createdYear", "workTitle"]);
  });

  it("관광공사 이미지를 이용 조건 미확인으로 두고 공개할 수 없다", () => {
    const write = upsert(
      KTO_IMAGE,
      form({ reviewed: true, licenseType: "UNKNOWN", licenseUrl: "", copyrightHolder: "", workTitle: "", createdYear: "" }),
    );
    const result = publishBlockedByImageAttribution(KTO_IMAGE, write, NOW);
    expect(result.blocked).toBe(true);
    if (!result.blocked) return;
    expect(result.missing).toEqual(["licenseType"]);
  });

  it("관광공사 이미지인데 출처를 아예 안 넣으면 막는다", () => {
    const write = upsert(KTO_IMAGE, form({ provider: "", sourceUrl: "", licenseType: "", licenseUrl: "", copyrightHolder: "", workTitle: "", createdYear: "" }));
    expect(publishBlockedByImageAttribution(KTO_IMAGE, write, NOW).blocked).toBe(true);
  });

  it("출처 조건이 없는 이미지는 막지 않는다 — 기존 수동 등록 흐름", () => {
    const own = "https://cdn.pawspot.example.io/place-1.jpg";
    const write = upsert(own, form({ provider: "", sourceUrl: "", licenseType: "", licenseUrl: "", copyrightHolder: "", workTitle: "", createdYear: "" }));
    expect(publishBlockedByImageAttribution(own, write, NOW)).toEqual({ blocked: false });
  });

  it("이미지가 없으면 막지 않는다", () => {
    expect(publishBlockedByImageAttribution(null, upsert(null), NOW)).toEqual({ blocked: false });
  });
});
