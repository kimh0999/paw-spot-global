"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { ZodIssue } from "zod";

import {
  AdminAuthorizationError,
  requireAdminAction,
} from "@/lib/auth/require-admin";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { createPlaceRecord } from "@/lib/places/create-place";
import { parsePlaceFormData } from "@/lib/places/form-data";
import {
  PolicyDetailsWriteError,
  parsePolicyDetailsForm,
} from "@/lib/places/policy-details-form";
import { placeInputSchema } from "@/lib/validation/place";

export type CreatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function mapZodIssuesToFieldErrors(
  issues: ZodIssue[],
  t: (key: string) => string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const pathStr = issue.path.join(".");
    const field = pathStr === "location.lat" ? "lat" : pathStr === "location.lng" ? "lng" : pathStr;
    if (result[field]) continue;

    if (issue.code === "custom" && issue.message) {
      const knownKeys = [
        "invalidPhone",
        "invalidInstagram",
        "futureVerifiedAt",
        "verificationIncomplete",
      ] as const;
      if ((knownKeys as readonly string[]).includes(issue.message)) {
        result[field] = t(issue.message as (typeof knownKeys)[number]);
        continue;
      }
    }

    if (pathStr === "location.lat" || pathStr === "location.lng") {
      result[field] = pathStr === "location.lat" ? t("invalidLatitude") : t("invalidLongitude");
    } else if (pathStr === "website" || pathStr === "thumbnailUrl") {
      result[field] = t("invalidUrl");
    } else if (
      issue.code === "invalid_format" &&
      "format" in issue &&
      (issue as { format?: string }).format === "url"
    ) {
      result[field] = t("invalidUrl");
    } else {
      result[field] = t("required");
    }
  }
  return result;
}

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
  // 편집기가 제출한 4개 필드. 나머지 상세 조건은 저장 시 DB 값을 그대로 잇는다.
  const policyDetailsForm = parsePolicyDetailsForm(formData);

  const parsed = placeInputSchema.safeParse(raw);
  if (!parsed.success) {
    const tV = await getTranslations({ locale, namespace: "admin.places.form.validation" });
    return {
      fieldErrors: mapZodIssuesToFieldErrors(parsed.error.issues, (key) => tV(key as Parameters<typeof tV>[0])),
    };
  }

  let placeId: string;

  try {
    const result = await createPlaceRecord(parsed.data, admin, policyDetailsForm);
    placeId = result.placeId;
  } catch (err) {
    console.error("[createPlace]", err);
    const tV = await getTranslations({ locale, namespace: "admin.places.form.validation" });
    if (err instanceof PolicyDetailsWriteError) {
      return {
        error: tV(
          err.reason === "invalidExisting"
            ? "policyDetailsCorrupted"
            : "policyDetailsInvalid",
        ),
      };
    }
    return { error: tV("submitFailed") };
  }

  for (const targetLocale of ["en", "ko"]) {
    revalidatePath(`/${targetLocale}`);
    revalidatePath(`/${targetLocale}/admin/places`);
    revalidatePath(`/${targetLocale}/places`);
    revalidatePath(`/${targetLocale}/places/${placeId}`);
  }

  return { success: true, placeId };
}
