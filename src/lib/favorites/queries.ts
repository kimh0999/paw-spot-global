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
    // 공개 조건은 목록·홈과 같아야 한다(D-07). 즐겨찾기에 담아 뒀더라도
    // 검증 이력이 없으면 목록에서 사라진다 — 기획서 v3 §4-1이 명시한 동작이다.
    where: { userId, place: { visibility: "VISIBLE", verifications: { some: {} } } },
    orderBy: { createdAt: "desc" },
    select: { place: { select: placeListSelect } },
  });

  return favorites.map((favorite) => toPlaceListItem(favorite.place));
}
