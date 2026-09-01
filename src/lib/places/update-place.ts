import { Prisma } from "@prisma/client";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import { reconcileConditionColumns } from "@/lib/places/condition-consistency";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import {
  resolvePolicyDetails,
  type PolicyDetailsFormInput,
} from "@/lib/places/policy-details-form";
import type { PlaceUpdate } from "@/lib/validation/place";

/**
 * 빈 문자열·null·undefined를 한 값으로 본다.
 * 폼은 빈 칸을 ""로 보내고 DB는 NULL로 돌려주므로 정규화 없이는 매번 "바뀐 것"이 된다.
 */
function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** 언어 목록은 순서가 달라도 같은 값으로 본다. */
function normalizeLanguages(values: readonly string[] | null | undefined): string {
  return [...(values ?? [])].sort().join(",");
}

export async function updatePlaceRecord(
  id: string,
  input: PlaceUpdate,
  admin: VerifiedAdmin,
  policyDetailsForm?: PolicyDetailsFormInput,
): Promise<void> {
  const { location, condition, verification, ...placeData } = input;

  const currentVerification = await prisma.verification.findFirst({
    where: { placeId: id },
    orderBy: { verifiedAt: "desc" },
    select: {
      method: true,
      verifiedAt: true,
      note: true,
      rawPolicyText: true,
      sourceLanguages: true,
      sourceUrl: true,
    },
  });

  // 기존 이력은 수정하지도 지우지도 않는다. 하나라도 달라지면 새 행을 쌓아
  // "당시 확인한 원문"이 남게 한다(D-03). 원문을 비우는 것도 하나의 이력이다.
  const shouldCreateVerification = (() => {
    if (!verification) return false;
    if (!currentVerification) return true;
    const methodChanged = String(currentVerification.method) !== verification.method;
    const dateChanged =
      currentVerification.verifiedAt.getTime() !== verification.verifiedAt.getTime();
    const noteChanged =
      normalizeText(currentVerification.note) !== normalizeText(verification.note);
    const rawTextChanged =
      normalizeText(currentVerification.rawPolicyText) !==
      normalizeText(verification.rawPolicyText);
    const languagesChanged =
      normalizeLanguages(currentVerification.sourceLanguages) !==
      normalizeLanguages(verification.sourceLanguages);
    const sourceUrlChanged =
      normalizeText(currentVerification.sourceUrl) !== normalizeText(verification.sourceUrl);
    return (
      methodChanged ||
      dateChanged ||
      noteChanged ||
      rawTextChanged ||
      languagesChanged ||
      sourceUrlChanged
    );
  })();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Place"
      SET
        "tourApiId"    = ${placeData.tourApiId ?? null},
        "nameKr"       = ${placeData.nameKr},
        "nameEn"       = ${placeData.nameEn ?? null},
        category       = ${placeData.category}::"Category",
        address        = ${placeData.address},
        location       = ${pointFromLngLat(location.lng, location.lat)},
        phone          = ${placeData.phone ?? null},
        website        = ${placeData.website ?? null},
        instagram      = ${placeData.instagram ?? null},
        "thumbnailUrl" = ${placeData.thumbnailUrl ?? null},
        visibility     = ${placeData.visibility}::"PlaceVisibility",
        "updatedAt"    = now()
      WHERE id = ${id}
    `;

    // 편집기가 보내지 않은 필드(공간 예외·행동 제한·요금·위생)는 화면에 없으므로
    // 여기서 DB의 최신 값을 읽어 그대로 잇는다. 읽기·병합·쓰기가 같은 트랜잭션 안에 있다.
    const existingCondition = await tx.placeCondition.findUnique({
      where: { placeId: id },
      select: { policyDetails: true },
    });

    // 초기화 신호는 병합보다 우선한다 — 제출값과 무관하게 전체를 NULL로 되돌리고,
    // 핵심 조건 컬럼은 그대로 살려둔다.
    const policy = condition.clearPolicyDetails
      ? { write: { policyDetails: Prisma.DbNull }, effective: null }
      : resolvePolicyDetails(existingCondition?.policyDetails ?? null, policyDetailsForm);

    const conditionData = {
      indoor: condition.indoor,
      maxDogSize: condition.maxDogSize,
      breedRestrictions: condition.breedRestrictions ?? null,
      requiredItems: condition.requiredItems,
      cautions: condition.cautions ?? null,
      ...reconcileConditionColumns(policy.effective, condition),
      ...policy.write,
    };

    await tx.placeCondition.upsert({
      where: { placeId: id },
      create: { placeId: id, ...conditionData },
      update: conditionData,
    });

    if (shouldCreateVerification && verification) {
      await tx.verification.create({
        data: {
          placeId: id,
          verifiedBy: admin.email,
          method: verification.method,
          verifiedAt: verification.verifiedAt,
          note: verification.note ?? null,
          rawPolicyText: verification.rawPolicyText ?? null,
          sourceLanguages: verification.sourceLanguages,
          sourceUrl: verification.sourceUrl ?? null,
        },
      });
    }
  });
}
