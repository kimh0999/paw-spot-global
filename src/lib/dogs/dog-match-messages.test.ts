import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import type { DogMatchReason } from "@/lib/dogs/matching";

/**
 * DogMatchBadge는 사유를 그대로 메시지 키로 쓴다(`${scope}.${reason ?? "MATCH"}`).
 * 키가 하나라도 비면 화면에 키 문자열이 그대로 노출되므로 여기서 계약을 고정한다.
 */
const REASONS: DogMatchReason[] = [
  "SIZE_LIMIT",
  "PET_NOT_ALLOWED",
  "BREED_RESTRICTION",
  "UNKNOWN_CONDITION",
];
const BADGE_KEYS = ["MATCH", ...REASONS];
const SCOPES = ["single", "multi"] as const;

const messages = { ko, en };

describe("places.card.dogMatch 메시지", () => {
  for (const [locale, bundle] of Object.entries(messages)) {
    for (const scope of SCOPES) {
      it(`${locale}: ${scope}에 배지 키가 모두 있다`, () => {
        const group = bundle.places.card.dogMatch[scope] as Record<string, string>;

        expect(Object.keys(group).sort()).toEqual([...BADGE_KEYS].sort());
        for (const key of BADGE_KEYS) {
          expect(group[key]?.trim(), `${locale}.${scope}.${key}`).toBeTruthy();
        }
      });
    }
  }

  it("한 마리 판정의 MATCH만 이름과 조사를 받는다", () => {
    expect(ko.places.card.dogMatch.single.MATCH).toContain("{name}");
    expect(ko.places.card.dogMatch.single.MATCH).toContain("{particle}");
    expect(en.places.card.dogMatch.single.MATCH).toContain("{name}");
  });

  it("동반 불가 문구를 크기 제한 문구로 쓰지 않는다", () => {
    for (const scope of SCOPES) {
      const group = ko.places.card.dogMatch[scope] as Record<string, string>;
      expect(group.PET_NOT_ALLOWED).not.toBe(group.SIZE_LIMIT);
      expect(group.PET_NOT_ALLOWED).toContain("동반");
      expect(group.SIZE_LIMIT).toContain("크기");
    }
  });
});

describe("dogs.toast 메시지", () => {
  it("한국어 등록·삭제 문구는 조사를 파라미터로 받는다", () => {
    expect(ko.dogs.toast.created).toContain("{particle}");
    expect(ko.dogs.toast.deleted).toContain("{particle}");
  });

  it("영어 문구에는 조사 파라미터를 쓰지 않는다", () => {
    expect(en.dogs.toast.created).not.toContain("{particle}");
    expect(en.dogs.toast.deleted).not.toContain("{particle}");
  });
});
