import { prisma } from "@/lib/db/prisma";
import { placeListSelect, toPlaceListItem } from "@/lib/places/queries";
import type { PlaceListItem } from "@/types/place";

export async function getFavoritePlaceIds(userId: string): Promise<string[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { placeId: true },
  });

  return rows.map((row) => row.placeId);
}

export async function getFavoritePlaces(
  userId: string,
): Promise<PlaceListItem[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, place: { visibility: "VISIBLE" } },
    orderBy: { createdAt: "desc" },
    select: { place: { select: placeListSelect } },
  });

  return favorites.map((favorite) => toPlaceListItem(favorite.place));
}
