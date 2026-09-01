import { Prisma } from "@prisma/client";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import { reconciledColumns } from "@/lib/places/condition-consistency";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import type { PlaceUpdate } from "@/lib/validation/place";

export async function updatePlaceRecord(
  id: string,
  input: PlaceUpdate,
  admin: VerifiedAdmin,
): Promise<void> {
  const { location, condition, verification, ...placeData } = input;

  const currentVerification = await prisma.verification.findFirst({
    where: { placeId: id },
    orderBy: { verifiedAt: "desc" },
    select: { method: true, verifiedAt: true, note: true },
  });

  const shouldCreateVerification = (() => {
    if (!verification) return false;
    if (!currentVerification) return true;
    const methodChanged = String(currentVerification.method) !== verification.method;
    const dateChanged =
      currentVerification.verifiedAt.getTime() !== verification.verifiedAt.getTime();
    const noteChanged =
      (currentVerification.note ?? null) !== (verification.note ?? null);
    return methodChanged || dateChanged || noteChanged;
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

    // policyDetails를 보내지 않은 입력은 기존 JSON을 지우지 않고 그대로 둔다.
    // 초기화 신호가 오면 DB NULL로 되돌린다 — 핵심 조건 컬럼은 그대로 살려둔다.
    const policyDetailsWrite = condition.clearPolicyDetails
      ? { policyDetails: Prisma.DbNull }
      : condition.policyDetails
        ? { policyDetails: condition.policyDetails }
        : {};

    const conditionData = {
      indoor: condition.indoor,
      maxDogSize: condition.maxDogSize,
      breedRestrictions: condition.breedRestrictions ?? null,
      requiredItems: condition.requiredItems,
      cautions: condition.cautions ?? null,
      ...reconciledColumns(condition),
      ...policyDetailsWrite,
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
        },
      });
    }
  });
}
