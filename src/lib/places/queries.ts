import { prisma } from "@/lib/db/prisma";
import type { PlaceListItem } from "@/types/place";

export function mapIndoorPolicy(indoor: string): boolean | null {
  if (indoor === "ALLOWED") return true;
  if (indoor === "OUTDOOR_ONLY" || indoor === "NOT_ALLOWED") return false;
  return null; // UNKNOWN
}

export function mapCarrierPolicy(carrier: string): boolean | null {
  if (carrier === "REQUIRED") return true;
  if (carrier === "NOT_REQUIRED" || carrier === "OPTIONAL") return false;
  return null; // UNKNOWN
}

export function mapDogSizes(
  sizes: string[],
): Array<"small" | "medium" | "large"> {
  return sizes.flatMap((s) => {
    if (s === "SMALL") return ["small" as const];
    if (s === "MEDIUM") return ["medium" as const];
    if (s === "LARGE") return ["large" as const];
    return [];
  });
}

export function mapCategory(
  cat: string,
): "cafe" | "restaurant" | "travel" | "etc" {
  if (cat === "CAFE") return "cafe";
  if (cat === "RESTAURANT") return "restaurant";
  if (cat === "TRAVEL") return "travel";
  return "etc";
}

export function mapVerificationMethod(method: string): string {
  switch (method) {
    case "PHONE":
      return "Phone";
    case "DM":
      return "DM";
    case "WEBSITE":
      return "Website";
    case "ON_SITE":
      return "On-site";
    case "USER_REPORT":
      return "User report";
    default:
      return method;
  }
}

function formatVerifiedAt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

async function findPlaces() {
  return prisma.place.findMany({
    where: { visibility: "VISIBLE" },
    select: {
      id: true,
      nameKr: true,
      nameEn: true,
      category: true,
      address: true,
      thumbnailUrl: true,
      condition: {
        select: {
          indoor: true,
          carrier: true,
          allowedSizes: true,
          strollerAllowed: true,
          cautions: true,
        },
      },
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: {
          verifiedAt: true,
          method: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

type RawPlace = Awaited<ReturnType<typeof findPlaces>>[number];

export function toPlaceListItem(row: RawPlace): PlaceListItem {
  const latestVerification = row.verifications[0] ?? null;
  return {
    id: row.id,
    nameKr: row.nameKr,
    nameEn: row.nameEn,
    category: mapCategory(String(row.category)),
    address: row.address,
    thumbnailUrl: row.thumbnailUrl,
    indoorAllowed: row.condition
      ? mapIndoorPolicy(String(row.condition.indoor))
      : null,
    carrierRequired: row.condition
      ? mapCarrierPolicy(String(row.condition.carrier))
      : null,
    strollerAllowed: row.condition?.strollerAllowed ?? null,
    dogSizesAllowed: row.condition
      ? mapDogSizes(row.condition.allowedSizes.map(String))
      : [],
    caution: row.condition?.cautions ?? null,
    latestVerifiedAt: latestVerification
      ? formatVerifiedAt(latestVerification.verifiedAt)
      : null,
    verificationMethod: latestVerification
      ? mapVerificationMethod(String(latestVerification.method))
      : null,
  };
}

export async function getPlaces(): Promise<PlaceListItem[]> {
  const rows = await findPlaces();
  return rows.map(toPlaceListItem);
}
