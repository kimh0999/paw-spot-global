import { afterEach, describe, expect, it } from "vitest";

import { alternatesFor, localeHref, siteOrigin } from "./site";
import { placeJsonLd, serializeJsonLd, vetClinicJsonLd } from "./structured-data";
import type { OperatingHours } from "@/lib/places/operating-hours";

describe("alternatesFor", () => {
  it("canonical은 보고 있는 locale을 가리킨다", () => {
    expect(alternatesFor("ko", "/vets").canonical).toBe("/ko/vets");
    expect(alternatesFor("en", "/vets").canonical).toBe("/en/vets");
  });

  it("hreflang은 실제로 존재하는 locale만 담고 x-default는 기본 locale이다", () => {
    const { languages } = alternatesFor("ko", "/places");
    expect(languages).toEqual({
      en: "/en/places",
      ko: "/ko/places",
      "x-default": "/en/places",
    });
  });

  it("루트 경로에 빈 세그먼트를 덧붙이지 않는다", () => {
    expect(localeHref("ko", "/")).toBe("/ko");
  });
});

const HOURS: OperatingHours = {
  mon: { open: "09:00", close: "18:00" },
  tue: null,
  wed: null,
  thu: null,
  fri: null,
  sat: null,
  sun: null,
};

const PLACE = {
  nameKr: "몽베르트",
  nameEn: "MontVert",
  category: "cafe",
  address: "대전 동구 충정로 37",
  phone: null,
  website: null,
  thumbnailUrl: null,
  location: null,
  hours: null,
};

describe("placeJsonLd", () => {
  it("확인되지 않은 값은 속성 자체를 만들지 않는다", () => {
    const json = placeJsonLd({ place: PLACE, name: "몽베르트", url: "https://x/ko/places/1" });
    expect(json).not.toHaveProperty("telephone");
    expect(json).not.toHaveProperty("openingHoursSpecification");
    expect(json).not.toHaveProperty("geo");
    expect(json).not.toHaveProperty("image");
  });

  it("평점·리뷰는 어떤 경우에도 만들지 않는다", () => {
    const json = placeJsonLd({
      place: { ...PLACE, phone: "042-000-0000", location: { lat: 36.3, lng: 127.4 }, hours: HOURS },
      name: "몽베르트",
      url: "https://x/ko/places/1",
    });
    expect(json).not.toHaveProperty("aggregateRating");
    expect(json).not.toHaveProperty("review");
  });

  it("휴무일은 운영시간 규격에 넣지 않는다", () => {
    const json = placeJsonLd({ place: { ...PLACE, hours: HOURS }, name: "x", url: "https://x/1" });
    expect(json.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "09:00", closes: "18:00" },
    ]);
  });

  it("카테고리를 schema.org 타입으로 옮긴다", () => {
    expect(placeJsonLd({ place: PLACE, name: "x", url: "u" })["@type"]).toBe("CafeOrCoffeeShop");
    expect(
      placeJsonLd({ place: { ...PLACE, category: "travel" }, name: "x", url: "u" })["@type"],
    ).toBe("TouristAttraction");
  });
});

describe("vetClinicJsonLd", () => {
  it("전화번호는 필수라 항상 담기고, 진료시간 미입력은 비운다", () => {
    const json = vetClinicJsonLd({
      clinic: {
        nameKr: "○○동물병원",
        nameEn: null,
        address: "대전 서구 1",
        phone: "042-111-2222",
        website: null,
        location: null,
        hours: null,
      },
      name: "○○동물병원",
      url: "https://x/ko/vets/1",
    });
    expect(json["@type"]).toBe("VeterinaryCare");
    expect(json.telephone).toBe("042-111-2222");
    expect(json).not.toHaveProperty("openingHoursSpecification");
  });
});

describe("serializeJsonLd", () => {
  it("이름에 담긴 </script>가 스크립트를 끊고 나가지 못한다", () => {
    const out = serializeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    expect(JSON.parse(out).name).toBe("</script><img src=x onerror=alert(1)>");
  });

  it("U+2028·U+2029를 이스케이프한다", () => {
    const out = serializeJsonLd({ name: "a\u2028b\u2029c" });
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
    expect(JSON.parse(out).name).toBe("a\u2028b\u2029c");
  });
});

