import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 장소 소개·주차의 **렌더 경로**를 소스 수준에서 고정한다.
 *
 * 이 저장소에는 화면 테스트 환경(jsdom·RTL)이 없다. `korean-inquiry.test.ts`가 쓰는
 * 것과 같은 방식으로, 값이 화면까지 이어지는 분기만 소스에서 붙잡는다.
 * 값이 DB를 지나 조회까지 오는지는 `place-fields.db.test.ts`가 격리 DB에서 본다.
 */
const detailPage = readFileSync(
  path.join(process.cwd(), "src/app/[locale]/(detail)/places/[id]/page.tsx"),
  "utf8",
);
const adminForm = readFileSync(
  path.join(process.cwd(), "src/components/admin/PlaceForm.tsx"),
  "utf8",
);
const messages = Object.fromEntries(
  (["ko", "en"] as const).map((locale) => [
    locale,
    JSON.parse(readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")),
  ]),
);

describe("장소 소개 — 영어 화면에서 한국어 원문임을 밝힌다", () => {
  it("영문 소개가 있으면 그것을, 없으면 한국어 원문을 쓴다", () => {
    expect(detailPage).toContain("place.descriptionEn");
    expect(detailPage).toContain("place.descriptionKr");
    expect(detailPage).toContain("isKoreanSource");
  });

  it("한국어 원문을 보여줄 때 그렇다고 적는 문구가 있다", () => {
    expect(detailPage).toContain('t("about.koreanSource")');
    // 영어 화면의 문구가 "한국어다"라고 말해야 한다. 조용히 내보내면 영문 설명처럼 읽힌다.
    expect(messages.en.places.detail.about.koreanSource).toMatch(/Korean/i);
    expect(messages.ko.places.detail.about.title?.trim()).toBeTruthy();
  });

  it("한국어 원문에는 lang 속성을 붙인다", () => {
    expect(detailPage).toContain('lang={description.isKoreanSource ? "ko" : undefined}');
  });

  it("소개가 없으면 구역 자체를 렌더하지 않는다", () => {
    expect(detailPage).toContain("{description && (");
  });
});

describe("주차 — 미확인을 주차 불가로 보여주지 않는다", () => {
  it("UNKNOWN에는 전용 문구가 있다", () => {
    for (const locale of ["ko", "en"] as const) {
      const parking = messages[locale].places.detail.parking;
      expect(parking.available?.trim()).toBeTruthy();
      expect(parking.unavailable?.trim()).toBeTruthy();
      expect(parking.unknown?.trim()).toBeTruthy();
      // 미확인 문구가 불가 문구와 같으면 확인되지 않은 것을 확인된 것처럼 말하게 된다.
      expect(parking.unknown).not.toBe(parking.unavailable);
    }
  });

  it("UNKNOWN이고 메모도 없으면 주차 줄을 렌더하지 않는다", () => {
    expect(detailPage).toContain(
      'const hasParking = place.parking !== "UNKNOWN" || Boolean(place.parkingNote);',
    );
  });
});

describe("관리자 폼", () => {
  it("소개·주차 입력이 있다", () => {
    for (const name of ["parking", "parkingNote"]) {
      expect(adminForm).toContain(`name="${name}"`);
    }
    // 소개 두 칸은 같은 모양이라 배열로 렌더한다. 이름이 폼 데이터 키와 같아야 한다.
    for (const name of ["descriptionKr", "descriptionEn"]) {
      expect(adminForm).toContain(`["${name}"`);
    }
    expect(adminForm).toContain("name={name}");
  });

  it("주차 기본값은 확인되지 않음이다", () => {
    expect(adminForm).toContain('defaultValue={iv?.parking ?? "UNKNOWN"}');
  });
});
