import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { findPublishBlockers } from "./publish";

/**
 * 공개 차단 사유가 화면에서 **읽을 수 있는 문장**으로 나오는지 고정한다.
 *
 * 화면 테스트 환경(jsdom·RTL)이 없어 폼 소스에서 매핑 표를 읽어 대조한다
 * (`korean-inquiry.test.ts`와 같은 방식).
 */
const formSource = readFileSync(
  path.join(process.cwd(), "src/components/admin/VetClinicForm.tsx"),
  "utf8",
);

function mappedKeys(tableName: string): string[] {
  const start = formSource.indexOf(`const ${tableName}: Record<string, string> = {`);
  expect(start, `${tableName} 표가 없다`).toBeGreaterThan(-1);
  const body = formSource.slice(start, formSource.indexOf("};", start));
  return [...body.matchAll(/^\s{2}([A-Za-z]+):/gm)].map((m) => m[1]);
}

describe("공개 차단 사유 문구", () => {
  /** 값이 하나도 없고 확인 기록도 없는 후보 — 모든 blocker가 한 번에 나온다. */
  const emptyCandidate = {
    nameKr: "",
    address: "",
    phone: "",
    records: [],
  };

  it("findPublishBlockers가 내는 코드가 모두 문구로 번역된다", () => {
    const blockers = findPublishBlockers(emptyCandidate, new Date("2026-09-13T00:00:00Z"));
    expect(blockers).toEqual(["nameKr", "address", "phone", "basicVerification"]);

    const mapped = mappedKeys("PUBLISH_BLOCKER_MESSAGES");
    for (const code of blockers) {
      expect(mapped, `blocker '${code}' 문구가 없다`).toContain(code);
    }
  });

  it("서버가 쓰는 오류 키가 모두 문구로 번역된다", () => {
    const actionSource = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/(admin)/admin/vets/actions.ts"),
      "utf8",
    );
    // 액션이 돌려주는 message 리터럴을 그대로 긁는다.
    const used = [...actionSource.matchAll(/message:\s*"([a-zA-Z]+)"/g)].map((m) => m[1]);
    const ternary = [...actionSource.matchAll(/\?\s*"([a-zA-Z]+)"\s*:\s*"([a-zA-Z]+)"/g)]
      .flatMap((m) => [m[1], m[2]]);
    const keys = [...new Set([...used, ...ternary])];
    expect(keys.length).toBeGreaterThan(0);

    const mapped = mappedKeys("FORM_ERROR_MESSAGES");
    for (const key of keys) {
      expect(mapped, `오류 키 '${key}' 문구가 없다`).toContain(key);
    }
  });

  it("문구는 한국어이고 코드를 그대로 드러내지 않는다", () => {
    const start = formSource.indexOf("const PUBLISH_BLOCKER_MESSAGES");
    const body = formSource.slice(start, formSource.indexOf("};", start));
    expect(body).toMatch(/[가-힣]/);
    expect(body).toContain("확인 기록이 필요합니다");
  });
});
