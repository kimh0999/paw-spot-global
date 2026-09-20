import { randomUUID } from "crypto";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import {
  reconcileConditionColumns,
  reconcileRequiredItems,
} from "@/lib/places/condition-consistency";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import {
  resolveReviewFields,
  type ImageAttributionWrite,
} from "@/lib/places/image-attribution-form";
import {
  resolvePolicyDetails,
  type PolicyDetailsFormInput,
} from "@/lib/places/policy-details-form";
import type { PlaceInput } from "@/lib/validation/place";

export async function createPlaceRecord(
  input: PlaceInput,
  admin: VerifiedAdmin,
  policyDetailsForm?: PolicyDetailsFormInput,
  attribution?: ImageAttributionWrite,
): Promise<{ placeId: string }> {
  const { location, condition, verification, ...placeData } = input;
  const id = randomUUID();

  // 새 장소라 기존 값이 없다. 제출이 없으면 상세 조건 없이 만들어진다.
  const policy = resolvePolicyDetails(null, policyDetailsForm);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "Place"
        (id, "tourApiId", "nameKr", "nameEn", category,
         address, location, phone, website, instagram,
         "thumbnailUrl", hours, "hoursNote",
         "descriptionKr", "descriptionEn", parking, "parkingNote",
         "usageGuideKr", "usageGuideEn", visibility,
         "createdAt", "updatedAt")
      VALUES
        (${id},
         ${placeData.tourApiId ?? null},
         ${placeData.nameKr},
         ${placeData.nameEn ?? null},
         ${placeData.category}::"Category",
         ${placeData.address},
         ${pointFromLngLat(location.lng, location.lat)},
         ${placeData.phone ?? null},
         ${placeData.website ?? null},
         ${placeData.instagram ?? null},
         ${placeData.thumbnailUrl ?? null},
         ${placeData.hours ? JSON.stringify(placeData.hours) : null}::jsonb,
         ${placeData.hoursNote ?? null},
         ${placeData.descriptionKr ?? null},
         ${placeData.descriptionEn ?? null},
         ${placeData.parking}::"ParkingAvailability",
         ${placeData.parkingNote ?? null},
         ${placeData.usageGuideKr ?? null},
         ${placeData.usageGuideEn ?? null},
         ${placeData.visibility}::"PlaceVisibility",
         now(),
         now())
    `;

    await tx.placeCondition.create({
      data: {
        placeId: id,
        indoor: condition.indoor,
        maxDogSize: condition.maxDogSize,
        breedRestrictions: condition.breedRestrictions ?? null,
        requiredItems: reconcileRequiredItems(policy.effective, condition.requiredItems),
        cautions: condition.cautions ?? null,
        ...reconcileConditionColumns(policy.effective, condition),
        ...policy.write,
      },
    });

    // 새 장소라 이어받을 검토 기록이 없다. 확인 표시가 있으면 지금이 검토 시각이다(D-22).
    if (attribution?.action === "upsert") {
      const review = resolveReviewFields(attribution, null, admin.email, new Date());
      await tx.placeImageAttribution.create({
        data: { placeId: id, ...attribution.data, ...review },
      });
    }

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
  });

  return { placeId: id };
}
