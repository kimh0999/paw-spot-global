"use server";

import { createPlaceRecord } from "@/lib/places/create-place";
import { parsePlaceFormData } from "@/lib/places/form-data";
import { placeInputSchema } from "@/lib/validation/place";

export type CreatePlaceState = {
  success?: true;
  placeId?: string;
  error?: string;
};

export async function createPlace(
  _prevState: CreatePlaceState,
  formData: FormData,
): Promise<CreatePlaceState> {
  const raw = parsePlaceFormData(formData);

  const parsed = placeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  try {
    const { placeId } = await createPlaceRecord(parsed.data);
    return { success: true, placeId };
  } catch (err) {
    console.error("[createPlace]", err);
    return { error: "저장 중 오류가 발생했습니다." };
  }
}
