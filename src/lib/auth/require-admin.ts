import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getDefaultAdminPath,
  getSafeCallbackUrl,
} from "@/lib/auth/safe-callback-url";
import type { SupportedLocale } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";

export type VerifiedAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export type AdminAuthorizationFailure = "AUTH_REQUIRED" | "FORBIDDEN";

export class AdminAuthorizationError extends Error {
  constructor(public readonly reason: AdminAuthorizationFailure) {
    super(reason);
    this.name = "AdminAuthorizationError";
  }
}

async function getVerifiedAdmin(): Promise<{
  admin: VerifiedAdmin | null;
  hasSession: boolean;
}> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return { admin: null, hasSession: false };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return { admin: null, hasSession: true };
  }

  return { admin: user, hasSession: true };
}

export async function getCurrentAdmin(): Promise<VerifiedAdmin | null> {
  const { admin } = await getVerifiedAdmin();
  return admin;
}

export async function requireAdminPage(
  locale: SupportedLocale,
  callbackPath = getDefaultAdminPath(locale),
): Promise<VerifiedAdmin> {
  const { admin, hasSession } = await getVerifiedAdmin();

  if (admin) {
    return admin;
  }

  if (!hasSession) {
    const callbackUrl = getSafeCallbackUrl(callbackPath, locale);
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  redirect(`/${locale}/forbidden`);
}

export async function requireAdminAction(): Promise<VerifiedAdmin> {
  const { admin, hasSession } = await getVerifiedAdmin();

  if (admin) {
    return admin;
  }

  throw new AdminAuthorizationError(
    hasSession ? "FORBIDDEN" : "AUTH_REQUIRED",
  );
}
