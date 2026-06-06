"use server";

import { revalidatePath } from "next/cache";

import { parsePlaceFormData } from "@/lib/places/form-data";
import { updatePlaceRecord } from "@/lib/places/update-place";
import { placeUpdateSchema } from "@/lib/validation/place";

export type UpdatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
};

export async function updatePlace(
  id: string,
  _prevState: UpdatePlaceState,
  formData: FormData,
): Promise<UpdatePlaceState> {
  const raw = parsePlaceFormData(formData);

  const verificationPresent =
    raw.verification.method !== "" && raw.verification.verifiedAt !== "";

  const parsed = placeUpdateSchema.safeParse({
    ...raw,
    verification: verificationPresent ? raw.verification : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  try {
    await updatePlaceRecord(id, parsed.data);
  } catch (err) {
    console.error("[updatePlace]", err);
    return { error: "저장 중 오류가 발생했습니다." };
  }

  for (const locale of ["en", "ko"]) {
    revalidatePath(`/${locale}/admin/places`);
    revalidatePath(`/${locale}/admin/places/${id}/edit`);
    revalidatePath(`/${locale}/places`);
    revalidatePath(`/${locale}/places/${id}`);
  }

  return { success: true, placeId: id };
}
