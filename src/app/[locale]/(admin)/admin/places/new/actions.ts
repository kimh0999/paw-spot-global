"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  AdminAuthorizationError,
  requireAdminAction,
} from "@/lib/auth/require-admin";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { createPlaceRecord } from "@/lib/places/create-place";
import { parsePlaceFormData } from "@/lib/places/form-data";
import { placeInputSchema } from "@/lib/validation/place";

export type CreatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
};

export async function createPlace(
  localeValue: string,
  _prevState: CreatePlaceState,
  formData: FormData,
): Promise<CreatePlaceState> {
  const locale = isSupportedLocale(localeValue) ? localeValue : "en";
  const tAuth = await getTranslations({ locale, namespace: "auth.actions" });
  let admin;

  try {
    admin = await requireAdminAction();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return {
        error:
          error.reason === "AUTH_REQUIRED"
            ? tAuth("signInRequired")
            : tAuth("forbidden"),
      };
    }
    throw error;
  }

  const raw = parsePlaceFormData(formData);

  const parsed = placeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  let placeId: string;

  try {
    const result = await createPlaceRecord(parsed.data, admin);
    placeId = result.placeId;
  } catch (err) {
    console.error("[createPlace]", err);
    return { error: "저장 중 오류가 발생했습니다." };
  }

  for (const targetLocale of ["en", "ko"]) {
    revalidatePath(`/${targetLocale}`);
    revalidatePath(`/${targetLocale}/admin/places`);
    revalidatePath(`/${targetLocale}/places`);
    revalidatePath(`/${targetLocale}/places/${placeId}`);
  }

  return { success: true, placeId };
}
