import { Prisma } from "@prisma/client";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import { basicSnapshot, findPublishBlockers, type PublishBlocker } from "./publish";
import type { VetClinicInput, VetVerificationInput } from "./validation";
import { serviceSnapshot, vetValueSnapshot, type VetVerificationRecord } from "./verification";

/**
 * 병원 저장.
 *
 * **제출하지 않은 값과 명시적 초기화를 구분한다.** `hours`가 `undefined`면 편집기를 열지
 * 않았다는 뜻이라 DB 값을 그대로 두고, `null`이면 관리자가 비운 것이라 NULL로 되돌린다.
 * 장소 저장(`update-place.ts`)이 `clearPolicyDetails`로 하는 구분과 같은 규칙이다.
 *
 * **확인 기록은 값에 묶어 남긴다**(D-17). 저장 시점의 값 스냅샷을 함께 적어 두면,
 * 나중에 값을 고쳤을 때 그 기록이 새 값을 검증한 것처럼 읽히지 않는다.
 */

export class VetPublishError extends Error {
  constructor(readonly blockers: PublishBlocker[]) {
    super("PUBLISH_BLOCKED");
    this.name = "VetPublishError";
  }
}

/** 저장하려는 값에서 각 항목의 스냅샷을 만든다. 읽기(`resolveVetItem`)와 같은 규칙을 쓴다. */
export function snapshotsFor(input: VetClinicInput): Record<string, string> {
  return {
    BASIC: basicSnapshot(input),
    // 시간표는 JSON이라 안정적인 문자열로 만들어 비교한다.
    HOURS: vetValueSnapshot(
      input.hours === undefined ? "<unchanged>" : JSON.stringify(input.hours),
      "|",
      input.hoursNote === undefined ? "<unchanged>" : (input.hoursNote ?? ""),
    ),
    ENGLISH_SUPPORT: serviceSnapshot(
      input.englishSupport.status,
      input.englishSupport.condition,
    ),
    AFTER_HOURS: serviceSnapshot(input.afterHours.status, input.afterHours.condition),
  };
}

function buildVerificationRows(
  clinicId: string,
  verifications: readonly VetVerificationInput[],
  snapshots: Record<string, string>,
  admin: VerifiedAdmin,
) {
  return verifications.map((verification) => ({
    clinicId,
    target: verification.target,
    method: verification.method,
    verifiedBy: admin.email,
    verifiedAt: verification.verifiedAt,
    sourceUrl: verification.sourceUrl,
    note: verification.note,
    verifiedValue: snapshots[verification.target] ?? null,
  }));
}

/** 공개하려면 저장 **후** 상태를 기준으로 판정해야 한다 — 이번에 남긴 기록도 근거가 된다. */
function assertPublishable(
  input: VetClinicInput,
  existingRecords: readonly VetVerificationRecord[],
  snapshots: Record<string, string>,
  now: Date,
): void {
  if (input.visibility !== "VISIBLE") return;

  const pending: VetVerificationRecord[] = input.verifications.map((verification) => ({
    target: verification.target,
    method: verification.method,
    verifiedAt: verification.verifiedAt,
    sourceUrl: verification.sourceUrl,
    note: verification.note,
    verifiedValue: snapshots[verification.target] ?? null,
  }));

  const blockers = findPublishBlockers(
    { ...input, records: [...existingRecords, ...pending] },
    now,
  );
  if (blockers.length > 0) throw new VetPublishError(blockers);
}

type ClinicScalarData = Omit<Prisma.VetClinicUncheckedCreateInput, "id" | "location">;

function scalarData(input: VetClinicInput): ClinicScalarData {
  const data: ClinicScalarData = {
    nameKr: input.nameKr,
    nameEn: input.nameEn,
    district: input.district,
    address: input.address,
    phone: input.phone,
    website: input.website,
    englishSupport: input.englishSupport.status,
    englishSupportCondition: input.englishSupport.condition,
    afterHours: input.afterHours.status,
    afterHoursCondition: input.afterHours.condition,
    visibility: input.visibility,
    adminNote: input.adminNote,
    collectedAt: input.collectedAt,
  };

  // undefined는 "제출하지 않음"이라 키 자체를 넣지 않는다. Prisma는 없는 키를 건드리지 않는다.
  if (input.hours !== undefined) {
    data.hours = input.hours === null ? Prisma.DbNull : input.hours;
  }
  if (input.hoursNote !== undefined) data.hoursNote = input.hoursNote;

  return data;
}

export async function createVetClinic(
  input: VetClinicInput,
  admin: VerifiedAdmin,
  now: Date = new Date(),
): Promise<string> {
  const snapshots = snapshotsFor(input);
  assertPublishable(input, [], snapshots, now);

  return prisma.$transaction(async (tx) => {
    const clinic = await tx.vetClinic.create({
      data: scalarData(input),
      select: { id: true },
    });

    if (input.location) {
      await tx.$executeRaw`
        UPDATE "VetClinic"
        SET "location" = ${pointFromLngLat(input.location.lng, input.location.lat)}
        WHERE "id" = ${clinic.id}
      `;
    }

    if (input.verifications.length > 0) {
      await tx.vetVerification.createMany({
        data: buildVerificationRows(clinic.id, input.verifications, snapshots, admin),
      });
    }

    return clinic.id;
  });
}

export async function updateVetClinic(
  id: string,
  input: VetClinicInput,
  admin: VerifiedAdmin,
  now: Date = new Date(),
): Promise<void> {
  const snapshots = snapshotsFor(input);

  await prisma.$transaction(async (tx) => {
    // 읽기·병합·쓰기가 같은 트랜잭션 안에 있어야 공개 판정이 저장 직전 상태를 본다.
    const existing = await tx.vetVerification.findMany({
      where: { clinicId: id },
      select: {
        target: true,
        method: true,
        verifiedAt: true,
        sourceUrl: true,
        note: true,
        verifiedValue: true,
      },
    });

    assertPublishable(input, existing as VetVerificationRecord[], snapshots, now);

    await tx.vetClinic.update({ where: { id }, data: scalarData(input) });

    // 좌표는 명시적으로 비울 수 있어야 한다 — 잘못 찍은 좌표로 거리를 만들지 않게.
    await tx.$executeRaw`
      UPDATE "VetClinic"
      SET "location" = ${
        input.location
          ? pointFromLngLat(input.location.lng, input.location.lat)
          : Prisma.sql`NULL`
      }
      WHERE "id" = ${id}
    `;

    if (input.verifications.length > 0) {
      // 기록은 덮어쓰지 않고 쌓는다. 과거 확인 이력이 남아야 무엇을 언제 확인했는지 읽을 수 있다.
      await tx.vetVerification.createMany({
        data: buildVerificationRows(id, input.verifications, snapshots, admin),
      });
    }
  });
}
