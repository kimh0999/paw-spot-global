import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `Ask the store in Korean`은 MVP에서 노출하지 않는다(기획서 v3 §11, 결정 D-01).
 * 정적 문구가 이미 확인된 조건까지 다시 묻게 만들어 실용성이 낮다는 판단이다.
 *
 * 렌더 분기만 없애고 컴포넌트와 메시지 키는 P1 동적 재도입을 위해 남긴다.
 * 화면 테스트 환경(jsdom·RTL)이 없어 렌더 경로를 소스 수준에서 고정한다.
 */
const detailPage = readFileSync(
  path.join(process.cwd(), "src/app/[locale]/(detail)/places/[id]/page.tsx"),
  "utf8",
);

describe("Ask the store in Korean — MVP 비노출", () => {
  it("장소 상세 페이지가 문의 박스를 렌더하지 않는다", () => {
    expect(detailPage).not.toContain("KoreanInquiryBox");
  });

  it("컴포넌트와 메시지 키는 재도입을 위해 남겨 둔다", () => {
    expect(
      existsSync(
        path.join(process.cwd(), "src/components/places/KoreanInquiryBox.tsx"),
      ),
    ).toBe(true);

    for (const locale of ["ko", "en"] as const) {
      const messages = JSON.parse(
        readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
      );
      expect(messages.places.detail.koreanInquiry.title?.trim()).toBeTruthy();
    }
  });
});
