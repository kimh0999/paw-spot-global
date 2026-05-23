"use server";

import { randomUUID } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { pointFromLngLat } from "@/lib/geo/postgis";
import { placeInputSchema } from "@/lib/validation/place";

const TEMP_VERIFIED_BY = "local-admin";
// TODO: Auth.js 도입 후 session.user.id 또는 email로 교체

export type CreatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
};

function nullIfEmpty(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;

  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimmedString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function numberOrNaN(v: FormDataEntryValue | null): number {
  return typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
}

export async function createPlace(
  _prevState: CreatePlaceState,
  formData: FormData,
): Promise<CreatePlaceState> {
  const raw = {
    nameKr: trimmedString(formData.get("nameKr")),
    nameEn: nullIfEmpty(formData.get("nameEn")),
    category: String(formData.get("category") ?? ""),
    address: trimmedString(formData.get("address")),
    location: {
      lat: numberOrNaN(formData.get("lat")),
      lng: numberOrNaN(formData.get("lng")),
    },
    phone: nullIfEmpty(formData.get("phone")),
    website: nullIfEmpty(formData.get("website")),
    instagram: nullIfEmpty(formData.get("instagram")),
    thumbnailUrl: nullIfEmpty(formData.get("thumbnailUrl")),
    tourApiId: nullIfEmpty(formData.get("tourApiId")),
    visibility: String(formData.get("visibility") ?? "DRAFT"),
    condition: {
      indoor: String(formData.get("condition.indoor") ?? ""),
      carrier: String(formData.get("condition.carrier") ?? ""),
      strollerAllowed: formData.get("condition.strollerAllowed") === "on",
      allowedSizes: formData.getAll("condition.allowedSizes").map(String),
      breedRestrictions: nullIfEmpty(formData.get("condition.breedRestrictions")),
      requiredItems: formData.getAll("condition.requiredItems").map(String),
      cautions: nullIfEmpty(formData.get("condition.cautions")),
    },
    verification: {
      method: String(formData.get("verification.method") ?? ""),
      verifiedAt: String(formData.get("verification.verifiedAt") ?? ""),
      note: nullIfEmpty(formData.get("verification.note")) ?? undefined,
    },
  };

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
          carrier: condition.carrier,
          strollerAllowed: condition.strollerAllowed,
          allowedSizes: condition.allowedSizes,
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
