import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { canPublishClinic } from "./publish";
import { vetClinicInputSchema } from "./validation";
import type { VetVerificationRecord } from "./verification";

/**
 * 수집한 실제 병원 표본이 **제품이 실제로 쓰는 검증기**를 통과하는지 확인한다.
 *
 * 표본을 눈으로만 보고 "형식이 맞다"고 적어 두면, 나중에 스키마가 바뀌었을 때 표본이
 * 조용히 낡는다. 그래서 별도 스크립트가 아니라 테스트로 둔다 — `npm test`가 돌 때마다
 * 같이 확인된다. 이 테스트는 DB를 건드리지 않는다.
 *
 * 표본 출처와 한계는 `scripts/vet-samples.daejeon.json`에 함께 적혀 있다.
 */

const SAMPLE_PATH = path.join(process.cwd(), "scripts", "vet-samples.daejeon.json");

interface SampleFile {
  collectedAt: string;
  sources: { name: string; url: string; lookedUpAt: string; sourceStatedUpdatedAt: string | null }[];
  sourceLimits: string[];
  samples: { input: unknown; needsReview: string[] }[];
}

const file = JSON.parse(readFileSync(SAMPLE_PATH, "utf8")) as SampleFile;

describe("대전 동물병원 표본", () => {
  it("3~5곳을 담고 출처가 모두 붙어 있다", () => {
    expect(file.samples.length).toBeGreaterThanOrEqual(3);
    expect(file.samples.length).toBeLessThanOrEqual(5);
    expect(file.sources.length).toBeGreaterThan(0);
    for (const source of file.sources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.lookedUpAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("모든 표본이 실제 입력 스키마를 통과한다", () => {
    for (const sample of file.samples) {
      const result = vetClinicInputSchema.safeParse(sample.input);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it("모두 임시저장이고 확인이 필요한 항목이 적혀 있다", () => {
    for (const sample of file.samples) {
      const input = vetClinicInputSchema.parse(sample.input);
      // 표본은 검수를 거치지 않았다. 저장 파일 단계에서 공개 상태를 갖지 않는다.
      expect(input.visibility).toBe("DRAFT");
      expect(sample.needsReview.length).toBeGreaterThan(0);
    }
  });

  it("웹 조회를 전화·DM 확인으로 기록하지 않는다", () => {
    for (const sample of file.samples) {
      const input = vetClinicInputSchema.parse(sample.input);
      for (const record of input.verifications) {
        expect(record.method).toBe("WEBSITE");
        expect(record.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("출처에 없는 항목을 추측해서 채우지 않는다", () => {
    for (const sample of file.samples) {
      const input = vetClinicInputSchema.parse(sample.input);
      // 진료시간·야간 진료·영어 응대는 이 출처에 아예 없다. 이름에 `24시`가 들어 있어도
      // 야간 진료를 확인한 것이 아니므로 UNKNOWN을 유지해야 한다.
      expect(input.hours).toBeNull();
      expect(input.englishSupport.status).toBe("UNKNOWN");
      expect(input.afterHours.status).toBe("UNKNOWN");
    }
  });

  /**
   * D-20 게이트의 한계를 못 박아 둔다.
   *
   * 게이트는 주소 **문자열이 있는지**만 본다. 그래서 동 단위 주소(`대전광역시 서구 도안동`)
   * 도 통과한다 — 사용자가 그 주소로는 병원을 찾아갈 수 없는데도. 즉 이 표본들은 자동으로는
   * 막히지 않으며, 도로명 상세주소 검수는 **사람이 해야 한다.** 표본을 DRAFT로 둔 것이
   * 지금 유일한 방어선이다.
   */
  it("동 단위 주소도 공개 게이트를 통과한다 — 상세 주소 검수는 사람 몫이다", () => {
    const reference = new Date("2026-09-10T00:00:00Z");
    for (const sample of file.samples) {
      const input = vetClinicInputSchema.parse(sample.input);
      const records: VetVerificationRecord[] = input.verifications.map((record) => ({
        target: record.target,
        method: record.method,
        verifiedAt: record.verifiedAt,
        sourceUrl: record.sourceUrl,
        note: record.note,
        // 저장 시점에 붙는 값 스냅샷과 같게 맞춘다.
        verifiedValue: null,
      }));

      expect(
        canPublishClinic(
          { nameKr: input.nameKr, address: input.address, phone: input.phone, records },
          reference,
        ),
      ).toBe(true);
    }
  });
});
