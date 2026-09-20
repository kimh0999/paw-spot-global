import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * 장소 소개·주차의 **저장 → 조회 왕복** (격리 DB).
 *
 * 폼에서 받은 값이 DB를 거쳐 공개 상세·관리자 상세까지 같은 값으로 나오는지 본다.
 * 다섯 층(폼 → 검증 스키마 → SQL → 조회 → 타입)을 지나는 값이라 한 층만 빠져도
 * 화면에서 조용히 사라진다.
 *
 *   npm run test:db -- place-fields
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

if (TEST_DATABASE_URL) {
  if (!LOCAL_HOSTS.has(new URL(TEST_DATABASE_URL).hostname)) {
    throw new Error("TEST_DATABASE_URL이 로컬 호스트가 아니다. 통합 테스트는 격리 DB에서만 돈다.");
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const suite = TEST_DATABASE_URL ? describe : describe.skip;

type Mods = {
  prisma: (typeof import("@/lib/db/prisma"))["prisma"];
  createPlaceRecord: (typeof import("./create-place"))["createPlaceRecord"];
  updatePlaceRecord: (typeof import("./update-place"))["updatePlaceRecord"];
  getPlaceById: (typeof import("./queries"))["getPlaceById"];
  getAdminPlaceById: (typeof import("./queries"))["getAdminPlaceById"];
  placeInputSchema: (typeof import("@/lib/validation/place"))["placeInputSchema"];
  placeUpdateSchema: (typeof import("@/lib/validation/place"))["placeUpdateSchema"];
};

suite("장소 소개·주차 DB 왕복 (격리 DB)", () => {
  let m: Mods;
  const admin = {
    id: "admin-fields",
    email: "admin-fields@example.test",
    name: "관리자",
    role: "ADMIN" as const,
  };

  const base = {
    nameKr: "테스트 자연휴양림",
    category: "TRAVEL" as const,
    address: "대전광역시 서구 테스트로 1",
    location: { lat: 36.2, lng: 127.3 },
    visibility: "VISIBLE" as const,
    condition: {
      indoor: "UNKNOWN",
      carrierStrollerPolicy: "UNKNOWN",
      maxDogSize: "UNKNOWN",
      leash: "UNKNOWN",
      muzzle: "UNKNOWN",
      requiredItems: [],
    },
  };

  beforeAll(async () => {
    const [prismaMod, create, update, queries, validation] = await Promise.all([
      import("@/lib/db/prisma"),
      import("./create-place"),
      import("./update-place"),
      import("./queries"),
      import("@/lib/validation/place"),
    ]);
    m = {
      prisma: prismaMod.prisma,
      createPlaceRecord: create.createPlaceRecord,
      updatePlaceRecord: update.updatePlaceRecord,
      getPlaceById: queries.getPlaceById,
      getAdminPlaceById: queries.getAdminPlaceById,
      placeInputSchema: validation.placeInputSchema,
      placeUpdateSchema: validation.placeUpdateSchema,
    };
    await m.prisma.user.upsert({
      where: { id: admin.id },
      update: {},
      create: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  });

  beforeEach(async () => {
    await m.prisma.place.deleteMany({ where: { nameKr: base.nameKr } });
  });

  async function create(overrides: Record<string, unknown> = {}) {
    const input = m.placeInputSchema.parse({
      ...base,
      verification: { method: "WEBSITE", verifiedAt: "2026-09-01" },
      ...overrides,
    });
    const { placeId } = await m.createPlaceRecord(input, admin);
    return placeId;
  }

  it("입력하지 않으면 주차는 UNKNOWN이고 소개는 비어 있다", async () => {
    const id = await create();
    const detail = await m.getPlaceById(id);
    // UNKNOWN은 "주차 불가"가 아니라 "확인되지 않음"이다.
    expect(detail?.parking).toBe("UNKNOWN");
    expect(detail?.parkingNote).toBeNull();
    expect(detail?.descriptionKr).toBeNull();
    expect(detail?.descriptionEn).toBeNull();
  });

  it("저장한 값이 공개 상세와 관리자 상세에 같은 값으로 나온다", async () => {
    const id = await create({
      descriptionKr: "메타세쿼이아 숲이 있는 휴양림이다.",
      descriptionEn: "A forest park with metasequoia trees.",
      parking: "AVAILABLE",
      parkingNote: "Free",
    });

    const detail = await m.getPlaceById(id);
    expect(detail?.descriptionKr).toBe("메타세쿼이아 숲이 있는 휴양림이다.");
    expect(detail?.descriptionEn).toBe("A forest park with metasequoia trees.");
    expect(detail?.parking).toBe("AVAILABLE");
    expect(detail?.parkingNote).toBe("Free");

    const adminDetail = await m.getAdminPlaceById(id);
    expect(adminDetail?.descriptionKr).toBe("메타세쿼이아 숲이 있는 휴양림이다.");
    expect(adminDetail?.parking).toBe("AVAILABLE");
    expect(adminDetail?.parkingNote).toBe("Free");
  });

  it("한국어 소개만 있어도 영어 소개를 만들어 내지 않는다", async () => {
    const id = await create({ descriptionKr: "한국어 원문만 있다." });
    const detail = await m.getPlaceById(id);
    expect(detail?.descriptionKr).toBe("한국어 원문만 있다.");
    // 화면이 "영문 설명이 있다"고 오해할 값을 DB가 만들어 주지 않는다.
    expect(detail?.descriptionEn).toBeNull();
  });

  it("편집으로 주차를 불가로 바꾸고 소개를 지울 수 있다", async () => {
    const id = await create({ parking: "AVAILABLE", descriptionKr: "지워질 소개" });
    const update = m.placeUpdateSchema.parse({
      ...base,
      verification: { method: "WEBSITE", verifiedAt: "2026-09-01", sourceLanguages: [] },
      parking: "UNAVAILABLE",
      parkingNote: null,
      descriptionKr: null,
    });
    await m.updatePlaceRecord(id, update, admin);

    const detail = await m.getPlaceById(id);
    expect(detail?.parking).toBe("UNAVAILABLE");
    expect(detail?.descriptionKr).toBeNull();
  });
});
