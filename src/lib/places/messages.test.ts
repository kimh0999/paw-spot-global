import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import type { CarrierMeansKey } from "@/lib/places/carrier-requirement";
import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";

/**
 * 장소 화면 메시지 중 **분기를 가진 것**만 여기서 렌더해 고정한다.
 *
 * 키가 있는지만 보는 것으로는 부족한 자리들이다 — ICU `select`의 분기 이름이 코드의
 * 값과 어긋나거나 `other`가 빠지거나 복수형이 틀리면 **화면에서만 드러난다.** 실제로
 * 적용 버튼은 영어에서 `Show 1 places`로 나가고 있었다.
 *
 * `createTranslator`는 화면이 쓰는 것과 **같은 next-intl 포맷터**라 여기서 통과하면
 * 런타임에서도 같은 결과가 나온다.
 */

/** `means`를 받는 세 표면. 같은 문장을 쓰지만 키가 따로다. */
const SURFACES = [
  { label: "카드", namespace: "places.card.carrierStroller", keys: ["requiredIndoor", "requiredAlways"] },
  { label: "미리보기", namespace: "places.preview.conditions", keys: ["carrierIndoor", "carrierAlways"] },
  { label: "상세", namespace: "places.detail.beforeYouGo.carrier", keys: ["required_indoor", "required_always"] },
] as const;

const MEANS: CarrierMeansKey[] = ["carrier", "crate", "stroller", "unspecified"];

const BUNDLES = { ko, en } as const;

/** 수단별로 서로 다른 문장이 나와야 한다. 같은 문장이면 분기가 죽은 것이다. */
describe("이동장 조건 문구 — means 분기", () => {
  for (const [locale, messages] of Object.entries(BUNDLES)) {
    for (const { label, namespace, keys } of SURFACES) {
      for (const key of keys) {
        it(`${locale} · ${label} · ${key} — 네 수단이 모두 렌더된다`, () => {
          const t = createTranslator({ locale, messages, namespace });
          const rendered = MEANS.map((means) => t(key, { means }));

          for (const [i, text] of rendered.entries()) {
            // 렌더 실패는 키 문자열이나 빈 문자열로 나타난다.
            expect(text, `${MEANS[i]}`).toBeTruthy();
            expect(text, `${MEANS[i]}`).not.toContain(key);
            expect(text, `${MEANS[i]}`).not.toContain("{means");
          }

          // carrier · crate · stroller는 서로 다른 물건이므로 문장도 달라야 한다.
          const named = rendered.slice(0, 3);
          expect(new Set(named).size, `${locale}.${namespace}.${key}`).toBe(3);
        });
      }
    }
  }

  /**
   * `unspecified`는 **수단을 이름 대지 않는다.** 근거가 없을 때 특정 물건을 단언하면
   * 없는 사실을 만든다(`DESIGN.md` §9 `수단을 이름 대는 자리`).
   */
  it("ko · unspecified는 확인 경로를 함께 주고 특정 수단을 단언하지 않는다", () => {
    for (const { namespace, keys } of SURFACES) {
      const t = createTranslator({ locale: "ko", messages: ko, namespace });
      for (const key of keys) {
        const text = t(key, { means: "unspecified" });
        expect(text, `${namespace}.${key}`).toContain("매장 확인");
        expect(text, `${namespace}.${key}`).not.toContain("이동장이");
        expect(text, `${namespace}.${key}`).not.toContain("유모차가");
      }
    }
  });

  it("en · unspecified는 확인 경로를 함께 준다", () => {
    for (const { namespace, keys } of SURFACES) {
      const t = createTranslator({ locale: "en", messages: en, namespace });
      for (const key of keys) {
        expect(t(key, { means: "unspecified" }), `${namespace}.${key}`).toContain(
          "check which is accepted",
        );
      }
    }
  });

  /** 세 표면이 같은 문장을 말해야 한다 — 한 곳만 고치면 장소가 화면마다 달리 읽힌다. */
  it.each(["carrier", "crate", "stroller", "unspecified"] as CarrierMeansKey[])(
    "%s — 카드·미리보기·상세가 같은 문장을 쓴다",
    (means) => {
      for (const [locale, messages] of Object.entries(BUNDLES)) {
        for (const slot of [0, 1] as const) {
          const rendered = SURFACES.map(({ namespace, keys }) =>
            createTranslator({ locale, messages, namespace })(keys[slot], { means }),
          );
          expect(new Set(rendered).size, `${locale} · slot ${slot} · ${means}`).toBe(1);
        }
      }
    },
  );
});

/**
 * 필터 드로어의 적용 버튼은 결과 수를 문구에 담는다(`DESIGN.md` §6 `Filter Drawer`).
 * 영어는 1곳일 때 단수여야 한다 — `Show 1 places`로 나가던 것을 ICU plural로 고쳤다.
 */
describe("필터 적용 버튼 문구 — 결과 수", () => {
  it.each([0, 1, 2, 6])("ko · %i곳", (count) => {
    const t = createTranslator({ locale: "ko", messages: ko, namespace: "places.filters" });
    expect(t("applyCount", { count })).toBe(`장소 ${count}곳 보기`);
  });

  it("en · 1곳은 단수, 나머지는 복수", () => {
    const t = createTranslator({ locale: "en", messages: en, namespace: "places.filters" });
    expect(t("applyCount", { count: 1 })).toBe("Show 1 place");
    expect(t("applyCount", { count: 0 })).toBe("Show 0 places");
    expect(t("applyCount", { count: 6 })).toBe("Show 6 places");
  });
});
