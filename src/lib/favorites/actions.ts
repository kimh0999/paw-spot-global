"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export type ToggleFavoriteResult =
  | { favorited: boolean }
  | { error: "AUTH_REQUIRED" };

export async function toggleFavorite(
  placeId: string,
): Promise<ToggleFavoriteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "AUTH_REQUIRED" };
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_placeId: { userId: user.id, placeId } },
    select: { id: true },
  });

  let favorited: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    favorited = false;
  } else {
    await prisma.favorite.create({ data: { userId: user.id, placeId } });
    favorited = true;
  }

  for (const locale of ["en", "ko"]) {
    revalidatePath(`/${locale}/favorites`);
  }

  return { favorited };
}
