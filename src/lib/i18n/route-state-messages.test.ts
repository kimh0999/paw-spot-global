import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";

/**
 * 오류·404 화면은 무언가 이미 잘못됐을 때 뜬다. 그 화면에서 번역 키가 비면 경계 자체가
 * 다시 실패하므로, 화면이 읽는 키를 여기서 고정한다.
 */
const REQUIRED_KEYS = [
  "common.errorPage.title",
  "common.errorPage.description",
  "common.errorPage.backHome",
  "common.retry",
  "common.notFound.title",
  "common.notFound.description",
  "common.notFound.backHome",
  "common.notFound.browsePlaces",
  "admin.error.title",
  "admin.error.description",
  "admin.error.backToList",
];

const bundles = { ko, en };

describe("오류·404 화면 문구", () => {
  it.each(Object.entries(bundles))("%s에 필요한 키가 모두 있다", (locale, bundle) => {
    for (const key of REQUIRED_KEYS) {
      const value = key
        .split(".")
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)?.[part],
          bundle,
        );

      expect(typeof value === "string" && value.trim(), `${locale}.${key}`).toBeTruthy();
    }
  });
});
