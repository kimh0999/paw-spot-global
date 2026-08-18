import { z } from "zod";

import { DOG_SIZES } from "@/lib/constants";
import { BREED_CODE_OTHER, isDogBreedCode } from "@/lib/dogs/breeds";

const optionalTrimmed = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  });

/**
 * 견종은 code만 저장한다. `other`일 때만 사용자가 쓴 원문을 breedCustom에 남기고,
 * 그 밖의 code에서는 breedCustom을 null로 정규화해 두 값이 어긋나지 않게 한다.
 */
export const dogInputSchema = z
  .object({
    name: z.string().trim().min(1).max(30),
    size: z.enum(DOG_SIZES),
    breedCode: optionalTrimmed,
    breedCustom: optionalTrimmed,
  })
  .superRefine((data, ctx) => {
    if (data.breedCode !== null && !isDogBreedCode(data.breedCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["breedCode"],
        message: "unknown_breed_code",
      });
      return;
    }

    if (data.breedCode === BREED_CODE_OTHER) {
      const custom = data.breedCustom ?? "";
      if (custom.length < 1 || custom.length > 50) {
        ctx.addIssue({
          code: "custom",
          path: ["breedCustom"],
          message: "breed_custom_required",
        });
      }
    }
  })
  .transform((data) => ({
    name: data.name,
    size: data.size,
    breedCode: data.breedCode,
    breedCustom: data.breedCode === BREED_CODE_OTHER ? data.breedCustom : null,
  }));

export type DogInput = z.infer<typeof dogInputSchema>;
