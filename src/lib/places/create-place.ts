import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import type { PlaceInput } from "@/lib/validation/place";

const TEMP_VERIFIED_BY = "local-admin";
// TODO: Auth.js 도입 후 session.user.id 또는 email로 교체

export async function createPlaceRecord(
  input: PlaceInput,
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
        carrierStrollerPolicy: condition.carrierStrollerPolicy,
        maxDogSize: condition.maxDogSize,
        leash: condition.leash,
        muzzle: condition.muzzle,
        breedRestrictions: condition.breedRestrictions ?? null,
        requiredItems: condition.requiredItems,
        cautions: condition.cautions ?? null,
      },
    });

    await tx.verification.create({
      data: {
        placeId: id,
        verifiedBy: TEMP_VERIFIED_BY,
        method: verification.method,
        verifiedAt: verification.verifiedAt,
        note: verification.note ?? null,
      },
    });
  });

  return { placeId: id };
}
