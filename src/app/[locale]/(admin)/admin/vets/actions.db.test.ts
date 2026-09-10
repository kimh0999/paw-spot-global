import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 서버 액션의 권한 검증 — **실제 진입점**에서 확인한다.
 *
 * 화면 접근은 `/admin/*` 레이아웃 가드가 막지만, 그 가드는 **액션 호출을 막지 않는다.**
 * 비로그인·일반 사용자가 액션을 직접 부를 수 있으므로 액션이 스스로 거절해야 하고,
 * 거절했을 때 **DB가 바뀌지 않아야** 한다. 그 둘을 격리 DB로 함께 확인한다.
 *
 * **이 테스트는 세션을 대체(mock)한다.** 실제 로그인 세션의 브라우저 검증과는 다른 층위이며
 * 보고서에서 구분한다.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

if (TEST_DATABASE_URL) {
  if (!LOCAL_HOSTS.has(new URL(TEST_DATABASE_URL).hostname)) {
    throw new Error("TEST_DATABASE_URL이 로컬 호스트가 아니다. 통합 테스트는 격리 DB에서만 돈다.");
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

/** `auth()`가 돌려줄 세션. 각 테스트가 바꾼다. */
const session = vi.hoisted(() => ({ current: null as null | { user?: { email?: string } } }));

vi.mock("@/auth", () => ({
  auth: async () => session.current,
}));

// revalidatePath는 요청 컨텍스트를 요구한다. 권한 검증과 무관하므로 비운다.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("병원 관리자 액션 권한 (격리 DB)", () => {
  let prisma: typeof import("@/lib/db/prisma")["prisma"];
  let createVetClinicAction: typeof import("./actions")["createVetClinicAction"];
  let updateVetClinicAction: typeof import("./actions")["updateVetClinicAction"];

  const ADMIN_EMAIL = "vet-admin@example.test";
  const USER_EMAIL = "vet-user@example.test";

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      nameKr: "권한테스트동물병원",
      nameEn: null,
      district: "seo",
      address: "대전 서구 둔산동 3",
      phone: "042-111-1111",
      website: null,
      location: null,
      englishSupport: { status: "UNKNOWN", condition: null },
      afterHours: { status: "UNKNOWN", condition: null },
      visibility: "DRAFT",
      adminNote: null,
      collectedAt: null,
      verifications: [],
      ...overrides,
    };
  }

  function formData(body: Record<string, unknown>, id?: string) {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(body));
    if (id) fd.set("id", id);
    return fd;
  }

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ({ createVetClinicAction, updateVetClinicAction } = await import("./actions"));

    // 권한 판정은 DB의 role을 읽는다. 두 사용자를 실제로 만든다.
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { role: "ADMIN" },
      create: { email: ADMIN_EMAIL, name: "관리자", role: "ADMIN" },
    });
    await prisma.user.upsert({
      where: { email: USER_EMAIL },
      update: { role: "USER" },
      create: { email: USER_EMAIL, name: "일반", role: "USER" },
    });
  });

  beforeEach(async () => {
    session.current = null;
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "VetClinic" CASCADE');
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "VetClinic" CASCADE');
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, USER_EMAIL] } } });
    await prisma.$disconnect();
  });

  it("비로그인 생성 요청은 거절되고 DB가 그대로다", async () => {
    session.current = null;
    const result = await createVetClinicAction({ status: "idle" }, formData(payload()));

    expect(result).toEqual({ status: "error", message: "authRequired" });
    expect(await prisma.vetClinic.count()).toBe(0);
  });

  it("일반 사용자 생성 요청은 거절되고 DB가 그대로다", async () => {
    session.current = { user: { email: USER_EMAIL } };
    const result = await createVetClinicAction({ status: "idle" }, formData(payload()));

    expect(result).toEqual({ status: "error", message: "forbidden" });
    expect(await prisma.vetClinic.count()).toBe(0);
  });

  it("관리자 생성 요청은 저장된다", async () => {
    session.current = { user: { email: ADMIN_EMAIL } };
    const result = await createVetClinicAction({ status: "idle" }, formData(payload()));

    expect(result.status).toBe("success");
    expect(await prisma.vetClinic.count()).toBe(1);
  });

  it("일반 사용자의 수정·공개 전환 요청은 값을 바꾸지 못한다", async () => {
    session.current = { user: { email: ADMIN_EMAIL } };
    await createVetClinicAction({ status: "idle" }, formData(payload()));
    const clinic = await prisma.vetClinic.findFirstOrThrow();

    session.current = { user: { email: USER_EMAIL } };
    const result = await updateVetClinicAction(
      { status: "idle" },
      formData(payload({ nameKr: "탈취된이름", visibility: "VISIBLE" }), clinic.id),
    );

    expect(result).toEqual({ status: "error", message: "forbidden" });
    const after = await prisma.vetClinic.findFirstOrThrow();
    expect(after.nameKr).toBe("권한테스트동물병원");
    expect(after.visibility).toBe("DRAFT");
  });

  it("일반 사용자는 확인 기록을 추가하지 못한다", async () => {
    session.current = { user: { email: ADMIN_EMAIL } };
    await createVetClinicAction({ status: "idle" }, formData(payload()));
    const clinic = await prisma.vetClinic.findFirstOrThrow();

    session.current = { user: { email: USER_EMAIL } };
    await updateVetClinicAction(
      { status: "idle" },
      formData(
        payload({
          verifications: [
            { target: "BASIC", method: "PHONE", verifiedAt: "2026-09-09", sourceUrl: null, note: null },
          ],
        }),
        clinic.id,
      ),
    );

    expect(await prisma.vetVerification.count({ where: { clinicId: clinic.id } })).toBe(0);
  });

  it("관리자여도 공개 기준을 못 채우면 공개되지 않는다 (D-20)", async () => {
    session.current = { user: { email: ADMIN_EMAIL } };
    const result = await createVetClinicAction(
      { status: "idle" },
      formData(payload({ visibility: "VISIBLE" })),
    );

    expect(result.status).toBe("error");
    expect(result).toMatchObject({ message: "publishBlocked" });
    expect(await prisma.vetClinic.count()).toBe(0);
  });
});
