import { Prisma } from "@prisma/client";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import {
  reconcileConditionColumns,
  reconcileRequiredItems,
} from "@/lib/places/condition-consistency";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import {
  attributionReviewTarget,
  resolveReviewFields,
  type ImageAttributionWrite,
} from "@/lib/places/image-attribution-form";
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
  attribution?: ImageAttributionWrite,
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
        hours          = ${placeData.hours ? JSON.stringify(placeData.hours) : null}::jsonb,
        "hoursNote"    = ${placeData.hoursNote ?? null},
        "descriptionKr" = ${placeData.descriptionKr ?? null},
        "descriptionEn" = ${placeData.descriptionEn ?? null},
        parking        = ${placeData.parking}::"ParkingAvailability",
        "parkingNote"  = ${placeData.parkingNote ?? null},
        "usageGuideKr" = ${placeData.usageGuideKr ?? null},
        "usageGuideEn" = ${placeData.usageGuideEn ?? null},
        visibility     = ${placeData.visibility}::"PlaceVisibility",
        "updatedAt"    = now()
      WHERE id = ${id}
    `;

    // 편집기가 제출되지 않았으면 기존 JSON을 그대로 두어야 하고, 제출됐어도 화면에 없는
    // 필드(version 등)는 DB 값을 이어야 한다. 읽기·병합·쓰기가 같은 트랜잭션 안에 있다.
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
      requiredItems: reconcileRequiredItems(policy.effective, condition.requiredItems),
      cautions: condition.cautions ?? null,
      ...reconcileConditionColumns(policy.effective, condition),
      ...policy.write,
    };

    await tx.placeCondition.upsert({
      where: { placeId: id },
      create: { placeId: id, ...conditionData },
      update: conditionData,
    });

    // 이미지 출처 (D-22). 읽기·병합·쓰기가 같은 트랜잭션 안에 있어야 검토 기록을
    // 이어받을지 버릴지가 저장 시점의 값으로 정해진다.
    if (attribution?.action === "delete") {
      await tx.placeImageAttribution.deleteMany({ where: { placeId: id } });
    } else if (attribution?.action === "upsert") {
      const current = await tx.placeImageAttribution.findUnique({
        where: { placeId: id },
        select: {
          imageUrl: true,
          provider: true,
          copyrightHolder: true,
          workTitle: true,
          createdYear: true,
          sourceUrl: true,
          licenseType: true,
          licenseUrl: true,
          reviewedBy: true,
          reviewedAt: true,
        },
      });
      const review = resolveReviewFields(
        attribution,
        current
          ? {
              reviewedBy: current.reviewedBy,
              reviewedAt: current.reviewedAt,
              // 이전 기록이 무엇을 확인한 것이었는지를 같은 방식으로 만든다.
              target: attributionReviewTarget({
                imageUrl: current.imageUrl,
                provider: current.provider,
                copyrightHolder: current.copyrightHolder,
                workTitle: current.workTitle,
                createdYear: current.createdYear,
                sourceUrl: current.sourceUrl,
                licenseType: current.licenseType,
                licenseUrl: current.licenseUrl,
              }),
            }
          : null,
        admin.email,
        new Date(),
      );
      const data = { ...attribution.data, ...review };
      await tx.placeImageAttribution.upsert({
        where: { placeId: id },
        create: { placeId: id, ...data },
        update: data,
      });
    }

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
