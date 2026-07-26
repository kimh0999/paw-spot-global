"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  UserAuthorizationError,
  requireUserAction,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { dogInputSchema } from "@/lib/validation/dog";

export type DogFormState = {
  success?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function upsertDog(
  localeValue: string,
  _prevState: DogFormState,
  formData: FormData,
): Promise<DogFormState> {
  const locale = isSupportedLocale(localeValue) ? localeValue : "en";
  const tAuth = await getTranslations({ locale, namespace: "auth.actions" });

  let user;
  try {
    user = await requireUserAction();
  } catch (error) {
    if (error instanceof UserAuthorizationError) {
      return { error: tAuth("signInRequired") };
    }
    throw error;
  }

  const breed = formData.get("breed");
  const raw = {
    name: formData.get("name"),
    size: formData.get("size"),
    breed: typeof breed === "string" && breed.trim() !== "" ? breed : null,
  };

  const parsed = dogInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = "invalid";
      }
    }
    return { fieldErrors };
  }

  const existing = await prisma.dog.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.dog.update({
      where: { id: existing.id },
      data: parsed.data,
    });
  } else {
    await prisma.dog.create({
      data: { ...parsed.data, userId: user.id },
    });
  }

  for (const targetLocale of ["en", "ko"]) {
    revalidatePath(`/${targetLocale}/my-dog`);
    revalidatePath(`/${targetLocale}/places`);
  }

  return { success: true };
}
