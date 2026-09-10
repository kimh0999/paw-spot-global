import { beforeEach, describe, expect, it, vi } from "vitest";

// DB에 붙지 않고 조회 조건만 본다. 검증 대상은 각 쿼리가 실어 보내는 `where`와 `select`다.
const { findMany, findFirst, findUnique, queryRaw } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    vetClinic: { findMany, findFirst, findUnique },
    $queryRaw: queryRaw,
  },
}));

import {
  getAdminVetClinics,
  getPublicVetClinicById,
  getPublicVetClinics,
} from "./queries";

/**
 * 사용자 화면에는 **공개된 병원만** 내보낸다.
 * 임시저장·숨김은 목록에도 상세에도 나오지 않아야 하고, 관리자 내부 메모는 공개 조회의
 * select에 들어가면 안 된다 — 타입에서 빼도 쿼리가 실어 오면 언젠가 화면이 읽는다.
 */
describe("동물병원 공개 범위", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue(null);
    queryRaw.mockResolvedValue([]);
  });

  it("공개 목록은 VISIBLE만 조회한다", async () => {
    await getPublicVetClinics(null);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visibility: "VISIBLE" } }),
    );
  });

  it("공개 상세도 VISIBLE 조건을 함께 건다 — URL을 알아도 임시저장은 열리지 않는다", async () => {
    await getPublicVetClinicById("clinic-1", null);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "clinic-1", visibility: "VISIBLE" } }),
    );
  });

  it("공개 조회는 관리자 메모를 select하지 않는다", async () => {
    await getPublicVetClinics(null);
    const select = findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("adminNote");
    expect(select).not.toHaveProperty("visibility");
  });

  it("관리자 목록은 공개 상태로 거르지 않는다", async () => {
    await getAdminVetClinics();
    expect(findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: expect.anything() }),
    );
  });
});
