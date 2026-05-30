"use server";

import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import { parsePlaceFormData } from "@/lib/places/form-data";
import { placeInputSchema } from "@/lib/validation/place";

const TEMP_VERIFIED_BY = "local-admin";
// TODO: Auth.js 도입 후 session.user.id 또는 email로 교체

export type CreatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
};

export async function createPlace(
  _prevState: CreatePlaceState,
  formData: FormData,
): Promise<CreatePlaceState> {
  const raw = parsePlaceFormData(formData);

  const parsed = placeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const { location, condition, verification, ...placeData } = parsed.data;
  const id = randomUUID();

  try {
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
  } catch (err) {
    console.error("[createPlace]", err);
    return { error: "저장 중 오류가 발생했습니다." };
  }

  return { success: true, placeId: id };
}
