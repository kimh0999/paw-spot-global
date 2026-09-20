import { describe, expect, it } from "vitest";

import {
  blocksPublicImage,
  imageAttributionStatus,
  isKtoImageUrl,
  missingAttributionFields,
  publicImageFields,
  resolveImageAttribution,
  type ImageAttributionRecord,
} from "./image-attribution";

/**
 * 결정 D-22 — **출처를 표시할 근거가 없으면 이미지를 내보내지 않는다.**
 *
 * 공공누리 네 유형은 모두 출처 표시를 요구한다. 문구를 붙였다는 것만으로 이용 조건을
 * 충족했다고 보지 않으며, 사람이 확인했다는 기록(`reviewedAt`)이 있어야 공개한다.
 */

const KTO_IMAGE = "https://tong.visitkorea.or.kr/cms/resource/42/fixture_image2_1.jpg";
const OWN_IMAGE = "https://cdn.pawspot.example.io/place-1.jpg";

/**
 * 공공누리 표시 항목이 **모두 채워진** 기록. 이것이 공개 가능한 최소 상태다.
 * 값은 픽스처이며 실제 저작물의 정보가 아니다.
 */
function record(overrides: Partial<ImageAttributionRecord> = {}): ImageAttributionRecord {
  return {
    imageUrl: KTO_IMAGE,
    provider: "한국관광공사",
    copyrightHolder: "확인된 작성자",
    workTitle: "확인된 저작물명",
    createdYear: 2019,
    sourceUrl: "https://kto.visitkorea.or.kr",
    licenseType: "KOGL_TYPE1",
    licenseUrl: "https://www.kogl.or.kr/info/licenseType1.do",
    reviewedAt: new Date("2026-09-18T00:00:00Z"),
    ...overrides,
  };
}

describe("출처 조건이 없는 이미지", () => {
  it("관리자가 직접 넣은 이미지는 기록 없이 그대로 나간다", () => {
    expect(resolveImageAttribution(OWN_IMAGE, null)).toEqual({ state: "not_required" });
    expect(publicImageFields(OWN_IMAGE, null)).toEqual({
      thumbnailUrl: OWN_IMAGE,
      imageAttribution: null,
    });
  });

  it("기존 수동 이미지에 관광공사 출처를 붙이지 않는다", () => {
    const resolution = resolveImageAttribution(OWN_IMAGE, null);
    expect(resolution.state).toBe("not_required");
    // 출처가 만들어지지 않는다 — 화면이 쓸 값이 없다.
    expect(publicImageFields(OWN_IMAGE, null).imageAttribution).toBeNull();
  });

  it("이미지가 없으면 판정할 것도 없다", () => {
    expect(imageAttributionStatus(null, null)).toBe("not_required");
  });
});

describe("관광공사 이미지 — 기록이 있어야 나간다", () => {
  it("기록 없는 관광공사 이미지는 공개 화면에서 주소째 떨어진다", () => {
    expect(imageAttributionStatus(KTO_IMAGE, null)).toBe("missingRecord");
    expect(publicImageFields(KTO_IMAGE, null)).toEqual({
      thumbnailUrl: null,
      imageAttribution: null,
    });
  });

  it("호스트로 관광공사 이미지를 알아본다", () => {
    expect(isKtoImageUrl(KTO_IMAGE)).toBe(true);
    expect(isKtoImageUrl(OWN_IMAGE)).toBe(false);
    expect(isKtoImageUrl("javascript:alert(1)")).toBe(false);
    expect(isKtoImageUrl(null)).toBe(false);
  });

  it("검토 전이면 내보내지 않는다 — 코드가 검토를 대신하지 않는다", () => {
    const status = imageAttributionStatus(KTO_IMAGE, record({ reviewedAt: null }));
    expect(status).toBe("unreviewed");
    expect(publicImageFields(KTO_IMAGE, record({ reviewedAt: null })).thumbnailUrl).toBeNull();
  });

  it("표시 항목이 모두 채워지고 검토를 마치면 내보낸다", () => {
    const fields = publicImageFields(KTO_IMAGE, record());
    expect(fields.thumbnailUrl).toBe(KTO_IMAGE);
    expect(fields.imageAttribution).toEqual({
      provider: "한국관광공사",
      copyrightHolder: "확인된 작성자",
      workTitle: "확인된 저작물명",
      createdYear: 2019,
      sourceUrl: "https://kto.visitkorea.or.kr",
      licenseType: "KOGL_TYPE1",
      licenseUrl: "https://www.kogl.or.kr/info/licenseType1.do",
    });
  });
});

