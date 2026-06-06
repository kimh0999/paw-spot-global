import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import type { PlaceUpdate } from "@/lib/validation/place";

const TEMP_VERIFIED_BY = "local-admin";
// TODO: Auth.js 도입 후 session.user.id 또는 email로 교체

export async function updatePlaceRecord(
  id: string,
  input: PlaceUpdate,
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

    await tx.placeCondition.upsert({
      where: { placeId: id },
      create: {
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
      update: {
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

    if (shouldCreateVerification && verification) {
      await tx.verification.create({
        data: {
          placeId: id,
          verifiedBy: TEMP_VERIFIED_BY,
          method: verification.method,
          verifiedAt: verification.verifiedAt,
          note: verification.note ?? null,
        },
      });
    }
  });
}
