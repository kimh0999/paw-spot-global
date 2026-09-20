import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * 이미지 출처가 DB → 조회 → 공개 화면까지 실제로 이어지는지 (결정 D-22).
 *
 * **격리 DB에서만 돈다.** `TEST_DATABASE_URL`이 없으면 통째로 건너뛴다 —
 * 없다고 운영 연결(`DATABASE_URL`)로 대체하지 않는다. 값이 있어도 로컬 호스트가
 * 아니면 실패시킨다. 운영 DB에 테스트 데이터를 쓰는 사고를 코드가 막는다.
 *
 *   npm run test:db -- image-attribution
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function assertIsolated(url: string): void {
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      "TEST_DATABASE_URL이 로컬 호스트가 아니다. 통합 테스트는 격리 DB에서만 돈다.",
    );
  }
}

// 제품 코드의 prisma 클라이언트는 import 시점에 DATABASE_URL로 어댑터를 만든다.
if (TEST_DATABASE_URL) {
  assertIsolated(TEST_DATABASE_URL);
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

type Mods = {
  prisma: typeof import("@/lib/db/prisma")["prisma"];
  createPlaceRecord: typeof import("./create-place")["createPlaceRecord"];
  updatePlaceRecord: typeof import("./update-place")["updatePlaceRecord"];
  getPlaceById: typeof import("./queries")["getPlaceById"];
  getCategoryPlaces: typeof import("./queries")["getCategoryPlaces"];
  getAdminPlaceById: typeof import("./queries")["getAdminPlaceById"];
  placeInputSchema: typeof import("@/lib/validation/place")["placeInputSchema"];
  placeUpdateSchema: typeof import("@/lib/validation/place")["placeUpdateSchema"];
  resolveImageAttributionWrite: typeof import("./image-attribution-form")["resolveImageAttributionWrite"];
};

const suite = TEST_DATABASE_URL ? describe : describe.skip;

const KTO_IMAGE = "https://tong.visitkorea.or.kr/cms/resource/42/fixture_image2_1.jpg";
const KTO_IMAGE_OTHER = "https://tong.visitkorea.or.kr/cms/resource/42/other_image2_1.jpg";
const OWN_IMAGE = "https://cdn.pawspot.example.io/place-1.jpg";

suite("이미지 출처 DB 왕복 (격리 DB)", () => {
  let m: Mods;
  const admin = {
    id: "admin-1",
    email: "admin@example.test",
    name: "관리자",
    role: "ADMIN" as const,
  };

  /** 폼과 같은 스키마를 통과시킨다 — 테스트만 아는 지름길을 만들지 않는다. */
  function placeInput(overrides: Record<string, unknown> = {}) {
    return m.placeInputSchema.parse({
      nameKr: "테스트 휴양림",
      category: "TRAVEL",
      address: "대전광역시 서구 테스트로 1",
      location: { lat: 36.2, lng: 127.3 },
      visibility: "VISIBLE",
      condition: {
        indoor: "UNKNOWN",
        carrierStrollerPolicy: "UNKNOWN",
        maxDogSize: "UNKNOWN",
        leash: "UNKNOWN",
        muzzle: "UNKNOWN",
        requiredItems: [],
      },
      verification: { method: "WEBSITE", verifiedAt: "2026-09-01" },
      ...overrides,
    });
  }

  function updateInput(overrides: Record<string, unknown> = {}) {
    return m.placeUpdateSchema.parse({
      nameKr: "테스트 휴양림",
      category: "TRAVEL",
      address: "대전광역시 서구 테스트로 1",
      location: { lat: 36.2, lng: 127.3 },
      visibility: "VISIBLE",
      condition: {
        indoor: "UNKNOWN",
        carrierStrollerPolicy: "UNKNOWN",
        maxDogSize: "UNKNOWN",
        leash: "UNKNOWN",
        muzzle: "UNKNOWN",
        requiredItems: [],
      },
      verification: { method: "WEBSITE", verifiedAt: "2026-09-01", sourceLanguages: [] },
      ...overrides,
    });
  }

  /** 폼 입력과 같은 경로로 저장 지시를 만든다. */
  function attribution(
    thumbnailUrl: string | null,
    overrides: Record<string, unknown> = {},
  ) {
    const result = m.resolveImageAttributionWrite(thumbnailUrl, {
      provider: "한국관광공사",
      // 공공누리 표시 항목. 값은 픽스처이며 실제 저작물 정보가 아니다.
      copyrightHolder: "확인된 작성자",
      workTitle: "확인된 저작물명",
      createdYear: "2019",
      sourceUrl: "https://kto.visitkorea.or.kr",
      licenseType: "KOGL_TYPE1",
      licenseUrl: "https://www.kogl.or.kr/info/licenseType1.do",
      reviewed: false,
      clear: false,
      ...overrides,
    });
    if ("error" in result) throw new Error(`출처 입력 오류: ${result.error}`);
    return result.write;
  }

  beforeAll(async () => {
    m = {
      prisma: (await import("@/lib/db/prisma")).prisma,
      ...(await import("./create-place")),
      ...(await import("./update-place")),
      ...(await import("./queries")),
      ...(await import("@/lib/validation/place")),
      ...(await import("./image-attribution-form")),
    } as Mods;
  });

  beforeEach(async () => {
    // CASCADE로 조건·확인 기록·출처까지 정리된다. 다른 테이블은 건드리지 않는다.
    await m.prisma.$executeRawUnsafe('TRUNCATE TABLE "Place" CASCADE');
  });

  afterAll(async () => {
    await m.prisma.$executeRawUnsafe('TRUNCATE TABLE "Place" CASCADE');
    await m.prisma.$disconnect();
  });

  it("검토 전 출처가 붙은 관광공사 이미지는 공개 조회에서 주소째 빠진다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE),
    );

    const detail = await m.getPlaceById(placeId);
    expect(detail).not.toBeNull();
    expect(detail?.thumbnailUrl).toBeNull();
    expect(detail?.imageAttribution).toBeNull();

    // 목록도 같은 판정을 쓴다. 한쪽에서만 새어 나가지 않는다.
    const list = await m.getCategoryPlaces("travel");
    expect(list.places[0]?.thumbnailUrl).toBeNull();
  });

  it("관리자 화면에는 주소와 보완할 이유가 그대로 보인다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE),
    );

    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.thumbnailUrl).toBe(KTO_IMAGE);
    expect(adminView?.imageAttributionStatus).toBe("unreviewed");
    expect(adminView?.imageAttribution?.provider).toBe("한국관광공사");
    expect(adminView?.imageAttribution?.reviewedAt).toBeNull();
  });

  it("검토 체크를 해도 표시 항목이 비면 공개되지 않고 무엇이 비었는지 알려 준다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, {
        reviewed: true,
        copyrightHolder: "",
        workTitle: "",
        createdYear: "",
      }),
    );

    expect((await m.getPlaceById(placeId))?.thumbnailUrl).toBeNull();
    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.imageAttributionStatus).toBe("incompleteAttribution");
    expect([...(adminView?.imageAttributionMissing ?? [])].sort()).toEqual([
      "copyrightHolder",
      "createdYear",
      "workTitle",
    ]);
    // 검토 기록 자체는 남는다 — 사람이 본 사실을 지우지 않는다.
    expect(adminView?.imageAttribution?.reviewedBy).toBe(admin.email);
  });

  it("검토를 기록하면 목록·상세 모두에 출처와 함께 나온다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { reviewed: true }),
    );

    const detail = await m.getPlaceById(placeId);
    expect(detail?.thumbnailUrl).toBe(KTO_IMAGE);
    expect(detail?.imageAttribution).toMatchObject({
      provider: "한국관광공사",
      licenseType: "KOGL_TYPE1",
      sourceUrl: "https://kto.visitkorea.or.kr",
    });

    const list = await m.getCategoryPlaces("travel");
    expect(list.places[0]?.thumbnailUrl).toBe(KTO_IMAGE);
    expect(list.places[0]?.imageAttribution?.provider).toBe("한국관광공사");

    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.imageAttributionStatus).toBe("ready");
    expect(adminView?.imageAttribution?.reviewedBy).toBe(admin.email);
  });

  it("이미지를 바꾸면 이전 검토가 승계되지 않고 공개에서 다시 빠진다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { reviewed: true }),
    );
    expect((await m.getPlaceById(placeId))?.thumbnailUrl).toBe(KTO_IMAGE);

    // 관리자가 이미지 주소만 바꾸고 검토 체크를 풀었다.
    await m.updatePlaceRecord(
      placeId,
      updateInput({ thumbnailUrl: KTO_IMAGE_OTHER }),
      admin,
      undefined,
      attribution(KTO_IMAGE_OTHER, { reviewed: false }),
    );

    const detail = await m.getPlaceById(placeId);
    expect(detail?.thumbnailUrl).toBeNull();

    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.imageAttribution?.imageUrl).toBe(KTO_IMAGE_OTHER);
    expect(adminView?.imageAttribution?.reviewedAt).toBeNull();
    expect(adminView?.imageAttributionStatus).toBe("unreviewed");
  });

  it("출처 기록을 지우면 관광공사 이미지는 다시 막힌다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { reviewed: true }),
    );
    await m.updatePlaceRecord(
      placeId,
      updateInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { clear: true }),
    );

    expect((await m.getPlaceById(placeId))?.thumbnailUrl).toBeNull();
    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.imageAttribution).toBeNull();
    expect(adminView?.imageAttributionStatus).toBe("missingRecord");
  });

  it("기존 수동 등록 이미지는 출처 기록 없이 그대로 나온다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: OWN_IMAGE }),
      admin,
      undefined,
      // 관리자가 출처 영역을 비워 둔 상태 그대로다.
      attribution(OWN_IMAGE, {
        provider: "",
        sourceUrl: "",
        licenseType: "",
        licenseUrl: "",
        copyrightHolder: "",
        workTitle: "",
        createdYear: "",
      }),
    );

    const detail = await m.getPlaceById(placeId);
    expect(detail?.thumbnailUrl).toBe(OWN_IMAGE);
    // 관광공사 출처를 붙이지 않는다.
    expect(detail?.imageAttribution).toBeNull();

    const adminView = await m.getAdminPlaceById(placeId);
    expect(adminView?.imageAttributionStatus).toBe("not_required");
    expect(adminView?.imageAttribution).toBeNull();
  });

  it("출처 기록 없이 들어온 관광공사 이미지도 공개되지 않는다", async () => {
    // 등록 스크립트가 아니라 폼으로 직접 주소만 붙여 넣은 경우.
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      { action: "delete" },
    );

    expect((await m.getPlaceById(placeId))?.thumbnailUrl).toBeNull();
    expect((await m.getAdminPlaceById(placeId))?.imageAttributionStatus).toBe("missingRecord");
  });

  it("검토를 유지한 채 다시 저장해도 검토 시각이 갱신되지 않는다", async () => {
    const { placeId } = await m.createPlaceRecord(
      placeInput({ thumbnailUrl: KTO_IMAGE }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { reviewed: true }),
    );
    const first = (await m.getAdminPlaceById(placeId))?.imageAttribution?.reviewedAt;

    await m.updatePlaceRecord(
      placeId,
      updateInput({ thumbnailUrl: KTO_IMAGE, address: "대전광역시 서구 테스트로 2" }),
      admin,
      undefined,
      attribution(KTO_IMAGE, { reviewed: true }),
    );

    const again = await m.getAdminPlaceById(placeId);
    expect(again?.imageAttribution?.reviewedAt).toBe(first);
    expect(again?.address).toBe("대전광역시 서구 테스트로 2");
  });
});
