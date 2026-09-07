import { beforeEach, describe, expect, it, vi } from "vitest";

// DB에 붙지 않고 조회 조건만 본다. 검증 대상은 각 쿼리가 실어 보내는 `where`다.
const { placeFindMany, placeCount, placeFindUnique, favoriteFindMany, queryRaw } =
  vi.hoisted(() => ({
    placeFindMany: vi.fn(),
    placeCount: vi.fn(),
    placeFindUnique: vi.fn(),
    favoriteFindMany: vi.fn(),
    queryRaw: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    place: {
      findMany: placeFindMany,
      count: placeCount,
      findUnique: placeFindUnique,
    },
    favorite: { findMany: favoriteFindMany },
    $queryRaw: queryRaw,
  },
}));

import { getFavoritePlaces } from "@/lib/favorites/queries";
import { MVP_PLACE_CATEGORIES } from "@/lib/places/constants";
import {
  getAdminPlaces,
  getCategoryPlaces,
  getPlaceById,
  getPlaces,
} from "@/lib/places/queries";

/**
 * 결정 D-07 — 사용자 화면에는 **검증 이력이 1건 이상 있는 공개 장소만** 내보낸다.
 *
 * 확인 방법과 확인일이 없는 장소를 "그래도 공개 상태니까" 노출하면, 서비스가 약속한
 * "운영자가 확인한 정보"라는 전제가 무너진다. 임시 검증 이력을 만들어 채우지도 않는다.
 */
const REQUIRES_VERIFICATION = { some: {} };

beforeEach(() => {
  vi.clearAllMocks();
  placeFindMany.mockResolvedValue([]);
  placeCount.mockResolvedValue(0);
  favoriteFindMany.mockResolvedValue([]);
  queryRaw.mockResolvedValue([]);
});

describe("D-07 공개 조건 — 사용자 조회", () => {
  it("getPlaces는 검증 이력이 있는 장소만 찾는다", async () => {
    await getPlaces();

    const where = placeFindMany.mock.calls[0][0].where;
    expect(where.visibility).toBe("VISIBLE");
    expect(where.verifications).toEqual(REQUIRES_VERIFICATION);
  });

  it("getPlaces는 기존 카테고리 범위를 그대로 유지한다", async () => {
    await getPlaces();

    // 공개 조건을 더하면서 MVP 카테고리 제한이 사라지면 ETC가 목록에 새어 든다.
    const where = placeFindMany.mock.calls[0][0].where;
    expect(where.category).toEqual({ in: [...MVP_PLACE_CATEGORIES] });
  });

  it("getCategoryPlaces는 목록과 건수에 같은 조건을 쓴다", async () => {
    await getCategoryPlaces("cafe");

    const listWhere = placeFindMany.mock.calls[0][0].where;
    const countWhere = placeCount.mock.calls[0][0].where;

    expect(listWhere.verifications).toEqual(REQUIRES_VERIFICATION);
    // 카드 목록과 "추천 장소 N곳"이 어긋나면 안 된다.
    expect(countWhere).toEqual(listWhere);
    expect(listWhere.category).toBe("CAFE");
  });

  it("getFavoritePlaces는 즐겨찾기한 장소에도 같은 조건을 적용한다", async () => {
    await getFavoritePlaces("user-1");

    const where = favoriteFindMany.mock.calls[0][0].where;
    expect(where.userId).toBe("user-1");
    expect(where.place).toEqual({
      visibility: "VISIBLE",
      verifications: REQUIRES_VERIFICATION,
    });
  });

  it("getPlaceById는 검증 이력이 없으면 공개 중이어도 감춘다", async () => {
    placeFindUnique.mockResolvedValue({
      id: "place-1",
      visibility: "VISIBLE",
      verifications: [],
    });

    await expect(getPlaceById("place-1")).resolves.toBeNull();
  });

  it("getPlaceById는 공개 상태가 아니면 검증 이력이 있어도 감춘다", async () => {
    placeFindUnique.mockResolvedValue({
      id: "place-1",
      visibility: "DRAFT",
      verifications: [{ verifiedAt: new Date("2026-09-01"), method: "PHONE" }],
    });

    await expect(getPlaceById("place-1")).resolves.toBeNull();
  });

  it("getPlaceById는 두 조건을 모두 만족하면 통과시킨다", async () => {
    placeFindUnique.mockResolvedValue({
      id: "place-1",
      nameKr: "테스트 카페",
      nameEn: null,
      category: "CAFE",
      address: "대전시 서구 둔산동",
      phone: null,
      website: null,
      instagram: null,
      thumbnailUrl: null,
      visibility: "VISIBLE",
      condition: null,
      verifications: [
        {
          verifiedAt: new Date(2026, 8, 1),
          method: "PHONE",
          note: null,
          rawPolicyText: null,
          sourceLanguages: [],
          sourceUrl: null,
        },
      ],
    });

    await expect(getPlaceById("place-1")).resolves.not.toBeNull();
  });
});

describe("D-07 공개 조건 — 관리자 조회는 제외", () => {
  it("getAdminPlaces는 검증 이력을 요구하지 않는다", async () => {
    await getAdminPlaces();

    // 운영자는 아직 검증하지 않은 후보를 봐야 검증을 시작할 수 있다.
    // 공개 조건을 관리자까지 확대하면 새 장소를 영원히 검증할 수 없게 된다.
    const args = placeFindMany.mock.calls[0][0];
    expect(args?.where?.verifications).toBeUndefined();
  });
});
