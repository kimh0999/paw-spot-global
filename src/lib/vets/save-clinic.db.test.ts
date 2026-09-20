import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * 실제 DB를 오가는 통합 테스트.
 *
 * **격리 DB에서만 돈다.** `TEST_DATABASE_URL`이 없으면 통째로 건너뛴다 —
 * 없다고 운영 연결(`DATABASE_URL`)로 대체하지 않는다. 값이 있어도 로컬 호스트가
 * 아니면 실패시킨다. 운영 DB에 테스트 데이터를 쓰는 사고를 코드가 막는다.
 *
 * 검증 대상은 **제품 코드 그대로**다. 테스트용 저장·판정 로직을 새로 만들지 않는다.
 *
 *   npm run test:db     (scripts/test-db.mjs가 컨테이너를 띄우고 URL을 넘긴다)
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
// 그래서 **동적 import 이전에** 값을 바꿔 둬야 한다.
if (TEST_DATABASE_URL) {
  assertIsolated(TEST_DATABASE_URL);
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

type Mods = {
  prisma: typeof import("@/lib/db/prisma")["prisma"];
  createVetClinic: typeof import("./save-clinic")["createVetClinic"];
  updateVetClinic: typeof import("./save-clinic")["updateVetClinic"];
  VetPublishError: typeof import("./save-clinic")["VetPublishError"];
  getPublicVetClinics: typeof import("./queries")["getPublicVetClinics"];
  getPublicVetClinicById: typeof import("./queries")["getPublicVetClinicById"];
  getVetClinicForAdmin: typeof import("./queries")["getVetClinicForAdmin"];
  vetClinicInputSchema: typeof import("./validation")["vetClinicInputSchema"];
};

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("VetClinic DB 왕복 (격리 DB)", () => {
  let m: Mods;
  const admin = { id: "admin-1", email: "admin@example.test", name: "관리자", role: "ADMIN" as const };
  const NOW = new Date("2026-09-10T00:00:00Z");

  /** 폼과 같은 스키마를 통과시킨다 — 테스트만 아는 지름길을 만들지 않는다. */
  function input(overrides: Record<string, unknown> = {}) {
    return m.vetClinicInputSchema.parse({
      nameKr: "테스트동물병원",
      nameEn: null,
      district: "seo",
      address: "대전 서구 둔산동 1",
      phone: "042-000-0000",
      website: null,
      location: { lat: 36.35, lng: 127.38 },
      hours: {
        mon: { open: "09:00", close: "18:00" },
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null,
      },
      hoursNote: "점심시간 12-13시",
      englishSupport: { status: "UNKNOWN", condition: null },
      afterHours: { status: "UNKNOWN", condition: null },
      visibility: "DRAFT",
      adminNote: "내부 메모 - 공개되면 안 된다",
      collectedAt: "2026-09-01",
      verifications: [],
      ...overrides,
    });
  }

  const basicCheck = { target: "BASIC", method: "WEBSITE", verifiedAt: "2026-09-08", sourceUrl: null, note: null };

  beforeAll(async () => {
    m = {
      prisma: (await import("@/lib/db/prisma")).prisma,
      ...(await import("./save-clinic")),
      ...(await import("./queries")),
      ...(await import("./validation")),
    } as Mods;
  });

  beforeEach(async () => {
    // CASCADE로 확인 기록까지 정리된다. 다른 테이블은 건드리지 않는다.
    await m.prisma.$executeRawUnsafe('TRUNCATE TABLE "VetClinic" CASCADE');
  });

  afterAll(async () => {
    await m.prisma.$executeRawUnsafe('TRUNCATE TABLE "VetClinic" CASCADE');
    await m.prisma.$disconnect();
  });

  it("생성한 값이 그대로 다시 조회된다", async () => {
    const id = await m.createVetClinic(input(), admin, NOW);
    const saved = await m.getVetClinicForAdmin(id);

    expect(saved?.nameKr).toBe("테스트동물병원");
    expect(saved?.phone).toBe("042-000-0000");
    expect(saved?.hoursNote).toBe("점심시간 12-13시");
    expect(saved?.visibility).toBe("DRAFT");
    // 좌표는 geography 컬럼이라 raw로 읽어 온다.
    expect(saved?.location?.lat).toBeCloseTo(36.35, 4);
    expect(saved?.location?.lng).toBeCloseTo(127.38, 4);
  });

  it("일부 필드만 고치면 나머지 값은 유지된다", async () => {
    const id = await m.createVetClinic(input(), admin, NOW);
    // 진료시간은 제출하지 않는다(`hours` 키 자체를 뺀다) — 폼의 "건드리지 않음"과 같다.
    const rest = input() as Record<string, unknown>;
    delete rest.hours;
    delete rest.hoursNote;
    await m.updateVetClinic(id, m.vetClinicInputSchema.parse({ ...rest, address: "대전 서구 둔산동 2" }), admin, NOW);

    const saved = await m.getVetClinicForAdmin(id);
    expect(saved?.address).toBe("대전 서구 둔산동 2");
    expect(saved?.hoursNote).toBe("점심시간 12-13시");
    expect((saved?.hours as { mon?: unknown } | null)?.mon).toEqual({ open: "09:00", close: "18:00" });
  });

  it("명시적 초기화는 그 값만 비우고 확인 기록은 남긴다", async () => {
    const id = await m.createVetClinic(input({ verifications: [basicCheck] }), admin, NOW);
    await m.updateVetClinic(id, input({ hours: null, hoursNote: "" }), admin, NOW);

    const saved = await m.getVetClinicForAdmin(id);
    expect(saved?.hours).toBeNull();
    expect(saved?.hoursNote).toBeNull();
    expect(saved?.nameKr).toBe("테스트동물병원");
    // 초기화 대상과 무관한 확인 기록은 그대로다.
    expect(saved?.verifications.some((v) => v.target === "BASIC")).toBe(true);
  });

  it("확인 기록이 항목과 값 스냅샷에 연결된다", async () => {
    const id = await m.createVetClinic(
      input({
        englishSupport: { status: "CONDITIONAL", condition: "평일 오전만" },
        verifications: [basicCheck, { ...basicCheck, target: "ENGLISH_SUPPORT" }],
      }),
      admin,
      NOW,
    );

    const saved = await m.getVetClinicForAdmin(id);
    const english = saved?.verifications.find((v) => v.target === "ENGLISH_SUPPORT");
    expect(english?.verifiedBy).toBe(admin.email);
    // 조건부는 상태와 조건 문구가 함께 값을 이룬다. 인코딩이 아니라 계약을 확인한다.
    const { serviceSnapshot } = await import("./verification");
    expect(english?.verifiedValue).toBe(serviceSnapshot("CONDITIONAL", "평일 오전만"));
    // 다른 항목의 기록은 다른 값을 가리킨다.
    const basic = saved?.verifications.find((v) => v.target === "BASIC");
    expect(basic?.verifiedValue).not.toBe(english?.verifiedValue);
  });

  it("값을 바꾸면 이전 확인 근거가 새 값을 검증하지 않는다", async () => {
    const id = await m.createVetClinic(
      input({
        visibility: "VISIBLE",
        englishSupport: { status: "UNAVAILABLE", condition: null },
        verifications: [basicCheck, { ...basicCheck, target: "ENGLISH_SUPPORT" }],
      }),
      admin,
      NOW,
    );

    const before = await m.getPublicVetClinicById(id, null, NOW);
    expect(before?.verification.englishSupport.confirmed).toBe(true);

    // 불가 → 가능으로 고치고 새 확인은 남기지 않는다.
    await m.updateVetClinic(
      id,
      input({ visibility: "VISIBLE", englishSupport: { status: "AVAILABLE", condition: null } }),
      admin,
      NOW,
    );

    const after = await m.getPublicVetClinicById(id, null, NOW);
    expect(after?.englishSupport).toBe("AVAILABLE");
    expect(after?.verification.englishSupport.confirmed).toBe(false);
    expect(after?.verification.englishSupport.staleByValueChange).toBe(true);
  });

  it("주소를 고쳐도 영어 응대·야간 진료 확인일은 갱신되지 않는다", async () => {
    const id = await m.createVetClinic(
      input({
        visibility: "VISIBLE",
        englishSupport: { status: "AVAILABLE", condition: null },
        afterHours: { status: "AVAILABLE", condition: null },
        verifications: [
          basicCheck,
          { ...basicCheck, target: "ENGLISH_SUPPORT" },
          { ...basicCheck, target: "AFTER_HOURS" },
        ],
      }),
      admin,
      NOW,
    );

    const before = await m.getPublicVetClinicById(id, null, NOW);
    const englishAt = before?.verification.englishSupport.evidence?.verifiedAt;
    const afterHoursAt = before?.verification.afterHours.evidence?.verifiedAt;

    // 주소만 고치고 BASIC만 다시 확인한다.
    await m.updateVetClinic(
      id,
      input({
        address: "대전 서구 둔산동 99",
        visibility: "VISIBLE",
        englishSupport: { status: "AVAILABLE", condition: null },
        afterHours: { status: "AVAILABLE", condition: null },
        verifications: [{ ...basicCheck, verifiedAt: "2026-09-09" }],
      }),
      admin,
      NOW,
    );

    const after = await m.getPublicVetClinicById(id, null, NOW);
    expect(after?.verification.englishSupport.evidence?.verifiedAt).toEqual(englishAt);
    expect(after?.verification.afterHours.evidence?.verifiedAt).toEqual(afterHoursAt);
    // BASIC은 새 주소를 확인한 기록으로 갱신된다.
    expect(after?.verification.basic.confirmed).toBe(true);
  });

  it("임시저장·숨김은 공개 목록과 상세에서 빠지고 공개는 다시 보인다", async () => {
    const id = await m.createVetClinic(input({ verifications: [basicCheck] }), admin, NOW);

    expect(await m.getPublicVetClinics(null, NOW)).toHaveLength(0);
    expect(await m.getPublicVetClinicById(id, null, NOW)).toBeNull();

    await m.updateVetClinic(id, input({ visibility: "VISIBLE", verifications: [basicCheck] }), admin, NOW);
    expect(await m.getPublicVetClinics(null, NOW)).toHaveLength(1);
    expect(await m.getPublicVetClinicById(id, null, NOW)).not.toBeNull();

    await m.updateVetClinic(id, input({ visibility: "HIDDEN" }), admin, NOW);
    expect(await m.getPublicVetClinics(null, NOW)).toHaveLength(0);
    expect(await m.getPublicVetClinicById(id, null, NOW)).toBeNull();
  });

  it("영어·야간이 미확인이어도 기본 정보 근거가 있으면 공개된다 (D-20)", async () => {
    const id = await m.createVetClinic(
      input({ visibility: "VISIBLE", verifications: [basicCheck] }),
      admin,
      NOW,
    );
    const saved = await m.getPublicVetClinicById(id, null, NOW);
    expect(saved?.englishSupport).toBe("UNKNOWN");
    expect(saved?.afterHours).toBe("UNKNOWN");
    expect(saved).not.toBeNull();
  });

  it("기본 정보 확인 근거가 없으면 공개를 거부하고 DB도 바뀌지 않는다", async () => {
    await expect(
      m.createVetClinic(input({ visibility: "VISIBLE" }), admin, NOW),
    ).rejects.toBeInstanceOf(m.VetPublishError);

    expect(await m.prisma.vetClinic.count()).toBe(0);
  });

  it("관리자 메모는 공개 응답에 들어가지 않는다", async () => {
    const id = await m.createVetClinic(
      input({ visibility: "VISIBLE", verifications: [basicCheck] }),
      admin,
      NOW,
    );

    const detail = await m.getPublicVetClinicById(id, null, NOW);
    const list = await m.getPublicVetClinics(null, NOW);

    // 직렬화된 전체 페이로드에서도 문자열이 새어 나오지 않아야 한다.
    expect(JSON.stringify(detail)).not.toContain("내부 메모");
    expect(JSON.stringify(list)).not.toContain("내부 메모");
    expect(detail).not.toHaveProperty("adminNote");
  });

  it("좌표를 비우면 거리를 만들지 않는다", async () => {
    const id = await m.createVetClinic(
      input({ visibility: "VISIBLE", location: null, verifications: [basicCheck] }),
      admin,
      NOW,
    );
    const [clinic] = await m.getPublicVetClinics({ lat: 36.35, lng: 127.38 }, NOW);
    expect(clinic.id).toBe(id);
    expect(clinic.location).toBeNull();
    expect(clinic.distanceMeters).toBeNull();
  });

  it("좌표가 있으면 사용자 위치 기준 거리를 만든다", async () => {
    await m.createVetClinic(
      input({ visibility: "VISIBLE", verifications: [basicCheck] }),
      admin,
      NOW,
    );
    const [clinic] = await m.getPublicVetClinics({ lat: 36.36, lng: 127.39 }, NOW);
    expect(clinic.distanceMeters).toBeGreaterThan(0);
    expect(clinic.distanceMeters).toBeLessThan(3000);
  });

  /**
   * 삭제는 **제품 코드에 경로가 없다.** 관리자 화면·서버 액션·`save-clinic` 어디에도
   * 병원을 지우는 함수가 없으므로 여기서 확인하는 것은 마이그레이션이 선언한
   * `ON DELETE CASCADE`가 실제로 그렇게 동작하는가뿐이다. 제품에 삭제 기능을 만들어
   * 넣지 않는다.
   */
  it("병원을 지우면 연결된 확인 기록도 함께 사라진다 (FK CASCADE)", async () => {
    const id = await m.createVetClinic(
      input({ verifications: [basicCheck] }),
      admin,
      NOW,
    );
    expect(await m.prisma.vetVerification.count({ where: { clinicId: id } })).toBeGreaterThan(0);

    await m.prisma.vetClinic.delete({ where: { id } });

    expect(await m.prisma.vetClinic.findUnique({ where: { id } })).toBeNull();
    // 고아 행이 남으면 안 된다.
    expect(await m.prisma.vetVerification.count({ where: { clinicId: id } })).toBe(0);
  });

  it("존재하지 않는 ID는 공개·관리자 조회 모두 null이다", async () => {
    // 형식은 정상이지만 없는 ID. 상세 페이지는 이 null을 받아 notFound()로 간다.
    const missing = "clw0000000000000000000000";
    expect(await m.getPublicVetClinicById(missing, null, NOW)).toBeNull();
    expect(await m.getVetClinicForAdmin(missing)).toBeNull();
  });
});
