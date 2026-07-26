import type { Dog } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function getUserDog(userId: string): Promise<Dog | null> {
  return prisma.dog.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}