/**
 * 운영 배포에서 localhost가 SEO URL로 나가는 것을 막는 가드.
 *
 * **로컬 production build와 preview 배포는 통과해야 한다.** `NODE_ENV=production`만 보고
 * 전부 실패시키면 아무도 로컬에서 빌드를 검증할 수 없다.
 */
describe("siteOrigin 운영 배포 가드", () => {
  const KEYS = [
    "NEXT_PUBLIC_SITE_URL",
    "SEO_REQUIRE_PUBLIC_ORIGIN",
    "VERCEL_ENV",
    "CONTEXT",
    "NODE_ENV",
  ] as const;
  const saved = new Map<string, string | undefined>();

  function setEnv(values: Record<string, string | undefined>) {
    for (const k of KEYS) if (!saved.has(k)) saved.set(k, process.env[k]);
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
      else (process.env as Record<string, string>)[k] = v;
    }
  }

  afterEach(() => {
    for (const [k, v] of saved) {
      if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
      else (process.env as Record<string, string>)[k] = v;
    }
    saved.clear();
  });

  it("로컬 production 빌드는 localhost여도 통과한다", () => {
    setEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      VERCEL_ENV: undefined,
      CONTEXT: undefined,
      SEO_REQUIRE_PUBLIC_ORIGIN: undefined,
    });
    expect(siteOrigin()).toBe("http://localhost:3000");
  });

  it("preview 배포는 localhost여도 통과한다", () => {
    setEnv({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      CONTEXT: undefined,
      SEO_REQUIRE_PUBLIC_ORIGIN: undefined,
    });
    expect(siteOrigin()).toBe("http://localhost:3000");
    setEnv({ VERCEL_ENV: undefined, CONTEXT: "deploy-preview" });
    expect(siteOrigin()).toBe("http://localhost:3000");
  });

  it("실제 운영 배포에서 localhost면 실패시킨다", () => {
    setEnv({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      CONTEXT: undefined,
      SEO_REQUIRE_PUBLIC_ORIGIN: undefined,
    });
    expect(() => siteOrigin()).toThrow(/로컬 주소/);
  });

  it("운영 배포에서 변수가 비어 기본값으로 떨어져도 실패시킨다", () => {
    setEnv({
      CONTEXT: "production",
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_ENV: undefined,
      SEO_REQUIRE_PUBLIC_ORIGIN: undefined,
    });
    expect(() => siteOrigin()).toThrow(/다시 빌드/);
  });

  it("운영 배포에 공개 도메인이 있으면 통과한다", () => {
    setEnv({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://example.org/어딘가",
      CONTEXT: undefined,
      SEO_REQUIRE_PUBLIC_ORIGIN: undefined,
    });
    // origin만 남는다 — 경로는 버린다.
    expect(siteOrigin()).toBe("https://example.org");
  });

  it("신호가 없는 환경에서도 SEO_REQUIRE_PUBLIC_ORIGIN=1로 강제할 수 있다", () => {
    setEnv({
      SEO_REQUIRE_PUBLIC_ORIGIN: "1",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      VERCEL_ENV: undefined,
      CONTEXT: undefined,
    });
    expect(() => siteOrigin()).toThrow();
  });

  it("플랫폼의 production 판정은 SEO_REQUIRE_PUBLIC_ORIGIN=0으로 끌 수 없다", () => {
    setEnv({
      VERCEL_ENV: "production",
      SEO_REQUIRE_PUBLIC_ORIGIN: "0",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      CONTEXT: undefined,
    });
    expect(() => siteOrigin()).toThrow(/로컬 주소/);

    setEnv({ VERCEL_ENV: undefined, CONTEXT: "production" });
    expect(() => siteOrigin()).toThrow(/로컬 주소/);
  });

  it("=0은 preview·로컬을 막지 않던 기존 동작을 그대로 둔다", () => {
    setEnv({
      VERCEL_ENV: "preview",
      SEO_REQUIRE_PUBLIC_ORIGIN: "0",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      CONTEXT: undefined,
    });
    expect(siteOrigin()).toBe("http://localhost:3000");
  });
});
