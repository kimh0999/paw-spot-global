import { randomUUID } from "crypto";

import type { VerifiedAdmin } from "@/lib/auth/require-admin";
import { reconciledColumns } from "@/lib/places/condition-consistency";
import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import type { PlaceInput } from "@/lib/validation/place";

export async function createPlaceRecord(
  input: PlaceInput,
  admin: VerifiedAdmin,
): Promise<{ placeId: string }> {
  const { location, condition, verification, ...placeData } = input;
  const id = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "Place"
        (id, "tourApiId", "nameKr", "nameEn", category,
         address, location, phone, website, instagram,
         "thumbnailUrl", visibility,
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
        requiredItems: condition.requiredItems,
        cautions: condition.cautions ?? null,
        ...reconciledColumns(condition),
        ...(condition.policyDetails ? { policyDetails: condition.policyDetails } : {}),
      },
    });

    await tx.verification.create({
      data: {
        placeId: id,
        verifiedBy: admin.email,
        method: verification.method,
        verifiedAt: verification.verifiedAt,
        note: verification.note ?? null,
      },
    });
  });

  return { placeId: id };
}
