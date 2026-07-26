import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSafeCallbackUrl } from "@/lib/auth/safe-callback-url";
import type { SupportedLocale } from "@/lib/constants";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
};

export type UserAuthorizationFailure = "AUTH_REQUIRED";

export class UserAuthorizationError extends Error {
  constructor(public readonly reason: UserAuthorizationFailure) {
    super(reason);
    this.name = "UserAuthorizationError";
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role,
  };
}

export async function requireUser(
  locale: SupportedLocale,
  callbackPath: string,
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (user) {
    return user;
  }

  const callbackUrl = getSafeCallbackUrl(callbackPath, locale, `/${locale}`);
  redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}

export async function requireUserAction(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (user) {
    return user;
  }

  throw new UserAuthorizationError("AUTH_REQUIRED");
}
