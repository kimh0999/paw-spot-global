import { prisma } from "@/lib/db/prisma";
import type { DogSize } from "@/lib/constants";

export type DogSummary = {
  id: string;
  name: string;
  size: DogSize;
  breedCode: string | null;
  breedCustom: string | null;
};

const dogSummarySelect = {
  id: true,
  name: true,
  size: true,
  breedCode: true,
  breedCustom: true,
} as const;

export async function getUserDogs(userId: string): Promise<DogSummary[]> {
  const rows = await prisma.dog.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: dogSummarySelect,
  });
  return rows as DogSummary[];
}

/**
 * URL로 넘어온 id 중 이 사용자의 것만 돌려준다.
 * 남의 반려견이나 삭제된 id는 결과에서 조용히 빠진다 — 존재 여부를 알리지 않는다.
 */
export async function getUserDogsByIds(
  userId: string,
  dogIds: readonly string[],
): Promise<DogSummary[]> {
  if (dogIds.length === 0) return [];

  const rows = await prisma.dog.findMany({
    where: { userId, id: { in: [...dogIds] } },
    orderBy: { createdAt: "asc" },
    select: dogSummarySelect,
  });
  return rows as DogSummary[];
}

export function countUserDogs(userId: string): Promise<number> {
  return prisma.dog.count({ where: { userId } });
}