/**
 * 공공누리 출처 표시는 기관명·작성연도·저작물명·작성자·기관 홈페이지 주소를 요구한다
 * (https://www.kogl.or.kr/info/licenseType1.do).
 * **`Type1`이라는 값과 검토 체크만으로는 이 항목들이 채워지지 않는다.**
 */
describe("체크만으로 통과하지 않는다", () => {
  it.each([
    ["copyrightHolder", { copyrightHolder: null }],
    ["workTitle", { workTitle: null }],
    ["createdYear", { createdYear: null }],
  ] as const)("공공누리 이미지에 %s가 비면 공개하지 않는다", (field, missing) => {
    const partial = record({ ...missing, reviewedAt: new Date() });
    expect(imageAttributionStatus(KTO_IMAGE, partial)).toBe("incompleteAttribution");
    expect(publicImageFields(KTO_IMAGE, partial).thumbnailUrl).toBeNull();
    expect(missingAttributionFields(KTO_IMAGE, partial)).toContain(field);
  });

  it("비어 있는 항목을 모두 알려 준다", () => {
    const empty = record({ copyrightHolder: null, workTitle: null, createdYear: null });
    expect(missingAttributionFields(KTO_IMAGE, empty).sort()).toEqual([
      "copyrightHolder",
      "createdYear",
      "workTitle",
    ]);
  });

  it("관광공사 이미지를 이용 조건 미확인으로 두고 우회할 수 없다", () => {
    // UNKNOWN으로 두면 공공누리 요구 항목을 건너뛰게 되므로 유형 자체를 요구한다.
    const dodged = record({
      licenseType: "UNKNOWN",
      copyrightHolder: null,
      workTitle: null,
      createdYear: null,
    });
    expect(imageAttributionStatus(KTO_IMAGE, dodged)).toBe("incompleteAttribution");
    expect(missingAttributionFields(KTO_IMAGE, dodged)).toEqual(["licenseType"]);
  });

  it("관광공사 밖 이미지에 붙인 단순 출처는 기관명·링크면 충분하다", () => {
    const own = "https://cdn.pawspot.example.io/place-1.jpg";
    const credit = record({
      imageUrl: own,
      licenseType: "UNKNOWN",
      licenseUrl: null,
      copyrightHolder: null,
      workTitle: null,
      createdYear: null,
    });
    expect(missingAttributionFields(own, credit)).toEqual([]);
    expect(imageAttributionStatus(own, credit)).toBe("ready");
  });

  it("기관명이나 출처 링크가 비면 그것부터 알려 준다", () => {
    expect(missingAttributionFields(KTO_IMAGE, record({ provider: "  " }))).toContain("provider");
    expect(missingAttributionFields(KTO_IMAGE, record({ sourceUrl: "" }))).toContain("sourceUrl");
  });
});

describe("이미지를 교체하면 검토가 승계되지 않는다", () => {
  it("기록이 가리키는 이미지와 지금 이미지가 다르면 막는다", () => {
    const replaced = "https://tong.visitkorea.or.kr/cms/resource/42/other_image2_1.jpg";
    expect(imageAttributionStatus(replaced, record())).toBe("imageChanged");
    expect(publicImageFields(replaced, record()).thumbnailUrl).toBeNull();
  });

  it("관광공사 밖 이미지로 바꿔도 남은 기록이 유효하지 않으면 막는다", () => {
    // 기록이 있다는 것은 "이 이미지에 이용 조건이 있다"는 뜻이다. 조용히 통과시키지 않는다.
    expect(imageAttributionStatus(OWN_IMAGE, record())).toBe("imageChanged");
  });
});

describe("출처 링크", () => {
  it("http/https가 아니면 막는다 — 화면에서 href가 된다", () => {
    const bad = record({ sourceUrl: "javascript:alert(1)" });
    expect(imageAttributionStatus(KTO_IMAGE, bad)).toBe("invalidSourceUrl");
  });

  it("이용 조건 안내 링크가 잘못됐으면 링크만 버리고 출처는 남긴다", () => {
    const fields = publicImageFields(KTO_IMAGE, record({ licenseUrl: "not-a-url" }));
    expect(fields.thumbnailUrl).toBe(KTO_IMAGE);
    expect(fields.imageAttribution?.licenseUrl).toBeNull();
  });
});

describe("공개를 막는 상태", () => {
  it.each([
    ["not_required", false],
    ["ready", false],
    ["missingRecord", true],
    ["imageChanged", true],
    ["unreviewed", true],
    ["invalidSourceUrl", true],
    ["incompleteAttribution", true],
  ] as const)("%s → %s", (status, blocked) => {
    expect(blocksPublicImage(status)).toBe(blocked);
  });
});
